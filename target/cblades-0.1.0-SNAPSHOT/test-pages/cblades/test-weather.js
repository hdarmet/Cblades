'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/board/draw.js";
import {
    mockPlatform
} from "../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/board/mechanisms.js";
import {
    CBFog,
    CBWeather,
    getWeatherCode, getWeather,
    getFogCode, getFog,
    WeatherMixin
} from "../../jslib/cblades/weather.js";
import {
    WAbstractGame
} from "../../jslib/wargame/game.js";
import {
    WMap
} from "../../jslib/wargame/map.js";
import {
    WGame
} from "../../jslib/wargame/playable.js";

describe("Weather", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks weather management on game", () => {
        when:
            var GameClass = WeatherMixin(WAbstractGame);
            var game = new GameClass("Test");
            var received = null;
            Mechanisms.addListener({
               _processGlobalEvent(source, event, value) {
                   if (event === WAbstractGame.SETTINGS_EVENT) {
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
            var GameClass = WeatherMixin(WAbstractGame);
            var game = new GameClass("Test");
            var received = null;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (event === WAbstractGame.SETTINGS_EVENT) {
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
            var GameClass = WeatherMixin(WAbstractGame);
            var game = new GameClass("Test");
            var received = null;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (event === WAbstractGame.SETTINGS_EVENT) {
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

    it("Checks weather specs reading and writing", () => {
        when:
            var GameClass = WeatherMixin(WGame);
            var game = new GameClass("Test");
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
        when:
            game.weather = CBWeather.RAIN;
            game.windDirection = 60;
            game.fog = CBFog.FOG;
        then:
            var context = new Map();
            assert(game.toSpecs(context)).objectEqualsTo({
                "windDirection":60,
                "weather":"R",
                "fog":"F"
            });
        when:
            var specs = {
                ...game.toSpecs(context),
                "windDirection":120,
                "weather":"O",
                "fog":"DM"
            }
            game.fromSpecs(specs, context);
        then:
            assert(game.toSpecs(context)).objectEqualsTo({
                "windDirection":120,
                "weather":"O",
                "fog":"DM"
            });
    });

    it("Checks Weather codification functions", () => {
        assert(getWeatherCode(CBWeather.HOT)).equalsTo("H");
        assert(getWeatherCode(CBWeather.CLEAR)).equalsTo("C");
        assert(getWeatherCode(CBWeather.CLOUDY)).equalsTo("N");
        assert(getWeatherCode(CBWeather.OVERCAST)).equalsTo("O");
        assert(getWeatherCode(CBWeather.RAIN)).equalsTo("R");
        assert(getWeatherCode(CBWeather.STORM)).equalsTo("S");
        assert(getWeather("H")).equalsTo(CBWeather.HOT);
        assert(getWeather("C")).equalsTo(CBWeather.CLEAR);
        assert(getWeather("N")).equalsTo(CBWeather.CLOUDY);
        assert(getWeather("O")).equalsTo(CBWeather.OVERCAST);
        assert(getWeather("R")).equalsTo(CBWeather.RAIN);
        assert(getWeather("S")).equalsTo(CBWeather.STORM);
        assert(getFogCode(CBFog.NO_FOG)).equalsTo("NF");
        assert(getFogCode(CBFog.MIST)).equalsTo("M");
        assert(getFogCode(CBFog.DENSE_MIST)).equalsTo("DM");
        assert(getFogCode(CBFog.FOG)).equalsTo("F");
        assert(getFogCode(CBFog.DENSE_FOG)).equalsTo("DF");
        assert(getFog("NF")).equalsTo(CBFog.NO_FOG);
        assert(getFog("M")).equalsTo(CBFog.MIST);
        assert(getFog("DM")).equalsTo(CBFog.DENSE_MIST);
        assert(getFog("F")).equalsTo(CBFog.FOG);
        assert(getFog("DF")).equalsTo(CBFog.DENSE_FOG);
    });

 });