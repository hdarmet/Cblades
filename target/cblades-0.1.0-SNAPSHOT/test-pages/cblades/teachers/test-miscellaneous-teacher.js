'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    WMap
} from "../../../jslib/wargame/map.js";
import {
    WGame
} from "../../../jslib/wargame/playable.js";
import {
    CBUnitPlayer,
    CBCharacter,
    CBCommandProfile,
    CBMoralProfile,
    CBMoveProfile,
    CBTroop,
    CBWeaponProfile,
    CBWing, CBTroopType
} from "../../../jslib/cblades/unit.js";
import {
    CBMapTeacher
} from "../../../jslib/cblades/teachers/map-teacher.js";
import {
    setDrawPlatform
} from "../../../jslib/board/draw.js";
import {
    mergeClasses,
    mockPlatform
} from "../../board/mocks.js";
import {
    CBUnitManagementTeacher
} from "../../../jslib/cblades/teachers/units-teacher.js";
import {
    CBMiscellaneousTeacher
} from "../../../jslib/cblades/teachers/miscellaneous-teacher.js";
import {
    CBWeather, CBFog
} from "../../../jslib/cblades/weather.js";
import {
    banner, banner1, banner2
} from "../game-examples.js";

describe("Miscellaneous teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBMiscellaneousTeacher);

    class CBTestUnitType extends CBTroopType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new CBWeaponProfile());
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
            }
        }
    }

    function createBasicGame() {
        let game = new WGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        game.start();
        return {game, arbitrator, map};
    }

    function createTinyGame() {
        let game = new WGame(1);
        var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player);
        let wing = new CBWing(player, banner);
        let unitType = new CBTestUnitType("unit", ["./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"])
        let unit = new CBTroop(game, unitType, wing);
        game.start();
        return {game, arbitrator, map, player, wing, unit};
    }

    function create2Players4UnitsTinyGame() {
        let game = new WGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, banner1);
        let player2 = new CBUnitPlayer("player2", "/players/player2.png");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, banner2);
        var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(game, unitType1, wing1);
        unit11.addToMap(map.getHex(5, 8));
        let unit12 = new CBTroop(game, unitType1, wing1);
        unit12.addToMap(map.getHex(5, 7));
        let leaderType1 = new CBTestUnitType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(game, leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(game, unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(game, unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(game, leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
        game.start();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    it("Checks if a unit is allowed to do a miscellaneous action", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToPerformMiscellaneousActions(unit11)).isTrue();
    });

    it("Checks misceallaneous actions acceptance", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.getAllowedMiscellaneousActions(unit11);
        then:
            assert(result).objectEqualsTo({
                setFire: true,
                extinguishFire: true,
                setStakes: true,
                removeStakes: true
            });
    });

    it("Checks set fire success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processSetFireResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processSetFireResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks extinguish fire success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processExtinguishFireResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processExtinguishFireResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks set stakes success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processSetStakesResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processSetStakesResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks remove stakes success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processRemoveStakesResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processRemoveStakesResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks weather swiping", () => {
        given:
            var {arbitrator, game} = createBasicGame();
        when:
            game.weather = CBWeather.HOT;
            var result2 = arbitrator.processPlayWeatherResult(game, [1, 1]);
            var result3 = arbitrator.processPlayWeatherResult(game, [1, 2]);
            var result7 = arbitrator.processPlayWeatherResult(game, [3, 4]);
            var result12 = arbitrator.processPlayWeatherResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({weather:CBWeather.HOT, swipe:0});
            assert(result3).objectEqualsTo({weather:CBWeather.HOT, swipe:0});
            assert(result7).objectEqualsTo({weather:CBWeather.HOT, swipe:0});
            assert(result12).objectEqualsTo({weather:CBWeather.CLEAR, swipe:1});
        when:
            game.weather = CBWeather.CLEAR;
            result2 = arbitrator.processPlayWeatherResult(game, [1, 1]);
            result3 = arbitrator.processPlayWeatherResult(game, [1, 2]);
            result7 = arbitrator.processPlayWeatherResult(game, [3, 4]);
            result12 = arbitrator.processPlayWeatherResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({weather:CBWeather.HOT, swipe:-1});
            assert(result3).objectEqualsTo({weather:CBWeather.CLEAR, swipe:0});
            assert(result7).objectEqualsTo({weather:CBWeather.CLEAR, swipe:0});
            assert(result12).objectEqualsTo({weather:CBWeather.CLOUDY, swipe:1});
        when:
            game.weather = CBWeather.RAIN;
            result2 = arbitrator.processPlayWeatherResult(game, [1, 1]);
            result3 = arbitrator.processPlayWeatherResult(game, [1, 2]);
            result7 = arbitrator.processPlayWeatherResult(game, [3, 4]);
            result12 = arbitrator.processPlayWeatherResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({weather:CBWeather.OVERCAST, swipe:-1});
            assert(result3).objectEqualsTo({weather:CBWeather.OVERCAST, swipe:-1});
            assert(result7).objectEqualsTo({weather:CBWeather.RAIN, swipe:0});
            assert(result12).objectEqualsTo({weather:CBWeather.STORM, swipe:1});
        when:
            game.weather = CBWeather.STORM;
            result2 = arbitrator.processPlayWeatherResult(game, [1, 1]);
            result3 = arbitrator.processPlayWeatherResult(game, [1, 2]);
            result7 = arbitrator.processPlayWeatherResult(game, [3, 4]);
            result12 = arbitrator.processPlayWeatherResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({weather:CBWeather.RAIN, swipe:-1});
            assert(result3).objectEqualsTo({weather:CBWeather.STORM, swipe:0});
            assert(result7).objectEqualsTo({weather:CBWeather.STORM, swipe:0});
            assert(result12).objectEqualsTo({weather:CBWeather.STORM, swipe:0});
    });

    it("Checks fog swiping", () => {
        given:
            var {arbitrator, game} = createBasicGame();
        when:
            game.fog = CBFog.MIST;
            var result2 = arbitrator.processPlayFogResult(game, [1, 1]);
            var result3 = arbitrator.processPlayFogResult(game, [1, 2]);
            var result7 = arbitrator.processPlayFogResult(game, [3, 4]);
            var result12 = arbitrator.processPlayFogResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({fog:CBFog.MIST, swipe:0});
            assert(result3).objectEqualsTo({fog:CBFog.MIST, swipe:0});
            assert(result7).objectEqualsTo({fog:CBFog.MIST, swipe:0});
            assert(result12).objectEqualsTo({fog:CBFog.DENSE_MIST, swipe:1});
        when:
            game.fog = CBFog.DENSE_MIST;
            result2 = arbitrator.processPlayFogResult(game, [1, 1]);
            result3 = arbitrator.processPlayFogResult(game, [1, 2]);
            result7 = arbitrator.processPlayFogResult(game, [3, 4]);
            result12 = arbitrator.processPlayFogResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({fog:CBFog.MIST, swipe:-1});
            assert(result3).objectEqualsTo({fog:CBFog.MIST, swipe:-1});
            assert(result7).objectEqualsTo({fog:CBFog.DENSE_MIST, swipe:0});
            assert(result12).objectEqualsTo({fog:CBFog.FOG, swipe:1});
        when:
            game.fog = CBFog.FOG;
            result2 = arbitrator.processPlayFogResult(game, [1, 1]);
            result3 = arbitrator.processPlayFogResult(game, [1, 2]);
            result7 = arbitrator.processPlayFogResult(game, [3, 4]);
            result12 = arbitrator.processPlayFogResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({fog:CBFog.DENSE_MIST, swipe:-1});
            assert(result3).objectEqualsTo({fog:CBFog.DENSE_MIST, swipe:-1});
            assert(result7).objectEqualsTo({fog:CBFog.FOG, swipe:0});
            assert(result12).objectEqualsTo({fog:CBFog.DENSE_FOG, swipe:1});
        when:
            game.fog = CBFog.DENSE_FOG;
            result2 = arbitrator.processPlayFogResult(game, [1, 1]);
            result3 = arbitrator.processPlayFogResult(game, [1, 2]);
            result7 = arbitrator.processPlayFogResult(game, [3, 4]);
            result12 = arbitrator.processPlayFogResult(game, [6, 6]);
        then:
            assert(result2).objectEqualsTo({fog:CBFog.FOG, swipe:-1});
            assert(result3).objectEqualsTo({fog:CBFog.FOG, swipe:-1});
            assert(result7).objectEqualsTo({fog:CBFog.DENSE_FOG, swipe:0});
            assert(result12).objectEqualsTo({fog:CBFog.DENSE_FOG, swipe:0});
    });

    it("Checks wind direction swiping", () => {
        given:
            var {arbitrator, game} = createBasicGame();
        when:
            game.windDirection = 180;
            var result1 = arbitrator.processPlayWindDirectionResult(game, [1]);
            var result3 = arbitrator.processPlayWindDirectionResult(game, [3]);
            var result6 = arbitrator.processPlayWindDirectionResult(game, [6]);
        then:
            assert(result1).objectEqualsTo({windDirection: 120, swipe: -1});
            assert(result3).objectEqualsTo({windDirection: 180, swipe: 0});
            assert(result6).objectEqualsTo({windDirection: 240, swipe: 1});
    });

    it("Checks tiredness swiping", () => {
        given:
            var {arbitrator, wing} = createTinyGame();
        when:
            wing.setTiredness(10);
            var result2 = arbitrator.processPlayTirednessResult(wing, [1, 1]);
            var result3 = arbitrator.processPlayTirednessResult(wing, [1, 2]);
        then:
            assert(result2).objectEqualsTo({tiredness: 11, swipe: -1});
            assert(result3).objectEqualsTo({tiredness: 10, swipe: 0});
    });

    it("Checks moral swiping", () => {
        given:
            var {arbitrator, wing} = createTinyGame();
        when:
            wing.setMoral(10);
            var result2 = arbitrator.processPlayMoralResult(wing, [1, 1]);
            var result3 = arbitrator.processPlayMoralResult(wing, [1, 2]);
        then:
            assert(result2).objectEqualsTo({moral: 11, swipe: -1});
            assert(result3).objectEqualsTo({moral: 10, swipe: 0});
    });

    it("Checks play fire allowance", () => {
        given:
            var {arbitrator, wing} = createTinyGame();
        when:
            wing.setMoral(10);
            var result2 = arbitrator.processPlayFireResult(wing, [3]);
            var result3 = arbitrator.processPlayFireResult(wing, [6]);
        then:
            assert(result2).objectEqualsTo({playFire: false});
            assert(result3).objectEqualsTo({playFire: true});
    });
});