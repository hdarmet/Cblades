'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    Point2D
} from "../../jslib/geometry.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../../jslib/draw.js";
import {
    filterPainting, assertClearDirectives, assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives, skipDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBBoard,
    CBMap
} from "../../jslib/cblades/map.js";
import {
    CBCharacter,
    CBFormation, CBOrderInstruction,
    CBTroop,
    CBWing
} from "../../jslib/cblades/unit.js";
import {
    CBMapEditorGame, CBScenarioEditorGame, CBEditorPlayer, CBEditUnitMenu, CBFormationPlacementActuator,
    CBMapEditActuator, CBUnitPlacementActuator, CBUnitsRoster
} from "../../jslib/cblades/editor.js";
import {
    clickOnTrigger,
    mouseMoveOnTrigger,
    showGameCommand,
    executeAllAnimations,
    paint,
    repaint,
    zoomAndRotate0,
    zoomAndRotate240,
    showPopup,
    showImage,
    showColoredRect,
    showInactivePopupCommand,
    showPopupCommand,
    clickOnArtifact,
    showTroop,
    zoomAndRotate90,
    mouseMoveOnArtifact,
    keydown,
    zoomAndRotate150,
    showFormation,
    zoomAndRotate210,
    clickOnPiece,
    showMenuItem,
    clickOnActionMenu,
    showSelectedTroop,
    showSelectedFormation, getArtifactPoint, mouseMoveOnPoint, showShadowedImage
} from "./interactive-tools.js";
import {
    GoblinLeader,
    GoblinWolfRider
} from "../../jslib/cblades/armies/orcs.js";
import {
    RoughneckLance
} from "../../jslib/cblades/armies/roughnecks.js";
import {
    requester
} from "../../jslib/request.js";

describe("Editor", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
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
            var game = new CBMapEditorGame();
            let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            loadAllImages();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            game.editMap();
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
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editMap();
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
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editMap();
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
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editMap();
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

    function buildMapEditorGame() {
        let BlueBanner0 = "./../images/units/blue/banners/banner0.png";
        let RedBanner0 = "./../images/units/red/banners/banner0.png";

        var game = new CBMapEditorGame();
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        game.start();
        return { game, map};
    }

    function buildScenarioEditorGame() {
        let BlueBanner0 = {
            name: "blue-banner",
            path: "./../images/units/blue/banners/banner0.png"
        };
        let RedBanner0 = {
            name: "red-banner",
            path: "./../images/units/red/banners/banner0.png"
        };

        var game = new CBScenarioEditorGame();
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let player1 = new CBEditorPlayer("player1", "./../players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, BlueBanner0);
        wing1.setRetreatZone(map.getSouthZone());
        let player2 = new CBEditorPlayer("player2", "./../players/player1.png");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, RedBanner0);
        wing2.setRetreatZone(map.getNorthZone());
        game.start();
        return { game, map, player1, player2, wing1, wing2 };
    }

    function showTroopButton(x, y, unit) {
        return [
            'save()',
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                'shadowColor = #000000', 'shadowBlur = 5',
                `drawImage(./../images/units/${unit}.png, -30, -30, 60, 60)`,
            'restore()',
        ];
    }

    function showFormationButton(x, y, unit) {
        return [
            'save()',
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            'shadowColor = #000000', 'shadowBlur = 5',
            `drawImage(./../images/units/${unit}.png, -60, -30, 120, 60)`,
            'restore()',
        ];
    }

    function getEditUnitPopup(game) {
        return game._popup && game._popup instanceof CBUnitsRoster ? game._popup : null;
    }

    it("Checks open units editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            repaint(game);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 330, "orcs/character2C", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 330, 36));

            assertDirectives(widgetsLayer, showTroopButton(375, 400, "orcs/unit1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 400, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 400, "orcs/unit2L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 400, 36));

            assertNoMoreDirectives(widgetsLayer);

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(500, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(570, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(640, 235, "orcs/unit1L"));
            assertNoMoreDirectives(itemsLayer);
    });

    it("Checks wing switching in editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._header._rightWing);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showInactivePopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/red/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
        when:
            clickOnArtifact(game, unitEditorPopup._header._leftWing);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
    });

    it("Checks change rosters in editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rightRoster);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "orcs/unit1L"));
        when:
            clickOnArtifact(game, unitEditorPopup._rosterContent._leftRoster);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "mercenaries/unit1L"));
        when:
            for (let index=0; index<2; index++) {
                clickOnArtifact(game, unitEditorPopup._rosterContent._rightRoster);
            }
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showInactivePopupCommand("right", 715, 235));
    });

    function skipEditorHeader(widgetsLayer) {
        skipDirectives(widgetsLayer, 4);
        assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
        assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
        assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
        assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
        assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
        assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
        assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));
    }

    it("Checks select rosters in editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);

            assertDirectives(widgetsLayer, showTroopButton(375, 330, "mercenaries/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 330, "mercenaries/character2L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 330, 36));

            assertDirectives(widgetsLayer, showTroopButton(375, 400, "mercenaries/unit1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 400, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 400, "mercenaries/unit2L1", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
    });

    function getUnitButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3];
    }

    function getPrevButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3+1];
    }

    function getNextButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3+2];
    }

    it("Checks change character/troop type steps", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getPrevButton(unitEditorPopup, 0));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1Lb", ));
            assertDirectives(widgetsLayer, showInactivePopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 465, 330, 36));
        when:
            clickOnArtifact(game, getNextButton(unitEditorPopup, 0));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
    });

    it("Checks that unit steps are memorized", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getPrevButton(unitEditorPopup, 0));
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[0]);
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1Lb", ));
            assertDirectives(widgetsLayer, showInactivePopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 465, 330, 36));
    });

    it("Checks change formation type steps", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            skipDirectives(widgetsLayer, (6+6+6)*3);
            assertDirectives(widgetsLayer, showFormationButton(625, 400, "mercenaries/unit2L2b", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
        when:
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            skipDirectives(widgetsLayer, (6+6+6)*3);
            assertDirectives(widgetsLayer, showFormationButton(625, 400, "mercenaries/unit2L2", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
    });

    function getTroopPlacementActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBUnitPlacementActuator) return actuator;
        }
        return null;
    }

    function showTroopTrigger([a, b, c, d, e, f]) {
        return [
            'save()',
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                'shadowColor = #FF0000', 'shadowBlur = 10',
                'drawImage(./../images/actuators/unit-t.png, -50, -100, 100, 200)',
            'restore()',
        ];
    }

    function getFormationPlacementActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFormationPlacementActuator) return actuator;
        }
        return null;
    }

    function showFormationTrigger([a, b, c, d, e, f]) {
        return [
            'save()',
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            'shadowColor = #FF0000', 'shadowBlur = 10',
            'drawImage(./../images/actuators/unit-f.png, -100, -100, 200, 200)',
            'restore()',
        ];
    }

    it("Checks unit placement", () => {
        given:
            var { game, map } = buildScenarioEditorGame();
            var [actuatorsLayer, widgetsLayer, units0Layer] = getLayers(game.board, "actuators", "widgets", "units-0");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getUnitButton(unitEditorPopup, 2));
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
        when:
            var troopPlacementActuator = getTroopPlacementActuator(game);
            var hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 5));
            mouseMoveOnPoint(game, getArtifactPoint(hexTrigger));
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate90(333.3333, 111.327)));
        when:
            clickOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
        when:
            hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 6));
            mouseMoveOnArtifact(game, hexTrigger, 0, -10);
            clickOnTrigger(game, hexTrigger, 10, 0);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate0(333.3333, 207.5513)));
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate0(333.3333, 207.5513)));
        when:
            keydown(game, 'Escape');
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertNoMoreDirectives(actuatorsLayer);

    });

    it("Checks formation placement", () => {
        given:
            var { game, map } = buildScenarioEditorGame();
            var [actuatorsLayer, widgetsLayer, formations0Layer] = getLayers(game.board, "actuators", "widgets", "formations-0");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            clickOnArtifact(game, getUnitButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
        when:
            var formationPlacementActuator = getFormationPlacementActuator(game);
            var hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 5).toward(60));
            mouseMoveOnPoint(game, getArtifactPoint(hexSideTrigger));
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate150(375, 87.2709)));
        when:
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate150(375, 87.2709)));
        when:
            hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 6).toward(120));
            mouseMoveOnArtifact(game, hexSideTrigger, 0, 10);
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate210(375, 231.6074)));
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate150(375, 87.2709)));
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate210(375, 231.6074)));
        when:
            keydown(game, 'Escape');
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertNoMoreDirectives(actuatorsLayer);
    });

    function showUnitMenuPopup(x, y) {
        return [
            'save()',
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                'shadowColor = #000000', 'shadowBlur = 10',
                'strokeStyle = #000000', 'lineWidth = 1',
                'strokeRect(-125, -125, 250, 250)',
                'fillStyle = #FFFFFF',
                'fillRect(-125, -125, 250, 250)',
            'restore()'
        ];
    }

    it("Checks unit menu", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showUnitMenuPopup(301.6667, 130));
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);

            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
    });

    it("Checks unit menu item: tired", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 0);
            repaint(game);
        then:
            assert(unit1.isTired()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/cancel-tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 0);
        then:
            assert(unit1.isTired()).isFalse();
    });

    it("Checks unit menu item: exhausted", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 0);
            repaint(game);
        then:
            assert(unit1.isExhausted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/cancel-exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 0);
        then:
            assert(unit1.isExhausted()).isFalse();
    });

    it("Checks unit menu item: disrupted", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 0);
            repaint(game);
        then:
            assert(unit1.isDisrupted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/cancel-disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 0);
        then:
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks unit menu item: routed", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 0);
            repaint(game);
        then:
            assert(unit1.isRouted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/cancel-routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 0);
        then:
            assert(unit1.isRouted()).isFalse();
    });

    it("Checks unit menu item: scarce ammunitions", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 1);
            repaint(game);
        then:
            assert(unit1.areMunitionsScarce()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/cancel-scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 1);
        then:
            assert(unit1.areMunitionsScarce()).isFalse();
    });

    it("Checks unit menu item: no ammunition", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 1);
            repaint(game);
        then:
            assert(unit1.areMunitionsExhausted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/cancel-no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 1);
        then:
            assert(unit1.areMunitionsExhausted()).isFalse();
    });

    it("Checks unit menu item: contact", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 1);
            repaint(game);
        then:
            assert(unit1.isEngaging()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/cancel-contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 1);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    it("Checks unit menu item: charge", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 1);
            repaint(game);
        then:
            assert(unit1.isCharging()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/cancel-charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 1);
        then:
            assert(unit1.isCharging()).isFalse();
    });

    it("Checks unit menu item: order given", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 2);
            repaint(game);
        then:
            assert(unit1.hasReceivedOrder()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/cancel-order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 2);
        then:
            assert(unit1.hasReceivedOrder()).isFalse();
    });

    it("Checks unit menu item: played", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 2);
            repaint(game);
        then:
            assert(unit1.isPlayed()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/cancel-played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 2);
        then:
            assert(unit1.isPlayed()).isFalse();
    });

    it("Checks unit menu item: move troop", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, units0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            var troopPlacementActuator = getTroopPlacementActuator(game);
            var hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 5));
            mouseMoveOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate90(333.3333, 111.327)));
        when:
            clickOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showSelectedTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
    });

    it("Checks unit menu item: move formation", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, formations0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "formations-0");
            let formation1 = new CBFormation(RoughneckLance, wing1);
            formation1.addToMap(map.getHex(5, 6).toward(0));
        when:
            clickOnPiece(game, formation1);
            clickOnActionMenu(game, 2, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            var formationPlacementActuator = getFormationPlacementActuator(game);
            var hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 5).toward(60));
            mouseMoveOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate150(375, 87.2709)));
        when:
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showSelectedFormation("mercenaries/unit2L4", zoomAndRotate150(375, 87.2709)));
    });

    it("Checks unit menu item: delete", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, units0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
            skipDirectives(units0Layer, 4);
            assertNoMoreDirectives(units0Layer);
    });

    it("Checks unit menu item: attack order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/cancel-attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: defend order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/cancel-defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: regroup order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/cancel-regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: retreat order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.RETREAT);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/cancel-retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks delete unit using keyboard", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            unit1.select();
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("orcs/unit1L", zoomAndRotate0(416.6667, 159.4391)));
            assertNoMoreDirectives(unitsLayer);
        when:
            keydown(game, 'Delete');
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertNoMoreDirectives(unitsLayer);
    });

    it("Checks edit push menu button", () => {
        given:
            var editMode = false;
            var { game } = buildScenarioEditorGame();
            game.editUnits = function() {
                editMode = !editMode;
            }
            game.setMenu();
            var [commandsLayer] = getLayers(game.board, "widget-commands");
            loadAllImages();
            game._showCommand.action();
            executeAllAnimations();
        when:
            game._editUnitsCommand.action();
            executeAllAnimations();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            assert(editMode).isTrue();
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("set-map", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks edit map button", () => {
        given:
            var { game } = buildMapEditorGame();
            game.setMenu();
            loadAllImages();
            game._showCommand.action();
            game._editMapCommand.action();
            executeAllAnimations();
        when:
            clickOnArtifact(game, game._editMapCommand.artifacts[0]);
            executeAllAnimations();
        then:
            assert(getMapEditorActuator(game)).isDefined();
            assert(getEditUnitPopup(game)).isNotDefined();
    });

    it("Checks edit units button", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.setMenu();
            loadAllImages();
            game._showCommand.action();
            game._editUnitsCommand.action();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            executeAllAnimations();
        when:
            clickOnArtifact(game, game._editUnitsCommand.artifacts[0]);
            executeAllAnimations();
        then:
            assert(getEditUnitPopup(game)).isNotDefined();
    });

    it("Checks global push menu button for Map Editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLayer] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._showCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 520, 740));
        when:
            game._hideCommand.action();
        repaint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks global push menu button for Scenario Editor", () => {
        given:
            var game = new CBScenarioEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLayer] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._showCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("set-map", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
        when:
            game._hideCommand.action();
            repaint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks undo/redo push menu button on map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
    });

    it("Checks full screen push menu button on map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            game.fitWindow();
            var [mapLayer, commandsLayer] = getLayers(game.board,"map", "widget-commands");
            loadAllImages();
        when:
            game._showCommand.action();
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 2000, 1500)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 1000, 750)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 2000, 1500);
            assertDirectives(commandsLayer, showGameCommand("hide", 1940, 1440));
            assertDirectives(commandsLayer, showGameCommand("undo", 1880, 1440));
            assertDirectives(commandsLayer, showGameCommand("redo", 1820, 1440));
            assertDirectives(commandsLayer, showGameCommand("settings", 1760, 1440));
            assertDirectives(commandsLayer, showGameCommand("save", 1700, 1440));
            assertDirectives(commandsLayer, showGameCommand("load", 1640, 1440));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 1580, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1520, 1440));
            assertNoMoreDirectives(commandsLayer);
        when:
            game._fullScreenCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 750, 500)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 1500, 1000);
            assertDirectives(commandsLayer, showGameCommand("hide", 1440, 940));
            assertDirectives(commandsLayer, showGameCommand("undo", 1380, 940));
            assertDirectives(commandsLayer, showGameCommand("redo", 1320, 940));
            assertDirectives(commandsLayer, showGameCommand("settings", 1260, 940));
            assertDirectives(commandsLayer, showGameCommand("save", 1200, 940));
            assertDirectives(commandsLayer, showGameCommand("load", 1140, 940));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 1080, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 1020, 940));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks undo/redo push menu button on Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame("Scenario");
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
    });

    it("Checks full screen push menu button on Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame("Scenario");
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            game.fitWindow();
            var [mapLayer, commandsLayer] = getLayers(game.board,"map", "widget-commands");
            loadAllImages();
        when:
            game._showCommand.action();
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 2000, 1500)",
                "restore()",
                "save()",
                "setTransform(0.9775, 0, 0, 0.9775, 1000, 750)",
                "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 2000, 1500);
            assertDirectives(commandsLayer, showGameCommand("hide", 1940, 1440));
            assertDirectives(commandsLayer, showGameCommand("undo", 1880, 1440));
            assertDirectives(commandsLayer, showGameCommand("redo", 1820, 1440));
            assertDirectives(commandsLayer, showGameCommand("settings", 1760, 1440));
            assertDirectives(commandsLayer, showGameCommand("save", 1700, 1440));
            assertDirectives(commandsLayer, showGameCommand("load", 1640, 1440));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 1580, 1440));
            assertDirectives(commandsLayer, showGameCommand("set-map", 1520, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1460, 1440));
            assertNoMoreDirectives(commandsLayer);
        when:
            game._fullScreenCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                "setTransform(0.9775, 0, 0, 0.9775, 750, 500)",
                "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 1500, 1000);
            assertDirectives(commandsLayer, showGameCommand("hide", 1440, 940));
            assertDirectives(commandsLayer, showGameCommand("undo", 1380, 940));
            assertDirectives(commandsLayer, showGameCommand("redo", 1320, 940));
            assertDirectives(commandsLayer, showGameCommand("settings", 1260, 940));
            assertDirectives(commandsLayer, showGameCommand("save", 1200, 940));
            assertDirectives(commandsLayer, showGameCommand("load", 1140, 940));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 1080, 940));
            assertDirectives(commandsLayer, showGameCommand("set-map", 1020, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 960, 940));
            assertNoMoreDirectives(commandsLayer);
    });

    function getUnitMenuPopup(game) {
        return game._popup && game._popup instanceof CBEditUnitMenu ? game._popup : null;
    }

    it("Checks edit units button", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
        then:
            assert(getUnitMenuPopup(game)).isDefined()
        when:
            game.board.zoomIn(new Point2D(0, 0));
        then:
            assert(getUnitMenuPopup(game)).isNotDefined();
    });

    it("Checks connect/save/load from the Map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var board = new CBBoard("board", "./../images/maps/map.png", "./../images/maps/map1-icon.png");
            game.setMap(board);
            game.setMenu();
            game.start();
        when:
            game._showCommand.action();
            game._settingsCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/ping-login");
        when:
            game._saveCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/create");
        when:
            game._loadCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/by-name/board");
    });

    it("Checks connect/save/load from the Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame("Scenario");
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
        when:
            game._showCommand.action();
            game._settingsCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/ping-login");
        when:
            game._saveCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/create");
        when:
            game._loadCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/by-name/Scenario");
    });

});