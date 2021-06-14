'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap,
    CBHexSideId, CBHexId
} from "../../jslib/cblades/map.js";
import {
    DBoard, DSimpleLevel
} from "../../jslib/board.js";
import {
    diffAngle,
    Dimension2D
} from "../../jslib/geometry.js";
import {
    backwardMixin,
    CBAbstractPathFinding, createArrivalsFromHexes, createArrivalsHexSidesFromHexes,
    forwardMixin, getArrivalAreaCosts,
    getGoodNextMoves, getHexSidesFromHexes, getInRangeMoves,
    getPathCost,
    hexPathFindingMixin,
    hexSidePathFindingMixin,
    stopWhenTargetVicinityIsCompleted, stringifyHexLocations,
} from "../../jslib/cblades/pathfinding.js";

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

describe("Pathfinding", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    function checkHexRecord(pathfinding, map, col, row, cost, angle, distance) {
        let record = pathfinding.getRecord(map.getHex(col, row), angle);
        assert(record).isDefined();
        assert(record.cost).equalsTo(cost);
        assert(record.angle).equalsTo(angle);
        assert(record.distance).equalsTo(distance);
    }

    function printHexPathFindingResult(pathfinding) {
        var result="";
        for (let record of pathfinding._records.values()) {
            result+=`checkHexRecord(pathfinding, map, ${record.hexLocation.col}, ${record.hexLocation.row}, ${record.cost}, ${record.angle}, ${record.distance});\n`;
        }
        console.log(result);
    }

    it("Checks miscellaneous features about path finding", () => {
        then:
            assert(stringifyHexLocations(null)).isNotDefined();
    });

    it("Checks forward hex path finding", () => {
        given:
            var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10, 1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start,[map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                (fromHex, toHex) => expensiveHexes.has(toHex) ? 1.5 : 1,
                (fromHex, fromAngle, toAngle) => 0.5, 1
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 0, 3, 300, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 330, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 0, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 30, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 60, 0);
    });

    it("Checks forward hex path finding when a maximum cost is set", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10,1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start,[map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                (fromHex, fromAngle, toAngle)=>0.5,
                1, 3
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 0, 3, 0, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 30, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 60, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 300, 0);
            checkHexRecord(pathfinding, map, 10, 0, 3, 330, 0);
    });

    it("Checks forward hex path finding when some hexes are forbidden", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
            when:
                game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(10,1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start,[map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                (fromHex, toHex)=>forbiddenHexes.has(toHex)?null:1,
                (fromHex, fromAngle, toAngle)=>diffAngle(fromAngle, toAngle)>90?null:0.5, 1
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 0, 4, 30, 0);
            checkHexRecord(pathfinding, map, 10, 0, 4, 60, 0);
            checkHexRecord(pathfinding, map, 10, 0, 4, 90, 0);
    });

    it("Checks backward hex path finding", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start, [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                    (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                    (fromHex, fromAngle, toAngle)=>0.5, 1
                );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 2, 3.5, 120, 0);
    });

    it("Checks backward hex path finding when a maximum cost is set", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start, [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                (fromHex, fromAngle, toAngle)=>0.5,
                1, 3
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 0, 0, 0, 2);
            checkHexRecord(pathfinding, map, 11, 1, 1, 0, 2);
            checkHexRecord(pathfinding, map, 10, 1, 1.5, 300, 1);
            checkHexRecord(pathfinding, map, 10, 1, 1, 330, 1);
            checkHexRecord(pathfinding, map, 10, 1, 1, 0, 1);
            checkHexRecord(pathfinding, map, 10, 1, 1, 30, 1);
            checkHexRecord(pathfinding, map, 10, 1, 1.5, 60, 1);
            checkHexRecord(pathfinding, map, 9, 1, 1, 0, 2);
            checkHexRecord(pathfinding, map, 9, 2, 2, 0, 1);
            checkHexRecord(pathfinding, map, 11, 2, 2, 0, 1);
    });

    it("Checks backward hex path finding when some hexes are forbidden", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)))(start, 120,
                createArrivalsFromHexes(start, [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)]),
                (fromHex, toHex)=>forbiddenHexes.has(toHex)?null:1,
                (fromHex, fromAngle, toAngle)=>diffAngle(fromAngle, toAngle)>90?null:0.5, 1
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexPathFindingResult(pathfinding);
            checkHexRecord(pathfinding, map, 10, 2, 3.5, 120, 0);
    });

    it("Checks best hex next moves", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let config = {
                start:map.getHex(10, 2),
                startAngle:180,
                arrivals:[map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                costMove:(fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = getGoodNextMoves(config);
        then:
            //printHexPathFindingResult(pathfinding);
            assert(nextMoves).unorderedArrayEqualsTo([
                map.getHex(9, 2),
                map.getHex(10, 1),
                map.getHex(11, 2)
            ]);
    });

    it("Checks best hex next moves when there is no solution because of max distance exceeded", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            var nextMoves = getGoodNextMoves({
                start:map.getHex(10, 2),
                startAngle:120,
                arrivals:[map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                costRotate: (fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost: 1,
                maxCost: 2
            });
        then:
            assert(nextMoves).arrayEqualsTo([]);
    });

    it("Checks hex path cost moves", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
            when:
                game.setMap(map);
                var expensiveHexes = new Set([map.getHex(10,1)]);
                let config = {
                    start: map.getHex(10, 2),
                    startAngle: 120,
                    arrivals: [map.getHex(10, 0)],
                    costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                    costRotate: (fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                    minimalCost: 1
                }
                var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(3);
    });

    it("Checks hex path cost when there is no solution because of max distance exceeded", () => {
        given:
            var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9, 0), map.getHex(10, 1), map.getHex(11, 0)]);
            var pathCost = getPathCost({
                start: map.getHex(10, 2),
                startAngle: 120,
                arrivals: [map.getHex(9, -1), map.getHex(10, 0), map.getHex(11, -1)],
                costMove: (fromHex, toHex) => expensiveHexes.has(toHex) ? 2 : 1,
                costRotate: (fromHex, fromAngle, toAngle) => Math.abs(diffAngle(fromAngle, toAngle)) <= 60 ? 0 : 0.5,
                minimalCost: 1,
                maxCost: 2
            });
        then:
            assert(pathCost).equalsTo(null);
    });

    it("Checks hex path cost when there is no solution", () => {
        given:
            var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var forbiddenHexes = new Set([
                map.getHex(9, 4), map.getHex(9, 5),
                map.getHex(10, 3), map.getHex(10, 5),
                map.getHex(11, 4), map.getHex(11, 5)
            ]);
            var pathCost = getPathCost({
                start: map.getHex(10, 4),
                startAngle: 120,
                arrivals: [map.getHex(9, 1), map.getHex(10, 0), map.getHex(11, 1)],
                costMove: (fromHex, toHex) => forbiddenHexes.has(toHex) ? null : 1,
                costRotate: (fromHex, fromAngle, toAngle) => 0,
                minimalCost: 1,
                maxCost: 8
            });
        then:
            assert(pathCost).equalsTo(null);
    });

    function checkHexSideRecord(pathfinding, map, fcol, frow, tcol, trow, cost, angle, distance) {
        let record = pathfinding.getRecord(new CBHexSideId(map.getHex(fcol, frow), map.getHex(tcol, trow)), angle);
        assert(record).isDefined();
        assert(record.cost).equalsTo(cost);
        assert(record.angle).equalsTo(angle);
        assert(record.distance).equalsTo(distance);
    }

    function printHexSidePathFindingResult(pathfinding) {
        var result="";
        for (let record of pathfinding._records.values()) {
            result+=`checkHexSideRecord(pathfinding, map, ${record.hexLocation.fromHex.col}, ${record.hexLocation.fromHex.row}, ${record.hexLocation.toHex.col}, ${record.hexLocation.toHex.row}, ${record.cost}, ${record.angle}, ${record.distance});\n`;
        }
        console.log(result);
    }

    it("Checks hexside forward path finding", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10,2)]);
            let start = new CBHexSideId(map.getHex(9, 4), map.getHex(10, 4));
            var pathfinding = new (hexSidePathFindingMixin(forwardMixin(CBAbstractPathFinding)))(
                start, 210,
                createArrivalsHexSidesFromHexes(start, [
                    map.getHex(9, 1), map.getHex(10, 1), map.getHex(11, 1)
                ]),
                (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                (fromHex, fromAngle, toAngle)=>1, 1
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexSidePathFindingResult(pathfinding);
            checkHexSideRecord(pathfinding, map, 9, 1, 10, 1, 5, 30, 0);
    });

    it("Checks hexside backward path finding", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set(); //new Set([map.getHex(10,2)]);
            let start = new CBHexSideId(map.getHex(10, 3), map.getHex(10, 4));
            var pathfinding = new (hexSidePathFindingMixin(backwardMixin(CBAbstractPathFinding)))(
                start, 90,
                createArrivalsHexSidesFromHexes(start, [
                    map.getHex(9, 1),
                    map.getHex(10, 1),
                    map.getHex(11, 1)
                ]),
                (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                (fromHex, fromAngle, toAngle)=>1, 1
            );
            stopWhenTargetVicinityIsCompleted(pathfinding);
            pathfinding.computePath();
        then:
            //printHexSidePathFindingResult(pathfinding);
            checkHexSideRecord(pathfinding, map, 10, 3, 10, 4, 5, 90, 0);
    });

    it("Checks best hexside next moves", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([]);
            var nextMoves = getGoodNextMoves({
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                withAngle: true
            });
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                new CBHexSideId(map.getHex(10, 2), map.getHex(11, 3))
            ]);
        when:
            nextMoves = getGoodNextMoves({
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex) => expensiveHexes.has(toHex) ? 1.5 : 1,
                costRotate: (fromHex, fromAngle, toAngle) => 1,
                minimalCost: 1,
                withAngle: false
            });
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                new CBHexSideId(map.getHex(10, 2), map.getHex(11, 3)),
                new CBHexSideId(map.getHex(10, 2), map.getHex(9, 3))
            ]);
    });

    it("Checks best hexside next moves when there is no solution because of max distance exceeded", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([]);
            let config = {
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 2
            };
            var nextMoves = getGoodNextMoves(config);
        then:
            assert(nextMoves).arrayEqualsTo([]);
    });

    it("Checks hexside path cost", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(5.5);
    });

    it("Checks hexside path cost when some hexes are forbidden", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(7,3), map.getHex(8,3), map.getHex(9,3)]);
            let config = {
                start: new CBHexSideId(map.getHex(8, 5), map.getHex(8, 4)),
                startAngle: 90,
                arrivals: [map.getHex(7, 2), map.getHex(8, 2), map.getHex(9, 2)],
                costMove: (fromHex, toHex)=>forbiddenHexes.has(toHex)?null:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(9);
    });

    it("Checks hexside path cost when there is no solution because of max distance exceeded", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let config = {
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 2
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(null);
    });

    it("Checks hex area cost", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,2), map.getHex(10,2), map.getHex(11,2)]);
            let config = {
                start: map.getHex(10, 3),
                startAngle: 0,
                arrivals: [map.getHex(10, 1)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var areaCosts = getArrivalAreaCosts(config);
        then:
            assert(areaCosts.cost).equalsTo(2.5);
            assert(areaCosts.hexes).mapContentEqualsTo([
                [map.getHex(10, 2), 1.5],
                [map.getHex(10, 1), 2.5],
                [map.getHex(9, 2), 2.5],
                [map.getHex(11, 2), 2.5],
                [map.getHex(9, 1), 3.5],
                [map.getHex(10, 0), 3.5],
                [map.getHex(11, 1), 3.5]
            ]);
    });

    it("Checks hexside area cost", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: new CBHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var areaCosts = getArrivalAreaCosts(config);
        then:
            assert(areaCosts.cost).equalsTo(4);
            assert(areaCosts.hexes).mapContentEqualsTo([
                [map.getHex(10, 1), 3.5],
                [map.getHex(11, 1), 3.5],
                [map.getHex(10, 0), 4],
                [map.getHex(11, 0), 4.5],
                [map.getHex(9, 1), 4.5],
                [map.getHex(9, 0), 5.5],
                [map.getHex(12, 0), 4.5],
                [map.getHex(8, 0), 5.5]
            ]);
    });

    it("Checks in range cost for an hex", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: map.getHex(10, 2),
                startAngle: 90,
                range: 2,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 2
            };
            var inRangeMoves = getInRangeMoves(config);
        then:
            assert([...new Set(inRangeMoves.values())]).unorderedArrayEqualsTo([
                map.getHex(11, 2),
                map.getHex(9, 2)
            ]);
    });

    it("Checks hexside in range cost", () => {
        given:
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            const config = {
                start: map.getHex(10, 2).toward(120),
                range: 2,
                arrivals: [map.getHex(10, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 2
            };
            var inRangeMoves = getInRangeMoves(config);
        then:
            assert([...new Set(inRangeMoves.values())]).unorderedArrayEqualsTo([
                new CBHexSideId(map.getHex(11, 2), map.getHex(12, 2)),
                new CBHexSideId(map.getHex(10, 2), map.getHex(11, 2))
            ]);
    });

});