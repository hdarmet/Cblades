'use strict'

import {
    CBEngageSideMode,
    CBMovement, CBMoveProfile
} from "../unit.js";
import {
    diffAngle, reverseAngle, sumAngle
} from "../../geometry.js";
import {
    CBHexSideId, CBHexPathFinding, distanceFromHexLocationToHexLocation
} from "../map.js";

export class CBMovementTeacher {

    isAllowedToMove(unit) {
        if (this.isUnitEngaged(unit)) return false;
        return true;
    }

    isAllowedToMoveBack(unit) {
        if (this.getAllowedMovesBack(unit).length===0) return false;
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

    _processMovementOpportunity(direction, hexLocation, unit, cost, first) {
        let canGetTired = this.canGetTired(unit);
        direction.cost = cost;
        if (cost.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return false;
        if (this.doesHexLocationContainFoes(unit, hexLocation)) {
            return false;
        }
        let foes = this.getPotentialEngagingFoes(unit, hexLocation);
        for (let [side] of foes.entries()) {
            if (side !== CBEngageSideMode.FRONT) return false;
        }
        if (cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) {
            if (first && canGetTired) {
                direction.type = CBMovement.MINIMAL;
                return true;
            }
            else return false;
        }
        if (unit.movementPoints>=cost.value) {
            direction.type = CBMovement.NORMAL;
            return true;
        }
        else if (canGetTired) {
            if (unit.extendedMovementPoints >= cost.value) {
                direction.type = CBMovement.EXTENDED;
                return true;
            } else if (first) {
                direction.type = CBMovement.MINIMAL;
                return true;
            }
            else return false;
        }
    }

    getAllowedMoves(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            let cost = this.getMovementCost(unit, angle);
            if (this._processMovementOpportunity(direction, direction.hex, unit, cost, first)) {
                result[angle] = direction;
            }
        }
        return result;
    }

    getFormationAllowedMoves(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let direction = directions[angle];
                let cost = this.getFormationMovementCost(unit, angle);
                if (this._processMovementOpportunity(direction, unit.hexLocation.moveTo(angle), unit, cost, first)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    getFormationAllowedTurns(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let direction = directions[angle];
                direction.hex = unit.hexLocation.getFaceHex(unit.angle);
                let cost = this.getFormationTurnCost(unit, angle);
                if (this._processMovementOpportunity(direction, direction.hex, unit, cost, first)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    getAllowedMovesBack(unit) {
        let directions = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            let cost = this.getMovementCost(unit, angle);
            if (this._processMovementOpportunity(direction, direction.hex, unit, cost, true)) {
                result[angle] = direction;
            }
        }
        return result;
    }

    getFormationAllowedMovesBack(unit) {
        let directions = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let direction = directions[angle];
                let cost = this.getFormationMovementCost(unit, angle);
                if (this._processMovementOpportunity(direction, unit.hexLocation.moveTo(angle), unit, cost, true)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    getFormationAllowedMovesBackTurns(unit) {
        let directions = this.getUnitBackwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let direction = directions[angle];
                direction.hex = unit.hexLocation.getFaceHex(reverseAngle(unit.angle));
                let cost = this.getFormationTurnCost(unit, angle);
                if (this._processMovementOpportunity(direction, direction.hex, unit, cost, true)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    _checkAllowedRotations(unit, predicate, first) {

        function processAngle(directions, hexes, unit, angle, cost) {
            console.assert(cost.type===CBMoveProfile.COST_TYPE.ADD);
            let canGetTired = this.canGetTired(unit);
            let nearHexId = angle%60 ?
                new CBHexSideId(hexes[angle-30].hex, hexes[(angle+30)%360].hex) :
                hexes[angle].hex;
            if (unit.movementPoints>=cost.value) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL, cost};
            }
            else if (canGetTired) {
                if (unit.extendedMovementPoints >= cost.value) {
                    directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED, cost};
                } else if (first) {
                    directions[angle] = { hex:nearHexId, type:CBMovement.MINIMAL, cost};
                }
            }

        }

        let hexes = this.getUnitAdjacentZone(unit);
        let directions = [];
        if (unit.formationNature) {
            let angle = (unit.angle+180)%360;
            let cost = this.getFormationRotationCost(unit, angle);
            if (predicate(angle)) {
                processAngle.call(this, directions, hexes, unit, angle, cost);
            }
        }
        else {
            for (let angle = 0; angle < 360; angle += 30) {
                let cost = this.getRotationCost(unit, angle);
                if (predicate(angle)) {
                    processAngle.call(this, directions, hexes, unit, angle, cost);
                }
            }
            delete directions[unit.angle];
        }
        return directions;
    }

    getAllowedRotations(unit, first = false) {
        return this._checkAllowedRotations(unit, ()=>true, first);
    }

    getConfrontAllowedRotations(unit) {
        return this._checkAllowedRotations(unit, angle=>this.wouldUnitEngage(unit, unit.hexLocation, angle), true);
    }

    getConfrontFormationAllowedRotations(unit) {

        function filter(orientation, angle, foes) {
            let newHexLocation = unit.hexLocation.turnTo(angle);
            let delta = diffAngle(unit.angle, angle)*2;
            let newAngle = sumAngle(unit.angle, delta);
            return this.wouldUnitEngage(unit, newHexLocation, newAngle, foe=>foes.has(foe));
        }

        let foes = this.getEngagingFoes(unit);
        let forwardRotations = this.getFormationAllowedTurns(unit);
        let backwardRotations = this.getFormationAllowedMovesBackTurns(unit);
        let result = [];
        for (let sangle in forwardRotations) {
            let angle = parseInt(sangle);
            if (filter.call(this, forwardRotations[angle], angle, foes)) {
                result[angle] = forwardRotations[angle];
            }
        }
        for (let sangle in backwardRotations) {
            let angle = parseInt(sangle);
            if (filter.call(this, backwardRotations[angle], angle, foes)) {
                result[angle] = backwardRotations[angle];
            }
        }
        return result;
    }

    getRotationCost(unit, angle, hex=unit.hexLocation, orientation=unit.angle) {
        return unit.moveProfile.getRotationCost(diffAngle(orientation, angle));
    }

    _mergeCosts(cost1, cost2) {
        if (cost1.type === CBMoveProfile.COST_TYPE.SET) return cost1;
        if (cost1.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return cost1;
        if (cost2.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return cost2;
        if (cost1.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) return cost1;
        if (cost2.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) return cost2;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:cost1.value+cost2.value};
    }

    getMovementCost(unit, angle, hex=unit.hexLocation, orientation=unit.angle) {
        let targetHex = hex.getNearHex(angle);
        return this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(hex.to(targetHex)),
            unit.moveProfile.getMovementCostOnHex(targetHex)
        );
    }

    getFormationRotationCost(unit, angle, orientation=unit.angle) {
        return unit.moveProfile.getFormationRotationCost(diffAngle(orientation, angle));
    }

    getFormationMovementCost(unit, angle, hexSide=unit.hexLocation) {
        let fromHexTarget = hexSide.fromHex.getNearHex(angle);
        let fromHexCost = this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(hexSide.fromHex.to(fromHexTarget)),
            unit.moveProfile.getMovementCostOnHex(fromHexTarget)
        );
        let toHexTarget = hexSide.toHex.getNearHex(angle);
        let toHexCost = this._mergeCosts(
            unit.moveProfile.getMovementCostOnHex(toHexTarget),
            unit.moveProfile.getMovementCostOnHexSide(hexSide.toHex.to(toHexTarget))
        );
        return fromHexCost>toHexCost ? fromHexCost : toHexCost;
    }

    getFormationTurnCost(unit, angle, hexSide=unit.hexLocation) {
        let turnMove = hexSide.turnMove(angle);
        return this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(turnMove),
            unit.moveProfile.getMovementCostOnHex(turnMove.toHex)
        );
    }

    doesMovementInflictTiredness(unit, cost) {
        return unit.movementPoints>=0 && (
            cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE || cost.value>unit.movementPoints
        );
    }

    getFoesControlledHexes(unit) {
        let controlledHexes = new Set();
        let foes = this.getFoes(unit);
        for (let foe of foes) {
            for (let hexId of foe.hexLocation.hexes) {
                controlledHexes.add(hexId);
            }
            if (!foe.isRouted()) {
                let zones = this.getUnitForwardZone(foe);
                for (let sangle in zones) {
                    controlledHexes.add(zones[sangle].hex);
                }
            }
        }
        return controlledHexes;
    }

    getMoveCostMethod(unit, freeHexLocation) {
        let forbiddenHexes = this.getFoesControlledHexes(unit);
        return (from, to)=> {
            if (freeHexLocation && freeHexLocation.hasHex(to)) return 0;
            if (forbiddenHexes.has(to)) return null;
            let angle = from.getAngle(to);
            let cost = this.getMovementCost(unit, angle, from, angle);
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

    getTurnCostMethod(unit, freeHexLocation) {
        return (hex, fromAngle, toAngle)=> {
            if (freeHexLocation && freeHexLocation.hasHex(hex)) return 0;
            let cost = this.getRotationCost(unit, toAngle, hex, fromAngle);
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

    createRoutPathFinding(unit) {
        let pathFinding = new CBHexPathFinding(unit.hexLocation, unit.angle, unit.wing.retreatZone,
            this.getMoveCostMethod(unit, unit.hexLocation), this.getTurnCostMethod(unit, unit.hexLocation),
            unit.moveProfile.getMinimalMoveCost()
        );
        return new Set(pathFinding.getGoodNextMoves());
    }

    hasRoutPath(unit) {
        let routPath = this.createRoutPathFinding(unit);
        return !!routPath.size;
    }

    getCostToEngage(unit, foe) {
        let pathFinding = new CBHexPathFinding(foe.hexLocation, foe.angle, unit.hexLocation.hexes,
            this.getMoveCostMethod(foe, unit.hexLocation), this.getTurnCostMethod(foe, unit.hexLocation),
            foe.moveProfile.getMinimalMoveCost(), foe.moveProfile.movementPoints
        );
        return pathFinding.getPathCost();
    }

    foesThatCanJoinAndEngage(unit) {
        let foes = this.getFoes(unit);
        let result = [];
        for (let foe of foes) {
            if (this.isAllowedToMove(foe)) {
                let minimalCost = foe.moveProfile.getMinimalMoveCost();
                let distanceToJoin = distanceFromHexLocationToHexLocation(foe.hexLocation, unit.hexLocation)-minimalCost;
                let range = foe.moveProfile.movementPoints / minimalCost;
                if (range >= distanceToJoin) {
                    let realCost = this.getCostToEngage(unit, foe);
                    if (realCost < foe.moveProfile.movementPoints) result.push(foe);
                }
            }
        }
        return result;
    }

}
