'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent, filterPainting,
    getDirectives, loadAllImages, mockPlatform, removeFilterPainting, resetDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms
} from "../../jslib/mechanisms.js";
import {
    CBGame, CBHexId, CBMap, CBUnit, CBPlayer, CBHexSideId, CBHexVertexId, CBMoveActuator, CBOrientationActuator
} from "../../jslib/cblades/game.js";
import {
    Point2D
} from "../../jslib/geometry.js";
import {
    DPopup
} from "../../jslib/widget.js";

describe("Game", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    function paint(game) {
        game._board.paint();
    }

    it("Checks game building", () => {
        given:
            var player = new CBPlayer();
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
        when:
            game.start();
            loadAllImages();
        then:
            assert(CBMap.fromArtifact(map._imageArtifact)).equalsTo(map);
            assert(CBUnit.fromArtifact(counter._imageArtifact)).equalsTo(counter);
            assert(counter.player).equalsTo(player);
            assert(getDirectives(mapLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks hexIds on odd columns", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId = new CBHexId(map, 3, 4);
        then:
            assert(hexId.col).equalsTo(3);
            assert(hexId.row).equalsTo(4);
            assert(hexId.map).equalsTo(map);
            assert(hexId.similar(new CBHexId(map, 3, 4))).isTrue();
            assert(hexId.similar(new CBHexId(map, 4, 3))).isFalse();
            assert(hexId.location.toString()).equalsTo("point(-511.5, -885.9375)");
        when:
            var nearHexId = hexId.getNearHex(0);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(3);
        when:
            nearHexId = hexId.getNearHex(60);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(3);
        when:
            nearHexId = hexId.getNearHex(120);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(4);
        when:
            nearHexId = hexId.getNearHex(180);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(5);
        when:
            nearHexId = hexId.getNearHex(240);
        then:
            assert(nearHexId.col).equalsTo(2);
            assert(nearHexId.row).equalsTo(4);
        when:
            nearHexId = hexId.getNearHex(300);
        then:
            assert(nearHexId.col).equalsTo(2);
            assert(nearHexId.row).equalsTo(3);
    });

    it("Checks hexIds on even columns", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId = new CBHexId(map, 4, 3);
        then:
            assert(hexId.col).equalsTo(4);
            assert(hexId.row).equalsTo(3);
            assert(hexId.map).equalsTo(map);
            assert(hexId.similar(new CBHexId(map, 4, 3))).isTrue();
            assert(hexId.similar(new CBHexId(map, 3, 4))).isFalse();
            assert(hexId.location.toString()).equalsTo("point(-341, -984.375)");
        when:
            var nearHexId = hexId.getNearHex(0);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(2);
        when:
            nearHexId = hexId.getNearHex(60);
        then:
            assert(nearHexId.col).equalsTo(5);
            assert(nearHexId.row).equalsTo(3);
        when:
            nearHexId = hexId.getNearHex(120);
        then:
            assert(nearHexId.col).equalsTo(5);
            assert(nearHexId.row).equalsTo(4);
        when:
            nearHexId = hexId.getNearHex(180);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(4);
        when:
            nearHexId = hexId.getNearHex(240);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(4);
        when:
            nearHexId = hexId.getNearHex(300);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(3);
    });

    it("Checks hexSideIds", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId1 = new CBHexId(map, 4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexSide = new CBHexSideId(hexId1, hexId2);
        then:
            assert(hexSide.fromHex).equalsTo(hexId1);
            assert(hexSide.toHex).equalsTo(hexId2);
            assert(hexSide.angle).equalsTo(60);
            assert(hexSide.similar(new CBHexSideId(hexId1, hexId2))).isTrue();
            assert(hexSide.similar(new CBHexSideId(hexId2, hexId1))).isTrue();
            assert(hexSide.similar(new CBHexSideId(hexId3, hexId1))).isFalse();
            assert(hexSide.location.toString()).equalsTo("point(-255.75, -1033.5937)");
    });

    it("Checks hexVertexIds", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId1 = new CBHexId(map, 4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexId4 = hexId1.getNearHex(300);
            var hexVertex = new CBHexVertexId(hexId1, hexId2, hexId3);
        then:
            assert(hexVertex.fromHex).equalsTo(hexId1);
            assert(hexVertex.toHexSide.similar(new CBHexSideId(hexId2, hexId3))).isTrue();
            assert(hexVertex.angle).equalsTo(90);
            assert(hexVertex.similar(new CBHexVertexId(hexId1, hexId2, hexId3))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId3, hexId2, hexId1))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId4, hexId1, hexId2))).isFalse();
            assert(hexVertex.location.toString()).equalsTo("point(-227.3333, -984.375)");
    });

    it("Checks that clicking on the map re-centers the viewport ", () => {
        given:
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(mapLevel)[1]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 250)");
        when:
            resetDirectives(mapLevel);
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:260});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(getDirectives(mapLevel)[0]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 240)");
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var game = new CBGame();
            var player = new CBPlayer();
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
            assert(CBUnit.selected).equalsTo(counter);
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
                "save()", "drawImage(/CBlades/images/icons/shock-attack.png, 186.66666666666669, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-attack.png, 246.66666666666669, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/shock-duel.png, 306.6666666666667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/fire-duel.png, 366.6666666666667, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/do-rest.png, 186.66666666666669, 135, 50, 50)", "restore()",
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

    it("Checks unit selection/deselection appearance", () => {
        given:
            var player = new CBPlayer();
            var game = new CBGame();
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
        when:
            resetDirectives(unitsLevel);
            counter.select();
            paint(game);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            counter.unselect();
            paint(game);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks unit selection/deselection", () => {
        given:
            var player = new CBPlayer();
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter1 = new CBUnit(player, "/CBlades/images/units/misc/unit1.png");
            let counter2 = new CBUnit(player, "/CBlades/images/units/misc/unit2.png");
            game.addCounter(counter1, new CBHexId(map, 5, 8));
            game.addCounter(counter2, new CBHexId(map, 8, 5));
            game.start();
            loadAllImages();
        when:
            counter1.select();
        then:
            assert(CBUnit.selected).equalsTo(counter1);
        when:
            counter2.select();
        then:
            assert(CBUnit.selected).equalsTo(counter2);
        when:
            counter2.unselect();
        then:
            assert(CBUnit.selected).isNotDefined();
    });

    function clickOnCounter(game, counter) {
        var unitsLevel = game._board.getLevel("units");
        var transform = counter.element.transform.concat(unitsLevel.transform);
        let unitLocation = transform.point(new Point2D(0, 0));
        var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function clickOnActionMenu(game, col, row) {
        var icon = DPopup._instance.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function mouseMoveOnCounter(game, counter) {
        var unitsLevel = game._board.getLevel("units");
        var transform = counter.element.transform.concat(unitsLevel.transform);
        let unitLocation = transform.point(new Point2D(0, 0));
        var mouseEvent = createEvent("mousemove", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOnTrigger(game, trigger) {
        let actuatorLocation = trigger.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:actuatorLocation.x, offsetY:actuatorLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfTrigger(game) {
        var mouseEvent = createEvent("mousemove", {offsetX:20, offsetY:20});
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

    it("Checks move action actuators when unit is oriented toward an hexside", () => {
        given:
            var game = new CBGame();
            var player = new CBPlayer();
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
            assert(CBUnit.selected).equalsTo(counter);
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
            var player = new CBPlayer();
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
            assert(CBUnit.selected).equalsTo(counter);
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
            var player = new CBPlayer();
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
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 258.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
    });

    it("Checks that a unit selection closes the actuators", () => {
        given:
            var game = new CBGame();
            var player = new CBPlayer();
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
            assert(CBUnit.selected).equalsTo(counter1);
            assert(moveActuator).isDefined();
            assert(orientationActuator).isDefined();
        when:
            clickOnCounter(game, counter2);
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(CBUnit.selected).equalsTo(counter2);
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks mouse move over a trigger of a move actuator", () => {
        given:
            var game = new CBGame();
            var player = new CBPlayer();
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
            var player = new CBPlayer();
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
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 258.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOnTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 258.6841)",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
        when:
            resetDirectives(actuatorsLevel);
            mouseMoveOutOfTrigger(game, orientationActuator.getTrigger(30));
            paint(game);
        then:
            assert(getDirectives(actuatorsLevel)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 438.2428, 258.6841)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -126.3325, -266.8984375, 60, 80)"
            ]);
    });

});