'use strict'

export class CBMiscellaneousTeacher {

    isAllowedToPerformMiscellaneousActions(unit) {
        return true;
    }

    getAllowedMiscellaneousActions(unit) {
        return {
            setFire: true,
            extinguishFire: true,
            setStakes: true,
            removeStakes: true
        };
    }

    processSetFireResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processExtinguishFireResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processSetStakesResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processRemoveStakesResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

}