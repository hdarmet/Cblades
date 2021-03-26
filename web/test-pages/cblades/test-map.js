'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent, getDirectives, getLayers, mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap,
    CBHexSideId,
    CBHexVertexId, CBMoveType, CBPathFinding
} from "../../jslib/cblades/map.js";
import {
    DBoard, DSimpleLevel
} from "../../jslib/board.js";
import {
    Dimension2D
} from "../../jslib/geometry.js";

class CBTestGame {
    constructor() {
        this.board = new DBoard(new Dimension2D(1000, 500), new Dimension2D(500, 250), new DSimpleLevel("map"));
        this.root = this.board.root;
    }

    setMap(map) {
        map.element.setOnBoard(this.board);
        map.game = this;
    }

    recenter(point) {
        this.centeredOn = point;
    }
}

class CBTestPlayable {
    get playableNature() {
        return true;
    }
}

class CBTestUnit {
    get unitNature() {
        return true;
    }

    get counters() {
        return [this];
    }
}

class CBTestLeader extends CBTestUnit {
    get characterNature() {
        return true;
    }
}

describe("Map", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks map general features", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var game = new CBTestGame();
            var hexId = map.getHex(3, 4);
            var hexSideId = new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5));
            var [mapLayer] = getLayers(game.board, "map");
        when:
            game.setMap(map);
        then:
            assert(map.game).equalsTo(game);
            assert(hexId.game).equalsTo(game);
            assert(hexSideId.game).equalsTo(game);
        when:
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:410});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(game.centeredOn.toString()).equalsTo("point(500, 410)");
    });

    it("Checks map borders", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var game = new CBTestGame();
        when:
            game.setMap(map);
        then:
            assert(map.getNorthZone()).unorderedArrayEqualsTo([
                map.getHex(0, 0),
                map.getHex(1, -1),
                map.getHex(2, 0),
                map.getHex(3, -1),
                map.getHex(4, 0),
                map.getHex(5, -1),
                map.getHex(6, 0),
                map.getHex(7, -1),
                map.getHex(8, 0),
                map.getHex(9, -1),
                map.getHex(10, 0),
                map.getHex(11, -1),
                map.getHex(12, 0)
            ]);
            assert(map.getSouthZone()).unorderedArrayEqualsTo([
                map.getHex(0, 16),
                map.getHex(1, 17),
                map.getHex(2, 16),
                map.getHex(3, 17),
                map.getHex(4, 16),
                map.getHex(5, 17),
                map.getHex(6, 16),
                map.getHex(7, 17),
                map.getHex(8, 16),
                map.getHex(9, 17),
                map.getHex(10, 16),
                map.getHex(11, 17),
                map.getHex(12, 16)
            ]);
            assert(map.getWestZone()).unorderedArrayEqualsTo([
                map.getHex(0, 0),
                map.getHex(0, 1),
                map.getHex(0, 2),
                map.getHex(0, 3),
                map.getHex(0, 4),
                map.getHex(0, 5),
                map.getHex(0, 6),
                map.getHex(0, 7),
                map.getHex(0, 8),
                map.getHex(0, 9),
                map.getHex(0, 10),
                map.getHex(0, 11),
                map.getHex(0, 12),
                map.getHex(0, 13),
                map.getHex(0, 14),
                map.getHex(0, 15),
                map.getHex(0, 16)
            ]);
            assert(map.getEastZone()).unorderedArrayEqualsTo([
                map.getHex(12, 0),
                map.getHex(12, 1),
                map.getHex(12, 2),
                map.getHex(12, 3),
                map.getHex(12, 4),
                map.getHex(12, 5),
                map.getHex(12, 6),
                map.getHex(12, 7),
                map.getHex(12, 8),
                map.getHex(12, 9),
                map.getHex(12, 10),
                map.getHex(12, 11),
                map.getHex(12, 12),
                map.getHex(12, 13),
                map.getHex(12, 14),
                map.getHex(12, 15),
                map.getHex(12, 16)
            ]);
    });

    it("Checks hexIds on odd columns", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(3, 4);
        then:
            assert(hexId.hexes).arrayEqualsTo([hexId]);
            assert(hexId.hasHex(map.getHex(3, 4))).isTrue();
            assert(hexId.hasHex(map.getHex(3, 5))).isFalse();
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
        when:
            var nearSide = hexId.toward(60);
        then:
            assert(nearSide.fromHex).equalsTo(hexId);
            assert(nearSide.toHex).equalsTo(map.getHex(4, 3));
    });

    it("Checks hexIds on even columns", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(4, 3);
        then:
            assert(hexId.hasHex(map.getHex(4, 3))).isTrue();
            assert(hexId.hasHex(map.getHex(4, 4))).isFalse();
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
        when:
            var nearSide = hexId.toward(60);
        then:
            assert(nearSide.fromHex).equalsTo(hexId);
            assert(nearSide.toHex).equalsTo(map.getHex(5, 3));
    });

    it("Checks when hexes are NOT near", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
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
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId1 = map.getHex(4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexSide = new CBHexSideId(hexId1, hexId2);
        then:
            assert(hexSide.hexes).arrayEqualsTo([hexId1, hexId2]);
            assert(hexSide.fromHex).equalsTo(hexId1);
            assert(hexSide.toHex).equalsTo(hexId2);
            assert(hexSide.hasHex(hexId1)).isTrue();
            assert(hexSide.hasHex(hexId2)).isTrue();
            assert(hexSide.hasHex(hexId3)).isFalse();
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
            assert(hexSide.turnTo(180).toString()).equalsTo("Hexside(Hex(4, 3), Hex(5, 4))");
    });

    it("Checks hexSideIds face hexes on even column", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
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
            var map = new CBMap("/CBlades/images/maps/map.png");
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

    it("Checks hexId near hexSides", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(3, 3);
        then:
            assert(hexId.getNearHexSide(90).fromHex.toString()).equalsTo("Hex(4, 3)");
            assert(hexId.getNearHexSide(90).toHex.toString()).equalsTo("Hex(4, 2)");
    });

    it("Checks hexVertexIds", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId1 = map.getHex(4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexId4 = hexId1.getNearHex(300);
            var hexVertex = new CBHexVertexId(hexId1, hexId2, hexId3);
        then:
            assert(hexVertex.hexes).arrayEqualsTo([hexId1, hexId2, hexId3]);
            assert(hexVertex.fromHex).equalsTo(hexId1);
            assert(hexVertex.toHexSide.similar(new CBHexSideId(hexId2, hexId3))).isTrue();
            assert(hexVertex.angle).equalsTo(90);
            assert(hexVertex.similar(new CBHexVertexId(hexId1, hexId2, hexId3))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId3, hexId2, hexId1))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId4, hexId1, hexId2))).isFalse();
            assert(hexVertex.location.toString()).equalsTo("point(-227.3333, -984.375)");
    });

    it("Checks playable addition and removing on a Hex", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            let playable = new CBTestPlayable();
            var hexId = map.getHex(4, 5);
        when:
            hexId._addPlayable(playable);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
        when:
            hexId._removePlayable(playable);
        then:
            assert(hexId.playables).arrayEqualsTo([]);
        when:
            Memento.open();
            hexId._appendPlayable(playable);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
        when:
            Memento.open();
            hexId._deletePlayable(playable);
        then:
            assert(hexId.playables).arrayEqualsTo([]);
        when:
            Memento.undo();
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
        when:
            Memento.undo();
        then:
            assert(hexId.playables).arrayEqualsTo([]);
    });

    it("Checks playable addition and removing on a Hex Side", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            let playable = new CBTestPlayable();
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            hexSideId._addPlayable(playable);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);;
        when:
            hexSideId._removePlayable(playable);
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
        when:
            Memento.open();
            hexSideId._appendPlayable(playable);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
        when:
            Memento.open();
            hexSideId._deletePlayable(playable);
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
        when:
            Memento.undo();
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
        when:
            Memento.undo();
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
    });

    it("Checks unit addition and removing on a Hex", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            let unit = new CBTestUnit();
            var hexId = map.getHex(4, 5);
        when:
            hexId._addUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            hexId._removeUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([]);
        when:
            Memento.open();
            hexId._appendUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            Memento.open();
            hexId._deleteUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([]);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([]);
    });

    it("Checks unit addition and removing on a Hex Side", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            let unit = new CBTestUnit();
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            hexSideId._addUnit(unit);
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            hexSideId._removeUnit(unit);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
        when:
            Memento.open();
            hexSideId._appendUnit(unit);
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            Memento.open();
            hexSideId._deleteUnit(unit);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
        when:
            Memento.undo();
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            Memento.undo();
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
    });

    it("Checks playable sorting on Hex", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var spell = new CBTestPlayable();
            spell.spellNature = true;
            var blaze = new CBTestPlayable();
            blaze.elementNature = true;
            var hexId = map.getHex(4, 5);
        when:
            hexId._appendPlayable(spell);
            hexId._appendPlayable(blaze);
        then:
            assert(hexId.playables).arrayEqualsTo([blaze, spell]);
        when:
            var trap = new CBTestPlayable();
            trap.featureNature = true;
            hexId._appendPlayable(trap);
        then:
            assert(hexId.playables).arrayEqualsTo([trap, blaze, spell]);
    });

    it("Checks unit backward stacking", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(8, 8);
            var unit1 = new CBTestUnit();
            var unit2 = new CBTestUnit();
            var leader1 = new CBTestLeader();
            var leader2 = new CBTestLeader();
        when:
            hexId._appendUnit(leader1, CBMoveType.BACKWARD);
            var units = hexId.units;
        then:
            assert(units).arrayEqualsTo([leader1]);
        when:
            hexId._appendUnit(leader2, CBMoveType.BACKWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([leader1, leader2]);
        when:
            hexId._appendUnit(unit1, CBMoveType.BACKWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit1, leader1, leader2]);
        when:
            hexId._appendUnit(unit2, CBMoveType.BACKWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit1, unit2, leader1, leader2]);
    });

    it("Checks unit forward stacking", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(8, 8);
            var unit1 = new CBTestUnit();
            var unit2 = new CBTestUnit();
            var leader1 = new CBTestLeader();
            var leader2 = new CBTestLeader();
        when:
            hexId._appendUnit(unit1, CBMoveType.FORWARD);
            var units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit1]);
        when:
            hexId._appendUnit(unit2, CBMoveType.FORWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1]);
        when:
            hexId._appendUnit(leader1, CBMoveType.FORWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1, leader1]);
        when:
            hexId._appendUnit(leader2, CBMoveType.FORWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1, leader2, leader1]);
    });

    it("Checks units and playables collection", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId = map.getHex(8, 8);
            var unit1 = new CBTestUnit();
            var unit2 = new CBTestUnit();
            var playable1 = new CBTestPlayable();
            var playable2 = new CBTestPlayable();
        when:
            hexId._appendUnit(unit1, CBMoveType.FORWARD);
            hexId._appendUnit(unit2, CBMoveType.FORWARD);
            hexId._appendPlayable(playable1);
            hexId._appendPlayable(playable2);
        then:
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit2, unit1]);
            assert(map.getPlayablesOnHex(hexId)).arrayEqualsTo([playable1, playable2]);
            assert(hexId.allCounters).arrayEqualsTo([playable1, playable2, unit2, unit1]);
    });

    it("Checks units and playables collection on Hex Side", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var hexId1 = map.getHex(8, 8);
            var hexId2 = map.getHex(8, 9);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
            var unit1 = new CBTestUnit();
            var unit2 = new CBTestUnit();
            var playable1 = new CBTestPlayable();
            var playable2 = new CBTestPlayable();
        when:
            hexId1._appendUnit(unit1, CBMoveType.FORWARD);
            hexSideId._appendUnit(unit2, CBMoveType.FORWARD);
            hexSideId._appendPlayable(playable1);
            hexId2._appendPlayable(playable2);
        then:
            assert(hexSideId.units).unorderedArrayEqualsTo([unit2, unit1]);
            assert(hexSideId.playables).unorderedArrayEqualsTo([playable1, playable2]);
    });

    function checkRecord(pathfinding, map, col, row, cost, angle, distance) {
        let record = pathfinding.getRecord(map.getHex(col, row));
        assert(record).isDefined();
        assert(record.cost).equalsTo(cost);
        assert(record.angle).equalsTo(angle);
        assert(record.distance).equalsTo(distance);
    }

    function printPathFindingResult(pathfinding) {
        var result="";
        for (let record of pathfinding._records.values()) {
            result+=`checkRecord(pathfinding, map, ${record.hex.col}, ${record.hex.row}, ${record.cost}, ${record.angle}, ${record.distance});\n`;
        }
        console.log(result);
    }

    it("Checks forward path finding", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([/*map.getHex(9,0),*/ map.getHex(10,1)/*, map.getHex(11,0)*/]);
            var pathfinding = new CBPathFinding(map.getHex(10, 2), 120,
                [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                (fromHex, fromAngle, toAngle)=>0.5
            );
            pathfinding._computeForward();
        then:
            //printPathFindingResult(pathfinding);
            checkRecord(pathfinding, map, 10, 2, 0, 120, 1);
            checkRecord(pathfinding, map, 10, 1, 2, 0, 0.5);
            checkRecord(pathfinding, map, 11, 2, 1.5, 60, 1.25);
            checkRecord(pathfinding, map, 11, 3, 1.5, 120, 1.75);
            checkRecord(pathfinding, map, 10, 3, 1.5, 180, 1.5);
            checkRecord(pathfinding, map, 9, 3, 1.5, 240, 1.75);
            checkRecord(pathfinding, map, 9, 2, 1.5, 300, 1.25);
            checkRecord(pathfinding, map, 10, 0, 3.5, 0, 0);
            checkRecord(pathfinding, map, 11, 1, 3, 0, 0.75);
            checkRecord(pathfinding, map, 9, 1, 3, 0, 0.75);
            checkRecord(pathfinding, map, 8, 2, 3, 240, 1.5);
            checkRecord(pathfinding, map, 8, 1, 3, 300, 1);
            checkRecord(pathfinding, map, 12, 1, 3, 60, 1);
            checkRecord(pathfinding, map, 12, 2, 3, 120, 1.5);
            checkRecord(pathfinding, map, 11, 4, 3, 120, 2.25);
            checkRecord(pathfinding, map, 10, 4, 3, 180, 2);
            checkRecord(pathfinding, map, 9, 4, 3, 240, 2.25);
            checkRecord(pathfinding, map, 8, 3, 3, 240, 2);
            checkRecord(pathfinding, map, 12, 3, 3, 120, 2);
    });

    it("Checks backward path finding", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            var pathfinding = new CBPathFinding(map.getHex(10, 2), 120,
                [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                    (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                    (fromHex, fromAngle, toAngle)=>0.5
                );
            pathfinding._computeBackward();
        then:
            //printPathFindingResult(pathfinding);
            checkRecord(pathfinding, map, 9, -1, 0, null, 1.75);
            checkRecord(pathfinding, map, 10, 0, 0, null, 1);
            checkRecord(pathfinding, map, 11, -1, 0, null, 1.75);
            checkRecord(pathfinding, map, 10, -1, 1, 180, 1.5);
            checkRecord(pathfinding, map, 11, 0, 1, 240, 1.25);
            checkRecord(pathfinding, map, 11, 1, 1, 300, 0.75);
            checkRecord(pathfinding, map, 10, 1, 1, 0, 0.5);
            checkRecord(pathfinding, map, 9, 1, 1, 60, 0.75);
            checkRecord(pathfinding, map, 9, 0, 1, 120, 1.25);
            checkRecord(pathfinding, map, 11, 2, 2.5, 0, 0.5);
            checkRecord(pathfinding, map, 10, 2, 3.5, 0, 0);
            checkRecord(pathfinding, map, 9, 2, 2.5, 0, 0.5);
            checkRecord(pathfinding, map, 9, -2, 1, 180, 2.25);
            checkRecord(pathfinding, map, 10, -2, 1, 240, 2);
            checkRecord(pathfinding, map, 8, -1, 1, 60, 2);
            checkRecord(pathfinding, map, 8, -2, 1, 120, 2.5);
            checkRecord(pathfinding, map, 8, 1, 2.5, 60, 1);
            checkRecord(pathfinding, map, 8, 0, 2.5, 120, 1.5);
            checkRecord(pathfinding, map, 11, -2, 1, 180, 2.25);
            checkRecord(pathfinding, map, 12, -2, 1, 240, 2.5);
            checkRecord(pathfinding, map, 12, -1, 1, 300, 2);
            checkRecord(pathfinding, map, 12, 0, 2.5, 240, 1.5);
            checkRecord(pathfinding, map, 12, 1, 2.5, 300, 1);
            checkRecord(pathfinding, map, 7, 0, 2.5, 60, 1.75);
            checkRecord(pathfinding, map, 7, -1, 2.5, 120, 2.25);
            checkRecord(pathfinding, map, 9, 3, 4, 0, 0.75);
            checkRecord(pathfinding, map, 8, 2, 4, 60, 1);
            checkRecord(pathfinding, map, 10, -3, 2.5, 180, 2.5);
            checkRecord(pathfinding, map, 12, 2, 4, 300, 1);
            checkRecord(pathfinding, map, 11, 3, 4, 0, 0.75);
            checkRecord(pathfinding, map, 13, -1, 2.5, 240, 2.25);
            checkRecord(pathfinding, map, 13, 0, 2.5, 300, 1.75);
            checkRecord(pathfinding, map, 9, -3, 2.5, 180, 2.75);
            checkRecord(pathfinding, map, 8, -3, 2.5, 120, 3);
            checkRecord(pathfinding, map, 11, -3, 2.5, 180, 2.75);
            checkRecord(pathfinding, map, 12, -3, 2.5, 240, 3);
            checkRecord(pathfinding, map, 7, -2, 2.5, 120, 2.75);
            checkRecord(pathfinding, map, 7, 2, 4, 60, 1.5);
            checkRecord(pathfinding, map, 7, 1, 4, 120, 1.5);
    });

    it("Checks best next moves ", () => {
        given:
            var map = new CBMap("/CBlades/images/maps/map.png");
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            var pathfinding = new CBPathFinding(map.getHex(10, 2), 120,
                [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                (fromHex, fromAngle, toAngle)=>0.5
            );
            var nextMoves = pathfinding.getGoodNextMoves();
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                map.getHex(10, 1),
                map.getHex(11, 2),
                map.getHex(9, 2)
            ]);
    });

});