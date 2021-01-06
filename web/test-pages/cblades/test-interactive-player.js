'use strict'

import {
    assert, before, describe, executeTimeouts, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    filterPainting, getDirectives, getLayers,
    loadAllImages,
    mockPlatform, removeFilterPainting, resetDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBAction, CBCharacter,
    CBGame, CBMap, CBOrderInstruction, CBTroop, CBUnitType, CBWing
} from "../../jslib/cblades/game.js";
import {
    DDice, DMessage, DResult
} from "../../jslib/widget.js";
import {
    CBFireAttackActuator,
    CBInteractivePlayer,
    CBMoveActuator, CBOrderGivenActuator,
    CBOrientationActuator,
    CBRetreatActuator,
    CBShockAttackActuator
} from "../../jslib/cblades/interactive-player.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    DBoard
} from "../../jslib/board.js";

describe("Interactive Player", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    function paint(game) {
        game._board.paint();
    }

    function repaint(game) {
        game._board.repaint();
    }

    function createTinyGame() {
        var game = new CBGame();
        var arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        var player = new CBInteractivePlayer();
        game.addPlayer(player);
        var wing = new CBWing(player);
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unitType = new CBUnitType("unit", ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
        let unit = new CBTroop(unitType, wing);
        game.addUnit(unit, map.getHex( 5, 8));
        game.start();
        loadAllImages();
        return { game, arbitrator, player, wing, map, unit };
    }

    function create2PlayersTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBInteractivePlayer();
        game.addPlayer(player1);
        let player2 = new CBInteractivePlayer();
        game.addPlayer(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let wing1 = new CBWing(player1);
        let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
        let unit1 = new CBTroop(unitType1, wing1);
        game.addUnit(unit1, map.getHex(5, 8));
        let wing2 = new CBWing(player2);
        let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"]);
        let unit2 = new CBTroop(unitType2, wing2);
        game.addUnit(unit2, map.getHex(6, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, wing1, wing2, player1, player2};
    }

    function create2UnitsTinyGame() {
        var game = new CBGame();
        var arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        var player = new CBInteractivePlayer();
        game.addPlayer(player);
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let wing = new CBWing(player);
        let leaderType = new CBUnitType("leader",
            ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
        let leader = new CBCharacter(leaderType, wing);
        let unitType = new CBUnitType("unit",
            ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
        let unit1 = new CBTroop(unitType, wing);
        let unit2 = new CBTroop(unitType, wing);
        game.addUnit(leader, map.getHex(6, 9));
        game.addUnit(unit1, map.getHex(5, 8));
        game.addUnit(unit2, map.getHex( 8, 7));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, wing, leader, player};
    }

    function clickOnCounter(game, counter) {
        let unitLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnMask(game) {
        var mouseEvent = createEvent("click", {offsetX:1, offsetY:1});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnActionMenu(game, col, row) {
        var icon = game.popup.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnMoveAction(game) {
        return clickOnActionMenu(game, 0, 0);
    }

    it("Checks that clicking on a unit select the unit ", () => {
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
                    "setTransform(1, 0, 0, 1, 331.6667, 220)",
                    "drawImage(/CBlades/images/icons/leave-formation.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 220)",
                    "drawImage(/CBlades/images/icons/dismiss-formation.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 280)",
                    "drawImage(/CBlades/images/icons/change-orders-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 280)",
                    "drawImage(/CBlades/images/icons/give-specific-orders-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-fusion-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-many.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 40)",
                    "drawImage(/CBlades/images/icons/move.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 40)",
                    "drawImage(/CBlades/images/icons/move-back.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 40)",
                    "drawImage(/CBlades/images/icons/escape.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 40)",
                    "drawImage(/CBlades/images/icons/to-face.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 100)",
                    "drawImage(/CBlades/images/icons/shock-attack-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 100)",
                    "drawImage(/CBlades/images/icons/fire-attack-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 100)",
                    "drawImage(/CBlades/images/icons/shock-duel-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 100)",
                    "drawImage(/CBlades/images/icons/fire-duel-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 160)",
                    "drawImage(/CBlades/images/icons/do-rest-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 160)",
                    "drawImage(/CBlades/images/icons/do-reload-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 160)",
                    "drawImage(/CBlades/images/icons/do-reorganize-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 160)",
                    "drawImage(/CBlades/images/icons/do-rally-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 220)",
                    "drawImage(/CBlades/images/icons/create-formation.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 220)",
                    "drawImage(/CBlades/images/icons/join-formation.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 280)",
                    "drawImage(/CBlades/images/icons/take-command-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 280)",
                    "drawImage(/CBlades/images/icons/leave-command-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 340)",
                    "drawImage(/CBlades/images/icons/select-spell.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 340)",
                    "drawImage(/CBlades/images/icons/cast-spell.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks that global events close action menu", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            Mechanisms.fire(game, DBoard.ZOOM_EVENT);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
        when:
            clickOnCounter(game, unit);
            resetDirectives(widgetsLayer);
            Mechanisms.fire(game, DBoard.SCROLL_EVENT);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);

    });

    it("Checks that a unit cannot be selected if it not belongs to the current player", () => {
        given:
            var {game, unit1, player1, unit2} = create2PlayersTinyGame();
            unit1.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            unit2.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit2.onMouseClick({offsetX:0, offsetY:0});  // Not executed ! Player2 is not the current player
        then:
            assert(game.selectedUnit).equalsTo(unit1);
    });

    it("Checks that a selected unit's action is finalized when there is a selection/end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            player.changeSelection(unit, dummyEvent);
            var action = new CBAction(game, unit);
            unit.launchAction(action);
            action.markAsFinished();
        then:
            assert(game.turnIsFinishable()).isTrue();
        when:
            var finished = false;
            player.finishTurn(()=>{})
        then:
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a finalized unit action does not block selection/end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            player.changeSelection(unit, dummyEvent);
            unit.launchAction(new CBAction(game, unit));
            unit.action.markAsFinished();
            unit.action.finalize();
            var finished = false;
            player.finishTurn(()=>{finished=true;})
        then:
            assert(finished).isTrue();
    });

    it("Checks that a player cannot finish their turn if a unit is not finishable", () => {
        given:
            var {game, unit1, player} = create2UnitsTinyGame();
            var finished = false;
        then:
            assert(player.canFinishUnit(unit1)).isFalse();
            assert(game.turnIsFinishable()).isFalse();
    });

    it("Checks move action actuators when unit is oriented toward an hexside", () => {
        given:
            var { game, unit } = createTinyGame();
        when:
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks move action actuators when unit is oriented toward a vertex", () => {
        given:
            var { game, unit } = createTinyGame();
        when:
            unit.angle = 30;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isDefined();
            assert(orientationActuator.getTrigger(30)).isNotDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks move action actuators appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        when:
            filterPainting(moveActuator.getTrigger(0));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 265.2859)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)"
            ]);
        when:
            removeFilterPainting(moveActuator.getTrigger(0));
            filterPainting(orientationActuator.getTrigger(30));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 452.9167, 289.1014)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
    });

    it("Checks that a unit selection closes the actuators", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
        when:
            clickOnCounter(game, unit1);
            clickOnMoveAction(game);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(unit1);
            assert(moveActuator).isDefined();
            assert(orientationActuator).isDefined();
        when:
            clickOnCounter(game, unit2);
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(unit2);
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks mouse move over a trigger of a move actuator", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
        when:
            filterPainting(moveActuator.getTrigger(0));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 265.2859)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOnTrigger(game, moveActuator.getTrigger(0));
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 265.2859)",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOutOfTrigger(game, moveActuator.getTrigger(0));
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 265.2859)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)"
            ]);
    });

    it("Checks mouse move over a trigger of an orientation actuator", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            filterPainting(orientationActuator.getTrigger(30));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 452.9167, 289.1014)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOnTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 452.9167, 289.1014)",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOutOfTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 452.9167, 289.1014)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
    });

    function clickOnTrigger(game, trigger) {
        let triggerLocation = trigger.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:triggerLocation.x, offsetY:triggerLocation.y});
        trigger.onMouseClick(mouseEvent);
        paint(game);
        Memento.open();
    }

    function mouseMoveOnTrigger(game, trigger) {
        let actuatorLocation = trigger.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:actuatorLocation.x, offsetY:actuatorLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfTrigger(game, trigger) {
        let actuatorArea = trigger.viewportBoundingArea;
        var mouseEvent = createEvent("mousemove", {offsetX:actuatorArea.left-5, offsetY:actuatorArea.top});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function getOrientationActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBOrientationActuator) return actuator;
        }
        return null;
    }

    function getMoveActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBMoveActuator) return actuator;
        }
        return null;
    }

    it("Checks Unit move using actuators (move, rotate, move)", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getMoveActuator(game);
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(8);
            assert(unit.angle).equalsTo(0);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(0));
        then:
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(7);
        when:
            var moveActuator2 = getMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator2.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(unit.angle).equalsTo(60);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator3.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(0, -393.75)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(6);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -393.75)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(6);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
    });

    it("Checks Unit move using actuators (rotate, move, rotate)", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getMoveActuator(game);
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(8);
            assert(unit.angle).equalsTo(0);
        when:
            clickOnTrigger(game, orientationActuator1.getTrigger(60));
        then:
            assert(unit.angle).equalsTo(60);
        when:
            var moveActuator2 = getMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator2.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getTrigger(90));
        then:
            assert(unit.angle).equalsTo(90);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(90);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
    });

    function resetAllDirectives(game) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        resetDirectives(unitsLayer, markersLayer, actuatorsLayer);
    }

    function registerAllDirectives(game) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        return {
            units:[...getDirectives(unitsLayer)],
            markers:[...getDirectives(markersLayer)],
            actuators:[...getDirectives(actuatorsLayer)]
        };
    }

    function assertAllDirectives(game, picture) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        assert(getDirectives(unitsLayer)).arrayEqualsTo(picture.units);
        assert(getDirectives(markersLayer)).arrayEqualsTo(picture.markers);
        assert(getDirectives(actuatorsLayer)).arrayEqualsTo(picture.actuators);
    }

    it("Checks appearance when undoing (move, rotate, move)", () => {
        given:
            var {game, unit} = createTinyGame();
            loadAllImages();
            paint(game);
            resetAllDirectives(game);
        when:
            clickOnCounter(game, unit);
            loadAllImages();
            resetAllDirectives(game);
            clickOnMoveAction(game);
            loadAllImages();
            resetAllDirectives(game);
            repaint(game);
            var picture1 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            resetAllDirectives(game);
            repaint(game);
            var picture2 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            resetAllDirectives(game);
            repaint(game);
            var picture3 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture3);
        when:
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture2);
        when:
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture1);
        when:
            Memento.undo();
    });

    it("Checks Unit movement points management during move", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
        then:
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            var orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(60));
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(1.5);
        when:
            Memento.undo();
        then:
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            Memento.redo();
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(1.5);
    });

    it("Checks that extended move is proposed when unit does not have enough movement point", () => {
        given:
            var {game, unit} = createTinyGame()
            unit.movementPoints = 1;
            unit.extendedMovementPoints = 2;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/standard-move.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("/CBlades/images/actuators/toward.png");
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/extended-move.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("/CBlades/images/actuators/extended-toward.png");
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks that minimal move is proposed as first move when there are not enough movement points", () => {
        given:
            var {game, unit} = createTinyGame()
            unit.movementPoints = 0.5;
            unit.extendedMovementPoints = 0.5;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(0.5);
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/minimal-move.png");
    });

    it("Checks Unit tiredness progression (fresh -> tired -> exhausted)", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board,"units-0", "markers-0");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            unit.movementPoints = 0.5;
            loadAllImages();
            paint(game);
            var moveActuator1 = getMoveActuator(game);
        when:
            resetDirectives(markersLayer, unitsLayer);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(1);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            unit.movementPoints = 0.5;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            paint(game);
            resetDirectives(markersLayer);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(2);
            assert(unit.hasBeenPlayed()).isTrue();   // Unit is played automatically because no further movement/reorientation is possble
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/exhausted.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 124.7373)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
    });

    function executeAllAnimations() {
        while(DAnimator.isActive()) {
            executeTimeouts();
        }
    }

    function clickOnDice(game) {
        var itemsLevel = game.board.getLevel("widget-items");
        for (let item of itemsLevel.artifacts) {
            if (item.element instanceof DDice) {
                let itemLocation = item.viewportLocation;
                var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
                item.onMouseClick(mouseEvent);
                return;
            }
        }
    }

    function clickOnResult(game) {
        var commandsLevel = game.board.getLevel("widget-commands");
        for (let item of commandsLevel.artifacts) {
            if (item.element instanceof DResult) {
                let itemLocation = item.viewportLocation;
                var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
                item.onMouseClick(mouseEvent);
                return;
            }
        }
    }

    function rollFor(d1, d2) {
        getDrawPlatform().resetRandoms((d1-0.5)/6, (d2-0.5)/6, 0);
    }

    let dummyEvent = {offsetX:0, offsetY:0};

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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 102.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/rest-insert.png, -222, -97.5, 444, 195)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 359, 415.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-rest-insert.png, -222, -225.5, 444, 451)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 76, 190)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/tiredness10.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 642, 390)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/meteo2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 160)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 220)",
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
                    "setTransform(1, 0, 0, 1, 671, 160)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 220)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 190)",
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
                    "setTransform(1, 0, 0, 1, 671, 160)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 611, 220)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 379, 190)",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
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

    it("Checks attacker engagement process ", () => {
        given:
            var {map, player1, unit1, unit2} = create2PlayersTinyGame();
        when:
            unit1.hexLocation = map.getHex(5, 5);
            unit2.hexLocation = map.getHex(5, 3);
            moveUnitByAction(unit1, map.getHex(5, 4));
        then:
            assert(unit1.isEngaging()).isTrue();
        when:
            unit1.action.moveUnit(map.getHex(5, 5), dummyEvent);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    it("Checks that activation remove own contact marker ", () => {
        given:
            var {game, map, player1, unit1} = create2PlayersTinyGame();
            unit1.hexLocation = map.getHex(5, 5);
            unit1.markAsEngaging(true);
        when:
            player1.selectUnit(unit1, dummyEvent);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    function moveUnitByAction(unit, hex) {
        unit.player.startMoveUnit(unit, dummyEvent);
        unit.action.moveUnit(hex);
    }

    function moveUnit1OnContactToUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 5), 0);
        unit2.move(map.getHex(2, 3), 0);
        unit2.rotate(180);
        unit1.player.selectUnit(unit1, dummyEvent);
        map.game.closePopup();
        moveUnitByAction(unit1, map.getHex(2, 4));
        loadAllImages();
    }

    it("Checks attacker engagement check appearance (and cancelling next action)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            var finished = false;
            player1.finishTurn(()=>{finished = true;})
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-attacker-engagement-insert.png, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, -222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
            assert(finished).isFalse();
    });

    it("Checks when a unit successfully pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
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
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
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
            assert(unit1.isDisrupted()).isFalse();
            assert(finished).isTrue();
    });

    it("Checks when a unit fail to pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
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
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
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
            assert(unit1.isDisrupted()).isTrue();
            assert(finished).isTrue();
    });

    function unit1IsEngagedByUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 4), 0);
        unit2.move(map.getHex(2, 3), 0);
        unit2.rotate(180);
        unit2.markAsEngaging(true);
        loadAllImages();
    }

    it("Checks defender engagement check appearance (and cancelling selection)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-defender-engagement-insert.png, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, -222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
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
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            when:
                clickOnResult(game);
                resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
                repaint(game);
            then:
                assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([ // Action menu opened in modal mode
                    "save()",
                        "setTransform(1, 0, 0, 1, 130, 190)",
                        "shadowColor = #000000", "shadowBlur = 15",
                        "strokeStyle = #000000", "lineWidth = 1",
                        "strokeRect(-125, -185, 250, 370)",
                        "fillStyle = #FFFFFF",
                        "fillRect(-125, -185, 250, 370)",
                    "restore()"
                ]);
                assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
                assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit failed to pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
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
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([ // Action menu opened in modal mode
                "save()",
                    "setTransform(1, 0, 0, 1, 130, 190)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -185, 250, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -185, 250, 370)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

    function clickOnShockAttackAction(game) {
        return clickOnActionMenu(game, 0, 1);
    }

    function getShockAttackActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBShockAttackActuator) return actuator;
        }
        return null;
    }

    function getRetreatActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBRetreatActuator) return actuator;
        }
        return null;
    }

    it("Checks shock attack action actuator appearance when support is possible", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 402.0039, 241.0007)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 431.3294, 270.3262)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/supported-shock.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var shockAttackActuator = getShockAttackActuator(game);
        then:
            assert(shockAttackActuator.getTrigger(unit2, true)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, true)).isNotDefined();
            assert(shockAttackActuator.getTrigger(unit2, false)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, false)).isNotDefined();
    });

    it("Checks shock attack action actuator appearance when support is not possible", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            unit1.move(map.getHex(5, 8));
            unit1.addOneTirednessLevel();
            unit1.addOneTirednessLevel();
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6667, 255.6635)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var shockAttackActuator = getShockAttackActuator(game);
        then:
            assert(shockAttackActuator.getTrigger(unit2, true)).isNotDefined();
            assert(shockAttackActuator.getTrigger(unit2, false)).isDefined();
    });

    it("Checks shock resolution appearance (and cancelling shock attack action)", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
            let shockAttackActuator = getShockAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 431.3294, 100)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, -402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.3294, 466)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/shock-attack-insert.png, -202.5, -329, 405, 658)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 531.3294, 207)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 471.3294, 267)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully shock attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
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
                    "setTransform(1, 0, 0, 1, 531.3294, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 471.3294, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 431.3294, 177)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(unit2);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/blood.png, -52, -72, 104, 144)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 169.0616)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 491.6667, 212.3625)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, -0.4233, 0.4233, 0.2444, 341.6667, 212.3625)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(120)).isNotDefined();
    });

    it("Checks when a unit fails to shock attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
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
                    "setTransform(1, 0, 0, 1, 531.3294, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 471.3294, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 431.3294, 177)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit retreat", () => {
        given:
            var { game, map, player1, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getTrigger(0));
            loadAllImages();
            resetDirectives(actuatorsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 416.6667, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit take a loss", () => {
        given:
            var { game, map, player1, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getLossTrigger());
            loadAllImages();
            resetDirectives(actuatorsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2b.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    function clickOnFireAttackAction(game) {
        return clickOnActionMenu(game, 1, 1);
    }

    function getFireAttackActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFireAttackActuator) return actuator;
        }
        return null;
    }

    it("Checks fire attack action actuator appearance", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            unit1.move(map.getHex(5, 8));
            unit1.addOneTirednessLevel();
            unit1.addOneTirednessLevel();
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/fire.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var fireAttackActuator = getFireAttackActuator(game);
        then:
            assert(fireAttackActuator.getTrigger(unit1)).isNotDefined();
            assert(fireAttackActuator.getTrigger(unit2)).isDefined();
    });

    it("Checks fire resolution appearance (and cancelling fire attack action)", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
            let fireAttackActuator = getFireAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 416.6667, 92)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, -402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 256.6667, 458)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/fire-attack-insert.png, -202.5, -329, 405, 658)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 516.6667, 199)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 456.6667, 259)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully fire attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
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
                    "setTransform(1, 0, 0, 1, 516.6667, 199)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 456.6667, 259)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 416.6667, 169)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(unit2);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/blood.png, -52, -72, 104, 144)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 72.8372)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 491.6667, 116.1382)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(-0.2444, 0.4233, -0.4233, -0.2444, 491.6667, 202.7401)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(-0.2444, -0.4233, 0.4233, -0.2444, 341.6667, 202.7401)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, -0.4233, 0.4233, 0.2444, 341.6667, 116.1382)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(150)).isNotDefined();
    });

    it("Checks when a unit fails to fire attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
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
                    "setTransform(1, 0, 0, 1, 516.6667, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 456.6667, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 416.6667, 177)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when double on dice lower firer ammunitions", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [markersLayer] = getLayers(game.board,"markers-0");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
        when:
            rollFor(5,5);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
    });

    function createTinyGameWithLeader() {
        var game = new CBGame();
        var arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        var player = new CBInteractivePlayer();
        game.addPlayer(player);
        var wing = new CBWing(player);
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unitType = new CBUnitType("unit",
            ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
        let unit = new CBTroop(unitType, wing);
        game.addUnit(unit, map.getHex( 5, 8));
        let leaderType = new CBUnitType("unit",
            ["/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"]);
        let leader = new CBCharacter(leaderType, wing);
        game.addUnit(leader, map.getHex( 5, 9));
        game.start();
        loadAllImages();
        return { game, arbitrator, player, wing, map, unit, leader };
    }

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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 174.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/take-command-insert.png, -222, -149, 444, 298)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 363.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 363.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo(["save()", "setTransform(1, 0, 0, 1, 449, 363.1122)", "shadowColor = #A00000", "shadowBlur = 100", "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)", "restore()"]);
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 170.6122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/dismiss-command-insert.png, -222, -152.5, 444, 305)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 363.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 363.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 363.1122)",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 671, 196.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/change-order-instruction-insert.png, -222, -127, 444, 254)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 363.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/command-insert.png, -222, -340, 444, 680)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 363.1122)",
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
                    "setTransform(1, 0, 0, 1, 549, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 363.1122)",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
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
                    "globalAlpha = 0.3", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 302.6667, 363.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/orders-given-insert.png, -178, -350, 356, 700)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 520.6667, 363.1122)",
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

    function rollFor1Die(d1) {
        getDrawPlatform().resetRandoms((d1-0.5)/6, 0);
    }

    function clickOnMessage(game) {
        var commandsLevel = game.board.getLevel("widget-commands");
        for (let item of commandsLevel.artifacts) {
            if (item.element instanceof DMessage) {
                let itemLocation = item.viewportLocation;
                var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
                item.onMouseClick(mouseEvent);
                return;
            }
        }
    }

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
                    "setTransform(1, 0, 0, 1, 604, 411.2243)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d4.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 564, 411.2243)",
                    "drawImage(/CBlades/images/dice/message.png, -75, -75, 150, 150)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 564, 441.2243)",
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
            unit1.receiveOrder(true);
            unit2.receiveOrder(true);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 500, 496.2243)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/character.png, -60, -60, 120, 120)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 666.6667, 400)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(units1Layer, 4)).arrayEqualsTo([
            ]);
            assert(unit1.hexLocation).isNotDefined();
            assert(unit2.hexLocation).isNotDefined();
    });

});