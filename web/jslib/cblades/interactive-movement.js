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
    Memento
} from "../mechanisms.js";
import {
    CBHexSideId, CBMoveType, CBPathFinding
} from "./map.js";
import {
    CBAction, CBActionActuator, CBActuatorImageTrigger, CBActuatorTriggerMixin
} from "./game.js";
import {
    CBMovement, CBMoveProfile
} from "./unit.js";
import {
    DImage
} from "../draw.js";
import {
    CBActionMenu, CBInteractivePlayer, CBMoralInsert
} from "./interactive-player.js";
import {
    DImageArtifact
} from "../board.js";

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
        let turnDirections = this.game.arbitrator.getFormationAllowedTurns(this.unit, start);
        return {moveDirections, turnDirections};
    }

    _buildMoveActuator(start) {
        if (this.unit.formationNature) {
            let  {moveDirections, turnDirections} = this.getFormationAllowedMoves(start);
            if (moveDirections.length || turnDirections.length) {
                let moveFormationActuator = this.createFormationMoveActuator(moveDirections, turnDirections, start);
                this.game.openActuator(moveFormationActuator);
            }
            return moveDirections.length + turnDirections.length;
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

    _buildMovementHelpActuator() {
        let helpActuator = this.createMovementHelpActuator();
        this.game.openActuator(helpActuator);
    }

    _buildRotationActuator(start) {
        let orientationDirections = this.getAllowedRotations(start)
        if (orientationDirections.length) {
            let orientationActuator = this.createRotationActuator(orientationDirections, start);
            this.game.openActuator(orientationActuator);
        }
        return orientationDirections.length;
    }

    _createMovementActuators(start) {
        this.game.closeActuators();
        if ((this._buildMoveActuator(start) + this._buildRotationActuator(start)) !== 0) {
            this._buildMovementHelpActuator()
           return true;
        }
        else {
            return false;
        }
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
        if (this._createMoveActuator(false)) {
            this._buildMovementHelpActuator();
            return true;
        }
        else {
            return false;
        }
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

    _displaceUnit(hexLocation, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this.unit.move(hexLocation, cost, CBMoveType.FORWARD);
        let played = !this._continueAfterMove();
        this._markUnitActivationAfterMovement(played);
    }

    moveUnit(hexId, angle, start) {
        this._displaceUnit(hexId, start, this.game.arbitrator.getMovementCost(this.unit, angle));
    }

    moveFormation(hexSideId, angle, start) {
        this._displaceUnit(hexSideId, start, this.game.arbitrator.getFormationMovementCost(this.unit, angle));
    }

    turnFormation(hexSideId, angle, start) {
        this._displaceUnit(hexSideId, start, this.game.arbitrator.getFormationTurnCost(this.unit, angle));
    }

    reorientUnit(angle) {
        this.unit.reorient(angle);
    }

    _updateTirednessForMovement(cost) {
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

    createMovementHelpActuator(directions, first) {
        return new CBMovementHelpActuator(this, directions, first);
    }

    createRotationActuator(directions, first) {
        return new CBRotationActuator(this, directions, first);
    }

    createMoveActuator(directions, first) {
        return new CBMoveActuator(this, directions, first);
    }

    createFormationMoveActuator(moveDirections, turnDirections, first) {
        return new CBFormationMoveActuator(this, moveDirections, turnDirections, first);
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

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMovementInsert(), new Point2D(-CBMovementInsert.DIMENSION.w/2, CBMovementInsert.DIMENSION.h/2)
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
        return super._continueAfterRotation();
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

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBRoutInsert(), new Point2D(-CBRoutInsert.DIMENSION.w/2, CBRoutInsert.DIMENSION.h/2)
        ).open(this.game.board, point);
    }

    _createMovementActuators(start) {
        this._goodMoves = this.game.arbitrator.createRootPathFinding(this.unit);
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
        return first ? {type:CBMoveProfile.COST_TYPE.SET, value:0} : super._updateTirednessForRotation(cost, first);
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

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMoveBackInsert(), new Point2D(-CBMoveBackInsert.DIMENSION.w/2, CBMoveBackInsert.DIMENSION.h/2)
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
        let turnDirections = this.game.arbitrator.getFormationAllowedMovesBackTurns(this.unit, start);
        return {moveDirections, turnDirections};
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

    _continueAfterRotation() {
        return false
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

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBToFaceInsert(), new Point2D(-CBToFaceInsert.DIMENSION.w/2, 0)
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
        let turnDirections = this.game.arbitrator.getConfrontFormationAllowedRotations(this.unit);
        return {moveDirections:[],turnDirections};
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

class HelpTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-movement-points.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-movement-points.png");
        let image = actuator.unit.movementPoints>0 ? normalImage : extendedImage;
        super(actuator,"actuators", image, new Point2D(0, 0), HelpTrigger.DIMENSION, 0);
        this.pangle = actuator.unit.angle;
        this.position = actuator.unit.element.getLocation(new Point2D(30, 30))
            .translate(-actuator.unit.element.location.x, -actuator.unit.element.location.y);
    }

    _paint() {
        super._paint();
        let normal = this.actuator.unit.movementPoints>0;
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings(normal?"#2F528F":"#bF9000");
        this._level.fillText(
            "" + (normal?this.actuator.unit.movementPoints:this.actuator.unit.extendedMovementPoints),
            new Point2D(0, 10)
        );
    }
}
HelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBMovementHelpActuator extends CBActionActuator {

    constructor(action) {
        super(action);
        this._trigger = new HelpTrigger(this, this.unit);
        this.initElement([this._trigger]);
    }

    getTrigger() {
        return this._trigger;
    }

    onMouseClick(trigger, event) {
        this.action.showRules(new Point2D(event.offsetX, event.offsetY));
    }

}

class RotateTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, angle, location) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        let image = type === CBMovement.NORMAL ? normalImage : extendedImage;
        super(actuator, "actuators", image, new Point2D(0, 0), RotateTrigger.DIMENSION);
        this.pangle = angle;
        this.position = Point2D.position(actuator.unit.location, location, angle%60?0.87:0.75);
    }

}
RotateTrigger.DIMENSION = new Dimension2D(60, 80);

class RotateCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, angle, location) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), RotateCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.position = Point2D.position(actuator.unit.location, location, angle%60?0.65:0.55);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 30px serif", "center");
            this._level.setFillSettings(this._type===CBMovement.NORMAL?"#2F528F":"#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }
}
RotateCostTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBRotationActuator extends CBActionActuator {

    constructor(action, directions, first) {
        super(action);
        let imageArtifacts = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let rotateTrigger = new RotateTrigger(this, directions[angle].type, angle, directions[angle].hex.location);
            imageArtifacts.push(rotateTrigger);
            let cost = directions[angle].cost;
            if (cost.value) {
                let rotateCostTrigger = new RotateCostTrigger(this, cost, directions[angle].type, angle, directions[angle].hex.location);
                imageArtifacts.push(rotateCostTrigger);
            }
        }
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof RotateTrigger) && (artifact.pangle === angle));
    }

    getCostTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof RotateCostTrigger) && (artifact.pangle === angle));
    }

    onMouseClick(trigger, event) {
        this.action.rotateUnit(trigger.angle, this._first);
    }

}

class MoveTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, angle, location) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), MoveTrigger.DIMENSION);
        this.pangle = angle;
        this.position = Point2D.position(actuator.unit.location, location, 0.9);
    }

}
MoveTrigger.DIMENSION = new Dimension2D(80, 130);

class MoveCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, angle, location) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.position = Point2D.position(actuator.unit.location, location, 1.3);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type===CBMovement.NORMAL?"#2F528F":"#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }
}
MoveCostTrigger.DIMENSION = new Dimension2D(70, 70);

export class CBMoveActuator extends CBActionActuator {

    constructor(action, directions, first) {
        super(action);
        let imageArtifacts = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let costTrigger = new MoveCostTrigger(this,directions[angle].cost,
                directions[angle].type, angle, directions[angle].hex.location);
            imageArtifacts.push(costTrigger);
            let moveTrigger = new MoveTrigger(this,
                directions[angle].type, angle, directions[angle].hex.location);
            imageArtifacts.push(moveTrigger);
        }
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof MoveTrigger) && (artifact.pangle === angle));
    }

    getCostTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof MoveCostTrigger) && (artifact.pangle === angle));
    }

    onMouseClick(trigger, event) {
        this.action.moveUnit(this.unit.hexLocation.getNearHex(trigger.angle), trigger.angle, this._first);
    }

}

class MoveFormationTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, hex, angle) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), MoveFormationTrigger.DIMENSION);
        this.pangle = angle;
        this.rotate = false;
        let unitHex =  hex.getNearHex((angle+180)%360);
        let startLocation = Point2D.position(actuator.unit.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 0.9);
        this.position = startLocation.concat(targetPosition);
    }

}
MoveFormationTrigger.DIMENSION = new Dimension2D(80, 130);

class MoveFormationCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, hex, angle) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveFormationCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.rotate = false;
        let unitHex =  hex.getNearHex((angle+180)%360);
        let startLocation = Point2D.position(actuator.unit.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 1.3);
        this.position = startLocation.concat(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type===CBMovement.NORMAL?"#2F528F":"#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }
}
MoveFormationCostTrigger.DIMENSION = new Dimension2D(70, 70);

class TurnFormationTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, hex, angle) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-turn.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-turn.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-turn.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), TurnFormationTrigger.DIMENSION);
        this.pangle = angle;
        this.rotate = true;
        this.hex =  hex.getNearHex((angle+180)%360);
        let startLocation = Point2D.position(actuator.unit.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 0.8);
        this.position = startLocation.concat(targetPosition);
    }

}
TurnFormationTrigger.DIMENSION = new Dimension2D(80, 96);

class TurnFormationCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, hex, angle) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-turn-cost.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-turn-cost.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-turn-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveFormationCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.rotate = true;
        this.hex =  hex.getNearHex((angle+180)%360);
        let startLocation = Point2D.position(actuator.unit.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 1.1);
        this.position = startLocation.concat(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type===CBMovement.NORMAL?"#2F528F":"#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }
}
TurnFormationCostTrigger.DIMENSION = new Dimension2D(70, 70);

export class CBFormationMoveActuator extends CBActionActuator {

    constructor(action, moveDirections, turnDirections, first) {

        function createMoveTriggers(imageArtifacts) {
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let moveCostTrigger = new MoveFormationCostTrigger(this, moveDirections[angle].cost, moveDirections[angle].type, moveDirections[angle].hex, angle);
                imageArtifacts.push(moveCostTrigger);
                let moveTrigger = new MoveFormationTrigger(this, moveDirections[angle].type, moveDirections[angle].hex, angle);
                imageArtifacts.push(moveTrigger);
            }
        }

        function createRotateTriggers(imageArtifacts) {
            for (let sangle in turnDirections) {
                let angle = parseInt(sangle);
                let turnCostTrigger = new TurnFormationCostTrigger(this, turnDirections[angle].cost, turnDirections[angle].type, turnDirections[angle].hex, angle);
                imageArtifacts.push(turnCostTrigger);
                let turnTrigger = new TurnFormationTrigger(this, turnDirections[angle].type, turnDirections[angle].hex, angle);
                imageArtifacts.push(turnTrigger);
            }
        }

        super(action);
        let imageArtifacts = [];
        createMoveTriggers.call(this, imageArtifacts);
        createRotateTriggers.call(this, imageArtifacts);
        this.initElement(imageArtifacts);
        this._first = first;
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof MoveFormationTrigger) && (artifact.pangle === angle));
    }

    getCostTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof MoveFormationCostTrigger) && (artifact.pangle === angle));
    }

    getTurnTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof TurnFormationTrigger) && (artifact.pangle === angle));
    }

    getTurnCostTrigger(angle) {
        return this.findTrigger(artifact=>(artifact instanceof TurnFormationCostTrigger) && (artifact.pangle === angle));
    }

    onMouseClick(trigger, event) {
        if (trigger.rotate) {
            let delta = diffAngle(this.unit.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.unit.angle, delta));
            this.action.turnFormation(this.unit.hexLocation.turnTo(trigger.angle), trigger.angle);
        }
        else {
            let hex1 = this.unit.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.unit.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.moveFormation(new CBHexSideId(hex1, hex2), trigger.angle);
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

export class CBMovementTableInsert extends DAbstractInsert {

    constructor() {
        super("/CBlades/images/inserts/movement-table-insert.png", CBMovementTableInsert.DIMENSION, CBMovementTableInsert.PAGE_DIMENSION);
        this.addFrame(new DInsertFrame(this, 0,
                Area2D.create(new Point2D(0, 0), CBMovementTableInsert.MARGIN),
                Area2D.create(new Point2D(0, 0), CBMovementTableInsert.MARGIN)
            )
        );
        this.addFrame(new DInsertFrame(this, 1,
                Area2D.create(new Point2D(CBMovementTableInsert.MARGIN.w, 0), new Dimension2D(CBMovementTableInsert.DIMENSION.w-CBMovementTableInsert.MARGIN.w, CBMovementTableInsert.MARGIN.h)),
                Area2D.create(new Point2D(CBMovementTableInsert.MARGIN.w, 0), new Dimension2D(CBMovementTableInsert.PAGE_DIMENSION.w-CBMovementTableInsert.MARGIN.w, CBMovementTableInsert.MARGIN.h))
            ).setNavigation(true, true, true, true)
        );
        this.addFrame(new DInsertFrame(this, 2,
                Area2D.create(new Point2D(0, CBMovementTableInsert.MARGIN.h), new Dimension2D(CBMovementTableInsert.DIMENSION.w, CBMovementTableInsert.DIMENSION.h-CBMovementTableInsert.MARGIN.h)),
                Area2D.create(new Point2D(0, CBMovementTableInsert.MARGIN.h), new Dimension2D(CBMovementTableInsert.PAGE_DIMENSION.w, CBMovementTableInsert.PAGE_DIMENSION.h-CBMovementTableInsert.MARGIN.h))
            )
        );
    }

}
CBMovementTableInsert.MARGIN = new Dimension2D(67, 256);
CBMovementTableInsert.DIMENSION = new Dimension2D(900, 366);
CBMovementTableInsert.PAGE_DIMENSION = new Dimension2D(1041, 366);

export class CBMovementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/movement-insert.png", CBMovementInsert.DIMENSION, CBMovementInsert.PAGE_DIMENSION);
    }

}
CBMovementInsert.DIMENSION = new Dimension2D(444, 400);
CBMovementInsert.PAGE_DIMENSION = new Dimension2D(444, 2470);

export class CBRoutInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/rout-insert.png", CBRoutInsert.DIMENSION, CBRoutInsert.PAGE_DIMENSION);
    }

}
CBRoutInsert.DIMENSION = new Dimension2D(444, 400);
CBRoutInsert.PAGE_DIMENSION = new Dimension2D(444, 1433);

export class CBMoveBackInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/move-back-insert.png", CBMoveBackInsert.DIMENSION, CBMoveBackInsert.PAGE_DIMENSION);
    }

}
CBMoveBackInsert.DIMENSION = new Dimension2D(444, 400);
CBMoveBackInsert.PAGE_DIMENSION = new Dimension2D(444, 678);

export class CBToFaceInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/to-face-insert.png", CBToFaceInsert.DIMENSION);
    }

}
CBToFaceInsert.DIMENSION = new Dimension2D(444, 298);