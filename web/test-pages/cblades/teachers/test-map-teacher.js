'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHexSideId, CBMap, CBMoveType
} from "../../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer
} from "../../../jslib/cblades/game.js";
import {
    CBCharacter,
    CBCommandProfile,
    CBFormation,
    CBMoralProfile,
    CBMoveProfile,
    CBTroop,
    CBUnitType, CBWeaponProfile,
    CBWeather,
    CBWing
} from "../../../jslib/cblades/unit.js";
import {
    reverseAngle
} from "../../../jslib/geometry.js";
import {
    CBMapTeacher
} from "../../../jslib/cblades/teachers/map-teacher.js";
import {
    setDrawPlatform
} from "../../../jslib/draw.js";
import {
    mergeClasses,
    mockPlatform
} from "../../mocks.js";

describe("Map teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher);

    function createTinyGame() {
        let game = new CBGame();
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        game.start();
        return {game, arbitrator, map};
    }

    it("Checks the area around an hex", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            let area = arbitrator.get360Area(map.getHex(4, 5), 2);
            let hexMap = new Map();
            for (let zone of area) {
                hexMap.set(zone.hex, zone.distance);
            }
        then:
            assert(hexMap.size).equalsTo(19);
            assert(hexMap.get(map.getHex(4, 5))).equalsTo(0);
            assert(hexMap.get(map.getHex(4, 4))).equalsTo(1);
            assert(hexMap.get(map.getHex(4, 3))).equalsTo(2);
            assert(hexMap.get(map.getHex(5, 4))).equalsTo(2);
            assert(hexMap.get(map.getHex(5, 5))).equalsTo(1);
            assert(hexMap.get(map.getHex(3, 5))).equalsTo(1);
            assert(hexMap.get(map.getHex(3, 4))).equalsTo(2);
            assert(hexMap.get(map.getHex(6, 4))).equalsTo(2);
            assert(hexMap.get(map.getHex(6, 5))).equalsTo(2);
            assert(hexMap.get(map.getHex(5, 6))).equalsTo(1);
            assert(hexMap.get(map.getHex(6, 6))).equalsTo(2);
            assert(hexMap.get(map.getHex(5, 7))).equalsTo(2);
            assert(hexMap.get(map.getHex(4, 6))).equalsTo(1);
            assert(hexMap.get(map.getHex(4, 7))).equalsTo(2);
            assert(hexMap.get(map.getHex(3, 7))).equalsTo(2);
            assert(hexMap.get(map.getHex(3, 6))).equalsTo(1);
            assert(hexMap.get(map.getHex(2, 6))).equalsTo(2);
            assert(hexMap.get(map.getHex(2, 5))).equalsTo(2);
            assert(hexMap.get(map.getHex(2, 6))).equalsTo(2);
    });

    class CBTestUnitType extends CBUnitType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new CBWeaponProfile());
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
            }
        }
    }

    function create2Players4UnitsTinyGame() {
        let game = new CBGame();
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(unitType1, wing1);
        game.addUnit(unit11, map.getHex(5, 8));
        let unit12 = new CBTroop(unitType1, wing1);
        game.addUnit(unit12, map.getHex(5, 7));
        let leaderType1 = new CBTestUnitType("leader1", ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        game.start();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    function create2PlayersTinyFormationGame() {
        let game = new CBGame();
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let wing1 = new CBWing(player1);
        let unitType1 = new CBTestUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
        let unit1 = new CBTroop(unitType1, wing1);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing1);
        game.addUnit(unit2, map.getHex(5, 6));
        let wing2 = new CBWing(player2);
        let unitType2 = new CBTestUnitType("unit2",
            ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"],
            ["/CBlades/)images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"]);
        let formation2 = new CBFormation(unitType2, wing2);
        formation2.angle = 90;
        game.addUnit(formation2, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
        game.start();
        return {game, arbitrator, map, unit1, unit2, formation2, wing1, wing2, player1, player2};
    }

    function assertNotInZone(zones, angle) {
        assert(zones[angle]).isNotDefined();
    }

    function assertInZone(zones, angle, col, row) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
    }

    it("Checks unit adjacent zone", () => {
        given:
            var {arbitrator, unit12, map} = create2Players4UnitsTinyGame();
        when:
            unit12.move(map.getHex(3, 4));
            var zones = arbitrator.getUnitAdjacentZone(unit12);
        then:
            assertInZone(zones, 0, 3, 3);
            assertInZone(zones, 60, 4, 3);
            assertInZone(zones, 120, 4, 4);
            assertInZone(zones, 180, 3, 5);
            assertInZone(zones, 240, 2, 4);
            assertInZone(zones, 300, 2, 3);
    });

    it("Checks hex in zone", () => {
        given:
            var {arbitrator, unit12, map} = create2Players4UnitsTinyGame();
        when:
            unit12.move(map.getHex(3, 4));
            var zones = arbitrator.getUnitAdjacentZone(unit12);
            var hexes = arbitrator.getHexesFromZones(zones);
        then:
            assert(hexes).setEqualsTo(new Set([
                map.getHex(3, 3),
                map.getHex(4, 3),
                map.getHex(4, 4),
                map.getHex(3, 5),
                map.getHex(2, 4),
                map.getHex(2, 3)
            ]));
    });

    it("Checks unit forward zone", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 300, 4, 6);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(300))).equalsTo(300);
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(0))).equalsTo(0);
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(60))).equalsTo(60);
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(240))).isFalse();
        when:
            unit12.angle = 30;
            zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(0))).equalsTo(0);
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(60))).equalsTo(60);
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(240))).isFalse();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, unit12.hexLocation.getNearHex(300))).isFalse();
    });

    it("Checks unit forward area", () => {
        given:
            var {arbitrator, map, unit1, formation2} = create2PlayersTinyFormationGame();
        when:
            var result = arbitrator.getUnitForwardArea(unit1, 2);
        then:
            assert(result.length).equalsTo(8);
            assert(new Set(result)).setEqualsTo(new Set([
            map.getHex(3, 7), map.getHex(4, 7), map.getHex(5, 7), map.getHex(6, 7),
            map.getHex(4, 6), map.getHex(5, 6), map.getHex(6, 6), map.getHex(7, 7)
        ]));
        when:
            result = arbitrator.getUnitForwardArea(formation2, 2);
        then:
            assert(result.length).equalsTo(7);
            assert(new Set(result)).setEqualsTo(new Set([
            map.getHex(7, 7), map.getHex(7, 8), map.getHex(7, 9),
            map.getHex(8, 6), map.getHex(8, 7), map.getHex(8, 8), map.getHex(8, 9)
        ]));
        when:
            result = arbitrator.getUnitForwardAreaFromHex(formation2, formation2.hexLocation.fromHex, 2);
        then:
            assert(result.length).equalsTo(5);
            assert(new Set(result)).setEqualsTo(new Set([
            map.getHex(7, 8), map.getHex(7, 9),
            map.getHex(8, 7), map.getHex(8, 8), map.getHex(8, 9)
        ]));
    });

    it("Checks unit backward zone", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var zones = arbitrator.getUnitBackwardZone(unit11);
        then:
            assertInZone(zones, 120, 6, 8);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(120))).equalsTo(120);
            assertInZone(zones, 180, 5, 9);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(180))).equalsTo(180);
            assertInZone(zones, 240, 4, 8);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(240))).equalsTo(240);
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(300))).isFalse();
            assertNotInZone(zones, 0);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(0))).isFalse();
            assertNotInZone(zones, 60);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(60))).isFalse();
        when:
            unit11.angle = 30;
            zones = arbitrator.getUnitBackwardZone(unit11);
        then:
            assertInZone(zones, 180, 5, 9);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(180))).equalsTo(180);
            assertInZone(zones, 240, 4, 8);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(240))).equalsTo(240);
            assertNotInZone(zones, 0);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(0))).isFalse();
            assertNotInZone(zones, 60);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(60))).isFalse();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, unit11.hexLocation.getNearHex(300))).isFalse();
    });

    function create2Players1Formation2TroopsTinyGame() {
        let game = new CBGame();
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1",
            ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"],
            [
                "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png",
                "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
                "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png"
            ])
        let formation1 = new CBFormation(unitType1, wing1);
        game.addUnit(formation1, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
        formation1.angle = 90;
        let leaderType1 = new CBTestUnitType("leader1", ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        game.start();
        return {game, arbitrator, map, player1, formation1, leader11, player2, unit21, unit22, leader21};
    }

    it("Checks formation adjacent zone", () => {
        given:
            var {arbitrator, formation1, map} = create2Players1Formation2TroopsTinyGame();
        when:
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            var zones = arbitrator.getUnitAdjacentZone(formation1);
        then:
            assertInZone(zones, 0, 3, 3);
            assertInZone(zones, 60, 4, 3);
            assertInZone(zones, 90, 4, 4);
            assertInZone(zones, 120, 4, 5);
            assertInZone(zones, 180, 3, 6);
            assertInZone(zones, 240, 2, 5);
            assertInZone(zones, 270, 2, 4);
            assertInZone(zones, 300, 2, 3);
    });

    it("Checks formation forward zone", () => {
        given:
            var {arbitrator, formation1, map} = create2Players1Formation2TroopsTinyGame();
        when:
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            var zones = arbitrator.getUnitForwardZone(formation1);
        then:
            assertNotInZone(zones, 0);
            assertInZone(zones, 60, 4, 3);
            assertInZone(zones, 90, 4, 4);
            assertInZone(zones, 120, 4, 5);
            assertNotInZone(zones, 180);
            assertNotInZone(zones, 240);
            assertNotInZone(zones, 270);
            assertNotInZone(zones, 300);
    });

    it("Checks formation backward zone", () => {
        given:
            var {arbitrator, formation1, map} = create2Players1Formation2TroopsTinyGame();
        when:
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            var zones = arbitrator.getUnitBackwardZone(formation1);
        then:
            assertNotInZone(zones, 0, 3, 3);
            assertNotInZone(zones, 60, 4, 3);
            assertNotInZone(zones, 90, 4, 4);
            assertNotInZone(zones, 120, 4, 5);
            assertNotInZone(zones, 180, 3, 6);
            assertInZone(zones, 240, 2, 5);
            assertInZone(zones, 270, 2, 4);
            assertInZone(zones, 300, 2, 3);
    });

    it("Checks get weather", () => {
        given:
            var {arbitrator} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getWeather()).equalsTo(CBWeather.CLEAR);
    });

});