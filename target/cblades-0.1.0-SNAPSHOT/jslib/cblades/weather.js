'use strict'

import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    CBAbstractGame
} from "./game.js";

export let CBWeather = {
    HOT : 0,
    CLEAR : 1,
    CLOUDY : 2,
    OVERCAST : 3,
    RAIN : 4,
    STORM : 5
}

export let CBFog = {
    NO_FOG: 0,
    MIST : 1,
    DENSE_MIST : 2,
    FOG : 3,
    DENSE_FOG : 4
}

export function getWeatherCode(weather) {
    if (weather===CBWeather.HOT) return "H";
    else if (weather===CBWeather.CLEAR) return "C";
    else if (weather===CBWeather.CLOUDY) return "N";
    else if (weather===CBWeather.OVERCAST) return "O";
    else if (weather===CBWeather.RAIN) return "R";
    else return "S";
}

export function getWeather(code) {
    switch (code) {
        case "H": return CBWeather.HOT;
        case "C": return CBWeather.CLEAR;
        case "N": return CBWeather.CLOUDY;
        case "O": return CBWeather.OVERCAST;
        case "R": return CBWeather.RAIN;
        default: CBWeather.STORM;
    }
}

export function getFogCode(fog) {
    if (fog===CBFog.NO_FOG) return "NF";
    else if (fog===CBFog.MIST) return "M";
    else if (fog===CBFog.DENSE_MIST) return "DM";
    else if (fog===CBFog.FOG) return "F";
    else return "DF";
}

export function getFog(code) {
    switch (code) {
        case "NF": return CBFog.NO_FOG;
        case "M": return CBFog.MIST;
        case "DM": return CBFog.DENSE_MIST;
        case "F": return CBFog.FOG;
        default: CBFog.DENSE_FOG;
    }
}

export function WeatherMixin(gameClass) {

    return class extends gameClass {

        constructor(...args) {
            super(...args);
            this._weatherSettings = {
                _weather: CBWeather.CLEAR,
                _fog: CBFog.MIST,
                _windDirection: 0
            }
        }

        _memento() {
            let memento = super._memento();
            memento.weatherSettings = {
                _weather: this._weatherSettings._weather,
                _fog: this._weatherSettings._fog,
                _windDirection: this._weatherSettings._windDirection
            };
            return memento;
        }

        _revert(memento) {
            super._revert(memento),
            this._weatherSettings = memento.weatherSettings;
        }

        get weather() {
            return this._weatherSettings._weather;
        }

        set weather(weather) {
            this._weatherSettings._weather = weather;
        }

        changeWeather(weather) {
            Memento.register(this);
            this._weatherSettings._weather = weather;
            Mechanisms.fire(this, CBAbstractGame.SETTINGS_EVENT, {weather});
        }

        get fog() {
            return this._weatherSettings._fog;
        }

        set fog(fog) {
            this._weatherSettings._fog = fog;
        }

        changeFog(fog) {
            Memento.register(this);
            this._weatherSettings._fog = fog;
            Mechanisms.fire(this, CBAbstractGame.SETTINGS_EVENT, {fog});
        }

        get windDirection() {
            return this._weatherSettings._windDirection;
        }

        set windDirection(windDirection) {
            console.assert(windDirection%60===0);
            this._weatherSettings._windDirection = windDirection;
        }

        changeWindDirection(windDirection) {
            console.assert(windDirection%60===0);
            Memento.register(this);
            this._weatherSettings._windDirection = windDirection;
            Mechanisms.fire(this, CBAbstractGame.SETTINGS_EVENT, {windDirection});
        }

        toSpecs(context) {
            let gameSpecs = super.toSpecs(context);
            gameSpecs.windDirection = this.windDirection;
            gameSpecs.weather = getWeather(this.weather);
            gameSpecs.fog = getFog(this.fog);
            return gameSpecs;
        }

        fromSpecs(specs, context) {
            super.fromSpecs(specs, context)
            this.windDirection = specs.windDirection;
            this.weather = getWeatherCode(specs.weather);
            this.fog = getFogCode(specs.fog);
        }

    }

}
