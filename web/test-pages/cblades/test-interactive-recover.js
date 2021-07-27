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
    clickOnMask, rollFor,
    clickOnDice, executeAllAnimations, clickOnResult, showMask, showInsert, showSuccessResult, showPlayedDice,
    showDice, showIndicator, showInsertCommand, showFailureResult, showMenuPanel, showMenuItem, showWingIndicator
} from "./interactive-tools.js";
import {
    createTinyGame
} from "./game-examples.js";
import {
    registerInteractiveRecover,
    unregisterInteractiveRecover
} from "../../jslib/cblades/interactive-recover.js";

describe("Interactive Recover", ()=> {

    before(() => {
        registerInteractiveRecover();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveRecover();
    });

    it("Checks that the unit menu contains menu items for recovering", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, itemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, itemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(4, 3, 301.6667, 266.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(2, 2, "icons/do-reorganize", 4, 1, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "icons/do-rally", 4, 1, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(0, 2, "icons/do-rest", 4, 1, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "icons/do-reload", 4, 1, 301.6667, 206.8878));
    });

    function clickOnRestAction(game) {
        return clickOnActionMenu(game, 0, 2);
    }

    it("Checks resting action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnRestAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("rest", 379, 239.3878, 444, 195));
            assertDirectives(widgetsLayer, showInsert("check-rest", 359, 552.3878, 444, 451));
            assertDirectives(widgetsLayer, showWingIndicator("tiredness11", "banner", 76, 326.8878));
            assertDirectives(widgetsLayer, showIndicator("meteo2", 642, 526.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 671, 296.8878));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit.tiredness).equalsTo(1);
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks successfully resting action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(379, 326.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 671, 296.8878));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.tiredness).equalsTo(0);
    });

    it("Checks failed resting action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(379, 326.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 671, 296.8878));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.tiredness).equalsTo(1);
    });

    function clickOnReplenishMunitionsAction(game) {
        return clickOnActionMenu(game, 1, 2);
    }

    it("Checks replenish munitions action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.addOneLackOfMunitionsLevel();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnReplenishMunitionsAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-replenish-munitions", 271.6667, 196.5, 444, 383));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 563.6667, 348));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit.lackOfMunitions).equalsTo(1);
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks successfully replenish munitions action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.addOneLackOfMunitionsLevel();
            clickOnCounter(game, unit);
            clickOnReplenishMunitionsAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(271.6667, 378));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 563.6667, 348));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.lackOfMunitions).equalsTo(0);
    });

    it("Checks failed replenish munitions action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.addOneLackOfMunitionsLevel();
            clickOnCounter(game, unit);
            clickOnReplenishMunitionsAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(271.6667, 378));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 563.6667, 348));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.lackOfMunitions).equalsTo(1);
    });

    function clickOnReorganizeAction(game) {
        return clickOnActionMenu(game, 2, 2);
    }

    it("Checks reorganize action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.disrupt();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnReorganizeAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("reorganize", 671, 136.5, 444, 263));
            assertDirectives(widgetsLayer, showInsert("check-reorganize", 671, 520.5, 444, 245));
            assertDirectives(widgetsLayer, showInsert("moral", 227, 328, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 529, 298));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit.isDisrupted()).isTrue();
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks successfully reorganize action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.disrupt();
            clickOnCounter(game, unit);
            clickOnReorganizeAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 328));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 529, 298));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.isDisrupted()).isFalse();
    });

    it("Checks failed reorganize action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.disrupt();
            clickOnCounter(game, unit);
            clickOnReorganizeAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 328));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 529, 298));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.isDisrupted()).isTrue();
    });

    function clickOnRallyAction(game) {
        return clickOnActionMenu(game, 3, 2);
    }

    it("Checks rally action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit.disrupt();
            unit.addOneCohesionLevel();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnRallyAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("rally", 671, 144.5, 444, 279));
            assertDirectives(widgetsLayer, showInsert("check-rally", 671, 548, 444, 268));
            assertDirectives(widgetsLayer, showInsert("moral", 227, 344, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 529, 314));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(unit.isRouted()).isTrue();
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks successfully rally action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.disrupt();
            unit.addOneCohesionLevel();
            clickOnCounter(game, unit);
            clickOnRallyAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 344));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 529, 314));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.isDisrupted()).isTrue();
    });

    it("Checks failed rally action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit.disrupt();
            unit.addOneCohesionLevel();
            clickOnCounter(game, unit);
            clickOnRallyAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 344));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 529, 314));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.isRouted()).isTrue();
    });
});