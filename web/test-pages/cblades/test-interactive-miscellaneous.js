'use strict'

import {
    after,
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnCounter,
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
    executeAllAnimations, showFailureResult, showPlayedDice, clickOnResult, showSuccessResult
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame
} from "./game-examples.js";
import {
    registerInteractiveMiscellaneous,
    unregisterInteractiveMiscellaneous
} from "../../jslib/cblades/interactive-miscellaneous.js";
import {
    CBPlayable
} from "../../jslib/cblades/game.js";
import {
    CBFireStart, CBStakes
} from "../../jslib/cblades/miscellaneous.js";

describe("Interactive Miscellaneous", ()=> {

    before(() => {
        registerInteractiveMiscellaneous();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveMiscellaneous();
    });

    it("Checks that the unit menu contains menu items for miscellaneous actions", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 301.6667, 190)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -185, 250, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -185, 250, 370)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-fusion.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-many.png, -25, -25, 50, 50)",
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
            loadAllImages();
            paint(game); // units1 layer is created here !
            var [unitsLayer, units1Layer, markersLayer] = getLayers(game.board,"units-0", "units-1", "markers-0");
            clickOnCounter(game, unit1);
            clickOnMergeUnitsAction(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, units1Layer, markersLayer);
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
            loadAllImages();
            paint(game);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, unit1);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMiscellaneousAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(2, 2, 586.6667, 320));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(1, 1, "actions/remove-stakes", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(0, 0, "actions/start-fire", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "actions/extinguish-fire", 2, 2, 586.6667, 320));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "actions/set-stakes", 2, 2, 586.6667, 320));
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
            clickOnCounter(game, unit1);
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
            assert(unit1.markAsBeingPlayed()).isFalse();
    });

    it("Checks failed set fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBFireStart)).isNotDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    it("Checks failed set fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBFireStart)).isDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    function clickOnExtinguishFireMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 1, 0));
    }

    it("Checks extinguish fire misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireStart();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, unit1);
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
            assert(unit1.markAsBeingPlayed()).isFalse();
    });

    it("Checks failed extinguish fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireStart();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBFireStart)).isDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    it("Checks failed extinguish fire misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBFireStart();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBFireStart)).isNotDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    function clickOnSetStakesMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 0, 1));
    }

    it("Checks set stakes misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, unit1);
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
            assert(unit1.markAsBeingPlayed()).isFalse();
    });

    it("Checks failed set stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBStakes)).isNotDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    it("Checks failed set stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBStakes)).isDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    function clickOnRemoveStakesMiscAction(game) {
        clickOnArtifact(game, getMiscActionMenu(game, 1, 1));
    }

    it("Checks remove stakes misc action opening and cancelling", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakes();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, unit1);
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
            assert(unit1.markAsBeingPlayed()).isFalse();
    });

    it("Checks failed remove stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakes();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBStakes)).isDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    it("Checks failed remove stakes misc action process ", () => {
        given:
            var {game, map, unit1} = create2UnitsTinyGame();
            unit1.move(map.getHex(8, 8), 0);
            var fireStart = new CBStakes();
            fireStart.addToMap(unit1.hexLocation);
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, unit1);
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
            assert(CBPlayable.getByType(unit1.hexLocation, CBStakes)).isNotDefined();
            assert(unit1.hasBeenPlayed()).isTrue();
    });

});