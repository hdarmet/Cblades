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

    processSetFireResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processExtinguishFireResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processSetStakesResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processRemoveStakesResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    processPlayWeatherResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }
}