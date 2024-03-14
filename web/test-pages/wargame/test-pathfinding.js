'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/board/draw.js";
import {
    mockPlatform
} from "../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/board/mechanisms.js";
import {
    WMap,
    WHexSideId
} from "../../jslib/wargame/map.js";
import {
    DBoard, DSimpleLevel
} from "../../jslib/board/board.js";
import {
    atan2,
    diffAngle,
    Dimension2D, invertAngle, sumAngle
} from "../../jslib/board/geometry.js";
import {
    backwardMixin,
    WAbstractPathFinding,
    WLineOfSight,
    forwardMixin,
    getArrivalAreaCosts,
    getPreferredNextMoves,
    getHexSidesFromHexes,
    getInRangeMoves,
    getPathCost,
    hexPathFindingMixin,
    hexSidePathFindingMixin,
    stopWhenTargetVicinityIsCompleted,
    stringifyHexLocations,
    createHexArrivals,
    createHexSideArrivals,
    getImprovingNextMoves, getToBorderPreferredNextMoves,
} from "../../jslib/wargame/pathfinding.js";

function createArrivalsFromHexes(start, hexes) {
    let result = [];
    for (let hex of hexes) {
        let diff = hex.location.minusPoint(start.location);
        let angle = Math.round(atan2(diff.x, diff.y) / 30) * 30;
        result.push(
            {hexLocation: hex, angle: sumAngle(angle, -30)},
            {hexLocation: hex, angle},
            {hexLocation: hex, angle: sumAngle(angle, 30)}
        )
    }
    return result;
}
function createArrivalsFromHexSides(start, hexSides) {
    let result = [];
    for (let hexSide of hexSides) {
        let diff = hexSide.location.minusPoint(start.location);
        let hangle = Math.round(atan2(diff.x, diff.y) / 30) * 30;
        let rangle = sumAngle(hexSide.angle, 90);
        let dangle = diffAngle(hangle, rangle);
        result.push({hexLocation:hexSide, angle:(dangle < -90 || dangle > 90) ? invertAngle(rangle) : rangle})
    }
    return result;
}
export function createArrivalsHexSidesFromHexes(start, hexes) {
    return createArrivalsFromHexSides(start,[...getHexSidesFromHexes(hexes)]);
}

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

    function locationsStringifier(locations) {
        let result = [];
        for (let location of locations) {
            result.push(location.toString());
        }
        return result;
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
            var map = new WMap([{path: "./../images/maps/map.png", col: 0, row: 0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10, 1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(WAbstractPathFinding)))(start, 120,
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10,1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(WAbstractPathFinding)))(start, 120,
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
            when:
                game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(10,1)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(forwardMixin(WAbstractPathFinding)))(start, 120,
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(WAbstractPathFinding)))(start, 120,
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(WAbstractPathFinding)))(start, 120,
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let start = map.getHex(10, 2);
            var pathfinding = new (hexPathFindingMixin(backwardMixin(WAbstractPathFinding)))(start, 120,
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

    function arrivalsStringifier(arrivals) {
        let result = [];
        for (let arrival of arrivals) {
            result.push(`hexLocation:${arrival.hexLocation}, angle:${arrival.angle}`);
        }
        return result;
    }

    it("Checks arrivals definition for a hex path, to target a hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var arrivals = arrivalsStringifier(createHexArrivals(map.getHex(3, 4), (from, to)=>1));
        then:
            assert(arrivals).unorderedArrayEqualsTo([
                'hexLocation:Hex(3, 3), angle:120',
                'hexLocation:Hex(3, 3), angle:150',
                'hexLocation:Hex(3, 3), angle:180',
                'hexLocation:Hex(3, 3), angle:210',
                'hexLocation:Hex(3, 3), angle:240',

                'hexLocation:Hex(4, 3), angle:180',
                'hexLocation:Hex(4, 3), angle:210',
                'hexLocation:Hex(4, 3), angle:240',
                'hexLocation:Hex(4, 3), angle:270',
                'hexLocation:Hex(4, 3), angle:300',

                'hexLocation:Hex(4, 4), angle:240',
                'hexLocation:Hex(4, 4), angle:270',
                'hexLocation:Hex(4, 4), angle:300',
                'hexLocation:Hex(4, 4), angle:330',
                'hexLocation:Hex(4, 4), angle:0',

                'hexLocation:Hex(3, 5), angle:300',
                'hexLocation:Hex(3, 5), angle:330',
                'hexLocation:Hex(3, 5), angle:0',
                'hexLocation:Hex(3, 5), angle:30',
                'hexLocation:Hex(3, 5), angle:60',

                'hexLocation:Hex(2, 4), angle:0',
                'hexLocation:Hex(2, 4), angle:30',
                'hexLocation:Hex(2, 4), angle:60',
                'hexLocation:Hex(2, 4), angle:90',
                'hexLocation:Hex(2, 4), angle:120',

                'hexLocation:Hex(2, 3), angle:60',
                'hexLocation:Hex(2, 3), angle:90',
                'hexLocation:Hex(2, 3), angle:120',
                'hexLocation:Hex(2, 3), angle:150',
                'hexLocation:Hex(2, 3), angle:180'
            ]);
    });

    it("Checks arrivals definition for a hex path, to target a hex side", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var arrivals = arrivalsStringifier(createHexArrivals(
                new WHexSideId(map.getHex(3, 4), map.getHex(3, 3)), (from, to)=>1));
        then:
            assert(arrivals).unorderedArrayEqualsTo([
                'hexLocation:Hex(4, 4), angle:240',
                'hexLocation:Hex(4, 4), angle:270',
                'hexLocation:Hex(4, 4), angle:300',
                'hexLocation:Hex(4, 4), angle:330',
                'hexLocation:Hex(4, 4), angle:0',

                'hexLocation:Hex(3, 5), angle:300',
                'hexLocation:Hex(3, 5), angle:330',
                'hexLocation:Hex(3, 5), angle:0',
                'hexLocation:Hex(3, 5), angle:30',
                'hexLocation:Hex(3, 5), angle:60',

                'hexLocation:Hex(2, 4), angle:0',
                'hexLocation:Hex(2, 4), angle:30',
                'hexLocation:Hex(2, 4), angle:60',
                'hexLocation:Hex(2, 4), angle:90',
                'hexLocation:Hex(2, 4), angle:120',

                'hexLocation:Hex(2, 2), angle:60',
                'hexLocation:Hex(2, 2), angle:90',
                'hexLocation:Hex(2, 2), angle:120',
                'hexLocation:Hex(2, 2), angle:150',
                'hexLocation:Hex(2, 2), angle:180',

                'hexLocation:Hex(3, 2), angle:120',
                'hexLocation:Hex(3, 2), angle:150',
                'hexLocation:Hex(3, 2), angle:180',
                'hexLocation:Hex(3, 2), angle:210',
                'hexLocation:Hex(3, 2), angle:240',

                'hexLocation:Hex(4, 2), angle:180',
                'hexLocation:Hex(4, 2), angle:210',
                'hexLocation:Hex(4, 2), angle:240',
                'hexLocation:Hex(4, 2), angle:270',
                'hexLocation:Hex(4, 2), angle:300',

                'hexLocation:Hex(4, 3), angle:240',
                'hexLocation:Hex(4, 3), angle:270',
                'hexLocation:Hex(4, 3), angle:300',

                'hexLocation:Hex(2, 3), angle:60',
                'hexLocation:Hex(2, 3), angle:90',
                'hexLocation:Hex(2, 3), angle:120'
            ]);
    });

    it("Checks arrivals definition for a hex side path, to target a hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var arrivals = arrivalsStringifier(createHexSideArrivals(map.getHex(3, 4), (from, to)=>1));
        then:
            assert(arrivals).unorderedArrayEqualsTo([
                'hexLocation:Hexside(Hex(3, 3), Hex(4, 2)), angle:150',
                'hexLocation:Hexside(Hex(3, 3), Hex(4, 3)), angle:210',
                'hexLocation:Hexside(Hex(3, 3), Hex(2, 2)), angle:210',

                'hexLocation:Hexside(Hex(4, 3), Hex(5, 4)), angle:210',
                'hexLocation:Hexside(Hex(4, 3), Hex(4, 4)), angle:270',
                'hexLocation:Hexside(Hex(4, 3), Hex(4, 2)), angle:270',

                'hexLocation:Hexside(Hex(4, 4), Hex(4, 5)), angle:270',
                'hexLocation:Hexside(Hex(4, 4), Hex(3, 5)), angle:330',
                'hexLocation:Hexside(Hex(4, 4), Hex(5, 4)), angle:330',

                'hexLocation:Hexside(Hex(3, 5), Hex(2, 5)), angle:330',
                'hexLocation:Hexside(Hex(3, 5), Hex(2, 4)), angle:30',
                'hexLocation:Hexside(Hex(3, 5), Hex(4, 5)), angle:30',

                'hexLocation:Hexside(Hex(2, 4), Hex(1, 4)), angle:30',
                'hexLocation:Hexside(Hex(2, 4), Hex(2, 3)), angle:90',
                'hexLocation:Hexside(Hex(2, 4), Hex(2, 5)), angle:90',

                'hexLocation:Hexside(Hex(2, 3), Hex(2, 2)), angle:90',
                'hexLocation:Hexside(Hex(2, 3), Hex(3, 3)), angle:150',
                'hexLocation:Hexside(Hex(2, 3), Hex(1, 4)), angle:150'
            ]);
    });

    it("Checks arrivals definition for a hex side path, to target a hex side", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var arrivals = arrivalsStringifier(createHexSideArrivals(
                new WHexSideId(map.getHex(3, 4), map.getHex(3, 3)),
                (from, to)=>1));
        then:
            assert(arrivals).unorderedArrayEqualsTo([
                'hexLocation:Hexside(Hex(4, 4), Hex(4, 5)), angle:270',
                'hexLocation:Hexside(Hex(4, 4), Hex(3, 5)), angle:330',
                'hexLocation:Hexside(Hex(4, 4), Hex(5, 4)), angle:330',

                'hexLocation:Hexside(Hex(3, 5), Hex(2, 5)), angle:330',
                'hexLocation:Hexside(Hex(3, 5), Hex(2, 4)), angle:30',
                'hexLocation:Hexside(Hex(3, 5), Hex(4, 5)), angle:30',

                'hexLocation:Hexside(Hex(2, 4), Hex(1, 4)), angle:30',
                'hexLocation:Hexside(Hex(2, 4), Hex(2, 3)), angle:90',
                'hexLocation:Hexside(Hex(2, 4), Hex(2, 5)), angle:90',

                'hexLocation:Hexside(Hex(2, 2), Hex(2, 1)), angle:90',
                'hexLocation:Hexside(Hex(2, 2), Hex(3, 2)), angle:150',
                'hexLocation:Hexside(Hex(2, 2), Hex(1, 3)), angle:150',

                'hexLocation:Hexside(Hex(3, 2), Hex(4, 1)), angle:150',
                'hexLocation:Hexside(Hex(3, 2), Hex(4, 2)), angle:210',
                'hexLocation:Hexside(Hex(3, 2), Hex(2, 1)), angle:210',

                'hexLocation:Hexside(Hex(4, 2), Hex(5, 3)), angle:210',
                'hexLocation:Hexside(Hex(4, 2), Hex(4, 3)), angle:270',
                'hexLocation:Hexside(Hex(4, 2), Hex(4, 1)), angle:270',

                'hexLocation:Hexside(Hex(2, 3), Hex(1, 3)), angle:210',
                'hexLocation:Hexside(Hex(2, 3), Hex(2, 2)), angle:90',
                'hexLocation:Hexside(Hex(2, 3), Hex(3, 3)), angle:150',

                'hexLocation:Hexside(Hex(4, 3), Hex(5, 4)), angle:30',
                'hexLocation:Hexside(Hex(4, 3), Hex(4, 4)), angle:270',
                'hexLocation:Hexside(Hex(4, 3), Hex(3, 4)), angle:330'
            ]);
    });

    it("Checks best hex next moves", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let config = {
                start:map.getHex(10, 2),
                startAngle:180,
                arrivals:[
                    {hexLocation:map.getHex(9, -1), angle:180},
                    {hexLocation:map.getHex(10, 0), angle:180},
                    {hexLocation:map.getHex(11, -1), angle:180}
                ],
                costMove:(fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = getPreferredNextMoves(config);
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            var nextMoves = getPreferredNextMoves({
                start:map.getHex(10, 2),
                startAngle:120,
                arrivals:[
                    {hexLocation:map.getHex(9, -1), angle:180},
                    {hexLocation:map.getHex(10, 0), angle:180},
                    {hexLocation:map.getHex(11, -1), angle:180}
                ],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                costRotate: (fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost: 1,
                maxCost: 2
            });
        then:
            assert(nextMoves).arrayEqualsTo([]);
    });

    it("Checks hex next moves to reach a target", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            let config = {
                start:map.getHex(9, 5),
                startAngle:180,
                arrivals:[
                    map.getHex(9, 2), map.getHex(10, 3), map.getHex(11, 2)
                ],
                costMove:(fromHex, toHex)=>1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = getImprovingNextMoves(config);
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                map.getHex(9, 4),
                map.getHex(10, 4)
            ]);
    });

    it("Checks hex next moves to border a target", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            let config = {
                start:map.getHex(9, 5),
                startAngle:180,
                arrivals:[
                    map.getHex(9, 2), map.getHex(10, 3), map.getHex(11, 2)
                ],
                costCross:(fromHex, toHex)=>1,
                costMove:(fromHex, toHex)=>1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = getToBorderPreferredNextMoves(config);
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                map.getHex(9, 4),
                map.getHex(10, 4)
            ]);
    });

    it("Checks hex path cost moves when the target is a hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
            when:
                game.setMap(map);
                var expensiveHexes = new Set([map.getHex(10,1)]);
                let config = {
                    start: map.getHex(10, 2),
                    startAngle: 120,
                    arrival: map.getHex(10, 0),
                    costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                    costRotate: (fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                    minimalCost: 1
                }
                var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(2);
    });

    it("Checks hex path cost moves when the target is a hex side", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10, 2)]);
            let config = {
                start: map.getHex(10, 3),
                startAngle: 120,
                arrival: new WHexSideId(map.getHex(10,1), map.getHex(10,0)),
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?2:1,
                costRotate: (fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost: 1
            }
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(2);
    });

    it("Checks hex path cost when there is no solution because of max distance exceeded", () => {
        given:
            var map = new WMap([{path: "./../images/maps/map.png", col: 0, row: 0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9, 1), map.getHex(10, 1), map.getHex(11, 1)]);
            let config = {
                start: map.getHex(10, 2),
                startAngle: 120,
                arrival: map.getHex(10, 0),
                costMove: (fromHex, toHex) => expensiveHexes.has(toHex) ? 2 : 1,
                costRotate: (fromHex, fromAngle, toAngle) => Math.abs(diffAngle(fromAngle, toAngle)) < 60 ? 0 : 0.5,
                minimalCost: 1,
                maxCost: 2
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(null);
    });

    it("Checks hex path cost when there is no solution", () => {
        given:
            var map = new WMap([{path: "./../images/maps/map.png", col: 0, row: 0}]);
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
                arrival: map.getHex(10, 0),
                costMove: (fromHex, toHex) => forbiddenHexes.has(toHex) ? null : 1,
                costRotate: (fromHex, fromAngle, toAngle) => 0,
                minimalCost: 1,
                maxCost: 8
            });
        then:
            assert(pathCost).equalsTo(null);
    });

    function checkHexSideRecord(pathfinding, map, fcol, frow, tcol, trow, cost, angle, distance) {
        let record = pathfinding.getRecord(new WHexSideId(map.getHex(fcol, frow), map.getHex(tcol, trow)), angle);
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

    it("Checks computing the distance from two locations", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            let start = new WHexSideId(map.getHex(9, 4), map.getHex(10, 4));
            var pathfinding = new (hexSidePathFindingMixin(forwardMixin(WAbstractPathFinding)))(
                start, 210,
                createArrivalsHexSidesFromHexes(start, [
                    map.getHex(9, 1), map.getHex(10, 1), map.getHex(11, 1)
                ]),
                (fromHex, toHex)=>1,
                (fromHex, fromAngle, toAngle)=>1, 1
            );
        then:
            assert(pathfinding._distanceBetweenLocations(
                map.getHex(1, 1),
                new WHexSideId(map.getHex(3, 4), map.getHex(3, 5)))
            ).equalsTo(4);
            assert(pathfinding._distanceBetweenLocations(
                new WHexSideId(map.getHex(3, 4), map.getHex(3, 5)),
                map.getHex(1, 1))
            ).equalsTo(4);
            assert(pathfinding._distanceBetweenLocations(
                new WHexSideId(map.getHex(3, 4), map.getHex(3, 5)),
                new WHexSideId(map.getHex(1, 1), map.getHex(1, 2))),
            ).equalsTo(4);
    });

    it("Checks hexside forward path finding", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(10,2)]);
            let start = new WHexSideId(map.getHex(9, 4), map.getHex(10, 4));
            var pathfinding = new (hexSidePathFindingMixin(forwardMixin(WAbstractPathFinding)))(
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set(); //new Set([map.getHex(10,2)]);
            let start = new WHexSideId(map.getHex(10, 3), map.getHex(10, 4));
            var pathfinding = new (hexSidePathFindingMixin(backwardMixin(WAbstractPathFinding)))(
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
            checkHexSideRecord(pathfinding, map, 10, 3, 10, 4, 4, 90, 0);
    });

    it("Checks best hexside next moves", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([]);
            var nextMoves = getPreferredNextMoves({
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [
                    {hexLocation: new WHexSideId(map.getHex(9, 1), map.getHex(10, 1)), angle:30},
                    {hexLocation: new WHexSideId(map.getHex(10, 1), map.getHex(11, 1)), angle:330}
                ],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                withAngle: true
            });
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                new WHexSideId(map.getHex(10, 2), map.getHex(11, 3))
            ]);
        when:
            nextMoves = getPreferredNextMoves({
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [
                    {hexLocation: new WHexSideId(map.getHex(9, 1), map.getHex(10, 1)), angle:30},
                    {hexLocation: new WHexSideId(map.getHex(10, 1), map.getHex(11, 1)), angle:330}
                ],
                costMove: (fromHex, toHex) => expensiveHexes.has(toHex) ? 1.5 : 1,
                costRotate: (fromHex, fromAngle, toAngle) => 1,
                minimalCost: 1,
                withAngle: false
            });
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                new WHexSideId(map.getHex(10, 2), map.getHex(11, 3)),
                new WHexSideId(map.getHex(10, 2), map.getHex(9, 3))
            ]);
    });

    it("Checks best hexside next moves when there is no solution because of max distance exceeded", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([]);
            let config = {
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrivals: [
                    {hexLocation: new WHexSideId(map.getHex(9, 1), map.getHex(10, 1)), angle:30},
                    {hexLocation: new WHexSideId(map.getHex(10, 1), map.getHex(11, 1)), angle:330}
                ],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 2
            };
            var nextMoves = getPreferredNextMoves(config);
        then:
            assert(nextMoves).arrayEqualsTo([]);
    });

    it("Checks hex side next moves to reach a target", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            let config = {
                start:new WHexSideId(map.getHex(9, 5), map.getHex(9, 6)),
                startAngle:90,
                arrivals:[
                    new WHexSideId(map.getHex(9, 2), map.getHex(10, 2)),
                    new WHexSideId(map.getHex(10, 2), map.getHex(11, 2))
                ],
                costMove:(fromHex, toHex)=>1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = locationsStringifier(getImprovingNextMoves(config));
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                'Hexside(Hex(9, 5), Hex(10, 5))'
            ]);
    });

    it("Checks hex side next moves to border a target", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            let config = {
                start:new WHexSideId(map.getHex(9, 5), map.getHex(9, 6)),
                startAngle:90,
                arrivals:[
                    new WHexSideId(map.getHex(9, 2), map.getHex(10, 2)),
                    new WHexSideId(map.getHex(10, 2), map.getHex(11, 2))
                ],
                costCross:(fromHex, toHex)=>1,
                costMove:(fromHex, toHex)=>1,
                costRotate:(fromHex, fromAngle, toAngle)=>Math.abs(diffAngle(fromAngle, toAngle))<=60?0:0.5,
                minimalCost:1
            };
            var nextMoves = locationsStringifier(getToBorderPreferredNextMoves(config));
        then:
            assert(nextMoves).unorderedArrayEqualsTo([
                'Hexside(Hex(9, 5), Hex(10, 5))',
                'Hexside(Hex(10, 4), Hex(10, 5))',
                'Hexside(Hex(9, 5), Hex(8, 5))'
            ]);
    });

    it("Checks hexside path cost when the target is an hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrival: map.getHex(10, 0),
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(2.5);
    });

    it("Checks hexside path cost when the target is an hex side", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: new WHexSideId(map.getHex(10, 3), map.getHex(10, 4)),
                startAngle: 90,
                arrival: new WHexSideId(map.getHex(10, 0), map.getHex(10, 1)),
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(2);
    });

    it("Checks hexside path cost when some hexes are forbidden", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var forbiddenHexes = new Set([map.getHex(7,3), map.getHex(8,3), map.getHex(9,3)]);
            let config = {
                start: new WHexSideId(map.getHex(8, 5), map.getHex(8, 4)),
                startAngle: 90,
                arrival: map.getHex(8, 2),
                costMove: (fromHex, toHex)=>forbiddenHexes.has(toHex)?null:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1
            };
            var pathCost = getPathCost(config);
        then:
            assert(pathCost).equalsTo(7);
    });

    it("Checks hexside path cost when there is no solution because of max distance exceeded", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,0), map.getHex(10,1), map.getHex(11,0)]);
            let config = {
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
                startAngle: 90,
                arrival: map.getHex(10, 0),
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: new WHexSideId(map.getHex(10, 2), map.getHex(10, 3)),
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
                [map.getHex(9, 1), 4.5],
                [map.getHex(11, 0), 4.5],
                [map.getHex(12, 0), 4.5],
                [map.getHex(10, -1), 5],
                [map.getHex(8, 0), 5.5],
                [map.getHex(9, 0), 5.5],
                [map.getHex(11, -1), 5.5],
                [map.getHex(12, -1), 5.5],
                [map.getHex(8, -1), 6.5],
                [map.getHex(9, -1), 6.5]
            ]);
    });

    it("Checks in range cost for an hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
                new WHexSideId(map.getHex(11, 2), map.getHex(12, 2)),
                new WHexSideId(map.getHex(10, 2), map.getHex(11, 2))
            ]);
    });

    it("Checks in range moves for an hex when the max cost is not enough to move one hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
            maxCost: 0.5
        };
        var inRangeMoves = getInRangeMoves(config);
        then:
            assert([...new Set(inRangeMoves.values())]).unorderedArrayEqualsTo([
                map.getHex(11, 2),
                map.getHex(10, 1),
                map.getHex(9, 2)
            ]);
    });

    it("Checks in range moves for an hex when the max cost is big enough to move around the target hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
                maxCost: 8
            };
            var inRangeMoves = getInRangeMoves(config);
        then:
            assert([...new Set(inRangeMoves.values())]).unorderedArrayEqualsTo([
                map.getHex(11, 2),
                map.getHex(11, 3),
                map.getHex(10, 1),
                map.getHex(10, 3),
                map.getHex(9, 2),
                map.getHex(9, 3)
            ]);
    });

    it("Checks in range moves for an hex when the range is big enough to encompass the target hex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var expensiveHexes = new Set([map.getHex(9,1), map.getHex(10,1), map.getHex(11,1)]);
            let config = {
                start: map.getHex(10, 2),
                startAngle: 90,
                range: 8,
                arrivals: [map.getHex(9, 0), map.getHex(10, 0), map.getHex(11, 0)],
                costMove: (fromHex, toHex)=>expensiveHexes.has(toHex)?1.5:1,
                costRotate: (fromHex, fromAngle, toAngle)=>1,
                minimalCost: 1,
                maxCost: 3
            };
            var inRangeMoves = getInRangeMoves(config);
        then:
            assert([...new Set(inRangeMoves.values())]).unorderedArrayEqualsTo([
                map.getHex(11, 2),
                map.getHex(11, 3),
                map.getHex(10, 1),
                map.getHex(9, 2),
                map.getHex(9, 3)
            ]);
    });

    it("Checks line of sight along a string a aligned hexes", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var lineOfSight = new WLineOfSight(map.getHex(4, 5), map.getHex(6, 4));
        then:
            assert(lineOfSight.getPath()).arrayEqualsTo([
                [map.getHex(4, 5)],
                [map.getHex(5, 5)],
                [map.getHex(6, 4)]
            ]);
    });

    it("Checks line of sight along a vertex", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var lineOfSight = new WLineOfSight(map.getHex(4, 5), map.getHex(5, 4));
        then:
            assert(lineOfSight.getPath()).arrayEqualsTo([
                [map.getHex(4, 5)],
                [map.getHex(4, 4), map.getHex(5, 5)],
                [map.getHex(5, 4)]
            ]);
    });

    it("Checks line of sight along a random path", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var lineOfSight = new WLineOfSight(map.getHex(4, 5), map.getHex(6, 3));
        then:
            assert(lineOfSight.getPath()).arrayEqualsTo([
                [map.getHex(4, 5)],
                [map.getHex(5, 5)],
                [map.getHex(5, 4)],
                [map.getHex(6, 3)]
            ]);
    });

    it("Checks line of sight along a random path", () => {
        given:
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            var game = new CBTestGame();
        when:
            game.setMap(map);
            var lineOfSight = new WLineOfSight(map.getHex(4, 5), map.getHex(3, 0));
        then:
            assert(lineOfSight.getPath()).arrayEqualsTo([
                [map.getHex(4, 5)],
                [map.getHex(4, 4)],
                [map.getHex(4, 3)],
                [map.getHex(4, 2)],
                [map.getHex(3, 2)],
                [map.getHex(3, 1)],
                [map.getHex(3, 0)]
            ]);
    });

});