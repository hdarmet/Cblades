'use strict'

import {
    DIconMenuItem
} from "../widget.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    CBHexSideId
} from "./map.js";
import {
    CBAction, CBStacking
} from "./game.js";
import {
    CBActionActuator, CBActuatorImageTrigger
} from "./playable.js";
import {
    Dimension2D, Point2D, sumAngle
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    CBCharge
} from "./unit.js";

export function registerInteractiveFormation() {
    CBInteractivePlayer.prototype.createFormation = function (unit, event) {
        unit.launchAction(new InteractiveCreateFormationAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.includeTroops = function (unit, event) {
        unit.launchAction(new InteractiveIncludeTroopsAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.releaseTroops = function (unit, event) {
        unit.launchAction(new InteractiveReleaseTroopsAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.breakFormation = function (unit, event) {
        unit.launchAction(new InteractiveBreakFormationAction(this.game, unit, event));
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
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createFormationMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveBreakFormationAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let {fromHex, toHex} = this.game.arbitrator.getTroopsAfterFormationBreak(this.unit);
        this.unit.breakFormation(fromHex, toHex);
        for (let replacement of fromHex) {
            replacement.markAsBeingPlayed();
        }
        for (let replacement of toHex) {
            replacement.markAsBeingPlayed();
        }
        this.markAsFinished();
    }

}

export class InteractiveCreateFormationAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
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
        replacement.appendToMap(new CBHexSideId(hexLocation, hexId), CBStacking.TOP);
        replacement.rotate(replaced[0].angle);
        replacement.markAsBeingPlayed();
        for (let troop of replaced) {
            troop.deleteFromMap();
            troop.move(null, 0);
        }
        this.markAsFinished();
    }

    createCreateFormationActuator(joinableHexes) {
        return new CBCreateFormationActuator(this, joinableHexes);
    }

}

export class InteractiveReleaseTroopsAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
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
        troop.markAsBeingPlayed();
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

export class InteractiveIncludeTroopsAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let {removed, stepCount, tired, lackOfMunitions} = this.game.arbitrator.includeTroops(this.unit);
        this.unit.fixRemainingLossSteps(stepCount);
        this.unit.fixTirednessLevel(tired);
        this.unit.fixLackOfMunitionsLevel(lackOfMunitions);
        this.unit.markAsBeingPlayed();
        for (let removedUnit of removed) {
            removedUnit.deleteFromMap();
        }
        this.markAsFinished();
    }

}

export class CBCreateFormationActuator extends CBActionActuator {

    constructor(action, joinableHexes) {
        super(action);
        let image = DImage.getImage("./../images/actuators/formation.png");
        let imageArtifacts = [];
        for (let hex of joinableHexes) {
            let creation = new CBActuatorImageTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 170));
            creation.position = Point2D.position(this.playable.location, new CBHexSideId(action.unit.hexLocation, hex).location, 1);
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

export class CBReleaseTroopActuator extends CBActionActuator {

    constructor(action, hexes, stepCount) {

        function _createTrigger(image, hex, angle, factor, stepCount, stacking) {
            let trigger = new CBActuatorImageTrigger(this, "actuators", image,
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
            imageArtifacts.push(_createTrigger.call(this, oneStepImage, hex, action.unit.angle, 0.6, 1, CBStacking.TOP));
            imageArtifacts.push(_createTrigger.call(this, oneStepImage, hex, sumAngle(action.unit.angle, 180), 0.6, 1, CBStacking.BOTTOM));
            if (stepCount>1) {
                imageArtifacts.push(_createTrigger.call(this, twoStepsImage, hex, action.unit.angle, 1.2, 2, CBStacking.TOP));
                imageArtifacts.push(_createTrigger.call(this, twoStepsImage, hex, sumAngle(action.unit.angle, 180), 1.2, 2, CBStacking.BOTTOM));
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


