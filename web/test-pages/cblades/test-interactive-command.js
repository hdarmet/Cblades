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
    createEvent,
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
    clickOnPiece,
    clickOnDice,
    executeAllAnimations,
    clickOnResult,
    clickOnMask,
    rollFor,
    clickOnMessage,
    rollFor1Die,
    clickOnTrigger,
    showMask,
    showInsert,
    showSuccessResult,
    showPlayedDice,
    showDice,
    showFailureResult,
    showMenuPanel,
    showMenuItem,
    showDie,
    showPlayedDie,
    showPopupCommand,
    showMessage,
    zoomAndRotate0, showMarker, showInsertMark
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame,
    createTinyGameWithLeader
} from "./game-examples.js";
import {
    CBOrderGivenActuator, CBOrderGivenHelpActuator,
    registerInteractiveCommand,
    unregisterInteractiveCommand
} from "../../jslib/cblades/interactive-command.js";
import {
    CBCohesion,
    CBOrderInstruction, CBTiredness
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

    function showOrderTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/order.png, -52.5, -48.5, 105, 97)",
            "restore()",
        ];
    }

    function showOrderCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/order-given-cost.png, -27.5, -27.5, 55, 55)",
                "shadowBlur = 0",
                "font = bold 30px serif", "textAlign = center", "textBaseline = middle", "fillStyle = #006600",
                `fillText(${cost}, 0, 0)`,
            "restore()"
        ]
    }

    function showCommandMarker(marker, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #000000", "shadowBlur = 10",
                `drawImage(./../images/markers/${marker}.png, -40, -40, 80, 80)`,
            "restore()"
        ];
    }

    it("Checks that the unit menu contains menu items for command", () => {
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
            assertDirectives(widgetsLayer, showMenuPanel(4, 5, 301.6667, 206.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(2, 4, "icons/change-orders", 4, 5, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(3, 4, "icons/give-specific-orders", 4, 5, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(0, 4, "icons/take-command", 4, 5, 301.6667, 206.8878));
            assertDirectives(itemsLayer, showMenuItem(1, 4, "icons/leave-command", 4, 5, 301.6667, 206.8878));
    });

    function clickOnTakeCommandAction(game) {
        return clickOnActionMenu(game, 0, 4);
    }

    it("Checks take command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, leader);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTakeCommandAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("take-command", 671, 234.1122, 444, 298));
            assertDirectives(widgetsLayer, showInsert("command", 227, 423.1122, 444, 680));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 453.1122));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(wing.leader).isNotDefined();
    });

    it("Checks successfully take command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, leader);
            clickOnTakeCommandAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1,2, 549, 453.1122));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wing.leader).equalsTo(leader);
            assert(leader.isPlayed()).isTrue();
    });

    it("Checks failed take command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            clickOnPiece(game, leader);
            clickOnTakeCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 453.1122));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wing.leader).isNotDefined();
            assert(leader.isPlayed()).isTrue();
    });

    function clickOnDismissCommandAction(game) {
        return clickOnActionMenu(game, 1, 4);
    }

    it("Checks dismiss command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnDismissCommandAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("dismiss-command", 671, 230.6122, 444, 305));
            assertDirectives(widgetsLayer, showInsert("command", 227, 423.1122, 444, 680));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 453.1122));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(wing.leader).equalsTo(leader);
    });

    it("Checks successfully dismiss command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnDismissCommandAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1,2, 549, 453.1122));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wing.leader).isNotDefined();
            assert(leader.isPlayed()).isTrue();
    });

    it("Checks failed dismiss command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnDismissCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 453.1122));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wing.leader).equalsTo(leader);
            assert(leader.isPlayed()).isTrue();
    });

    function clickOnChangeOrdersCommandAction(game) {
        return clickOnActionMenu(game, 2, 4);
    }

    it("Checks change orders command action opening and cancelling", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
        when:
            clickOnChangeOrdersCommandAction(game);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("change-order-instruction", 671, 256.1122, 444, 254));
            assertDirectives(widgetsLayer, showInsert("command", 227, 423.1122, 444, 680));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 453.1122));
        when:       // Clicking on the mask cancel the action
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
    });

    it("Checks failed change order command action process", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnChangeOrdersCommandAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 453.1122));
        when:
            clickOnResult(game);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
            assert(leader.isPlayed()).isTrue();
    });

    it("Checks successfully change order command action process ", () => {
        given:
            var {game, wing, leader} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, commandsLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnChangeOrdersCommandAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 423.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1,2, 549, 453.1122));
        when:
            clickOnResult(game);
            loadAllImages();
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showMenuPanel(2, 2, 361.6667, 393.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "markers/attack", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "markers/defend", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "markers/regroup", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "markers/retreat", 2, 2, 361.6667, 393.1122));
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
        when: // click mask is ignored
            clickOnMask(game);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showMenuPanel(2, 2, 361.6667, 393.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "markers/attack", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "markers/defend", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "markers/regroup", 2, 2, 361.6667, 393.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "markers/retreat", 2, 2, 361.6667, 393.1122));
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
            clickOnPiece(game, leader);
            clickOnChangeOrdersCommandAction(game);
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            clickOnChangeOrderMenu(game, 0, 0);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 0, 1);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 1, 0);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
        when:
            Memento.undo();
            clickOnChangeOrderMenu(game, 1, 1);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
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
            clickOnPiece(game, leader);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnGiveOrdersCommandAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("orders-given", 280.6667, 423.1122, 444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 280.6667, 688.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDie(1, 542.6667, 423.1122));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
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
                getLayers(game.board,"markers-0", "actuators-0", "widgets", "widget-items", "widget-commands");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnGiveOrdersCommandAction(game);
            loadAllImages();
        when:
            rollFor1Die(4);
            clickOnDice(game);
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDie(4, 626, 471.2243));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showMessage("9", 586, 471.2243));
        when:
            clickOnMessage(game);
            repaint(game);
        then:
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showOrderTrigger(zoomAndRotate0(416.6667, 312.7871)));
            assertDirectives(actuatorsLayer, showOrderTrigger(zoomAndRotate0(666.6667, 264.675)));
            assertDirectives(actuatorsLayer, showOrderCostTrigger(1, zoomAndRotate0(416.6667, 290.793)));
            assertDirectives(actuatorsLayer, showOrderCostTrigger(1, zoomAndRotate0(666.6667, 242.6808)));
            assertNoMoreDirectives(actuatorsLayer);
            skipDirectives(markersLayer, 4);
            assertDirectives(markersLayer, showCommandMarker("defend", zoomAndRotate0(534.7019, 496.2243)));
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(534.7019, 461.5225)));
        when:
            var giveOrdersActuator = getGiveOrdersActuator(game);
            var trigger = giveOrdersActuator.getTrigger(unit1);
            clickOnTrigger(game, trigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showOrderTrigger(zoomAndRotate0(666.6667, 264.675)));
            skipDirectives(markersLayer, 4);
            assertDirectives(markersLayer, showCommandMarker("defend", zoomAndRotate0(534.7019, 496.2243)));
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(534.7019, 461.5225)));
            assertDirectives(markersLayer, showMarker("ordergiven", zoomAndRotate0(451.3685, 317.186)));
        when:
            giveOrdersActuator = getGiveOrdersActuator(game);
        then:
            assert(giveOrdersActuator.getTrigger(unit1)).isNotDefined();
            assert(unit1.hasReceivedOrder()).isTrue();
            assert(unit2.hasReceivedOrder()).isFalse();
    });

    function getGiveOrdersHelpActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBOrderGivenHelpActuator) return actuator;
        }
        return null;
    }

    it("Checks orders cost activation and showering rules", () => {
        given:
            var {game, wing, unit1, leader} = create2UnitsTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnGiveOrdersCommandAction(game);
            rollFor1Die(4);
            clickOnDice(game);
            executeAllAnimations();
            clickOnMessage(game);
            loadAllImages();
        when:
            var giveOrdersHelpActuator = getGiveOrdersHelpActuator(game);
            var trigger = giveOrdersHelpActuator.getTrigger(unit1);
            clickOnTrigger(game, trigger);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("orders-given",305.6667, 305,444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 305.6667, 570));
            assertDirectives(widgetsLayer, showInsertMark(103.6667, 432));
            assertNoMoreDirectives(widgetsLayer);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks marks on order given insert when showering rules (base + disrupted + exhausted + distance) ", () => {
        given:
            var {game, map, wing, unit1, leader} = create2UnitsTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            unit1.disrupt();
            unit1.setTiredness(CBTiredness.EXHAUSTED);
            unit1.move(map.getHex(10, 10));
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnGiveOrdersCommandAction(game);
            rollFor1Die(4);
            clickOnDice(game);
            executeAllAnimations();
            clickOnMessage(game);
            loadAllImages();
        when:
            var giveOrdersHelpActuator = getGiveOrdersHelpActuator(game);
            var trigger = giveOrdersHelpActuator.getTrigger(unit1);
            clickOnTrigger(game, trigger);
            loadAllImages();
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("orders-given",722.3333, 495,444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 722.3333, 760));
            assertDirectives(widgetsLayer, showInsertMark(520.3333, 622)); // Mark for base
            assertDirectives(widgetsLayer, showInsertMark(525.3333, 705)); // Mark for disrupted
            assertDirectives(widgetsLayer, showInsertMark(525.3333, 725)); // Mark for exhausted
            assertDirectives(widgetsLayer, showInsertMark(525.3333, 760)); // Mark for distance
            assertNoMoreDirectives(widgetsLayer);
    });

    it("Checks marks on order given insert when showering rules (base + rooted + distance) ", () => {
        given:
            var {game, map, wing, unit1, leader} = create2UnitsTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            unit1.rout();
            unit1.move(map.getHex(10, 10));
            wing.setLeader(leader);
            clickOnPiece(game, leader);
            clickOnGiveOrdersCommandAction(game);
            rollFor1Die(4);
            clickOnDice(game);
            executeAllAnimations();
            clickOnMessage(game);
            loadAllImages();
        when:
            var giveOrdersHelpActuator = getGiveOrdersHelpActuator(game);
            var trigger = giveOrdersHelpActuator.getTrigger(unit1);
            clickOnTrigger(game, trigger);
            loadAllImages();
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("orders-given",722.3333, 495,444, 600));
            assertDirectives(widgetsLayer, showPopupCommand("down", 722.3333, 760));
            assertDirectives(widgetsLayer, showInsertMark(520.3333, 622)); // Mark for base
            assertDirectives(widgetsLayer, showInsertMark(525.3333, 740)); // Mark for routed
            assertDirectives(widgetsLayer, showInsertMark(525.3333, 760)); // Mark for distance
            assertNoMoreDirectives(widgetsLayer);
    });

});