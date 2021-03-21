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
    CBHexSideId, CBMoveType, CBPathFinding
} from "./map.js";
import {
    CBAction, CBActuator, CBActuatorTrigger
} from "./game.js";
import {
    CBMovement
} from "./unit.js";
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
    CBInteractivePlayer.prototype.startRoutUnit = function (unit, event) {
        unit.launchAction(new InteractiveRoutAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.startMoveBackUnit = function (unit, event) {
        unit.launchAction(new InteractiveMoveBackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.startConfrontUnit = function (unit, event) {
        unit.launchAction(new InteractiveConfrontAction(this.game, unit, event));
    }
    CBActionMenu.menuBuilders.push(
        createMovementMenuItems
    );
}
export function unregisterInteractiveMovement() {
    delete CBInteractivePlayer.prototype.startMoveUnit;
    delete CBInteractivePlayer.prototype.startRoutUnit;
    delete CBInteractivePlayer.prototype.startMoveBackUnit;
    delete CBInteractivePlayer.prototype.startConfrontUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createMovementMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveAbstractMovementAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createMovementActuators(true);
    }

    getAllowedMoves(start) {
        return this.game.arbitrator.getAllowedMoves(this.unit, start);
    }

    getAllowedRotations(start) {
        return this.game.arbitrator.getAllowedRotations(this.unit, start);
    }

    getFormationAllowedMoves(start) {
        let moveDirections = this.game.arbitrator.getFormationAllowedMoves(this.unit, start);
        let rotateDirections = this.game.arbitrator.getFormationAllowedRotations(this.unit, start);
        return {moveDirections, rotateDirections};
    }

    _buildMoveActuator(start) {
        if (this.unit.formationNature) {
            let  {moveDirections, rotateDirections} = this.getFormationAllowedMoves(start);
            if (moveDirections.length || rotateDirections.length) {
                let moveFormationActuator = this.createFormationMoveActuator(moveDirections, rotateDirections, start);
                this.game.openActuator(moveFormationActuator);
            }
            return moveDirections.length + rotateDirections.length;
        }
        else {
            let moveDirections = this.getAllowedMoves(start)
            if (moveDirections.length) {
                let moveActuator = this.createMoveActuator(moveDirections, start);
                this.game.openActuator(moveActuator);
            }
            return moveDirections.length;
        }
    }

    _buildRotationActuator(start) {
        let orientationDirections = this.getAllowedRotations(start)
        if (orientationDirections.length) {
            let orientationActuator = this.createOrientationActuator(orientationDirections, start);
            this.game.openActuator(orientationActuator);
        }
        return orientationDirections.length;
    }

    _createMovementActuators(start) {
        this.game.closeActuators();
        return (this._buildMoveActuator(start) + this._buildRotationActuator(start)) !== 0;
    }

    _createMoveActuator(start) {
        this.game.closeActuators();
        return this._buildMoveActuator(start) !== 0;
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

    _continueAfterRotation() {
        return false
    }

    rotateUnit(angle, start) {
        this.game.closeActuators();
        angle = canonizeAngle(angle);
        let cost = this.game.arbitrator.getRotationCost(this.unit, angle);
        cost = this._updateTirednessForRotation(cost, start);
        this.unit.rotate(angle, cost);
        let played = !this._continueAfterRotation();
        this._markUnitActivationAfterMovement(played);
    }

    _continueAfterMove() {
        return false
    }

    moveUnit(hexId, start) {
        this.game.closeActuators();
        let cost = this.game.arbitrator.getMovementCost(this.unit, hexId);
        cost = this._updateTirednessForMovement(cost, start);
        this.unit.move(hexId, cost, CBMoveType.FORWARD);
        let played = !this._continueAfterMove();
        this._markUnitActivationAfterMovement(played);
    }

    reorientUnit(angle) {
        this.unit.rotate(angle, 0);
    }

    _updateTirednessForMovement(cost, first) {
        if (this.game.arbitrator.doesMovementInflictTiredness(this.unit, cost)) {
            this.unit.addOneTirednessLevel();
        }
        return cost;
    }

    _updateTirednessForRotation(cost, first) {
        if (this.game.arbitrator.doesMovementInflictTiredness(this.unit, cost)) {
            this.unit.addOneTirednessLevel();
        }
        return cost;
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

export class InteractiveMovementAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
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
                    result.success().appear();
                }
                else {
                    result.failure().appear();
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

    _continueAfterRotation() {
        this.unit.markAsEngaging(this.game.arbitrator.doesUnitEngage(this.unit));
        return this._createMoveActuator(false);
    }

    _continueAfterMove() {
        this.unit.markAsEngaging(this.game.arbitrator.doesUnitEngage(this.unit));
        return this._createMovementActuators(false);
    }

}

export class InteractiveRoutAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
    }

    _createPathFinding() {
        let pathFinding = new CBPathFinding(this.unit.hexLocation, this.unit.angle, this.unit.wing.retreatZone,
            (from, to)=>{
                let angle = from.getAngle(to);
                return this.game.arbitrator.getMovementCost(this.unit, angle, from, angle);
            },
            (hex, fromAngle, toAngle)=>{
                return this.game.arbitrator.getRotationCost(this.unit, toAngle, fromAngle, hex);
            }
        );
        this._goodMoves = new Set(pathFinding.getGoodNextMoves());
    }

    _createMovementActuators(start) {
        this._createPathFinding();
        return super._createMovementActuators(start);
    }

    _filterZones(zones) {
        let result = [];
        for (let cangle in zones) {
            let angle = parseInt(cangle);
            if (this._goodMoves.has(zones[angle].hex)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    finalize(action) {
        if (!this.isFinalized()) {
            if (this._unitMustCheckDisengagement) {
                this.checkDisengagement(this.unit.viewportLocation, () => {
                    super.finalize(action);
                    Memento.clear();
                });
            }
            else {
                super.finalize(action);
            }
        }
    }

    checkDisengagement(point, action) {
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
            new CBCheckDisengagementInsert(), new Point2D(-CBCheckDisengagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processDisengagementResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processDisengagementResult(diceResult) {
        let result = this.game.arbitrator.processDisengagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    getAllowedMoves(start) {
        return this._filterZones(super.getAllowedMoves(start));
    }

    getAllowedRotations(start) {
        return this._filterZones(super.getAllowedRotations(start));
    }

    _updateTirednessForRotation(cost, first) {
        return first ? 0 : super._updateTirednessForRotation(cost, first);
    }

    _continueAfterRotation() {
        return this._createMoveActuator(false);
    }

    _continueAfterMove() {
        return this._createMovementActuators(false);
    }
}

export class InteractiveMoveBackAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
    }

    finalize(action) {
        if (!this.isFinalized()) {
            if (this._unitMustCheckDisengagement) {
                this.checkDisengagement(this.unit.viewportLocation, () => {
                    super.finalize(action);
                    Memento.clear();
                });
            }
            else {
                super.finalize(action);
            }
        }
    }

    checkDisengagement(point, action) {
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
            new CBCheckDisengagementInsert(), new Point2D(-CBCheckDisengagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processDisengagementResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processDisengagementResult(diceResult) {
        let result = this.game.arbitrator.processDisengagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    getAllowedMoves(start) {
        return this.game.arbitrator.getAllowedMovesBack(this.unit);
    }

    getAllowedRotations(start) {
        return [];
    }

    getFormationAllowedMoves(start) {
        let moveDirections = this.game.arbitrator.getFormationAllowedMovesBack(this.unit, start);
        let rotateDirections = this.game.arbitrator.getFormationAllowedMovesBackRotations(this.unit, start);
        return {moveDirections, rotateDirections};
    }

}

export class InteractiveConfrontAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    finalize(action) {
        if (!this.isFinalized()) {
            this.checkConfrontEngagement(this.unit.viewportLocation, () => {
                super.finalize(action);
                Memento.clear();
            });
        }
    }

    checkConfrontEngagement(point, action) {
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
            new CBCheckConfrontEngagementInsert(), new Point2D(-CBCheckConfrontEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processConfrontEngagementResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processConfrontEngagementResult(diceResult) {
        let result = this.game.arbitrator.processConfrontEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    getAllowedMoves(start) {
        return [];
    }

    getFormationAllowedMoves(start) {
        let rotateDirections = this.game.arbitrator.getConfrontFormationAllowedRotations(this.unit);
        return {moveDirections:[], rotateDirections};
    }

    getAllowedRotations(start) {
        return this.game.arbitrator.getConfrontAllowedRotations(this.unit);
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
            1, 0, event => {
                unit.player.startMoveBackUnit(unit, event);
                return true;
            }).setActive(actions.moveBack),
        new DIconMenuItem("/CBlades/images/icons/escape.png", "/CBlades/images/icons/escape-gray.png",
            2, 0, event => {
                unit.player.startRoutUnit(unit, event);
                return true;
            }).setActive(actions.escape),
        new DIconMenuItem("/CBlades/images/icons/to-face.png", "/CBlades/images/icons/to-face-gray.png",
            3, 0, event => {
                unit.player.startConfrontUnit(unit, event);
                return true;
            }).setActive(actions.confront)
    ];
}

export class CBOrientationActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        let imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage : extendedImage;
            let orientation = new CBActuatorTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, angle%60?0.87:0.75);
            orientation.pangle = parseInt(angle);
            imageArtifacts.push(orientation);
        }
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>artifact.pangle === angle);
    }

    onMouseClick(trigger, event) {
        this.action.rotateUnit(trigger.angle, this._first);
    }

}

export class CBMoveActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        let imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage :
                directions[angle].type === CBMovement.EXTENDED ? extendedImage : minimalImage;
            let orientation = new CBActuatorTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            imageArtifacts.push(orientation);
        }
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>artifact.pangle === angle);
    }

    onMouseClick(trigger, event) {
        this.action.moveUnit(this.unit.hexLocation.getNearHex(trigger.angle), this._first);
    }

}

export class CBFormationMoveActuator extends CBActuator {

    constructor(action, moveDirections, rotateDirections, first) {

        function createMoveTriggers(imageArtifacts) {
            let normalMoveImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
            let extendedMoveImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
            let minimalMoveImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let image = moveDirections[angle].type === CBMovement.NORMAL ? normalMoveImage :
                    moveDirections[angle].type === CBMovement.EXTENDED ? extendedMoveImage : minimalMoveImage;
                let orientation = new CBActuatorTrigger(this, "actuators", image,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers(imageArtifacts) {
            let normalRotateImage = DImage.getImage("/CBlades/images/actuators/standard-rotate.png");
            let extendedRotateImage = DImage.getImage("/CBlades/images/actuators/extended-rotate.png");
            let minimalRotateImage = DImage.getImage("/CBlades/images/actuators/minimal-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let image = rotateDirections[angle].type === CBMovement.NORMAL ? normalRotateImage :
                    rotateDirections[angle].type === CBMovement.EXTENDED ? extendedRotateImage : minimalRotateImage;
                let orientation = new CBActuatorTrigger(this, "actuators", image,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                imageArtifacts.push(orientation);
            }
        }

        super(action);
        let imageArtifacts = [];
        createMoveTriggers.call(this, imageArtifacts);
        createRotateTriggers.call(this, imageArtifacts);
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle, rotate) {
        return this.findTrigger(artifact=>artifact.pangle === angle && artifact.rotate===rotate);
    }

    onMouseClick(trigger, event) {
        if (trigger.rotate) {
            let delta = diffAngle(this.unit.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.unit.angle, delta));
            this.action.moveUnit(this.unit.hexLocation.turnTo(trigger.hex, trigger.angle));
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
CBCheckAttackerEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckConfrontEngagementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-confront-engagement-insert.png", CBCheckConfrontEngagementInsert.DIMENSION);
    }

}
CBCheckConfrontEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckDisengagementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/disengagement-insert.png", CBCheckDisengagementInsert.DIMENSION);
    }

}
CBCheckDisengagementInsert.DIMENSION = new Dimension2D(444, 797);