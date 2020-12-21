'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    getDirectives, getLevels, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame,
    CBMap,
    CBUnit,
    CBActuator,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBHexSideId,
    CBHexVertexId, CBCounter, CBAction, CBTroop, CBWing, CBCharacter, CBOrderInstruction
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

    let dummyEvent = {offsetX:0, offsetY:0};

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
        let wing = new CBWing(player);
        let unit = new CBTroop(wing, [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        game.addUnit(unit, map.getHex(5, 8));
        game.start();
        loadAllImages();
        return {game, player, unit, wing, map};
    }

    it("Checks game building", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var [mapLevel, unitsLevel] = getLevels(game, "map","units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let wing = new CBWing(player);
            let unit = new CBTroop(wing, ["/CBlades/images/units/misc/unit.png"]);
            game.addUnit(unit, map.getHex(5, 8));
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
            assert(CBUnit.fromArtifact(unit._imageArtifact)).equalsTo(unit);
            assert(unit.player).equalsTo(player);
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
            var action = new CBAction(game, unit);
            var actuator1 = new CBActuator(action);
            actuator1._element = new DElement();
            var actuator2 = new CBActuator(action);
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
            var [widgetsLevel] = getLevels(game, "widgets");
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
            var [commandsLevel] = getLevels(game, "widget-commands");
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
                    "drawImage(/CBlades/images/commands/settings-inactive.png, 675, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/save-inactive.png, 615, 715, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/load-inactive.png, 555, 715, 50, 50)",
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
            var hexId = map.getHex(3, 4);
        then:
            assert(hexId.col).equalsTo(3);
            assert(hexId.row).equalsTo(4);
            assert(hexId.map).equalsTo(map);
            assert(hexId.similar(map.getHex(3, 4))).isTrue();
            assert(hexId.similar(map.getHex(4, 3))).isFalse();
            assert(hexId.location.toString()).equalsTo("point(-511.5, -885.9375)");
        when:
            var nearHexId = hexId.getNearHex(0);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(3);
            assert(hexId.isNearHex(nearHexId)).equalsTo(0);
        when:
            nearHexId = hexId.getNearHex(60);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(3);
            assert(hexId.isNearHex(nearHexId)).equalsTo(60);
        when:
            nearHexId = hexId.getNearHex(120);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(4);
            assert(hexId.isNearHex(nearHexId)).equalsTo(120);
        when:
            nearHexId = hexId.getNearHex(180);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(5);
            assert(hexId.isNearHex(nearHexId)).equalsTo(180);
        when:
            nearHexId = hexId.getNearHex(240);
        then:
            assert(nearHexId.col).equalsTo(2);
            assert(nearHexId.row).equalsTo(4);
            assert(hexId.isNearHex(nearHexId)).equalsTo(240);
        when:
            nearHexId = hexId.getNearHex(300);
        then:
            assert(nearHexId.col).equalsTo(2);
            assert(nearHexId.row).equalsTo(3);
            assert(hexId.isNearHex(nearHexId)).equalsTo(300);
    });

    it("Checks hexIds on even columns", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId = map.getHex(4, 3);
        then:
            assert(hexId.col).equalsTo(4);
            assert(hexId.row).equalsTo(3);
            assert(hexId.map).equalsTo(map);
            assert(hexId.similar(map.getHex(4, 3))).isTrue();
            assert(hexId.similar(map.getHex(3, 4))).isFalse();
            assert(hexId.location.toString()).equalsTo("point(-341, -984.375)");
        when:
            var nearHexId = hexId.getNearHex(0);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(2);
            assert(hexId.isNearHex(nearHexId)).equalsTo(0);
        when:
            nearHexId = hexId.getNearHex(60);
        then:
            assert(nearHexId.col).equalsTo(5);
            assert(nearHexId.row).equalsTo(3);
            assert(hexId.isNearHex(nearHexId)).equalsTo(60);
        when:
            nearHexId = hexId.getNearHex(120);
        then:
            assert(nearHexId.col).equalsTo(5);
            assert(nearHexId.row).equalsTo(4);
            assert(hexId.isNearHex(nearHexId)).equalsTo(120);
        when:
            nearHexId = hexId.getNearHex(180);
        then:
            assert(nearHexId.col).equalsTo(4);
            assert(nearHexId.row).equalsTo(4);
            assert(hexId.isNearHex(nearHexId)).equalsTo(180);
        when:
            nearHexId = hexId.getNearHex(240);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(4);
            assert(hexId.isNearHex(nearHexId)).equalsTo(240);
        when:
            nearHexId = hexId.getNearHex(300);
        then:
            assert(nearHexId.col).equalsTo(3);
            assert(nearHexId.row).equalsTo(3);
            assert(hexId.isNearHex(nearHexId)).equalsTo(300);
    });

    it("Checks when hexes are NOT near", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
        when:
            var hexId = map.getHex(4, 3);
        then:
            assert(hexId.isNearHex(map.getHex(6, 3))).isFalse();
            assert(hexId.isNearHex(map.getHex(4, 1))).isFalse();
            assert(hexId.isNearHex(map.getHex(4, 5))).isFalse();
            assert(hexId.isNearHex(map.getHex(3, 2))).isFalse();
            assert(hexId.isNearHex(map.getHex(3, 5))).isFalse();
            assert(hexId.isNearHex(map.getHex(5, 2))).isFalse();
            assert(hexId.isNearHex(map.getHex(5, 5))).isFalse();
        when:
            hexId = map.getHex(3, 3);
        then:
            assert(hexId.isNearHex(map.getHex(5, 3))).isFalse();
            assert(hexId.isNearHex(map.getHex(3, 1))).isFalse();
            assert(hexId.isNearHex(map.getHex(3, 5))).isFalse();
            assert(hexId.isNearHex(map.getHex(2, 1))).isFalse();
            assert(hexId.isNearHex(map.getHex(2, 4))).isFalse();
            assert(hexId.isNearHex(map.getHex(4, 1))).isFalse();
            assert(hexId.isNearHex(map.getHex(4, 4))).isFalse();
    });

    it("Checks hexSideIds", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId1 = map.getHex(4, 3);
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
            var hexId1 = map.getHex(4, 3);
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
            var [mapLevel] = getLevels(game, "map");
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
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unit1 = new CBTroop(wing, ["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTroop(wing, ["/CBlades/images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, wing, player};
    }

    function create2PlayersTinyGame() {
        var { game, map } = prepareTinyGame();
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing1 = new CBWing(player1);
        let unit1 = new CBTroop(wing1, ["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 8));
        let wing2 = new CBWing(player2);
        let unit2 = new CBTroop(wing2, ["/CBlades/images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 8));
        game.start();
        loadAllImages();
        return {game, map, unit1, unit2, wing1, wing2, player1, player2};
    }

    it("Checks counter basic appearance and features", () => {
        given:
            var { game, map } = prepareTinyGame();
            let counter = new CBCounter(["/CBlades/images/units/misc/counter.png"], new Dimension2D(50, 50));
            game.addCounter(counter, new Point2D(100, 200));
            game.start();
            loadAllImages();
            counter.angle = 45;
            var [unitsLevel] = getLevels(game, "units");
        when:
            resetDirectives(unitsLevel);
            repaint(game);
        then:
            assert(counter.game).equalsTo(game);
            assert(counter.angle).equalsTo(45);
            assert(counter.element).is(DElement);
            assert(counter.element.artifacts[0]).equalsTo(counter.artifact);
            assert(counter.location.toString()).equalsTo("point(100, 200)");
            assert(counter.viewportLocation.toString()).equalsTo("point(548.8759, 497.7517)");
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 583.4363, 394.0704)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, 75, 175, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            counter.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(counter.location.toString()).equalsTo("point(10, 20)");
            assert(counter.viewportLocation.toString()).equalsTo("point(504.8876, 409.7752)");
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

    it("Checks unit/wing/player structure", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            var unit1 = new CBTroop(wing, ["/CBlades/images/units/misc/unit1.png"]);
            game.addUnit(unit1, map.getHex(5, 8));
            var unit2 = new CBTroop(wing, ["/CBlades/images/units/misc/unit1.png"]);
            game.addUnit(unit2, map.getHex(5, 8));
        then:
            assert(unit1.wing).equalsTo(wing);
            assert(unit1.player).equalsTo(player);
            assert(player.units).unorderedArrayEqualsTo([unit1, unit2]);
    });

    it("Checks unit registration on map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
        when:
            var unit = new CBTroop(wing, ["/CBlades/images/units/misc/unit1.png"]);
            var hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.move(hexId2, 1);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([]);
    });

    it("Checks unit selection/deselection appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLevel] = getLevels(game, "units");
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

    it("Checks unit selection/deselection authorizations", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
        then:
            assert(game.canSelectUnit(unit1)).isTrue();
            assert(game.mayChangeSelection(unit1)).isTrue();
        when:
            unit1.select();
        then:
            assert(game.selectedUnit).equalsTo(unit1);
            assert(game.focusedUnit).isNotDefined();
        when: // if an item is "focused", selection of another item is not possible
            game.setFocusedUnit(unit1);
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
            assert(game.canSelectUnit(unit2)).isFalse();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // can select focused unit
            game.setFocusedUnit(unit2);
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
            assert(game.canSelectUnit(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // No focused unit : selection is possible
            game.setFocusedUnit();
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
            assert(game.canSelectUnit(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isTrue();
        when:
            unit2.select();
        then:
            assert(game.selectedUnit).equalsTo(unit2);
        when:
            unit2.unselect();
        then:
            assert(game.selectedUnit).isNotDefined();
    });

    it("Checks unit selection/deselection regarding actions", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
            var action = new CBAction(game, unit1);
            action.isFinishable = function() { return false;};
        when:
            unit1.select();
            unit1.launchAction(action);
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
        when:
            action.markAsStarted();
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
    });

    it("Checks basic features of actions", () => {
        given:
            var { game, unit } = createTinyGame();
        when:
            var action = new CBAction(game, unit);
            unit.launchAction(action);
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(unit.hasBeenActivated()).isFalse();
        when:
            Memento.open();
            action.markAsStarted();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
        when:
            Memento.open();
            action.markAsFinished();
        then:
            assert(action.isStarted()).isFalse();
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
            assert(action.isFinalized()).isFalse();
        when:
            Memento.open();
            var finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinished()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
            assert(action.isFinalized()).isTrue();
            assert(finalized).isTrue();
        when: // finalization is executed ony once
            finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinalized()).isTrue();
            assert(finalized).isFalse();
        when:
            Memento.undo();
        then:
            assert(action.isFinalized()).isFalse();
        when:
            Memento.undo();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(unit.hasBeenActivated()).isFalse();
        when:
            unit.removeAction();
        then:
            assert(unit.action).isNotDefined();
    });

    it("Checks unit appearance when mouse is over it", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLevel] = getLevels(game, "units");
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
            var [unitsLevel] = getLevels(game, "units");
            var actionLaunched = false;
            player.launchUnitAction = function(unit, event) {
                actionLaunched = true;
            }
        when:
            resetDirectives(unitsLevel);
            mouseClickOnCounter(game, unit)
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
            loadAllImages();
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)", "restore()"
            ]);
        when:   // Check that "reselecting" an already selected unit relaunch action
            actionLaunched = false;
            mouseClickOnCounter(game, unit);
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
    });

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, player1, player2, unit1} = create2PlayersTinyGame();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            unit1.select();
            unit1.launchAction(new CBAction(unit1, dummyEvent));
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

    it("Checks that when a unit cannot be unselected, turn cannot change", () => {
        given:
            var {game, unit1} = create2PlayersTinyGame();
            game.setMenu();
            game.setSelectedUnit(unit1);
            let action = new CBAction(game, unit1);
            action.isFinishable = ()=>false;
            unit1.launchAction(action);
            action.markAsStarted();
        then:
            assert(game._endOfTurnCommand.active).isFalse();
    });

    it("Checks that when a unit is not finishable, turn cannot change", () => {
        given:
            var {game, unit1} = create2PlayersTinyGame();
            game.setMenu();
            unit1.isFinishable = ()=>false;
            Mechanisms.fire(game, CBGame.PROGRESSION);
        then:
            assert(game._endOfTurnCommand.active).isFalse();
    });

    it("Checks that when moving a unit, movement points are adjusted", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLevel, markersLevel] = getLevels(game, "units", "markers");
        when:
            resetDirectives(unitsLevel, markersLevel);
            unit.move(map.getHex(5, 7), 1);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -366.3125, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 7).toString());
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            resetDirectives(unitsLevel, markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 8).toString());
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks unit move from outside the map or out of the map", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLevel] = getLevels(game, "units");
        when:
            resetDirectives(unitsLevel);
            unit.move(null, 0);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.open();
            resetDirectives(unitsLevel);
            unit.move(map.getHex(5, 7), 0);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -366.3125, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 7)");
            assert(unit.isOnBoard()).isTrue();
        when:
            Memento.undo();
            resetDirectives(unitsLevel);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.undo();
            resetDirectives(unitsLevel);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 8)");
            assert(unit.isOnBoard()).isTrue();
    });

    it("Checks rotating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLevel, markersLevel] = getLevels(game, "units", "markers");
        when:
            resetDirectives(unitsLevel, markersLevel);
            unit.rotate(90, 0.5);
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 368.5545, 435.2212)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
            assert(unit.movementPoints).equalsTo(1.5);
            assert(unit.extendedMovementPoints).equalsTo(2.5);
        when:
            resetDirectives(unitsLevel, markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
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
            var [markersLevel] = getLevels(game, "markers");
        then:
            assert(unit.isTired()).isFalse();
            assert(unit.isExhausted()).isFalse();
        when:
            resetDirectives(markersLevel);
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -273.5, -130.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
            assert(unit.isTired()).isTrue();
            assert(unit.isExhausted()).isFalse();
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
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -130.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
            assert(unit.isTired()).isFalse();
            assert(unit.isExhausted()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -130.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
    });

    it("Checks removing a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
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
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -130.4375, 64, 64)",
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
                "drawImage(/CBlades/images/markers/tired.png, -273.5, -130.4375, 64, 64)",
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
                "drawImage(/CBlades/images/markers/exhausted.png, -273.5, -130.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
    });

    it("Checks adding a lack of munitions level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        then:
            assert(unit.areMunitionsScarce()).isFalse();
            assert(unit.areMunitionsExhausted()).isFalse();
        when:
            resetDirectives(markersLevel);
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load scraceamno.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -202.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(1);
            assert(unit.areMunitionsScarce()).isTrue();
            assert(unit.areMunitionsExhausted()).isFalse();
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load lowamno.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -202.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
            assert(unit.areMunitionsScarce()).isFalse();
            assert(unit.areMunitionsExhausted()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -202.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(1);
    });

    it("Checks removing a lack of munitions level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.addOneLackOfMunitionsLevel();
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load lowamno.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -202.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.replenishMunitions();
            paint(game);
            loadAllImages(); // to load scarceamno.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.lackOfMunitions).equalsTo(0);
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -202.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
    });

    it("Checks activating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            unit.launchAction(new CBAction(game, unit))
            unit.action.markAsStarted();
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
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.launchAction(new CBAction(game, unit));
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

    it("Checks giving an order to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.receiveOrder(true);
            paint(game);
            loadAllImages(); // to load ordegiven.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -131.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.hasReceivedOrder()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.hasReceivedOrder()).isFalse();
    });

    it("Checks that playing an order replace (hide) ordergiven marker", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
            unit.receiveOrder(true);
            paint(game);
        when:
            resetDirectives(markersLevel);
            unit.launchAction(new CBAction(game, unit));
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
    });

    it("Checks played status of a unit when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2UnitsTinyGame();
            var [markersLevel] = getLevels(game, "markers");
            player.launchUnitAction = function(unit, event) {
                unit.launchAction(new CBAction(game, unit));
            }
        when:
            player.changeSelection(unit1, dummyEvent);
            unit1.action.markAsStarted();
        then:
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isFalse();
        when:
            mouseClickOnCounter(game, unit2);
            loadAllImages(); // to load actiondone.png
            resetDirectives(markersLevel);
            repaint(game);
        then:
            assert(unit1.action).isDefined();
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
            assert(unit1.action).isNotDefined();
            assert(unit1.hasBeenActivated()).isFalse();
            assert(unit1.hasBeenPlayed()).isFalse();
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks adding cohesion levels to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        then:
            assert(unit.isDisrupted()).isFalse();
            assert(unit.isRouted()).isFalse();
        when:
            resetDirectives(markersLevel);
            unit.disrupt();
            paint(game);
            loadAllImages(); // to load disrupted.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/disrupted.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
            assert(unit.isDisrupted()).isTrue();
            assert(unit.isRouted()).isFalse();
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.addOneCohesionLevel();
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/fleeing.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(2);
            assert(unit.isDisrupted()).isFalse();
            assert(unit.isRouted()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/disrupted.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
    });

    it("Checks removing cohesion levels to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.addOneCohesionLevel();
            unit.addOneCohesionLevel();
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/fleeing.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.rally();
            paint(game);
            loadAllImages(); // to load disrupted.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/disrupted.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
        when:
            Memento.open();
            resetDirectives(markersLevel);
            unit.reorganize();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.cohesion).equalsTo(0);
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/disrupted.png, -273.5, -59.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
    });

    it("Checks taking losses to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLevel] = getLevels(game, "units");
        when:
            resetDirectives(unitsLevel);
            unit.takeALoss();
            paint(game);
            loadAllImages(); // to load back side image
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(unitsLevel);
            unit.takeALoss();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks mark unit as on contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.markAsEngaging(true);
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/contact.png, -273.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks mark unit as charging", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.markAsCharging(true);
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/charge.png, -273.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isTrue();
        when:
            resetDirectives(markersLevel);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks that charge supersedes contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLevel] = getLevels(game, "markers");
        when:
            resetDirectives(markersLevel);
            unit.markAsEngaging(true);
            unit.markAsCharging(true);
            paint(game);
            loadAllImages(); // to load charge.png
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/charge.png, -273.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isTrue();
        when:
            resetDirectives(markersLevel);
            unit.markAsCharging(false);
            loadAllImages();  // to load contact.png
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/markers/contact.png, -273.5, -201.4375, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            resetDirectives(markersLevel);
            unit.markAsEngaging(false);
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    function createTinyCommandGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unit = new CBTroop(wing, [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        game.addUnit(unit, map.getHex(5, 8));
        let leader = new CBCharacter(wing, [
            "/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"
        ]);
        game.addUnit(leader, map.getHex(5, 9));
        game.start();
        loadAllImages();
        return {game, player, unit, leader, wing, map};
    }

    it("Checks leader appearance", () => {
        given:
            var {game, unit, player, leader} = createTinyCommandGame();
            var [unitsLevel, markersLevel] = getLevels(game, "units", "markers");
            unit.move(null, 0);
        when:
            loadAllImages(); // to load charge.png
            resetDirectives(unitsLevel);
            repaint(game);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/leader.png, -230.5, 38.4375, 120, 120)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLevel);
            leader.takeCommand();
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/defend.png, -139.5, 58.4375, 80, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLevel);
            player.changeOrderInstruction(leader, CBOrderInstruction.ATTACK);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/attack.png, -139.5, 58.4375, 80, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLevel);
            leader.dismissCommand();
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks wing management", () => {
        given:
            var {game, unit, leader, player, wing} = createTinyCommandGame();
            Memento.open();
        when:
            wing.setLeader(leader);
        then:
            assert(wing.player).equalsTo(player);
            assert(wing.leader).equalsTo(leader);
        when: // undoing is worthless with setLeader
            Memento.undo();
        then:
            assert(wing.leader).equalsTo(leader);
        when:
            wing.dismissLeader();
        then:
            assert(wing.leader).isNotDefined();
        when:
            Memento.open();
            wing.appointLeader(leader);
            wing.changeOrderInstruction(CBOrderInstruction.REGROUP);
        then:
            assert(wing.leader).equalsTo(leader);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
        when:
            Memento.undo();
        then:
            assert(wing.leader).isNotDefined();
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
    });

});