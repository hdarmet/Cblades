'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHex,
    CBHexSideId, CBMap
} from "../../../jslib/cblades/map.js";
import {
    CBAbstractPlayer
} from "../../../jslib/cblades/game.js";
import {
    CBGame
} from "../../../jslib/cblades/playable.js";
import {
    CBCharacter,
    CBCommandProfile,
    CBFormation,
    CBMoralProfile,
    CBMoveProfile,
    CBTroop,
    CBUnitType, CBWeaponProfile,
    CBWing
} from "../../../jslib/cblades/unit.js";
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
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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

    class TestMoveProfile extends CBMoveProfile {

        constructor(capacity = 0) {
            super(capacity);
        }

        getMovementCostOnHex(hex) {
            switch (hex.type) {
                case CBHex.HEX_TYPES.OUTDOOR_ROUGH: return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
                case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT: return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
                case CBHex.HEX_TYPES.IMPASSABLE: return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            }
            return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
        }

        getMovementCostOnHexSide(hexSide) {
            switch (hexSide.type) {
                case CBHex.HEXSIDE_TYPES.EASY: return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
                case CBHex.HEXSIDE_TYPES.DIFFICULT: return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
                case CBHex.HEXSIDE_TYPES.CLIMB: return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
                case CBHex.HEXSIDE_TYPES.WALL: return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            }
            return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
        }

    }

    class CBTestUnitType extends CBUnitType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new TestMoveProfile());
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
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(unitType1, wing1);
        unit11.addToMap(map.getHex(5, 8));
        let unit12 = new CBTroop(unitType1, wing1);
        unit12.addToMap(map.getHex(5, 7));
        let leaderType1 = new CBTestUnitType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
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
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"]);
        let unit1 = new CBTroop(unitType1, wing1);
        unit1.addToMap(map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing1);
        unit2.addToMap(map.getHex(5, 6));
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        let unitType2 = new CBTestUnitType("unit2",
            ["./../images/units/misc/unit2.png", "./../images/units/misc/unit2b.png"],
            ["./../)images/units/misc/formation2.png", "./../images/units/misc/formation2b.png"]);
        let formation2 = new CBFormation(unitType2, wing2);
        formation2.angle = 90;
        formation2.addToMap(new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
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
        when:
            var farHexLocation = unit12.hexLocation.getNearHex(60).getNearHex(60);
        then:
            assert(arbitrator.isHexInForwardZone(unit12, unit12.hexLocation, farHexLocation)).isFalse();
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
        when:
            var farHexLocation = unit11.hexLocation.getNearHex(240).getNearHex(240);
        then:
            assert(arbitrator.isHexInBackwardZone(unit11, unit11.hexLocation, farHexLocation)).isFalse();
    });

    function create2Players1Formation2TroopsTinyGame() {
        let game = new CBGame();
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1",
            ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"],
            [
                "./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png",
                "./../images/units/misc/formation2.png", "./../images/units/misc/formation2b.png",
                "./../images/units/misc/formation3.png", "./../images/units/misc/formation3b.png"
            ])
        let formation1 = new CBFormation(unitType1, wing1);
        formation1.addToMap(new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
        formation1.angle = 90;
        let leaderType1 = new CBTestUnitType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
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

    it("Checks unit cross cost", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getTerrainCrossCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:0});
        when:
            unit12.hexLocation.toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
        then:
            assert(arbitrator.getTerrainCrossCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE});
        when:
            unit12.hexLocation.toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.getTerrainCrossCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.IMPASSABLE});
    });

    it("Checks unit move cost", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getTerrainMoveCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:1});
        when:
            unit12.hexLocation.toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
        then:
            assert(arbitrator.getTerrainMoveCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.SET, value:0.5});
        when:
            unit12.hexLocation.toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
        then:
            assert(arbitrator.getTerrainMoveCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE});
        when:
            unit12.hexLocation.toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.getTerrainMoveCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.IMPASSABLE});
    });

    it("Checks unit rotation cost", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getTerrainRotationCost(unit12, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:0.5});
    });

    it("Checks formation move cost", () => {
        given:
            var {arbitrator, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.getFormationTerrainMoveCost(formation1, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:1});
        when:
            formation1.hexLocation.fromHex.getNearHex(60).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        then:
            assert(arbitrator.getFormationTerrainMoveCost(formation1, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE});
        when:
            formation1.hexLocation.fromHex.getNearHex(60).type = CBHex.HEX_TYPES.IMPASSABLE;
        then:
            assert(arbitrator.getFormationTerrainMoveCost(formation1, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.IMPASSABLE});
    });

    it("Checks formation turn cost", () => {
        given:
            var {arbitrator, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.getFormationTerrainTurnCost(formation1, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:1});
    });

    it("Checks formation rotation cost", () => {
        given:
            var {arbitrator, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.getFormationTerrainRotationCost(formation1, 60)).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:1});
    });

    it("Checks if a hex is clear", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            map.getHex(3, 1).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            map.getHex(3, 2).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            map.getHex(3, 3).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
            map.getHex(3, 4).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
            map.getHex(3, 5).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
            map.getHex(3, 6).type = CBHex.HEX_TYPES.WATER;
            map.getHex(3, 7).type = CBHex.HEX_TYPES.LAVA;
            map.getHex(3, 8).type = CBHex.HEX_TYPES.IMPASSABLE;
            map.getHex(4, 1).type = CBHex.HEX_TYPES.CAVE_CLEAR;
            map.getHex(4, 2).type = CBHex.HEX_TYPES.CAVE_ROUGH;
            map.getHex(4, 3).type = CBHex.HEX_TYPES.CAVE_DIFFICULT;
            map.getHex(4, 4).type = CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
            map.getHex(4, 5).type = CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
            map.getHex(4, 6).type = CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
        then:
            assert(arbitrator.isClearGround(map.getHex(3, 0))).isTrue();
            assert(arbitrator.isClearGround(map.getHex(3, 1))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 2))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 3))).isTrue();
            assert(arbitrator.isClearGround(map.getHex(3, 4))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 5))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 6))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 7))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(4, 1))).isTrue();
            assert(arbitrator.isClearGround(map.getHex(4, 2))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(4, 3))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(4, 4))).isTrue();
            assert(arbitrator.isClearGround(map.getHex(4, 5))).isFalse();
            assert(arbitrator.isClearGround(map.getHex(4, 6))).isFalse();
    });

    it("Checks if a hex is rough", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            map.getHex(3, 1).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            map.getHex(3, 2).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            map.getHex(3, 3).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
            map.getHex(3, 4).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
            map.getHex(3, 5).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
            map.getHex(3, 6).type = CBHex.HEX_TYPES.WATER;
            map.getHex(3, 7).type = CBHex.HEX_TYPES.LAVA;
            map.getHex(3, 8).type = CBHex.HEX_TYPES.IMPASSABLE;
            map.getHex(4, 1).type = CBHex.HEX_TYPES.CAVE_CLEAR;
            map.getHex(4, 2).type = CBHex.HEX_TYPES.CAVE_ROUGH;
            map.getHex(4, 3).type = CBHex.HEX_TYPES.CAVE_DIFFICULT;
            map.getHex(4, 4).type = CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
            map.getHex(4, 5).type = CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
            map.getHex(4, 6).type = CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
        then:
            assert(arbitrator.isRoughGround(map.getHex(3, 0))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 1))).isTrue();
            assert(arbitrator.isRoughGround(map.getHex(3, 2))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 3))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 4))).isTrue();
            assert(arbitrator.isRoughGround(map.getHex(3, 5))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 6))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 7))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(4, 1))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(4, 2))).isTrue();
            assert(arbitrator.isRoughGround(map.getHex(4, 3))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(4, 4))).isFalse();
            assert(arbitrator.isRoughGround(map.getHex(4, 5))).isTrue();
            assert(arbitrator.isRoughGround(map.getHex(4, 6))).isFalse();
    });

    it("Checks if a hex is difficult", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            map.getHex(3, 1).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            map.getHex(3, 2).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            map.getHex(3, 3).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
            map.getHex(3, 4).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
            map.getHex(3, 5).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
            map.getHex(3, 6).type = CBHex.HEX_TYPES.WATER;
            map.getHex(3, 7).type = CBHex.HEX_TYPES.LAVA;
            map.getHex(3, 8).type = CBHex.HEX_TYPES.IMPASSABLE;
            map.getHex(4, 1).type = CBHex.HEX_TYPES.CAVE_CLEAR;
            map.getHex(4, 2).type = CBHex.HEX_TYPES.CAVE_ROUGH;
            map.getHex(4, 3).type = CBHex.HEX_TYPES.CAVE_DIFFICULT;
            map.getHex(4, 4).type = CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
            map.getHex(4, 5).type = CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
            map.getHex(4, 6).type = CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
        then:
            assert(arbitrator.isDifficultGround(map.getHex(3, 0))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 1))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 2))).isTrue();
            assert(arbitrator.isDifficultGround(map.getHex(3, 3))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 4))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 5))).isTrue();
            assert(arbitrator.isDifficultGround(map.getHex(3, 6))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 7))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(4, 1))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(4, 2))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(4, 3))).isTrue();
            assert(arbitrator.isDifficultGround(map.getHex(4, 4))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(4, 5))).isFalse();
            assert(arbitrator.isDifficultGround(map.getHex(4, 6))).isTrue();
    });

    it("Checks if a hex side is clear", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).toward(60).type = CBHex.HEXSIDE_TYPES.NORMAL;
            map.getHex(3, 1).toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
            map.getHex(3, 2).toward(60).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            map.getHex(3, 3).toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
            map.getHex(3, 4).toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.isClearHexSide(map.getHex(3, 0).toward(60))).isTrue();
            assert(arbitrator.isClearHexSide(map.getHex(3, 1).toward(60))).isTrue();
            assert(arbitrator.isClearHexSide(map.getHex(3, 2).toward(60))).isFalse();
            assert(arbitrator.isClearHexSide(map.getHex(3, 3).toward(60))).isFalse();
            assert(arbitrator.isClearHexSide(map.getHex(3, 4).toward(60))).isFalse();
    });

    it("Checks if a hex side is difficult", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).toward(60).type = CBHex.HEXSIDE_TYPES.NORMAL;
            map.getHex(3, 1).toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
            map.getHex(3, 2).toward(60).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            map.getHex(3, 3).toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
            map.getHex(3, 4).toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.isDifficultHexSide(map.getHex(3, 0).toward(60))).isFalse();
            assert(arbitrator.isDifficultHexSide(map.getHex(3, 1).toward(60))).isFalse();
            assert(arbitrator.isDifficultHexSide(map.getHex(3, 2).toward(60))).isTrue();
            assert(arbitrator.isDifficultHexSide(map.getHex(3, 3).toward(60))).isFalse();
            assert(arbitrator.isDifficultHexSide(map.getHex(3, 4).toward(60))).isFalse();
    });

    it("Checks if a hex side is impassable", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).toward(60).type = CBHex.HEXSIDE_TYPES.NORMAL;
            map.getHex(3, 1).toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
            map.getHex(3, 2).toward(60).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            map.getHex(3, 3).toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
            map.getHex(3, 4).toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.isImpassableHexSide(map.getHex(3, 0).toward(60))).isFalse();
            assert(arbitrator.isImpassableHexSide(map.getHex(3, 1).toward(60))).isFalse();
            assert(arbitrator.isImpassableHexSide(map.getHex(3, 2).toward(60))).isFalse();
            assert(arbitrator.isImpassableHexSide(map.getHex(3, 3).toward(60))).isTrue();
            assert(arbitrator.isImpassableHexSide(map.getHex(3, 4).toward(60))).isTrue();
    });

});