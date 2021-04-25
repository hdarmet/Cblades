import {
    CBAbstractArbitrator
} from "./game.js";
import {
    CBMapTeacher
} from "./teachers/map-teacher.js";
import {
    CBUnitManagementTeacher
} from "./teachers/units-teacher.js";
import {
    CBMovementTeacher
} from "./teachers/movement-teacher.js";
import {
    CBCombatTeacher
} from "./teachers/combat-teacher.js";
import {
    CBCommandTeacher
} from "./teachers/command-teacher.js";
import {
    CBRecoveringTeacher
} from "./teachers/recover-teacher.js";
import {
    CBWizardryTeacher
} from "./teachers/magic-teacher.js";
import {
    CBMiscellaneousTeacher
} from "./teachers/miscellaneous-teacher.js";
import {
    CBOrderInstruction
} from "./unit.js";
import {
    CBMoveMode
} from "./map.js";

export class CBArbitrator extends CBAbstractArbitrator{

    getAllowedActions(unit) {
        let allowedActions = {};

        if (this._processRoutedUnitAllowedActions(unit, allowedActions)) return allowedActions;
        if (this._processChargingUnitAllowedActions(unit, allowedActions)) return allowedActions;
        if (this._processRegroupingWingBelongingUnitNearEnemies(unit, allowedActions)) return allowedActions;
        if (this._processRetreatingWingBelongingUnitNearEnemies(unit, allowedActions)) return allowedActions;
        if (this._processEngagedUnitThatDoesNotEngage(unit, allowedActions)) return allowedActions;
        if (this._processUnitRecovering(unit, allowedActions)) return allowedActions;
        if (this._processRegroupingWingBelongingUnitFarFromEnemies(unit, allowedActions)) return allowedActions;
        if (this._processDefendingWingBelongingUnit(unit, allowedActions)) return allowedActions;
        if (this._processAttackingWingBelongingUnit(unit, allowedActions)) return allowedActions;
        if (this._processUnitWithAnOrder(unit, allowedActions)) return allowedActions;
        if (this._processCharacter(unit, allowedActions)) return allowedActions;
        return allowedActions;
    }

    _processRoutedUnitAllowedActions(unit, allowedActions) {
        if (unit.isRouted()) {
            if (this.isAllowedToRally(unit)) {
                allowedActions.rally = true;
            }
            else {
                if (this.isAllowedToRout(unit)) {
                    allowedActions.escape = true;
                }
                else {
                    allowedActions.destroyed = true;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }

    _processChargingUnitAllowedActions(unit, allowedActions) {
        if (unit.isCharging()) {
            if (this.doesUnitEngage(unit)) {
                if (this.isAllowedToShockAttack(unit)) allowedActions.shockAttack = true;
                if (this.isAllowedToShockDuel(unit)) allowedActions.shockDuel = true;
                return true;
            }
            else {
                if (this.isAllowedToMove(unit)) {
                    allowedActions.moveForward = true;
                    allowedActions.moveMode =CBMoveMode.ATTACK;
                }
                return allowedActions.moveForward && !unit.hasReceivedOrder();
            }
        }
        else {
            return false;
        }
    }

    _processRegroupingWingBelongingUnitNearEnemies(unit, allowedActions) {
        if (!unit.troopNature || unit.hasReceivedOrder()) return false;
        if (unit.wing.orderInstruction === CBOrderInstruction.REGROUP) {
            if (this.isUnitEngaged(unit)) {
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                if (allowedActions.moveBack || allowedActions.escape) {
                    return true;
                }
                else {
                    if (this.isAllowedToConfront(unit)) {
                        allowedActions.confront = true;
                        return true;
                    }
                    else {
                        if (this.isAllowedToShockAttack(unit)) {
                            allowedActions.shockAttack = true;
                            return true;
                        }
                    }
                }
            }
            else if (this.foesThatCanJoinAndEngage(unit)) {
                if (this.isAllowedToMove(unit)) {
                    allowedActions.moveForward = true;
                    allowedActions.moveMode =CBMoveMode.REGROUP;
                }
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                return allowedActions.moveForward || allowedActions.moveBack || allowedActions.escape;
            }
        }
        return false;
    }

    _processRetreatingWingBelongingUnitNearEnemies(unit, allowedActions) {
        if (!unit.troopNature || unit.hasReceivedOrder()) return false;
        if (unit.wing.orderInstruction === CBOrderInstruction.RETREAT) {
            if (this.isUnitEngaged(unit)) {
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                if (allowedActions.moveBack || allowedActions.escape) {
                    return true;
                }
                else {
                    if (this.isAllowedToConfront(unit)) {
                        allowedActions.confront = true;
                        return true;
                    }
                    else {
                        if (this.isAllowedToShockAttack(unit)) {
                            allowedActions.shockAttack = true;
                            return true;
                        }
                    }
                }
            }
            else {
                if (this.isAllowedToMove(unit)) {
                    allowedActions.moveForward = true;
                    allowedActions.moveMode =CBMoveMode.RETREAT;
                }
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                return allowedActions.moveForward || allowedActions.moveBack || allowedActions.escape;
            }
        }
        return false;
    }

    _processEngagedUnitThatDoesNotEngage(unit, allowedActions) {
        if (this.isAllowedToConfront(unit)) {
            allowedActions.confront = true;
            return true;
        }
        return false;
    }

    _processUnitRecovering(unit, allowedActions) {
        if (this.doesUnitEngage(unit)) {
            if (unit.isDisrupted() || unit.isExhausted()) {
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            }
        }
        else {
            if (unit.isTired() || unit.isExhausted()) {
                if (this.isAllowedToRest(unit)) allowedActions.rest = true;
            }
            if (unit.isDisrupted()) {
                if (this.isAllowedToReorganize(unit)) allowedActions.reorganize = true;
                if (!unit.isTired() && !unit.isExhausted()) allowedActions.noAction = true;
            }
        }
        return false;
    }

    _processRegroupingWingBelongingUnitFarFromEnemies(unit, allowedActions) {
        if (!unit.troopNature || unit.hasReceivedOrder()) return false;
        if (unit.wing.orderInstruction === CBOrderInstruction.REGROUP) {
            if (this.isAllowedToMove(unit)) {
                allowedActions.moveForward = true;
                allowedActions.moveMode =CBMoveMode.REGROUP;
            }
            if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
            if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
            if (this.isAllowedToRest(unit)) allowedActions.rest = true;
            if (this.isAllowedToReplenishMunitions(unit)) allowedActions.reload = true;
            if (this.isAllowedToReorganize(unit)) allowedActions.reorganize = true;
            if (this.isAllowedToRally(unit)) allowedActions.rally = true;
            if (this.isAllowedToCreateFormation(unit)) allowedActions.createFormation = true;
            if (this.isAllowedToIncludeTroops(unit)) allowedActions.joinFormation = true;
            if (this.isAllowedToReleaseTroops(unit)) allowedActions.leaveFormation = true;
            if (this.isAllowedToBreakFormation(unit)) allowedActions.breakFormation = true;
            if (this.isAllowedToMerge(unit)) allowedActions.mergeUnit = true;
            if (!unit.isTired() && !unit.isExhausted()) allowedActions.noAction = true;
            return true;
        }
        return false;
    }

    _processDefendingWingBelongingUnit(unit, allowedActions) {
        if (!unit.troopNature || unit.hasReceivedOrder()) return false;
        if (unit.wing.orderInstruction === CBOrderInstruction.DEFEND) {
            if (this.doesUnitEngage(unit)) {
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                if (this.isAllowedToShockAttack(unit)) allowedActions.shockAttack = true;
                if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
                return true;
            }
            else {
                if (this.isAllowedToMove(unit)) {
                    allowedActions.moveForward = true;
                    allowedActions.moveMode = CBMoveMode.DEFEND;
                }
                if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
                if (this.isAllowedToRout(unit)) allowedActions.escape = true;
                if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
                if (this.isAllowedToReplenishMunitions(unit)) allowedActions.reload = true;
                if (!unit.isTired() && !unit.isExhausted()) allowedActions.noAction = true;
                return true;
            }
        }
        return false;
    }

    _processAttackingWingBelongingUnit(unit, allowedActions) {
        if (!unit.troopNature || unit.hasReceivedOrder()) return false;
        if (unit.wing.orderInstruction === CBOrderInstruction.ATTACK) {
            if (this.doesUnitEngage(unit)) {
                if (this.isAllowedToShockAttack(unit)) allowedActions.shockAttack = true;
                if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
                return true;
            }
            else {
                if (this.isAllowedToFireAttack(unit)) {
                    allowedActions.fireAttack = true;
                    if (this.isAllowedToMove(unit)) {
                        allowedActions.moveForward = true;
                        allowedActions.moveMode = CBMoveMode.FIRE;
                    }
                    return true;
                }
                else if (this.isAllowedToMove(unit)) {
                    allowedActions.moveForward = true;
                    allowedActions.moveMode = CBMoveMode.ATTACK;
                    return true;
                }
            }
        }
        return false;
    }

    _processUnitWithAnOrder(unit, allowedActions) {
        if (!unit.troopNature || !unit.hasReceivedOrder()) return false;
        if (this.doesUnitEngage(unit)) {
            if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
            if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            if (this.isAllowedToShockAttack(unit)) allowedActions.shockAttack = true;
            if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
        }
        else {
            if (this.isAllowedToMove(unit)) {
                allowedActions.moveForward = true;
                allowedActions.moveMode = CBMoveMode.NO_CONSTRAINT;
            }
            if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
            if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
            if (this.isAllowedToRest(unit)) allowedActions.rest = true;
            if (this.isAllowedToReplenishMunitions(unit)) allowedActions.reload = true;
            if (this.isAllowedToReorganize(unit)) allowedActions.reorganize = true;
            if (this.isAllowedToRally(unit)) allowedActions.rally = true;
            if (this.isAllowedToCreateFormation(unit)) allowedActions.createFormation = true;
            if (this.isAllowedToIncludeTroops(unit)) allowedActions.joinFormation = true;
            if (this.isAllowedToReleaseTroops(unit)) allowedActions.leaveFormation = true;
            if (this.isAllowedToBreakFormation(unit)) allowedActions.breakFormation = true;
            if (this.isAllowedToMerge(unit)) allowedActions.mergeUnit = true;
            if (!unit.isTired() && !unit.isExhausted()) allowedActions.noAction = true;
        }
        return true;
    }

    _processCharacter(unit, allowedActions) {
        if (!unit.characterNature) return false;
        if (this.doesUnitEngage(unit) && this.isCharacterAloneInHex(unit)) {
            if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
            if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            if (this.isAllowedToShockAttack(unit)) allowedActions.shockAttack = true;
            if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
        }
        else {
            if (this.isAllowedToMove(unit)) {
                allowedActions.moveForward = true;
                allowedActions.moveMode = CBMoveMode.NO_CONSTRAINT;
            }
            if (this.isAllowedToMoveBack(unit)) allowedActions.moveBack = true;
            if (this.isAllowedToRout(unit)) allowedActions.escape = true;
            if (this.isAllowedToFireAttack(unit)) allowedActions.fireAttack = true;
            if (this.isAllowedToShockDuel(unit)) allowedActions.shockDuel = true;
            if (this.isAllowedToFireDuel(unit)) allowedActions.fireDuel = true;
            if (this.isAllowedToRest(unit)) allowedActions.rest = true;
            if (this.isAllowedToReplenishMunitions(unit)) allowedActions.reload = true;
            if (this.isAllowedToReorganize(unit)) allowedActions.reorganize = true;
            if (this.isAllowedToRally(unit)) allowedActions.rally = true;
            if (unit.hasReceivedOrder()) {
                if (this.isAllowedToTakeCommand(unit)) allowedActions.takeCommand = true;
                if (this.isAllowedToDismissCommand(unit)) allowedActions.leaveCommand = true;
                if (this.isAllowedToChangeOrderInstruction(unit)) allowedActions.changeOrders = true;
            }
            if (this.isAllowedToGiveOrders(unit)) allowedActions.giveSpecificOrders = true;
            if (this.isAllowedToChoseSpell(unit)) allowedActions.prepareSpell = true;
            if (this.isAllowedToCastSpell(unit)) allowedActions.castSpell = true;
            if (!unit.isTired() && !unit.isExhausted()) allowedActions.noAction = true;
        }
        return true;
    }
}

CBArbitrator.extendedBy = function(clazz) {
    Object.getOwnPropertyNames( clazz.prototype ).forEach(methodName => {
        if (methodName !== "constructor") {
            CBArbitrator.prototype[methodName] = clazz.prototype[methodName];
        }
    })
}
CBArbitrator.extendedBy(CBMapTeacher);
CBArbitrator.extendedBy(CBUnitManagementTeacher);
CBArbitrator.extendedBy(CBMovementTeacher);
CBArbitrator.extendedBy(CBCombatTeacher);
CBArbitrator.extendedBy(CBRecoveringTeacher);
CBArbitrator.extendedBy(CBCommandTeacher);
CBArbitrator.extendedBy(CBWizardryTeacher);
CBArbitrator.extendedBy(CBMiscellaneousTeacher);

