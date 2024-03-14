'use strict'

import {
    DIconMenuItem
} from "../../board/widget.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    WHexLocation,
    WHexSideId
} from "../../wargame/map.js";
import {
    WAction, WStacking
} from "../../wargame/game.js";
import {
    WActionActuator, WActuatorImageTrigger
} from "../../wargame/playable.js";
import {
    Dimension2D, Point2D, sumAngle
} from "../../board/geometry.js";
import {
    DImage
} from "../../board/draw.js";
import {
    CBCharge,
    CBStateSequenceElement,
    CBUnit,
    CBUnitAnimation,
    getStacking,
    getStackingCode,
    getUnitFromContext,
    setUnitToContext
} from "../unit.js";
import {
    WSequence, WSequenceElement
} from "../../wargame/sequences.js";

export function registerInteractiveFormation() {
    CBInteractivePlayer.prototype.createFormation = function (unit) {
        unit.launchAction(new InteractiveCreateFormationAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.includeTroops = function (unit) {
        unit.launchAction(new InteractiveIncludeTroopsAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.releaseTroops = function (unit) {
        unit.launchAction(new InteractiveReleaseTroopsAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.breakFormation = function (unit) {
        unit.launchAction(new InteractiveBreakFormationAction(this.game, unit));
    }
    CBActionMenu.menuBuilders.push(
        createFormationMenuItems
    );
}
export function unregisterInteractiveFormation() {
    delete CBInteractivePlayer.prototype.createFormation;
    delete CBInteractivePlayer.prototype.includeTroops;
    delete CBInteractivePlayer.prototype.releaseTroops;
    delete CBInteractivePlayer.prototype.breakFormation;
    CBActionMenu.menuBuilders.remove(createFormationMenuItems);
}

export class InteractiveBreakFormationAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let {fromHex, toHex} = this.game.arbitrator.getTroopsAfterFormationBreak(this.unit);
        this.unit.breakFormation(fromHex, toHex);
        WSequence.appendElement(this.game, new CBBreakFormationSequenceElement({
            game: this.game, formation: this.unit, troops: [...fromHex, ...toHex]
        }));
        for (let replacement of fromHex) {
            replacement.setPlayed();
        }
        for (let replacement of toHex) {
            replacement.setPlayed();
        }
        this.markAsFinished();
    }

}
WAction.register("InteractiveBreakFormationAction", InteractiveBreakFormationAction);

export class InteractiveCreateFormationAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this._createCreateFormationActuator();
    }

    _createCreateFormationActuator() {
        this.game.closeActuators();
        let joinableHexes = this.game.arbitrator.getHexesToMakeFormation(this.unit);
        if (joinableHexes && joinableHexes.length) {
            let createFormationActuator = this.createCreateFormationActuator(joinableHexes);
            this.game.openActuator(createFormationActuator);
        }
    }

    createFormation(hexId) {
        this.game.closeActuators();
        let {replacement, replaced} = this.game.arbitrator.createFormation(this.unit, hexId);
        let hexLocation = this.unit.hexLocation;
        replacement.appendToMap(new WHexSideId(hexLocation, hexId), WStacking.TOP);
        replacement.rotate(replaced[0].angle);
        for (let troop of replaced) {
            troop.deleteFromMap();
            troop.move(null, 0);
        }
        WSequence.appendElement(this.game, new CBCreateFormationSequenceElement({
            game: this.game, formation: replacement, troops: [...replaced]
        }));
        replacement.setPlayed();
        this.markAsFinished();
    }

    createCreateFormationActuator(joinableHexes) {
        return new CBCreateFormationActuator(this, joinableHexes);
    }

}
WAction.register("InteractiveCreateFormationAction", InteractiveCreateFormationAction);

export class InteractiveReleaseTroopsAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this._createReleaseTroopActuator();
    }

    _createReleaseTroopActuator() {
        this.game.closeActuators();
        let {hexes, stepCount} = this.game.arbitrator.getHexesToReleaseFormation(this.unit);
        if (hexes.length) {
            let releaseTroopActuator = this.createReleaseTroopActuator(hexes, stepCount);
            this.game.openActuator(releaseTroopActuator);
        }
    }

    releaseTroop(hexId, steps, stacking) {
        this.game.closeActuators();
        let {stepCount, troop} = this.game.arbitrator.releaseTroop(this.unit, hexId, steps);
        troop.appendToMap(hexId, stacking);
        troop.angle = this.unit.angle;
        WSequence.appendElement(this.game, new CBLeaveFormationSequenceElement({
            game: this.game, formation: this.unit, troop, stacking
        }));
        troop.setPlayed();
        this.unit.fixRemainingLossSteps(stepCount);
        if (this.game.arbitrator.isAllowedToReleaseTroops(this.unit)) {
            this.markAsStarted();
            this._createReleaseTroopActuator();
        }
        else {
            this.markAsFinished();
        }
    }

    createReleaseTroopActuator(hexes, stepCount) {
        return new CBReleaseTroopActuator(this, hexes, stepCount);
    }

}
WAction.register("InteractiveReleaseTroopsAction", InteractiveReleaseTroopsAction);

export class InteractiveIncludeTroopsAction extends WAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let {removed, stepCount, tired, munitions} = this.game.arbitrator.includeTroops(this.unit);
        this.unit.fixRemainingLossSteps(stepCount);
        this.unit.setTiredness(tired);
        this.unit.setMunitions(munitions);
        for (let removedUnit of removed) {
            removedUnit.deleteFromMap();
        }
        this.unit.setPlayed();
        WSequence.appendElement(this.game, new CBJoinFormationSequenceElement({
            game: this.game, formation: this.unit, troops: removed
        }));
        this.markAsFinished();
    }

}
WAction.register("InteractiveIncludeTroopsAction", InteractiveIncludeTroopsAction);

export class CBCreateFormationActuator extends WActionActuator {

    constructor(action, joinableHexes) {
        super(action);
        let image = DImage.getImage("./../images/actuators/formation.png");
        let imageArtifacts = [];
        for (let hex of joinableHexes) {
            let creation = new WActuatorImageTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 170));
            creation.position = Point2D.position(this.playable.location, new WHexSideId(action.unit.hexLocation, hex).location, 1);
            creation.hex = hex;
            creation.pangle = sumAngle(action.unit.angle, 90);
            imageArtifacts.push(creation);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(hex) {
        return this.findTrigger(artifact=>artifact.hex === hex);
    }

    onMouseClick(trigger, event) {
        this.action.createFormation(trigger.hex);
    }

}

export class CBReleaseTroopActuator extends WActionActuator {

    constructor(action, hexes, stepCount) {

        function _createTrigger(image, hex, angle, factor, stepCount, stacking) {
            let trigger = new WActuatorImageTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(64, 60));
            let startLocation = Point2D.position(this.playable.location, hex.location, factor);
            let targetPosition = Point2D.position(hex.location, hex.getNearHexSide(angle).location, 0.5);
            trigger.position = startLocation.plusPoint(targetPosition);
            trigger.hex = hex;
            trigger.stepCount = stepCount;
            trigger.stacking = stacking;
            trigger.pangle = angle;
            return trigger;
        }

        super(action);
        let oneStepImage = DImage.getImage("./../images/actuators/quit-half.png");
        let twoStepsImage = DImage.getImage("./../images/actuators/quit-full.png");
        let imageArtifacts = [];
        for (let hex of hexes) {
            imageArtifacts.push(_createTrigger.call(this, oneStepImage, hex, action.unit.angle, 0.6, 1, WStacking.TOP));
            imageArtifacts.push(_createTrigger.call(this, oneStepImage, hex, sumAngle(action.unit.angle, 180), 0.6, 1, WStacking.BOTTOM));
            if (stepCount>1) {
                imageArtifacts.push(_createTrigger.call(this, twoStepsImage, hex, action.unit.angle, 1.2, 2, WStacking.TOP));
                imageArtifacts.push(_createTrigger.call(this, twoStepsImage, hex, sumAngle(action.unit.angle, 180), 1.2, 2, WStacking.BOTTOM));
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(hex, stepCount, stacking) {
        return this.findTrigger(artifact=>artifact.hex === hex && artifact.stepCount === stepCount && artifact.stacking === stacking);
    }

    onMouseClick(trigger, event) {
        this.action.releaseTroop(trigger.hex, trigger.stepCount, trigger.stacking);
    }

}

function createFormationMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/create-formation.png", "./../images/icons/create-formation-gray.png",
            0, 3, event => {
                unit.player.createFormation(unit, event);
                return true;
            }, "Se mettre en formation").setActive(actions.createFormation),
        new DIconMenuItem("./../images/icons/join-formation.png", "./../images/icons/join-formation-gray.png",
            1, 3, event => {
                unit.player.includeTroops(unit, event);
                return true;
            }, "Joindre la formation").setActive(actions.joinFormation),
        new DIconMenuItem("./../images/icons/leave-formation.png", "./../images/icons/leave-formation-gray.png",
            2, 3, event => {
                unit.player.releaseTroops(unit, event);
                return true;
            }, "Quitter la formation").setActive(actions.leaveFormation),
        new DIconMenuItem("./../images/icons/dismiss-formation.png", "./../images/icons/dismiss-formation-gray.png",
            3, 3, event => {
                unit.player.breakFormation(unit, event);
                return true;
            }, "Rompre la formation").setActive(actions.breakFormation)
    ];
}

export class CBLeaveFormationSequenceElement extends CBStateSequenceElement {

    constructor({game, formation, troop, stacking}) {
        super({type: "leave", game, unit: formation});
        if (troop) {
            this.unitRecord = {
                unit: troop,
                hexLocation: troop.hexLocation,
                stacking
            };
        }
    }

    get delay() { return 500; }

    apply(startTick) {
        this.game.centerOn(this.unit.viewportLocation);
        return new CBAppearAnimation({
            unit:this.unit, appear:[this.unitRecord], startTick, duration:this.delay, state:this
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.troop = {
            unit: this.unitRecord.unit.toSpecs(),
            stacking: getStackingCode(this.unitRecord.stacking)
        }
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        let unit = CBUnit.fromSpecs(this.unit.wing, spec.troop.unit);
        setUnitToContext(context, spec.troop.unit.name, unit);
        this.unitRecord = {
            unit,
            hexLocation: WHexLocation.fromSpecs(this.unit.game.map, {
                col: spec.troop.unit.positionCol,
                row: spec.troop.unit.positionRow,
                angle: spec.troop.unit.positionAngle
            }),
            stacking: getStacking(spec.troop.stacking)
        };
    }
}
WSequence.register("leave", CBLeaveFormationSequenceElement);

export class CBJoinFormationSequenceElement extends CBStateSequenceElement {

    constructor({game, formation, troops, stacking}) {
        super({type: "join", game, unit: formation});
        this.joinedUnits = troops;
    }

    get delay() { return 500; }

    apply(startTick) {
        this.game.centerOn(this.unit.viewportLocation);
        return new CBAppearAnimation({
            unit:this.unit, disappear:[...this.joinedUnits], startTick, duration:this.delay, state:this
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.troops = this.joinedUnits.map(unit=>unit.name);
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.joinedUnits = spec.troops.map(name=>getUnitFromContext(context, name));
    }
}
WSequence.register("join", CBJoinFormationSequenceElement);

export class CBCreateFormationSequenceElement extends WSequenceElement {

    constructor({id, game, formation, troops}) {
        super({id, type: "create", game, unit: formation});
        if (formation) {
            this.unitRecord = {
                unit: formation,
                hexLocation: formation.hexLocation
            };
        }
        this.troops = troops;
    }

    get delay() { return 500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.unitRecord.unit !== element.unitRecord.unit) return false;
        for (let index=0; index<this.troops.length; index++) {
            if (this.troops[index] !== element.troops[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.unitRecord !== undefined) result+=", Formation: "+this.unitRecord.unit.name;
        if (this.troops[0] !== undefined) result+=", Troops: "+this.troops[0].name;
        for (let index=1; index<this.troops.length; index++) {
            if (this.troops[index] !== undefined) result+=", "+this.troops[index].name;
        }
        return result;
    }

    apply(startTick) {
        this.game.centerOn(this.unit.viewportLocation);
        return new CBAppearAnimation({
            disappear:[...this.troops], appear:[this.unitRecord], startTick, duration:this.delay, state:this
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.formation = {
            unit: this.unitRecord.unit.toSpecs(),
            hexLocation: this.unitRecord.hexLocation.toSpecs()
        };
        spec.troops = [];
        for (let index=0; index<this.troops.length; index++) {
            spec.troops.push(this.troops[index].name);
        }
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.troops = [];
        for (let troopName of spec.troops) {
            this.troops.push(getUnitFromContext(context, troopName));
        }
        let unit = CBUnit.fromSpecs(this.troops[0].wing, spec.formation.unit);
        this.unitRecord = {
            unit,
            hexLocation: WHexLocation.fromSpecs(this.troops[0].game.map, {
                col: spec.formation.hexLocation.col,
                row: spec.formation.hexLocation.row,
                angle: spec.formation.hexLocation.angle
            })
        }
    }

}
WSequence.register("create", CBCreateFormationSequenceElement);

export class CBBreakFormationSequenceElement extends WSequenceElement {

    constructor({id, game, formation, troops}) {
        super({id, type: "break", game, unit: formation});
        this.unit = formation;
        if (troops) {
            this.unitRecords = [];
            for (let troop of troops) {
                this.unitRecords.push(this.unitRecord = {
                    unit: troop,
                    hexLocation: troop.hexLocation
                });
            }
        }
    }

    get delay() { return 500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.unit !== element.unit) return false;
        for (let index=0; index<this.unitRecords.length; index++) {
            if (this.unitRecords[index].unit !== element.unitRecords[index].unit) return false;
            if (this.unitRecords[index].hexLocation.equalsTo(element.unitRecords[index].hexLocation)) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.unit !== undefined) result+=", Formation: "+this.unit.name;
        if (this.unitRecords[0] !== undefined) result+=", Troops: "+this.unitRecords[0].unit.name;
        for (let index=1; index<this.unitRecords.length; index++) {
            if (this.unitRecords[index] !== undefined) result+=", "+this.unitRecords[index].unit.name;
        }
        return result;
    }

    apply(startTick) {
        this.game.centerOn(this.unit.viewportLocation);
        return new CBAppearAnimation({
            disappear:[this.unit], appear:this.unitRecords, startTick, duration:this.delay, state:this
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.unit = this.unit.name;
        spec.troops = [];
        for (let index=0; index<this.unitRecords.length; index++) {
            spec.troops.push({
                unit: this.unitRecords[index].unit.toSpecs()
            });
        }
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.unit = getUnitFromContext(context, spec.unit);
        this.unitRecords = [];
        for (let troopSpec of spec.troops) {
            let unit = CBUnit.fromSpecs(this.unit.wing, troopSpec.unit);
            setUnitToContext(context, troopSpec.unit.name, unit);
            this.unitRecords.push({
                unit,
                hexLocation: WHexLocation.fromSpecs(this.unit.game.map, {
                    col: troopSpec.unit.positionCol,
                    row: troopSpec.unit.positionRow,
                    angle: troopSpec.unit.positionAngle
                })
            });
        }
    }
}
WSequence.register("break", CBBreakFormationSequenceElement);

export class CBAppearAnimation extends CBUnitAnimation {

    constructor({unit, appear, disappear, startTick, duration, state}) {
        if (appear && disappear) duration*=2;
        console.assert(appear || disappear);
        super({unit, startTick, duration, state});
        this._appear = appear;
        this._disappear = disappear;
        this._config = this._appear ? this._disappear ? "1app" : "app" : "dis";
    }

    _init() {
        super._init();
        if (this._config !== "dis") {
            this._addAppear();
        }
        if (this._config !== "app") {
            this._setDisappearAlpha(this._disappear, 1);
        }
    }

    _finalize() {
        if (this._config === "1app") {
            this._setAppearAlpha(this._appear, 1);
        }
        if (this._config === "1app") {
            this._removeDisappear();
        }
        super._finalize();
    }

    _draw(count, ticks) {
        let factor = this._factor(count);
        if (this._config === "dis") {
            this._setDisappearAlpha(this._disappear, 1 - factor);
        }
        else if (this._config === "1app") {
            this._setDisappearAlpha(this._disappear, 1 - factor*2);
        }
        if (this._config === "1app" && factor > 0.5) {
            this._removeDisappear();
            this._addAppear();
            this._config = "2app"
        }
        if (this._config === "app") {
            this._setAppearAlpha(this._appear, factor);
        }
        else if (this._config === "2app") {
            this._setAppearAlpha(this._appear, (factor-0.5)*2);
        }
        return super._draw(count, ticks);
    }

    _setAppearAlpha(units, alpha) {
        for (let unitRecord of units) {
            unitRecord.unit.alpha = alpha;
        }
    }

    _setDisappearAlpha(units, alpha) {
        for (let unitRecord of units) {
            unitRecord.alpha = alpha;
        }
    }

    _addAppear() {
        for (let unitRecord of this._appear) {
            unitRecord.unit.alpha = 0;
            let stacking = unitRecord.stacking===undefined ? WStacking.TOP : unitRecord.stacking;
            unitRecord.unit.addToMap(unitRecord.hexLocation, stacking);
        }
    }

    _removeDisappear() {
        for (let unit of this._disappear) {
            unit.alpha = 0;
            unit.removeFromMap();
        }
    }

}
