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
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
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
    clickOnDice, executeAllAnimations, clickOnResult
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
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 301.6667, 266.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -95, 250, 190)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -95, 250, 190)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/do-reorganize-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/do-rally-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/do-rest-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/do-reload-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 239.3878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/rest-insert.png, -222, -97.5, 444, 195)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 359, 552.3878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-rest-insert.png, -222, -225.5, 444, 451)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 76, 326.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/tiredness10.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 642, 526.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/meteo2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 296.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 356.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 296.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 356.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 326.8878)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 296.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 356.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 326.8878)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 196.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-replenish-munitions-insert.png, -222, -191.5, 444, 383)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo(["save()", "setTransform(1, 0, 0, 1, 563.6667, 348)", "shadowColor = #00FFFF", "shadowBlur = 10", "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)", "restore()", "save()", "setTransform(1, 0, 0, 1, 503.6667, 408)", "shadowColor = #00FFFF", "shadowBlur = 10", "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)", "restore()"]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 563.6667, 348)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 503.6667, 408)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 378)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 563.6667, 348)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 503.6667, 408)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 378)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 136.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/reorganize-insert.png, -222, -131.5, 444, 263)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 520.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-reorganize-insert.png, -222, -122.5, 444, 245)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 328)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, -222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 298)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 358)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 298)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 358)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 328)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 298)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 358)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 328)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 144.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/rally-insert.png, -222, -139.5, 444, 279)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 548)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-rally-insert.png, -222, -134, 444, 268)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 344)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, -222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 314)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 374)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 314)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 374)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 344)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 529, 314)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 469, 374)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 344)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.isRouted()).isTrue();
    });
});