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
} from "../../jslib/cblades/playable.js";
import {
    CBMap
} from "../../jslib/cblades/map.js";
import {
    CBMapEditActuator,
    registerEditor, unregisterEditor
} from "../../jslib/cblades/editor.js";
import {
    clickOnTrigger, mouseMoveOnTrigger,
    paint, repaint, zoomAndRotate0, zoomAndRotate240
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

    function showMouseOverHexTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/actuators/ground/${type}.png, -30, -30, 60, 60)`,
            "restore()"
        ]
    }

    function showHexTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/actuators/ground/${type}.png, -30, -30, 60, 60)`,
            "restore()"
        ]
    }

    function showHexHeightTrigger(height, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/level-${height}.png, -35, -35, 70, 70)`,
            "restore()"
        ]
    }

    function showHexSideTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/${type}.png, -23, -10, 46, 20)`,
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
            let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            loadAllImages();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            CBGame.editMap(game);
            let mapEditActuator = getMapEditorActuator(game);
            let hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            mouseMoveOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assert(getDirectives(actuatorsLayer).length).equalsTo(258);
            assert(getDirectives(actuatorsLayer, 0, 6)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-clear", zoomAndRotate0(230.4497, 63.2148))
            );
            assert(getDirectives(actuatorsLayer, 6, 12)).arrayEqualsTo(
                showHexHeightTrigger(0, zoomAndRotate0(269.5503, 63.2148))
            );
            assert(getDirectives(actuatorsLayer, 258-6, 258)).arrayEqualsTo(
                showHexSideTypeTrigger("normal", zoomAndRotate240(458.3333, 135.3831))
            );
    });

    it("Checks edit a hex type", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            CBGame.editMap(game);
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
        when:
            filterPainting(hexTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-rough", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-difficult", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-clear-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-rough-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("water", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("lava", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("impassable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-clear", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-rough", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-clear-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-rough-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-clear", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
    });

    it("Checks edit a hex side type", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            CBGame.editMap(game);
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            var hexSideTrigger = mapEditActuator.getHexSideTypeTrigger(map.getHex(4, 5).toward(240));
        when:
            filterPainting(hexSideTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
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

    it("Checks edit a hex side height", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            CBGame.editMap(game);
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            var hexHeightTrigger = mapEditActuator.getHexHeightTrigger(map.getHex(4, 5));
        when:
            filterPainting(hexHeightTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-1", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-2", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-3", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-4", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-5", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-5", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-4", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-5", zoomAndRotate0(352.8837, 111.327))
            );
    });

    /*
        it("Checks edit push menu button", () => {
        try {
            given:
                var cbgameEdit = CBAbstractGame.editMap;
                var editMode = false;
                CBAbstractGame.editMap = function() {
                    editMode = !editMode;
                }
                var game = new CBGame();
                var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
                game.setMap(map);
                game.setMenu();
                game.start();
                var [commandsLayer] = getLayers(game.board, "widget-commands");
                loadAllImages();
                game._showCommand.action();
                executeAllAnimations();
            when:
                game._editMapCommand.action();
                executeAllAnimations();
                resetDirectives(commandsLayer);
                repaint(game);
            then:
                assert(editMode).isTrue();
                assertClearDirectives(commandsLayer);
                assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
                assertDirectives(commandsLayer, showGameCommand("hide", 880, 740));
                assertDirectives(commandsLayer, showGameCommand("undo", 820, 740));
                assertDirectives(commandsLayer, showGameCommand("redo", 760, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 700, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 640, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 580, 740));
                assertDirectives(commandsLayer, showGameCommand("field", 520, 740));
                assertDirectives(commandsLayer, showGameCommand("insert2", 460, 740));
                assertDirectives(commandsLayer, showGameCommand("full-screen-on", 400, 740));
                assertNoMoreDirectives(commandsLayer);
            when:
                editMode = false;
                game._editMapCommand.action();
                executeAllAnimations();
                resetDirectives(commandsLayer);
                repaint(game);
            then:
                assert(editMode).isFalse();
                assertClearDirectives(commandsLayer);
                assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
                assertDirectives(commandsLayer, showGameCommand("hide", 880, 740));
                assertDirectives(commandsLayer, showGameCommand("undo", 820, 740));
                assertDirectives(commandsLayer, showGameCommand("redo", 760, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 700, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 640, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 580, 740));
                assertDirectives(commandsLayer, showGameCommand("editor", 520, 740));
                assertDirectives(commandsLayer, showGameCommand("insert2", 460, 740));
                assertDirectives(commandsLayer, showGameCommand("full-screen-on", 400, 740));
                assertNoMoreDirectives(commandsLayer);
        } finally {
            CBAbstractGame.editMap = cbgameEdit;
        }
    });
     */
});