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

