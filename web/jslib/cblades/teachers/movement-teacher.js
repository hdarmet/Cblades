'use strict'

import {
    CBEngageSideMode,
    CBMovement, CBMoveProfile
} from "../unit.js";
import {
    diffAngle, invertAngle, sumAngle
} from "../../geometry.js";
import {
    CBHexId,
    CBHexSideId, distanceFromHexLocationToHexLocation
} from "../map.js";
import {
    getArrivalAreaCosts,
    getPathCost,
    getImprovingNextMoves,
    getInRangeMoves,
    collectHexOptions,
    collectHexSideOptions,
    getHexSidesFromHexes, getToBorderPreferredNextMoves
} from "../pathfinding.js";

export class CBMovementTeacher {

    isAllowedToMove(unit) {
        if (this.isUnitEngaged(unit)) return false;
        return true;
    }

    isAllowedToMoveBack(unit) {
        if (unit.formationNature) {
            if (this.getFormationAllowedMovesBack(unit).length===0 &&
                this.getFormationAllowedMovesBackTurns(unit).length===0) return false;
        }
        else {
            if (this.getAllowedMovesBack(unit).length===0) return false;
        }
        return true;
    }

    isAllowedToRout(unit) {
        if (unit.formationNature) return false;
        if (!this.hasRoutPath(unit)) return false;
        return true;
    }

    isAllowedToConfront(unit) {
        return this.isUnitEngaged(unit) && !this.doesUnitEngage(unit);
    }

    _checkIfFoesProhibitMoveOrTurn(unit, unitHexLocation, unitAngle, checkEngagement) {
        if (this.doesHexLocationContainFoes(unit, unitHexLocation)) {
            return false;
        }
        if (checkEngagement) {
            let foes = this.getPotentialEngagingFoes(unit, unitHexLocation, unitAngle);
            for (let side of foes.values()) {
                if (side !== CBEngageSideMode.FRONT) return false;
            }
        }
        return true;
    }

    _checkAndReportOpportunityMoveCost(opportunity, unit, cost, first) {
        opportunity.cost = cost;
        if (cost.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return false;
        let canGetTired = this.canGetTired(unit);
        if (cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) {
            if (first && canGetTired) {
                opportunity.type = CBMovement.MINIMAL;
                return true;
            }
            else return false;
        }
        if (unit.movementPoints>=cost.value) {
            opportunity.type = CBMovement.NORMAL;
            return true;
        }
        else if (canGetTired) {
            if (unit.extendedMovementPoints >= cost.value) {
                opportunity.type = CBMovement.EXTENDED;
                return true;
            } else if (first) {
                opportunity.type = CBMovement.MINIMAL;
                return true;
            }
            else return false;
        }
    }

    _getAllowedMoves(unit, predicate, first) {
        let opportunities = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            let opportunity = opportunities[angle];
            let cost = this._getMovementCost(unit, angle);
            if (predicate(opportunity) &&
                this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, first)) {
                result[angle] = opportunity;
            }
        }
        return result;
    }

    getAllowedFirstMoves(unit) {
        return this._getAllowedMoves(unit,
            opportunity=>this._checkIfFoesProhibitMoveOrTurn(
                unit, opportunity.hex, unit.angle, true),
            true
        );
    }

    getAllowedSubsequentMoves(unit) {
        return this._getAllowedMoves(unit,
            opportunity=>this._checkIfFoesProhibitMoveOrTurn(
                unit, opportunity.hex, unit.angle, true),
            false
        );
    }

    _getFormationAllowedMoves(unit, predicate, first) {
        let opportunities = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let opportunity = opportunities[angle];
                let cost = this._getFormationMovementCost(unit, angle);
                if (predicate(angle) &&
                    this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, first)) {
                    result[angle] = opportunity;
                }
            }
        }
        return result;
    }

    getFormationAllowedFirstMoves(unit) {
        return this._getFormationAllowedMoves(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.moveTo(angle), unit.angle, true),
            true
        );
    }

    getFormationAllowedSubsequentMoves(unit) {
        return this._getFormationAllowedMoves(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.moveTo(angle), unit.angle, true),
            false
        );
    }

    _getFormationAllowedTurns(unit, predicate, first) {
        let opportunities = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let opportunity = opportunities[angle];
                opportunity.hex = unit.hexLocation.getFaceHex(unit.angle);
                let cost = this._getFormationTurnCost(unit, angle);
                if (predicate(angle) &&
                    this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, first)) {
                    result[angle] = opportunity;
                }
            }
        }
        return result;
    }

    getFormationAllowedFirstTurns(unit) {
        return this._getFormationAllowedTurns(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.turnTo(angle), unit.getTurnOrientation(angle), true),
            true
        );
    }

    getFormationAllowedSubsequentTurns(unit) {
        return this._getFormationAllowedTurns(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.turnTo(angle), unit.getTurnOrientation(angle),
                true),
            false
        );
    }

    _getAllowedMovesBack(unit, predicate) {
        let opportunities = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            let opportunity = opportunities[angle];
            let cost = this._getMovementCost(unit, angle);
            if (cost.type === CBMoveProfile.COST_TYPE.ADD || cost.type === CBMoveProfile.COST_TYPE.SET &&
                cost.value < unit.nominalMovementPoints) {
                cost.value = unit.nominalMovementPoints;
            }
            if (predicate(opportunity) &&
                this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, true)) {
                result[angle] = opportunity;
            }
        }
        return result;
    }

    getAllowedMovesBack(unit) {
        return this._getAllowedMovesBack(unit,
            opportunity=>this._checkIfFoesProhibitMoveOrTurn(
                unit, opportunity.hex, unit.angle, true)
        )
    }

    _getFormationAllowedMovesBack(unit, predicate) {
        let opportunities = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let opportunity = opportunities[angle];
                let cost = this._getFormationMovementCost(unit, angle);
                if (predicate(angle) &&
                    this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, true)) {
                    result[angle] = opportunity;
                }
            }
        }
        return result;
    }

    getFormationAllowedMovesBack(unit) {
        return this._getFormationAllowedMovesBack(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.moveTo(angle), unit.angle, true)
        );
    }

    _getFormationAllowedMovesBackTurns(unit, predicate) {
        let opportunities = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in opportunities) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let opportunity = opportunities[angle];
                opportunity.hex = unit.hexLocation.getFaceHex(invertAngle(unit.angle));
                let cost = this._getFormationTurnCost(unit, angle);
                if (predicate(angle) &&
                    this._checkAndReportOpportunityMoveCost(opportunity, unit, cost, true)) {
                    result[angle] = opportunity;
                }
            }
        }
        return result;
    }

    getFormationAllowedMovesBackTurns(unit) {
        return this._getFormationAllowedMovesBackTurns(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(
                unit, unit.hexLocation.turnTo(angle), unit.getTurnOrientation(angle), true)
        );
    }

    _checkAndReportOpportunityRotationCost(hexes, angle, unit, cost, first) {
        console.assert(cost.type===CBMoveProfile.COST_TYPE.ADD);
        let canGetTired = this.canGetTired(unit);
        let nearHexLocation = !unit.formationNature && angle%60 ?
            new CBHexSideId(hexes[angle-30].hex, hexes[sumAngle(angle, 30)].hex) :
            hexes[angle].hex;
        if (unit.movementPoints>=cost.value) {
            return { hex:nearHexLocation, type:CBMovement.NORMAL, cost};
        }
        else if (canGetTired) {
            if (unit.extendedMovementPoints >= cost.value) {
                return { hex:nearHexLocation, type:CBMovement.EXTENDED, cost};
            } else if (first) {
                return { hex:nearHexLocation, type:CBMovement.MINIMAL, cost};
            }
        }
        return null;
    }

    _getAllowedRotations(unit, predicate, first) {
        let hexes = this.getUnitAdjacentZone(unit);
        let opportunities = [];
        for (let angle = 0; angle < 360; angle += 30) {
            let cost = this.getRotationCost(unit, angle);
            if (predicate(angle)) {
                let opportunity = this._checkAndReportOpportunityRotationCost(hexes, angle, unit, cost, first);
                if (opportunity) {
                    opportunities[angle] = opportunity;
                }
            }
        }
        delete opportunities[unit.angle];
        return opportunities;
    }

    _getAllowedFormationRotations(unit, predicate, first) {
        let hexes = this.getUnitAdjacentZone(unit);
        let opportunities = [];
        let angle = invertAngle(unit.angle);
        let cost = this.getFormationRotationCost(unit, angle);
        if (predicate(angle)) {
            let opportunity = this._checkAndReportOpportunityRotationCost(hexes, angle, unit, cost, first);
            if (opportunity) {
                opportunities[angle] = opportunity;
            }
        }
        return opportunities;
    }

    getAllowedFirstRotations(unit) {
        return this._getAllowedRotations(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(unit, unit.hexLocation, angle),
            true);
    }

    getAllowedSubsequentRotations(unit) {
        return this._getAllowedRotations(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(unit, unit.hexLocation, angle),
            false);
    }

    getAllowedFormationFirstRotations(unit) {
        return this._getAllowedFormationRotations(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(unit, unit.hexLocation, angle),
            true);
    }

    getAllowedFormationSubsequentRotations(unit) {
        return this._getAllowedFormationRotations(unit,
            angle=>this._checkIfFoesProhibitMoveOrTurn(unit, unit.hexLocation, angle),
            false);
    }

    getConfrontAllowedRotations(unit) {
        return this._getAllowedRotations(unit,
                angle=>this.wouldUnitEngage(unit, unit.hexLocation, angle),
            true);
    }

    _checkThatFormationWouldConfront(formation, angle, foes) {
        let newHexLocation = formation.hexLocation.turnTo(angle);
        let delta = diffAngle(formation.angle, angle)*2;
        let newAngle = sumAngle(formation.angle, delta);
        return this.wouldUnitEngage(formation, newHexLocation, newAngle, foe=>foes.has(foe));
    }

    getConfrontFormationAllowedRotations(formation) {
        let foes = this.getEngagingFoes(formation);
        let result = this._getFormationAllowedTurns(formation,
            angle=>this._checkThatFormationWouldConfront(formation, angle, foes),
            false);
        let backwardRotations = this._getFormationAllowedMovesBackTurns(formation,
            angle=>this._checkThatFormationWouldConfront(formation, angle, foes)
        );
        for (let sangle in backwardRotations) {
            result[sangle] = backwardRotations[sangle];
        }
        return result;
    }

    doesMovementInflictTiredness(unit, cost) {
        return unit.movementPoints>=0 && (
            cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE || cost.value>unit.movementPoints
        );
    }

    getOccupiedHexes(units) {
        let occupiedHexes = new Set();
        for (let unit of units) {
            for (let hexId of unit.hexLocation.hexes) {
                occupiedHexes.add(hexId);
            }
        }
        return occupiedHexes;
    }

    getControlledHexes(units) {
        let controlledHexes = new Set();
        for (let unit of units) {
            for (let hexId of unit.hexLocation.hexes) {
                controlledHexes.add(hexId);
            }
            if (!unit.isRouted()) {
                let zones = this.getUnitForwardZone(unit);
                for (let sangle in zones) {
                    controlledHexes.add(zones[sangle].hex);
                }
            }
        }
        return controlledHexes;
    }

    getFoesOccupiedHexes(unit) {
        return this.getOccupiedHexes(this.getFoes(unit));
    }

    getFoesControlledHexes(unit) {
        return this.getControlledHexes(this.getFoes(unit));
    }

    getFoesHexLocations(unit) {
        let result = [];
        let foes = this.getFoes(unit);
        for (let foe of foes) {
            result.push(foe.hexLocation);
        }
        return result;
    }

    getUnitCheckCrossCondition(unit) {
        return {
            modifier: 0
        }
    }

    getStackingCost(unit, maxCount, hexLocation) {
        for (let hex of hexLocation.hexes) {
            if (this.countTroops(hex, unit)>=maxCount) {
                return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
            }
        }
        return null;
    }

    _getMovementCost(unit, angle, hex=unit.hexLocation, orientation=unit.angle) {
        if (this.doesHexLocationContainFoes(unit, hex)) return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
        let cost = this.getStackingCost(unit, 2, hex.getNearHex(angle));
        if (cost) return cost;
        return this.getMovementCost(unit, angle, hex, orientation);
    }

    _getFormationMovementCost(unit, angle, hexSide=unit.hexLocation) {
        if (this.doesHexLocationContainFoes(unit, hexSide)) return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
        let cost = this.getStackingCost(unit, 1, hexSide.moveTo(angle));
        if (cost) return cost;
        return this.getFormationMovementCost(unit, angle, hexSide);
    }

    _getCrossCostForPathFinding(unit, angle, hex) {
        return this.getCrossCost(unit, angle, hex);
    }

    _getMovementCostForPathFinding(unit, angle, hex, target) {
        let targetHex = hex.getNearHex(angle);
        if (!target || !target.hasHex(targetHex)) {
            if (this.doesHexLocationContainFoes(unit, targetHex)) return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
            let cost = this.getStackingCost(unit, 2, targetHex);
            if (cost) return cost;
        }
        return this.getMovementCost(unit, angle, hex);
    }

    _getFormationMovementCostForPathFinding(unit, angle, hex, target) {
        let targetHex = hex.getNearHex(angle);
        if (!target || !target.hasHex(targetHex)) {
            if (this.doesHexLocationContainFoes(unit, targetHex)) return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
            let cost = this.getStackingCost(unit, 1, targetHex);
            if (cost) return cost;
        }
        return this.getMovementCost(unit, angle, hex, angle);
    }

    _getFormationTurnCost(unit, angle, hexSide=unit.hexLocation) {
        let cost = this.getStackingCost(unit, 1, hexSide.turnTo(angle));
        if (cost) return cost;
        return this.getFormationTurnCost(unit, angle, hexSide);
    }

    getCrossCostMethod(unit) {
        return (from, to)=> {
            let angle = from.getAngle(to);
            let cost =  this._getCrossCostForPathFinding(unit, angle, from);
            switch (cost.type) {
                case CBMoveProfile.COST_TYPE.IMPASSABLE:
                    return null;
                case CBMoveProfile.COST_TYPE.MINIMAL_MOVE:
                    return unit.type.getExtendedMovementPoints(unit.remainingStepCount);
                default:
                    return cost.value;
            }
        }
    }

    getMoveCostMethod(unit, freeHexes, forbiddenHexes, target) {
        return (from, to)=> {
            if (freeHexes && freeHexes.has(to)) return 0;
            if (forbiddenHexes && forbiddenHexes.has(to)) return null;
            let angle = from.getAngle(to);
            let cost = unit.formationNature ?
                this._getFormationMovementCostForPathFinding(unit, angle, from, target):
                this._getMovementCostForPathFinding(unit, angle, from, target);
            switch (cost.type) {
                case CBMoveProfile.COST_TYPE.IMPASSABLE:
                    return null;
                case CBMoveProfile.COST_TYPE.MINIMAL_MOVE:
                    return unit.type.getExtendedMovementPoints(unit.remainingStepCount);
                default:
                    return cost.value;
            }
        }
    }

    getStandardMoveCostMethod(unit, freeHexes) {
        let forbiddenHexes = this.getFoesControlledHexes(unit);
        return this.getMoveCostMethod(unit, freeHexes, forbiddenHexes);
    }

    getAttackMoveCostMethod(unit, freeHexes) {
        let forbiddenHexes = this.getFoesOccupiedHexes(unit);
        return this.getMoveCostMethod(unit, freeHexes, forbiddenHexes);
    }

    getTurnCostMethod(unit, freeHexes) {
        return (hex, fromAngle, toAngle)=> {
            if (freeHexes && freeHexes.has(hex)) return 0;
            let cost = unit.formationNature ?
                this.getFormationRotationCost(unit, toAngle, hex, fromAngle):
                this.getRotationCost(unit, toAngle, hex, fromAngle);
            switch (cost.type) {
                case CBMoveProfile.COST_TYPE.IMPASSABLE:
                    return null;
                case CBMoveProfile.COST_TYPE.MINIMAL_MOVE:
                    return unit.type.getExtendedMovementPoints(unit.remainingStepCount);
                default:
                    return cost.value;
            }
        }
    }

    getAllowedRoutMoves(unit) {
        if (!unit.wing.retreatZone.length) return null;
        let retreatZone = unit.wing.retreatZone;
        let config = {
            start:unit.hexLocation, startAngle:unit.angle,
            arrivals:unit.formationNature ? [...getHexSidesFromHexes(retreatZone)] : retreatZone,
            costMove:this.getStandardMoveCostMethod(unit, new Set(unit.hexLocation.hexes)),
            costRotate:this.getTurnCostMethod(unit, new Set(unit.hexLocation.hexes)),
            minimalCost:unit.moveProfile.getMinimalMoveCost()
        };
        return new Set(getImprovingNextMoves(config));
    }

    hasRoutPath(unit) {
        let routPath = this.getAllowedRoutMoves(unit);
        return routPath && !!routPath.size;
    }

    getAllowedAttackMoves(unit) {
        let config = {
            start:unit.hexLocation, startAngle:unit.angle,
            arrivals: this.getFoesHexLocations(unit),
            costCross:this.getCrossCostMethod(unit),
            costMove:this.getAttackMoveCostMethod(unit, new Set(unit.hexLocation.hexes)),
            costRotate:this.getTurnCostMethod(unit, new Set(unit.hexLocation.hexes)),
            minimalCost:unit.moveProfile.getMinimalMoveCost()
        };
        return new Set(getToBorderPreferredNextMoves(config));
    }

    getAllowedFireMoves(unit) {
        let config = {
            start:unit.hexLocation, startAngle:unit.angle,
            range: unit.weaponProfile.getFireRange(),
            arrivals:[...this.getFoesOccupiedHexes(unit)],
            costMove:this.getAttackMoveCostMethod(unit, new Set(unit.hexLocation.hexes)),
            costRotate:this.getTurnCostMethod(unit, new Set(unit.hexLocation.hexes)),
            minimalCost:unit.moveProfile.getMinimalMoveCost(),
            maxCost:this.getMaxMovementPoints(unit)
        };
        return new Set(getInRangeMoves(config));
    }

    getAllowedRetreatMoves(unit) {
        if (!unit.wing.retreatZone.length) return null;
        let retreatZone = unit.wing.retreatZone;
        let config = {
            start:unit.hexLocation, startAngle:unit.angle,
            arrivals:unit.formationNature ? [...getHexSidesFromHexes(retreatZone)] : retreatZone,
            costMove:this.getStandardMoveCostMethod(unit, new Set(unit.hexLocation.hexes)),
            costRotate:this.getTurnCostMethod(unit, new Set(unit.hexLocation.hexes)),
            minimalCost:unit.moveProfile.getMinimalMoveCost()
        };
        return new Set(getImprovingNextMoves(config));
    }

    getCostToEngage(unit, foe) {
        let config = {
            start:unit.hexLocation, startAngle:unit.angle,
            arrival:foe.hexLocation,
            costMove:this.getMoveCostMethod(unit, new Set(foe.hexLocation.hexes)),
            costRotate:this.getTurnCostMethod(unit, new Set(foe.hexLocation.hexes)),
            minimalCost: unit.moveProfile.getMinimalMoveCost()
        };
        return getPathCost(config);
    }

    _getReachableFoes(unit) {
        let result = [];
        let foes = this.getFoes(unit);
        for (let foe of foes) {
            if (this.isAllowedToMove(foe)) {
                let minimalCost = foe.moveProfile.getMinimalMoveCost();
                let distanceToJoin = distanceFromHexLocationToHexLocation(foe.hexLocation, unit.hexLocation);
                let range = foe.moveProfile.movementPoints / minimalCost +2;
                if (range >= distanceToJoin) {
                    result.push(foe);
                }
            }
        }
        return result;
    }

    getNearestFoesThatCanJoinAndEngage(unit) {
        let result = [];
        let maxRemainingPoints = -1;
        for (let foe of this._getReachableFoes(unit)) {
            let realCost = this.getCostToEngage(foe, unit);
            if (realCost !== null) {
                let remainingMovementPoints = foe.moveProfile.movementPoints - realCost;
                if (remainingMovementPoints > maxRemainingPoints) {
                    maxRemainingPoints = remainingMovementPoints;
                    result = [foe];
                } else if (remainingMovementPoints === maxRemainingPoints) {
                    result.push(foe);
                }
            }
        }
        return {foes:result, remainingMovementPoints:maxRemainingPoints};
    }

    _tryToFindAPathToMoveAwayFromAllFoes(foeRecords) {
        let maxRemainingPoints = -Number.MAX_VALUE;
        let result = null;
        for (let {foe, costRecords} of foeRecords) {
            let remainingMovementPoints = foe.moveProfile.movementPoints - costRecords.cost;
            let minCost = foe.moveProfile.movementPoints < costRecords.cost ? foe.moveProfile.movementPoints : costRecords.cost;
            if (remainingMovementPoints > maxRemainingPoints) {
                maxRemainingPoints = remainingMovementPoints;
                result = new Map();
                for (let [hexLocation, cost] of costRecords.hexLocations) {
                    if (cost > minCost) {
                        result.set(hexLocation.location.toString(), hexLocation);
                    }
                }
            }
            if (remainingMovementPoints === maxRemainingPoints) {
                for (let [hexLocation, cost] of costRecords.hexLocations) {
                    if (cost <= minCost) {
                        result.delete(hexLocation.location.toString());
                    }
                }
            }
        }
        return result ? {hexLocations:new Set(result.values()), maxRemainingPoints} : null;
    }

    _tryToFindAPathToNotApproachFoes(foeRecords) {
        let maxRemainingPoints = -Number.MAX_VALUE;
        let result = null;
        for (let {foe, costRecords} of foeRecords) {
            let remainingMovementPoints = foe.moveProfile.movementPoints - costRecords.cost;
            let minCost = foe.moveProfile.movementPoints < costRecords.cost ? foe.moveProfile.movementPoints : costRecords.cost;
            if (remainingMovementPoints > maxRemainingPoints) {
                maxRemainingPoints = remainingMovementPoints;
                result = new Map();
                for (let [hexLocation, cost] of costRecords.hexLocations) {
                    if (cost > minCost) {
                        result.set(hexLocation.location.toString(), hexLocation);
                    }
                }
            }
            if (remainingMovementPoints === maxRemainingPoints) {
                for (let [hexLocation, cost] of costRecords.hexLocations) {
                    if (cost < minCost) {
                        result.delete(hexLocation.location.toString());
                    }
                }
            }
        }
        return result ? {hexLocations:new Set(result.values()), maxRemainingPoints} : null;
    }

    _tryToFindAPathToMoveAwayFromAtLeastOneFoe(foeRecords) {
        let maxRemainingPoints = -Number.MAX_VALUE;
        let result = null;
        for (let {foe, costRecords} of foeRecords) {
            let remainingMovementPoints = foe.moveProfile.movementPoints - costRecords.cost;
            let minCost = foe.moveProfile.movementPoints < costRecords.cost ? foe.moveProfile.movementPoints : costRecords.cost;
            if (remainingMovementPoints >= maxRemainingPoints) {
                if (remainingMovementPoints > maxRemainingPoints) {
                    maxRemainingPoints = remainingMovementPoints;
                    result = new Set();
                }
                for (let [hexLocation, cost] of costRecords.hexLocations) {
                    if (cost > minCost) {
                        result.add(hexLocation);
                    }
                }
            }
        }
        return result ? {hexLocations:new Set(result.values()), maxRemainingPoints} : null;
    }

    getAllowedMoveAwayMoves(unit) {
        function getCost(locations, hexLocation) {
            let cost = Number.MAX_VALUE;
            for (let hexId of hexLocation.hexes) {
                let lCost = locations.hexes.get(hexId);
                if (lCost<cost) cost = lCost;
            }
            return cost;
        }

        let foeRecords = [];
        let minCost = Number.MAX_VALUE;
        for (let foe of this._getReachableFoes(unit)) {
            let start = foe.hexLocation;
            let startAngle = foe.angle;
            let arrivals = unit.hexLocation.hexes;
            let costMove = this.getMoveCostMethod(foe, null, null, unit.hexLocation);
            let costRotate = this.getTurnCostMethod(foe, new Set(foe.hexLocation.hexes));
            let minimalCost = foe.moveProfile.getMinimalMoveCost();
            let costGetter = record=>record.previous ? record.previous.cost : 0;
            let locations = getArrivalAreaCosts({
                start, startAngle, arrivals,
                costMove, costRotate, minimalCost,
                costGetter
            });

            let options = unit.hexLocation instanceof CBHexId ?
                collectHexOptions(unit.hexLocation) :
                collectHexSideOptions(unit.hexLocation, unit.angle);
            let hexLocations = [];
            for (let option of options) {
                hexLocations.push([option.hexLocation, getCost(locations, option.hexLocation)]);
            }
            let cost = getCost(locations, unit.hexLocation);
            if (cost < minCost) {
                minCost = cost;
                foeRecords = [];
            }
            if (cost === minCost) {
                foeRecords.push({foe, costRecords: {cost, hexLocations}});
            }
        }
        let result = this._tryToFindAPathToMoveAwayFromAllFoes(foeRecords);
        if (result && result.hexLocations.size) return result;
        result = this._tryToFindAPathToNotApproachFoes(foeRecords);
        if (result && result.hexLocations.size) return result;
        return this._tryToFindAPathToMoveAwayFromAtLeastOneFoe(foeRecords);
    }

}
