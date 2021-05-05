'use strict'

import {
    diffAngle
} from "../../geometry.js";
import {
    CBEngageSideMode
} from "../unit.js";


export class CBUnitManagementTeacher {

    processAttackerEngagementResult(unit, diceResult) {
        //return { success: true }
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    processDefenderEngagementResult(unit, diceResult) {
        //return { success: true }
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    processConfrontEngagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    processDisengagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
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
        return true;
    }

    wouldUnitEngage(attacker, attackerHexLocation, angle, predicate=foe=>true) {
        if (attacker.isRouted()) return false;
        let directions = this.getPotentialForwardZone(attackerHexLocation, angle)
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            if (this.doesHexLocationContainFoes(attacker, direction.hex, predicate)) {
                return true;
            }
        }
        return false;
    }

    isAloneInHex(unit) {
        return unit.hexLocation.units.length === 1;
    }

    doesUnitEngage(attacker) {
        return this.wouldUnitEngage(attacker, attacker.hexLocation, attacker.angle);
    }

    _getEngagementSide(attacker, attackerHex, defender, defenderHex, defenderAngle) {
        if (this.isHexInForwardZone(attacker, attackerHex, defenderHex)===false) return CBEngageSideMode.NONE;
        let uangle = attackerHex.getAngle(defenderHex);
        let dangle = diffAngle(uangle, defenderAngle);
        if (dangle>=-60 && dangle<=60) return CBEngageSideMode.BACK;
        else if (dangle<=-120 || dangle>=120) return CBEngageSideMode.FRONT;
        else return CBEngageSideMode.SIDE;
    }

    doesAUnitPotentiallyEngageAnotherUnit(attacker, defender, defenderHexLocation, defenderAngle, unitMustHaveAnEngagingMarker=false) {
        if (attacker.isRouted()) return false;
        if (unitMustHaveAnEngagingMarker && !attacker.isEngaging() && !attacker.isCharging()) return false;
        if (!this.areUnitsFoes(attacker, defender)) return false;
        let side = 0;
        for (let attackerHex of attacker.hexLocation.hexes) {
            for (let defenderHex of defenderHexLocation.hexes) {
                let sideForHex = this._getEngagementSide(attacker, attackerHex, defender, defenderHex, defenderAngle);
                if (sideForHex>side) side = sideForHex;
            }
        }
        return side;
    }

    isAUnitEngageAnotherUnit(attacker, defender, unitMustHaveAnEngagingMarker=false) {
        return this.doesAUnitPotentiallyEngageAnotherUnit(attacker, defender, defender.hexLocation, defender.angle, unitMustHaveAnEngagingMarker);
    }

    getPotentialEngagingFoes(defender, defenderHexLocation, defenderAngle, foesMustHaveEngagingMarkers=false) {
        let hexes = defenderHexLocation.nearHexes;
        let foes = new Map();
        for (let [hexId, angle] of hexes.entries()) {
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                let side = this.doesAUnitPotentiallyEngageAnotherUnit(nearUnit, defender, defenderHexLocation, defenderAngle, foesMustHaveEngagingMarkers);
                if (side) {
                    foes.set(nearUnit, side);
                }
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

}
