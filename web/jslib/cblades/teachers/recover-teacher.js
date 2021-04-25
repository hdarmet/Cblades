'use strict'

import {
    CBCohesion
} from "../unit.js";

export class CBRecoveringTeacher {

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
        if (!unit.isRouted()) return false;
        if (this.isUnitEngaged(unit)) return false;
        if (unit.hasReceivedOrder()) return true;
        if (unit.moralProfile.autoRally) return true;
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
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

    processRallyResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=unit.moral;
        return { success };
    }

}