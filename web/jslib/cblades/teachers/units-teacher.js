'use strict'

import {
    diffAngle
} from "../../geometry.js";
import {
    CBEngageSideMode, CBOrderInstruction
} from "../unit.js";

export class CBUnitManagementTeacher {

    processDisengagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    processCohesionLostResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    getFriendNonRoutedNeighbors(unit, hexLocation) {
        let friends = [];
        for (let neighbor of this.getNeighbors(hexLocation)) {
            if (this.areUnitsFriends(unit, neighbor) && !neighbor.isRouted()) {
                friends.push(neighbor);
            }
        }
        return friends;
    }

    doesANonRoutedUnitHaveRoutedNeighbors(unit) {
        if (unit.isRouted()) return false;
        for (let neighbor of this.getNeighbors(unit.hexLocation)) {
            if (this.areUnitsFriends(unit, neighbor) && neighbor.isRouted()) {
                return true;
            }
        }
        return false;
    }

    doesARoutedUnitHaveNonRoutedNeighbors(unit) {
        if (!unit.isRouted()) return false;
        for (let neighbor of this.getNeighbors(unit.hexLocation)) {
            if (this.areUnitsFriends(unit, neighbor) && !neighbor.isRouted()) {
                return true;
            }
        }
        return false;
    }

    doesADestroyedUnitHaveNonRoutedNeighbors(unit, hexLocation) {
        for (let neighbor of this.getNeighbors(hexLocation)) {
            if (this.areUnitsFriends(unit, neighbor) && !neighbor.isRouted()) {
                return true;
            }
        }
        return false;
    }

    getUnitCohesionLostCondition(unit) {
        return {
            modifier: 0
        }
    }

    getUnitOfType(units, type) {
        let troops = [];
        for (let unit of units) {
            if (unit.type === type) {
                troops.push(unit);
            }
        }
        return troops;
    }

    canPlayUnit(unit) {
        return unit.isOnBoard() && !unit.hasBeenActivated() && !unit.hasBeenPlayed();
    }

    getFoes(unit) {
        let foes = new Set();
        for (let potentialFoe of this.game.units) {
            if (potentialFoe.isOnBoard() && this.areUnitsFoes(unit, potentialFoe)) {
                foes.add(potentialFoe);
            }
        }
        return foes;
    }

    arePlayersFoes(player1, player2) {
        return player1 !== player2;
    }

    areUnitsFoes(unit1, unit2) {
        return this.arePlayersFoes(unit1.player, unit2.player);
    }

    areUnitsFriends(unit1, unit2) {
        return unit1.player === unit2.player;
    }

    doesHexLocationContainFoes(unit, hexLocation, predicate=foe=>true) {
        for (let foe of hexLocation.units) {
            if (this.areUnitsFoes(unit, foe) && predicate(foe)) return true;
        }
        return false;
    }

    isHexLocationAdjacentToFoes(unit, hexLocation) {
        let hexes = this.getAdjacentHexes(unit, hexLocation);
        for (let hex of hexes.keys()) {
            if (this.doesHexLocationContainFoes(unit, hex)) return true;
        }
        return false;
    }

    doesHexLocationContainFriends(unit, hex) {
        let units = hex.units;
        if (units.length) {
            if (this.areUnitsFriends(unit, units[0])) return true;
        }
        return false;
    }

    mayUnitCharge(unit) {
        if (unit.formationNature) return false;
        if (unit.isExhausted()) return false;
        if (!unit.isInGoodOrder()) return false;
        if (!unit.hasReceivedOrder() && unit.wing.orderInstruction !== CBOrderInstruction.ATTACK) return false;
        return true;
    }

    getMaxMovementPoints(unit) {
        return unit.isExhausted() ? unit.movementPoints : unit.extendedMovementPoints;
    }

    getMinCostForAttackMove(unit) {
        return Math.ceil(unit.movementPoints/2);
    }

    getMinCostForRoutMove(unit) {
        return this.getMaxMovementPoints(unit);
    }

    isAloneInHex(unit) {
        return unit.hexLocation.units.length === 1;
    }

    isStackedTroop(unit) {
        if (!unit.troopNature) return false;
        let units = unit.hexLocation.units;
        for (let aUnit of units) {
            if (aUnit !== unit && aUnit.troopNature) return true;
        }
        return false;
    }

    wouldUnitEngage(attacker, attackerHexLocation, angle, predicate=foe=>true) {
        if (attacker.isRouted()) return false;
        let directions = this.getPotentialForwardZone(attacker, attackerHexLocation, angle)
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            if (this.doesHexLocationContainFoes(attacker, direction.hex, predicate)) {
                return true;
            }
        }
        return false;
    }

    doesUnitEngage(attacker) {
        return this.wouldUnitEngage(attacker, attacker.hexLocation, attacker.angle);
    }

    _getFightSide(attacker, attackerHex, defender, defenderHex, defenderAngle) {
        let uangle = attackerHex.getAngle(defenderHex);
        let dangle = diffAngle(uangle, defenderAngle);
        if (dangle>=-60 && dangle<=60) return CBEngageSideMode.BACK;
        else if (dangle<=-120 || dangle>=120) return CBEngageSideMode.FRONT;
        else return CBEngageSideMode.SIDE;
    }

    _getPotentialEngagementSide(attacker, attackerHexLocation, defender, defenderHexLocation, defenderAngle) {
        let side = CBEngageSideMode.NONE;
        for (let attackerHex of attackerHexLocation.hexes) {
            for (let defenderHex of defenderHexLocation.hexes) {
                if (attackerHex.isNearHex(defenderHex)!==false && this.canCross(attacker, attackerHex, defenderHex)) {
                    let sideForHex = (this.isHexInForwardZone(attacker, attackerHex, defenderHex)===false) ?
                        CBEngageSideMode.NONE:
                        this._getFightSide(attacker, attackerHex, defender, defenderHex, defenderAngle);
                    if (sideForHex > side) side = sideForHex;
                }
            }
        }
        return side;
    }

    _getPotentialFireSide(firer, firerHexLocation, target, targetHexLocation, targetAngle) {
        let side = CBEngageSideMode.NONE;
        for (let firerHex of firerHexLocation.hexes) {
            for (let targetHex of targetHexLocation.hexes) {
                let sideForHex = this._getFightSide(firer, firerHex, target, targetHex, targetAngle);
                if (sideForHex > side) side = sideForHex;
            }
        }
        return side;
    }

    getEngagementSide(attacker, defender) {
        return this._getPotentialEngagementSide(attacker, attacker.hexLocation, defender, defender.hexLocation, defender.angle);
    }

    getFireSide(attacker, defender) {
        return this._getPotentialFireSide(attacker, attacker.hexLocation, defender, defender.hexLocation, defender.angle);
    }

    getSideWhereAUnitPotentiallyEngageAnotherUnit(attacker, defender, defenderHexLocation, defenderAngle, unitMustHaveAnEngagingMarker=false) {
        if (attacker.isRouted()) return false;
        if (unitMustHaveAnEngagingMarker && !attacker.isEngaging() && !attacker.isCharging()) return false;
        if (!this.areUnitsFoes(attacker, defender)) return false;
        return this._getPotentialEngagementSide(attacker, attacker.hexLocation, defender, defenderHexLocation, defenderAngle);
    }

    isAUnitEngageAnotherUnit(attacker, defender, unitMustHaveAnEngagingMarker=false) {
        return this.getSideWhereAUnitPotentiallyEngageAnotherUnit(attacker, defender, defender.hexLocation, defender.angle, unitMustHaveAnEngagingMarker);
    }

    getNeighbors(hexLocation) {
        let hexes = hexLocation.nearHexes;
        let neighbors = new Set();
        for (let [hexId] of hexes.entries()) {
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                neighbors.add(nearUnit);
            }
        }
        return [...neighbors];
    }

    getPotentialEngagingFoes(defender, defenderHexLocation, defenderAngle, foesMustHaveEngagingMarkers=false) {
        let foes = new Map();
        for (let nearUnit of this.getNeighbors(defenderHexLocation)) {
            let side = this.getSideWhereAUnitPotentiallyEngageAnotherUnit(nearUnit, defender, defenderHexLocation, defenderAngle, foesMustHaveEngagingMarkers);
            if (side) {
                foes.set(nearUnit, side);
            }
        }
        return foes;
    }

    getEngagingFoes(defender, foesMustHaveEngagingMarkers=false) {
        return this.getPotentialEngagingFoes(defender, defender.hexLocation, defender.angle, foesMustHaveEngagingMarkers)
    }

    isUnitEngaged(defender, foesMustHaveEngagingMarkers=false) {
        return this.getEngagingFoes(defender, foesMustHaveEngagingMarkers).size>0;
    }

    getWingTiredness(unit) {
        return 10;
    }

    canGetTired(unit) {
        return !unit.isExhausted() && (!unit.isCharging() || !unit.isTired())
    }

}
