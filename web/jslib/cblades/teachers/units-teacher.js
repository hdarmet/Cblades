'use strict'

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

    doesHexContainFoes(unit, hex, predicate=foe=>true) {
        for (let foe of hex.units) {
            if (this.areUnitsFoes(unit, foe) && predicate(foe)) return true;
        }
        return false;
    }

    doesHexContainFriends(unit, hex) {
        let units = hex.units;
        if (units.length) {
            if (this.areUnitsFriends(unit, units[0])) return true;
        }
        return false;
    }

    wouldUnitEngage(unit, hexLocation, angle, predicate=foe=>true) {
        let directions = this.getPotentialForwardZone(hexLocation, angle)
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let direction = directions[angle];
            if (this.doesHexContainFoes(unit, direction.hex, predicate)) {
                return true;
            }
        }
        return false;
    }

    mayUnitCharge(unit) {
        if (unit.formationNature) return false;
        if (unit.isExhausted()) return false;
        if (!unit.isInGoodOrder()) return false;
        return true;
    }

    doesUnitEngage(unit) {
        return this.wouldUnitEngage(unit, unit.hexLocation, unit.angle);
    }

    isAUnitEngageAnotherUnit(unit, potentialFoe, unitMustHaveAnEngagingMarker=false) {
        if (unitMustHaveAnEngagingMarker && !unit.isEngaging() && !unit.isCharging()) return false;
        if (!this.areUnitsFoes(unit, potentialFoe)) return false;
        return this.isHexLocationInForwardZone(unit, potentialFoe.hexLocation);
    }

    getEngagingFoes(unit, foesMustHaveEngagingMarkers=false) {
        let hexes = this.getUnitAdjacentZone(unit);
        let foes = [];
        for (let sangle in hexes) {
            let angle = parseInt(sangle);
            let hexId = hexes[angle].hex;
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                if (this.isAUnitEngageAnotherUnit(nearUnit, unit, foesMustHaveEngagingMarkers)) {
                    foes.push(nearUnit);
                }
            }
        }
        return foes;
    }

    isUnitEngaged(unit, foesMustHaveEngagingMarkers=false) {
        return this.getEngagingFoes(unit, foesMustHaveEngagingMarkers).length>0;
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

}
