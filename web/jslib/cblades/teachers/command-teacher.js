'use strict'

import {
    CBFormation, CBLackOfMunitions, CBOrderInstruction, CBTiredness, CBTroop
} from "../unit.js";
import {
    distanceFromHexToHex
} from "../map.js";
import {
    sumAngle
} from "../../geometry.js";

export class CBCommandTeacher {

    isAllowedToChangeOrderInstruction(unit) {
        return unit.characterNature && unit.wing.leader === unit;
    }

    isAllowedToGiveOrders(unit) {
        return unit.characterNature;
    }

    isAllowedToTakeCommand(unit) {
        return unit.characterNature && unit.wing.leader !== unit;
    }

    isAllowedToDismissCommand(unit) {
        return unit.characterNature && unit.wing.leader === unit;
    }

    processChangeOrderInstructionResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=leader.commandLevel;
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
            let order = this.getOrderGivenCost(leader, unit);
            if (unit !== leader &&
                !unit.hasBeenActivated() &&
                !unit.hasReceivedOrder() &&
                order.cost<=commandPoints)
            {
                units.push(order);
            }
        }
        return units;
    }

    getOrderGivenCost(leader, unit) {
        let cost = 1;
        let detail = {base:1};
        let distance = Math.floor(distanceFromHexToHex(leader.hexLocation, unit.hexLocation)/4);
        if (distance) { detail.distance = distance; cost += distance; }
        if (unit.isRouted()) { detail.routed = 2; cost += 2; }
        if (unit.isDisrupted()) { detail.disrupted = 1; cost += 1; }
        if (unit.isExhausted()) { detail.exhausted = 1; cost += 1; }
        return { unit, cost, detail };
    }

    computeCommandPoints(unit, diceResult) {
        return diceResult[0]+5;
    }

    processTakeCommandResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=leader.commandLevel;
        return { success };
    }

    processDismissCommandResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=leader.commandLevel;
        return { success };
    }

    hasOrderToCombine(unit) {
        return unit.hasReceivedOrder() || unit.wing.orderInstruction === CBOrderInstruction.REGROUP;
    }

    isAllowedToBreakFormation(unit) {
        if (!unit.formationNature) return false;
        if (!this.hasOrderToCombine(unit)) return false;
        if (unit.remainingStepCount>8) return false;
        if (unit.isExhausted()) return false;
        if (!unit.isInGoodOrder()) return false;
        return true;
    }

    isAllowedToMerge(unit) {
        if (!(unit instanceof CBTroop)) return false;
        let units = this.getUnitOfType(unit.hexLocation.units, unit.type);
        if (units.length !== 2) return false;
        let [unit1, unit2] = units;
        if (!unit1.isInGoodOrder() || !unit2.isInGoodOrder()) return false;
        if (unit1.isExhausted() || unit2.isExhausted()) return false;
        if (unit1.hasBeenPlayed() || unit2.hasBeenPlayed()) return false;
        if (!this.hasOrderToCombine(unit1) || !this.hasOrderToCombine(unit2)) return false;
        if (unit1.remainingStepCount + unit2.remainingStepCount > unit.maxStepCount) return false;
        return true;
    }

    isAllowedToCreateFormation(unit) {
        return this.getHexesToMakeFormation(unit)!==false;
    }

    isAllowedToIncludeTroops(formation) {
        if (!formation.formationNature || !this._isUnitJoinable(formation, formation)) return false;
        if (formation.hexLocation.fromHex.units.length===1 && formation.hexLocation.toHex.units.length===1) return false;
        if (!this._isUnitsOnHexMayJoin(formation, formation.hexLocation.fromHex)) return false;
        if (!this._isUnitsOnHexMayJoin(formation, formation.hexLocation.toHex)) return false;
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
        if (!unit.isInGoodOrder()) return false;
        if (unit.isExhausted()) return false;
        if (!this.hasOrderToCombine(unit)) return false;
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
        let hex = unit.hexLocation.getNearHex(sumAngle(unit.angle, 90));
        if (mayJoin.call(this, unit, hex)) {
            hexes.push(hex);
        }
        hex = unit.hexLocation.getNearHex(sumAngle(unit.angle, -90));
        if (mayJoin.call(this, unit, hex)) {
            hexes.push(hex);
        }
        return hexes.length ? hexes : false;
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
}