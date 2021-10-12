'use strict'

import {
    CBHex, CBHexSideId,
    distanceFromHexToHex
} from "../map.js";
import {
    CBStacking
} from "../game.js";
import {
    CBEngageSideMode
} from "../unit.js";
import {
    CBLineOfSight
} from "../pathfinding.js";

export class CBCombatTeacher {

    isAllowedToShockAttack(unit) {
        return this.getFoesThatMayBeShockAttacked(unit).length>0;
    }

    hasFireAttackCapacity(unit) {
        return unit.weaponProfile.getFireAttackCode();
    }

    isAllowedToFireAttack(unit) {
        return this.hasFireAttackCapacity(unit) && this.getFoesThatMayBeFireAttacked(unit).length>0;
    }

    containsAtLeastOneTroop(hexLocation) {
        for (let unit of hexLocation.units) {
            if (!unit.characterNature) return true;
        }
        return false;
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

        function processZone(zone, unit, stacking) {
            zone.stacking = stacking;
            return !this.doesHexLocationContainFoes(unit, zone.hex);
        }

        function processZones(result, zones, stacking, forbiddenZones) {
            for (let sangle in zones) {
                let angle = parseInt(sangle);
                let zone = zones[angle];
                if (!forbiddenZones.has(zone.hex)) {
                    if (processZone.call(this, zone, unit, stacking)) {
                        result[angle] = zone;
                    }
                }
            }
        }

        let result = [];
        if (!unit.isRouted() && !unit.isCharging()) {
            let forbiddenZones = this.getRetreatForbiddenZone(attacker);
            let zones = this.getUnitBackwardZone(unit);
            processZones.call(this, result, zones, CBStacking.TOP, forbiddenZones);
            zones = this.getUnitForwardZone(unit);
            processZones.call(this, result, zones, CBStacking.BOTTOM, forbiddenZones);
        }
        return result;
    }

    getAdvanceZones(unit, hexes) {
        let allowesZones = new Set(hexes);
        let result = [];
        let zones = this.getUnitForwardZone(unit);
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            let zone = zones[angle];
            if (allowesZones.has(zone.hex) && zone.hex.empty) {
                result[angle] = zone;
                zone.stacking = CBStacking.BOTTOM;
            }
        }
        return result;
    }

    getFormationRetreatZones(unit, attacker) {

        function processZones(zones, retreatDirections, rotateDirections, forbiddenZones, stacking) {
            for (let sangle in zones) {
                let angle = parseInt(sangle);
                if (angle % 60) {
                    if (hexes.has(zones[angle].hex)) {
                        let hex = unit.hexLocation.fromHex;
                        let moveHex = unit.hexLocation.toHex;
                        if (!forbiddenZones.has(hex)) {
                            let zangle = moveHex.isNearHex(zones[angle].hex);
                            rotateDirections[zangle] = { hex:zones[angle].hex, stacking };
                        }
                        hex = unit.hexLocation.toHex;
                        moveHex = unit.hexLocation.fromHex;
                        if (!forbiddenZones.has(hex)) {
                            let zangle = moveHex.isNearHex(zones[angle].hex);
                            rotateDirections[zangle] = { hex:zones[angle].hex, stacking };
                        }
                    }
                }
                else {
                    if (hexes.has(unit.hexLocation.fromHex.getNearHex(angle)) &&
                        hexes.has(unit.hexLocation.toHex.getNearHex(angle)))
                        retreatDirections[angle] = { hex:zones[angle].hex, stacking };
                }
            }
        }

        let hexes = this.getHexesFromZones(this.getRetreatZones(unit, attacker));
        let forbiddenZones = this.getRetreatForbiddenZone(attacker);
        let retreatDirections = [];
        let rotateDirections = [];
        let zones = this.getUnitForwardZone(unit);
        processZones.call(this, zones, retreatDirections, rotateDirections, forbiddenZones, CBStacking.BOTTOM);
        zones = this.getUnitBackwardZone(unit)
        processZones.call(this, zones, retreatDirections, rotateDirections, forbiddenZones, CBStacking.TOP);
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

    _getForwardZoneThatMayBeShockAttacked(unit) {
        return this.getUnitForwardZone(unit);
    }

    getFoesThatMayBeShockAttacked(unit) {
        let zones = this._getForwardZoneThatMayBeShockAttacked(unit);
        let foes = [];
        let foesSet = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            this._collectFoes(foes, foesSet, unit, zones[angle].hex, {
                supported:!unit.isExhausted(),
                unsupported:!unit.isCharging()
            });
        }
        return foes;
    }

    getFoesThatMayBeDuelAttacked(unit) {
        let zones = this._getForwardZoneThatMayBeShockAttacked(unit);
        let foes = [];
        let foesSet = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            this._collectFoesForDuel(foes, foesSet, unit, zones[angle].hex, {
                supported:!unit.isExhausted(),
                unsupported:!unit.isCharging()
            });
        }
        return foes;
    }

    getWeaponCapacityAdvantage(unit) {
        return unit.weaponProfile.capacity;
    }

    getCombatTableResult(diceResult, advantage) {
        let column = 0;
        let dices = diceResult[0]+diceResult[1];
        while (column<CBCombatTeacher.combatAdvantage.length) {
            if (advantage < CBCombatTeacher.combatAdvantage[column]) {
                return column>0 ? CBCombatTeacher.combatTable[dices][column-1] : 0;
            }
            else column++;
        }
        return CBCombatTeacher.combatTable[dices][CBCombatTeacher.combatAdvantage.length-1];
    }

    getShockWeaponAdvantage(attacker, defender) {
        return CBCombatTeacher.weaponTable[attacker.weaponProfile.getShockAttackCode()][defender.weaponProfile.getShockDefendCode()];
    }

    getShockWeaponCell(attacker, defender) {
        return {
            col:CBCombatTeacher.weaponTable[defender.weaponProfile.getShockDefendCode()].Col,
            row:CBCombatTeacher.weaponTable[attacker.weaponProfile.getShockAttackCode()].Row
        };
    }

    isClearGroundForShock(hexId) {
        return this.isClearGround(hexId);
    }

    isClearHexSideForShock(hexSideId) {
        return this.isClearHexSide(hexSideId);
    }

    isRoughGroundForShock(hexId) {
        return this.isRoughGround(hexId);
    }

    isDifficultGroundForShock(hexId) {
        return this.isDifficultGround(hexId) ||
            hexId.type === CBHex.HEX_TYPES.LAVA ||
            hexId.type === CBHex.HEX_TYPES.WATER;
    }

    isDifficultHexSideForShock(hexSideId) {
        return this.isDifficultHexSide(hexSideId);
    }

    isDifficultHexSideForFire(hexSideId) {
        return this.isDifficultHexSide(hexSideId) || this.isImpassableHexSide(hexSideId);
    }

    isChargeAllowed(attackerHex, defenderHex) {
        if (!this.isClearGroundForShock(defenderHex)) return false;
        if (!this.isClearHexSideForShock(new CBHexSideId(attackerHex, defenderHex))) return false;
        return true;
    }

    isAboveForShock(attackerHex, defenderHex) {
        return attackerHex.height > defenderHex.height
    }

    isBelowForShock(attackerHex, defenderHex) {
        return attackerHex.height < defenderHex.height
    }

    getShockAttackAdvantage(attacker, attackerHex, defender, defenderHex, supported) {
        let advantage = 0;
        let record = {attacker, defender};
        if (!supported) {
            record.notSupported = -4;
            advantage -=4;
        }
        record.weapons = this.getShockWeaponAdvantage(attacker, defender)*2;
        advantage += record.weapons;
        record.attackerCapacity = this.getWeaponCapacityAdvantage(attacker);
        record.defenderCapacity = -this.getWeaponCapacityAdvantage(defender);
        advantage += record.attackerCapacity + record.defenderCapacity;
        if (attacker.isCharging() && this.isChargeAllowed(attackerHex, defenderHex)) {
            record.attackerCharging = 2;
            advantage += 2;
        }
        if (defender.isCharging()) {
            record.defenderCharging = -2;
            advantage -= 2;
        }
        if (attacker.isTired()) {
            record.attackerTired = -1;
            advantage -= 1;
        }
        if (attacker.isExhausted()) {
            record.attackerExhausted = -2;
            advantage -=2;
        }
        if (defender.isExhausted()) {
            record.defenderExhausted = 1;
            advantage +=1;
        }
        if (attacker.isDisrupted()) {
            record.attackerDisrupted = -1;
            advantage -=1;
        }
        if (defender.isDisrupted()) {
            record.defenderDisrupted = 1;
            advantage +=1;
        }
        if (defender.isRouted()) {
            record.defenderRouted = 4;
            advantage +=4;
        }
        if (attacker.characterNature) {
            record.attackerIsACharacter = -4;
            advantage -= 4;
        }
        if (defender.characterNature) {
            record.defenderIsACharacter = 4;
            advantage += 4;
        }
        let side = this.getEngagementSide(attacker, defender);
        if (side === CBEngageSideMode.SIDE) {
            record.sideAdvantage = 2;
            advantage += 2;
        }
        if (side === CBEngageSideMode.BACK) {
            record.backAdvantage = 4;
            advantage += 4;
        }
        if (this.isAboveForShock(attackerHex, defenderHex)) {
            record.attackerAboveDefenfer = 1;
            advantage += 1;
        }
        if (this.isBelowForShock(attackerHex, defenderHex)) {
            record.attackerBelowDefender = -1;
            advantage -= 1;
        }
        if (this.isRoughGroundForShock(attackerHex)) {
            record.attackerOnRoughGround = -1;
            advantage -= 1;
        }
        if (this.isDifficultGroundForShock(attackerHex)) {
            record.attackerOnDifficultGround = -2;
            advantage -= 2;
        }
        if (this.isRoughGroundForShock(defenderHex)) {
            record.defenderOnRoughGround = -1;
            advantage -= 1;
        }
        if (this.isDifficultGroundForShock(defenderHex)) {
            record.defenderOnDifficultGround = -2;
            advantage -= 2;
        }
        if (this.isDifficultHexSideForShock(new CBHexSideId(attackerHex, defenderHex))) {
            record.difficultHexSide = -1;
            advantage -= 1;
        }
        if (attacker.weaponProfile.getAttackBonus()) {
            record.attackBonus = attacker.weaponProfile.getAttackBonus();
            advantage += attacker.weaponProfile.getAttackBonus();
        }
        if (defender.weaponProfile.getDefenseBonus()) {
            record.defenseBonus = -defender.weaponProfile.getDefenseBonus();
            advantage -= defender.weaponProfile.getDefenseBonus();
        }
        if (this.isStackedTroop(attacker)) {
            record.attackerStacked = -2;
            advantage -= 2;
        }
        if (this.isStackedTroop(defender)) {
            record.defenderStacked = 2;
            advantage += 2;
        }
        record.advantage = advantage;
        return record;
    }

    getShockAttackResult(attacker, attackerHex, defender, defenderHex, supported, diceResult) { // LA
        return this.getCombatTableResult(diceResult,
            this.getShockAttackAdvantage(attacker, attackerHex, defender, defenderHex, supported).advantage);
    }

    processShockAttackResult(attacker, attackerHex, defender, defenderHex, supported, diceResult) {
        let lossesForDefender = this.getShockAttackResult(attacker, attackerHex, defender, defenderHex, supported, diceResult);
        let success = lossesForDefender>0;
        let tirednessForAttacker = supported && !attacker.isCharging();
        return { success, lossesForDefender, tirednessForAttacker };
    }

    getFoeConditionForEngagement(foe, unit) {
        let condition = {};
        let weapons = this.getShockWeaponAdvantage(foe, unit);
        let modifier = weapons;
        condition.weapons = weapons;
        let unitCapacity = this.getWeaponCapacityAdvantage(unit);
        let foeCapacity = this.getWeaponCapacityAdvantage(foe);
        if (unitCapacity!==foeCapacity) {
            condition.capacity = unitCapacity>foeCapacity ? -1 : 1;
            modifier += condition.capacity;
        }
        if (unit.characterNature) {
            condition.unitIsACharacter = 1;
            modifier += 1;
        }
        if (foe.characterNature) {
            condition.foeIsACharacter = -1;
            modifier -= 1;
        }
        if (unit.isCharging()) {
            condition.unitIsCharging = -1;
            modifier -= 1;
        }
        if (foe.isCharging()) {
            condition.foeIsCharging = 1;
            modifier += 1;
        }
        let side = this.getEngagementSide(foe, unit);
        if (side === CBEngageSideMode.SIDE) {
            condition.sideAdvantage = 1;
            modifier += 1;
        }
        if (side === CBEngageSideMode.BACK) {
            condition.backAdvantage = 2;
            modifier += 2;
        }
        condition.modifier = modifier;
        return condition;
    }

    getEngagementCondition(unit) {
        let foes = this.getEngagingFoes(unit);
        let foeCondition = null;
        for (let foe of foes.keys()) {
            let thisFoeCondition = this.getFoeConditionForEngagement(foe, unit);
            if (!foeCondition || thisFoeCondition.modifier>foeCondition.modifier) {
                foeCondition = thisFoeCondition;
            }
        }
        return foeCondition;
    }

    getAttackerEngagementCondition(unit) {
        return this.getEngagementCondition(unit);
    }

    getDefenderEngagementCondition(unit) {
        return this.getEngagementCondition(unit);
    }

    getConfrontEngagementCondition(unit) {
        return this.getEngagementCondition(unit);
    }

    processAttackerEngagementResult(unit, diceResult) {
        let condition = this.getAttackerEngagementCondition(unit);
        let total = diceResult[0]+diceResult[1];
        let success = total===2 ? true : total===12 ? false : total<=unit.moral-condition.modifier;
        return {
            modifier: condition.modifier,
            success
        };
    }

    processDefenderEngagementResult(unit, diceResult) {
        let condition = this.getDefenderEngagementCondition(unit);
        let total = diceResult[0]+diceResult[1];
        let success = total===2 ? true : total===12 ? false : total<=unit.moral-condition.modifier;
        return {
            modifier: condition.modifier,
            success
        };
    }

    processConfrontEngagementResult(unit, diceResult) {
        let condition = this.getConfrontEngagementCondition(unit);
        let total = diceResult[0]+diceResult[1];
        let success = total===2 ? true : total===12 ? false : total<=unit.moral-condition.modifier;
        return {
            modifier: condition.modifier,
            success
        };
    }

    _getForwardZoneThatMayBeFireAttacked(unit, range) {
        return this.getUnitForwardArea(unit, range);
    }

    _getForwardZoneThatMayBeFireAttackedFromHex(unit, hexId, range) {
        return this.getUnitForwardAreaFromHex(unit, hexId, range);
    }

    _getFoesForCombat(unit, hexes) {
        let foes = [];
        let foesSet = new Set();
        for (let hex of hexes) {
            this._collectFoes(foes, foesSet, unit, hex, {});
        }
        return foes;
    }

    getFoesThatMayBeFireAttackedFromHex(unit, hexId) {
        let hexes = this._getForwardZoneThatMayBeFireAttackedFromHex(unit, hexId, unit.weaponProfile.getFireRange());
        return this._getFoesForCombat(unit, hexes);
    }

    getFoesThatMayBeFireAttacked(unit) {
        let hexes = this._getForwardZoneThatMayBeFireAttacked(unit, unit.weaponProfile.getFireRange());
        return this._getFoesForCombat(unit, hexes);
    }

    _getFoesForDuel(unit, hexes) {
        let foes = [];
        let foesSet = new Set();
        for (let hex of hexes) {
            this._collectFoesForDuel(foes, foesSet, unit, hex, {});
        }
        return foes;
    }

    getFoesThatMayBeDuelFiredFromHex(unit, hexId) {
        let hexes = this._getForwardZoneThatMayBeFireAttackedFromHex(unit, hexId, unit.weaponProfile.getFireRange());
        return this._getFoesForDuel(unit, hexes);
    }

    getFoesThatMayBeDuelFired(unit) {
        let hexes = this._getForwardZoneThatMayBeFireAttacked(unit, unit.weaponProfile.getFireRange());
        return this._getFoesForDuel(unit, hexes);
    }

    getFireWeaponAdvantage(firer, target) {
        let fireRow = CBCombatTeacher.weaponTable[firer.weaponProfile.getFireAttackCode()];
        return fireRow ? fireRow[target.weaponProfile.getFireDefendCode()] : null;
    }

    getFireWeaponCell(firer, target) {
        return {
            col:CBCombatTeacher.weaponTable[target.weaponProfile.getFireDefendCode()].Col,
            row:CBCombatTeacher.weaponTable[firer.weaponProfile.getFireAttackCode()].Row
        };
    }

    isAboveForFire(attackerHex, defenderHex) {
        return attackerHex.height > defenderHex.height
    }

    isBelowForFire(attackerHex, defenderHex) {
        return attackerHex.height < defenderHex.height
    }

    isRoughGroundForFire(hexId) {
        return this.isRoughGround(hexId);
    }

    isDifficultGroundForFire(hexId) {
        return this.isDifficultGround(hexId);
    }

    getFireDistanceMalus(firer, firerHex, targetHex) {
        return (distanceFromHexToHex(firerHex, targetHex)-1)/firer.weaponProfile.getFireMalusSegmentSize();
    }

    _isLastHexSideHindered(firerHex, targetHex) {
        let path = new CBLineOfSight(firerHex, targetHex).getPath();
        let lastSides = path[path.length-2];
        for (let lastHex of lastSides) {
            if (this.isDifficultHexSideForFire(new CBHexSideId(lastHex, targetHex))) {
                return true;
            }
        }
        return false;
    }

    getFireAttackAdvantage(firer, firerHex, target, targetHex) {
        let advantage = 0;
        let record = {firer, target};
        record.weapons = this.getFireWeaponAdvantage(firer, target)*2;
        advantage += record.weapons;
        record.firerCapacity = this.getWeaponCapacityAdvantage(firer);
        record.targetCapacity = -this.getWeaponCapacityAdvantage(target);
        advantage += record.firerCapacity + record.targetCapacity;
        if (firer.isExhausted()) {
            record.firerExhausted = -1;
            advantage -=1;
        }
        if (firer.isDisrupted()) {
            record.firerDisrupted = -1;
            advantage -=1;
        }
        if (target.isDisrupted()) {
            record.targetDisrupted = 1;
            advantage +=1;
        }
        if (target.isRouted()) {
            record.targetRouted = 4;
            advantage +=4;
        }
        if (firer.characterNature) {
            record.firerIsACharacter = -4;
            advantage -= 4;
        }
        if (target.characterNature) {
            record.targetIsACharacter = 4;
            advantage += 4;
        }
        let side = this.getFireSide(firer, target);
        if (side === CBEngageSideMode.SIDE) {
            record.sideAdvantage = 1;
            advantage += 1;
        }
        if (side === CBEngageSideMode.BACK) {
            record.backAdvantage = 2;
            advantage += 2;
        }
        if (this.isAboveForFire(firerHex, targetHex)) {
            record.firerAboveTarget = 1;
            advantage += 1;
        }
        if (this.isBelowForFire(firerHex, targetHex)) {
            record.firerBelowTarget = -1;
            advantage -= 1;
        }
        if (this.isRoughGroundForFire(firerHex) || this.isDifficultGroundForFire(firerHex)) {
            record.firerOnDifficultGround = -1;
            advantage -= 1;
        }
        if (this.isRoughGroundForFire(targetHex)) {
            record.targetOnRoughGround = -2;
            advantage -= 2;
        }
        if (this.isDifficultGroundForFire(targetHex)) {
            record.targetOnDifficultGround = -4;
            advantage -= 4;
        }
        if (firer.weaponProfile.getFireBonus()) {
            record.fireBonus = firer.weaponProfile.getFireBonus();
            advantage += firer.weaponProfile.getFireBonus();
        }
        if (target.weaponProfile.getDefenseBonus()) {
            record.defenseBonus = -target.weaponProfile.getDefenseBonus();
            advantage -= target.weaponProfile.getDefenseBonus();
        }
        if (this._isLastHexSideHindered(firerHex, targetHex)) {
            record.targetProtection = -1;
            advantage -= 1;
        }
        let distanceMalus = this.getFireDistanceMalus(firer, firerHex, targetHex);
        if (distanceMalus) {
            record.distanceMalus = -distanceMalus;
            advantage -= distanceMalus;
        }
        if (firer.areMunitionsScarce()) {
            record.scarceMunitions = -1;
            advantage -= 1;
        }
        if (this.isStackedTroop(firer)) {
            record.firerStacked = -2;
            advantage -= 2;
        }
        if (this.isStackedTroop(target)) {
            record.targetStacked = 2;
            advantage += 2;
        }
        record.advantage = advantage;
        return record;
    }

    getFireAttackResult(firer, firerHex, target, targetHex, diceResult) {
        return this.getCombatTableResult(diceResult,
            this.getFireAttackAdvantage(firer, firerHex, target, targetHex).advantage);
    }

    processFireAttackResult(firer, firerHex, target, targetHex, diceResult) {
        let lossesForDefender = this.getFireAttackResult(firer, firerHex, target, targetHex, diceResult);
        let success = lossesForDefender>0;
        let lowerFirerMunitions = diceResult[0] === diceResult[1];
        return { success, lossesForDefender, lowerFirerMunitions };
    }

}
CBCombatTeacher.combatTable = [];
CBCombatTeacher.combatAdvantage = [-16,-11, -7, -4, -2, -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 11, 13, 15, 17, 19, 21];
CBCombatTeacher.combatTable[ 2] = [  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  4];
CBCombatTeacher.combatTable[ 3] = [  0,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3,  3,  3,  3];
CBCombatTeacher.combatTable[ 4] = [  0,  0,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3,  3,  3,  3];
CBCombatTeacher.combatTable[ 5] = [  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  3,  3];
CBCombatTeacher.combatTable[ 6] = [  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2];
CBCombatTeacher.combatTable[ 7] = [  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2];
CBCombatTeacher.combatTable[ 8] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2];
CBCombatTeacher.combatTable[ 9] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1];
CBCombatTeacher.combatTable[10] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1];
CBCombatTeacher.combatTable[11] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1];
CBCombatTeacher.combatTable[12] = [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0];

CBCombatTeacher.weaponTable = {
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
CBCombatTeacher.weaponTable.COLCOUNT = 17;
CBCombatTeacher.weaponTable.ROWCOUNT = 20;