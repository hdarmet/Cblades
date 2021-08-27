'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBFog,
    CBWeather, WeatherMixin
} from "../../jslib/cblades/weather.js";
import {
    CBAbstractGame
} from "../../jslib/cblades/game.js";

describe("Weather", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks weather management on game", () => {
        when:
            var GameClass = WeatherMixin(CBAbstractGame);
            var game = new GameClass();
            var received = null;
            Mechanisms.addListener({
               _processGlobalEvent(source, event, value) {
                   if (event === CBAbstractGame.SETTINGS_EVENT) {
                       received = value.weather;
                   }
               }
            });
        then:
            assert(game.weather).equalsTo(CBWeather.CLEAR);
        when:
            game.weather = CBWeather.RAIN;
        then:
            assert(game.weather).equalsTo(CBWeather.RAIN);
        when:
            Memento.open();
            game.changeWeather(CBWeather.OVERCAST);
        then:
            assert(game.weather).equalsTo(CBWeather.OVERCAST);
            assert(received).equalsTo(CBWeather.OVERCAST);
        when:
            Memento.undo();
        then:
            assert(game.weather).equalsTo(CBWeather.RAIN);
    });

    it("Checks fog management on game", () => {
        when:
            var GameClass = WeatherMixin(CBAbstractGame);
            var game = new GameClass();
            var received = null;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (event === CBAbstractGame.SETTINGS_EVENT) {
                        received = value.fog;
                    }
                }
            });
        then:
            assert(game.fog).equalsTo(CBFog.MIST);
        when:
            game.fog = CBFog.FOG;
        then:
            assert(game.fog).equalsTo(CBFog.FOG);
        when:
            Memento.open();
            game.changeFog(CBFog.DENSE_MIST);
        then:
            assert(game.fog).equalsTo(CBFog.DENSE_MIST);
            assert(received).equalsTo(CBFog.DENSE_MIST);
        when:
            Memento.undo();
        then:
            assert(game.fog).equalsTo(CBFog.FOG);
    });

    it("Checks wind direction management on game", () => {
        when:
            var GameClass = WeatherMixin(CBAbstractGame);
            var game = new GameClass();
            var received = null;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (event === CBAbstractGame.SETTINGS_EVENT) {
                        received = value.windDirection;
                    }
                }
            });
        then:
            assert(game.windDirection).equalsTo(0);
        when:
            game.windDirection = 60;
        then:
            assert(game.windDirection).equalsTo(60);
        when:
            Memento.open();
            game.changeWindDirection(120);
        then:
            assert(game.windDirection).equalsTo(120);
            assert(received).equalsTo(120);
        when:
            Memento.undo();
        then:
            assert(game.windDirection).equalsTo(60);
    });

 });