'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    getDirectives,
    getLayers, loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    createTinyGame
} from "./game-examples.js";
import {
    CBBurningCounter,
    CBFireCounter,
    CBFogCounter, CBSmokeCounter,
    CBStakesCounter,
    CBWeatherCounter,
    CBWindDirectionCounter,
    CBWingMoralCounter,
    CBWingTirednessCounter
} from "../../jslib/cblades/miscellaneous.js";
import {
    dummyEvent,
    paint, repaint
} from "./interactive-tools.js";
import {
    CBFog,
    CBWeather
} from "../../jslib/cblades/weather.js";
import {
    CBAction
} from "../../jslib/cblades/game.js";

describe("Miscellaneous", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
            var hexId = map.getHex(7,8);
        when:
            var fire = new CBFireCounter();
            fire.addToMap(hexId);
            repaint(game);
        then:
            assert(fire.isFire()).isFalse();
            assert(hexId.playables[0]).equalsTo(fire);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/start-fire.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            fire.setFire();
            repaint(game);
        then:
            assert(fire.isFire()).isTrue();
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/fire.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(fire.isFire()).isFalse();
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/start-fire.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks smoke counter", () => {
        given:
            var {game, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
            var hexId = map.getHex(7,8);
        when:
            var smoke = new CBSmokeCounter();
            smoke.addToMap(hexId);
            repaint(game);
        then:
            assert(smoke.isDense()).isFalse();
            assert(hexId.playables[0]).equalsTo(smoke);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/light-smoke.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            smoke.densify();
            repaint(game);
        then:
            assert(smoke.isDense()).isTrue();
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/heavy-smoke.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            smoke.disperse();
            repaint(game);
        then:
            assert(smoke.isDense()).isFalse();
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/light-smoke.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.undo();
        then:
            assert(smoke.isDense()).isTrue();
        when:
            Memento.undo();
        then:
            assert(smoke.isDense()).isFalse();
    });

    it("Checks playing burning counter", () => {
        given:
            var {game, player, map} = createTinyGame();
            var [groundMarkerLayer] = getLayers(game.board,"hmarkers-0");
        when:
            var burning1 = new CBFireCounter();
            var burning2 = new CBSmokeCounter();
            burning1.addToMap(map.getHex(7,8));
            burning1.launchAction(new CBAction(game, burning1));
            burning2.addToMap(map.getHex(8,8));
            player.playSmokeAndFire = function(burning, event) {
                Mechanisms.fire(burning, CBBurningCounter.PLAYED_EVENT);
                game.changeFirePlayed();
            }
            burning1.onMouseClick({});
            repaint(game);
        then:
            assert(burning1.isPlayed()).isFalse();
            assert(burning2.isPlayed()).isTrue();
            assert(getDirectives(groundMarkerLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 701.3685, 375.0733)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)',
                'restore()'
            ]);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(burning1.isPlayed()).isFalse();
            assert(burning2.isPlayed()).isFalse();
        when:
            Memento.redo();
            repaint(game);
        then:
            assert(burning1.isPlayed()).isFalse();
            assert(burning2.isPlayed()).isTrue();
        when:
            game.nextTurn();
            repaint(game);
        then:
            assert(burning1.isPlayed()).isFalse();
            assert(burning2.isPlayed()).isFalse();
            assert(getDirectives(groundMarkerLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks burning playing management on game level", () => {
        given:
            var {game} = createTinyGame();
        when:
            Memento.open();
            game.changeFirePlayed();
        then:
            assert(game.firePlayed).isTrue();
        when:
            Memento.undo();
        then:
            assert(game.firePlayed).isFalse();
        when:
            Memento.redo();
        then:
            assert(game.firePlayed).isTrue();
        when:
            game.nextTurn();
        then:
            assert(game.firePlayed).isFalse();
    });

    it("Checks burning counter cancellation (useful for game edition)", () => {
        given:
            var {game, player, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
        when:
            var burning1 = new CBFireCounter();
            burning1.addToMap(map.getHex(7,8));
            repaint(game);
        then:
            assert(Mechanisms.manager.listeners).contains(burning1);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/counters/start-fire.png, -71, -71, 142, 142)',
                'restore()'
            ]);
        when:
            burning1.cancel();
            repaint(game);
        then:
            assert(Mechanisms.manager.listeners).contains(burning1);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks stakes counter", () => {
        given:
            var {game, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
            var hexId = map.getHex(7,8);
        when:
            var fireStart = new CBStakesCounter();
            resetDirectives(groundLayer);
            fireStart.addToMap(hexId);
            paint(game);
            loadAllImages();
        then:
            assert(hexId.playables[0]).equalsTo(fireStart);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/stakes.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks memorize/revert displayable counter", () => {
        given:
            var {game, player} = createTinyGame();
            var [counterMarkersLayer] = getLayers(game.board,"counter-markers");
        when:
            var weather = new CBWeatherCounter();
            weather.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
            ]);
        when:
            player.playWeather= function(weather, event) {
                weather.setPlayed();
            }
            Memento.open();
            weather.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"]
            );
            assert(weather.isPlayed()).isTrue();
        when:
            Memento.undo();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
            assert(weather.isPlayed()).isFalse();
        when:
            Memento.redo();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"]
            );
            assert(weather.isPlayed()).isTrue();
    });

    it("Checks weather counter", () => {
        given:
            var {game, player} = createTinyGame();
            var [countersLayer, counterMarkersLayer] = getLayers(game.board,"counters", "counter-markers");
        when:
            var weather = new CBWeatherCounter();
            weather.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/meteo2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            player.playWeather= function(weather, event) {
                weather.setPlayed();
            }
            weather.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"]
            );
            assert(weather.isPlayed()).isTrue();
        when:
            game.changeWeather(CBWeather.STORM);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/meteo6.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks fog counter", () => {
        given:
            var {game, player} = createTinyGame();
            var [countersLayer, counterMarkersLayer] = getLayers(game.board,"counters", "counter-markers");
        when:
            var fog = new CBFogCounter();
            fog.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/fog1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            player.playFog= function(fog, event) {
                fog.setPlayed();
            }
            fog.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(fog.isPlayed()).isTrue();
        when:
            game.changeFog(CBFog.DENSE_FOG);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/fog3.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks wind direction counter", () => {
        given:
            var {game, player} = createTinyGame();
            var [countersLayer, counterMarkersLayer] = getLayers(game.board,"counters", "counter-markers");
        when:
            var windDirection = new CBWindDirectionCounter();
            windDirection.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/wind-direction.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            player.playWindDirection= function(windDirection, event) {
                windDirection.setPlayed();
            }
            windDirection.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(windDirection.isPlayed()).isTrue();
        when:
            game.changeWindDirection(180);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/wind-direction.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks apperance/desapperance of a wing counter", () => {
        given:
            var {game, unit, wing} = createTinyGame();
            var [countersLayer] = getLayers(game.board,"counters");
        when:
            var wingMoral = new CBWingMoralCounter(wing);
            wingMoral.registerOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([]);
        when:
            unit.select();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/moral11.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
        when:
            unit.unselect();
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks wing moral counter", () => {
        given:
            var {game, wing, player} = createTinyGame();
            var [countersLayer, counterMarkersLayer] = getLayers(game.board,"counters", "counter-markers");
        when:
            var wingMoral = new CBWingMoralCounter(wing);
            var moralPlayer = false;
            wingMoral.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(wingMoral.isFinishable()).isTrue();
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/moral11.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
        when:
            player.playMoral = function(moral, event) {
                moralPlayer = true;
                moral.setPlayed();
            }
            wingMoral.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(wingMoral.isFinishable()).isTrue();
            assert(moralPlayer).isFalse();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(wingMoral.isPlayed()).isTrue();
        when:
            wing.changeMoral(10);
            repaint(game);
            loadAllImages();
        then:
            assert(wingMoral.isFinishable()).isTrue();
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/moral10.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            repaint(game);
            loadAllImages();
        then:
            assert(wingMoral.isFinishable()).isFalse();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
        when:
            wingMoral.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(wingMoral.isFinishable()).isTrue();
            assert(moralPlayer).isTrue();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(wingMoral.isPlayed()).isTrue();
    });

    it("Checks wing tiredness counter", () => {
        given:
            var {game, wing, player} = createTinyGame();
            var [countersLayer, counterMarkersLayer] = getLayers(game.board,"counters", "counter-markers");
        when:
            var wingTiredness = new CBWingTirednessCounter(wing);
            var tirednessPlayer = false;
            wingTiredness.setOnGame(game);
            repaint(game);
            loadAllImages();
        then:
            assert(wingTiredness.isFinishable()).isTrue();
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/counters/tiredness11.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
        when:
            player.playTiredness = function(tiredness, event) {
                tirednessPlayer = true;
                tiredness.setPlayed();
            }
            wingTiredness.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(wingTiredness.isFinishable()).isTrue();
            assert(tirednessPlayer).isFalse();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(wingTiredness.isPlayed()).isTrue();
        when:
            wing.changeTiredness(10);
            repaint(game);
            loadAllImages();
        then:
            assert(wingTiredness.isFinishable()).isTrue();
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/counters/tiredness10.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            repaint(game);
            loadAllImages();
        then:
            assert(wingTiredness.isFinishable()).isFalse();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([]);
        when:
            wingTiredness.play(dummyEvent);
            repaint(game);
            loadAllImages();
        then:
            assert(wingTiredness.isFinishable()).isTrue();
            assert(tirednessPlayer).isTrue();
            assert(getDirectives(counterMarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 95.7967, 26.393)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(wingTiredness.isPlayed()).isTrue();
    });

    it("Checks burning counter cancellation (useful for game edition)", () => {
        given:
            var {game, wing} = createTinyGame();
            var [countersLayer] = getLayers(game.board,"counters");
        when:
            var wingTiredness = new CBWingTirednessCounter(wing);
            wingTiredness.setOnGame(game);
            repaint(game);
        then:
            assert(Mechanisms.manager.listeners).contains(wingTiredness);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/counters/tiredness11.png, -71, -71, 142, 142)',
                'restore()',
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 81.1339, 61.0948)',
                    'drawImage(./../units/banner.png, -25, -60, 50, 120)',
                'restore()'
            ]);
        when:
            wingTiredness.cancel();
            repaint(game);
        then:
            assert(Mechanisms.manager.listeners).contains(wingTiredness);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([]);
    });

});