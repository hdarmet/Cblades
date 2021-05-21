'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent, getDirectives, getLayers, loadAllImages, mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap,
    CBHexSideId,
    CBHexVertexId, CBMoveType, CBHex, CBHexId
} from "../../jslib/cblades/map.js";
import {
    DBoard, DSimpleLevel
} from "../../jslib/board.js";
import {
    diffAngle,
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
            var hexId = map.getHex(3, 4);
            var hexSideId = new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5));
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

    it("Checks a map with several mapboard", () => {
        given:
            var map = new CBMap([
                {path:"/CBlades/images/maps/map1.png", col:0, row:0, invert:true},
                {path:"/CBlades/images/maps/map2.png", col:0, row:1},
                {path:"/CBlades/images/maps/map3.png", col:1, row:0},
                {path:"/CBlades/images/maps/map4.png", col:1, row:1, invert:true}
            ]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var [mapLayer] = getLayers(game.board, "map");
            game.board.paint();
            loadAllImages();
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 500, 250)",
                "restore()",
                "save()",
                    "setTransform(-0.5, 0, 0, -0.5, -261.5, -662.5)",
                    "drawImage(/CBlades/images/maps/map1.png, -1023, -1575, 2046, 3150)",
                "restore()",
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, -261.5, 912.5)",
                    "drawImage(/CBlades/images/maps/map2.png, -1023, -1575, 2046, 3150)",
                "restore()",
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, 761.5, -662.5)",
                    "drawImage(/CBlades/images/maps/map3.png, -1023, -1575, 2046, 3150)",
                "restore()",
                "save()",
                    "setTransform(-0.5, 0, 0, -0.5, 761.5, 912.5)",
                    "drawImage(/CBlades/images/maps/map4.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(map.width).equalsTo(4092);
            assert(map.height).equalsTo(6300);
            assert(map.dimension.toString()).equalsTo("dimension(4092, 6300)");
            assert(map.colCount).equalsTo(24);
            assert(map.rowCount).equalsTo(32);
    });

    it("Checks map borders", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
        then:
            assert(map.getNorthZone()).unorderedArrayEqualsTo([
                map.getHex(0, -1),
                map.getHex(1, 0),
                map.getHex(2, -1),
                map.getHex(3, 0),
                map.getHex(4, -1),
                map.getHex(5, 0),
                map.getHex(6, -1),
                map.getHex(7, 0),
                map.getHex(8, -1),
                map.getHex(9, 0),
                map.getHex(10, -1),
                map.getHex(11, 0),
                map.getHex(12, -1)
            ]);
            assert(map.getSouthZone()).unorderedArrayEqualsTo([
                map.getHex(0, 17),
                map.getHex(1, 17),
                map.getHex(2, 17),
                map.getHex(3, 17),
                map.getHex(4, 17),
                map.getHex(5, 17),
                map.getHex(6, 17),
                map.getHex(7, 17),
                map.getHex(8, 17),
                map.getHex(9, 17),
                map.getHex(10, 17),
                map.getHex(11, 17),
                map.getHex(12, 17)
            ]);
            assert(map.getWestZone()).unorderedArrayEqualsTo([
                map.getHex(-1, 0),
                map.getHex(-1, 1),
                map.getHex(-1, 2),
                map.getHex(-1, 3),
                map.getHex(-1, 4),
                map.getHex(-1, 5),
                map.getHex(-1, 6),
                map.getHex(-1, 7),
                map.getHex(-1, 8),
                map.getHex(-1, 9),
                map.getHex(-1, 10),
                map.getHex(-1, 11),
                map.getHex(-1, 12),
                map.getHex(-1, 13),
                map.getHex(-1, 14),
                map.getHex(-1, 15)
            ]);
            assert(map.getEastZone()).unorderedArrayEqualsTo([
                map.getHex(13, 0),
                map.getHex(13, 1),
                map.getHex(13, 2),
                map.getHex(13, 3),
                map.getHex(13, 4),
                map.getHex(13, 5),
                map.getHex(13, 6),
                map.getHex(13, 7),
                map.getHex(13, 8),
                map.getHex(13, 9),
                map.getHex(13, 10),
                map.getHex(13, 11),
                map.getHex(13, 12),
                map.getHex(13, 13),
                map.getHex(13, 14),
                map.getHex(13, 15)
            ]);
    });

    it("Checks hexIds general features", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            assert(hexId.equalsTo(hexId)).isTrue();
            assert(hexId.equalsTo(new CBHexId(map, 3, 4))).isTrue();
            assert(hexId.equalsTo(map.getHex(4, 3))).isFalse();
            assert(hexId.equalsTo(null)).isFalse();
            assert(hexId.onMap).isTrue();
            assert(map.getHex(0, 0).onMap).isTrue();
            assert(map.getHex(-1, 0).onMap).isFalse();
            assert(map.getHex(12, 0).onMap).isTrue();
            assert(map.getHex(13, 0).onMap).isFalse();
            assert(hexId.nearHexes).mapContentEqualsTo([
                [map.getHex(3, 3), 0], [map.getHex(4, 3), 60],
                [map.getHex(4, 4), 120], [map.getHex(3, 5), 180],
                [map.getHex(2, 4), 240], [map.getHex(2, 3), 300]
            ]);
    });

    it("Checks hexIds on odd columns", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(3, 4);
        then:
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
        when:
            nearSide = hexId.to(map.getHex(4, 3));
        then:
            assert(nearSide.fromHex).equalsTo(hexId);
            assert(nearSide.toHex).equalsTo(map.getHex(4, 3));
    });

    it("Checks hexIds on even columns", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(4, 3);
        then:
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            assert(hexSide.equalsTo(hexSide)).isTrue();
            assert(hexSide.equalsTo(new CBHexSideId(hexId1, hexId2))).isTrue();
            assert(hexSide.equalsTo(new CBHexSideId(hexId2, hexId1))).isFalse();
            assert(hexSide.equalsTo(null)).isFalse();
            assert(hexSide.location.toString()).equalsTo("point(-255.75, -1033.5937)");
            assert(hexSide.isNearHex(map.getHex(7, 3))).isFalse();
            assert(hexSide.isNearHex(hexId2.getNearHex(300))).equalsTo(330);
            assert(hexSide.isNearHex(hexId1.getNearHex(0))).equalsTo(330);
            assert(hexSide.isNearHex(hexId1.getNearHex(240))).equalsTo(240);
            assert(hexSide.isNearHex(hexId2.getNearHex(60))).equalsTo(60);
            assert(hexSide.turnTo(180).toString()).equalsTo("Hexside(Hex(4, 3), Hex(5, 4))");
            assert(hexSide.moveTo(180).toString()).equalsTo("Hexside(Hex(4, 4), Hex(5, 4))");
            assert(hexSide.turnMove(180).toString()).equalsTo("Hexside(Hex(5, 3), Hex(5, 4))");
            assert(hexSide.nearHexes).mapContentEqualsTo([
                [map.getHex(4, 2), 330], [map.getHex(5, 2), 0],
                [map.getHex(6, 2), 60], [map.getHex(6, 3), 120],
                [map.getHex(5, 4), 150], [map.getHex(4, 4), 180],
                [map.getHex(3, 4), 240], [map.getHex(3, 3), 300]
        ]);
        when:
            var hexSide11 = hexId1.toward(60);
            var hexId4 = map.getHex(-1, 4);
            var hexSide41 = hexId4.toward(60);
        then:
            assert(hexSide11.onMap).isTrue();
            assert(hexSide41.onMap).isFalse();
    });

    it("Checks hexSideIds face hexes on even column", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(3, 3);
        then:
            assert(hexId.getNearHexSide(90).fromHex.toString()).equalsTo("Hex(4, 3)");
            assert(hexId.getNearHexSide(90).toHex.toString()).equalsTo("Hex(4, 2)");
    });

    it("Checks hexVertexIds", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId1 = map.getHex(4, 3);
            var hexId2 = hexId1.getNearHex(60);
            var hexId3 = hexId1.getNearHex(120);
            var hexId4 = hexId1.getNearHex(300);
            var hexVertex = new CBHexVertexId(hexId1, hexId2, hexId3);
        then:
            assert(hexVertex.map).equalsTo(map);
            assert(hexVertex.hexes).arrayEqualsTo([hexId1, hexId2, hexId3]);
            assert(hexVertex.fromHex).equalsTo(hexId1);
            assert(hexVertex.toHexSide.similar(new CBHexSideId(hexId2, hexId3))).isTrue();
            assert(hexVertex.angle).equalsTo(90);
            assert(hexVertex.similar(new CBHexVertexId(hexId1, hexId2, hexId3))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId3, hexId2, hexId1))).isTrue();
            assert(hexVertex.similar(new CBHexVertexId(hexId4, hexId1, hexId2))).isFalse();
            assert(hexVertex.location.toString()).equalsTo("point(-227.3333, -984.375)");
            assert(hexVertex.equalsTo(hexVertex)).isTrue();
            assert(hexVertex.equalsTo(new CBHexVertexId(hexId1, hexId2, hexId3))).isTrue();
            assert(hexVertex.equalsTo(new CBHexSideId(hexId2, hexId1, hexId3))).isFalse();
            assert(hexVertex.equalsTo(null)).isFalse();
            assert(hexId1.getNearHexVertex(90).similar(hexVertex));
            assert(hexVertex.nearHexes).mapContentEqualsTo([
                [map.getHex(4, 2), 330], [map.getHex(5, 2), 0],
                [map.getHex(6, 2), 60], [map.getHex(6, 3), 90],
                [map.getHex(6, 4), 120], [map.getHex(5, 5), 180],
                [map.getHex(4, 4), 210], [map.getHex(3, 4), 240],
                [map.getHex(3, 3), 300]
            ]);
        when:
            var hexVertex2 = map.getHex(-1, 4).getNearHexVertex(90);
        then:
            assert(hexVertex.onMap).isTrue();
            assert(hexVertex2.onMap).isFalse();
    });

    it("Checks hexId collection", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexes = map.hexes;
        then:
            assert(hexes.length).equalsTo(215);
        when:
            var minCol = Number.MAX_VALUE;
            var minRow = Number.MAX_VALUE;
            var maxCol = Number.MIN_VALUE;
            var maxRow = Number.MIN_VALUE;
            for (var hex of hexes) {
                if (hex.col<minCol) minCol = hex.col;
                if (hex.row<minRow) minRow = hex.row;
                if (hex.col>maxCol) maxCol = hex.col;
                if (hex.row>maxRow) maxRow = hex.row;
            }
        then:
            assert(minCol).equalsTo(0);
            assert(maxCol).equalsTo(12);
            assert(minRow).equalsTo(0);
            assert(maxRow).equalsTo(16);
    });

    it("Checks hexsideId collection", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexSides = map.hexSides;
        then:
            assert(hexSides.length).equalsTo(586);
        when:
            var minCol = Number.MAX_VALUE;
            var minRow = Number.MAX_VALUE;
            var maxCol = Number.MIN_VALUE;
            var maxRow = Number.MIN_VALUE;
            for (var hexSide of hexSides) {
                if (hexSide.fromHex.col<minCol) minCol = hexSide.fromHex.col;
                if (hexSide.fromHex.row<minRow) minRow = hexSide.fromHex.row;
                if (hexSide.fromHex.col>maxCol) maxCol = hexSide.fromHex.col;
                if (hexSide.fromHex.row>maxRow) maxRow = hexSide.fromHex.row;
                if (hexSide.toHex.col<minCol) minCol = hexSide.toHex.col;
                if (hexSide.toHex.row<minRow) minRow = hexSide.toHex.row;
                if (hexSide.toHex.col>maxCol) maxCol = hexSide.toHex.col;
                if (hexSide.toHex.row>maxRow) maxRow = hexSide.toHex.row;
            }
        then:
            assert(minCol).equalsTo(0);
            assert(maxCol).equalsTo(12);
            assert(minRow).equalsTo(0);
            assert(maxRow).equalsTo(16);
    });

    it("Checks hex type management", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(4, 3);
            Memento.activate();
        then:
            assert(hexId.type).equalsTo(CBHex.HEX_TYPES.OUTDOOR_CLEAR);
        when:
            hexId.type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        then:
            assert(hexId.type).equalsTo(CBHex.HEX_TYPES.OUTDOOR_DIFFICULT);
        when:
            hexId.changeType(CBHex.HEX_TYPES.OUTDOOR_ROUGH);
        then:
            assert(hexId.type).equalsTo(CBHex.HEX_TYPES.OUTDOOR_ROUGH);
        when:
            Memento.undo();
        then:
            assert(hexId.type).equalsTo(CBHex.HEX_TYPES.OUTDOOR_DIFFICULT);
    });

    it("Checks hexside type management", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(4, 3);
            Memento.activate();
        then:
            assert(hexId.toward(0).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
            assert(hexId.toward(60).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
            assert(hexId.toward(120).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
            assert(hexId.toward(180).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
            assert(hexId.toward(240).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
            assert(hexId.toward(300).type).equalsTo(CBHex.HEXSIDE_TYPES.NORMAL);
        when:
            hexId.toward(0).type = CBHex.HEXSIDE_TYPES.CLIMB;
            hexId.toward(60).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            hexId.toward(120).type = CBHex.HEXSIDE_TYPES.EASY;
            hexId.toward(180).type = CBHex.HEXSIDE_TYPES.WALL;
            hexId.toward(240).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            hexId.toward(300).type = CBHex.HEXSIDE_TYPES.EASY;
        then:
            assert(hexId.toward(0).type).equalsTo(CBHex.HEXSIDE_TYPES.CLIMB);
            assert(hexId.toward(60).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(120).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
            assert(hexId.toward(180).type).equalsTo(CBHex.HEXSIDE_TYPES.WALL);
            assert(hexId.toward(240).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(300).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
        when:
            hexId.toward(0).changeType(CBHex.HEXSIDE_TYPES.DIFFICULT);
            hexId.toward(60).changeType(CBHex.HEXSIDE_TYPES.EASY);
            hexId.toward(120).changeType(CBHex.HEXSIDE_TYPES.WALL);
            hexId.toward(180).changeType(CBHex.HEXSIDE_TYPES.DIFFICULT);
            hexId.toward(240).changeType(CBHex.HEXSIDE_TYPES.EASY);
            hexId.toward(300).changeType(CBHex.HEXSIDE_TYPES.WALL);
        then:
            assert(hexId.toward(0).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(60).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
            assert(hexId.toward(120).type).equalsTo(CBHex.HEXSIDE_TYPES.WALL);
            assert(hexId.toward(180).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(240).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
            assert(hexId.toward(300).type).equalsTo(CBHex.HEXSIDE_TYPES.WALL);
        when:
            Memento.undo();
        then:
            assert(hexId.toward(0).type).equalsTo(CBHex.HEXSIDE_TYPES.CLIMB);
            assert(hexId.toward(60).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(120).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
            assert(hexId.toward(180).type).equalsTo(CBHex.HEXSIDE_TYPES.WALL);
            assert(hexId.toward(240).type).equalsTo(CBHex.HEXSIDE_TYPES.DIFFICULT);
            assert(hexId.toward(300).type).equalsTo(CBHex.HEXSIDE_TYPES.EASY);
    });

    it("Checks playable addition and removing on a Hex", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            let playable = new CBTestPlayable();
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            hexSideId._addPlayable(playable);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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

    it("Checks unit stacking basic features", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var hexId = map.getHex(8, 8);
        then:
            assert(hexId.empty).isTrue();
        when:
            var unit1 = new CBTestUnit();
            var unit2 = new CBTestUnit();
            hexId._addUnit(unit1);
            var units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit1]);
            assert(hexId.empty).isFalse();
        when:
            hexId._appendUnit(unit2, CBMoveType.FORWARD);
            units = hexId.units;
        then:
            assert(units).arrayEqualsTo([unit2, unit1]);
    });

    it("Checks unit backward stacking", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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

});