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

    wouldUnitEngage(unit, hexLocation, angle, predicate=foe=>true) {
        if (unit.isRouted()) return false;
        let directions = this.getPotentialForwardZone(hexLocation, angle)
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            if (this.doesHexLocationContainFoes(unit, direction.hex, predicate)) {
                return true;
            }
        }
        return false;
    }

    isCharacterAloneInHex(unit) {
        return unit.characterNature && unit.hexLocation.units.length === 1;
    }

    doesUnitEngage(unit) {
        return this.wouldUnitEngage(unit, unit.hexLocation, unit.angle);
    }

    isAUnitPotentiallyEngageAnotherUnit(unit, potentialFoe, foeHexLocation, unitMustHaveAnEngagingMarker=false) {
        if (unit.isRouted()) return false;
        if (unitMustHaveAnEngagingMarker && !unit.isEngaging() && !unit.isCharging()) return false;
        if (!this.areUnitsFoes(unit, potentialFoe)) return false;
        if (this.isHexLocationInForwardZone(unit, foeHexLocation)) {
            let dangle = diffAngle(unit.angle, potentialFoe.angle);
            if (dangle>=-60 || dangle<=60) return CBEngageSideMode.BACK;
            else if (dangle<=-60 || dangle>=120) return CBEngageSideMode.FRONT;
            else return CBEngageSideMode.SIDE;
        }
    }

    isAUnitEngageAnotherUnit(unit, potentialFoe, unitMustHaveAnEngagingMarker=false) {
        return this.isAUnitPotentiallyEngageAnotherUnit(unit, potentialFoe, potentialFoe.hexLocation, unitMustHaveAnEngagingMarker);
    }

    getPotentialEngagingFoes(unit, hexLocation, foesMustHaveEngagingMarkers=false) {
        let hexes = hexLocation.nearHexes;
        let foes = new Map();
        for (let [hexId, angle] of hexes.entries()) {
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                let side = this.isAUnitPotentiallyEngageAnotherUnit(nearUnit, unit, hexLocation, foesMustHaveEngagingMarkers);
                if (side) {
                    foes.set(nearUnit, side);
                }
            }
        }
        return foes;
    }

    getEngagingFoes(unit, foesMustHaveEngagingMarkers=false) {
        return this.getPotentialEngagingFoes(unit, unit.hexLocation, foesMustHaveEngagingMarkers)
    }

    isUnitEngaged(unit, foesMustHaveEngagingMarkers=false) {
        return this.getEngagingFoes(unit, foesMustHaveEngagingMarkers).size>0;
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
