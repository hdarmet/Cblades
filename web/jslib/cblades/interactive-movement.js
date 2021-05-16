'use strict'

import {
    Area2D,
    canonizeAngle,
    Dimension2D, invertAngle, Point2D
} from "../geometry.js";
import {
    DAbstractInsert,
    DDice, DIconMenuItem, DInsert, DInsertFrame, DMask, DResult, DScene
} from "../widget.js";
import {
    Mechanisms,
    Memento
} from "../mechanisms.js";
import {
    CBHexSideId, CBMoveMode, CBMoveType
} from "./map.js";
import {
    CBAction, CBActionActuator, CBActuator, CBActuatorImageTrigger, CBActuatorTriggerMixin, CBMask, WidgetLevelMixin
} from "./game.js";
import {
    CBCharge,
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
import {
    stringifyHexLocations
} from "./pathfinding.js";

export function registerInteractiveMovement() {
    CBInteractivePlayer.prototype.startMoveUnit = function (unit, moveMode, event) {
        unit.launchAction(new InteractiveMovementAction(this.game, unit, moveMode, event));
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
        this._movementCost = 0;
        this._minMovementCost = 0;
        this._moves = 0;
        this._minMoves = 0;
    }

    _memento() {
        let memento = super._memento();
        memento.minMovementCost = this._minMovementCost;
        memento.movementCost = this._movementCost;
        memento.moves = this._moves;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._minMovementCost = memento.minMovementCost;
        this._movementCost = memento.movementCost;
        this._moves = memento.moves;
    }

    set minMovementCost(minMovementCost) {
        this._minMovementCost = minMovementCost;
    }

    setMinMovementCost(minMovementCost) {
        Memento.register(this);
        this._minMovementCost = minMovementCost;
    }

    set minMoves(minMoves) {
        this._minMoves = minMoves;
    }

    setMinMoves(minMoves) {
        Memento.register(this);
        this._minMoves = minMoves;
    }

    get moves() {
        return this._moves;
    }

    setMoves(moves) {
        Memento.register(this);
        this._moves = moves;
    }

    isFinishable() {
        return this._movementCost>=this._minMovementCost && this._moves>=this._minMoves;
    }

    play() {
        this._createMovementActuators(true);
    }

    _getAllowedMoves(start) {
        return start ?
            this.game.arbitrator.getAllowedFirstMoves(this.unit) :
            this.game.arbitrator.getAllowedSubsequentMoves(this.unit);
    }

    _filterMoves(zones) {
        return zones;
    }

    _filterRotations(zones) {
        return zones;
    }

    _filterFormationMoves(zones) {
        return zones;
    }

    _filterFormationTurns(zones) {
        return zones;
    }

    _getAllowedRotations(start) {
        return start ?
            this.game.arbitrator.getAllowedFirstRotations(this.unit):
            this.game.arbitrator.getAllowedSubsequentRotations(this.unit);
    }

    _getFormationAllowedMoves(start) {
        let moveDirections = start ?
            this.game.arbitrator.getFormationAllowedFirstMoves(this.unit) :
            this.game.arbitrator.getFormationAllowedSubsequentMoves(this.unit);
        let turnDirections = start ?
            this.game.arbitrator.getFormationAllowedFirstTurns(this.unit) :
            this.game.arbitrator.getFormationAllowedSubsequentTurns(this.unit);
        return [moveDirections, turnDirections];
    }

    getAllowedMoves(start) {
        return this._filterMoves(this._getAllowedMoves(start));
    }

    getAllowedRotations(start) {
        return this._filterRotations(this._getAllowedRotations(start));
    }

    getFormationAllowedMoves(start) {
        let allowedZones = this._getFormationAllowedMoves(start);
        return {
            moveDirections:this._filterFormationMoves(allowedZones[0]),
            turnDirections:this._filterFormationTurns(allowedZones[1])
        };
    }

    _buildMoveActuator(start, finishable) {
        if (this.unit.formationNature) {
            let  {moveDirections, turnDirections} = this.getFormationAllowedMoves(start);
            if (moveDirections.length===0) this.setMinMovementCost(0);
            if (moveDirections.length || turnDirections.length) {
                let moveFormationActuator = this.createFormationMoveActuator(moveDirections, turnDirections, start);
                moveFormationActuator.enableHide(finishable);
                this.game.openActuator(moveFormationActuator);
            }
            return moveDirections.length + turnDirections.length;
        }
        else {
            let moveDirections = this.getAllowedMoves(start);
            if (moveDirections.length===0) this.setMinMovementCost(0);
            if (moveDirections.length) {
                let moveActuator = this.createMoveActuator(moveDirections, start);
                moveActuator.enableHide(finishable);
                this.game.openActuator(moveActuator);
            }
            return moveDirections.length;
        }
    }

    _buildMovementHelpActuator(finishable) {
        let helpActuator = this.createMovementHelpActuator(this.game.arbitrator.canGetTired(this.unit));
        helpActuator.enableHide(finishable);
        this.game.openActuator(helpActuator);
    }

    _buildRotationActuator(start, finishable) {
        let orientationDirections = this.getAllowedRotations(start)
        if (orientationDirections.length) {
            let orientationActuator = this.createRotationActuator(orientationDirections, start);
            orientationActuator.enableHide(finishable);
            this.game.openActuator(orientationActuator);
        }
        return orientationDirections.length;
    }

    _createMovementActuators(start) {
        this.game.closeActuators();
        let finishable = this.isFinishable();
        this.game.setFocusedUnit(finishable ? null : this.unit);
        if ((this._buildMoveActuator(start, finishable) + this._buildRotationActuator(start, finishable)) !== 0) {
            this._buildMovementHelpActuator(finishable)
           return true;
        }
        else {
            return false;
        }
    }

    _continueAfterRotation() {
        this.game.closeActuators();
        let finishable = this.isFinishable();
        this.game.setFocusedUnit(finishable ? null : this.unit);
        if (this._buildMoveActuator(false, finishable) !== 0) {
            this._buildMovementHelpActuator(finishable);
            return true;
        }
        else {
            return false;
        }
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

    _checkActionProgession(cost) {
        let finishable = this.isFinishable();
        this._movementCost += cost;
        if (this.isFinishable()!==finishable) {
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHABLE);
        }
    }

    rotateUnit(angle, start) {
        this.game.closeActuators();
        angle = canonizeAngle(angle);
        let cost = this.game.arbitrator.getRotationCost(this.unit, angle);
        cost = this._updateTirednessForRotation(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.rotate(angle, cost);
        let played = !this._continueAfterRotation();
        this._markUnitActivationAfterMovement(played);
    }

    _continueAfterMove() {
        this.setMoves(this.moves+1);
        return false
    }

    _displaceUnit(hexLocation, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.move(hexLocation, cost, CBMoveType.FORWARD);
        let played = !this._continueAfterMove();
        this._markUnitActivationAfterMovement(played);
    }

    _turnUnit(angle, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.turn(angle, cost, CBMoveType.FORWARD);
        let played = !this._continueAfterMove();
        this._markUnitActivationAfterMovement(played);
    }

    moveUnit(hexId, angle, start) {
        this._displaceUnit(hexId, start, this.game.arbitrator.getMovementCost(this.unit, angle));
    }

    moveFormation(hexSideId, angle, start) {
        this._displaceUnit(hexSideId, start, this.game.arbitrator.getFormationMovementCost(this.unit, angle));
    }

    turnFormation(angle, start) {
        this._turnUnit(angle, start, this.game.arbitrator.getFormationTurnCost(this.unit, angle));
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

    createMovementHelpActuator(canGetTired) {
        return new CBMovementHelpActuator(this, canGetTired, false);
    }

    createRotationActuator(directions, first) {
        return new CBRotationActuator(this, directions, first, false);
    }

    createMoveActuator(directions, first) {
        return new CBMoveActuator(this, directions, first, false);
    }

    createFormationMoveActuator(moveDirections, turnDirections, first) {
        return new CBFormationMoveActuator(this, moveDirections, turnDirections, first, false);
    }

}

export class InteractiveMovementAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, moveMode, event) {
        super(game, unit, event);
        this._moveMode = moveMode;
    }

    isFinishable() {
        return super.isFinishable() || this.game.arbitrator.doesUnitEngage(this.unit);
    }

    _prepareMovementConstraints() {
        if (this._moveMode === CBMoveMode.ATTACK) {
            this._allowedMoves = stringifyHexLocations(this.game.arbitrator.getAllowedAttackMoves(this.unit));
            this._filterForMoves = this._filterHex;
            this._filterForRotations = this._filterHex;
            this._filterForFormationMoves = this._filterHexSide;
            this._filterForFormationTurns = this._filterHexTurn;
            this.minMovementCost = this.game.arbitrator.getMinCostForAttackMove(this.unit);
        }
        else if (this._moveMode === CBMoveMode.DEFEND) {
            this._filterForMoves = this._filterNotAdjacent;
            this._filterForFormationMoves = this._filterFormationMoveNotAdjacent;
            this._filterForFormationTurns = this._filterFormationTurnNotAdjacent;
        }
        else if (this._moveMode === CBMoveMode.REGROUP) {
            this._allowedMoves = stringifyHexLocations(this.game.arbitrator.getAllowedMoveAwayMoves(this.unit));
            this._filterForMoves = this._filterHex;
            this._filterForRotations = this.moves===0 ? this._filterHex : null;
            this._filterForFormationMoves = this._filterHexSide;
            this._filterForFormationTurns = this._filterHexTurn;
            this.minMoves = 1;
        }
        else if (this._moveMode === CBMoveMode.RETREAT) {
            this._allowedMoves = stringifyHexLocations(this.game.arbitrator.getAllowedRetreatMoves(this.unit));
            this._filterForMoves = this._filterHex;
            this._filterForFormationMoves = this._filterHexSide;
            this._filterForFormationTurns = this._filterHexTurn;
        }
    }

    _filterHex(zones) {
        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let toInclude = true;
            for (let hexId of zones[angle].hex.hexes) {
                if (!this._allowedMoves.has(hexId.location.toString())) {
                    toInclude = false; break;
                }
            }
            if (toInclude) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterHexSide(zones) {
        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexSide = this.unit.hexLocation.moveTo(angle);
            if (this._allowedMoves.has(hexSide.location.toString())) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterHexTurn(zones) {
        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexSide = this.unit.hexLocation.turnTo(angle);
            if (this._allowedMoves.has(hexSide.location.toString())) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            if (!this.game.arbitrator.isHexLocationAdjacentToFoes(this.unit, zones[angle].hex)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterFormationMoveNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexLocation = this.unit.hexLocation.moveTo(angle);
            if (!this.game.arbitrator.isHexLocationAdjacentToFoes(this.unit, hexLocation)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterFormationTurnNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexLocation = this.unit.hexLocation.turnTo(angle);
            if (!this.game.arbitrator.isHexLocationAdjacentToFoes(this.unit, hexLocation)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterMoves(zones) {
        if (this._filterForMoves) {
            return this._filterForMoves(zones);
        }
        else return super._filterMoves(zones);
    }

    _filterRotations(zones) {
        if (this._filterForRotations) {
            return this._filterForRotations(zones);
        }
        else return super._filterRotations(zones);
    }

    _filterFormationMoves(zones) {
        if (this._filterForFormationMoves) {
            return this._filterForFormationMoves(zones);
        }
        else return super._filterFormationMoves(zones);
    }

    _filterFormationTurns(zones) {
        if (this._filterForFormationTurns) {
            return this._filterForFormationTurns(zones);
        }
        else return super._filterFormationTurns(zones);
    }

    finalize(action) {
        if (!this.isFinalized()) {
            let engaging = this.unit.isEngaging();
            if (this.moves>=2 || (this.moves===1 && engaging)) {
                this.unit.acknowledgeCharge(true);
            }
            else {
                this.unit.markAsCharging(CBCharge.NONE);
            }
            if (engaging && this.game.arbitrator.isUnitEngaged(this.unit, false)) {
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
            new CBCheckAttackerEngagementInsert(this.game), new Point2D(-CBCheckAttackerEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
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
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(this.game), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMovementInsert(this.game), new Point2D(-CBMovementInsert.DIMENSION.w/2, CBMovementInsert.DIMENSION.h/2)
        ).open(this.game.board, point);
    }

    _processAttackerEngagementResult(diceResult) {
        let result = this.game.arbitrator.processAttackerEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    moveUnit(hexId, angle, start) {
        this.unit.acknowledgeCharge();
        super.moveUnit(hexId, angle, start);
    }

    _createMovementActuators(start) {
        this._prepareMovementConstraints();
        return super._createMovementActuators(start);
    }

    _continueAfterRotation(start) {
        this.unit.checkEngagement(this.game.arbitrator.doesUnitEngage(this.unit), false);
        this._prepareMovementConstraints();
        return super._continueAfterRotation(start);
    }

    _continueAfterMove() {
        super._continueAfterMove();
        let mayCharge = this.game.arbitrator.mayUnitCharge(this.unit);
        this.unit.checkEngagement(this.game.arbitrator.doesUnitEngage(this.unit), mayCharge);
        return this._createMovementActuators(false);
    }

}

export class InteractiveRoutAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
        this.minMovementCost = this.game.arbitrator.getMinCostForAttackMove(this.unit);
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        super.play();
    }

    showRules(point) {
        let scene = new DScene();
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(this.game), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBRoutInsert(this.game), new Point2D(-CBRoutInsert.DIMENSION.w/2, CBRoutInsert.DIMENSION.h/2)
        ).open(this.game.board, point);
    }

    _createMovementActuators(start) {
        this._allowedMoves = this.game.arbitrator.getAllowedRoutMoves(this.unit);
        return super._createMovementActuators(start);
    }

    _filterZones(zones) {
        let result = [];
        for (let cangle in zones) {
            let angle = parseInt(cangle);
            if (this._allowedMoves.has(zones[angle].hex)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterMoves(zones) {
        return this._filterZones(zones);
    }

    _filterRotations(zones) {
        return this._filterZones(zones);
    }

    _filterFormationMoves(zones) {
        return this._filterZones(zones);
    }

    _filterFormationTurns(zones) {
        return this._filterZones(zones);
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
        this.game.closeActuators();
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
            new CBCheckDisengagementInsert(this.game), new Point2D(-CBCheckDisengagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
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

    _updateTirednessForRotation(cost, first) {
        return first ? {type:CBMoveProfile.COST_TYPE.SET, value:0} : super._updateTirednessForRotation(cost, first);
    }

    _continueAfterMove() {
        super._continueAfterMove();
        return this._createMovementActuators(false);
    }
}

export class InteractiveMoveBackAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        super.play();
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
            new CBCheckDisengagementInsert(this.game), new Point2D(-CBCheckDisengagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
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
            new CBMovementTableInsert(this.game), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMoveBackInsert(this.game), new Point2D(-CBMoveBackInsert.DIMENSION.w/2, CBMoveBackInsert.DIMENSION.h/2)
        ).open(this.game.board, point);
    }

    _processDisengagementResult(diceResult) {
        let result = this.game.arbitrator.processDisengagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    _getAllowedRotations(start) {
        return [];
    }

    _getAllowedMoves(start) {
        return this.game.arbitrator.getAllowedMovesBack(this.unit);
    }

    _getFormationAllowedMoves(start) {
        let moveDirections = this.game.arbitrator.getFormationAllowedMovesBack(this.unit);
        let turnDirections = this.game.arbitrator.getFormationAllowedMovesBackTurns(this.unit);
        return [moveDirections, turnDirections];
    }

}

export class InteractiveConfrontAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        super.play();
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
            new CBCheckConfrontEngagementInsert(this.game), new Point2D(-CBCheckConfrontEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
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
            new CBToFaceInsert(this.game), new Point2D(-CBToFaceInsert.DIMENSION.w/2, 0)
        ).open(this.game.board, point);
    }

    _processConfrontEngagementResult(diceResult) {
        let result = this.game.arbitrator.processConfrontEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    _getAllowedMoves(start) {
        return [];
    }

    _getFormationAllowedMoves(start) {
        let turnDirections = this.game.arbitrator.getConfrontFormationAllowedRotations(this.unit);
        return [[], turnDirections];
    }

    _getAllowedRotations(start) {
        return this.game.arbitrator.getConfrontAllowedRotations(this.unit);
    }

}

function createMovementMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
            0, 0, event => {
                unit.player.startMoveUnit(unit, actions.moveMode, event);
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

    constructor(actuator, canGetTired) {
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-movement-points.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-movement-points.png");
        let extended = actuator.unit.movementPoints<=0 && canGetTired;
        let image = extended ? extendedImage : normalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), HelpTrigger.DIMENSION, 0);
        this._extended = extended
        this.pangle = actuator.unit.angle;
        this.position = actuator.unit.element.getLocation(new Point2D(30, 30))
            .translate(-actuator.unit.element.location.x, -actuator.unit.element.location.y);
    }

    _paint() {
        super._paint();
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings(this._extended ? "#bF9000" : "#2F528F");
        this._level.fillText(
            "" + (this._extended ? this.actuator.unit.extendedMovementPoints :  this.actuator.unit.movementPoints),
            new Point2D(0, 10)
        );
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }
}
HelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBMovementHelpActuator extends CBActionActuator {

    constructor(action, canGetTired) {
        super(action);
        this._trigger = new HelpTrigger(this, canGetTired);
        this.initElement([this._trigger]);
    }

    getTrigger() {
        return this._trigger;
    }

    onMouseClick(trigger, event) {
        this.action.showRules(new Point2D(event.offsetX, event.offsetY));
    }

    setVisibility(level) {
        super.setVisibility(level);
        this._trigger.setVisibility && this._trigger.setVisibility(level === CBActuator.FULL_VISIBILITY ? 1 : 0);
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
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }

    setVisibility(visibility) {
        this.alpha = visibility;
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
        this.game.enableActuatorsClosing(true);
        this.action.rotateUnit(trigger.angle, this._first);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBActuator.FULL_VISIBILITY ? 1:0);
        }
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
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }

    setVisibility(visibility) {
        this.alpha = visibility;
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
        this.game.enableActuatorsClosing(true);
        this.action.moveUnit(this.unit.hexLocation.getNearHex(trigger.angle), trigger.angle, this._first);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBActuator.FULL_VISIBILITY ? 1:0);
        }
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
        let unitHex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.unit.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 0.9);
        this.position = startLocation.plusPoint(targetPosition);
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
        let unitHex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.unit.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 1.3);
        this.position = startLocation.plusPoint(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }

    setVisibility(visibility) {
        this.alpha = visibility;
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
        this.hex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.unit.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 0.8);
        this.position = startLocation.plusPoint(targetPosition);
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
        this.hex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.unit.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 1.1);
        this.position = startLocation.plusPoint(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 10));
        }
    }

    setVisibility(visibility) {
        this.alpha = visibility;
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

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBActuator.FULL_VISIBILITY ? 1:0);
        }
    }

    onMouseClick(trigger, event) {
        this.game.enableActuatorsClosing(true);
        if (trigger.rotate) {
            this.action.turnFormation(trigger.angle);
        }
        else {
            let hex1 = this.unit.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.unit.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.moveFormation(new CBHexSideId(hex1, hex2), trigger.angle);
        }
    }

}

export class CBCheckAttackerEngagementInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/check-attacker-engagement-insert.png", CBCheckAttackerEngagementInsert.DIMENSION);
    }

}
CBCheckAttackerEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckConfrontEngagementInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game,"/CBlades/images/inserts/check-confront-engagement-insert.png", CBCheckConfrontEngagementInsert.DIMENSION);
    }

}
CBCheckConfrontEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckDisengagementInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/disengagement-insert.png", CBCheckDisengagementInsert.DIMENSION);
    }

}
CBCheckDisengagementInsert.DIMENSION = new Dimension2D(444, 797);

export class CBMovementTableInsert extends WidgetLevelMixin(DAbstractInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/movement-table-insert.png", CBMovementTableInsert.DIMENSION, CBMovementTableInsert.PAGE_DIMENSION);
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

export class CBMovementInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/movement-insert.png", CBMovementInsert.DIMENSION, CBMovementInsert.PAGE_DIMENSION);
    }

}
CBMovementInsert.DIMENSION = new Dimension2D(444, 400);
CBMovementInsert.PAGE_DIMENSION = new Dimension2D(444, 2470);

export class CBRoutInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/rout-insert.png", CBRoutInsert.DIMENSION, CBRoutInsert.PAGE_DIMENSION);
    }

}
CBRoutInsert.DIMENSION = new Dimension2D(444, 400);
CBRoutInsert.PAGE_DIMENSION = new Dimension2D(444, 1433);

export class CBMoveBackInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/move-back-insert.png", CBMoveBackInsert.DIMENSION, CBMoveBackInsert.PAGE_DIMENSION);
    }

}
CBMoveBackInsert.DIMENSION = new Dimension2D(444, 400);
CBMoveBackInsert.PAGE_DIMENSION = new Dimension2D(444, 678);

export class CBToFaceInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/to-face-insert.png", CBToFaceInsert.DIMENSION);
    }

}
CBToFaceInsert.DIMENSION = new Dimension2D(444, 298);