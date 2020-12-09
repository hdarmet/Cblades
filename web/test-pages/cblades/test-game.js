'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    getDirectives, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame,
    CBHexId,
    CBMap,
    CBUnit,
    CBActuator,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBHexSideId,
    CBHexVertexId, CBCounter
} from "../../jslib/cblades/game.js";
import {
    DBoard, DElement
} from "../../jslib/board.js";
import {
    Dimension2D,
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
        Memento.clear();
    });

    function paint(game) {
        game._board.paint();
    }

    function repaint(game) {
        game._board.repaint();
    }

    function prepareTinyGame() {
        var game = new CBGame();
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        return {game, map};
    }

    function createTinyGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let unit = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
        game.addCounter(unit, new CBHexId(map, 5, 8));
        game.start();
        loadAllImages();
        return {game, player, unit, map};
    }

    it("Checks game building", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
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
            assert(game.board).is(DBoard);
            assert(arbitrator.game).equalsTo(game);
            assert(game.arbitrator).equalsTo(arbitrator);
            assert(player.game).equalsTo(game);
            assert(game.currentPlayer).equalsTo(player);
            assert(CBMap.fromArtifact(map._imageArtifact)).equalsTo(map);
            assert(CBUnit.fromArtifact(counter._imageArtifact)).equalsTo(counter);
            assert(counter.player).equalsTo(player);
            assert(getDirectives(mapLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 400)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 400)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks actuators management", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            var actuator1 = new CBActuator(unit);
            actuator1._element = new DElement();
            var actuator2 = new CBActuator(unit);
            actuator2._element = new DElement();
            game.openActuator(actuator1);
        then:
            assert(actuator1.unit).equalsTo(unit);
            assert(game.actuators).arrayEqualsTo([actuator1]);
        when:
            Memento.open();
            game.closeActuators();
            game.openActuator(actuator2);
        then:
            assert(game.actuators).arrayEqualsTo([actuator2]);
        when:
            Memento.undo();
        then:
            assert(game.actuators).arrayEqualsTo([actuator1]);
        when:
            game.openActuator(actuator2);
        then:
            assert(game.actuators).arrayEqualsTo([actuator1, actuator2]);
        when:
            game.removeActuators();
        then:
            assert(game.actuators).arrayEqualsTo([]);
    });

    it("Checks popup management", () => {
        given:
            var {game} = createTinyGame();
            var widgetsLevel= game.board.getLevel("widgets");
            resetDirectives(widgetsLevel);
        when:
            var popup = new DPopup(new Dimension2D(100, 200));
            game.openPopup(popup, new Point2D(10, 20));
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000",
                    "lineWidth = 1",
                    "setTransform(1, 0, 0, 1, 55, 105)",
                    "strokeRect(-50, -100, 100, 200)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -100, 100, 200)",
                "restore()"
            ]);
    });

    it("Checks global push buttons menu", () => {
        given:
            var game = new CBGame();
            var commandsLevel = game.board.getLevel("widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(commandsLevel, 5)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, 915, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/show.png, 855, 715, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._showCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, 915, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/hide.png, 855, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/undo.png, 795, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/redo.png, 735, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/settings.png, 675, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/save.png, 615, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/load.png, 555, 715, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._hideCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
            "save()",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/turn.png, 915, 715, 50, 50)",
            "restore()",
            "save()",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/show.png, 855, 715, 50, 50)",
            "restore()"
        ]);
    });

    it("Checks undo/redo push buttons menu", () => {
        given:
            var game = new CBGame();
            var commandsLevel = game._board.getLevel("widget-commands");
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
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
            assert(getDirectives(mapLevel)[1]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 400)");
        when:
            resetDirectives(mapLevel);
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:410});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(getDirectives(mapLevel)[0]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 390)");
    });

    function mouseMoveOnCounter(game, counter) {
        let unitLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfCounter(game, counter) {
        let unitArea = counter.artifact.viewportBoundingArea;
        var mouseEvent = createEvent("mousemove", {offsetX:unitArea.left-5, offsetY:unitArea.top});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseClickOnCounter(game, counter) {
        let counterLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:counterLocation.x, offsetY:counterLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function create2UnitsTinyGame() {
        var { game, map } = prepareTinyGame();
        let player = new CBAbstractPlayer();
        player.selectUnit = function(unit, event) {unit.select()}
        game.addPlayer(player);
        let unit1 = new CBUnit(player, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(unit1, new CBHexId(map, 5, 8));
        let unit2 = new CBUnit(player, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(unit2, new CBHexId(map, 5, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, player};
    }

    function create2PlayersTinyGame() {
        var { game, map } = prepareTinyGame();
        let player1 = new CBAbstractPlayer();
        player1.selectUnit = function(unit, event) {unit.select()}
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        player2.selectUnit = function(unit, event) {unit.select()}
        game.addPlayer(player2);
        let unit1 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(unit1, new CBHexId(map, 5, 8));
        let unit2 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(unit2, new CBHexId(map, 5, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, player1, player2};
    }

    it("Checks counter basic appearnce and features", () => {
        given:
            var { game, map } = prepareTinyGame();
            let counter = new CBCounter("/CBlades/images/units/misc/counter.png", new Dimension2D(50, 50));
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
            counter.angle = 45;
            var unitsLevel = game.board.getLevel("units");
        when:
            resetDirectives(unitsLevel);
            repaint(game);
        then:
            assert(counter.game).equalsTo(game);
            assert(counter.angle).equalsTo(45);
            assert(counter.element).is(DElement);
            assert(counter.element.artifacts[0]).equalsTo(counter.artifact);
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 500, 400)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            counter.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(counter.location.toString()).equalsTo("point(10, 20)");
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 508.3436, 399.407)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -15, -5, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            paint(game);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLevel);
            counter.refresh();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 508.3436, 399.407)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -15, -5, 50, 50)",
                "restore()"
            ]);
        when:
            mouseClickOnCounter(game, counter); // checks that tests does not crash
    });

    it("Checks unit selection/deselection appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var unitsLevel = game.board.getLevel("units");
        when:
            resetDirectives(unitsLevel);
            unit.select();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            unit.unselect();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks unit selection/deselection", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
        when:
            unit1.select();
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit2.select();
        then:
            assert(game.selectedUnit).equalsTo(unit2);
        when:
            unit2.unselect();
        then:
            assert(game.selectedUnit).isNotDefined();
    });

    it("Checks unit appearance when mouse is over it", () => {
        given:
            var { game, unit } = createTinyGame();
            var unitsLevel = game.board.getLevel("units");
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 6)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00FFFF",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            unit.select();
            paint(game);
            resetDirectives(unitsLevel);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLevel);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([]);
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var { game, player, unit } = createTinyGame();
            player.selectUnit = function(unit, event) {unit.select();};
            var unitsLevel = game.board.getLevel("units");
        when:
            resetDirectives(unitsLevel);
            mouseClickOnCounter(game, unit)
        then:
            assert(game.selectedUnit).equalsTo(unit);
            loadAllImages();
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)", "restore()"
            ]);
    });

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, player1, player2, unit1} = create2PlayersTinyGame();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            unit1.select();
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit1.movementPoints = 0.5;
            unit1.extendedMovementPoints = 0.5;
            game.nextTurn();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(unit1.movementPoints).equalsTo(2);
            assert(unit1.extendedMovementPoints).equalsTo(3);
    });

    it("Checks next turn push buttons menu", () => {
        given:
            var {game, player1, player2} = create2PlayersTinyGame();
            game.setMenu();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            game._endOfTurnCommand.action();
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

    it("Checks moving a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var unitLevel = game.board.getLevel("units");
            var markersLevel = game.board.getLevel("markers");
        when:
            resetDirectives(unitLevel);
            resetDirectives(markersLevel);
            unit.move(new CBHexId(map, 5, 7), 1);
            paint(game);
        then:
            assert(getDirectives(unitLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -366.3125, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(new CBHexId(map, 5, 7).toString());
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            resetDirectives(unitLevel);
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(new CBHexId(map, 5, 8).toString());
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks rotating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var unitLevel = game.board.getLevel("units");
            var markersLevel = game.board.getLevel("markers");
        when:
            resetDirectives(unitLevel);
            resetDirectives(markersLevel);
            unit.rotate(90, 0.5);
            paint(game);
        then:
            assert(getDirectives(unitLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 368.5545, 435.2212)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
            assert(unit.movementPoints).equalsTo(1.5);
            assert(unit.extendedMovementPoints).equalsTo(2.5);
        when:
            resetDirectives(unitLevel);
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"]);
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks adding a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var markersLevel = game.board.getLevel("markers");
        when:
            resetDirectives(markersLevel);
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load exhausted.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
    });

    it("Checks removing a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var markersLevel = game.board.getLevel("markers");
        when:
            resetDirectives(markersLevel);
            unit.addOneTirednessLevel();
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.removeOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -123.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
    });

    it("Checks activating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            unit.markAsBeingActivated();
        then:
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks playing a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var markersLevel = game.board.getLevel("markers");
        when:
            resetDirectives(markersLevel);
            unit.markAsBeingPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -131.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks played status of a unit when selection is changed or turn is changed", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            var markersLevel = game.board.getLevel("markers");
        when:
            unit1.select();
            unit1.markAsBeingActivated();
        then:
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isFalse();
        when:
            mouseClickOnCounter(game, unit2);
            loadAllImages(); // to load actiondone.png
            resetDirectives(markersLevel);
            repaint(game);
        then:
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -131.5, -201.4375, 64, 64)",
                "restore()"
            ]);
        when:   // changing turn reset played status
            game.nextTurn();
            resetDirectives(markersLevel);
            repaint(game);
        then:
            assert(unit1.hasBeenActivated()).isFalse();
            assert(unit1.hasBeenPlayed()).isFalse();
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
    });

});