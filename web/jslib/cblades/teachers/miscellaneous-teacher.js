'use strict'

import {
    CBWeather, CBFog
} from "../game.js";
import {
    sumAngle
} from "../../geometry.js";

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

    processPlayWeatherResult(game, diceResult) {
        let weather = game.weather;
        let swipe = 0;
        switch (weather) {
            case CBWeather.HOT:
                if (diceResult[0]+diceResult[1]<=2) swipe = 1;
                break;
            case CBWeather.CLEAR:
            case CBWeather.CLOUDY:
            case CBWeather.OVERCAST:
                if (diceResult[0]+diceResult[1]<=2) swipe = -1;
                else if (diceResult[0]+diceResult[1]>=12) swipe = 1;
                break;
            case CBWeather.RAIN:
                if (diceResult[0]+diceResult[1]<=3) swipe = -1;
                else if (diceResult[0]+diceResult[1]===12) swipe = 1;
                break;
            case CBWeather.STORM:
                if (diceResult[0]+diceResult[1]<=2) swipe = -1;
                break;
        }
        return { swipe, weather: weather+swipe };
    }

    processPlayFogResult(game, diceResult) {
        let fog = game.fog;
        let swipe = 0;
        switch (fog) {
            case CBFog.MIST:
                if (diceResult[0]+diceResult[1]<=3) swipe = 1;
                break;
            case CBFog.DENSE_MIST:
            case CBFog.FOG:
                if (diceResult[0]+diceResult[1]<=3) swipe = 1;
                if (diceResult[0]+diceResult[1]>=12) swipe = -1;
                break;
            case CBFog.DENSE_FOG:
                if (diceResult[0]+diceResult[1]>=12) swipe = -1;
                break;
        }
        return { swipe, fog: fog+swipe };
    }

    processPlayWindDirectionResult(game, diceResult) {
        let swipe = 0;
        if (diceResult[0]===1) swipe = -1;
        if (diceResult[0]===6) swipe = 1;
        return { swipe, windDirection: sumAngle(game.windDirection, swipe*60) };
    }

    processPlayTirednessResult(game, wing, diceResult) {
        let swipe = 0;
        if (diceResult[0]+diceResult[1]===2) swipe = -1;
        return { swipe, tiredness: wing.tiredness+swipe };
    }

    processPlayMoralResult(game, wing, diceResult) {
        let swipe = 0;
        if (diceResult[0]+diceResult[1]===2) swipe = -1;
        return { swipe, moral: wing.moral+swipe };
    }

}