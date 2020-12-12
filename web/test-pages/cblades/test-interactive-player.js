'use strict'

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
    filterPainting, getDirectives,
    loadAllImages,
    mockPlatform, removeFilterPainting, resetDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame, CBHexId, CBMap, CBUnit
} from "../../jslib/cblades/game.js";
import {
    DDice,
    DPopup, DResult
} from "../../jslib/widget.js";
import {
    CBArbitrator, CBInteractivePlayer, CBMoveActuator, CBOrientationActuator
} from "../../jslib/cblades/interactive-player.js";

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
        game.addCounter(unit, map.getHex( 5, 8));
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
        let counter1 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(counter1, map.getHex(5, 8));
        let counter2 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(counter2, map.getHex(6, 8));
        game.start();
        loadAllImages();
        return {game, map, counter1, counter2, player1, player2};
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
        game.addCounter(unit1, map.getHex(5, 8));
        game.addCounter(unit2, map.getHex( 8, 7));
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
            var unitsLevel = game.board.getLevel("units");
            var widgetsLevel = game.board.getLevel("widgets");
            var widgetItemsLevel = game.board.getLevel("widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLevel);
            resetDirectives(widgetsLevel);
            resetDirectives(widgetItemsLevel);
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
                "save()", "drawImage(/CBlades/images/icons/leave-formation.png, 306.6666666666667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/dismiss-formation.png, 366.6666666666667, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/change-orders.png, 306.6666666666667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/give-specific-orders.png, 366.6666666666667, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-fusion.png, 306.6666666666667, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-many.png, 366.6666666666667, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/move.png, 186.66666666666669, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/move-back.png, 246.66666666666669, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/escape.png, 306.6666666666667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/to-face.png, 366.6666666666667, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/shock-attack-gray.png, 186.66666666666669, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-attack-gray.png, 246.66666666666669, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/shock-duel-gray.png, 306.6666666666667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-duel-gray.png, 366.6666666666667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-rest-gray.png, 186.66666666666669, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-reload.png, 246.66666666666669, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-reorganize.png, 306.6666666666667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-rally.png, 366.6666666666667, 135, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/create-formation.png, 186.66666666666669, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/join-formation.png, 246.66666666666669, 195, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/take-command.png, 186.66666666666669, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/leave-command.png, 246.66666666666669, 255, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/select-spell.png, 186.66666666666669, 315, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/cast-spell.png, 246.66666666666669, 315, 50, 50)", "restore()"
            ]);
    });

    it("Checks that a unit cannot be selected if it not belongs to the current player", () => {
        given:
            var {game, counter1, player1, counter2} = create2PlayersTinyGame();
            counter1.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            counter2.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.selectedUnit).equalsTo(counter1);
        when:
            counter2.onMouseClick({offsetX:0, offsetY:0});  // Not executed ! Player2 is not the current player
        then:
            assert(game.selectedUnit).equalsTo(counter1);
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
            var actuatorsLevel = game.board.getLevel("actuators");
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
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
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
            var actuatorsLevel = game._board.getLevel("actuators");
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
            var actuatorsLevel = game._board.getLevel("actuators");
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
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOnTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOutOfTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 408.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
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
        var unitsLevel = game._board.getLevel("units");
        var markersLevel = game._board.getLevel("markers");
        var actuatorsLevel = game._board.getLevel("actuators");
        resetDirectives(unitsLevel);
        resetDirectives(markersLevel);
        resetDirectives(actuatorsLevel);
    }

    function registerAllDirectives(game) {
        var unitsLevel = game._board.getLevel("units");
        var markersLevel = game._board.getLevel("markers");
        var actuatorsLevel = game._board.getLevel("actuators");
        return {
            units:[...getDirectives(unitsLevel)],
            markers:[...getDirectives(markersLevel)],
            actuators:[...getDirectives(actuatorsLevel)]
        };
    }

    function assertAllDirectives(game, picture) {
        var unitsLevel = game._board.getLevel("units");
        var markersLevel = game._board.getLevel("markers");
        var actuatorsLevel = game._board.getLevel("actuators");
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
            var unitsLevel = game._board.getLevel("units");
            var markersLevel = game._board.getLevel("markers");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            unit.movementPoints = 0.5;
            loadAllImages();
            paint(game);
            var moveActuator1 = getMoveActuator(game);
        when:
            resetDirectives(markersLevel);
            resetDirectives(unitsLevel);
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
            let widgetsLevel = game.board.getLevel("widgets");
            let itemsLevel = game.board.getLevel("widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            paint(game);
        when:
            resetDirectives(widgetsLevel);
            resetDirectives(itemsLevel);
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
            resetDirectives(widgetsLevel);
            resetDirectives(itemsLevel);
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
        let itemsLevel = game.board.getLevel("widget-items");
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
        let itemsLevel = game.board.getLevel("widget-commands");
        for (let item of itemsLevel.artifacts) {
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

    it("Checks successfully resting action process ", () => {
        given:
            var {game, unit} = createTinyGame();
            let widgetsLevel = game.board.getLevel("widgets");
            let commandsLevel = game.board.getLevel("widget-commands");
            let itemsLevel = game.board.getLevel("widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel);
            resetDirectives(itemsLevel);
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
            resetDirectives(widgetsLevel);
            resetDirectives(commandsLevel);
            resetDirectives(itemsLevel);
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
            let widgetsLevel = game.board.getLevel("widgets");
            let commandsLevel = game.board.getLevel("widget-commands");
            let itemsLevel = game.board.getLevel("widget-items");
            unit.addOneTirednessLevel();
            clickOnCounter(game, unit);
            clickOnRestAction(game);
            loadAllImages();
        when:
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLevel);
            resetDirectives(itemsLevel);
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
            resetDirectives(widgetsLevel);
            resetDirectives(commandsLevel);
            resetDirectives(itemsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
            assert(unit.hasBeenPlayed()).isTrue();
            assert(unit.tiredness).equalsTo(1);
    });

});