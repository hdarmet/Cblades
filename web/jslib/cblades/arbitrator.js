import {
    CBAbstractArbitrator, CBCohesion, CBHexSideId, CBMovement, CBTiredness, CBWeather
} from "./game.js";
import {
    diffAngle
} from "../geometry.js";

export class CBArbitrator extends CBAbstractArbitrator{

    getAllowedActions(unit) {
        return {
            moveForward:true,
            moveBack:true,
            escape:true,
            confront:true,
            shockAttack:this.isAllowedToShockAttack(unit),
            fireAttack:this.isAllowedToFireAttack(unit),
            shockDuel:false,
            fireDuel:false,
            rest:this.isAllowedToRest(unit),
            reload:this.isAllowedToReplenishMunitions(unit),
            reorganize:this.isAllowedToReorganize(unit),
            rally:this.isAllowedToRally(unit),
            createFormation:true,
            joinFormation:true,
            leaveFormation:true,
            breakFormation:true,
            takeCommand:true,
            leaveCommand:true,
            changeOrders:true,
            giveSpecificOrders:true,
            prepareSpell:true,
            castSpell:true,
            mergeUnit:true,
            miscAction:true
        }
    }

    mustPlayUnit(unit) {
        return unit.isOnBoard() && !unit.hasBeenActivated() && !unit.hasBeenPlayed();
    }

    isHexOnForwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff>=-60 && diff<=60;
    }

    _getForwardArea(border, angle) {
        let hexes = new Set();
        for (let hexId of border) {
            let zones = this.getForwardZone(hexId, angle);
            for (let zangle in zones) {
                let zone = zones[zangle];
                hexes.add(zone.hex);
            }
        }
        return hexes;
    }

    getUnitForwardArea(unit, range) {
        let hexes = new Set();
        let border = [unit.hexLocation];
        for (let index=0; index<range; index++) {
            border = this._getForwardArea(border, unit.angle);
            for (let hexId of border) {
                hexes.add(hexId);
            }
        }
        return [...hexes];
    }

    getForwardZone(hexId, angle) {
        let zones = [];
        if (angle%60) {
            zones[angle-30]={hex:hexId.getNearHex(angle -30)};
            zones[(angle + 30) % 360]={hex:hexId.getNearHex((angle + 30) % 360)};
        }
        else {
            zones[(angle + 300) % 360]={hex:hexId.getNearHex((angle + 300) % 360)};
            zones[angle]={hex:hexId.getNearHex(angle)};
            zones[(angle + 60) % 360]={hex:hexId.getNearHex((angle + 60) % 360)};
        }
        return zones;
    }

    getUnitForwardZone(unit) {
        return this.getForwardZone(unit.hexLocation, unit.angle)
    }

    isHexOnBackwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff<=-120 || diff>=120;
    }

    getUnitBackwardZone(unit) {
        let zones = [];
        let angle = unit.angle;
        if (angle%60) {
            zones[(angle + 150) % 360]={hex:unit.hexLocation.getNearHex((angle + 150) % 360)};
            zones[(angle + 210) % 360]={hex:unit.hexLocation.getNearHex((angle + 210) % 360)};
        }
        else {
            zones[(angle + 120) % 360]={hex:unit.hexLocation.getNearHex((angle + 120) % 360)};
            zones[(angle + 180) % 360]={hex:unit.hexLocation.getNearHex((angle + 180) % 360)};
            zones[(angle + 240) % 360]={hex:unit.hexLocation.getNearHex((angle + 240) % 360)};
        }
        return zones;
    }

    getRetreatZones(unit) {
        function processZone(zone, arbitrator, unit) {
            let nearUnits = zone.hex.units;
            if (nearUnits.length) {
                if (arbitrator.areUnitsFoes(unit, nearUnits)) return false;
            }
            return true;
        }

        let zones = this.getUnitBackwardZone(unit);
        let result = [];
        for (let angle in zones) {
            let zone = zones[angle];
            if (processZone(zone, this, unit)) {
                result[angle] = zone;
            }
        }
        return result;
    }

    _collectFoes(foes, unit, hex, more) {
        let units = hex.units;
        if (units.length) {
            let nearUnit = units[0];
            if (this.areUnitsFoes(unit, nearUnit)) {
                foes.push({unit:nearUnit, ...more});
            }
        }
    }

    getFoesThatMayBeShockAttacked(unit) {
        let zones = this.getUnitForwardZone(unit);
        let foes = [];
        for (let angle in zones) {
            this._collectFoes(foes, unit, zones[angle].hex, {supported:!unit.isExhausted()});
        }
        return foes;
    }

    processShockAttackResult(unit, foe, supported, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        let lossesForDefender = diceResult[0]+diceResult[1]<=4 ? 2 : diceResult[0]+diceResult[1]<=8 ? 1 : 0;
        let tirednessForAttacker = supported;
        return { success, lossesForDefender, tirednessForAttacker };
    }

    getFoesThatMayBeFireAttacked(unit) {
        let hexes = this.getUnitForwardArea(unit, 3);
        let foes = [];
        for (let hex of hexes) {
            this._collectFoes(foes, unit, hex, {});
        }
        return foes;
    }

    processFireAttackResult(unit, foe, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        let lossesForDefender = diceResult[0]+diceResult[1]<=4 ? 2 : diceResult[0]+diceResult[1]<=8 ? 1 : 0;
        let lowerFirerMunitions = diceResult[0] === diceResult[1];
        return { success, lossesForDefender, lowerFirerMunitions };
    }

    getAllowedMoves(unit, first) {
        function processAngle(direction, arbitrator, unit, first) {
            let nearUnits = direction.hex.units;
            if (nearUnits.length) {
                if (arbitrator.areUnitsFoes(unit, nearUnits)) return false;
            }
            let cost = arbitrator.getMovementCost(unit, direction.hex);
            if (unit.movementPoints>=cost) {
                direction.type = CBMovement.NORMAL;
                return true;
            }
            else if (unit.tiredness<CBTiredness.EXHAUSTED) {
                if (unit.extendedMovementPoints >= cost) {
                    direction.type = CBMovement.EXTENDED;
                    return true;
                } else if (first) {
                    direction.type = CBMovement.MINIMAL;
                    return true;
                }
            }
            return false;
        }

        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let angle in directions) {
            let direction = directions[angle];
            if (processAngle(direction, this, unit, first)) {
                result[angle] = direction;
            }
        }
        return result;
    }

    getAllowedRotations(unit) {
        function processAngle(directions, arbitrator, unit, angle) {
            let nearHexId = angle%60 ?
                new CBHexSideId(unit.hexLocation.getNearHex(angle-30), unit.hexLocation.getNearHex((angle+30)%360)) :
                unit.hexLocation.getNearHex(angle);
            let cost = arbitrator.getRotationCost(unit, angle);
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.tiredness<2 && unit.extendedMovementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED};
            }
        }

        let directions = [];
        for (let angle = 0; angle < 360; angle += 30) {
            processAngle(directions, this, unit, angle);
        }
        delete directions[unit.angle];
        return directions;
    }

    getRotationCost(unit, angle) {
        return 0.5;
    }

    getMovementCost(unit, hexId) {
        return 1;
    }

    doesMovementInflictTiredness(unit, cost) {
        return unit.movementPoints>=0 && cost>unit.movementPoints;
    }

    isAllowedToShockAttack(unit) {
        return this.getFoesThatMayBeShockAttacked(unit).length>0;
    }

    isAllowedToFireAttack(unit) {
        return this.getFoesThatMayBeFireAttacked(unit).length>0;
    }

    isAllowedToRest(unit) {
        return unit.tiredness > 0;
    }

    isAllowedToReplenishMunitions(unit) {
        return unit.lackOfMunitions > 0;
    }

    isAllowedToReorganize(unit) {
        return unit.cohesion === CBCohesion.DISRUPTED;
    }

    isAllowedToRally(unit) {
        return unit.cohesion === CBCohesion.ROUTED;
    }

    processRestResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=10;
        let minorRestingCapacity = diceResult[0]===diceResult[1];
        return { success, minorRestingCapacity };
    }

    processReplenishMunitionsResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=10;
        return { success };
    }

    processReorganizeResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processRallyResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processAttackerEngagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processDefenderEngagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    arePlayersFoes(player1, player2) {
        return player1 !== player2;
    }

    areUnitsFoes(unit1, unit2) {
        return this.arePlayersFoes(unit1.player, unit2.player);
    }

    isUnitOnContact(unit) {
        let directions = this.getUnitForwardZone(unit);
        for (let angle in directions) {
            let direction = directions[angle];
            let nearUnits = direction.hex.map.getUnitsOnHex(direction.hex);
            if (nearUnits.length) {
                if (this.areUnitsFoes(nearUnits[length], unit)) {
                    return true;
                }
            }
        }
        return false;
    }

    isAUnitEngageAnotherUnit(unit1, unit2, engagingMarker=false) {
        if (engagingMarker && !unit1.isEngaging() && !unit1.isCharging()) return false;
        if (!this.areUnitsFoes(unit1, unit2)) return false;
        return this.isHexOnForwardZone(unit1, unit2.hexLocation);
    }

    isUnitEngaged(unit, engagingMarker=false) {
        for (let angle=0; angle<=300; angle+=60) {
            let hexId = unit.hexLocation.getNearHex(angle);
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                if (this.isAUnitEngageAnotherUnit(nearUnit, unit, engagingMarker)) {
                    return true;
                }
            }
        }
        return false;
    }

    getWeather() {
        return CBWeather.CLEAR;
    }

    getWingTiredness(unit) {
        return 10;
    }
}
