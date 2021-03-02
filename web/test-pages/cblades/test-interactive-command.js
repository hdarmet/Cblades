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
    createEvent,
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
    clickOnDice,
    executeAllAnimations,
    clickOnResult,
    clickOnMask,
    rollFor,
    clickOnMessage,
    rollFor1Die,
    clickOnTrigger
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame,
    createTinyGameWithLeader
} from "./game-examples.js";
import {
    CBOrderGivenActuator,
    registerInteractiveCommand,
    unregisterInteractiveCommand
} from "../../jslib/cblades/interactive-command.js";
import {
    CBOrderInstruction
} from "../../jslib/cblades/unit.js";

describe("Interactive Command", ()=> {

    before(() => {
        registerInteractiveCommand();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveCommand();
    });

    it("Checks that the unit menu contains menu items for command", () => {
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
                    "setTransform(1, 0, 0, 1, 301.6667, 206.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -155, 250, 310)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -155, 250, 310)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/change-orders-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/give-specific-orders-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/take-command-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/leave-command-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function clickOnTakeCommandAction(game) {
        return clickOnActionMenu(game, 0, 4);
    }

    it("Checks take command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, leader);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTakeCommandAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 234.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/take-command-insert.png, -222, -149, 444, 298)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 423.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
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
            assert(wing.leader).isNotDefined();
    });

    it("Checks successfully take command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, leader);
            clickOnTakeCommandAction(game);
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
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 423.1122)",
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
            assert(wing.leader).equalsTo(leader);
            assert(leader.hasBeenPlayed()).isTrue();
    });

    it("Checks failed take command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnCounter(game, leader);
            clickOnTakeCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 423.1122)",
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
            assert(wing.leader).isNotDefined();
            assert(leader.hasBeenPlayed()).isTrue();
    });

    function clickOnDismissCommandAction(game) {
        return clickOnActionMenu(game, 1, 4);
    }

    it("Checks dismiss command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnDismissCommandAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 230.6122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/dismiss-command-insert.png, -222, -152.5, 444, 305)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 423.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
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
            assert(wing.leader).equalsTo(leader);
    });

    it("Checks successfully dismiss command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnDismissCommandAction(game);
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
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 423.1122)",
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
            assert(wing.leader).isNotDefined();
            assert(leader.hasBeenPlayed()).isTrue();
    });

    it("Checks failed dismiss command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnDismissCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            "save()",
                "setTransform(1, 0, 0, 1, 449, 423.1122)",
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
            assert(wing.leader).equalsTo(leader);
            assert(leader.hasBeenPlayed()).isTrue();
    });

    function clickOnChangeOrdersCommandAction(game) {
        return clickOnActionMenu(game, 2, 4);
    }

    it("Checks change orders command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnChangeOrdersCommandAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 256.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/change-order-instruction-insert.png, -222, -127, 444, 254)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 423.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
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
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
    });

    it("Checks failed change order command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnChangeOrdersCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 423.1122)",
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
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
            assert(leader.hasBeenPlayed()).isTrue();
    });

    it("Checks successfully change order command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnChangeOrdersCommandAction(game);
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
                    "setTransform(1, 0, 0, 1, 549, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 513.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            "save()",
                "setTransform(1, 0, 0, 1, 449, 423.1122)",
                "shadowColor = #00A000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
            "restore()"
        ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            loadAllImages();
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 361.6667, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 363.1122)",
                    "drawImage(/CBlades/images/markers/attack.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 363.1122)",
                    "drawImage(/CBlades/images/markers/defend.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 423.1122)",
                    "drawImage(/CBlades/images/markers/regroup.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 423.1122)",
                    "drawImage(/CBlades/images/markers/retreat.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
        when: // click mask is ignored
            clickOnMask(game);
            resetDirectives(widgetsLayer);
            loadAllImages();
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 361.6667, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
    });

    function clickOnChangeOrderMenu(game, col, row) {
        var icon = game.popup.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    it("Checks select new Wing Order", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnChangeOrdersCommandAction(game);
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            clickOnChangeOrderMenu(game, 0, 0);
            loadAllImages();
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 0, 1);
            loadAllImages();
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 1, 0);
            loadAllImages();
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 1, 1);
            loadAllImages();
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.RETREAT);
    });

    function clickOnGiveOrdersCommandAction(game) {
        return clickOnActionMenu(game, 3, 4);
    }

    it("Checks give orders command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnGiveOrdersCommandAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 302.6667, 423.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/orders-given-insert.png, -178, -350, 356, 700)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 520.6667, 423.1122)",
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
            assert(leader.commandPoints).equalsTo(0);
    });

    function getGiveOrdersActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBOrderGivenActuator) return actuator;
        }
        return null;
    }

    it("Checks give orders command action process", () => {
        given:
            var {game, wing, unit1, unit2, leader} = create2UnitsTinyGame();
            var [markersLayer, actuatorsLayer, widgetsLayer, itemsLayer, commandsLayer] =
                getLayers(game.board,"markers-0", "actuators", "widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnCounter(game, leader);
            clickOnGiveOrdersCommandAction(game);
            loadAllImages();
        when:
            rollFor1Die(4);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 604, 445)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d4.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 564, 445)",
                    "drawImage(/CBlades/images/dice/message.png, -75, -75, 150, 150)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 564, 475)",
                    "font = 90px serif", "textAlign = center",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(9, 0, 0)",
                    "fillStyle = #8080FF",
                    "fillText(9, 0, 0)",
                "restore()"
            ]);
        when:
            clickOnMessage(game);
            resetDirectives(markersLayer, widgetsLayer, commandsLayer, itemsLayer, actuatorsLayer);
            loadAllImages();
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 317.6747)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/order.png, -36.5, -34, 73, 68)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 666.6667, 269.5626)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/order.png, -36.5, -34, 73, 68)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 6)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 534.7019, 496.2243)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/defend.png, -40, -40, 80, 80)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 534.7019, 461.5225)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:
            var giveOrdersActuator = getGiveOrdersActuator(game);
            var trigger = giveOrdersActuator.getTrigger(unit1);
            resetDirectives(markersLayer, actuatorsLayer);
            clickOnTrigger(game, trigger);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 666.6667, 269.5626)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/order.png, -36.5, -34, 73, 68)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 534.7019, 496.2243)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/defend.png, -40, -40, 80, 80)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 534.7019, 461.5225)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:
            giveOrdersActuator = getGiveOrdersActuator(game);
        then:
            assert(giveOrdersActuator.getTrigger(unit1)).isNotDefined();
            assert(unit1.hasReceivedOrder()).isTrue();
            assert(unit2.hasReceivedOrder()).isFalse();
    });

});