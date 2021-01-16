import {
    CBAbstractArbitrator,
    CBHexSideId,
    CBMoveType,
} from "./game.js";
import {
    CBCohesion,
    CBMovement,
    CBTiredness,
    CBWeather,
    CBCharacter,
    CBFormation,
    CBTroop
} from "./unit.js";
import {
    diffAngle, moyAngle
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
            takeCommand:this.isAllowedToTakeCommand(unit),
            leaveCommand:this.isAllowedToDismissCommand(unit),
            changeOrders:this.isAllowedToChangeOrderInstruction(unit),
            giveSpecificOrders:this.isAllowedToGiveOrders(unit),
            prepareSpell:true,
            castSpell:true,
            mergeUnit:this.isAllowedToMerge(unit),
            miscAction:true
        }
    }

    mustPlayUnit(unit) {
        return unit.isOnBoard() && !unit.hasBeenActivated() && !unit.hasBeenPlayed();
    }

    formatMapZone(mapZone) {
        let zones = {};
        for (let zone of mapZone) {
            zones[zone[1]] = {hex:zone[0]};
        }
        return zones;
    }

    mergeMapZone(mapZoneDest, mapZoneSrc, forbiddenHexes) {
        let forbidden = new Set(forbiddenHexes);
        for (let zone of mapZoneSrc) {
            let current = mapZoneDest.get(zone[0]);
            if (current !== undefined) {
                mapZoneDest.set(zone[0], moyAngle(current, zone[1]));
            }
            else {
                mapZoneDest.set(zone[0], zone[1]);
            }
        }
        for (let hex of forbiddenHexes) {
            mapZoneDest.delete(hex);
        }
        return mapZoneDest;
    }

    getHexesFormZones(zones) {
        let hexes = new Set();
        for (let angle in zones) {
            hexes.add(zones[angle].hex);
        }
        return hexes;
    }

    getAdjacentZone(hexId) {
        let hexes = new Map();
        for (let angle=0; angle<=300; angle+=60) {
            hexes.set(hexId.getNearHex(angle), angle);
        }
        return hexes;
    }

    getUnitAdjacentZone(unit) {
        if (unit instanceof CBFormation) {
            let zone1 = this.getAdjacentZone(unit.hexLocation.fromHex);
            let zone2 = this.getAdjacentZone(unit.hexLocation.toHex);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [unit.hexLocation.fromHex, unit.hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getAdjacentZone(unit.hexLocation));
        }
    }

    getForwardZone(hexId, angle) {
        let zones = new Map();
        if (angle%60) {
            zones.set(hexId.getNearHex(angle -30), angle-30);
            zones.set(hexId.getNearHex((angle + 30) % 360), (angle + 30) % 360);
        }
        else {
            zones.set(hexId.getNearHex((angle + 300) % 360), (angle + 300) % 360);
            zones.set(hexId.getNearHex(angle), angle);
            zones.set(hexId.getNearHex((angle + 60) % 360), (angle + 60) % 360);
        }
        return zones;
    }

    getUnitForwardZone(unit) {
        if (unit instanceof CBFormation) {
            let zone1 = this.getForwardZone(unit.hexLocation.fromHex, unit.angle);
            let zone2 = this.getForwardZone(unit.hexLocation.toHex, unit.angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [unit.hexLocation.fromHex, unit.hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getForwardZone(unit.hexLocation, unit.angle));
        }
    }

    isHexOnForwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff >= -60 && diff <= 60;
    }

    getBackwardZone(hexId, angle) {
        let zones = new Map();
        if (angle%60) {
            zones.set(hexId.getNearHex((angle + 150) % 360), (angle + 150) % 360);
            zones.set(hexId.getNearHex((angle + 210) % 360), (angle + 210) % 360);
        }
        else {
            zones.set(hexId.getNearHex((angle + 120) % 360), (angle + 120) % 360);
            zones.set(hexId.getNearHex((angle + 180) % 360), (angle + 180) % 360);
            zones.set(hexId.getNearHex((angle + 240) % 360), (angle + 240) % 360);
        }
        return zones;
    }

    getUnitBackwardZone(unit) {
        if (unit instanceof CBFormation) {
            let zone1 = this.getBackwardZone(unit.hexLocation.fromHex, unit.angle);
            let zone2 = this.getBackwardZone(unit.hexLocation.toHex, unit.angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [unit.hexLocation.fromHex, unit.hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getBackwardZone(unit.hexLocation, unit.angle));
        }
    }

    isHexOnBackwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff<=-120 || diff>=120;
    }

    getForwardArea(border, angle) {
        let hexes = new Set();
        for (let hexId of border) {
            let zones = this.getForwardZone(hexId, angle);
            for (let zone of zones) {
                hexes.add(zone[0]);
            }
        }
        return hexes;
    }

    getUnitForwardArea(unit, range) {
        let hexes = new Set();
        let border = (unit instanceof CBFormation) ? [unit.hexLocation.fromHex, unit.hexLocation.toHex] : [unit.hexLocation];
        for (let index=0; index<range; index++) {
            border = this.getForwardArea(border, unit.angle);
            for (let hexId of border) {
                hexes.add(hexId);
            }
        }
        return [...hexes];
    }

    getRetreatForbiddenZone(attacker) {
        let forbidden = new Set();
        let zones = this.getUnitAdjacentZone(attacker);
        for (let angle in zones) {
            forbidden.add(zones[angle].hex);
        }
        return forbidden;
    }

    getRetreatZones(unit, attacker) {

        function processZone(zone, arbitrator, unit, moveType) {
            let nearUnits = zone.hex.units;
            zone.moveType = moveType;
            if (nearUnits.length) {
                if (arbitrator.areUnitsFoes(unit, nearUnits[0])) return false;
            }
            return true;
        }

        function processZones(result, zones, moveType, forbiddenZones) {
            for (let angle in zones) {
                let zone = zones[angle];
                if (!forbiddenZones.has(zone.hex)) {
                    if (processZone(zone, this, unit, moveType)) {
                        result[angle] = zone;
                    }
                }
            }
        }

        let result = [];
        if (!unit.isRouted()) {
            let forbiddenZones = this.getRetreatForbiddenZone(attacker);
            let zones = this.getUnitBackwardZone(unit);
            processZones.call(this, result, zones, CBMoveType.BACKWARD, forbiddenZones);
            zones = this.getUnitForwardZone(unit);
            processZones.call(this, result, zones, CBMoveType.FORWARD, forbiddenZones);
        }
        return result;
    }

    getFormationRetreatZones(unit, attacker) {
        let hexes = this.getHexesFormZones(this.getRetreatZones(unit, attacker));
        let forbiddenZones = this.getRetreatForbiddenZone(attacker);
        let zones = {
            ...this.getUnitForwardZone(unit),
            ...this.getUnitBackwardZone(unit)
        };
        let retreatDirections = [];
        let rotateDirections = [];
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            if (angle % 60) {
                if (hexes.has(zones[angle].hex)) {
                    let hex = unit.hexLocation.fromHex;
                    let moveHex = unit.hexLocation.toHex;
                    if (!forbiddenZones.has(hex)) {
                        let zangle = moveHex.isNearHex(zones[angle].hex);
                        rotateDirections[zangle] = { hex:zones[angle].hex };
                    }
                    hex = unit.hexLocation.toHex;
                    moveHex = unit.hexLocation.fromHex;
                    if (!forbiddenZones.has(hex)) {
                        let zangle = moveHex.isNearHex(zones[angle].hex);
                        rotateDirections[zangle] = { hex:zones[angle].hex };
                    }
                }
            }
            else {
                if (hexes.has(unit.hexLocation.fromHex.getNearHex(angle)) &&
                    hexes.has(unit.hexLocation.toHex.getNearHex(angle)))
                    retreatDirections[angle] = zones[angle];
            }
        }
        return { retreatDirections, rotateDirections }
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

    _processMovementOpportunity(direction, hexes, unit, cost, first) {
        for (let hex of hexes) {
            let nearUnits = hex.units;
            if (nearUnits.length) {
                if (this.areUnitsFoes(unit, nearUnits[0])) return false;
            }
        }
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

    getAllowedMoves(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let angle in directions) {
            let direction = directions[angle];
            let cost = this.getMovementCost(unit, angle);
            if (this._processMovementOpportunity(direction, [direction.hex], unit, cost, first)) {
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
                if (this._processMovementOpportunity(direction, [
                        unit.hexLocation.fromHex.getNearHex(angle),
                        unit.hexLocation.toHex.getNearHex(angle)
                    ],
                    unit, cost, first)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    getFormationAllowedRotations(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let angle in directions) {
            if (!(angle % 60)) {
                let direction = directions[angle];
                direction.hex = unit.hexLocation.getFaceHex(unit.angle);
                let cost = this.getFormationMovementCost(unit, angle);
                if (this._processMovementOpportunity(direction, [direction.hex], unit, cost, first)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    getAllowedRotations(unit, first = false) {

        function processAngle(directions, hexes, unit, angle, cost) {
            let nearHexId = angle%60 ?
               new CBHexSideId(hexes[angle-30].hex, hexes[(angle+30)%360].hex) :
               hexes[angle].hex;
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.tiredness<CBTiredness.EXHAUSTED) {
                if (unit.extendedMovementPoints >= cost) {
                    directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED};
                } else if (first) {
                    directions[angle] = { hex:nearHexId, type:CBMovement.MINIMAL};
                }
            }

        }

        let hexes = this.getUnitAdjacentZone(unit);
        let directions = [];
        if (unit instanceof CBFormation) {
            let angle = (unit.angle+180)%360;
            let cost = this.getFormationRotationCost(unit, angle);
            processAngle.call(this, directions, hexes, unit, angle, cost);
        }
        else {
            for (let angle = 0; angle < 360; angle += 30) {
                let cost = this.getRotationCost(unit, angle);
                processAngle.call(this, directions, hexes, unit, angle, cost);
            }
            delete directions[unit.angle];
        }
        return directions;
    }

    getRotationCost(unit, angle) {
        return 0.5;
    }

    getMovementCost(unit, angle) {
        return 1;
    }

    getFormationRotationCost(unit, angle) {
        return 1;
    }

    getFormationMovementCost(unit, angle) {
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

    isAllowedToChangeOrderInstruction(unit) {
        return unit instanceof CBCharacter && unit.wing.leader === unit;
    }

    isAllowedToGiveOrders(unit) {
        return unit instanceof CBCharacter && unit.wing.leader === unit;
    }

    isAllowedToTakeCommand(unit) {
        return unit instanceof CBCharacter && unit.wing.leader !== unit;
    }

    isAllowedToDismissCommand(unit) {
        return unit instanceof CBCharacter && unit.wing.leader === unit;
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
        let hexes = this.getUnitAdjacentZone(unit);
        for (let angle in hexes) {
            let hexId = hexes[angle].hex;
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                if (this.isAUnitEngageAnotherUnit(nearUnit, unit, engagingMarker)) {
                    return true;
                }
            }
        }
        return false;
    }

    processChangeOrderInstructionResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    getAllowedOrderInstructions(leader) {
        return {
            attack:true,
            defend:true,
            regroup:true,
            retreat:true
        }
    }

    getUnitsThatMayReceiveOrders(leader, commandPoints) {
        let units = [];
        for (let unit of leader.player.units) {
            if (unit !== leader && !unit.hasBeenActivated() &&
                !unit.hasReceivedOrder() && this.getOrderGivenCost(leader, unit)<=commandPoints) {
                units.push(unit);
            }
        }
        return units;
    }

    getOrderGivenCost(leader, unit) {
        return 2;
    }

    computeCommandPoints(unit, diceResult) {
        return diceResult[0]+5;
    }

    processTakeCommandResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processDismissCommandResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    getWeather() {
        return CBWeather.CLEAR;
    }

    getWingTiredness(unit) {
        return 10;
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

    isAllowedToMerge(unit) {
        if (!(unit instanceof CBTroop)) return false;
        let units = this.getUnitOfType(unit.hexLocation.units, unit.type);
        if (units.length !== 2) return false;
        let [unit1, unit2] = units;
        if (!unit1.inGoodOrder() || !unit2.inGoodOrder()) return false;
        if (unit1.isExhausted() || unit2.isExhausted()) return false;
        if (unit1.hasBeenPlayed() || unit2.hasBeenPlayed()) return false;
        if (!unit1.hasReceivedOrder() || !unit2.hasReceivedOrder()) return false;
        if (unit1.remainingStepCount + unit2.remainingStepCount > unit.maxStepCount) return false;
        return true;
    }

    mergedUnit(unit) {
        let units = this.getUnitOfType(unit.hexLocation.units, unit.type);
        let [unit1, unit2] = units;
        let removedUnit = unit1 === unit ? unit2 : unit1;
        let mergedUnit = unit.clone();
        mergedUnit.fixRemainingLossSteps(unit1.remainingStepCount + unit2.remainingStepCount);
        if (!mergedUnit.isTired() && removedUnit.isTired()) mergedUnit.fixTirednessLevel(CBTiredness.TIRED);
        if (mergedUnit.lackOfMunitions < removedUnit.lackOfMunitions) mergedUnit.fixLackOfMunitionsLevel(removedUnit.lackOfMunitions);
        return { replacement:mergedUnit, replaced:units };
    }

}
