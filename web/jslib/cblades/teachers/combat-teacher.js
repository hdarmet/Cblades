'use strict'

import {
    CBMoveType
} from "../map.js";

export class CBCombatTeacher {

    isAllowedToShockAttack(unit) {
        return this.getFoesThatMayBeShockAttacked(unit).length>0;
    }

    isAllowedToFireAttack(unit) {
        return unit.weaponProfile.getFireAttackCode() && this.getFoesThatMayBeFireAttacked(unit).length>0;
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

        function processZone(zone, unit, moveType) {
            zone.moveType = moveType;
            return !this.doesHexLocationContainFoes(unit, zone.hex);
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
        if (!unit.isRouted() && !unit.isCharging()) {
            let forbiddenZones = this.getRetreatForbiddenZone(attacker);
            let zones = this.getUnitBackwardZone(unit);
            processZones.call(this, result, zones, CBMoveType.BACKWARD, forbiddenZones);
            zones = this.getUnitForwardZone(unit);
            processZones.call(this, result, zones, CBMoveType.FORWARD, forbiddenZones);
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
                zone.moveType = CBMoveType.FORWARD;
            }
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

    _getForwardZoneThatMayBeShockAttacked(unit) {
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

    getShockAttackAdvantage(attacker, defender, supported) {
        let advantage = supported ? 0 : -4;
        advantage += this.getShockWeaponAdvantage(attacker, defender)*2;
        return advantage;
    }

    getShockAttackResult(unit, foe, supported, diceResult) {
        //return 1;
        return this.getCombatTableResult(diceResult, this.getShockAttackAdvantage(unit, foe, supported));
    }

    processShockAttackResult(unit, foe, supported, diceResult) {
        let lossesForDefender = this.getShockAttackResult(unit, foe, supported, diceResult);
        let success = lossesForDefender>0;
        let tirednessForAttacker = supported && !unit.isCharging();
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
        let hexes = this._getForwardZoneThatMayBeFireAttached(unit, unit.weaponProfile.getFireRange());
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
        let fireRow = CBCombatTeacher.weaponTable[attacker.weaponProfile.getFireAttackCode()];
        return fireRow ? fireRow[defender.weaponProfile.getFireDefendCode()] : null;
    }

    getFireWeaponCell(attacker, defender) {
        return {
            col:CBCombatTeacher.weaponTable[defender.weaponProfile.getFireDefendCode()].Col,
            row:CBCombatTeacher.weaponTable[attacker.weaponProfile.getFireAttackCode()].Row
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