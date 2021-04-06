'use strict'

import {
    Area2D,
    canonizeAngle,
    diffAngle,
    Dimension2D, Point2D, sumAngle
} from "../geometry.js";
import {
    DAbstractInsert,
    DDice, DIconMenuItem, DInsert, DInsertFrame, DMask, DResult, DScene
} from "../widget.js";
import {
    CBAction, CBActionActuator, CBActuator,
    CBActuatorImageTrigger, CBActuatorTriggerMixin, CBMask, CBUnitActuatorTrigger, InsertMixin, RetractableActuatorMixin
} from "./game.js";
import {
    CBHexSideId
} from "./map.js";
import {
    CBFormation
} from "./unit.js";
import {
    CBActionMenu,
    CBInteractivePlayer
} from "./interactive-player.js";
import {
    DImage
} from "../draw.js";
import {
    DImageArtifact
} from "../board.js";
import {
    CBArbitrator
} from "./arbitrator.js";

export function registerInteractiveCombat() {
    CBInteractivePlayer.prototype.unitShockAttack = function (unit, event) {
        unit.launchAction(new InteractiveShockAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitFireAttack = function (unit, event) {
        unit.launchAction(new InteractiveFireAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitDuelAttack = function (unit, event) {
        unit.launchAction(new InteractiveDuelAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitDuelFire = function (unit, event) {
        unit.launchAction(new InteractiveDuelFireAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.applyLossesToUnit = function(unit, losses, attacker, continuation) {
        unit.launchAction(new InteractiveRetreatAction(this.game, unit, losses, attacker, continuation));
    }
    CBActionMenu.menuBuilders.push(
        createCombatMenuItems
    );
}
export function unregisterInteractiveCombat() {
    delete CBInteractivePlayer.prototype.unitShockAttack;
    delete CBInteractivePlayer.prototype.unitFireAttack;
    delete CBInteractivePlayer.prototype.unitDuelAttack;
    delete CBInteractivePlayer.prototype.applyLossesToUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createCombatMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveRetreatAction extends CBAction {

    constructor(game, unit, losses, attacker, continuation) {
        super(game, unit);
        this._losses = losses;
        this._attacker = attacker;
        this._continuation = continuation;
    }

    play() {
        this.game.setFocusedUnit(this.unit);
        this._createRetreatActuator();
    }

    _createRetreatActuator() {
        if (this.unit instanceof CBFormation) {
            let {retreatDirections, rotateDirections} = this.game.arbitrator.getFormationRetreatZones(this.unit, this._attacker);
            let retreatActuator = this.createFormationRetreatActuator(retreatDirections, rotateDirections);
            this.game.openActuator(retreatActuator);
        }
        else {
            let retreatDirections = this.game.arbitrator.getRetreatZones(this.unit, this._attacker);
            let retreatActuator = this.createRetreatActuator(retreatDirections);
            this.game.openActuator(retreatActuator);
        }
    }

    retreatUnit(hexId, event, moveType) {
        this.game.closeActuators();
        this.unit.move(hexId, 0, moveType);
        this.unit.addOneCohesionLevel();
        this._finalizeAction();
    }

    reorientUnit(angle) {
        this.unit.rotate(canonizeAngle(angle), 0);
    }

    takeALossFromUnit(event) {
        this.game.closeActuators();
        this.unit.takeALoss();
        this._finalizeAction();
    }

    _finalizeAction() {
        this.markAsFinished();
        this.unit.removeAction();
        this._continuation();
    }

    createRetreatActuator(directions) {
        return new CBRetreatActuator(this, directions);
    }

    createFormationRetreatActuator(moveDirections, rotateDirection) {
        return new CBFormationRetreatActuator(this, moveDirections, rotateDirection);
    }

}

export class InteractiveAbstractShockAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createShockAttackActuator(this.unit);
    }

    _createCombatRecords(foes) {
        let combats = [];
        for (let foe of foes) {
            let combat = {
                foe:foe.unit,
                advantage:this.game.arbitrator.getShockAttackAdvantage(this.unit, foe.unit, false)
            }
            combats.push(combat);
            if (foe.supported) {
                combat.supported=true;
                combat.supportedAdvantage=this.game.arbitrator.getShockAttackAdvantage(this.unit, foe.unit, true);
            }
        }
        return combats;
    }

    _createShockAttackActuator() {
        let foesThatMayBeShockAttacked = this._getFoes(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeShockAttacked.length) {
            let shockAttackActuator = this.createShockAttackActuator(foesThatMayBeShockAttacked);
            this.game.openActuator(shockAttackActuator);
            let shockHelpActuator = this.createShockHelpActuator(this._createCombatRecords(foesThatMayBeShockAttacked));
            this.game.openActuator(shockHelpActuator);
        }
    }

    shockAttackUnit(foe, supported, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(this.game), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let report = this._processShockAttackResult(foe, supported, dice.result);
                let continuation = ()=>{
                    if (!report.played) {
                        this._createShockAttackActuator(this.unit);
                    }
                }
                if (report.success) {
                    result.success().appear();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit, continuation);
                }
                else {
                    result.failure().appear();
                    continuation();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    _processShockAttackResult(foe, supported, diceResult) {
        let result = this.game.arbitrator.processShockAttackResult(this.unit, foe, supported, diceResult);
        this.unit.setAttackLocation(result.attackLocation);
        if (result.tirednessForAttacker) {
            this.unit.addOneTirednessLevel();
        }
        if (result.played) {
            this.markAsFinished();
        }
        else {
            this.markAsStarted();
        }
        return result;
    }

    _getAdvantageCell(foe) {
        return this.game.arbitrator.getShockWeaponCell(this.unit, foe);
    }

    showRules(foe, supported, event) {
        this.game.closeActuators();
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBShockAttackInsert(this.game), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert(this.game).focus(
                advantageCell.col, advantageCell.row),
            new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    createShockAttackActuator(foes) {
        return new CBShockAttackActuator(this, foes);
    }

    createShockHelpActuator(combats) {
        return new CBShockHelpActuator(this, combats);
    }

}

export class InteractiveShockAttackAction extends InteractiveAbstractShockAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeShockAttacked(unit);
    }

}

export class InteractiveDuelAttackAction extends InteractiveAbstractShockAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeDuelAttacked(unit);
    }

}

export class InteractiveAbstractFireAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createFireAttackActuator(this.unit);
    }

    _createFireRecords(foes) {
        let fires = [];
        for (let foe of foes) {
            let fire = {
                foe:foe.unit,
                advantage:this.game.arbitrator.getFireAttackAdvantage(this.unit, foe.unit)
            }
            fires.push(fire);
        }
        return fires;
    }

    _createFireAttackActuator() {
        let foesThatMayBeFireAttacked = this._getFoes(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeFireAttacked.length) {
            let fireAttackActuator = this.createFireAttackActuator(foesThatMayBeFireAttacked);
            this.game.openActuator(fireAttackActuator);
            let fireHelpActuator = this.createFireHelpActuator(this._createFireRecords(foesThatMayBeFireAttacked));
            this.game.openActuator(fireHelpActuator);
        }
    }

    fireAttackUnit(foe, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBFireAttackInsert(this.game), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let report = this._processFireAttackResult(foe, dice.result);
                let continuation = ()=>{
                    if (!report.played) {
                        this._createFireAttackActuator(this.unit);
                    }
                }
                if (report.success) {
                    result.success().appear();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit, continuation);
                }
                else {
                    result.failure().appear();
                    continuation();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    _processFireAttackResult(foe, diceResult) {
        let result = this.game.arbitrator.processFireAttackResult(this.unit, foe, diceResult);
        this.unit.setAttackLocation(result.attackLocation);
        if (result.lowerFirerMunitions) {
            this.unit.addOneLackOfMunitionsLevel();
        }
        if (result.played) {
            this.markAsFinished();
        }
        else {
            this.markAsStarted();
        }
        return result;
    }

    _getAdvantageCell(foe) {
        return this.game.arbitrator.getFireWeaponCell(this.unit, foe);
    }

    showRules(foe, event) {
        this.game.closeActuators();
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBFireAttackInsert(this.game), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert(this.game).focus(
                advantageCell.col, advantageCell.row),
                new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2
            )
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    createFireAttackActuator(foes) {
        return new CBFireAttackActuator(this, foes);
    }

    createFireHelpActuator(fires) {
        return new CBFireHelpActuator(this, fires);
    }

}

export class InteractiveFireAttackAction extends InteractiveAbstractFireAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeFireAttacked(unit);
    }

}

export class InteractiveDuelFireAction extends InteractiveAbstractFireAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeDuelFired(unit);
    }

}

function createCombatMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/shock-attack.png", "/CBlades/images/icons/shock-attack-gray.png",
            0, 1, event => {
                unit.player.unitShockAttack(unit, event);
                return true;
            }).setActive(actions.shockAttack),
        new DIconMenuItem("/CBlades/images/icons/fire-attack.png", "/CBlades/images/icons/fire-attack-gray.png",
            1, 1, event => {
                unit.player.unitFireAttack(unit, event);
                return true;
            }).setActive(actions.fireAttack),
        new DIconMenuItem("/CBlades/images/icons/shock-duel.png", "/CBlades/images/icons/shock-duel-gray.png",
            2, 1, event => {
                unit.player.unitDuelAttack(unit, event);
                return true;
            }).setActive(actions.shockDuel),
        new DIconMenuItem("/CBlades/images/icons/fire-duel.png", "/CBlades/images/icons/fire-duel-gray.png",
            3, 1, event => {
                unit.player.unitDuelFire(unit, event);
                return true;
            }).setActive(actions.fireDuel)
    ];
}

export class CBShockAttackActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, foes) {
        super(action);
        let unsupportedImage = DImage.getImage("/CBlades/images/actuators/unsupported-shock.png");
        let supportedImage = DImage.getImage("/CBlades/images/actuators/supported-shock.png");
        let imageArtifacts = [];
        for (let foe of foes) {
            let unsupportedShock = new CBUnitActuatorTrigger(this, foe.unit, "units", unsupportedImage,
                new Point2D(0, 0), new Dimension2D(100, 111));
            unsupportedShock.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            unsupportedShock.pangle = 30;
            unsupportedShock.supported = false;
            imageArtifacts.push(unsupportedShock);
            if (foe.supported) {
                let supportedShock = new CBUnitActuatorTrigger(this, foe.unit, "units", supportedImage,
                    new Point2D(0, 0), new Dimension2D(120, 133));
                supportedShock.position = unsupportedShock.position.translate(40, 40);
                unsupportedShock.position = unsupportedShock.position.translate(-40, -40);
                supportedShock.pangle = 30;
                supportedShock.supported = true;
                imageArtifacts.push(supportedShock);
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit, supported) {
        return this.findTrigger(artifact=>artifact.unit === unit && artifact.supported === supported);
    }

    onMouseClick(trigger, event) {
        this.action.shockAttackUnit(trigger.unit, trigger.supported, event);
    }

}

export class CBFireAttackActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, foes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/fire.png");
        let imageArtifacts = [];
        for (let foe of foes) {
            let fire = new CBUnitActuatorTrigger(this, foe.unit, "units", image,
                new Point2D(0, 0), new Dimension2D(140, 155));
            fire.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            fire.pangle = 30;
            imageArtifacts.push(fire);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact.unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.fireAttackUnit(trigger.unit, event);
    }

}

class ShockHelpTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, supported, foe, advantage) {
        let image = supported ?
            DImage.getImage("/CBlades/images/actuators/supported-shock-advantage.png"):
            DImage.getImage("/CBlades/images/actuators/unsupported-shock-advantage.png");
        super(actuator,"actuators", image, new Point2D(0, 0), ShockHelpTrigger.DIMENSION, 0);
        this.pangle = 0;
        this.position = Point2D.position(actuator.unit.location, foe.location, 1);
        this._foe = foe;
        this._supported = supported;
        this._advantage = advantage;
    }

    _paint() {
        super._paint();
        this._level.setShadowSettings("#000000", 0);
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings(this._supported ? "#9D2F12" : "#AD5A2D");
        this._level.fillText("" + this._advantage, new Point2D(0, 10));
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }

}
ShockHelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBShockHelpActuator extends CBActionActuator {

    constructor(action, combats) {
        super(action);
        this._triggers = [];
        for (let combat of combats) {
            let unsupportedHelp = new ShockHelpTrigger(this, false, combat.foe, combat.advantage);
            this._triggers.push(unsupportedHelp);
            if (combat.supported) {
                let supportedHelp = new ShockHelpTrigger(this, true, combat.foe, combat.supportedAdvantage);
                this._triggers.push(supportedHelp);
                supportedHelp.position = unsupportedHelp.position.translate(75, 75);
                unsupportedHelp.position = unsupportedHelp.position.translate(-75, -75);
            }
            else {
                unsupportedHelp.position = unsupportedHelp.position.translate(40, 40);
            }
        }
        this.initElement(this._triggers);
    }

    getTrigger(foe) {
        return this.findTrigger(artifact=>artifact.foe === foe);
    }

    onMouseClick(trigger, event) {
        this.action.showRules(trigger._foe, trigger._supported, event);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBActuator.FULL_VISIBILITY ? 1:0);
        }
    }
}

class FireHelpTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, foe, advantage) {
        let image = DImage.getImage("/CBlades/images/actuators/fire-advantage.png");
        super(actuator,"actuators", image, new Point2D(0, 0), FireHelpTrigger.DIMENSION, 0);
        this.pangle = 0;
        this.position = Point2D.position(actuator.unit.location, foe.location, 1);
        this._foe = foe;
        this._advantage = advantage;
    }

    _paint() {
        super._paint();
        this._level.setShadowSettings("#000000", 0);
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings("#A1124F");
        this._level.fillText("" + this._advantage, new Point2D(0, 10));
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }
}
FireHelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBFireHelpActuator extends CBActionActuator {

    constructor(action, fires) {
        super(action);
        this._triggers = [];
        for (let fire of fires) {
            let help = new FireHelpTrigger(this, fire.foe, fire.advantage);
            this._triggers.push(help);
            help.position = help.position.translate(40, 40);
        }
        this.initElement(this._triggers);
    }

    getTrigger(foe) {
        return this.findTrigger(artifact=>artifact._foe === foe);
    }

    onMouseClick(trigger, event) {
        this.action.showRules(trigger._foe, event);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBActuator.FULL_VISIBILITY ? 1:0);
        }
    }
}

export class CBRetreatActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, directions) {
        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new CBActuatorImageTrigger(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(125, 173));
        loss.loss = true;
        imageArtifacts.push(loss);
        let retreatImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
        for (let angle in directions) {
            let orientation = new CBActuatorImageTrigger(this, "actuators", retreatImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            orientation.moveType = directions[angle].moveType;
            imageArtifacts.push(orientation);
        }
        this.initElement(imageArtifacts);
    }

    getLossTrigger() {
        return this.findTrigger(artifact=>artifact.loss);
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>!artifact.loss && artifact.angle === angle);
    }

    onMouseClick(trigger, event) {
        if (trigger.loss) {
            this.action.takeALossFromUnit(event);
        }
        else {
            this.action.retreatUnit(this.unit.hexLocation.getNearHex(trigger.angle), event, trigger.moveType);
        }
    }

}

export class CBFormationRetreatActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, moveDirections, rotateDirections) {

        function createMoveTriggers(imageArtifacts) {
            let moveImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageTrigger(this, "actuators", moveImage,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = moveDirections[angle].moveType;
                imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers(imageArtifacts) {
            let rotateImage = DImage.getImage("/CBlades/images/actuators/retreat-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageTrigger(this, "actuators", rotateImage,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = rotateDirections[angle].moveType;
                imageArtifacts.push(orientation);
            }
        }

        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new CBUnitActuatorTrigger(this, this.unit, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(125, 173));
        loss.loss = true;
        imageArtifacts.push(loss);
        createMoveTriggers.call(this, imageArtifacts);
        createRotateTriggers.call(this, imageArtifacts);
        this.initElement(imageArtifacts);
    }

    getLossTrigger() {
        return this.findTrigger(artifact=>artifact.loss);
    }

    getTrigger(angle, rotate) {
        return this.findTrigger(artifact=>artifact.pangle === angle && artifact.rotate===rotate);
    }

    onMouseClick(trigger, event) {
        if (trigger.loss) {
            this.action.takeALossFromUnit(event);
        }
        else if (trigger.rotate) {
            let hex1 = this.unit.hexLocation.getOtherHex(trigger.hex);
            let hex2 = trigger.hex.getNearHex(trigger.angle);
            let delta = diffAngle(this.unit.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.unit.angle, delta));
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.moveType);
        }
        else {
            let hex1 = this.unit.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.unit.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.moveType);
        }
    }

}

export class CBShockAttackInsert extends InsertMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/shock-attack-insert.png", CBShockAttackInsert.DIMENSION,  CBShockAttackInsert.PAGE_DIMENSION);
    }

}
CBShockAttackInsert.DIMENSION = new Dimension2D(524, 658);
CBShockAttackInsert.PAGE_DIMENSION = new Dimension2D(524, 850);

export class CBFireAttackInsert extends InsertMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/fire-attack-insert.png", CBFireAttackInsert.DIMENSION,  CBFireAttackInsert.PAGE_DIMENSION);
        this.declareMark("weapons-table", new Point2D(-100, 100));
        this.setMark("weapons-table");
        this.declareMark("exhausted", new Point2D(-100, -380));
        this.setMark("exhausted");
    }

}
CBFireAttackInsert.DIMENSION = new Dimension2D(524, 658);
CBFireAttackInsert.PAGE_DIMENSION = new Dimension2D(524, 850);

export class CBCombatResultTableInsert extends InsertMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/combat-result-table-insert.png", CBCombatResultTableInsert.DIMENSION);
    }

}
CBCombatResultTableInsert.DIMENSION = new Dimension2D(804, 174);

export class CBWeaponTableInsert extends InsertMixin(DAbstractInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/weapon-table-insert.png", CBWeaponTableInsert.DIMENSION, CBWeaponTableInsert.PAGE_DIMENSION);
        this._margin = new DInsertFrame(this, 0,
            Area2D.create(new Point2D(0, 0), CBWeaponTableInsert.MARGIN_DIMENSION),
            Area2D.create(new Point2D(0, 0), CBWeaponTableInsert.MARGIN_PAGE_DIMENSION)
        )
        this._content = new DInsertFrame(this, 1,
            Area2D.create(new Point2D(86, 0), CBWeaponTableInsert.CONTENT_DIMENSION),
            Area2D.create(new Point2D(86, 0), CBWeaponTableInsert.CONTENT_PAGE_DIMENSION)
        ).setNavigation(true, true, true, true);
        this.addFrame(this._margin);
        this.addFrame(this._content);
    }

    focus(col, row) {
        let colSize = CBWeaponTableInsert.CONTENT_PAGE_DIMENSION.w / CBArbitrator.weaponTable.COLCOUNT;
        let rowSize = CBWeaponTableInsert.CONTENT_PAGE_DIMENSION.h / CBArbitrator.weaponTable.ROWCOUNT;
        let focusPoint = new Point2D(colSize*col+colSize/2+CBWeaponTableInsert.MARGIN, rowSize*row+rowSize/2);
        this.declareMark("focus", focusPoint.plusPoint(new Point2D(-10, 10)));
        this.setMark("focus");
        this._margin.focusOn(new Point2D(CBWeaponTableInsert.MARGIN/2, rowSize*row+rowSize/2));
        this._content.focusOn(focusPoint);
        return this;
    }

}
CBWeaponTableInsert.MARGIN = 86;
CBWeaponTableInsert.DIMENSION = new Dimension2D(500, 500);
CBWeaponTableInsert.PAGE_DIMENSION = new Dimension2D(978, 1146);
CBWeaponTableInsert.MARGIN_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
CBWeaponTableInsert.MARGIN_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);
CBWeaponTableInsert.CONTENT_DIMENSION = new Dimension2D(CBWeaponTableInsert.DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
CBWeaponTableInsert.CONTENT_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.PAGE_DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);

