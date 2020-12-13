'use strict'

'use strict'

import {
    assert, before, describe, executeTimeouts, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    filterPainting, getDirectives,
    loadAllImages,
    mockPlatform, removeFilterPainting, resetDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame, CBHexId, CBMap, CBMovement, CBUnit, CBWeather
} from "../../jslib/cblades/game.js";
import {
    DDice,
    DPopup, DResult
} from "../../jslib/widget.js";
import {
    CBInteractivePlayer, CBMoveActuator, CBOrientationActuator
} from "../../jslib/cblades/interactive-player.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";

describe("Arbitrator", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    function create2Players4UnitsTinyGame() {
        let game = new CBGame();
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBInteractivePlayer();
        game.addPlayer(player1);
        let player2 = new CBInteractivePlayer();
        game.addPlayer(player2);
        let map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        let unit11 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(unit11, map.getHex(5, 8));
        let unit12 = new CBUnit(player1, "/CBlades/images/units/misc/unit1.png");
        game.addCounter(unit12, map.getHex(5, 7));
        let unit21 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(unit21, map.getHex(7, 8));
        let unit22 = new CBUnit(player2, "/CBlades/images/units/misc/unit2.png");
        game.addCounter(unit22, map.getHex(7, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, unit11, unit12, player2, unit21, unit22};
    }

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

    it("Checks unit forward zone", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 300, 4, 6);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(300))).isTrue();
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(0))).isTrue();
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(60))).isTrue();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(240))).isFalse();
        when:
            unit12.angle = 30;
            zones = arbitrator.getUnitForwardZone(unit12);
        then:
            assertInZone(zones, 0, 5, 6);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(0))).isTrue();
            assertInZone(zones, 60, 6, 6);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(60))).isTrue();
            assertNotInZone(zones, 120);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(120))).isFalse();
            assertNotInZone(zones, 180);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(180))).isFalse();
            assertNotInZone(zones, 240);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(240))).isFalse();
            assertNotInZone(zones, 300);
            assert(arbitrator.isHexOnForwardZone(unit12, unit12.hexLocation.getNearHex(300))).isFalse();
    });

    function assertNoMove(moves, angle) {
        assert(moves[angle]).isNotDefined();
    }
    function assertMove(moves, angle, col, row, type) {
        assert(moves[angle].hex.col).equalsTo(col);
        assert(moves[angle].hex.row).equalsTo(row);
        assert(moves[angle].type).equalsTo(type);
    }

    it("Checks unit allowed moves", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertMove(allowedMoves, 300, 4, 6, CBMovement.NORMAL);
            assertMove(allowedMoves, 0, 5, 6, CBMovement.NORMAL);
            assertMove(allowedMoves, 60, 6, 6, CBMovement.NORMAL);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
        when:
            unit12.movementPoints = 0.5;
            unit12.angle = 30;
            allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertMove(allowedMoves, 0, 5, 6, CBMovement.EXTENDED);
            assertMove(allowedMoves, 60, 6, 6, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
        when:
            unit12.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getAllowedMoves(unit12);
        then:
            assertNoMove(allowedMoves, 0);
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
        when:
            allowedMoves = arbitrator.getAllowedMoves(unit12, true);
        then:
            assertMove(allowedMoves, 0, 5, 6, CBMovement.MINIMAL);
            assertMove(allowedMoves, 60, 6, 6, CBMovement.MINIMAL);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
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
        assert(rotations[angle].hex._hexId1.col).equalsTo(col1);
        assert(rotations[angle].hex._hexId1.row).equalsTo(row1);
        assert(rotations[angle].hex._hexId2.col).equalsTo(col2);
        assert(rotations[angle].hex._hexId2.row).equalsTo(row2);
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

    it("Checks if a unit contact a foe", () => {
        given:
            var {arbitrator, map, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit12.move(map.getHex(2, 3));
            unit21.move(map.getHex(2, 2));
        then:
            assert(arbitrator.isUnitOnContact(unit12)).isTrue();
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
            assert(arbitrator.isUnitOnContact(unit12)).isFalse();
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit11)).isFalse();
            assert(arbitrator.isUnitEngaged(unit11)).isFalse();
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

});