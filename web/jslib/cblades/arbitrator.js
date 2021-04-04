import {
    CBAbstractArbitrator
} from "./game.js";
import {
    CBHexId,
    CBHexSideId,
    CBMoveType, CBPathFinding,
} from "./map.js";
import {
    CBCohesion,
    CBMovement,
    CBTiredness,
    CBWeather,
    CBCharacter,
    CBFormation,
    CBTroop, CBLackOfMunitions, CBMoveProfile
} from "./unit.js";
import {
    diffAngle, moyAngle, reverseAngle, sumAngle
} from "../geometry.js";

export class CBArbitrator extends CBAbstractArbitrator{

    getAllowedActions(unit) {
        return {
            moveForward:this.isAllowedToMove(unit),
            moveBack:this.isAllowedToMoveBack(unit),
            escape:this.isAllowedToRout(unit),
            confront:this.isAllowedToConfront(unit),
            shockAttack:this.isAllowedToShockAttack(unit),
            fireAttack:this.isAllowedToFireAttack(unit),
            shockDuel:this.isAllowedToShockDuel(unit),
            fireDuel:this.isAllowedToFireDuel(unit),
            rest:this.isAllowedToRest(unit),
            reload:this.isAllowedToReplenishMunitions(unit),
            reorganize:this.isAllowedToReorganize(unit),
            rally:this.isAllowedToRally(unit),
            createFormation:this.isAllowedToCreateFormation(unit),
            joinFormation:this.isAllowedToIncludeTroops(unit),
            leaveFormation:this.isAllowedToReleaseTroops(unit),
            breakFormation:this.isAllowedToBreakFormation(unit),
            takeCommand:this.isAllowedToTakeCommand(unit),
            leaveCommand:this.isAllowedToDismissCommand(unit),
            changeOrders:this.isAllowedToChangeOrderInstruction(unit),
            giveSpecificOrders:this.isAllowedToGiveOrders(unit),
            prepareSpell:this.isAllowedToChoseSpell(unit),
            castSpell:this.isAllowedToCastSpell(unit),
            mergeUnit:this.isAllowedToMerge(unit),
            miscAction:true
        }
    }

    isAllowedToMove(unit) {
        return true;
    }

    isAllowedToMoveBack(unit) {
        return true;
    }

    isAllowedToRout(unit) {
        return !unit.formationNature;
    }

    isAllowedToConfront(unit) {
        return this.isUnitEngaged(unit) && !this.doesUnitEngage(unit);
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

    getHexesFromZones(zones) {
        let hexes = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
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

    get360Area(hex, range) {
        function processHex(areaMap, hex, distance) {
            if (hex && (!areaMap.has(hex) || areaMap.get(hex)>distance)) {
                areaMap.set(hex, distance);
                if (distance < range) {
                    for (let angle=0; angle<360; angle+=60) {
                        processHex(areaMap, hex.getNearHex(angle), distance + 1);
                    }
                }
            }
        }
        let areaMap = new Map();
        processHex(areaMap, hex, 0);
        let result = [];
        for (let entry of areaMap.entries()) {
            result.push({hex:entry[0], distance:entry[1]});
        }
        return result;
    }

    getUnitAdjacentZone(unit) {
        if (unit.formationNature) {
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

    getPotentialForwardZone(hexLocation, angle) {
        if (hexLocation instanceof CBHexSideId) {
            let zone1 = this.getForwardZone(hexLocation.fromHex, angle);
            let zone2 = this.getForwardZone(hexLocation.toHex, angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [hexLocation.fromHex, hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getForwardZone(hexLocation, angle));
        }
    }

    getUnitForwardZone(unit) {
        return this.getPotentialForwardZone(unit.hexLocation, unit.angle);
    }

    isHexLocationInForwardZone(unit, hexLocation) {
        function _checkHex(hexId) {
            let unitAngle = unit.angle;
            let hexAngle = unit.hexLocation.isNearHex(hexId);
            if (hexAngle === false) return false;
            let diff = diffAngle(hexAngle, unitAngle);
            return diff >= -60 && diff <= 60;
        }
        if (hexLocation instanceof CBHexId) {
            return _checkHex(hexLocation);
        }
        else {
            console.assert(hexLocation instanceof CBHexSideId);
            if (_checkHex(hexLocation.fromHex)) return true;
            if (_checkHex(hexLocation.toHex)) return true;
            return false;
        }
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
        if (unit.formationNature) {
            let zone1 = this.getBackwardZone(unit.hexLocation.fromHex, unit.angle);
            let zone2 = this.getBackwardZone(unit.hexLocation.toHex, unit.angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [unit.hexLocation.fromHex, unit.hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getBackwardZone(unit.hexLocation, unit.angle));
        }
    }

    isHexLocationInBackwardZone(unit, hexLocation) {
        function _checkHex(hexId) {
            let unitAngle = unit.angle;
            let hexAngle = unit.hexLocation.isNearHex(hexId);
            if (hexAngle === false) return false;
            let diff = diffAngle(hexAngle, unitAngle);
            return diff<=-120 || diff>=120;
        }
        if (hexLocation instanceof CBHexId) {
            return _checkHex(hexLocation);
        }
        else {
            console.assert(hexLocation instanceof CBHexSideId);
            if (_checkHex(hexLocation.fromHex)) return true;
            if (_checkHex(hexLocation.toHex)) return true;
            return false;
        }
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

    _getUnitForwardAreaFromBorder(unit, border, range) {
        let hexes = new Set();
        for (let index=0; index<range; index++) {
            border = this.getForwardArea(border, unit.angle);
            for (let hexId of border) {
                hexes.add(hexId);
            }
        }
        return [...hexes];
    }

    getUnitForwardAreaFromHex(unit, hex, range) {
        let border = [hex];
        return this._getUnitForwardAreaFromBorder(unit, border, range);
    }

    getUnitForwardArea(unit, range) {
        let border = (unit.formationNature) ? [unit.hexLocation.fromHex, unit.hexLocation.toHex] : [unit.hexLocation];
        return this._getUnitForwardAreaFromBorder(unit, border, range);
    }

    getRetreatForbiddenZone(attacker) {
        let forbidden = new Set();
        let zones = this.getUnitAdjacentZone(attacker);
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            forbidden.add(zones[angle].hex);
        }
        return forbidden;
    }

    getRetreatZones(unit, attacker) {

        function processZone(zone, unit, moveType) {
            zone.moveType = moveType;
            return !this.doesHexContainFoes(unit, zone.hex);
        }

        function processZones(result, zones, moveType, forbiddenZones) {
            for (let sangle in zones) {
                let angle = parseInt(sangle);
                let zone = zones[angle];
                if (!forbiddenZones.has(zone.hex)) {
                    if (processZone.call(this, zone, unit, moveType)) {
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

        function processZones(zones, retreatDirections, rotateDirections, forbiddenZones, moveType) {
            for (let sangle in zones) {
                let angle = parseInt(sangle);
                if (angle % 60) {
                    if (hexes.has(zones[angle].hex)) {
                        let hex = unit.hexLocation.fromHex;
                        let moveHex = unit.hexLocation.toHex;
                        if (!forbiddenZones.has(hex)) {
                            let zangle = moveHex.isNearHex(zones[angle].hex);
                            rotateDirections[zangle] = { hex:zones[angle].hex, moveType };
                        }
                        hex = unit.hexLocation.toHex;
                        moveHex = unit.hexLocation.fromHex;
                        if (!forbiddenZones.has(hex)) {
                            let zangle = moveHex.isNearHex(zones[angle].hex);
                            rotateDirections[zangle] = { hex:zones[angle].hex, moveType };
                        }
                    }
                }
                else {
                    if (hexes.has(unit.hexLocation.fromHex.getNearHex(angle)) &&
                        hexes.has(unit.hexLocation.toHex.getNearHex(angle)))
                        retreatDirections[angle] = { hex:zones[angle].hex, moveType };
                }
            }
        }

        let hexes = this.getHexesFromZones(this.getRetreatZones(unit, attacker));
        let forbiddenZones = this.getRetreatForbiddenZone(attacker);
        let retreatDirections = [];
        let rotateDirections = [];
        let zones = this.getUnitForwardZone(unit);
        processZones.call(this, zones, retreatDirections, rotateDirections, forbiddenZones, CBMoveType.FORWARD);
        zones = this.getUnitBackwardZone(unit)
        processZones.call(this, zones, retreatDirections, rotateDirections, forbiddenZones, CBMoveType.BACKWARD);
        return { retreatDirections, rotateDirections }
    }

    _collectFoes(foes, foesSet, unit, hex, more) {
        let units = hex.units;
        if (units.length) {
            let nearUnit = units[0];
            if (!foesSet.has(nearUnit) && this.areUnitsFoes(unit, nearUnit)) {
                foesSet.add(nearUnit);
                foes.push({unit:nearUnit, ...more});
            }
        }
    }

    _collectFoesForDuel(foes, foesSet, unit, hex, more) {
        let units = hex.units;
        if (units.length) {
            for ( let nearUnit of units) {
                if (nearUnit.characterNature && !foesSet.has(nearUnit) && this.areUnitsFoes(unit, nearUnit)) {
                    foesSet.add(nearUnit);
                    foes.push({unit: nearUnit, ...more});
                }
            }
        }
    }

    isHexMayBeShockAttackedFromHex(unit, attackHex, attackedLocation) {
        let zones = this.getPotentialForwardZone(attackHex, unit.angle);
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            if (attackedLocation.hasHex(zones[angle].hex)) return true;
        }
        return false;
    }

    _getForwardZoneThatMayBeSchockAttacked(unit) {
        if (!unit.hasAttacked()) {
            return this.getUnitForwardZone(unit);
        }
        else {
            if (unit.formationNature) {
                let fromHexAttack = this.isHexMayBeShockAttackedFromHex(unit, unit.hexLocation.fromHex, unit.attackLocation);
                let toHexAttack = this.isHexMayBeShockAttackedFromHex(unit, unit.hexLocation.toHex, unit.attackLocation);
                if (fromHexAttack === toHexAttack) {
                    return this.getUnitForwardZone(unit);
                } else {
                    if (toHexAttack)
                        return this.getPotentialForwardZone(unit.hexLocation.fromHex, unit.angle);
                    else
                        return this.getPotentialForwardZone(unit.hexLocation.toHex, unit.angle);
                }
            }
            else return {};
        }
    }

    getFoesThatMayBeShockAttacked(unit) {
        let zones = this._getForwardZoneThatMayBeSchockAttacked(unit);
        let foes = [];
        let foesSet = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            this._collectFoes(foes, foesSet, unit, zones[angle].hex, {supported:!unit.isExhausted()});
        }
        return foes;
    }

    getFoesThatMayBeDuelAttacked(unit) {
        let zones = this._getForwardZoneThatMayBeSchockAttacked(unit);
        let foes = [];
        let foesSet = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            this._collectFoesForDuel(foes, foesSet, unit, zones[angle].hex, {supported:!unit.isExhausted()});
        }
        return foes;
    }

    getCombatTableResult(diceResult, advantage) {
        let column = 0;
        let dices = diceResult[0]+diceResult[1];
        while (column<CBArbitrator.combatAdvantage.length) {
            if (advantage < CBArbitrator.combatAdvantage[column]) {
                return column>0 ? CBArbitrator.combatTable[dices][column-1] : 0;
            }
            else column++;
        }
        return CBArbitrator.combatTable[CBArbitrator.combatAdvantage.length-1][dices];
    }

    getShockWeaponAdvantage(attacker, defender) {
        return CBArbitrator.weaponTable[attacker.weaponProfile.getShockAttackCode()][defender.weaponProfile.getShockDefendCode()];
    }

    getShockWeaponCell(attacker, defender) {
        return {
            col:CBArbitrator.weaponTable[defender.weaponProfile.getShockDefendCode()].Col,
            row:CBArbitrator.weaponTable[attacker.weaponProfile.getShockAttackCode()].Row
        };
    }

    getShockAttackAdvantage(attacker, defender, supported) {
        let advantage = supported ? 0 : -4;
        advantage += this.getShockWeaponAdvantage(attacker, defender)*2;
        return advantage;
    }

    getShockAttackResult(unit, foe, supported, diceResult) {
        return this.getCombatTableResult(diceResult, this.getShockAttackAdvantage(unit, foe, supported));
    }

    processShockAttackResult(unit, foe, supported, diceResult) {
        let lossesForDefender = this.getShockAttackResult(unit, foe, supported, diceResult);
        let success = lossesForDefender>0;
        let tirednessForAttacker = supported;
        let played = !unit.formationNature || unit.hasAttacked();
        let attackLocation = foe.hexLocation;
        return { success, lossesForDefender, tirednessForAttacker, played, attackLocation };
    }

    isHexMayBeFireAttackedFromHex(unit, range, attackHex, attackedLocation) {
        let hexes = this.getUnitForwardAreaFromHex(unit, attackHex, range);
        for (let hex of hexes) {
            if (attackedLocation.hasHex(hex)) return true;
        }
        return false;
    }

    _getForwardZoneThatMayBeFireAttached(unit, range) {
        if (!unit.hasAttacked()) {
            return this.getUnitForwardArea(unit, range);
        }
        else {
            if (unit.formationNature) {
                let fromHexAttack = this.isHexMayBeFireAttackedFromHex(unit, range, unit.hexLocation.fromHex, unit.attackLocation);
                let toHexAttack = this.isHexMayBeFireAttackedFromHex(unit, range, unit.hexLocation.toHex, unit.attackLocation);
                if (fromHexAttack === toHexAttack) {
                    return this.getUnitForwardArea(unit, range);
                } else {
                    if (toHexAttack)
                        return this.getUnitForwardAreaFromHex(unit, unit.hexLocation.fromHex, range);
                    else
                        return this.getUnitForwardAreaFromHex(unit, unit.hexLocation.toHex, range);
                }
            }
            else return [];
        }
    }

    getFoesThatMayBeFireAttacked(unit) {
        let hexes = this._getForwardZoneThatMayBeFireAttached(unit, 3);
        let foes = [];
        let foesSet = new Set();
        for (let hex of hexes) {
            this._collectFoes(foes, foesSet, unit, hex, {});
        }
        return foes;
    }

    getFoesThatMayBeDuelFired(unit) {
        let hexes = this._getForwardZoneThatMayBeFireAttached(unit, unit.weaponProfile.getFireRange());
        let foes = [];
        let foesSet = new Set();
        for (let hex of hexes) {
            this._collectFoesForDuel(foes, foesSet, unit, hex, {});
        }
        return foes;
    }

    getFireWeaponAdvantage(attacker, defender) {
        return CBArbitrator.weaponTable[attacker.weaponProfile.getFireAttackCode()][defender.weaponProfile.getFireDefendCode()];
    }

    getFireWeaponCell(attacker, defender) {
        return {
            col:CBArbitrator.weaponTable[defender.weaponProfile.getFireDefendCode()].Col,
            row:CBArbitrator.weaponTable[attacker.weaponProfile.getFireAttackCode()].Row
        };
    }

    getFireAttackAdvantage(attacker, defender) {
        let advantage = this.getFireWeaponAdvantage(attacker, defender)*2;
        return advantage;
    }

    getFireAttackResult(unit, foe, diceResult) {
        return this.getCombatTableResult(diceResult, this.getFireAttackAdvantage(unit, foe));
    }

    processFireAttackResult(unit, foe, diceResult) {
        let lossesForDefender = this.getFireAttackResult(unit, foe, diceResult);
        let success = lossesForDefender>0;
        let lowerFirerMunitions = diceResult[0] === diceResult[1];
        let played = !unit.formationNature || unit.hasAttacked();
        let attackLocation = foe.hexLocation;
        return { success, lossesForDefender, lowerFirerMunitions, played, attackLocation };
    }

    _processMovementOpportunity(direction, hexes, unit, cost, first) {
        direction.cost = cost;
        if (cost.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return false;
        for (let hex of hexes) {
            if (this.doesHexContainFoes(unit, hex)) {
                return false;
            }
        }
        if (cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) {
            if (first) {
                direction.type = CBMovement.MINIMAL;
                return true;
            }
            else return false;
        }
        if (unit.movementPoints>=cost.value) {
            direction.type = CBMovement.NORMAL;
            return true;
        }
        else if (unit.tiredness<CBTiredness.EXHAUSTED) {
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

    getFormationAllowedTurns(unit, first=false) {
        let directions = this.getUnitForwardZone(unit);
        let result = [];
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            if (!(angle % 60)) {
                let direction = directions[angle];
                direction.hex = unit.hexLocation.getFaceHex(unit.angle);
                let cost = this.getFormationTurnCost(unit, angle);
                if (this._processMovementOpportunity(direction, [direction.hex], unit, cost, first)) {
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
            if (this._processMovementOpportunity(direction, [direction.hex], unit, cost, true)) {
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
                if (this._processMovementOpportunity(direction, [
                        unit.hexLocation.fromHex.getNearHex(angle),
                        unit.hexLocation.toHex.getNearHex(angle)
                    ],
                    unit, cost, true)) {
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
                if (this._processMovementOpportunity(direction, [direction.hex], unit, cost, true)) {
                    result[angle] = direction;
                }
            }
        }
        return result;
    }

    _checkAllowedRotations(unit, predicate, first) {

        function processAngle(directions, hexes, unit, angle, cost) {
            console.assert(cost.type===CBMoveProfile.COST_TYPE.ADD);
            let nearHexId = angle%60 ?
               new CBHexSideId(hexes[angle-30].hex, hexes[(angle+30)%360].hex) :
               hexes[angle].hex;
            if (unit.movementPoints>=cost.value) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL, cost};
            }
            else if (unit.tiredness<CBTiredness.EXHAUSTED) {
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

        let foes = new Set(this.getEngagingFoes(unit));
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

    isAllowedToShockAttack(unit) {
        return this.getFoesThatMayBeShockAttacked(unit).length>0;
    }

    isAllowedToFireAttack(unit) {
        return unit.weaponProfile.getFireAttackCode() && this.getFoesThatMayBeFireAttacked(unit).length>0;
    }

    isAllowedToShockDuel(unit) {
        if (!unit.characterNature) return false;
        if (!this.containsAtLeastOneTroop(unit.hexLocation)) return false;
        return this.getFoesThatMayBeDuelAttacked(unit).length>0;
    }

    isAllowedToFireDuel(unit) {
        if (!unit.characterNature) return false;
        return this.getFoesThatMayBeDuelFired(unit).length>0;
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

    isAllowedToBreakFormation(unit) {
        return (!!unit.formationNature) &&
            unit.hasReceivedOrder() &&
            !unit.isExhausted() &&
            unit.inGoodOrder();
    }

    containsAtLeastOneTroop(hexLocation) {
        for (let unit of hexLocation.units) {
            if (!unit.characterNature) return true;
        }
        return false;
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

    processConfrontEngagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processDisengagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
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

    getTroopsAfterFormationBreak(formation) {

        function createTroops(steps) {
            let troops = [];
            while (steps) {
                let troop = new CBTroop(formation.type, formation.wing);
                troop.angle = formation.angle;
                let maxSteps = formation.type.getTroopMaxStepCount();
                let unitSteps = steps>=maxSteps?maxSteps:steps;
                troop.fixRemainingLossSteps(unitSteps);
                steps -= unitSteps;
                if (formation.isDisrupted()) troop.disrupt();
                if (formation.isTired()) troop.fixTirednessLevel(CBTiredness.TIRED);
                if (formation.lackOfMunitions) troop.fixLackOfMunitionsLevel(formation.lackOfMunitions);
                troops.push(troop);
            }
            return troops;
        }

        let steps = formation.remainingStepCount;
        let fromHexUnits = createTroops(Math.ceil(steps/2));
        let toHexUnits = createTroops(Math.floor(steps/2));
        return { fromHex:fromHexUnits, toHex:toHexUnits };
    }

    _isUnitJoinable(toJoin, unit) {
        if (unit.type !== toJoin.type) return false;
        if (unit.angle !== toJoin.angle) return false;
        if (!unit.inGoodOrder()) return false;
        if (unit.isExhausted()) return false;
        if (!unit.hasReceivedOrder()) return false;
        if (unit.hasBeenActivated()) return false;
        return true;
    }

    _isTroopJoinable(toJoin, unit) {
        if (!(unit instanceof CBTroop)) return false;
        return this._isUnitJoinable(toJoin, unit);
    }

    getHexesToMakeFormation(unit) {

        function mayJoin(unit, hex) {
            let similarUnits = false;
            for (let nearUnit of hex.units) {
                if (this._isTroopJoinable(unit, nearUnit)) {
                    similarUnits = true;
                }
                else return false;
            }
            return similarUnits;
        }

        if (!(this._isTroopJoinable(unit, unit) &&
            mayJoin.call(this, unit, unit.hexLocation))) return false;
        if (!(unit.angle%60)) return false;
        let hexes = [];
        let hex = unit.hexLocation.getNearHex((unit.angle+90)%360);
        if (mayJoin.call(this, unit, hex)) {
            hexes.push(hex);
        }
        hex = unit.hexLocation.getNearHex((unit.angle+270)%360);
        if (mayJoin.call(this, unit, hex)) {
            hexes.push(hex);
        }
        return hexes.length ? hexes : false;
    }

    isAllowedToCreateFormation(unit) {
        return this.getHexesToMakeFormation(unit)!==false;
    }

    createFormation(unit, hex) {
        let replaced = [...unit.hexLocation.units, ...hex.units];
        let stepCount = 0;
        for (let troop of replaced) {
            stepCount += troop.remainingStepCount;
        }
        let replacement = new CBFormation(unit.type, unit.wing, Math.ceil(stepCount/2));
        for (let troop of replaced) {
            if (troop.isTired()&& !replacement.isTired()) replacement.fixTirednessLevel(CBTiredness.TIRED);
            if (troop.lackOfMunitions > replacement.lackOfMunitions) replacement.fixLackOfMunitionsLevel(troop.lackOfMunitions);
        }
        replacement.fixRemainingLossSteps(stepCount);
        return { replacement, replaced };
    }

    _isUnitsOnHexMayJoin(formation, hex) {
        for (let unit of hex.units) {
            if (unit !== formation && !this._isUnitJoinable(formation, unit)) return false;
        }
        return true;
    }

    isAllowedToIncludeTroops(formation) {
        if (!formation.formationNature || !this._isUnitJoinable(formation, formation)) return false;
        if (formation.hexLocation.fromHex.units.length===1 && formation.hexLocation.toHex.units.length===1) return false;
        if (!this._isUnitsOnHexMayJoin(formation, formation.hexLocation.fromHex)) return false;
        if (!this._isUnitsOnHexMayJoin(formation, formation.hexLocation.toHex)) return false;
        return true;
    }

    includeTroops(formation) {
        let removed = new Set([...formation.hexLocation.fromHex.units, ...formation.hexLocation.toHex.units]);
        let stepCount = 0;
        for (let unit of removed) {
            stepCount += unit.remainingStepCount;
        }
        var tired = CBTiredness.NONE;
        var lackOfMunitions = CBLackOfMunitions.NONE;
        for (let unit of removed) {
            if (unit.isTired() && !formation.isTired()) tired = CBTiredness.TIRED;
            if (unit.lackOfMunitions > formation.lackOfMunitions) lackOfMunitions = unit.lackOfMunitions;
        }
        removed.delete(formation);
        return { stepCount, tired, lackOfMunitions, removed:[...removed] };
    }

    getHexesToReleaseFormation(formation) {
        let hexes = [];
        if (formation.hexLocation.fromHex.units.length===1) hexes.push(formation.hexLocation.fromHex);
        if (formation.hexLocation.toHex.units.length===1) hexes.push(formation.hexLocation.toHex);
        let stepCount = formation.remainingStepCount - 3;
        if (stepCount>2) stepCount=2;
        return { hexes, stepCount }
    }

    isAllowedToReleaseTroops(formation) {
        if (!formation.formationNature || !this._isUnitJoinable(formation, formation)) return false;
        if (formation.remainingStepCount<4) return false;
        if (formation.hexLocation.fromHex.units.length===1) return true;
        if (formation.hexLocation.toHex.units.length===1) return true;
        return false;
    }

    releaseTroop(formation, hex, steps) {
        let troop = new CBTroop(formation.type, formation.wing);
        troop.fixRemainingLossSteps(steps);
        let stepCount = formation.remainingStepCount - steps;
        if (formation.isTired()) troop.fixTirednessLevel(CBTiredness.TIRED);
        if (formation.lackOfMunitions) troop.fixLackOfMunitionsLevel(formation.lackOfMunitions);
        return { stepCount, troop };
    }

    isAllowedToChoseSpell(unit) {
        return !!unit.characterNature;
    }

    isAllowedToCastSpell(unit) {
        return !!unit.characterNature && unit.hasChosenSpell();
    }

    getAllowedSpells(unit) {
        return [
            "firePentacle1",
            "firePentacle2",
            "firePentacle3",
            "fireCircle1",
            "fireCircle2",
            "fireCircle3",
            "fireball1",
            "fireball2",
            "fireball3",
            "fireSword1",
            "fireSword2",
            "fireSword3",
            "blaze1",
            "blaze2",
            "blaze3",
            "rainFire1",
            "rainFire2",
            "rainFire3"
        ]
    }

    processCastSpellResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    getFoesThatMayBeTargetedBySpell(wizard) {
        let foes = [];
        let foesSet = new Set();
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            let units = zone.hex.units;
            if (units.length) {
                for (let unit of units) {
                    if (!foesSet.has(unit) && this.areUnitsFoes(wizard, unit)) {
                        foesSet.add(unit);
                        foes.push(unit);
                    }
                }
            }
        }
        return foes;
    }

    getFriendsThatMayBeTargetedBySpell(wizard) {
        let friends = [];
        let friendsSet = new Set();
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            let units = zone.hex.units;
            if (units.length) {
                for (let unit of units) {
                    if (!friendsSet.has(unit) && this.areUnitsFriends(wizard, unit)) {
                        friendsSet.add(unit);
                        friends.push(unit);
                    }
                }
            }
        }
        return friends;
    }

    getHexesThatMayBeTargetedBySpell(wizard) {
        let hexes = [];
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            hexes.push(zone.hex);
        }
        return hexes;
    }

    resolveFireball(spellLevel, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success, losses:success?1:0 };
    }

    createRootPathFinding(unit) {
        let pathFinding = new CBPathFinding(unit.hexLocation, unit.angle, unit.wing.retreatZone,
            (from, to)=>{
                let angle = from.getAngle(to);
                let cost = this.game.arbitrator.getMovementCost(unit, angle, from, angle);
                switch(cost.type) {
                    case CBMoveProfile.COST_TYPE.IMPASSABLE: return 10000;
                    case CBMoveProfile.COST_TYPE.MINIMAL_MOVE: return unit.type.getExtendedMovementPoints(unit.remainingStepCount);
                    default: return cost.value;
                }
            },
            (hex, fromAngle, toAngle)=>{
                let cost = this.game.arbitrator.getRotationCost(unit, toAngle, hex, fromAngle);
                switch(cost.type) {
                    case CBMoveProfile.COST_TYPE.IMPASSABLE: return 10000;
                    case CBMoveProfile.COST_TYPE.MINIMAL_MOVE: return unit.type.getExtendedMovementPoints(unit.remainingStepCount);
                    default: return cost.value;
                }
            }
        );
        return new Set(pathFinding.getGoodNextMoves());
    }
}
CBArbitrator.combatTable = [];
CBArbitrator.combatAdvantage = [-16,-11, -7, -4, -2, -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 11, 13, 15, 17, 19, 21];
CBArbitrator.combatTable[ 2] = [  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  4];
CBArbitrator.combatTable[ 3] = [  0,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3,  3,  3,  3];
CBArbitrator.combatTable[ 4] = [  0,  0,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3];
CBArbitrator.combatTable[ 5] = [  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3];
CBArbitrator.combatTable[ 6] = [  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2];
CBArbitrator.combatTable[ 7] = [  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2];
CBArbitrator.combatTable[ 8] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2];
CBArbitrator.combatTable[ 9] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1];
CBArbitrator.combatTable[10] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1];
CBArbitrator.combatTable[11] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1];
CBArbitrator.combatTable[12] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0];

CBArbitrator.weaponTable = {
    "Hrd": {"Row": 0, "Col": 0, "Hrd": 0, "LIf":-1, "MIf":-2, "HIf":-2, "Lan":-2, "UPk":-1, "OPk":-2, "Bow":-1, "Arb":-1, "LCv":-1, "MCv":-2, "HCv":-2, "Bst":-2, "Ani": 0, "Art": 1, "Mst":-2, "Drg":-2},
    "LIf": {"Row": 1, "Col": 1, "Hrd": 1, "LIf": 0, "MIf":-1, "HIf":-2, "Lan":-2, "UPk": 0, "OPk": 0, "Bow": 0, "Arb": 0, "LCv": 0, "MCv":-2, "HCv":-2, "Bst":-2, "Ani": 0, "Art": 1, "Mst":-2, "Drg":-2},
    "MIf": {"Row": 2, "Col": 2, "Hrd": 2, "LIf": 1, "MIf": 0, "HIf":-1, "Lan":-1, "UPk": 2, "OPk":-2, "Bow": 2, "Arb": 2, "LCv": 1, "MCv":-1, "HCv":-2, "Bst":-2, "Ani": 1, "Art": 2, "Mst":-2, "Drg":-2},
    "HIf": {"Row": 3, "Col": 3, "Hrd": 2, "LIf": 2, "MIf": 1, "HIf": 0, "Lan": 1, "UPk": 2, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 1, "MCv": 0, "HCv":-1, "Bst":-1, "Ani": 2, "Art": 2, "Mst":-1, "Drg":-2},
    "Lan": {"Row": 4, "Col": 4, "Hrd": 2, "LIf": 2, "MIf": 1, "HIf":-1, "Lan": 0, "UPk": 2, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 1, "HCv": 0, "Bst":-1, "Ani": 2, "Art": 2, "Mst": 0, "Drg":-1},
    "UPk": {"Row": 5, "Col": 5, "Hrd": 1, "LIf":-1, "MIf":-2, "HIf":-2, "Lan":-2, "UPk": 0, "OPk":-2, "Bow":-1, "Arb":-1, "LCv":-1, "MCv":-2, "HCv":-2, "Bst":-2, "Ani":-2, "Art": 1, "Mst": 0, "Drg":-1},
    "OPk": {"Row": 6, "Col": 6, "Hrd": 2, "LIf": 0, "MIf": 2, "HIf": 1, "Lan": 1, "UPk": 2, "OPk": 0, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 2, "HCv": 1, "Bst": 1, "Ani": 1, "Art": 2, "Mst": 1, "Drg": 0},
    "Bow": {"Row": 7, "Col": 7, "Hrd": 1, "LIf": 0, "MIf":-1, "HIf":-2, "Lan":-2, "UPk": 0, "OPk":-2, "Bow": 0, "Arb": 0, "LCv": 0, "MCv":-2, "HCv":-2, "Bst":-2, "Ani": 0, "Art": 1, "Mst":-2, "Drg":-2},
    "FBw": {"Row": 8, "Col":-1, "Hrd": 2, "LIf": 1, "MIf": 0, "HIf":-1, "Lan":-1, "UPk": 1, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 1, "MCv": 0, "HCv":-1, "Bst":-2, "Ani": 1, "Art": 1, "Mst":-2, "Drg":-2},
    "Arb": {"Row": 9, "Col": 8, "Hrd": 1, "LIf": 0, "MIf":-1, "HIf":-2, "Lan":-2, "UPk": 0, "OPk":-2, "Bow": 0, "Arb": 0, "LCv": 0, "MCv":-2, "HCv":-2, "Bst":-2, "Ani": 0, "Art": 1, "Mst":-2, "Drg":-2},
    "FAb": {"Row":10, "Col":-1, "Hrd": 2, "LIf": 1, "MIf": 1, "HIf": 1, "Lan": 1, "UPk": 0, "OPk": 0, "Bow": 1, "Arb": 1, "LCv": 1, "MCv": 1, "HCv": 0, "Bst": 0, "Ani":-1, "Art": 1, "Mst": 0, "Drg":-1},
    "LCv": {"Row":11, "Col": 9, "Hrd": 1, "LIf": 0, "MIf":-1, "HIf":-2, "Lan":-2, "UPk": 1, "OPk":-2, "Bow": 0, "Arb": 0, "LCv": 0, "MCv":-1, "HCv":-2, "Bst":-2, "Ani": 0, "Art": 2, "Mst":-2, "Drg":-2},
    "MCv": {"Row":12, "Col":10, "Hrd": 2, "LIf": 2, "MIf": 1, "HIf":-1, "Lan":-2, "UPk": 2, "OPk":-2, "Bow": 2, "Arb": 2, "LCv": 1, "MCv": 0, "HCv":-1, "Bst":-2, "Ani": 1, "Art": 2, "Mst":-1, "Drg":-2},
    "HCv": {"Row":13, "Col":11, "Hrd": 2, "LIf": 2, "MIf": 2, "HIf": 0, "Lan":-1, "UPk": 2, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 1, "HCv": 0, "Bst":-1, "Ani": 1, "Art": 2, "Mst":-0, "Drg":-1},
    "Bst": {"Row":14, "Col":12, "Hrd": 2, "LIf": 2, "MIf": 2, "HIf": 1, "Lan": 1, "UPk": 2, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 2, "HCv": 1, "Bst": 0, "Ani": 2, "Art": 2, "Mst":-0, "Drg":-1},
    "Ani": {"Row":15, "Col":13, "Hrd": 0, "LIf": 0, "MIf":-1, "HIf":-2, "Lan":-2, "UPk": 0, "OPk":-1, "Bow": 0, "Arb": 0, "LCv": 0, "MCv":-1, "HCv":-1, "Bst":-2, "Ani": 0, "Art": 2, "Mst":-2, "Drg":-2},
    "Art": {"Row":16, "Col":14, "Hrd":-1, "LIf":-1, "MIf":-2, "HIf":-2, "Lan":-2, "UPk":-1, "OPk":-2, "Bow":-2, "Arb":-2, "LCv":-2, "MCv":-2, "HCv":-2, "Bst":-2, "Ani":-2, "Art": 0, "Mst":-2, "Drg":-2},
    "FAt": {"Row":17, "Col":-1, "Hrd": 0, "LIf":-2, "MIf":-1, "HIf": 0, "Lan": 0, "UPk": 0, "OPk": 1, "Bow":-1, "Arb":-1, "LCv":-2, "MCv":-2, "HCv":-1, "Bst": 0, "Ani":-2, "Art": 0, "Mst": 0, "Drg":-0},
    "Mst": {"Row":18, "Col":15, "Hrd": 2, "LIf": 2, "MIf": 2, "HIf": 1, "Lan": 0, "UPk": 0, "OPk":-1, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 1, "HCv": 0, "Bst": 0, "Ani": 2, "Art": 2, "Mst": 0, "Drg":-1},
    "Drg": {"Row":19, "Col":16, "Hrd": 2, "LIf": 2, "MIf": 2, "HIf": 2, "Lan": 1, "UPk": 1, "OPk": 0, "Bow": 2, "Arb": 2, "LCv": 2, "MCv": 2, "HCv":-1, "Bst": 1, "Ani": 2, "Art": 2, "Mst":-1, "Drg":-0},
};
CBArbitrator.weaponTable.COLCOUNT = 17;
CBArbitrator.weaponTable.ROWCOUNT = 20;
