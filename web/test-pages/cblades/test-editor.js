'use strict'

import {
    assert, before, after, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    filterPainting,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives, skipDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame
} from "../../jslib/cblades/game.js";
import {
    CBMap
} from "../../jslib/cblades/map.js";
import {
    CBMapEditActuator,
    registerEditor, unregisterEditor
} from "../../jslib/cblades/editor.js";
import {
    clickOnTrigger,
    paint, zoomAndRotate0, zoomAndRotate240
} from "./interactive-tools.js";

describe("Editor", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
        registerEditor();
    });

    after(() => {
        unregisterEditor();
    });

    function showHexTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(/CBlades/images/actuators/terran/${type}.png, -30, -30, 60, 60)`,
            "restore()"
        ]
    }

    function showHexSideTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(/CBlades/images/actuators/terran/${type}.png, -23, -10, 46, 20)`,
            "restore()"
        ]
    }

    function getMapEditorActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBMapEditActuator) return actuator;
        }
        return null;
    }

    function getTriggerDirectives(layer) {
        return [
            "save()",
            ...getDirectives(layer),
            "restore()"
        ];
    }

    it("Checks switch to map editor mode", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            loadAllImages();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            resetDirectives(actuatorsLayer);
            CBGame.edit(game);
            paint(game);
            loadAllImages();
        then:
            skipDirectives(actuatorsLayer, 4);
            assert(getDirectives(actuatorsLayer).length).equalsTo(2622);
            assert(getDirectives(actuatorsLayer, 0, 6)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-clear", zoomAndRotate0(0, 15.1026))
            );
            assert(getDirectives(actuatorsLayer, 2622-6, 2622)).arrayEqualsTo(
                showHexSideTypeTrigger("normal", zoomAndRotate240(958.3333, 808.9534))
            );
    });

    it("Checks edit a hex type", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            CBGame.edit(game);
            paint(game);
            loadAllImages();
            let mapEditActuator = getMapEditorActuator(game);
            let hexTrigger = mapEditActuator.getTrigger(map.getHex(4, 5));
        when:
            filterPainting(hexTrigger);
            stopRegister(actuatorsLayer);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-rough", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-difficult", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-clear-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-rough-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-difficult-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("water", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("lava", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("impassable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-clear", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-rough", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-difficult", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-clear-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-rough-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-clear", zoomAndRotate0(333.3333, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(333.3333, 111.327))
            );
    });

    it("Checks edit a hex side type", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            CBGame.edit(game);
            paint(game);
            loadAllImages();
            let mapEditActuator = getMapEditorActuator(game);
            let hexSideTrigger = mapEditActuator.getTrigger(map.getHex(4, 5).toward(240));
        when:
            filterPainting(hexSideTrigger);
            stopRegister(actuatorsLayer);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("easy", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("difficult", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("climb", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("wall", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("normal", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("wall", zoomAndRotate240(291.6667, 135.3831))
            );
    });

});