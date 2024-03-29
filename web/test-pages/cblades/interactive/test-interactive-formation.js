'use strict'

import {
    after,
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../../jslib/board/draw.js";
import {
    assertDirectives, assertNoMoreDirectives,
    getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../../jslib/board/mechanisms.js";
import {
    clickOnActionMenu,
    clickOnPiece,
    clickOnTrigger,
    paint,
    repaint,
    showFormation,
    showMarker, showMenuItem, showMenuPanel,
    showSelectedFormation, showSelectedTroop, showTroop, zoomAndRotate180,
    zoomAndRotate270,
    zoomAndRotate90
} from "../interactive-tools.js";
import {
    create2UnitsTinyGame,
    createTinyGame,
    createTinyFormationGame, create2UnitsAndAFormationTinyGame
} from "../game-examples.js";
import {
    CBCreateFormationActuator, CBReleaseTroopActuator
} from "../../../jslib/cblades/interactive/interactive-formation.js";
import {
    WHexSideId
} from "../../../jslib/wargame/map.js";
import {
    WStacking
} from "../../../jslib/wargame/game.js";
import {
    WSequence
} from "../../../jslib/wargame/sequences.js";
import {
    registerInteractiveFormation,
    unregisterInteractiveFormation
} from "../../../jslib/cblades/interactive/interactive-formation.js";

describe("Interactive Formation", ()=> {

    var appendElement = WSequence.appendElement;

    before(() => {
        registerInteractiveFormation();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
        WSequence.awaitedElements = [];
        WSequence.appendElement = function(game, element) {
            let awaited = WSequence.awaitedElements.pop();
            assert(element).equalsTo(awaited);
        }
    });

    after(() => {
        unregisterInteractiveFormation();
        WSequence.appendElement = appendElement;
    });

    function showQuitFullTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/quit-full.png, -32, -30, 64, 60)",
            "restore()"
        ];
    }

    function showQuitHalfTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/quit-half.png, -32, -30, 64, 60)",
            "restore()",
        ]
    }

    function showFormationTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/formation.png, -40, -85, 80, 170)",
            "restore()"
        ];
    }

    it("Checks that the unit menu contains menu items for formation management", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, itemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, itemsLayer);
            clickOnPiece(game, unit);
        then:
            loadAllImages();
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(4, 4, 301.6667, 236.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(2, 3, "icons/leave-formation", 4, 4, 301.6667, 236.8878));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "icons/dismiss-formation", 4, 4, 301.6667, 236.8878));
            assertDirectives(itemsLayer, showMenuItem(0, 3, "icons/create-formation", 4, 4, 301.6667, 236.8878));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "icons/join-formation", 4, 4, 301.6667, 236.8878));
    });

    function clickOnCreateFormationAction(game) {
        return clickOnActionMenu(game, 0, 3);
    }

    function getCreateFormationActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBCreateFormationActuator) return actuator;
        }
        return null;
    }

    it("Checks create formation action process", () => {
        given:
            var {game, map, leader, unit1, unit2} = create2UnitsTinyGame();
            unit1.angle = 90;
            unit2.angle = 90;
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(2);
            unit1.move(map.getHex(8, 8), 0);
            unit2.move(map.getHex(8, 7), 0);
            unit1.receivesOrder(true);
            unit2.receivesOrder(true);
            leader.move(null, 0);
            var [unitsLayer, formationsLayer, actuatorsLayer] = getLayers(game.board,"units-0", "formations-0", "actuators");
            clickOnPiece(game, unit1);
            clickOnCreateFormationAction(game);
            let createFormationActuator = getCreateFormationActuator(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1b", zoomAndRotate90(666.6667, 400)));
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate90(666.6667, 303.7757)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate180(666.6667, 351.8878)));
            assert(createFormationActuator.getTrigger(unit2.hexLocation)).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, actuatorsLayer);
            clickOnTrigger(game, createFormationActuator.getTrigger(unit2.hexLocation));
            loadAllImages();
            paint(game);
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showFormation("misc/formation31b", zoomAndRotate90(666.6667, 351.8878)));
            assertNoMoreDirectives(actuatorsLayer, 4);
            assertNoMoreDirectives(unitsLayer, 4);
    });

    function clickOnBreakFormationAction(game) {
        return clickOnActionMenu(game, 3, 3);
    }

    it("Checks break formation action process", () => {
        given:
            var {game, map, leader, formation} = createTinyFormationGame();
            formation.receivesOrder(true);
            loadAllImages();
            paint(game);
            var [unitsLayer, formationsLayer] = getLayers(game.board,"units-0", "formations-0");
            clickOnPiece(game, formation);
            clickOnBreakFormationAction(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, formationsLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate90(416.6667, 351.8878)));
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate90(416.6667, 255.6635)));
    });

    function clickOnReleaseTroopsAction(game) {
        return clickOnActionMenu(game, 2, 3);
    }

    function getReleaseTroopsActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBReleaseTroopActuator) return actuator;
        }
        return null;
    }

    it("Checks release troops from formation action process", () => {
        given:
            var {game, formation} = createTinyFormationGame();
            formation.receivesOrder(true);
            var [unitsLayer, formationsLayer, fmarkersLayer, actuatorsLayer] =
                getLayers(game.board,"units-0", "formations-0", "fmarkers-0", "actuators");
            clickOnPiece(game, formation);
            clickOnReleaseTroopsAction(game);
            loadAllImages();
        when:
            resetDirectives(formationsLayer, actuatorsLayer, fmarkersLayer);
            repaint(game);
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation11", zoomAndRotate90(416.6667, 303.7757)));
            skipDirectives(fmarkersLayer, 4);
            assertDirectives(fmarkersLayer, showMarker("ordergiven", zoomAndRotate90(451.3685, 373.1794)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate90(458.3333, 332.643)));
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate270(375, 332.643)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate90(458.3333, 361.5103)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate270(375, 361.5103)));
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate90(458.3333, 274.9084)));
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate270(375, 274.9084)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate90(458.3333, 246.0411)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate270(375, 246.0411)));
         when:
            var releaseTroopActuator = getReleaseTroopsActuator(game);
            var trigger = releaseTroopActuator.getTrigger(formation.hexLocation.fromHex, 2, WStacking.BOTTOM);
        then:
            assert(trigger).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, fmarkersLayer, actuatorsLayer);
            clickOnTrigger(game, trigger);
            loadAllImages();
            paint(game);
            var [units1Layer, formations1Layer, fmarkers1Layer] = getLayers(game.board,"units-1", "formations-1", "fmarkers-1");
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate90(416.6667, 351.8878)));
            assertNoMoreDirectives(formationsLayer, 4);
            assertNoMoreDirectives(fmarkersLayer, 4);
            assertDirectives(formations1Layer, showSelectedFormation("misc/formation21", zoomAndRotate90(421.5543, 298.8881)));
            assertDirectives(fmarkers1Layer, showMarker("ordergiven", zoomAndRotate90(461.1437, 363.4042)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate90(458.3333, 274.9084)));
            assertDirectives(actuatorsLayer, showQuitHalfTrigger(zoomAndRotate270(375, 274.9084)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate90(458.3333, 246.0411)));
            assertDirectives(actuatorsLayer, showQuitFullTrigger(zoomAndRotate270(375, 246.0411)));
        when:
            releaseTroopActuator = getReleaseTroopsActuator(game);
            trigger = releaseTroopActuator.getTrigger(formation.hexLocation.toHex, 1, WStacking.TOP);
        then:
            assert(trigger).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, fmarkersLayer, units1Layer, formations1Layer, fmarkers1Layer, actuatorsLayer);
            clickOnTrigger(game, trigger);
            loadAllImages();
            paint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate90(416.6667, 351.8878)));
            assertNoMoreDirectives(formationsLayer, 4);
            assertNoMoreDirectives(fmarkersLayer, 4);
            skipDirectives(formations1Layer, 4);
            assertDirectives(formations1Layer, showSelectedFormation("misc/formation21b", zoomAndRotate90(421.5543, 298.8881)));
            skipDirectives(fmarkers1Layer, 4);
            assertDirectives(fmarkers1Layer, showMarker("actiondone", zoomAndRotate90(461.1437, 363.4042)));
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    function clickOnIncludeTroopsAction(game) {
        return clickOnActionMenu(game, 1, 3);
    }

    it("Checks include troops action process", () => {
        given:
            var {game, map, leader, unit1, unit2, formation} = create2UnitsAndAFormationTinyGame();
            unit1.angle = 90;
            unit2.angle = 90;
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(2);
            unit1.receivesOrder(true);
            unit2.receivesOrder(true);
            leader.move(null, 0);
            formation.angle = 90;
            formation.fixRemainingLossSteps(4);
            unit1.move(map.getHex(8, 8), 0);
            formation.move(new WHexSideId(unit1.hexLocation, unit2.hexLocation), 0);
            unit2.move(map.getHex(8, 7), 0);
            formation.receivesOrder(true);
            clickOnPiece(game, formation);
        when:
            var [unitsLayer, formationsLayer] = getLayers(game.board,"units-0", "formations-0");
            resetDirectives(unitsLayer, formationsLayer);
            clickOnIncludeTroopsAction(game);
            paint(game);
        then:
            assertNoMoreDirectives(unitsLayer, 4);
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation11b", zoomAndRotate90(666.6667, 351.8878)));
    });
});