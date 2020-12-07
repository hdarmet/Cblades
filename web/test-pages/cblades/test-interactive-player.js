'use strict'

'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
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
    Point2D
} from "../../jslib/geometry.js";
import {
    DPopup
} from "../../jslib/widget.js";
import {
    CBArbitrator, CBInteractivePlayer, CBMoveActuator, CBOrientationActuator
} from "../../jslib/cblades/interactive-player.js";

describe("Interactive Player", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    function paint(game) {
        game._board.paint();
    }

    function repaint(game) {
        game._board.repaint();
    }

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var unitsLevel = game._board.getLevel("units");
            var widgetsLevel = game._board.getLevel("widgets");
            var widgetItemsLevel = game._board.getLevel("widget-items");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
        when:
            var transform = counter.element.transform.concat(unitsLevel.transform);
            let unitLocation = transform.point(new Point2D(0, 0));
            resetDirectives(unitsLevel);
            resetDirectives(widgetsLevel);
            resetDirectives(widgetItemsLevel);
            var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(game.selectedUnit).equalsTo(counter);
            loadAllImages();
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)", "restore()"
            ]);
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

    it("Checks move action actuators when unit is oriented toward an hexside", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
        when:
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(counter);
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
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            counter.angle = 30;
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
        when:
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(counter);
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
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var actuatorsLevel = game._board.getLevel("actuators");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
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
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter1 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            let counter2 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter1, new CBHexId(map, 5, 8));
            game.addCounter(counter2, new CBHexId(map, 8, 7));
            game.start();
        when:
            clickOnCounter(game, counter1);
            clickOnActionMenu(game, 0, 0);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(counter1);
            assert(moveActuator).isDefined();
            assert(orientationActuator).isDefined();
        when:
            clickOnCounter(game, counter2);
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedUnit).equalsTo(counter2);
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks mouse move over a trigger of a move actuator", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var actuatorsLevel = game._board.getLevel("actuators");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
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
            var game = new CBGame();
            var arbitrator = new CBArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBInteractivePlayer();
            game.addPlayer(player);
            var actuatorsLevel = game._board.getLevel("actuators");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
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

    function createTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player = new CBInteractivePlayer();
        game.addPlayer(player);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addCounter(counter, new CBHexId(map, 5, 8));
        game.start();
        return {game, map, player, counter};
    }

    function clickOnCounter(game, counter) {
        let unitLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnTrigger(game, trigger) {
        let triggerLocation = trigger.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:triggerLocation.x, offsetY:triggerLocation.y});
        trigger.onMouseClick(mouseEvent);
        paint(game);
        Memento.open();
    }

    function clickOnActionMenu(game, col, row) {
        var icon = DPopup._instance.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
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
            var {game, counter} = createTinyGame()
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            loadAllImages();
            var moveActuator1 = getMoveActuator(game);
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(counter.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assert(counter.hexLocation.col).equalsTo(5);
            assert(counter.hexLocation.row).equalsTo(8);
            assert(counter.angle).equalsTo(0);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(0));
        then:
            assert(counter.hexLocation.col).equalsTo(5);
            assert(counter.hexLocation.row).equalsTo(7);
        when:
            var moveActuator2 = getMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator2.getTrigger(60));
        then:
            assert(counter.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(counter.angle).equalsTo(60);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator3.getTrigger(60));
        then:
            assert(counter.location.toString()).equalsTo("point(0, -393.75)");
            assert(counter.hexLocation.col).equalsTo(6);
            assert(counter.hexLocation.row).equalsTo(6);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(counter.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(counter.hexLocation.col).equalsTo(5);
            assert(counter.hexLocation.row).equalsTo(7);
            assert(counter.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(counter.location.toString()).equalsTo("point(0, -393.75)");
            assert(counter.hexLocation.col).equalsTo(6);
            assert(counter.hexLocation.row).equalsTo(6);
            assert(counter.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
    });

    it("Checks Unit move using actuators (rotate, move, rotate)", () => {
        given:
            var {game, counter} = createTinyGame()
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            loadAllImages();
            var moveActuator1 = getMoveActuator(game);
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(counter.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assert(counter.hexLocation.col).equalsTo(5);
            assert(counter.hexLocation.row).equalsTo(8);
            assert(counter.angle).equalsTo(0);
        when:
            clickOnTrigger(game, orientationActuator1.getTrigger(60));
        then:
            assert(counter.angle).equalsTo(60);
        when:
            var moveActuator2 = getMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator2.getTrigger(60));
        then:
            assert(counter.location.toString()).equalsTo("point(0, -196.875)");
            assert(counter.hexLocation.col).equalsTo(6);
            assert(counter.hexLocation.row).equalsTo(7);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getTrigger(90));
        then:
            assert(counter.angle).equalsTo(90);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(counter.location.toString()).equalsTo("point(0, -196.875)");
            assert(counter.hexLocation.col).equalsTo(6);
            assert(counter.hexLocation.row).equalsTo(7);
            assert(counter.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(counter.location.toString()).equalsTo("point(0, -196.875)");
            assert(counter.hexLocation.col).equalsTo(6);
            assert(counter.hexLocation.row).equalsTo(7);
            assert(counter.angle).equalsTo(90);
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
            var {game, counter} = createTinyGame();
            loadAllImages();
            paint(game);
            resetAllDirectives(game);
        when:
            clickOnCounter(game, counter);
            loadAllImages();
            resetAllDirectives(game);
            clickOnActionMenu(game, 0, 0);
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
            var {game, counter} = createTinyGame()
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(counter.movementPoints).equalsTo(2);
            assert(counter.extendedMovementPoints).equalsTo(3);
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
        then:
            assert(counter.movementPoints).equalsTo(1);
            assert(counter.extendedMovementPoints).equalsTo(2);
        when:
            var orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(60));
        then:
            assert(counter.movementPoints).equalsTo(0.5);
            assert(counter.extendedMovementPoints).equalsTo(1.5);
        when:
            Memento.undo();
        then:
            assert(counter.movementPoints).equalsTo(1);
            assert(counter.extendedMovementPoints).equalsTo(2);
        when:
            Memento.redo();
        then:
            assert(counter.movementPoints).equalsTo(0.5);
            assert(counter.extendedMovementPoints).equalsTo(1.5);
    });

    it("Checks that extended move is proposed when unit does not have enough movement point", () => {
        given:
            var {game, counter} = createTinyGame()
            counter.movementPoints = 1;
            counter.extendedMovementPoints = 2;
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
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
            assert(moveActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isNotDefined();
    });

    it("Checks that minimal move is proposed as first move when there are not enough movement points", () => {
        given:
            var {game, counter} = createTinyGame()
            counter.movementPoints = 0.5;
            counter.extendedMovementPoints = 0.5;
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(counter.movementPoints).equalsTo(0.5);
            assert(counter.extendedMovementPoints).equalsTo(0.5);
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/minimal-move.png");
    });

    it("Checks Unit tiredness progression (fresh -> tired -> exhausted)", () => {
        given:
            var {game, counter} = createTinyGame();
            var unitsLevel = game._board.getLevel("units");
            var markersLevel = game._board.getLevel("markers");
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            counter.movementPoints = 0.5;
            loadAllImages();
            paint(game);
            var moveActuator1 = getMoveActuator(game);
        when:
            resetDirectives(markersLevel);
            resetDirectives(unitsLevel);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(counter.tiredness).equalsTo(1);
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -366.3125, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -320.3125, 64, 64)",
                "restore()"
            ]);
        when:
            game.nextTurn();
            counter.movementPoints = 0.5;
            clickOnCounter(game, counter);
            clickOnActionMenu(game, 0, 0);
            paint(game);
            resetDirectives(markersLevel);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(counter.tiredness).equalsTo(2);
            assert(counter.hasBeenPlayed()).isTrue();   // Unit is played automatically because no further movement/reorientation is possble
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -517.1875, 64, 64)",
                "restore()",
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/actiondone.png, -131.5, -595.1875, 64, 64)",
                "restore()"
            ]);
    });

    function create1Player2UnitsTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player = new CBInteractivePlayer();
        game.addPlayer(player);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let counter1 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addCounter(counter1, new CBHexId(map, 5, 8));
        let counter2 = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addCounter(counter2, new CBHexId(map, 6, 7));
        game.start();
        return {game, map, player, counter1, counter2};
    }

    it("Checks activating/playing a unit", () => {
        given:
            var {game, counter1, counter2} = create1Player2UnitsTinyGame();
            var markersLevel = game._board.getLevel("markers");
            clickOnCounter(game, counter1);
            clickOnActionMenu(game, 0, 0);
        when:
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
        then:
            assert(counter1.hasBeenActivated()).isTrue();
            assert(counter1.hasBeenPlayed()).isFalse();
        when:
            clickOnCounter(game, counter2);
            loadAllImages();
            resetDirectives(markersLevel);
            repaint(game);
        then:
            assert(counter1.hasBeenActivated()).isTrue();
            assert(counter1.hasBeenPlayed()).isTrue();
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/actiondone.png, -131.5, -398.3125, 64, 64)",
                "restore()"
            ]);
        when:   // changing turn reset played status
            game.nextTurn();
            resetDirectives(markersLevel);
            repaint(game);
        then:
            assert(counter1.hasBeenActivated()).isFalse();
            assert(counter1.hasBeenPlayed()).isFalse();
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
    });

});