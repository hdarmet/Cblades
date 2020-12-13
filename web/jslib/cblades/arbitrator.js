import {
    CBAbstractArbitrator, CBHexSideId, CBMovement, CBTiredness, CBWeather
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
            shockAttack:false,
            fireAttack:false,
            shockDuel:false,
            fireDuel:false,
            rest:this.isAllowedToRest(unit),
            reload:true,
            reorganize:true,
            rally:true,
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

    isHexOnForwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff>=-60 && diff<=60;
    }

    getUnitForwardZone(unit) {
        let directions = [];
        let angle = unit.angle;
        if (angle%60) {
            directions[angle-30]={hex:unit.hexLocation.getNearHex(angle -30)};
            directions[(angle + 30) % 360]={hex:unit.hexLocation.getNearHex((angle + 30) % 360)};
        }
        else {
            directions[(angle + 300) % 360]={hex:unit.hexLocation.getNearHex((angle + 300) % 360)};
            directions[angle]={hex:unit.hexLocation.getNearHex(angle)};
            directions[(angle + 60) % 360]={hex:unit.hexLocation.getNearHex((angle + 60) % 360)};
        }
        return directions;
    }

    getAllowedMoves(unit, first) {
        function processAngle(direction, arbitrator, unit, first) {
            let cost = arbitrator.getMovementCost(unit, direction.hexId);
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

    isAllowedToRest(unit) {
        return unit.tiredness > 0;
    }

    processRestResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=10;
        let minorRestingCapacity = diceResult[0]===diceResult[1];
        return { success, minorRestingCapacity };
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
