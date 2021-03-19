'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    loadAllImages,
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBHexSideId, CBMap, CBMoveType
} from "../../jslib/cblades/map.js";
import {
    CBAction, CBGame, CBAbstractPlayer, CBCounter
} from "../../jslib/cblades/game.js";
import {
    CBCharacter,
    CBCohesion,
    CBFormation,
    CBLackOfMunitions,
    CBMovement,
    CBTiredness,
    CBTroop,
    CBUnitType,
    CBWeather,
    CBWing
} from "../../jslib/cblades/unit.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    Dimension2D, reverseAngle
} from "../../jslib/geometry.js";

describe("Arbitrator", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    function createTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        game.start();
        loadAllImages();
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

    function create2Players4UnitsTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(unitType1, wing1);
        game.addUnit(unit11, map.getHex(5, 8));
        let unit12 = new CBTroop(unitType1, wing1);
        game.addUnit(unit12, map.getHex(5, 7));
        let leaderType1 = new CBUnitType("leader1", ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }
    function create2PlayersTinyFormationGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let wing1 = new CBWing(player1);
        let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
        let unit1 = new CBTroop(unitType1, wing1);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing1);
        game.addUnit(unit2, map.getHex(5, 6));
        let wing2 = new CBWing(player2);
        let unitType2 = new CBUnitType("unit2",
            ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"],
            ["/CBlades/)images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"]);
        let formation2 = new CBFormation(unitType2, wing2);
        formation2.angle = 90;
        game.addUnit(formation2, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, unit1, unit2, formation2, wing1, wing2, player1, player2};
    }

    it("Checks if a unit have to play this turn", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.mustPlayUnit(unit12)).isTrue();
        when:
            unit12.launchAction(new CBAction(unit12.game, unit12));
            unit12.action.markAsStarted();
        then:
            assert(arbitrator.mustPlayUnit(unit12)).isFalse();
        when:
            unit12.action.markAsFinished();
        then:
            assert(arbitrator.mustPlayUnit(unit12)).isFalse();
    });

    it("Checks unit allowed actions", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assert(allowedActions.moveForward).isDefined();
            assert(allowedActions.moveBack).isDefined();
            assert(allowedActions.escape).isDefined();
            assert(allowedActions.confront).isDefined();
            assert(allowedActions.shockAttack).isDefined();
            assert(allowedActions.fireAttack).isDefined();
            assert(allowedActions.shockDuel).isDefined();
            assert(allowedActions.fireDuel).isDefined();
            assert(allowedActions.rest).isDefined();
            assert(allowedActions.reload).isDefined();
            assert(allowedActions.reorganize).isDefined();
            assert(allowedActions.rally).isDefined();
            assert(allowedActions.createFormation).isDefined();
            assert(allowedActions.joinFormation).isDefined();
            assert(allowedActions.leaveFormation).isDefined();
            assert(allowedActions.breakFormation).isDefined();
            assert(allowedActions.takeCommand).isDefined();
            assert(allowedActions.leaveCommand).isDefined();
            assert(allowedActions.changeOrders).isDefined();
            assert(allowedActions.giveSpecificOrders).isDefined();
            assert(allowedActions.prepareSpell).isDefined();
            assert(allowedActions.castSpell).isDefined();
            assert(allowedActions.mergeUnit).isDefined();
            assert(allowedActions.miscAction).isDefined();
    });

    function assertNotInZone(zones, angle) {
        assert(zones[angle]).isNotDefined();
    }
    function assertInZone(zones, angle, col, row) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
    }
    function assertInRetreatZone(zones, angle, col, row, moveType) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
        assert(zones[angle].moveType).equalsTo(moveType);
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

    it("Checks unit forward zone", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 300, 4, 6);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(300))).isTrue();
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(0))).isTrue();
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(60))).isTrue();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(240))).isFalse();
        when:
            unit12.angle = 30;
            zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(0))).isTrue();
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(60))).isTrue();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(240))).isFalse();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexLocationInForwardZone(unit12, unit12.hexLocation.getNearHex(300))).isFalse();
    });

    it("Checks unit backward zone", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var zones = arbitrator.getUnitBackwardZone(unit11);
        then:
            assertInZone(zones, 120, 6, 8);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(120))).isTrue();
            assertInZone(zones, 180, 5, 9);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(180))).isTrue();
            assertInZone(zones, 240, 4, 8);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(240))).isTrue();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(300))).isFalse();
            assertNotInZone(zones, 0);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(0))).isFalse();
            assertNotInZone(zones, 60);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(60))).isFalse();
        when:
            unit11.angle = 30;
            zones = arbitrator.getUnitBackwardZone(unit11);
        then:
            assertInZone(zones, 180, 5, 9);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(180))).isTrue();
            assertInZone(zones, 240, 4, 8);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(240))).isTrue();
            assertNotInZone(zones, 0);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(0))).isFalse();
            assertNotInZone(zones, 60);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(60))).isFalse();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexLocationInBackwardZone(unit11, unit11.hexLocation.getNearHex(300))).isFalse();
    });

    function create2Players1Formation2TroopsTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unitType1 = new CBUnitType("unit1",
            ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"],
            [
                "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png",
                "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
                "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png"
            ])
        let formation1 = new CBFormation(unitType1, wing1);
        game.addUnit(formation1, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
        formation1.angle = 90;
        let leaderType1 = new CBUnitType("leader1", ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        game.start();
        loadAllImages();
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

    it("Checks that a hexside is in the forward/backward zone of a unit if at least one of its hexes is in that zone", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var hex1 = unit11.hexLocation.getNearHex(unit11.angle);
            var hex2 = hex1.getNearHex(unit11.angle);
            var hex3 = hex2.getNearHex(unit11.angle);
        then:
            assert(arbitrator.isHexLocationInForwardZone(unit11, new CBHexSideId(hex1, hex2))).isTrue();
            assert(arbitrator.isHexLocationInForwardZone(unit11, new CBHexSideId(hex2, hex1))).isTrue();
            assert(arbitrator.isHexLocationInForwardZone(unit11, new CBHexSideId(hex2, hex3))).isFalse();
        when:
            unit11.angle = reverseAngle(unit11.angle);
        then:
            assert(arbitrator.isHexLocationInBackwardZone(unit11, new CBHexSideId(hex1, hex2))).isTrue();
            assert(arbitrator.isHexLocationInBackwardZone(unit11, new CBHexSideId(hex2, hex1))).isTrue();
            assert(arbitrator.isHexLocationInBackwardZone(unit11, new CBHexSideId(hex2, hex3))).isFalse();
    });

    function assertNoMove(moves, angle) {
        assert(moves[angle]).isNotDefined();
    }
    function assertMove(moves, angle, col, row, type) {
        assert(moves[angle]).isDefined();
        assert(moves[angle].hex.col).equalsTo(col);
        assert(moves[angle].hex.row).equalsTo(row);
        assert(moves[angle].type).equalsTo(type);
    }

    it("Checks if a move action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToMove(unit12)).isTrue();
    });

    it("Checks if a move back action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToMoveBack(unit12)).isTrue();
    });

    it("Checks if a rout action is allowed", () => {
        given:
            var {arbitrator, unit21, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.isAllowedToRout(unit21)).isTrue();
            assert(arbitrator.isAllowedToRout(formation1)).isFalse();
    });

    it("Checks if a confront action is allowed", () => {
        given:
            var {arbitrator, unit11, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToConfront(unit11)).isFalse();
        when:
            unit21.move(unit11.hexLocation.getNearHex(180));
        then:
            assert(arbitrator.isAllowedToConfront(unit11)).isTrue();
    });

    it("Checks unit allowed moves", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6)); // foes on forward zone
        when:
            var allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertMove(allowedMoves, 300, 4, 6, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 0); // occupied by a foe
            assertMove(allowedMoves, 60, 6, 6, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
        when:
            unit12.movementPoints = 0.5;
            unit12.angle = 30;
            allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertNoMove(allowedMoves, 0); // occupied by a foe
            assertMove(allowedMoves, 60, 6, 6, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
        when:
            unit12.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertNoMove(allowedMoves, 60);
        when:
            allowedMoves = arbitrator.getAllowedMoves(unit12, true);
        then:
            assertMove(allowedMoves, 60, 6, 6, CBMovement.MINIMAL);
    });

    it("Checks unit allowed moves back", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6)); // foes on forward zone
            unit12.angle = 180;
        when:
            var allowedMoves = arbitrator.getAllowedMovesBack(unit12);
        then:
            assertMove(allowedMoves, 300, 4, 6, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 0); // occupied by a foe
            assertMove(allowedMoves, 60, 6, 6, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
        when:
            unit12.movementPoints = 0.5;
            unit12.angle = 210;
            allowedMoves = arbitrator.getAllowedMovesBack(unit12);
        then:
            assertNoMove(allowedMoves, 0); // occupied by a foe
            assertMove(allowedMoves, 60, 6, 6, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
        when:
            unit12.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getAllowedMovesBack(unit12);
        then:
            assertMove(allowedMoves, 60, 6, 6, CBMovement.MINIMAL);
    });

    it("Checks unit allowed retreat", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit12.angle = 180;
            unit21.move(map.getHex(5, 6)); // foes on backward zone
        when:
            var allowedRetreats = arbitrator.getRetreatZones(unit12, unit21);
        then:
            assertNotInZone(allowedRetreats, 300); // adjacent to attacker
            assertNotInZone(allowedRetreats, 0); // occupied by a foe
            assertNotInZone(allowedRetreats, 60); // adjacent to attacker
            assertInRetreatZone(allowedRetreats, 120, 6, 7, CBMoveType.FORWARD);
            assertInRetreatZone(allowedRetreats, 180, 5, 8, CBMoveType.FORWARD);
            assertInRetreatZone(allowedRetreats, 240, 4, 7, CBMoveType.FORWARD);
        when:
            unit12.angle = 30;
            allowedRetreats = arbitrator.getRetreatZones(unit12, unit21);
        then:
            assertNotInZone(allowedRetreats, 0); // occupied by a foe
            assertNotInZone(allowedRetreats, 60); // adjacent to attacker
            assertNotInZone(allowedRetreats, 120);
            assertInRetreatZone(allowedRetreats, 180, 5, 8, CBMoveType.BACKWARD);
            assertInRetreatZone(allowedRetreats, 240, 4, 7, CBMoveType.BACKWARD);
            assertNotInZone(allowedRetreats, 300);
    });

    it("Checks formation allowed moves", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(4, 3)); // foes on forward zone
        when:
            var allowedMoves = arbitrator.getFormationAllowedMoves(formation1);
        then:
            assertNoMove(allowedMoves, 0); // Not in forward zone
            assertNoMove(allowedMoves, 60); // occupied by a foe
            assertNoMove(allowedMoves, 90); // Not used
            assertMove(allowedMoves, 120, 4, 5, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 180); // Not in forward zone
            assertNoMove(allowedMoves, 240); // Not in forward zone
            assertNoMove(allowedMoves, 270); // Not in forward zone
            assertNoMove(allowedMoves, 300); // Not in forward zone
        when:
            formation1.movementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMoves(formation1);
        then:
            assertMove(allowedMoves, 120, 4, 5, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMoves(formation1);
        then:
            assertNoMove(allowedMoves, 120);
        when:
            allowedMoves = arbitrator.getFormationAllowedMoves(formation1, true);
        then:
            assertMove(allowedMoves, 120, 4, 5,  CBMovement.MINIMAL);
    });

    it("Checks formation allowed forward rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
        when:
            var allowedMoves = arbitrator.getFormationAllowedRotations(formation1);
        then:
            assertNoMove(allowedMoves, 0); // Not in forward zone
            assertMove(allowedMoves, 60, 4, 4, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 90); // Not used
            assertMove(allowedMoves, 120, 4, 4, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 180); // Not in forward zone
            assertNoMove(allowedMoves, 240); // Not in forward zone
            assertNoMove(allowedMoves, 270); // Not in forward zone
            assertNoMove(allowedMoves, 300); // Not in forward zone
        when:
            formation1.movementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedRotations(formation1);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.EXTENDED);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedRotations(formation1);
        then:
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
        when:
            allowedMoves = arbitrator.getFormationAllowedRotations(formation1, true);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.MINIMAL);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.MINIMAL);
        given:
            unit21.move(map.getHex(4, 4)); // foes on forward zone
        when:
            allowedMoves = arbitrator.getFormationAllowedRotations(formation1);
        then:
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
    });

    it("Checks formation allowed moves back", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            formation1.angle = 270;
            unit21.move(map.getHex(4, 3)); // foes on backward zone
        when:
            var allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1);
        then:
            assertNoMove(allowedMoves, 0); // Not in forward zone
            assertNoMove(allowedMoves, 60); // occupied by a foe
            assertNoMove(allowedMoves, 90); // Not used
            assertMove(allowedMoves, 120, 4, 5, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 180); // Not in forward zone
            assertNoMove(allowedMoves, 240); // Not in forward zone
            assertNoMove(allowedMoves, 270); // Not in forward zone
            assertNoMove(allowedMoves, 300); // Not in forward zone
        when:
            formation1.movementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1);
        then:
            assertMove(allowedMoves, 120, 4, 5, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1);
        then:
            assertMove(allowedMoves, 120, 4, 5,  CBMovement.MINIMAL);
    });

    it("Checks formation allowed backward rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            formation1.angle = 270;
        when:
            var allowedMoves = arbitrator.getFormationAllowedMovesBackRotations(formation1);
        then:
            assertNoMove(allowedMoves, 0); // Not in forward zone
            assertMove(allowedMoves, 60, 4, 4, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 90); // Not used
            assertMove(allowedMoves, 120, 4, 4, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 180); // Not in forward zone
            assertNoMove(allowedMoves, 240); // Not in forward zone
            assertNoMove(allowedMoves, 270); // Not in forward zone
            assertNoMove(allowedMoves, 300); // Not in forward zone
        when:
            formation1.movementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBackRotations(formation1);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.EXTENDED);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBackRotations(formation1);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.MINIMAL);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.MINIMAL);
        given:
            unit21.move(map.getHex(4, 4)); // foes on backward zone
        when:
            allowedMoves = arbitrator.getFormationAllowedMovesBackRotations(formation1);
        then:
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
    });

    it("Checks formation allowed retreat", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(4, 3));
        when:
            var { retreatDirections, rotateDirections } = arbitrator.getFormationRetreatZones(formation1, unit21);
        then:
            assertNotInZone(retreatDirections, 0); // side
            assertNotInZone(retreatDirections, 60); // occupied by a foe
            assertNotInZone(retreatDirections, 90); // not used
            assertNotInZone(retreatDirections, 120); // adjacent to attacker
            assertNotInZone(retreatDirections, 180); // side
            assertInRetreatZone(retreatDirections, 240, 2, 5, CBMoveType.BACKWARD);
            assertNotInZone(retreatDirections, 270); // not used
            assertInRetreatZone(retreatDirections, 300, 2, 3, CBMoveType.BACKWARD);

            assertNotInZone(rotateDirections, 0); // side
            assertNotInZone(rotateDirections, 60); // occupied by a foe
            assertNotInZone(rotateDirections, 90); // not used
            assertNotInZone(rotateDirections, 120); // adjacent to attacker
            assertNotInZone(rotateDirections, 180); // side
            assertInRetreatZone(rotateDirections, 240, 2, 4, CBMoveType.BACKWARD);
            assertNotInZone(rotateDirections, 270); // not used
            assertNotInZone(rotateDirections, 300); // adjacent to attacker
        given:
            unit21.move(map.getHex(4, 5));
        when:
            ({ retreatDirections, rotateDirections } = arbitrator.getFormationRetreatZones(formation1, unit21));
        then:
            assertNotInZone(retreatDirections, 0); // side
            assertNotInZone(retreatDirections, 60); // occupied by a foe
            assertNotInZone(retreatDirections, 90); // not used
            assertNotInZone(retreatDirections, 120); // adjacent to attacker
            assertNotInZone(retreatDirections, 180); // side
            assertInRetreatZone(retreatDirections, 240, 2, 5, CBMoveType.BACKWARD);
            assertNotInZone(retreatDirections, 270); // not used
            assertInRetreatZone(retreatDirections, 300, 2, 3, CBMoveType.BACKWARD);

            assertNotInZone(rotateDirections, 0); // side
            assertNotInZone(rotateDirections, 60); // occupied by a foe
            assertNotInZone(rotateDirections, 90); // not used
            assertNotInZone(rotateDirections, 120); // adjacent to attacker
            assertNotInZone(rotateDirections, 180); // side
            assertNotInZone(rotateDirections, 240); // adjacent to attacker
            assertNotInZone(rotateDirections, 270); // not used
            assertInRetreatZone(rotateDirections, 300, 2, 4, CBMoveType.BACKWARD);
    });

    function assertNoRotation(rotations, angle) {
        assert(rotations[angle]).isNotDefined();
    }
    function assertSideRotation(rotations, angle, col, row, type) {
        assert(rotations[angle].hex.col).equalsTo(col);
        assert(rotations[angle].hex.row).equalsTo(row);
        assert(rotations[angle].type).equalsTo(type);
    }
    function assertVertexRotation(rotations, angle, col1, row1, col2, row2, type) {
        assert(rotations[angle].hex.fromHex.col).equalsTo(col1);
        assert(rotations[angle].hex.fromHex.row).equalsTo(row1);
        assert(rotations[angle].hex.toHex.col).equalsTo(col2);
        assert(rotations[angle].hex.toHex.row).equalsTo(row2);
        assert(rotations[angle].type).equalsTo(type);
    }

    it("Checks unit allowed rotations", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var allowedRotations = arbitrator.getAllowedRotations(unit12);
        then:
            assertNoRotation(allowedRotations, 0);
            assertVertexRotation(allowedRotations, 30, 5, 6, 6, 6, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 60, 6, 6, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 90, 6, 6, 6, 7, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 120, 6, 7, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 150, 6, 7, 5, 8, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 180, 5, 8, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 210, 5, 8, 4, 7, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 240, 4, 7, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 270, 4, 7, 4, 6, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 300, 4, 6, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 330, 4, 6, 5, 6, CBMovement.NORMAL);
        when:
            unit12.movementPoints = 0;
            unit12.angle = 30;
            allowedRotations = arbitrator.getAllowedRotations(unit12);
        then:
            assertSideRotation(allowedRotations, 0, 5, 6, CBMovement.EXTENDED);
            assertNoRotation(allowedRotations, 30);
            assertSideRotation(allowedRotations, 60, 6, 6, CBMovement.EXTENDED);
            assertVertexRotation(allowedRotations, 90, 6, 6, 6, 7, CBMovement.EXTENDED);
            assertSideRotation(allowedRotations, 120, 6, 7, CBMovement.EXTENDED);
            assertVertexRotation(allowedRotations, 150, 6, 7, 5, 8, CBMovement.EXTENDED);
            assertSideRotation(allowedRotations, 180, 5, 8, CBMovement.EXTENDED);
            assertVertexRotation(allowedRotations, 210, 5, 8, 4, 7, CBMovement.EXTENDED);
            assertSideRotation(allowedRotations, 240, 4, 7, CBMovement.EXTENDED);
            assertVertexRotation(allowedRotations, 270, 4, 7, 4, 6, CBMovement.EXTENDED);
            assertSideRotation(allowedRotations, 300, 4, 6, CBMovement.EXTENDED);
            assertVertexRotation(allowedRotations, 330, 4, 6, 5, 6, CBMovement.EXTENDED);
        when:
            unit12.extendedMovementPoints = 0;
            allowedRotations = arbitrator.getAllowedRotations(unit12);
        then:
            assertNoRotation(allowedRotations, 0);
            assertNoRotation(allowedRotations, 30);
            assertNoRotation(allowedRotations, 60);
            assertNoRotation(allowedRotations, 90);
            assertNoRotation(allowedRotations, 120);
            assertNoRotation(allowedRotations, 150);
            assertNoRotation(allowedRotations, 180);
            assertNoRotation(allowedRotations, 210);
            assertNoRotation(allowedRotations, 240);
            assertNoRotation(allowedRotations, 270);
            assertNoRotation(allowedRotations, 300);
            assertNoRotation(allowedRotations, 330);
        when:
            allowedRotations = arbitrator.getAllowedRotations(unit12, true);
        then:
            assertSideRotation(allowedRotations, 0, 5, 6, CBMovement.MINIMAL);
            assertNoRotation(allowedRotations, 30);
            assertSideRotation(allowedRotations, 60, 6, 6, CBMovement.MINIMAL);
            assertVertexRotation(allowedRotations, 90, 6, 6, 6, 7, CBMovement.MINIMAL);
            assertSideRotation(allowedRotations, 120, 6, 7, CBMovement.MINIMAL);
            assertVertexRotation(allowedRotations, 150, 6, 7, 5, 8, CBMovement.MINIMAL);
            assertSideRotation(allowedRotations, 180, 5, 8, CBMovement.MINIMAL);
            assertVertexRotation(allowedRotations, 210, 5, 8, 4, 7, CBMovement.MINIMAL);
            assertSideRotation(allowedRotations, 240, 4, 7, CBMovement.MINIMAL);
            assertVertexRotation(allowedRotations, 270, 4, 7, 4, 6, CBMovement.MINIMAL);
            assertSideRotation(allowedRotations, 300, 4, 6, CBMovement.MINIMAL);
            assertVertexRotation(allowedRotations, 330, 4, 6, 5, 6, CBMovement.MINIMAL);
    });

    it("Checks unit allowed confrontation rotations", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6)); // foes on forward zone
            unit12.angle = 180;
        when:
            var allowedRotations = arbitrator.getConfrontAllowedRotations(unit12);
        then:
            assertSideRotation(allowedRotations, 0, 5, 6, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 30, 5, 6, 6, 6, CBMovement.NORMAL);
            assertSideRotation(allowedRotations, 60, 6, 6, CBMovement.NORMAL);
            assertNoRotation(allowedRotations, 90);
            assertNoRotation(allowedRotations, 120);
            assertNoRotation(allowedRotations, 150);
            assertNoRotation(allowedRotations, 180);
            assertNoRotation(allowedRotations, 210);
            assertNoRotation(allowedRotations, 240);
            assertNoRotation(allowedRotations, 270);
            assertSideRotation(allowedRotations, 300, 4, 6, CBMovement.NORMAL);
            assertVertexRotation(allowedRotations, 330, 4, 6, 5, 6, CBMovement.NORMAL);
    });

    function assertRotate(rotates, angle, hexId1, hexId2, type) {
        assert(rotates[angle]).isDefined();
        assert(rotates[angle].hex.fromHex).equalsTo(hexId1);
        assert(rotates[angle].hex.toHex).equalsTo(hexId2);
        assert(rotates[angle].type).equalsTo(type);
    }

    it("Checks formation allowed rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(4, 3)); // foes on forward zone
        when:
            var allowedRotations = arbitrator.getAllowedRotations(formation1);
        then:
            assertNoMove(allowedRotations, 0); // angle not allowed
            assertNoMove(allowedRotations, 60); // angle not allowed
            assertNoMove(allowedRotations, 90); // angle not allowed
            assertNoMove(allowedRotations, 120); // angle not allowed
            assertNoMove(allowedRotations, 180); // angle not allowed
            assertNoMove(allowedRotations, 240); // angle not allowed
            assertRotate(allowedRotations, 270, map.getHex(2, 5), map.getHex(2, 3), CBMovement.NORMAL);
            assertNoMove(allowedRotations, 300); // angle not allowed
        when:
            formation1.movementPoints = 0.5;
            allowedRotations = arbitrator.getAllowedRotations(formation1);
        then:
            assertRotate(allowedRotations, 270, map.getHex(2, 5), map.getHex(2, 3), CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedRotations = arbitrator.getAllowedRotations(formation1);
        then:
            assertNoMove(allowedRotations, 270);
        when:
            allowedRotations = arbitrator.getAllowedRotations(formation1, true);
        then:
            assertRotate(allowedRotations, 270, map.getHex(2, 5), map.getHex(2, 3), CBMovement.MINIMAL);
    });

    it("Checks formation confront allowed rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21, unit22} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(3, 6)); // foes on backward zone
            unit22.move(map.getHex(2, 5)); // foes on backward zone
        when:
            var allowedMoves = arbitrator.getConfrontFormationAllowedRotations(formation1);
        then:
            assertNoMove(allowedMoves, 0);
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 90);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 270);
            assertMove(allowedMoves, 300, 2, 4, CBMovement.NORMAL);
    });

    it("Checks unit move cost", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getMovementCost(unit12, 60)).equalsTo(1);
    });

    it("Checks unit rotation cost", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getRotationCost(unit12, 60)).equalsTo(0.5);
    });

    it("Checks formation move cost", () => {
        given:
            var {arbitrator, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.getFormationMovementCost(formation1, 60)).equalsTo(1);
    });

    it("Checks formation rotation cost", () => {
        given:
            var {arbitrator, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.getFormationRotationCost(formation1, 60)).equalsTo(1);
    });

    it("Checks if movement inflicts tiredness", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            unit12.movementPoints = 1;
            assert(arbitrator.doesMovementInflictTiredness(unit12, 1)).isFalse();
            assert(arbitrator.doesMovementInflictTiredness(unit12, 2)).isTrue();
    });

    it("Checks if a rest action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToRest(unit12)).isFalse();
        when:
            unit12.addOneTirednessLevel();
        then:
            assert(arbitrator.isAllowedToRest(unit12)).isTrue();
    });

    it("Checks rest result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processRestResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
            assert(result.minorRestingCapacity).isFalse();
        when:
            result = arbitrator.processRestResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
            assert(result.minorRestingCapacity).isTrue();
    });

    it("Checks replenish munitions result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processReplenishMunitionsResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks reorganize result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processReorganizeResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks rally result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processRallyResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks attacker engagement result", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processAttackerEngagementResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processAttackerEngagementResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks defender engagement result", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processDefenderEngagementResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processDefenderEngagementResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks confront engagement result", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processConfrontEngagementResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processConfrontEngagementResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks disengagement result", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processDisengagementResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processDisengagementResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks if players are foes", () => {
        given:
            var {arbitrator, player1, player2} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.arePlayersFoes(player1, player1)).isFalse();
            assert(arbitrator.arePlayersFoes(player1, player2)).isTrue();
    });

    it("Checks if units are foes", () => {
        given:
            var {arbitrator, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.areUnitsFoes(unit11, unit12)).isFalse();
            assert(arbitrator.areUnitsFoes(unit11, unit21)).isTrue();
    });

    it("Checks if a hex contains foes", () => {
        given:
            var {map, arbitrator, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.doesHexContainFoes(unit11, map.getHex(2, 2))).isFalse();
            assert(arbitrator.doesHexContainFoes(unit11, unit12.hexLocation)).isFalse();
            assert(arbitrator.doesHexContainFoes(unit11, unit21.hexLocation)).isTrue();
    });

    it("Checks if units are friends", () => {
        given:
            var {arbitrator, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.areUnitsFriends(unit11, unit12)).isTrue();
            assert(arbitrator.areUnitsFriends(unit11, unit21)).isFalse();
    });

    it("Checks if a hex contains friends", () => {
        given:
            var {map, arbitrator, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.doesHexContainFriends(unit11, map.getHex(2, 2))).isFalse();
            assert(arbitrator.doesHexContainFriends(unit11, unit12.hexLocation)).isTrue();
            assert(arbitrator.doesHexContainFriends(unit11, unit21.hexLocation)).isFalse();
    });

    it("Checks if a unit contact a foe", () => {
        given:
            var {arbitrator, map, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit12.move(map.getHex(2, 3));
            unit21.move(map.getHex(2, 2));
        then:
            assert(arbitrator.doesUnitEngage(unit12)).isTrue();
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit21)).isTrue();
            assert(arbitrator.isAUnitEngageAnotherUnit(unit21, unit12)).isFalse();
            assert(arbitrator.isUnitEngaged(unit12)).isFalse();
            assert(arbitrator.isUnitEngaged(unit21)).isTrue();
        but:
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit21, true)).isFalse();
            assert(arbitrator.isUnitEngaged(unit21, true)).isFalse();
        when:
            unit12.markAsEngaging(true);
        then:
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit21, true)).isTrue();
            assert(arbitrator.isUnitEngaged(unit21, true)).isTrue();
        when:
            unit21.move(map.getHex(7, 2));
            unit11.move(map.getHex(2, 2));
        then:
            assert(arbitrator.doesUnitEngage(unit12)).isFalse();
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit11)).isFalse();
            assert(arbitrator.isUnitEngaged(unit11)).isFalse();
    });

    it("Checks units that can be shock attacked", () => {
        given:
            var {arbitrator, map, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6));
        when:
            var foes = arbitrator.getFoesThatMayBeShockAttacked(unit12);
        then:
            assert(foes.length).equalsTo(1);
            assert(foes[0].unit).equalsTo(unit21);
            assert(foes[0].supported).isTrue();
        when:
            unit12.addOneTirednessLevel();
            unit12.addOneTirednessLevel();
            foes = arbitrator.getFoesThatMayBeShockAttacked(unit12);
        then:
            assert(foes[0].supported).isFalse();
        when:
            unit22.move(map.getHex(6, 6));
            foes = arbitrator.getFoesThatMayBeShockAttacked(unit12);
        then:
            assert(foes.length).equalsTo(2);
    });

    it("Checks shock attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6));
        when:
            var result = arbitrator.processShockAttackResult(unit12, unit21, true, [1, 2]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.tirednessForAttacker).isTrue();
        when:
            result = arbitrator.processShockAttackResult(unit12, unit21, false, [3, 4]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(1);
            assert(result.tirednessForAttacker).isFalse();
        when:
            result = arbitrator.processShockAttackResult(unit12, unit21, false, [5, 5]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks that formation may attack twice but not troops", () => {
        given:
            var {arbitrator, map, unit1, unit2, formation2} = create2PlayersTinyFormationGame();
            var unit1Location = map.getHex(6, 7).getNearHex(60);
            var unit2Location = map.getHex(6, 8).getNearHex(120);
            unit1.angle = 210;
            unit2.angle = 210;
            unit1.move(unit1Location, 0);
            unit2.move(unit2Location, 0);
        when:
            var foes = arbitrator.getFoesThatMayBeShockAttacked(unit1);
        then:
            assert(foes.length === 1 && foes[0].unit === formation2).isTrue();
        when: // A troop cannot attack twice
            unit1.setAttackLocation(map.getHex(6, 6));
            foes = arbitrator.getFoesThatMayBeShockAttacked(unit1);
        then:
            assert(arbitrator.isAllowedToShockAttack(unit1)).isFalse();
            assert(foes.length).equalsTo(0);
        when: // A formation can attack twice
            formation2.setAttackLocation(formation2.hexLocation.getFaceHex(90));
            foes = arbitrator.getFoesThatMayBeShockAttacked(formation2);
        then:
            assert(arbitrator.isAllowedToShockAttack(formation2)).isTrue();
            assert(foes.length).equalsTo(2);
        when: // A formation may sometime attack from only one of its hex
            formation2.setAttackLocation(unit1Location);
            foes = arbitrator.getFoesThatMayBeShockAttacked(formation2);
        then:
            assert(foes.length === 1 && foes[0].unit === unit2).isTrue();
        when:
            formation2.setAttackLocation(unit2Location);
            foes = arbitrator.getFoesThatMayBeShockAttacked(formation2);
        then:
            assert(foes.length === 1 && foes[0].unit === unit1).isTrue();
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

    it("Checks units that may be fired on by a given unit", () => {
        given:
            var {arbitrator, map, unit12, unit11, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            unit11.move(map.getHex(6, 5));  // in range but friend
            unit21.move(map.getHex(5, 5));  // in range, foe
            unit22.move(map.getHex(8, 8));  // out of range, foe
            var units = arbitrator.getFoesThatMayBeFireAttacked(unit12);
        then:
            assert(units.length).equalsTo(1);
            assert(units[0].unit).equalsTo(unit21);
    });

    it("Checks fire attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 5));
        when:
            var result = arbitrator.processFireAttackResult(unit12, unit21, [2, 2]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.lowerFirerMunitions).isTrue();
        when:
            result = arbitrator.processFireAttackResult(unit12, unit21, [3, 4]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(1);
            assert(result.lowerFirerMunitions).isFalse();
        when:
            result = arbitrator.processFireAttackResult(unit12, unit21, [5, 5]);
        then:
            assert(result.success).isFalse();
            assert(result.lowerFirerMunitions).isTrue();
    });

    it("Checks that formation may fire  attack twice but not troops", () => {
        given:
            var {arbitrator, map, unit1, unit2, formation2} = create2PlayersTinyFormationGame();
            var unit1Location = map.getHex(6, 7).getNearHex(60).getNearHex(60);
            var unit2Location = map.getHex(6, 8).getNearHex(120).getNearHex(120);
            unit1.angle = 210;
            unit2.angle = 210;
            unit1.move(unit1Location, 0);
            unit2.move(unit2Location, 0);
        when:
            var foes = arbitrator.getFoesThatMayBeFireAttacked(unit1);
        then:
            assert(foes.length === 1 && foes[0].unit === formation2).isTrue();
        when: // A troop cannot attack twice
            unit1.setAttackLocation(map.getHex(6, 6));
            foes = arbitrator.getFoesThatMayBeFireAttacked(unit1);
        then:
            assert(arbitrator.isAllowedToFireAttack(unit1)).isFalse();
            assert(foes.length).equalsTo(0);
        when: // A formation can attack twice
            formation2.setAttackLocation(formation2.hexLocation.getFaceHex(90));
            foes = arbitrator.getFoesThatMayBeFireAttacked(formation2);
        then:
            assert(arbitrator.isAllowedToFireAttack(formation2)).isTrue();
            assert(foes.length).equalsTo(2);
        when: // A formation may sometime attack from only one of its hex
            formation2.setAttackLocation(unit1Location);
            foes = arbitrator.getFoesThatMayBeFireAttacked(formation2);
        then:
            assert(foes.length === 1 && foes[0].unit === unit2).isTrue();
        when:
            formation2.setAttackLocation(unit2Location);
            foes = arbitrator.getFoesThatMayBeFireAttacked(formation2);
        then:
            assert(foes.length === 1 && foes[0].unit === unit1).isTrue();
    });

    it("Checks get weather", () => {
        given:
            var {arbitrator} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getWeather()).equalsTo(CBWeather.CLEAR);
    });

    it("Check get wingTiredness", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getWingTiredness(unit12)).equalsTo(10);
    });

    it("Checks take command result processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processTakeCommandResult(leader11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processTakeCommandResult(leader11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks dismiss command result processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processDismissCommandResult(leader11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processDismissCommandResult(leader11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks change instructions processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processChangeOrderInstructionResult(leader11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processChangeOrderInstructionResult(leader11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks allowed order instructions", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.getAllowedOrderInstructions(leader11);
        then:
            assert(result.attack).isTrue();
            assert(result.defend).isTrue();
            assert(result.regroup).isTrue();
            assert(result.retreat).isTrue();
    });

    it("Checks units that may receive orders", () => {
        given:
            var {game, arbitrator, leader11, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            var units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([unit11, unit12]);
        when:
            unit11.receiveOrder(true)
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([unit12]);
        when:
            unit11.receiveOrder(false)
            unit12.launchAction(new CBAction(game, unit12));
            unit12.action.markAsStarted();
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([unit11]);
        when:
            leader11.receiveCommandPoints(1);
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 1);
        then:
            assert(units).arrayEqualsTo([]);
    });

    it("Checks command points processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.computeCommandPoints(leader11, [2])).equalsTo(7);
    });

    it("Checks when a merge action is allowed for Troops", () => {
        given:
            var {arbitrator, unit11, unit12, map} = create2Players4UnitsTinyGame();
            unit11.move(map.getHex(8, 8));
            unit12.move(map.getHex(8, 8));
            unit11.fixRemainingLossSteps(1);
            unit12.fixRemainingLossSteps(1);
            unit11.receiveOrder(true);
            unit12.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isTrue();
        when:
            unit11._type = unit12._type;
            unit11.move(map.getHex(7, 8));
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit11.move(map.getHex(8, 8));
            unit11.fixRemainingLossSteps(2);
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit11.fixRemainingLossSteps(1);
            unit12.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit12.receiveOrder(true);
            unit11.disrupt();
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit11.reorganize();
            unit12.addOneTirednessLevel();
            unit12.addOneTirednessLevel();
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit12.removeOneTirednessLevel();
            unit11.markAsBeingPlayed();
        then:
            assert(arbitrator.isAllowedToMerge(unit12)).isFalse();
    });

    it("Checks that a merge action is not allowed for characters", () => {
        given:
            var {game, arbitrator, leader11, map} = create2Players4UnitsTinyGame();
            let leader12 = new CBCharacter(leader11.type, leader11.wing);
            game.addUnit(leader12, map.getHex(8, 8));
            leader11.move(map.getHex(8, 8));
            leader12.move(map.getHex(8, 8));
            leader11.fixRemainingLossSteps(1);
            leader12.fixRemainingLossSteps(1);
            leader11.receiveOrder(true);
            leader12.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToMerge(leader11)).isFalse();
    });

    it("Checks merge unit", () => {
        given:
            var {arbitrator, unit11, unit12, map} = create2Players4UnitsTinyGame();
            unit11.move(map.getHex(8, 8));
            unit12.move(map.getHex(8, 8));
            unit11.fixRemainingLossSteps(1);
            unit12.fixRemainingLossSteps(1);
            unit11.receiveOrder(true);
            unit12.receiveOrder(true);
            unit12.addOneTirednessLevel();
            unit12.addOneLackOfMunitionsLevel();
        when:
            var result = arbitrator.mergedUnit(unit11);
        then:
            assert(result.replaced).arrayEqualsTo([unit11, unit12]);
            let newUnit = result.replacement;
            assert(newUnit.type).equalsTo(unit11.type);
            assert(newUnit.remainingStepCount).equalsTo(2);
            assert(newUnit.lackOfMunitions).equalsTo(CBLackOfMunitions.SCARCE);
            assert(newUnit.tiredness).equalsTo(CBTiredness.TIRED);
    });

    function createTinyFormationAndTroopsForTheSamePlayerGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player = new CBAbstractPlayer();
        game.addPlayer(player);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let wing = new CBWing(player);
        let unitType1 = new CBUnitType("unit1", [
                "/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"
            ],
            [
                "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png",
                "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
                "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png"
            ]);
        let unitType2 = new CBUnitType("unit2", [
                "/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"
            ]);
        let unit1 = new CBTroop(unitType1, wing);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing);
        game.addUnit(unit2, map.getHex(5, 6));
        let unit3 = new CBTroop(unitType2, wing);
        game.addUnit(unit3, map.getHex(5, 4));
        let formation = new CBFormation(unitType1, wing);
        formation.angle = 90;
        game.addUnit(formation, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, unit1, unit2, unit3, formation, wing, player};
    }

    it("Checks if a formation is allowed to break", () => {
        given:
            var {arbitrator, unit1, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            formation.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToBreakFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToBreakFormation(formation)).isTrue();
        when:
            formation.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToBreakFormation(formation)).isFalse();
        when:
            formation.receiveOrder(true);
            formation.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.isAllowedToBreakFormation(formation)).isFalse();
        when:
            formation.fixTirednessLevel(CBTiredness.NONE);
            formation.disrupt();
        then:
            assert(arbitrator.isAllowedToBreakFormation(formation)).isFalse();
    });

    it("Checks breaking a formation", () => {
        given:
            var {arbitrator, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            formation.fixRemainingLossSteps(6);
        then:
            var result = arbitrator.getTroopsAfterFormationBreak(formation);
            assert(result.fromHex.length).equalsTo(2);
            assert(result.fromHex[0]).is(CBTroop);
            assert(result.fromHex[0].type).equalsTo(formation.type);
            assert(result.fromHex[0].remainingStepCount).equalsTo(2);
            assert(result.fromHex[0].cohesion).equalsTo(CBCohesion.GOOD_ORDER);
            assert(result.fromHex[0].tiredness).equalsTo(CBTiredness.NONE);
            assert(result.fromHex[0].lackOfMunitions).equalsTo(CBLackOfMunitions.NONE);
            assert(result.fromHex[1].remainingStepCount).equalsTo(1);
            assert(result.toHex.length).equalsTo(2);
        when:
            formation.fixRemainingLossSteps(5);
            formation.disrupt();
            formation.fixTirednessLevel(CBTiredness.TIRED);
            formation.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            result = arbitrator.getTroopsAfterFormationBreak(formation);
            assert(result.fromHex.length).equalsTo(2);
            assert(result.fromHex[0].remainingStepCount).equalsTo(2);
            assert(result.fromHex[0].cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(result.fromHex[0].tiredness).equalsTo(CBTiredness.TIRED);
            assert(result.fromHex[0].lackOfMunitions).equalsTo(CBLackOfMunitions.SCARCE);
            assert(result.fromHex[1].remainingStepCount).equalsTo(1);
            assert(result.toHex.length).equalsTo(1);
    });

    it("Checks if a formation is allowed to release troops", () => {
        given:
            var {arbitrator, unit1, unit2, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            formation.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(unit1)).isFalse();
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isTrue();
        when:
            formation.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            formation.receiveOrder(true);
            formation.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            formation.fixTirednessLevel(CBTiredness.NONE);
            formation.disrupt();
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            formation.reorganize();
            formation.fixRemainingLossSteps(3);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            formation.fixRemainingLossSteps(6);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isTrue();
        when:
            unit1.move(formation.hexLocation.fromHex, 0);
            unit2.move(formation.hexLocation.toHex, 0);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            unit1.move(null, 0);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isTrue();
        when:
            unit2.move(formation.hexLocation.fromHex, 0);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isTrue();
    });

    it("Checks release troop from a formation", () => {
        given:
            var {arbitrator, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            formation.fixRemainingLossSteps(6);
        then:
            var result = arbitrator.releaseTroop(formation, formation.fromHex, 2);
            assert(result.stepCount).equalsTo(4);
            assert(result.troop).is(CBTroop);
            assert(result.troop.type).equalsTo(formation.type);
            assert(result.troop.remainingStepCount).equalsTo(2);
            assert(result.troop.tiredness).equalsTo(CBTiredness.NONE);
            assert(result.troop.lackOfMunitions).equalsTo(CBLackOfMunitions.NONE);
        when:
            formation.fixRemainingLossSteps(5);
            formation.disrupt();
            formation.fixTirednessLevel(CBTiredness.TIRED);
            formation.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            result = arbitrator.releaseTroop(formation, formation.fromHex, 1);
            assert(result.stepCount).equalsTo(4);
            assert(result.troop.remainingStepCount).equalsTo(1);
            assert(result.troop.tiredness).equalsTo(CBTiredness.TIRED);
            assert(result.troop.lackOfMunitions).equalsTo(CBLackOfMunitions.SCARCE);
    });

    it("Checks hexes where a formation may release troops", () => {
        given:
            var {arbitrator, formation, unit1, unit2} = createTinyFormationAndTroopsForTheSamePlayerGame();
        then:
            var result = arbitrator.getHexesToReleaseFormation(formation);
            assert(result.stepCount).equalsTo(2);
            assert(result.hexes).arrayEqualsTo([formation.hexLocation.fromHex, formation.hexLocation.toHex]);
        when:
            unit1.move(formation.hexLocation.fromHex, 0);
            unit2.move(formation.hexLocation.toHex, 0);
            result = arbitrator.getHexesToReleaseFormation(formation);
        then:
            assert(result.hexes).arrayEqualsTo([]);
        when:
            unit1.move(null, 0);
            result = arbitrator.getHexesToReleaseFormation(formation);
        then:
            assert(result.hexes).arrayEqualsTo([formation.hexLocation.fromHex]);
        when:
            unit2.move(formation.hexLocation.fromHex, 0);
            result = arbitrator.getHexesToReleaseFormation(formation);
        then:
            assert(result.hexes).arrayEqualsTo([formation.hexLocation.toHex]);
    });

    it("Checks if a formation is allowed to include troops", () => {
        given:
            var {arbitrator, unit1, unit2, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            formation.receiveOrder(true);
            formation.fixRemainingLossSteps(4);
            unit1.angle = 90;
            unit1.move(formation.hexLocation.fromHex, 0);
            unit2.move(null, 0);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(unit1)).isFalse();
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isTrue();
        when:
            formation.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            formation.receiveOrder(true);
            formation.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            formation.fixTirednessLevel(CBTiredness.NONE);
            formation.disrupt();
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            formation.reorganize();
            unit1.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.receiveOrder(true);
            unit1.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.fixTirednessLevel(CBTiredness.NONE);
            unit1.disrupt();
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.move(null, 0);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.move(formation.hexLocation.toHex, 0);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.reorganize();
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isTrue();
    });

    it("Checks a formation including troops", () => {
        given:
            var {arbitrator, unit1, unit2, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            formation.receiveOrder(true);
            formation.fixRemainingLossSteps(4);
            unit1.angle = 90;
            unit1.move(formation.hexLocation.fromHex, 0);
        when:
            var result = arbitrator.includeTroops(formation);
        then:
            assert(result.stepCount).equalsTo(6);
            assert(result.lackOfMunitions).equalsTo(CBLackOfMunitions.NONE);
            assert(result.tired).equalsTo(CBTiredness.NONE);
            assert(result.removed).arrayEqualsTo([unit1]);
        when:
            unit2.angle = 90;
            unit2.move(formation.hexLocation.toHex, 0);
            unit2.fixTirednessLevel(CBTiredness.TIRED);
            unit2.fixLackOfMunitionsLevel(CBLackOfMunitions.EXHAUSTED);
        when:
            var result = arbitrator.includeTroops(formation);
        then:
            assert(result.stepCount).equalsTo(8);
            assert(result.lackOfMunitions).equalsTo(CBLackOfMunitions.EXHAUSTED);
            assert(result.tired).equalsTo(CBTiredness.TIRED);
            assert(result.removed).arrayEqualsTo([unit1, unit2]);
    });

    it("Checks if troops may be merged to create a formation", () => {
        given:
            var {arbitrator, unit1, unit2, unit3, formation, map} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            unit1.angle = 90;
            unit1.move(map.getHex(3, 4), 0);
            unit2.receiveOrder(true);
            unit2.angle = 90;
            unit2.move(map.getHex(3, 5), 0);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isTrue();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isTrue();
        when:
            unit1.receiveOrder(false);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.receiveOrder(true);
            unit1.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.fixTirednessLevel(CBTiredness.NONE);
            unit1.disrupt();
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.reorganize();
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isTrue();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isTrue();
        when:
            unit1.angle = 30;
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.angle = 60;
            unit1.angle = 60;
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.angle = 90;
            unit2.angle = 90;
            unit2.markAsBeingPlayed();
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
        when:
            unit1.angle = 90;
            unit2.move(null, 0);
            unit3.move(map.getHex(3, 5), 0);
            unit3.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
        when:
            unit3.move(null, 0);
            formation.move(new CBHexSideId(map.getHex(3, 5), map.getHex(3, 6)), 0);
            formation.receiveOrder(true);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
    });

    it("Checks formation creation", () => {
        given:
            var {arbitrator, unit1, unit2, map} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receiveOrder(true);
            unit1.angle = 90;
            unit1.move(map.getHex(3, 4), 0);
            unit2.receiveOrder(true);
            unit2.angle = 90;
            unit2.move(map.getHex(3, 5), 0);
        when:
            var result = arbitrator.createFormation(unit1, unit2.hexLocation);
        then:
            assert(result.replaced).unorderedArrayEqualsTo([unit1, unit2]);
            assert(result.replacement).is(CBFormation);
            assert(result.replacement.type).equalsTo(unit1.type);
            assert(result.replacement.remainingStepCount).equalsTo(4);
            assert(result.replacement.tiredness).equalsTo(CBTiredness.NONE);
            assert(result.replacement.lackOfMunitions).equalsTo(CBLackOfMunitions.NONE);
        when:
            unit1.fixTirednessLevel(CBTiredness.TIRED);
            unit2.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            result = arbitrator.createFormation(unit1, unit2.hexLocation);
        then:
            assert(result.replacement.tiredness).equalsTo(CBTiredness.TIRED);
            assert(result.replacement.lackOfMunitions).equalsTo(CBLackOfMunitions.SCARCE);
    });

    class TestSpell extends CBCounter {
        constructor(wizard) {
            super("units", ["/CBlades/images/magic/red/redspell.png"], new Dimension2D(142, 142));
            this.wizard = wizard;
        }
        _rotate(angle) {}
        appendToMap(hexLocation) {}
        deleteFromMap() {}
    }

    class TestSpellDefinition {
        createSpellCounter(wizard) {
            return new TestSpell(wizard);
        }
    }

    it("Checks if a unit may chose or cast a spell", () => {
        given:
            var {arbitrator, leader11, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToChoseSpell(unit11)).isFalse();
            assert(arbitrator.isAllowedToChoseSpell(leader11)).isTrue();
            assert(arbitrator.isAllowedToCastSpell(unit11)).isFalse();
            assert(arbitrator.isAllowedToCastSpell(leader11)).isFalse();
        when:
            leader11.choseSpell(new TestSpellDefinition());
        then:
            assert(arbitrator.isAllowedToCastSpell(leader11)).isTrue();
    });

    it("Checks the spells a wizard may cast", () => {
        given:
            var {arbitrator, leader11, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getAllowedSpells(leader11)).arrayEqualsTo([
                "firePentacle1", "firePentacle2", "firePentacle3",
                "fireCircle1", "fireCircle2", "fireCircle3",
                "fireball1", "fireball2", "fireball3",
                "fireSword1", "fireSword2", "fireSword3",
                "blaze1", "blaze2", "blaze3",
                "rainFire1", "rainFire2", "rainFire3"
                ]
            );
    });

    it("Checks cast spell processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processCastSpellResult(leader11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processCastSpellResult(leader11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks foes that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11, unit21, unit22, unit11} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
            unit21.move(map.getHex(5, 3));
            unit11.move(map.getHex(7, 3));
            unit22.move(map.getHex(8, 3));
            var units = arbitrator.getFoesThatMayBeTargetedBySpell(leader11);
        then:
            assert(new Set(units)).setEqualsTo(new Set([unit21]));
    });

    it("Checks friends that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
            unit11.move(map.getHex(5, 3));
            unit21.move(map.getHex(7, 3));
            unit12.move(map.getHex(8, 3));
            var units = arbitrator.getFriendsThatMayBeTargetedBySpell(leader11);
        then:
            assert(new Set(units)).setEqualsTo(new Set([leader11, unit11]));
    });

    it("Checks hexes that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
            var hexes = arbitrator.getHexesThatMayBeTargetedBySpell(leader11);
        then:
            assert(hexes.length).equalsTo(127);
            let hexesSet = new Set(hexes);
            assert(hexesSet.has(map.getHex(7, 3))).isTrue();
            assert(hexesSet.has(map.getHex(8, 3))).isFalse();
    });

    it("Checks fireball processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
            var spellLevel = 1;
        when:
            var result = arbitrator.resolveFireball(spellLevel, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.resolveFireball(spellLevel, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

});