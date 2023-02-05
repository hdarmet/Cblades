'use strict'

import {
    Area2D,
    canonizeAngle,
    Dimension2D, invertAngle, Point2D, sumAngle
} from "../../geometry.js";
import {
    DDice, DIconMenuItem, DInsertFrame, DMask, DResult, DScene
} from "../../widget.js";
import {
    Mechanisms,
    Memento
} from "../../mechanisms.js";
import {
    CBHexSideId
} from "../map.js";
import {
    CBAction, CBStacking
} from "../game.js";
import {
    CBActionActuator, CBActuatorImageTrigger, CBActuatorTriggerMixin, CBMask, CBInsert,
    CBMoveMode, CBAbstractInsert, CBGame
} from "../playable.js";
import {
    CBCharge,
    CBMovement, CBMoveProfile
} from "../unit.js";
import {
    DImage
} from "../../draw.js";
import {
    CBActionMenu, CBCheckEngagementInsert, CBInteractivePlayer, CBMoralInsert
} from "./interactive-player.js";
import {
    DImageArtifact
} from "../../board.js";
import {
    stringifyHexLocations
} from "../pathfinding.js";
import {
    CBMoveSequenceElement,
    CBReorientSequenceElement,
    CBRotateSequenceElement,
    CBSequence,
    CBTurnSequenceElement,
    CBStateSequenceElement,
    CBConfrontSequenceElement,
    CBAttackerEngagementSequenceElement,
    CBDisengagementSequenceElement,
    CBCrossingSequenceElement
} from "../sequences.js";
import {
    SequenceLoader
} from "../loader.js";

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
    CBActionMenu.menuBuilders.remove(createMovementMenuItems);
}

export class InteractiveAbstractMovementAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
        this._movementCost = 0;
        this._moves = 0;
    }

    get unit() {
        return this.playable;
    }

    _memento() {
        let memento = super._memento();
        memento.movementCost = this._movementCost;
        memento.moves = this._moves;
        memento.isFinishable = this._isFinishable;
        memento.unitsToCross = this._unitsToCross;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._movementCost = memento.movementCost;
        this._moves = memento.moves;
        this._isFinishable = memento.isFinishable;
        this._unitsToCross = memento.unitsToCross;
    }

    get movementCost() {
        return this._movementCost;
    }

    get moves() {
        return this._moves;
    }

    setMoves(moves) {
        Memento.register(this);
        this._moves = moves;
    }

    isFinishable() {
        return this._constraint ? this._constraint.isActionFinishable() : true;
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

    _filterFormationRotations(zones) {
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

    _getAllowedFormationRotations(start) {
        return start ?
            this.game.arbitrator.getAllowedFormationFirstRotations(this.unit):
            this.game.arbitrator.getAllowedFormationSubsequentRotations(this.unit);
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

    getAllowedFormationRotations(start) {
        return this._filterFormationRotations(this._getAllowedFormationRotations(start));
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
            if (moveDirections.length || turnDirections.length) {
                let moveFormationActuator = this.createFormationMoveActuator(moveDirections, turnDirections, start);
                moveFormationActuator.enableClosing(finishable);
                this.game.openActuator(moveFormationActuator);
            }
            return moveDirections.length + turnDirections.length;
        }
        else {
            let moveDirections = this.getAllowedMoves(start);
            if (moveDirections.length) {
                let moveActuator = this.createMoveActuator(moveDirections, start);
                moveActuator.enableClosing(finishable);
                this.game.openActuator(moveActuator);
            }
            return moveDirections.length;
        }
    }

    _buildMovementHelpActuator(finishable) {
        let helpActuator = this.createMovementHelpActuator(this.game.arbitrator.canGetTired(this.unit));
        helpActuator.enableClosing(finishable);
        this.game.openActuator(helpActuator);
    }

    _buildRotationActuator(start, finishable) {
        let orientationDirections = this.unit.formationNature ?
            this.getAllowedFormationRotations(start) :
            this.getAllowedRotations(start);
        if (orientationDirections.length) {
            let orientationActuator = this.createRotationActuator(orientationDirections, start);
            orientationActuator.enableClosing(finishable);
            this.game.openActuator(orientationActuator);
        }
        return orientationDirections.length;
    }

    _createMovementActuators(start) {
        this.game.closeActuators();
        let finishable = this.isFinishable();
        this.game.setFocusedPlayable(finishable ? null : this.unit);
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
        this.game.setFocusedPlayable(finishable ? null : this.unit);
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
        this._movementCost += cost;
        if (this.isFinishable() && !this._isFinishable) {
            this._isFinishable = true;
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHABLE);
        }
    }

    rotateUnit(angle, start) {
        this.game.closeActuators();
        angle = canonizeAngle(angle);
        let cost = this.game.arbitrator.getTerrainRotationCost(this.unit, angle);
        cost = this._updateTirednessForRotation(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.rotate(angle, cost);
        let played = !this._continueAfterRotation();
        this._markUnitActivationAfterMovement(played);
        CBSequence.appendElement(this.game, new CBRotateSequenceElement({game:this.game, unit: this.unit, angle}));
    }

    _checkIfANonRoutedCrossedUnitLoseCohesion(crossedUnits, processing, cancellable) {
        if (crossedUnits.length) {
            let crossedUnit = crossedUnits.pop();
            new CBLoseCohesionForCrossingChecking(this.game, crossedUnit).play( () => {
                this.game.validate();
                this._checkIfANonRoutedCrossedUnitLoseCohesion(crossedUnits, processing, false);
            }, cancellable);
        }
        else {
            processing();
        }
    }

    _doCrossChecking(processing) {
        if (this._unitsToCross && this._unitsToCross.length) {
            this._checkIfANonRoutedCrossedUnitLoseCohesion([this.unit, ...this._unitsToCross], processing, true);
        }
        else {
            processing();
        }
    }

    _finishMove() {
    }

    _continueAfterMove() {
        this._doCrossChecking(
            ()=>{
                this._finishMove();
            }
        );
    }

    _displaceUnit(hexLocation, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.move(hexLocation, cost, CBStacking.BOTTOM);
        this._continueAfterMove();
        CBSequence.appendElement(this.game, new CBMoveSequenceElement({
            game:this.game, unit: this.unit, hexLocation, stacking: CBStacking.BOTTOM
        }));
    }

    _turnUnit(angle, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.turn(angle, cost, CBStacking.BOTTOM);
        this._continueAfterMove();
        CBSequence.appendElement(this.game, new CBTurnSequenceElement({
            game:this.game, unit: this.unit, angle, hexLocation: this.unit.hexLocation,  stacking: CBStacking.BOTTOM
        }));
    }

    _collectUnitsToCross() {
        if (this.unit.troopNature) {
            Memento.register(this);
            this._unitsToCross = this.game.arbitrator.getTroopsToCrossOnForwardMovement(this.unit);
        }
    }

    moveUnit(hexId, angle, start) {
        this._collectUnitsToCross();
        this.setMoves(this.moves+1);
        this._displaceUnit(hexId, start, this.game.arbitrator.getTerrainMoveCost(this.unit, angle));
    }

    moveFormation(hexSideId, angle, start) {
        this.setMoves(this.moves+1);
        this._displaceUnit(hexSideId, start, this.game.arbitrator.getFormationTerrainMoveCost(this.unit, angle));
    }

    turnFormation(angle, start) {
        this._turnUnit(angle, start, this.game.arbitrator.getFormationTerrainTurnCost(this.unit, angle));
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

export class MovementConstraint {

    constructor(action) {
        this._action = action;
    }

    get action() {
        return this._action;
    }

    filterForMoves(zones) {
        return zones;
    }

    filterForRotations(zones) {
        return zones;
    }

    filterForFormationMoves(zones) {
        return zones;
    }

    filterForFormationTurns(zones) {
        return zones;
    }

    filterForFormationRotations(zones) {
        return zones;
    }

    isActionFinishable() {
        return true;
    }

}

export class ControlledAreaMovementConstraint extends MovementConstraint {

    constructor(action, allowedMoves) {
        super(action);
        this._allowedMoves = allowedMoves ? stringifyHexLocations(allowedMoves) : null;
    }

    filterForMoves(zones) {
        return this._filterAllHex(zones);
    }

    filterForRotations(zones) {
        return this._filterAllHex(zones);
    }

    filterForFormationMoves(zones) {
        return this._filterHexSide(zones);
    }

    filterForFormationTurns(zones) {
        return this._filterHexTurn(zones);
    }

    filterForFormationRotations(zones) {
        return this._filterHexSideRotations(zones);
    }

    _filterAllHex(zones) {
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

    _filterAnyHex(zones) {
        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let toInclude = false;
            for (let hexId of zones[angle].hex.hexes) {
                if (this._allowedMoves.has(hexId.location.toString())) {
                    toInclude = true; break;
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
            let hexSide = this.action.unit.hexLocation.moveTo(angle);
            if (this._allowedMoves.has(hexSide.location.toString())) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterHexSideRotations(zones) {
        function checkOption(angle, delta) {
            let hexSideMove = this.action.unit.hexLocation.moveTo(sumAngle(angle, delta));
            let hexSideTurn = this.action.unit.hexLocation.turnTo(sumAngle(angle, delta));
            if (this._allowedMoves.has(hexSideMove.location.toString()) ||
                this._allowedMoves.has(hexSideTurn.location.toString())) {
                result[angle] = zones[angle];
            }
        }

        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            checkOption.call(this, angle, -30);
            checkOption.call(this, angle, 30);
        }
        return result;
    }

    _filterHexTurn(zones) {
        if (!this._allowedMoves) return zones;
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexSide = this.action.unit.hexLocation.turnTo(angle);
            if (this._allowedMoves.has(hexSide.location.toString())) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

}

export class AttackMovementConstraint extends ControlledAreaMovementConstraint {

    constructor(action) {
        super(action, action.game.arbitrator.getAllowedAttackMoves(action.unit));
        this._minMovementCost = action.game.arbitrator.getMinCostForAttackMove(action.unit);
    }

    isActionFinishable() {
        return this.action.game.arbitrator.isAllowedToFireAttack(this.action.unit) ||
            this.action.movementCost>=this._minMovementCost;
    }

}

export class FireMovementConstraint extends ControlledAreaMovementConstraint {

    constructor(action) {
        super(action, action.game.arbitrator.getAllowedFireMoves(action.unit));
    }

    isActionFinishable() {
        return this.action.game.arbitrator.isAllowedToFireAttack(this.action.unit);
    }

}

export class DefenseMovementConstraint extends MovementConstraint {

    constructor(action) {
        super(action);
    }

    filterForMoves(zones) {
        return this._filterNotAdjacent(zones);
    }

    filterForFormationMoves(zones) {
        return this._filterFormationMoveNotAdjacent(zones);
    }

    filterForFormationTurns(zones) {
        return this._filterFormationTurnNotAdjacent(zones);
    }

    _filterNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            if (!this.action.game.arbitrator.isHexLocationAdjacentToFoes(this.action.unit, zones[angle].hex)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterFormationMoveNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexLocation = this.action.unit.hexLocation.moveTo(angle);
            if (!this.action.game.arbitrator.isHexLocationAdjacentToFoes(this.action.unit, hexLocation)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

    _filterFormationTurnNotAdjacent(zones) {
        let result = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let hexLocation = this.action.unit.hexLocation.turnTo(angle);
            if (!this.action.game.arbitrator.isHexLocationAdjacentToFoes(this.action.unit, hexLocation)) {
                result[angle] = zones[angle];
            }
        }
        return result;
    }

}

export class RegroupMovementConstraint extends ControlledAreaMovementConstraint {

    constructor(action) {
        let allowedMoves = action.game.arbitrator.getAllowedMoveAwayMoves(action.unit);
        super(action, allowedMoves ? allowedMoves.hexLocations : null);
        this._minMoves = (allowedMoves && allowedMoves.maxRemainingPoints>=0) ? 1 : 0;
    }

    filterForRotations(zones) {
        return this.action.moves===0 ? this._filterAnyHex(zones) : zones;
    }

    filterForFormationRotations(zones) {
        return this.action.moves===0 ? super.filterForFormationRotations(zones) : zones;
    }

    isActionFinishable() {
        return this.action.moves>=this._minMoves;
    }

}

export class RetreatMovementConstraint extends ControlledAreaMovementConstraint {

    constructor(action) {
        super(action, action.game.arbitrator.getAllowedRetreatMoves(action.unit));
    }

    filterForRotations(zones) {
        return this.action.moves===0 ? this._filterAnyHex(zones) : zones;
    }

    filterForFormationRotations(zones) {
        return this.action.moves===0 ? super.filterForFormationRotations(zones) : zones;
    }

    isActionFinishable() {
        return this.action.moves>=1;
    }

}

export class InteractiveMovementAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, moveMode, event) {
        super(game, unit, event);
        this._moveMode = moveMode;
    }

    _memento() {
        let memento = super._memento();
        memento.moveMode = this._moveMode;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._moveMode = memento.moveMode;
    }

    isFinishable() {
        return super.isFinishable() || this.game.arbitrator.doesUnitEngage(this.unit);
    }

    _prepareMovementConstraints() {
        if (this._moveMode === CBMoveMode.NO_CONSTRAINT) {
            this._constraint = new MovementConstraint(this);
        }
        else if (this._moveMode === CBMoveMode.ATTACK) {
            if (this.game.arbitrator.isAllowedToFireAttack(this.unit)) {
                Memento.register(this);
                this._moveMode = CBMoveMode.FIRE;
                this._constraint = new FireMovementConstraint(this);
            }
            else {
                this._constraint = new AttackMovementConstraint(this);
            }
        }
        else if (this._moveMode === CBMoveMode.FIRE) {
            this._constraint = new FireMovementConstraint(this);
        }
        else if (this._moveMode === CBMoveMode.DEFEND) {
            this._constraint = new DefenseMovementConstraint(this);
        }
        else if (this._moveMode === CBMoveMode.REGROUP) {
            this._constraint = new RegroupMovementConstraint(this);
        }
        else if (this._moveMode === CBMoveMode.RETREAT) {
            this._constraint = new RetreatMovementConstraint(this);
        }
    }

    _filterMoves(zones) {
        return this._constraint.filterForMoves(zones);
    }

    _filterRotations(zones) {
        return this._constraint.filterForRotations(zones);
    }

    _filterFormationRotations(zones) {
        return this._constraint.filterForFormationRotations(zones);
    }

    _filterFormationMoves(zones) {
        return this._constraint.filterForFormationMoves(zones);
    }

    _filterFormationTurns(zones) {
        return this._constraint.filterForFormationTurns(zones);
    }

    _checkChargingStatus(engaging) {
        if (this.moves>=2 || (this.moves===1 && engaging)) {
            this.unit.acknowledgeCharge(true);
        }
        else {
            if (this.unit.charge !== CBCharge.NONE) {
                this.unit.setCharging(CBCharge.NONE);
                CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
            }
        }
    }

    _checkOrientationInStack() {
        let friends = this.game.arbitrator.getTroopsStackedWith(this.unit);
        if (friends.length && friends[0].angle !== this.unit.angle) {
            this.unit.reorient(friends[0].angle);
            CBSequence.appendElement(this.game, new CBReorientSequenceElement({
                game:this.game, unit: this.unit, angle: friends[0].angle
            }));
            if (this.unit.troopNature && !this.unit.isRouted()) {
                this.unit.addOneCohesionLevel();
                CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
            }
        }
        else for (let playable of this.unit.hexLocation.playables) {
            if (playable.characterNature && playable !== this.unit && playable.angle !== this.unit.angle) {
                playable.reorient(this.unit.angle);
                CBSequence.appendElement(this.game, new CBReorientSequenceElement({
                    game:this.game, unit: this.playable, angle: this.unit.angle
                }));
            }
        }
    }

    _checkAttackerEngagement(engaging, action) {
        if (engaging && this.game.arbitrator.isUnitEngaged(this.unit, false)) {
            new CBAttackerEngagementChecking(this.game, this.unit).play(() => {
                super.finalize(action);
                this.game.validate();
            });
            return true;
        }
        return false;
    }

    _finalize(action) {
        let engaging = this.unit.isEngaging();
        this._checkOrientationInStack();
        this._checkChargingStatus(engaging);
        if (!this._checkAttackerEngagement(engaging, action)) {
            super.finalize(action);
        }
    }

    finalize(action) {
        if (!this.isFinalized()) {
            this._finalize(action);
        }
    }

    showRules(point) {
        let scene = new DScene();
        let mask = new CBMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        }
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMovementInsert(), new Point2D(-CBMovementInsert.DIMENSION.w/2, CBMovementInsert.DIMENSION.h/2)
        );
        this.game.openPopup(scene, point);
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

    _finishMove() {
        let mayCharge = this.game.arbitrator.mayUnitCharge(this.unit);
        this.unit.checkEngagement(this.game.arbitrator.doesUnitEngage(this.unit), mayCharge);
        let played = !this._createMovementActuators(false);
        this._markUnitActivationAfterMovement(played);
    }

}

export class CBAttackerEngagementChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(mask);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(this.unit);
        scene.addWidget(
            new CBCheckAttackerEngagementInsert(condition), new Point2D(-CBCheckAttackerEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this._processAttackerEngagementResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action) {
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBAttackerEngagementSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                this.game.closePopup();
                if (scene.result.finished) {
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processAttackerEngagementResult(diceResult) {
        let result = this.game.arbitrator.processAttackerEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
            CBSequence.appendElement(this.game, new CBStateSequenceElement({unit: this.unit}));
        }
        return result;
    }

}

export class CBLoseCohesionForCrossingChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(mask);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(this.unit);
        scene.addWidget(
            new CBCrossCheckCohesionInsert(condition), new Point2D(-CBCrossCheckCohesionInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this._processCohesionLostResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action, cancellable) {
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBCrossingSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                if (cancellable) {
                    Memento.undo();
                }
                if (scene.result.finished) {
                    if (!cancellable) {
                        this.game.closePopup();
                    }
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processCohesionLostResult(unit, diceResult) {
        let result = this.game.arbitrator.processCohesionLostResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
    }

}

export class CBDisengagementChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        this.game.closeActuators();
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(mask);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(this.unit);
        scene.addWidget(
            new CBCheckDisengagementInsert(), new Point2D(-CBCheckDisengagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this._processDisengagementResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action) {
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBDisengagementSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                this.game.closePopup();
                if (scene.result.finished) {
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processDisengagementResult(diceResult) {
        let result = this.game.arbitrator.processDisengagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
        }
        return result;
    }

}

export class CBConfrontChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        this.game.closeActuators();
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        scene.mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(scene.mask);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(this.unit);
        scene.addWidget(
            new CBCheckConfrontEngagementInsert(condition), new Point2D(-CBCheckConfrontEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this._processDisengagementResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action) {
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBConfrontSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=> {
                scene.mask.close();
                this.game.closePopup();
                if (scene.result.finished) {
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processConfrontEngagementResult(diceResult) {
        let result = this.game.arbitrator.processConfrontEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
        }
        return result;
    }

}

export class InteractiveRoutAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
        this.minMovementCost = this.game.arbitrator.getMinCostForAttackMove(this.unit);
    }

    play() {
        if (this.unit.charge !== CBCharge.NONE) {
            this.unit.setCharging(CBCharge.NONE);
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
        }
        super.play();
    }

    showRules(point) {
        let scene = new DScene();
        let mask = new CBMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        }
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBRoutInsert(), new Point2D(-CBRoutInsert.DIMENSION.w/2, CBRoutInsert.DIMENSION.h/2)
        );
        this.game.openPopup(scene, point);
    }

    _createMovementActuators(start) {
        this._allowedMoves = stringifyHexLocations(this.game.arbitrator.getAllowedRoutMoves(this.unit));
        return super._createMovementActuators(start);
    }

    _filterZones(zones) {
        let result = [];
        for (let cangle in zones) {
            let angle = parseInt(cangle);
            if (this._allowedMoves.has(zones[angle].hex.location.toString())) {
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

    finalize(action) {
        if (!this.isFinalized()) {
            if (this._unitMustCheckDisengagement) {
                new CBDisengagementChecking(this.game, this.unit).play( () => {
                    super.finalize(action);
                    this.game.validate();
                });
            }
            else {
                super.finalize(action);
            }
        }
    }

    _updateTirednessForRotation(cost, first) {
        return first ? {type:CBMoveProfile.COST_TYPE.SET, value:0} : super._updateTirednessForRotation(cost, first);
    }

    _finishMove() {
        let played = !this._createMovementActuators(false);
        this._markUnitActivationAfterMovement(played);
    }
}

export class InteractiveMoveBackAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
        this._unitMustCheckDisengagement = this.game.arbitrator.isUnitEngaged(this.unit, true);
    }

    play() {
        if (this.unit.charge !== CBCharge.NONE) {
            this.unit.setCharging(CBCharge.NONE);
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
        }
        super.play();
    }

    _collectUnitsToCross() {
        if (this.unit.troopNature) {
            Memento.register(this);
            this._unitsToCross = this.game.arbitrator.getTroopsToCrossOnBackwardMovement(this.unit);
        }
    }

    _displaceUnit(hexLocation, start, cost) {
        this.game.closeActuators();
        cost = this._updateTirednessForMovement(cost, start);
        this._checkActionProgession(cost.value);
        this.unit.move(hexLocation, cost, CBStacking.TOP);
        this._continueAfterMove();
        CBSequence.appendElement(this.game, new CBMoveSequenceElement({
            game:this.game, unit: this.unit, hexLocation, stacking: CBStacking.TOP
        }));
    }

    _finishMove() {
        this._markUnitActivationAfterMovement(true);
    }

    finalize(action) {
        if (!this.isFinalized()) {
            if (this._unitMustCheckDisengagement) {
                new CBDisengagementChecking(this.game, this.unit).play( () => {
                    super.finalize(action);
                    this.game.validate();
                });
            }
            else {
                super.finalize(action);
            }
        }
    }

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            this.game.closePopup();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBMovementTableInsert(), new Point2D(0, -CBMovementTableInsert.DIMENSION.h/2)
        ).addWidget(
            new CBMoveBackInsert(), new Point2D(-CBMoveBackInsert.DIMENSION.w/2, CBMoveBackInsert.DIMENSION.h/2)
        );
        this.game.openPopup(scene, point);
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

    _getAllowedFormationRotations(start) {
        return [];
    }

}

export class InteractiveConfrontAction extends InteractiveAbstractMovementAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    play() {
        if (this.unit.charge !== CBCharge.NONE) {
            this.unit.setCharging(CBCharge.NONE);
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game:this.game, unit: this.unit}));
        }
        super.play();
    }

    finalize(action) {
        if (!this.isFinalized()) {
            new CBConfrontChecking(this.game, this.unit).play( () => {
                super.finalize(action);
                this.game.validate();
            });
        }
    }

    _continueAfterRotation() {
        return false
    }

    showRules(point) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            this.game.closePopup();
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBToFaceInsert(), new Point2D(-CBToFaceInsert.DIMENSION.w/2, 0)
        );
        this.game.openPopup(scene, point);
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

    _getAllowedFormationRotations(start) {
        return [];
    }

}

function createMovementMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/move.png","./../images/icons/move-gray.png",
            0, 0, event => {
                unit.player.startMoveUnit(unit, actions.moveMode, event);
                return true;
            }, "Bouger normalement").setActive(actions.moveForward),
        new DIconMenuItem("./../images/icons/move-back.png", "./../images/icons/move-back-gray.png",
            1, 0, event => {
                unit.player.startMoveBackUnit(unit, event);
                return true;
            }, "Reculer").setActive(actions.moveBack),
        new DIconMenuItem("./../images/icons/escape.png", "./../images/icons/escape-gray.png",
            2, 0, event => {
                unit.player.startRoutUnit(unit, event);
                return true;
            }, "Fuir").setActive(actions.escape),
        new DIconMenuItem("./../images/icons/to-face.png", "./../images/icons/to-face-gray.png",
            3, 0, event => {
                unit.player.startConfrontUnit(unit, event);
                return true;
            }, "Faire face").setActive(actions.confront)
    ];
}

class HelpTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, canGetTired) {
        let normalImage = DImage.getImage("./../images/actuators/standard-movement-points.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-movement-points.png");
        let extended = actuator.playable.movementPoints<=0 && canGetTired;
        let image = extended ? extendedImage : normalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), HelpTrigger.DIMENSION, 0);
        this._extended = extended
        this.pangle = actuator.playable.angle;
        this.position = actuator.playable.element.getLocation(new Point2D(30, 30))
            .translate(-actuator.playable.element.location.x, -actuator.playable.element.location.y);
    }

    _paint() {
        super._paint();
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings(this._extended ? "#bF9000" : "#2F528F");
        this._level.fillText(
            "" + (this._extended ? this.actuator.playable.extendedMovementPoints :  this.actuator.playable.movementPoints),
            new Point2D(0, 0)
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
        this._trigger.setVisibility && this._trigger.setVisibility(level === CBGame.FULL_VISIBILITY ? 1 : 0);
    }
}

class RotateTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, angle, location) {
        let normalImage = DImage.getImage("./../images/actuators/toward.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-toward.png");
        let image = type === CBMovement.NORMAL ? normalImage : extendedImage;
        super(actuator, "actuators", image, new Point2D(0, 0), RotateTrigger.DIMENSION);
        this.pangle = angle;
        this.position = Point2D.position(actuator.playable.location, location, angle%60?0.87:0.75);
    }

}
RotateTrigger.DIMENSION = new Dimension2D(60, 80);

class RotateCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, angle, location) {
        let normalImage = DImage.getImage("./../images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), RotateCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.position = Point2D.position(actuator.playable.location, location, angle%60?0.65:0.55);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 30px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 0));
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
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
        }
    }

}

class MoveTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, angle, location) {
        let normalImage = DImage.getImage("./../images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-move.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), MoveTrigger.DIMENSION);
        this.pangle = angle;
        this.position = Point2D.position(actuator.playable.location, location, 0.9);
    }

}
MoveTrigger.DIMENSION = new Dimension2D(80, 130);

class MoveCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, angle, location) {
        let normalImage = DImage.getImage("./../images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.position = Point2D.position(actuator.playable.location, location, 1.3);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 0));
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
        this.action.moveUnit(this.playable.hexLocation.getNearHex(trigger.angle), trigger.angle, this._first);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
        }
    }
}

class MoveFormationTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, hex, angle) {
        let normalImage = DImage.getImage("./../images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-move.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), MoveFormationTrigger.DIMENSION);
        this.pangle = angle;
        this.rotate = false;
        let unitHex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.playable.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 0.9);
        this.position = startLocation.plusPoint(targetPosition);
    }

}
MoveFormationTrigger.DIMENSION = new Dimension2D(80, 130);

class MoveFormationCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, hex, angle) {
        let normalImage = DImage.getImage("./../images/actuators/standard-move-cost.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-move-cost.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-move-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveFormationCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.rotate = false;
        let unitHex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.playable.location, unitHex.location, 1);
        let targetPosition = Point2D.position(unitHex.location, hex.location, 1.3);
        this.position = startLocation.plusPoint(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 0));
        }
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }
}
MoveFormationCostTrigger.DIMENSION = new Dimension2D(70, 70);

class TurnFormationTrigger extends CBActuatorImageTrigger {

    constructor(actuator, type, hex, angle) {
        let normalImage = DImage.getImage("./../images/actuators/standard-turn.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-turn.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-turn.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator, "actuators", image, new Point2D(0, 0), TurnFormationTrigger.DIMENSION);
        this.pangle = angle;
        this.rotate = true;
        this.hex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.playable.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 0.8);
        this.position = startLocation.plusPoint(targetPosition);
    }

}
TurnFormationTrigger.DIMENSION = new Dimension2D(80, 96);

class TurnFormationCostTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

    constructor(actuator, cost, type, hex, angle) {
        let normalImage = DImage.getImage("./../images/actuators/standard-turn-cost.png");
        let extendedImage = DImage.getImage("./../images/actuators/extended-turn-cost.png");
        let minimalImage = DImage.getImage("./../images/actuators/minimal-turn-cost.png");
        let image = type === CBMovement.NORMAL ? normalImage : type === CBMovement.EXTENDED ? extendedImage : minimalImage;
        super(actuator,"actuators", image, new Point2D(0, 0), MoveFormationCostTrigger.DIMENSION, 0);
        this._cost = cost;
        this._type = type;
        this.pangle = angle;
        this.rotate = true;
        this.hex =  hex.getNearHex(invertAngle(angle));
        let startLocation = Point2D.position(actuator.playable.location, this.hex.location, 1.5);
        let targetPosition = Point2D.position(this.hex.location, hex.location, 1.1);
        this.position = startLocation.plusPoint(targetPosition);
    }

    _paint() {
        super._paint();
        if (this._cost.value !== undefined) {
            this._level.setTextSettings("bold 35px serif", "center");
            this._level.setFillSettings(this._type === CBMovement.NORMAL ? "#2F528F" : "#bF9000");
            this._level.fillText("" + this._cost.value, new Point2D(0, 0));
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
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
        }
    }

    onMouseClick(trigger, event) {
        this.game.enableActuatorsClosing(true);
        if (trigger.rotate) {
            this.action.turnFormation(trigger.angle);
        }
        else {
            let hex1 = this.playable.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.playable.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.moveFormation(new CBHexSideId(hex1, hex2), trigger.angle);
        }
    }

}

export class CBCheckAttackerEngagementInsert extends CBCheckEngagementInsert {

    constructor(condition) {
        super("./../images/inserts/check-attacker-engagement-insert.png",
            CBCheckAttackerEngagementInsert.DIMENSION,
            condition);
    }

}
CBCheckAttackerEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckConfrontEngagementInsert extends CBCheckEngagementInsert {

    constructor(condition) {
        super("./../images/inserts/check-confront-engagement-insert.png",
            CBCheckConfrontEngagementInsert.DIMENSION,
            condition);
    }

}
CBCheckConfrontEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckDisengagementInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/disengagement-insert.png", CBCheckDisengagementInsert.DIMENSION);
    }

}
CBCheckDisengagementInsert.DIMENSION = new Dimension2D(444, 797);

export class CBMovementTableInsert extends CBAbstractInsert {

    constructor() {
        super("./../images/inserts/movement-table-insert.png", CBMovementTableInsert.DIMENSION, CBMovementTableInsert.PAGE_DIMENSION);
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

export class CBMovementInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/movement-insert.png", CBMovementInsert.DIMENSION, CBMovementInsert.PAGE_DIMENSION);
    }

}
CBMovementInsert.DIMENSION = new Dimension2D(444, 400);
CBMovementInsert.PAGE_DIMENSION = new Dimension2D(444, 2470);

export class CBRoutInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/rout-insert.png", CBRoutInsert.DIMENSION, CBRoutInsert.PAGE_DIMENSION);
    }

}
CBRoutInsert.DIMENSION = new Dimension2D(444, 400);
CBRoutInsert.PAGE_DIMENSION = new Dimension2D(444, 1433);

export class CBMoveBackInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/move-back-insert.png", CBMoveBackInsert.DIMENSION, CBMoveBackInsert.PAGE_DIMENSION);
    }

}
CBMoveBackInsert.DIMENSION = new Dimension2D(444, 400);
CBMoveBackInsert.PAGE_DIMENSION = new Dimension2D(444, 678);

export class CBToFaceInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/to-face-insert.png", CBToFaceInsert.DIMENSION);
    }

}
CBToFaceInsert.DIMENSION = new Dimension2D(444, 298);

export class CBCrossCheckCohesionInsert extends CBInsert {

    constructor(condition) {
        super("./../images/inserts/check-cross-insert.png", CBCrossCheckCohesionInsert.DIMENSION);
        this._condition = condition;
    }

    static DIMENSION = new Dimension2D(444, 249);
}