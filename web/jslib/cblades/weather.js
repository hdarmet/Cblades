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
            this._weatherSettings._windDirection = windDirection;
        }

        changeWindDirection(windDirection) {
            Memento.register(this);
            this._weatherSettings._windDirection = windDirection;
            Mechanisms.fire(this, CBAbstractGame.SETTINGS_EVENT, {windDirection});
        }

    }

}
