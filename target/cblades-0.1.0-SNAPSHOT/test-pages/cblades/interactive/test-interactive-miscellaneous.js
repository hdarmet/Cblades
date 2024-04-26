'use strict'

import {
    after,
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../../../jslib/board/draw.js";
import {
    assertClearDirectives,
    assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../../jslib/board/mechanisms.js";
import {
    repaint,
    clickOnActionMenu,
    clickOnPiece,
    showTroop,
    zoomAndRotate0,
    showCharacter,
    showMask,
    showMenuPanel,
    showMenuItem,
    clickOnMask,
    clickOnMap,
    showInsert,
    showDice,
    clickOnArtifact,
    showIndicator,
    rollFor,
    clickOnDice,
    executeAllAnimations,
    showFailureResult,
    showPlayedDice,
    clickOnResult,
    showSuccessResult,
    showPopupCommand,
    showSwipeUpResult,
    clickOnSwipe,
    showSwipeDownResult,
    showNoSwipeResult,
    showDie,
    showPlayedDie,
    showOrientedIndicator, showBanneredIndicator, rollFor1Die, clickOnTrigger, getDice,
} from "../interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame
} from "../game-examples.js";
import {
    CBPlayFireActuator
} from "../../../jslib/cblades/interactive/interactive-miscellaneous.js";
import {
    PlayableMixin
} from "../../../jslib/wargame/game.js";
import {
    CBFireCounter,
    CBFogCounter, CBSmokeCounter,
    CBStakesCounter,
    CBWeatherCounter,
    CBWindDirectionCounter,
    CBWingMoralCounter,
    CBWingTirednessCounter
} from "../../../jslib/cblades/miscellaneous.js";
import {
    CBWeather, CBFog
} from "../../../jslib/cblades/weather.js";
import {
    WSequence
} from "../../../jslib/wargame/sequences.js";
import {
    registerInteractiveMiscellaneous,
    unregisterInteractiveMiscellaneous
} from "../../../jslib/cblades/interactive/interactive-miscellaneous.js";

describe("Interactive Miscellaneous", ()=> {

    var appendElement = WSequence.appendElement;

    before(() => {
        registerInteractiveMiscellaneous();
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
        unregisterInteractiveMiscellaneous();
        WSequence.appendElement = appendElement;
    });

    function showPlayIsFireTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                'drawImage(./../images/actuators/isburning.png, -64, -64, 128, 128)',
            "restore()",
        ];
    }

    function showPlayFireTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                'drawImage(./../images/actuators/burn.png, -71, -71, 142, 142)',
            "restore()",
        ];
    }

    function showPlayNoFireTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                'drawImage(./../images/actuators/nofire.png, -71, -71, 142, 142)',
            "restore()",
        ];
    }

    function pickFireTrigger(...triggerTypes) {
        let values = [];
        for (let type of triggerTypes) {
            if (type === 'fire')
                values.push(0.1);
            else
                values.push(0.8);
        }
        getDrawPlatform().resetRandoms(...values);
    }

    it("Checks that the unit menu contains menu items for miscellaneous actions", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnPiece(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 301.6667, 190)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -185, 250, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -185, 250, 370)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(./../images/icons/do-fusion.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(./../images/icons/do-many.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function clickOnMergeUnitsAction(game) {
        return clickOnActionMenu(game, 2, 5);
    }

    it("Checks merge units action process", () => {
        given:
            var {game, map, unit1, unit2} = create2UnitsTinyGame();
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(1);
            unit1.move(map.getHex(8, 8), 0);
            unit2.move(map.getHex(8, 8), 0);
            unit1.receivesOrder(true);
            unit2.receivesOrder(true);
            repaint(game); // units1 layer is created here !
            var [unitsLayer, units1Layer, markersLayer] = getLayers(game.board,"units-0", "units-1", "markers-0");
            clickOnPiece(game, unit1);
            clickOnMergeUnitsAction(game);
        when:
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showCharacter("misc/leader1", zoomAndRotate0(500, 496.2243)));
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate0(666.6667, 400)));
            assert(getDirectives(units1Layer, 4)).arrayEqualsTo([
            ]);
            assert(unit1.hexLocation).isNotDefined();
            assert(unit2.hexLocation).isNotDefined();
    });

    function clickOnMiscellaneousAction(game) {
        return clickOnActionMenu(game, 3, 5);
    }

    it("Checks chose miscellaneous actions and then forget it", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            repaint(game);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, unit1);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMiscellaneousAction(game);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(2, 2, 586.6667, 320));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "actions/start-fire", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "actions/extinguish-fire", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "actions/set-stakes", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "actions/remove-stakes", 2, 2, 586.6667, 320));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMap(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
    });

    function getMiscActionMenu(game, col, row) {
        return game.popup.getItem(col, row);
    }

    function clickOnSetFireMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 0, 0));
    }

    it("Checks set fire misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnSetFireMiscAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("misc-actions", 329, 390, 444, 641));
            assertDirectives(widgetsLayer, showInsert("set-fire", 773, 197.5, 444, 385));
            assertDirectives(widgetsLayer, showIndicator("meteo2", 602, 610));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 631, 430));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit1.setPlayed()).isFalse();
    });

    it("Checks failed set fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnSetFireMiscAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(551, 390));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 631, 430));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBFireCounter)).isNotDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    it("Checks failed set fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnSetFireMiscAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(551, 390));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 631, 430));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBFireCounter)).isDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    function clickOnExtinguishFireMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 1, 0));
    }

    it("Checks extinguish fire misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireCounter(game);
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnExtinguishFireMiscAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("misc-actions", 329, 402, 444, 641));
            assertDirectives(widgetsLayer, showInsert("extinguish-fire", 773, 203.5, 444, 397));
            assertDirectives(widgetsLayer, showIndicator("meteo2", 602, 622));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 631, 442));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit1.setPlayed()).isFalse();
    });

    it("Checks failed extinguish fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireCounter(game);
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnExtinguishFireMiscAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(551, 402));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 631, 442));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBFireCounter)).isDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    it("Checks failed extinguish fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireCounter(game);
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnExtinguishFireMiscAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(551, 402));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 631, 442));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBFireCounter)).isNotDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    function clickOnSetStakesMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 0, 1));
    }

    it("Checks set stakes misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnSetStakesMiscAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("misc-actions", 329, 350, 444, 641));
            assertDirectives(widgetsLayer, showInsert("set-stakes", 773, 183, 444, 334));
            //assertDirectives(widgetsLayer, showIndicator("meteo2", 602, 610));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 631, 390));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit1.setPlayed()).isFalse();
    });

    it("Checks failed set stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnSetStakesMiscAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(551, 350));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 631, 390));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBStakesCounter)).isNotDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    it("Checks failed set stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnSetStakesMiscAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(551, 350));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 631, 390));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBStakesCounter)).isDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    function clickOnRemoveStakesMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 1, 1));
    }

    it("Checks remove stakes misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakesCounter();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnRemoveStakesMiscAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("misc-actions", 329, 350, 444, 641));
            assertDirectives(widgetsLayer, showInsert("remove-stakes", 773, 197, 444, 306));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 631, 390));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit1.setPlayed()).isFalse();
    });

    it("Checks failed remove stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakesCounter();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnRemoveStakesMiscAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(551, 350));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 631, 390));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBStakesCounter)).isDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    it("Checks successful remove stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakesCounter();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, unit1);
            clickOnMiscellaneousAction(game);
            clickOnRemoveStakesMiscAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(551, 350));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 631, 390));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(PlayableMixin.getOneByType(unit1.hexLocation, CBStakesCounter)).isNotDefined();
            assert(unit1.isPlayed()).isTrue();
    });

    it("Checks weather action opening and cancelling", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            var counter = new CBWeatherCounter();
            counter.setOnGame(game);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("meteo", 227, 305, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 227, 570));
            assertDirectives(widgetsLayer, showIndicator("meteo2", 500, 405));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 539, 175));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks weather action process that swipes up", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWeatherCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.weather).equalsTo(CBWeather.CLEAR);
        when:
            rollFor(1, 1);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeUpResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 1, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.weather).equalsTo(CBWeather.HOT);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks weather action process that does not swipe", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWeatherCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.weather).equalsTo(CBWeather.CLEAR);
        when:
            rollFor(3, 4);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showNoSwipeResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(3, 4, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.weather).equalsTo(1);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks weather action process that swipes down", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWeatherCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.weather).equalsTo(CBWeather.CLEAR);
        when:
            rollFor(6, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeDownResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(6, 6, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.weather).equalsTo(CBWeather.CLOUDY);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action opening and cancelling", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            var counter = new CBFogCounter();
            counter.setOnGame(game);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("fog", 227, 305, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 227, 570));
            assertDirectives(widgetsLayer, showIndicator("fog1", 500, 405));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 539, 175));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks fog action process that swipes up", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            game.fog = CBFog.DENSE_MIST;
            var counter = new CBFogCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.fog).equalsTo(CBFog.DENSE_MIST);
        when:
            rollFor(1, 1);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeUpResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 1, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.fog).equalsTo(CBFog.MIST);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action process that it does not swipes", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            game.fog = CBFog.DENSE_MIST;
            var counter = new CBFogCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.fog).equalsTo(CBFog.DENSE_MIST);
        when:
            rollFor(3, 4);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showNoSwipeResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(3, 4, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.fog).equalsTo(CBFog.DENSE_MIST);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action process that swipes up", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            game.fog = CBFog.DENSE_MIST;
            var counter = new CBFogCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.fog).equalsTo(CBFog.DENSE_MIST);
        when:
            rollFor(6, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeDownResult(449, 305));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(6, 6, 539, 175));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.fog).equalsTo(CBFog.FOG);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action opening and cancelling", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            var counter = new CBWindDirectionCounter();
            counter.setOnGame(game);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wind-direction", 227, 93.5, 444, 177));
            assertDirectives(widgetsLayer, showIndicator("wind-direction", 500, 218.5));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDie(1, 509, 93.5));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks fog action process when it swipes up", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWindDirectionCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.windDirection).equalsTo(0);
        when:
            rollFor1Die(1);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wind-direction", 227, 93.5, 444, 177));
            assertDirectives(widgetsLayer, showOrientedIndicator("wind-direction", [0.5, -0.866, 0.866, 0.5, 500, 218.5]));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeUpResult(449, 143.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(1, 509, 93.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.windDirection).equalsTo(300);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action process when it does not swipe", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWindDirectionCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.windDirection).equalsTo(0);
        when:
            rollFor1Die(3);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wind-direction", 227, 93.5, 444, 177));
            assertDirectives(widgetsLayer, showOrientedIndicator("wind-direction", [1, 0, 0, 1, 500, 218.5]));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showNoSwipeResult(449, 143.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(3, 509, 93.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.windDirection).equalsTo(0);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fog action process when it swipes down", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBWindDirectionCounter();
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(game.windDirection).equalsTo(0);
        when:
            rollFor1Die(6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wind-direction", 227, 93.5, 444, 177));
            assertDirectives(widgetsLayer, showOrientedIndicator("wind-direction", [0.5, 0.866, -0.866, 0.5, 500, 218.5]));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeDownResult(449, 143.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(6, 509, 93.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.windDirection).equalsTo(60);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks tiredness action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.wing.setTiredness(10);
            var counter = new CBWingTirednessCounter(unit.wing);
            counter.setOnGame(game);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-rest", 227, 179.5, 444, 118));
            assertDirectives(widgetsLayer, showBanneredIndicator("tiredness10", "units/banner", 500, 279.5));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 539, 49.5));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks tiredness action process when it swipes", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            unit.wing.setTiredness(10);
            var counter = new CBWingTirednessCounter(unit.wing);
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(unit.wing.tiredness).equalsTo(10);
        when:
            rollFor(1, 1);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-rest", 227, 179.5, 444, 118));
            assertDirectives(widgetsLayer, showBanneredIndicator("tiredness11", "units/banner", 500, 279.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeUpResult(449, 179.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 1,539, 49.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.wing.tiredness).equalsTo(11);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks tiredness action process when it does not swipes", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            unit.wing.setTiredness(10);
            var counter = new CBWingTirednessCounter(unit.wing);
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(unit.wing.tiredness).equalsTo(10);
        when:
            rollFor(3, 4);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-rest", 227, 179.5, 444, 118));
            assertDirectives(widgetsLayer, showBanneredIndicator("tiredness10", "units/banner", 500, 279.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showNoSwipeResult(449, 179.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(3, 4,539, 49.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.wing.tiredness).equalsTo(10);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks moral action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.wing.setMoral(10);
            var counter = new CBWingMoralCounter(unit.wing);
            counter.setOnGame(game);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-moral", 227, 179.5, 444, 119));
            assertDirectives(widgetsLayer, showBanneredIndicator("moral10", "units/banner", 500, 279.5));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 539, 49.5));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks moral action process when it swipes", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            unit.wing.setMoral(10);
            var counter = new CBWingMoralCounter(unit.wing);
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(unit.wing.moral).equalsTo(10);
        when:
            rollFor(1, 1);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-moral", 227, 179.5, 444, 119));
            assertDirectives(widgetsLayer, showBanneredIndicator("moral11", "units/banner", 500, 279.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSwipeUpResult(449, 179.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 1,539, 49.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.wing.moral).equalsTo(11);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks moral action process when it does not swipe", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            unit.wing.setMoral(10);
            var counter = new CBWingMoralCounter(unit.wing);
            counter.setOnGame(game);
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            assert(unit.wing.moral).equalsTo(10);
        when:
            rollFor(3, 4);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("wing-moral", 227, 179.5, 444, 119));
            assertDirectives(widgetsLayer, showBanneredIndicator("moral10", "units/banner", 500, 279.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showNoSwipeResult(449, 179.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(3, 4,539, 49.5));
        when:
            clickOnSwipe(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.wing.moral).equalsTo(10);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fire and smoke action opening and cancelling", () => {
        given:
            var {game, map} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            var counter = new CBFireCounter(game);
            counter.addToMap(map.getHex(5, 5));
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("fire", 227, 374, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 227, 639));
            assertDirectives(widgetsLayer, showInsert("smoke", 651, 214.5, 444, 419));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDie(1, 479, 454));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(counter.setPlayed()).isFalse();
    });

    it("Checks fire and smoke action process when it fails", () => {
        given:
            var {game, map} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBFireCounter(game);
            counter.addToMap(map.getHex(5, 5));
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        when:
            rollFor1Die(1);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("fire", 227, 374, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 227, 639));
            assertDirectives(widgetsLayer, showInsert("smoke", 651, 214.5, 444, 419));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 424));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(1,479, 454));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(counter.isPlayed()).isTrue();
    });

    it("Checks fire and smoke action process when it successes", () => {
        given:
            var {game, map} = createTinyGame();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            var counter = new CBFireCounter(game);
            counter.addToMap(map.getHex(5, 5));
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnPiece(game, counter);
            loadAllImages();
        when:
            rollFor1Die(6);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("fire", 227, 374, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 227, 639));
            assertDirectives(widgetsLayer, showInsert("smoke", 651, 214.5, 444, 419));
            assertNoMoreDirectives(widgetsLayer, 4);
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 424));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(6,479, 454));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(counter.isPlayed()).isTrue();
    });

    function getPlayFireActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBPlayFireActuator) return actuator;
        }
        return null;
    }

    it("Checks fire and smoke action process when it successes", () => {
        given:
            var {game, map} = createTinyGame();
            game.windDirection = 0;
            var [actuatorLayer] = getLayers(game.board,"actuators");
            var fireStartCounter = new CBFireCounter(game);
            fireStartCounter.addToMap(map.getHex(5, 5));
            var fireCounterWithFireCounterInWindDirection = new CBFireCounter(game);
            fireCounterWithFireCounterInWindDirection.setFire();
            fireCounterWithFireCounterInWindDirection.addToMap(map.getHex(5, 6));
            var fireCounterWithNoFireCounterInWindDirection = new CBFireCounter(game);
            fireCounterWithNoFireCounterInWindDirection.setFire();
            fireCounterWithNoFireCounterInWindDirection.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireStartCounter);
            rollFor1Die(6);
            clickOnDice(game);
            let dice = getDice(game).element;
            let finalAction = dice._finalAction;
            dice.setFinalAction(()=>{
                pickFireTrigger('fire', 'noFire');
                finalAction && finalAction();
            })
            executeAllAnimations();
            clickOnResult(game);
            repaint(game);
        then:
            assertClearDirectives(actuatorLayer);
            assertDirectives(actuatorLayer, showPlayIsFireTrigger(zoomAndRotate0(416.6667, 63.2148)));
            assertDirectives(actuatorLayer, showPlayIsFireTrigger(zoomAndRotate0(500, 111.327)));
            assertNoMoreDirectives(actuatorLayer);
        when:
            var playFireActuator = getPlayFireActuator(game);
            var fireTrigger = playFireActuator.getTrigger(fireStartCounter);
            clickOnTrigger(game, fireTrigger);
            repaint(game);
        then:
            assertClearDirectives(actuatorLayer);
            assertDirectives(actuatorLayer, showPlayFireTrigger(zoomAndRotate0(416.6667, 63.2148)));
            assertDirectives(actuatorLayer, showPlayIsFireTrigger(zoomAndRotate0(500, 111.327)));
            assertNoMoreDirectives(actuatorLayer);
        when:
            playFireActuator = getPlayFireActuator(game);
            var noFireTrigger = playFireActuator.getTrigger(fireCounterWithNoFireCounterInWindDirection);
            clickOnTrigger(game, noFireTrigger);
            repaint(game);
        then:
            assertClearDirectives(actuatorLayer);
            assertDirectives(actuatorLayer, showPlayFireTrigger(zoomAndRotate0(416.6667, 63.2148)));
            assertDirectives(actuatorLayer, showPlayNoFireTrigger(zoomAndRotate0(500, 111.327)));
            assertNoMoreDirectives(actuatorLayer);
        when:
            playFireActuator = getPlayFireActuator(game);
            fireTrigger = playFireActuator.getTrigger(fireStartCounter);
            clickOnTrigger(game, fireTrigger);
            repaint(game);
        then:
            assertClearDirectives(actuatorLayer);
            assertDirectives(actuatorLayer, showPlayNoFireTrigger(zoomAndRotate0(500, 111.327)));
            assertNoMoreDirectives(actuatorLayer);
        when:
            playFireActuator = getPlayFireActuator(game);
            noFireTrigger = playFireActuator.getTrigger(fireCounterWithNoFireCounterInWindDirection);
            clickOnTrigger(game, noFireTrigger);
            repaint(game);
        then:
            assertClearDirectives(actuatorLayer);
            assertNoMoreDirectives(actuatorLayer);
    });

    it("Checks start fire creation in the wind direction of a fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            game.windDirection = 0;
            var fireCounter = new CBFireCounter(game);
            fireCounter.setFire();
            fireCounter.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireCounter);
            rollFor1Die(6);
            clickOnDice(game);
            let dice = getDice(game).element;
            let finalAction = dice._finalAction;
            dice.setFinalAction(()=>{
                pickFireTrigger('fire');
                finalAction && finalAction();
            })
            executeAllAnimations();
            clickOnResult(game);
            var playFireActuator = getPlayFireActuator(game);
            var fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
            playFireActuator = getPlayFireActuator(game);
            fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
        then:
            var startFireCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBFireCounter);
            assert(startFireCounter).isDefined();
            assert(startFireCounter.isFire()).isFalse();
            var denseSmokeCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBSmokeCounter);
            assert(denseSmokeCounter).isDefined();
            assert(denseSmokeCounter.isDense()).isTrue();
    });

    it("Checks no start fire creation in the wind direction of a fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            game.windDirection = 0;
            var fireCounter = new CBFireCounter(game);
            fireCounter.setFire();
            fireCounter.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireCounter);
            rollFor1Die(6);
            clickOnDice(game);
            let dice = getDice(game).element;
            let finalAction = dice._finalAction;
            dice.setFinalAction(()=>{
                pickFireTrigger('no-fire');
                finalAction && finalAction();
            })
            executeAllAnimations();
            clickOnResult(game);
            var playFireActuator = getPlayFireActuator(game);
            var fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
            playFireActuator = getPlayFireActuator(game);
            fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
        then:
            var startFireCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBFireCounter);
            assert(startFireCounter).isNotDefined();
            var denseSmokeCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBSmokeCounter);
            assert(denseSmokeCounter).isDefined();
            assert(denseSmokeCounter.isDense()).isTrue();
    });

    it("Checks when start fire counter become a fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            var fireCounter = new CBFireCounter(game);
            fireCounter.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireCounter);
            rollFor1Die(6);
            clickOnDice(game);
            let dice = getDice(game).element;
            let finalAction = dice._finalAction;
            dice.setFinalAction(()=>{
                pickFireTrigger('fire');
                finalAction && finalAction();
            })
            executeAllAnimations();
            clickOnResult(game);
            var playFireActuator = getPlayFireActuator(game);
            var fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
            playFireActuator = getPlayFireActuator(game);
            fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
        then:
            fireCounter = PlayableMixin.getOneByType(map.getHex(6, 6), CBFireCounter);
            assert(fireCounter).isDefined();
            assert(fireCounter.isFire()).isTrue();
            var smokeCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBSmokeCounter);
            assert(smokeCounter).isNotDefined();
    });

    it("Checks no start fire creation in the wind direction of a fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            var fireCounter = new CBFireCounter(game);
            fireCounter.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireCounter);
            rollFor1Die(6);
            clickOnDice(game);
            let dice = getDice(game).element;
            let finalAction = dice._finalAction;
            dice.setFinalAction(()=>{
                pickFireTrigger('no-fire');
                finalAction && finalAction();
            })
            executeAllAnimations();
            clickOnResult(game);
            var playFireActuator = getPlayFireActuator(game);
            var fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
            playFireActuator = getPlayFireActuator(game);
            fireTrigger = playFireActuator.getTrigger(fireCounter);
            clickOnTrigger(game, fireTrigger);
        then:
            fireCounter = PlayableMixin.getOneByType(map.getHex(6, 6), CBFireCounter);
            assert(fireCounter).isNotDefined();
            var smokeCounter = PlayableMixin.getOneByType(map.getHex(6, 5), CBSmokeCounter);
            assert(smokeCounter).isNotDefined();
    });

    it("Checks smoke processing", () => {
        given:
            var {game, map} = createTinyGame();
            game.windDirection = 0;
            var fireStartCounter = new CBFireCounter(game);
            fireStartCounter.addToMap(map.getHex(5, 5));
            var fireCounter = new CBFireCounter(game);
            fireCounter.setFire();
            fireCounter.addToMap(map.getHex(6, 5));
            var lightSmokeCounter = new CBSmokeCounter(game);
            lightSmokeCounter.addToMap(map.getHex(7, 5));
            var denseSmokeCounter = new CBSmokeCounter(game);
            denseSmokeCounter.densify();
            denseSmokeCounter.addToMap(map.getHex(8, 5));
            clickOnPiece(game, fireStartCounter);
            rollFor1Die(1);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        then:
            var smokeCounter = PlayableMixin.getOneByType(map.getHex(5, 4), CBSmokeCounter);
            assert(smokeCounter).isNotDefined();
            smokeCounter = PlayableMixin.getOneByType(map.getHex(6, 4), CBSmokeCounter);
            assert(smokeCounter).isDefined();
            assert(smokeCounter.isDense()).isTrue();
            smokeCounter = PlayableMixin.getOneByType(map.getHex(7, 4), CBSmokeCounter);
            assert(smokeCounter).isNotDefined();
            smokeCounter = PlayableMixin.getOneByType(map.getHex(8, 4), CBSmokeCounter);
            assert(smokeCounter).isDefined();
            assert(smokeCounter.isDense()).isFalse();
    });

    it("Checks that a smoke counter is replaced if necessary", () => {
        given:
            var {game, map} = createTinyGame();
            game.windDirection = 0;
            var fireCounter = new CBFireCounter(game);
            fireCounter.setFire();
            fireCounter.addToMap(map.getHex(6, 7));
            var denseSmokeCounter = new CBSmokeCounter(game);
            denseSmokeCounter.densify();
            denseSmokeCounter.addToMap(map.getHex(6, 6));
            clickOnPiece(game, fireCounter);
            rollFor1Die(1);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        then:
            var smokeCounter = PlayableMixin.getOneByType(map.getHex(6, 6), CBSmokeCounter);
            assert(smokeCounter).isDefined();
            assert(smokeCounter.isDense()).isTrue();
            assert(smokeCounter).notEqualsTo(denseSmokeCounter);
    });

});