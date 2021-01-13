'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame,
    CBMap,
    CBActuator,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBHexSideId,
    CBHexVertexId,
    CBCounter,
    CBAction, CBAbstractUnit, CBMoveType
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

    class CBTestUnit extends CBAbstractUnit {
        constructor(player, paths) {
            super(paths, new Dimension2D(142, 142));
            this.player = player;
        }

        updatePlayed() {
            this.status = "played";
        }

        reset(player) {
            super.reset(player);
            if (player === this.player) {
                delete this.status;
            }
        }
    }

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
        let unit = new CBTestUnit(player, [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        game.addUnit(unit, map.getHex(5, 8));
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
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units-0");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(mapLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 500, 400)",
                    "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
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
            var [widgetsLevel] = getLayers(game.board, "widgets");
            resetDirectives(widgetsLevel);
        when:
            var popup1 = new DPopup(new Dimension2D(100, 200));
            game.openPopup(popup1, new Point2D(10, 20));
            paint(game);
        then:
            assert(game.popup).equalsTo(popup1);
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 55, 105)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-50, -100, 100, 200)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -100, 100, 200)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLevel);
            var popup2 = new DPopup(new Dimension2D(150, 250));
            game.openPopup(popup2, new Point2D(15, 25));
            paint(game);
        then:
            assert(game.popup).equalsTo(popup2);
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 80, 130)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-75, -125, 150, 250)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-75, -125, 150, 250)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(widgetsLevel);
            game.closePopup();
            paint(game);
        then:
            assert(game.popup).isNotDefined();
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
        when:
            Memento.undo();
            resetDirectives(widgetsLevel);
            paint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 80, 130)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-75, -125, 150, 250)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-75, -125, 150, 250)",
                "restore()"
            ]);
    });

    it("Checks global push buttons menu", () => {
        given:
            var game = new CBGame();
            var [commandsLevel] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/show.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._showCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/hide.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 820, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/undo.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 760, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/redo.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 700, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/settings-inactive.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 640, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/save-inactive.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 580, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/load-inactive.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._hideCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/show.png, -25, -25, 50, 50)",
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
            assert(hexId.toString()).equalsTo("Hex(3, 4)");
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
            assert(hexId.toString()).equalsTo("Hex(4, 3)");
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
            assert(hexSide.getOtherHex(hexId1)).equalsTo(hexId2);
            assert(hexSide.getOtherHex(hexId2)).equalsTo(hexId1);
            assert(hexSide.angle).equalsTo(60);
            assert(CBHexSideId.equals(null, null)).isTrue();
            assert(CBHexSideId.equals(null, hexSide)).isFalse();
            assert(CBHexSideId.equals(hexSide, null)).isFalse();
            assert(hexSide.similar(new CBHexSideId(hexId1, hexId2))).isTrue();
            assert(CBHexSideId.equals(hexSide, new CBHexSideId(hexId1, hexId2))).isTrue();
            assert(hexSide.similar(new CBHexSideId(hexId2, hexId1))).isTrue();
            assert(CBHexSideId.equals(hexSide, new CBHexSideId(hexId2, hexId1))).isFalse();
            assert(hexSide.similar(new CBHexSideId(hexId3, hexId1))).isFalse();
            assert(CBHexSideId.equals(hexSide, new CBHexSideId(hexId3, hexId1))).isFalse();
            assert(hexSide.location.toString()).equalsTo("point(-255.75, -1033.5937)");
            assert(hexSide.isNearHex(map.getHex(7, 3))).isFalse();
            assert(hexSide.isNearHex(hexId2.getNearHex(300))).equalsTo(330);
            assert(hexSide.isNearHex(hexId1.getNearHex(0))).equalsTo(330);
            assert(hexSide.isNearHex(hexId1.getNearHex(240))).equalsTo(240);
            assert(hexSide.isNearHex(hexId2.getNearHex(60))).equalsTo(60);
    });

    it("Checks hexSideIds face hexes on even column", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId1 = map.getHex(4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexId3 = hexId1.getNearHex(180);
            var hexSide1 = new CBHexSideId(hexId1, hexId2);
            var hexSide2 = new CBHexSideId(hexId1, hexId2);
            var hexSide3 = new CBHexSideId(hexId1, hexId2);
        then:
            assert(hexSide1.getFaceHex(330).toString()).equalsTo("Hex(4, 2)");
            assert(hexSide1.getFaceHex(150).toString()).equalsTo("Hex(5, 4)");
            assert(hexSide2.getFaceHex(30).toString()).equalsTo("Hex(5, 2)");
            assert(hexSide2.getFaceHex(210).toString()).equalsTo("Hex(4, 4)");
            assert(hexSide3.getFaceHex(90).toString()).equalsTo("Hex(5, 3)");
            assert(hexSide3.getFaceHex(270).toString()).equalsTo("Hex(3, 3)");
    });

    it("Checks hexSideIds face hexes on odd column", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            var hexId1 = map.getHex(3, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexId3 = hexId1.getNearHex(180);
            var hexSide1 = new CBHexSideId(hexId1, hexId2);
            var hexSide2 = new CBHexSideId(hexId1, hexId2);
            var hexSide3 = new CBHexSideId(hexId1, hexId2);
        then:
            assert(hexSide1.getFaceHex(330).toString()).equalsTo("Hex(3, 2)");
            assert(hexSide1.getFaceHex(150).toString()).equalsTo("Hex(4, 3)");
            assert(hexSide2.getFaceHex(30).toString()).equalsTo("Hex(4, 2)");
            assert(hexSide2.getFaceHex(210).toString()).equalsTo("Hex(3, 3)");
            assert(hexSide3.getFaceHex(90).toString()).equalsTo("Hex(4, 2)");
            assert(hexSide3.getFaceHex(270).toString()).equalsTo("Hex(2, 2)");
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
            var [mapLayer] = getLayers(game.board, "map");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(mapLayer)).arrayContains("setTransform(0.4888, 0, 0, 0.4888, 500, 400)");
        when:
            resetDirectives(mapLayer);
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:410});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(getDirectives(mapLayer)).arrayContains("setTransform(0.4888, 0, 0, 0.4888, 500, 390)");
    });

    function mouseClickOnCounter(game, counter) {
        let counterLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:counterLocation.x, offsetY:counterLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function create2UnitsTinyGame(start = true) {
        var { game, map } = prepareTinyGame();
        let player = new CBAbstractPlayer();
        game.addPlayer(player);
        let unit1 = new CBTestUnit(player,["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 6));
        let unit2 = new CBTestUnit(player,["/CBlades/images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 7));
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, player};
    }

    it("Checks counter basic appearance and features", () => {
        given:
            var { game } = prepareTinyGame();
            let counter = new CBCounter(["/CBlades/images/units/misc/counter.png"], new Dimension2D(50, 50));
            game.addCounter(counter, new Point2D(100, 200));
            game.start();
            loadAllImages();
            counter.angle = 45;
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assert(counter.game).equalsTo(game);
            assert(counter.angle).equalsTo(45);
            assert(counter.element).is(DElement);
            assert(counter.element.artifacts[0]).equalsTo(counter.artifact);
            assert(counter.location.toString()).equalsTo("point(100, 200)");
            assert(counter.viewportLocation.toString()).equalsTo("point(548.8759, 497.7517)");
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 548.8759, 497.7517)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            counter.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(counter.location.toString()).equalsTo("point(10, 20)");
            assert(counter.viewportLocation.toString()).equalsTo("point(504.8876, 409.7752)");
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 409.7752)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            paint(game);
        then:
            assert(getDirectives(markersLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(markersLayer);
            counter.refresh();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 409.7752)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            mouseClickOnCounter(game, counter); // checks that tests does not crash
    });

    it("Checks unit registration on map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
        when:
            var unit = new CBTestUnit(player,["/CBlades/images/units/misc/unit1.png"]);
            var hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.hexLocation = hexId2;
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
    });

    it("Checks undoable unit registration on map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var unit = new CBTestUnit(player,["/CBlades/images/units/misc/unit1.png"]);
            var hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(unit.isOnBoard()).isTrue();
        when:
            unit.removeFromMap();
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.open();
            unit.addToMap(hexId, CBMoveType.FORWARD);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(unit.isOnBoard()).isTrue();
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.redo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(unit.isOnBoard()).isTrue();
    });

    it("Checks unit selection/deselection appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            resetDirectives(unitsLayer);
            unit.select();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            unit.unselect();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
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

    let dummyEvent = {offsetX:0, offsetY:0};

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
            var { game, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #00FFFF", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            unit.select();
            paint(game);
            resetDirectives(unitsLayer);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var { game, player, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var actionLaunched = false;
            player.launchUnitAction = function(unit, event) {
                actionLaunched = true;
            }
        when:
            resetDirectives(unitsLayer);
            mouseClickOnCounter(game, unit)
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
            loadAllImages();
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #FF0000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:   // Check that "reselecting" an already selected unit relaunch action
            actionLaunched = false;
            mouseClickOnCounter(game, unit);
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
    });

    function create2PlayersTinyGame() {
        var { game, map } = prepareTinyGame();
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let unit0 = new CBTestUnit(player1, ["/CBlades/images/units/misc/unit0.png"]);
        game.addUnit(unit0, map.getHex(5, 8));
        let unit1 = new CBTestUnit(player1, ["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTestUnit(player2, ["/CBlades/images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 7));
        game.start();
        loadAllImages();
        return {game, map, unit0, unit1, unit2, player1, player2};
    }

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, player1, player2, unit0, unit1, unit2} = create2PlayersTinyGame();
        then:
            assert(player1.units).arrayEqualsTo([unit0, unit1]);
            assert(game.currentPlayer).equalsTo(player1);
        when:
            unit1.select();
            unit1.launchAction(new CBAction(unit1, dummyEvent));
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit1.updatePlayed();
            assert(unit1.status).equalsTo("played");
            game.nextTurn();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(unit1.status).isNotDefined();
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
            var {game, unit} = createTinyGame();
        when:
            unit.launchAction(new CBAction(game, unit));
            unit.markAsBeingPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
        when:
            Memento.undo();
            paint(game);
        then:
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks mark a unit as played without effectively playing it (useful for unit created on the fly)", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsBeingPlayed();
        then:
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
    });

    it("Checks played status of a unit when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2UnitsTinyGame();
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
        then:
            assert(unit1.action).isDefined();
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isTrue();
        when:   // changing turn reset played status
            game.nextTurn();
        then:
            assert(unit1.action).isNotDefined();
            assert(unit1.hasBeenActivated()).isFalse();
            assert(unit1.hasBeenPlayed()).isFalse();
    });

    function create2Troops2LeadersTinyGame(start = true) {
        var {game, map, unit1, unit2, wing, player} = create2UnitsTinyGame(false);
        let leader1 = new CBTestUnit(player, ["/CBlades/images/units/misc/leader1.png"]);
        game.addUnit(leader1, map.getHex(6, 8));
        leader1.isCharacter = true;
        let leader2 = new CBTestUnit(player, ["/CBlades/images/units/misc/leader2.png"]);
        game.addUnit(leader2, map.getHex(6, 7));
        leader2.isCharacter = true;
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, leader1, leader2, wing, player};
    }

    it("Checks unit backward stacking", () => {
        given:
            var {unit1, unit2, leader1, leader2, map} = create2Troops2LeadersTinyGame();
        when:
            leader1.removeFromMap();
            leader1.addToMap(map.getHex(8, 8), CBMoveType.BACKWARD);
            var units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([leader1]);
        when:
            leader2.removeFromMap();
            leader2.addToMap(map.getHex(8, 8),  CBMoveType.BACKWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([leader1, leader2]);
        when:
            unit1.removeFromMap();
            unit1.addToMap(map.getHex(8, 8), CBMoveType.BACKWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit1, leader1, leader2]);
        when:
            unit2.removeFromMap();
            unit2.addToMap(map.getHex(8, 8), CBMoveType.BACKWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit1, unit2, leader1, leader2]);
    });

    it("Checks unit forward stacking", () => {
        given:
            var {unit1, unit2, leader1, leader2, map} = create2Troops2LeadersTinyGame();
        when:
            unit1.removeFromMap();
            unit1.addToMap(map.getHex(8, 8), CBMoveType.FORWARD);
            var units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit1]);
        when:
            unit2.removeFromMap();
            unit2.addToMap(map.getHex(8, 8), CBMoveType.FORWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1]);
        when:
            leader1.removeFromMap();
            leader1.addToMap(map.getHex(8, 8), CBMoveType.FORWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1, leader1]);
        when:
            leader2.removeFromMap();
            leader2.addToMap(map.getHex(8, 8), CBMoveType.FORWARD);
            units = map.getHex(8, 8).units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1, leader2, leader1]);
    });

});