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
    filterPainting, getDirectives, getLevels,
    loadAllImages,
    mockPlatform, removeFilterPainting, resetDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBAction,
    CBGame, CBHexId, CBMap, CBUnit
} from "../../jslib/cblades/game.js";
import {
    DDice,
    DPopup, DResult
} from "../../jslib/widget.js";
import {
    CBInteractivePlayer,
    CBMoveActuator,
    CBOrientationActuator,
    CBRetreatActuator,
    CBShockAttackActuator,
    InteractiveMovementAction
} from "../../jslib/cblades/interactive-player.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";

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
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unit = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addUnit(unit, map.getHex( 5, 8));
        game.start();
        loadAllImages();
        return { game, arbitrator, player, map, unit };
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
        let unit1 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addUnit(unit2, map.getHex(6, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, player1, player2};
    }

    function create2UnitsTinyGame() {
        var game = new CBGame();
        var arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        var player = new CBInteractivePlayer();
        game.addPlayer(player);
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unit1 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        let unit2 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addUnit(unit1, map.getHex(5, 8));
        game.addUnit(unit2, map.getHex( 8, 7));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, player};
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
        var icon = DPopup._instance.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnMoveAction(game) {
        return clickOnActionMenu(game, 0, 0);
    }

    function clickOnRestAction(game) {
        return clickOnActionMenu(game, 0, 2);
    }

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLevel, widgetsLevel, widgetItemsLevel] = getLevels(game, "units", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLevel, widgetsLevel, widgetItemsLevel);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15", "strokeStyle = #000000",
                "lineWidth = 1",
                "setTransform(1, 0, 0, 1, 301.6667, 190)",
                "strokeRect(-125, -185, 250, 370)",
                "fillStyle = #FFFFFF",
                "fillRect(-125, -185, 250, 370)", "restore()"
            ]);
            assert(getDirectives(widgetItemsLevel, 4)).arrayEqualsTo([
                "save()", "drawImage(/CBlades/images/icons/leave-formation.png, 306.6667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/dismiss-formation.png, 366.6667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/change-orders.png, 306.6667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/give-specific-orders.png, 366.6667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-fusion.png, 306.6667, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-many.png, 366.6667, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/move.png, 186.6667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/move-back.png, 246.6667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/escape.png, 306.6667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/to-face.png, 366.6667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/shock-attack-gray.png, 186.6667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-attack-gray.png, 246.6667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/shock-duel-gray.png, 306.6667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-duel-gray.png, 366.6667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-rest-gray.png, 186.6667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-reload.png, 246.6667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-reorganize.png, 306.6667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-rally.png, 366.6667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/create-formation.png, 186.6667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/join-formation.png, 246.6667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/take-command.png, 186.6667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/leave-command.png, 246.6667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/select-spell.png, 186.6667, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/cast-spell.png, 246.6667, 315, 50, 50)", "restore()"
            ]);
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
            var {game, unit1, unit2, player} = create2UnitsTinyGame();
            player.changeSelection(unit1, dummyEvent);
            var action = new CBAction(game, unit1);
            unit1.launchAction(action);
            action.markAsFinished();
            var finished = false;
            player.finishTurn(()=>{finished=true;})
        then:
            assert(finished).isTrue();
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a finalized unit action does not block selection/end of turn", () => {
        given:
            var {game, unit1, unit2, player} = create2UnitsTinyGame();
            player.changeSelection(unit1, dummyEvent);
            unit1.launchAction(new CBAction(game, unit1));
            unit1.action.markAsFinished();
            unit1.action.finalize();
            var finished = false;
            player.finishTurn(()=>{finished=true;})
        then:
            assert(finished).isTrue();
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
            var [actuatorsLevel] = getLevels(game, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        when:
            filterPainting(moveActuator.getTrigger(0));
            resetDirectives(actuatorsLevel);
            stopRegister(actuatorsLevel);
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -210.5, -340.625, 80, 130)"
            ]);
        when:
            removeFilterPainting(moveActuator.getTrigger(0));
            filterPainting(orientationActuator.getTrigger(30));
            resetDirectives(actuatorsLevel);
            stopRegister(actuatorsLevel);
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984, 60, 80)"
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
            var [actuatorsLevel] = getLevels(game, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
        when:
            filterPainting(moveActuator.getTrigger(0));
            resetDirectives(actuatorsLevel);
            stopRegister(actuatorsLevel);
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -210.5, -340.625, 80, 130)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOnTrigger(game, moveActuator.getTrigger(0));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -210.5, -340.625, 80, 130)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOutOfTrigger(game, moveActuator.getTrigger(0));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move.png, -210.5, -340.625, 80, 130)"
            ]);
    });

    it("Checks mouse move over a trigger of an orientation actuator", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLevel] = getLevels(game, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            filterPainting(orientationActuator.getTrigger(30));
            resetDirectives(actuatorsLevel);
            stopRegister(actuatorsLevel);
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOnTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOutOfTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984, 60, 80)"
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
        var [unitsLevel, markersLevel, actuatorsLevel] = getLevels(game,"units", "markers", "actuators");
        resetDirectives(unitsLevel, markersLevel, actuatorsLevel);
    }

    function registerAllDirectives(game) {
        var [unitsLevel, markersLevel, actuatorsLevel] = getLevels(game,"units", "markers", "actuators");
        return {
            units:[...getDirectives(unitsLevel)],
            markers:[...getDirectives(markersLevel)],
            actuators:[...getDirectives(actuatorsLevel)]
        };
    }

    function assertAllDirectives(game, picture) {
        var [unitsLevel, markersLevel, actuatorsLevel] = getLevels(game,"units", "markers", "actuators");
        assert(getDirectives(unitsLevel)).arrayEqualsTo(picture.units);
        assert(getDirectives(markersLevel)).arrayEqualsTo(picture.markers);
        assert(getDirectives(actuatorsLevel)).arrayEqualsTo(picture.actuators);
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
            var [unitsLevel, markersLevel] = getLevels(game,"units", "markers");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            unit.movementPoints = 0.5;
            loadAllImages();
            paint(game);
            var moveActuator1 = getMoveActuator(game);
        when:
            resetDirectives(markersLevel, unitsLevel);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(1);
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -366.3125, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -327.3125, 64, 64)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            unit.movementPoints = 0.5;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            paint(game);
            resetDirectives(markersLevel);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(2);
            assert(unit.hasBeenPlayed()).isTrue();   // Unit is played automatically because no further movement/reorientation is possble
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -524.1875, 64, 64)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/actiondone.png, -131.5, -595.1875, 64, 64)",
                "restore()"
            ]);
    });

    it("Checks resting action opening and cancelling", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLevel, itemsLevel] = getLevels(game,"widgets", "widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLevel, itemsLevel);
            clickOnRestAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",   // Mask
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",   // Insert rest action
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/rest-insert.png, 157, 5, 444, 195)",
                "restore()",
                "save()",   // Insert rest check
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-rest-insert.png, 137, 190, 444, 451)",
                "restore()",
                "save()",   // Wing tiredness Indicator (X)
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/tiredness10.png, 5, 119, 142, 142)",
                "restore()",
                "save()",   // Metoe indicator (clear)
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/meteo2.png, 571, 319, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 621, 115.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 561, 175.5, 100, 89)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLevel, itemsLevel);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(unit.tiredness).equalsTo(1);
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    function executeAllAnimations() {
        while(DAnimator.isActive()) {
            executeTimeouts();
        }
    }

    function clickOnDice(game) {
        var [itemsLevel] = getLevels(game,"widget-items");
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
        var [commandsLevel] = getLevels(game,"widget-commands");
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

    it("Checks successfully resting action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 621, 115.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, 561, 175.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, 304, 115, 150, 150)",
                "restore()"]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.tiredness).equalsTo(0);
    });

    it("Checks failed resting action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, 621, 115.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, 561, 175.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
            "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, 304, 115, 150, 150)",
            "restore()"]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.tiredness).equalsTo(1);
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
        DPopup.close();
        moveUnitByAction(unit1, map.getHex(2, 4));
        loadAllImages();
    }

    it("Checks attacker engagement check appearance (and cancelling next action)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            var finished = false;
            player1.finishTurn(()=>{finished = true;})
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-attacker-engagement-insert.png, 5, 5, 444, 763)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 439, 7.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
            assert(finished).isFalse();
    });

    it("Checks when a unit successfully pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d1.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d2.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00A000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/success.png, 374, 311.5, 150, 150)",
                "restore()"]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isFalse();
            assert(finished).isTrue();
    });

    it("Checks when a unit fail to pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d5.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d6.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, 374, 311.5, 150, 150)",
                "restore()"]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
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
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-defender-engagement-insert.png, 5, 5, 444, 763)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 439, 7.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d1.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d2.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00A000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/success.png, 374, 311.5, 150, 150)",
                "restore()"]);
            when:
                clickOnResult(game);
                resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
                repaint(game);
            then:
                assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([ // Action menu opened in modal mode
                    "save()",
                        "shadowColor = #000000", "shadowBlur = 15",
                        "strokeStyle = #000000", "lineWidth = 1",
                        "setTransform(1, 0, 0, 1, 130, 190)",
                        "strokeRect(-125, -185, 250, 370)",
                        "fillStyle = #FFFFFF",
                        "fillRect(-125, -185, 250, 370)",
                    "restore()"
                ]);
                assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
                assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit failed to pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d5.png, 499, 382, 100, 89)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d6.png, 439, 442, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, 374, 311.5, 150, 150)",
                "restore()"]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([ // Action menu opened in modal mode
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "setTransform(1, 0, 0, 1, 130, 190)",
                    "strokeRect(-125, -185, 250, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -185, 250, 370)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
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

    it("Checks shock attack action actuator appearance when support is possible", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLevel] = getLevels(game, "actuators");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLevel);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 407.3714, 427.6962)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -250.5, -380.8125, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 425.963, 416.9623)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/supported-shock.png, -190.5, -320.8125, 100, 111)",
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
            var [actuatorsLevel] = getLevels(game, "actuators");
            unit1.move(map.getHex(5, 8));
            unit1.addOneTirednessLevel();
            unit1.addOneTirednessLevel();
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLevel);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6672, 422.3292)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -220.5, -350.8125, 100, 111)",
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
            var [actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
            let shockAttackActuator = getShockAttackActuator(game);
        when:
            resetDirectives(actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)", "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, 29.3294, 13, 804, 174)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/shock-attack-insert.png, 68.8294, 137, 405, 658)",
                "restore()"
            ]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 481.3294, 162.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 421.3294, 222.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLevel, commandsLevel, itemsLevel);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel)).arrayEqualsTo([]);
    });

    function getRetreatActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBRetreatActuator) return actuator;
        }
        return null;
    }

    it("Checks when a unit successfully shock attack", () => {
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, 481.3294, 162.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, 421.3294, 222.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, 356.3294, 102, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(unit2);
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -210.5, -537.5, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 333.3345, 313.3981)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -57.05, -448.9062, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, -0.4233, 0.4233, 0.2444, 583.3321, 169.0606)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -363.95, -448.9062, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(120)).isNotDefined();
    });

    it("Checks when a unit fails to shock attack", () => {
        var { game, map, unit1, unit2 } = create2PlayersTinyGame();
        var [actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel] = getLevels(game,
            "actuators", "widgets", "widget-commands","widget-items"
        );
        unit1.move(map.getHex(5, 8));
        unit2.move(map.getHex(5, 7));
        unit2.angle = 180;
        clickOnCounter(game, unit1);
        clickOnShockAttackAction(game);
        let shockAttackActuator = getShockAttackActuator(game);
        resetDirectives(actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel);
        clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
        loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d5.png, 481.3294, 162.5, 100, 89)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/dice/d6.png, 421.3294, 222.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, 356.3294, 102, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLevel, widgetsLevel, commandsLevel, itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
        assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
        assert(unit1.hasBeenPlayed()).isTrue();
        assert(game.focusedUnit).isNotDefined();
        assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks unit retreat", () => {
        given:
            var { game, map, player1, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLevel, unitsLevel] = getLevels(game,
                "actuators", "units"
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
            resetDirectives(actuatorsLevel, unitsLevel);
            repaint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -241.5, -169.4375, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 333.3333, -81.1217)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -241.5, -563.1875, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([]);
    });

});