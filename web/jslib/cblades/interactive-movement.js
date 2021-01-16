'use strict'

import {
    canonizeAngle,
    diffAngle,
    Dimension2D, Point2D, sumAngle
} from "../geometry.js";
import {
    DDice, DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBAction, CBActuator,
    CBHexSideId, CBMoveType,
    ActuatorImageArtifact
} from "./game.js";
import {
    CBFormation, CBMovement
} from "./unit.js";
import {
    DElement
} from "../board.js";
import {
    DImage
} from "../draw.js";
import {
    CBActionMenu, CBInteractivePlayer, CBMoralInsert
} from "./interactive-player.js";

export function registerInteractiveMovement() {
    CBInteractivePlayer.prototype.startMoveUnit = function (unit, event) {
        unit.launchAction(new InteractiveMovementAction(this.game, unit, event));
    }
    CBActionMenu.menuBuilders.push(
        createMovementMenuItems
    );
}
export function unregisterInteractiveMovement() {
    delete CBInteractivePlayer.prototype.startMoveUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createMovementMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveMovementAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createMovementActuators(true);
    }

    finalize(action) {
        if (!this.isFinalized()) {
            if (this.unit.isEngaging() && this.game.arbitrator.isUnitEngaged(this.unit, false)) {
                this.checkAttackerEngagement(this.unit.viewportLocation, () => {
                    super.finalize(action);
                    Memento.clear();
                });
            }
            else {
                super.finalize(action);
            }
        }
    }

    checkAttackerEngagement(point, action) {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
            if (result.finished) {
                action();
            }
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBCheckAttackerEngagementInsert(), new Point2D(-CBCheckAttackerEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processAttackerEngagementResult(dice.result);
                if (success) {
                    result.success().show();
                }
                else {
                    result.failure().show();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processAttackerEngagementResult(diceResult) {
        let result = this.game.arbitrator.processAttackerEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    _createMovementActuators(start) {
        this.game.closeActuators();
        let moveDirections;
        if (this.unit instanceof CBFormation) {
            moveDirections = this.game.arbitrator.getFormationAllowedMoves(this.unit, start);
            let rotateDirections = this.game.arbitrator.getFormationAllowedRotations(this.unit, start);
            if (moveDirections.length || rotateDirections.length) {
                let moveFormationActuator = this.createFormationMoveActuator(moveDirections, rotateDirections, start);
                this.game.openActuator(moveFormationActuator);
            }
        }
        else {
            moveDirections = this.game.arbitrator.getAllowedMoves(this.unit, start);
            if (moveDirections.length) {
                let moveActuator = this.createMoveActuator(moveDirections, start);
                this.game.openActuator(moveActuator);
            }
        }
        let orientationDirections = this.game.arbitrator.getAllowedRotations(this.unit, start);
        if (orientationDirections.length) {
            let orientationActuator = this.createOrientationActuator(orientationDirections, start);
            this.game.openActuator(orientationActuator);
        }
        return moveDirections.length === 0 && orientationDirections.length ===0;
    }

    _markUnitActivationAfterMovement(played) {
        if (played) {
            this.markAsFinished();
            this.finalize();
        }
        else {
            this.markAsStarted();
        }
    }

    _checkContact() {
        this.unit.markAsEngaging(this.game.arbitrator.isUnitOnContact(this.unit));
    }

    rotateUnit(angle) {
        angle = canonizeAngle(angle);
        let cost = this.game.arbitrator.getRotationCost(this.unit, angle);
        this._updateTirednessForMovement(cost);
        this.unit.rotate(angle, cost);
        let played = this._createMovementActuators();
        this._checkContact();
        this._markUnitActivationAfterMovement(played);
    }

    moveUnit(hexId) {
        let cost = this.game.arbitrator.getMovementCost(this.unit, hexId);
        this._updateTirednessForMovement(cost);
        this.unit.move(hexId, cost, CBMoveType.FORWARD);
        this._createMovementActuators();
        let played = this._createMovementActuators();
        this._checkContact();
        this._markUnitActivationAfterMovement(played);
    }

    reorientUnit(angle) {
        this.unit.rotate(angle, 0);
    }

    _updateTirednessForMovement(cost) {
        if (this.game.arbitrator.doesMovementInflictTiredness(this.unit, cost)) {
            this.unit.addOneTirednessLevel();
        }
    }

    createOrientationActuator(directions, first) {
        return new CBOrientationActuator(this, directions, first);
    }

    createMoveActuator(directions, first) {
        return new CBMoveActuator(this, directions, first);
    }

    createFormationMoveActuator(moveDirections, rotateDirections, first) {
        return new CBFormationMoveActuator(this, moveDirections, rotateDirections, first);
    }

}

function createMovementMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
            0, 0, event => {
                unit.player.startMoveUnit(unit, event);
                return true;
            }).setActive(actions.moveForward),
        new DIconMenuItem("/CBlades/images/icons/move-back.png", "/CBlades/images/icons/move-back-gray.png",
            1, 0, () => {
                return true;
            }).setActive(actions.moveBack),
        new DIconMenuItem("/CBlades/images/icons/escape.png", "/CBlades/images/icons/escape-gray.png",
            2, 0, () => {
                return true;
            }).setActive(actions.escape),
        new DIconMenuItem("/CBlades/images/icons/to-face.png", "/CBlades/images/icons/to-face-gray.png",
            3, 0, () => {
                return true;
            }).setActive(actions.confront)
    ];
}

export class CBOrientationActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage : extendedImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, angle%60?0.87:0.75);
            orientation.pangle = parseInt(angle);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.rotateUnit(trigger.angle);
    }

}

export class CBMoveActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage :
                directions[angle].type === CBMovement.EXTENDED ? extendedImage : minimalImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.moveUnit(this.unit.hexLocation.getNearHex(trigger.angle));
    }

}

export class CBFormationMoveActuator extends CBActuator {

    constructor(action, moveDirections, rotateDirections, first) {

        function createMoveTriggers() {
            let normalMoveImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
            let extendedMoveImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
            let minimalMoveImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let image = moveDirections[angle].type === CBMovement.NORMAL ? normalMoveImage :
                    moveDirections[angle].type === CBMovement.EXTENDED ? extendedMoveImage : minimalMoveImage;
                let orientation = new ActuatorImageArtifact(this, "actuators", image,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                this._imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers() {
            let normalRotateImage = DImage.getImage("/CBlades/images/actuators/standard-rotate.png");
            let extendedRotateImage = DImage.getImage("/CBlades/images/actuators/extended-rotate.png");
            let minimalRotateImage = DImage.getImage("/CBlades/images/actuators/minimal-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let image = rotateDirections[angle].type === CBMovement.NORMAL ? normalRotateImage :
                    rotateDirections[angle].type === CBMovement.EXTENDED ? extendedRotateImage : minimalRotateImage;
                let orientation = new ActuatorImageArtifact(this, "actuators", image,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                this._imageArtifacts.push(orientation);
            }
        }

        super(action);
        this._imageArtifacts = [];
        createMoveTriggers.call(this);
        createRotateTriggers.call(this);
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    getTrigger(angle, rotate) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle && artifact._rotate===rotate) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        if (trigger.rotate) {
            let hex1 = this.unit.hexLocation.getOtherHex(trigger.hex);
            let hex2 = trigger.hex.getNearHex(trigger.angle);
            let delta = diffAngle(this.unit.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.unit.angle, delta));
            this.action.moveUnit(new CBHexSideId(hex1, hex2));
        }
        else {
            let hex1 = this.unit.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.unit.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.moveUnit(new CBHexSideId(hex1, hex2));
        }
    }

}

export class CBCheckAttackerEngagementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-attacker-engagement-insert.png", CBCheckAttackerEngagementInsert.DIMENSION);
    }

}
CBCheckAttackerEngagementInsert.DIMENSION = new Dimension2D(444, 763)
