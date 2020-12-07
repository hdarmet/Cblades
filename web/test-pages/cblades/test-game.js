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
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame,
    CBHexId,
    CBMap,
    CBUnit,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBHexSideId,
    CBHexVertexId
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
        Memento.clear();
    });

    function paint(game) {
        game._board.paint();
    }

    function repaint(game) {
        game._board.repaint();
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
            assert(arbitrator.game).equalsTo(game);
            assert(player.game).equalsTo(game);
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

    it("Checks global push buttons menu", () => {
        given:
            var game = new CBGame();
            var commandsLevel = game._board.getLevel("widget-commands");
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

    it("Checks unit selection/deselection appearance", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
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
                "clearRect(0, 0, 1000, 800)",
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
                "clearRect(0, 0, 1000, 800)",
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
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
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
            assert(game.selectedUnit).equalsTo(counter1);
        when:
            counter2.select();
        then:
            assert(game.selectedUnit).equalsTo(counter2);
        when:
            counter2.unselect();
        then:
            assert(game.selectedUnit).isNotDefined();
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

    it("Checks unit appearance when mouse is over it", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit(player, "/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
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
            mouseMoveOnCounter(game, counter);
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
            mouseMoveOutOfCounter(game, counter);
        then:
            assert(getDirectives(unitsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            counter.select();
            paint(game);
            resetDirectives(unitsLevel);
            mouseMoveOnCounter(game, counter);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLevel);
            mouseMoveOutOfCounter(game, counter);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([]);
    });

    function create2PlayersTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBAbstractArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let counter1 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(counter1, new CBHexId(map, 5, 8));
        let counter2 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(counter2, new CBHexId(map, 5, 8));
        game.start();
        loadAllImages();
        return {game, map, counter1, counter2, player1, player2};
    }

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, counter1, player1, counter2, player2} = create2PlayersTinyGame();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            counter1.select();
            counter2.onMouseClick({offsetX:0, offsetY:0});  // Not executed ! Player2 is not the current player
        then:
            assert(game.selectedUnit).equalsTo(counter1);
        when:
            counter1.movementPoints = 0.5;
            counter1.extendedMovementPoints = 0.5;
            game.nextTurn();
        then:
            assert(counter1.movementPoints).equalsTo(2);
            assert(counter2.extendedMovementPoints).equalsTo(3);
    });

    it("Checks next turn push buttons menu", () => {
        given:
            var game = new CBGame();
            var commandsLevel = game._board.getLevel("widget-commands");
            let player1 = new CBAbstractPlayer();
            game.addPlayer(player1);
            let player2 = new CBAbstractPlayer();
            game.addPlayer(player2);
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            game._endOfTurnCommand.action();
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

});