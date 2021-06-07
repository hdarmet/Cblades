'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHex,
    CBHexSideId, CBMap, CBMoveType
} from "../../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer, CBAction, CBCounter
} from "../../../jslib/cblades/game.js";
import {
    CBCharacter, CBCharge, CBCohesion,
    CBCommandProfile,
    CBFormation, CBLackOfMunitions,
    CBMoralProfile, CBMovement,
    CBMoveProfile, CBTiredness,
    CBTroop,
    CBUnitType, CBWeaponProfile,
    CBWeather,
    CBWing
} from "../../../jslib/cblades/unit.js";
import {
    CBMapTeacher
} from "../../../jslib/cblades/teachers/map-teacher.js";
import {
    setDrawPlatform
} from "../../../jslib/draw.js";
import {
    loadAllImages,
    mergeClasses,
    mockPlatform
} from "../../mocks.js";
import {
    CBUnitManagementTeacher
} from "../../../jslib/cblades/teachers/units-teacher.js";
import {
    CBMovementTeacher
} from "../../../jslib/cblades/teachers/movement-teacher.js";
import {
    Dimension2D, reverseAngle
} from "../../../jslib/geometry.js";

describe("Movement teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBMovementTeacher);

    class MoveProfile extends CBMoveProfile {
        constructor() {
            super(0);
        }
        getMovementCostOnHex(hex) {
            switch (hex.type) {
                case CBHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
                case CBHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:2.5};
                case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
                case CBHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
                default: throw "Unknown";
            }
        }
        getMovementCostOnHexSide(hexSide) {
            switch (hexSide.type) {
                case CBHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
                case CBHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
                case CBHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
                case CBHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
                case CBHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
                default: throw "Unknown";
            }
        }
    }

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

    function createTinyGame() {
        let game = new CBGame();
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        let unitType1 = new CBTestUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(unitType1, wing1);
        game.addUnit(unit11, map.getHex(5, 8));
        let unit12 = new CBTroop(unitType1, wing1);
        game.addUnit(unit12, map.getHex(5, 7));
        let leaderType1 = new CBTestUnitType("leader1", ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, unit11, unit12, leader11};
    }

    function create2Players4UnitsTinyGame() {
        let {game, arbitrator, map, player1, wing1, unit11, unit12, leader11} = createTinyGame();
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

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
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, formation1, leader11, player2, wing2, unit21, unit22, leader21};
    }

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
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToMove(unit12)).isTrue();
        when:
            unit21.move(unit12.hexLocation.getNearHex(0));
            unit21.angle = 180;
        then:
            assert(arbitrator.isAllowedToMove(unit12)).isFalse();
    });

    it("Checks if a move back action is allowed for a troop", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToMoveBack(unit12)).isTrue();
        when:
            unit21.hexLocation = unit12.hexLocation.getNearHex(180);
        then:
            assert(arbitrator.isAllowedToMoveBack(unit12)).isFalse();
    });

    it("Checks if a move back action is allowed for a formation", () => {
        given:
            var {arbitrator, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.isAllowedToMoveBack(formation1)).isTrue();
        when:
            unit21.hexLocation = formation1.hexLocation.getFaceHex(270);
        then:
            assert(arbitrator.isAllowedToMoveBack(formation1)).isFalse();
    });

    it("Checks if a rout action is allowed", () => {
        given:
            var {arbitrator, map, wing1, wing2, unit21, formation1} = create2Players1Formation2TroopsTinyGame();
        then:
            assert(arbitrator.isAllowedToRout(unit21)).isFalse();
            assert(arbitrator.isAllowedToRout(formation1)).isFalse();
        when:
            wing1.setRetreatZone(map.getSouthZone());
            wing2.setRetreatZone(map.getSouthZone());
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

    it("Checks movement costs according to ground", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
            // unit11 on Hex(5, 8)
            unit11.type.setMoveProfile(2, new MoveProfile())
        when:
            var cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:1})
        when:
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.IMPASSABLE;
            unit11.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.NORMAL;
            cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.IMPASSABLE})
        when:
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.IMPASSABLE;
            unit11.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.EASY;
            cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.SET, value:0.5})
        when:
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            unit11.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.CLIMB;
            cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE})
        when:
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            unit11.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.WALL;
            cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.IMPASSABLE})
        when:
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit11.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            cost = arbitrator.getMovementCost(unit11, 0);
        then:
            assert(cost).objectEqualsTo({type:CBMoveProfile.COST_TYPE.ADD, value:3})
    });

    it("Checks unit allowed moves", () => {
        given:
            var {arbitrator, map, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit22.hexLocation = map.getHex(8, 8); // Far, far away...
            unit21.hexLocation = map.getHex(5, 6); // foes on forward zone
        when:
            var allowedMoves = arbitrator.getAllowedSubsequentMoves(unit12);
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
            allowedMoves = arbitrator.getAllowedSubsequentMoves(unit12);
        then:
            assertNoMove(allowedMoves, 0); // occupied by a foe
            assertMove(allowedMoves, 60, 6, 6, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 120);
            assertNoMove(allowedMoves, 180);
            assertNoMove(allowedMoves, 240);
            assertNoMove(allowedMoves, 300);
        when:
            unit12.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getAllowedSubsequentMoves(unit12);
        then:
            assertNoMove(allowedMoves, 60);
        when:
            allowedMoves = arbitrator.getAllowedFirstMoves(unit12);
        then:
            assertMove(allowedMoves, 60, 6, 6, CBMovement.MINIMAL);
    });

    it("Checks unit allowed moves according to ground", () => {
        given:
            var {arbitrator, unit11} = createTinyGame();
            // unit11 on Hex(5, 8)
            unit11.type.setMoveProfile(2, new MoveProfile());
            unit11.hexLocation.getNearHex(300).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit11.hexLocation.getNearHex(0).type = CBHex.HEX_TYPES.IMPASSABLE;
            unit11.hexLocation.getNearHex(60).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        when:
            var allowedMoves = arbitrator.getAllowedFirstMoves(unit11);
        then:
            assertMove(allowedMoves, 300, 4, 7, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 0); // impassable ground
            assertMove(allowedMoves, 60, 6, 7, CBMovement.MINIMAL);
        when:
            allowedMoves = arbitrator.getAllowedSubsequentMoves(unit11);
        then:
            assertMove(allowedMoves, 300, 4, 7, CBMovement.EXTENDED);
            assertNoMove(allowedMoves, 0); // impassable ground
            assertNoMove(allowedMoves, 60); // Not a first move
    });

    it("Checks unit allowed moves back", () => {
        given:
            var {arbitrator, map, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit22.hexLocation = map.getHex(8, 8); // far, far away...
            unit21.hexLocation = map.getHex(5, 6); // foes on forward zone
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

    it("Checks formation allowed moves", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(4, 3)); // foes on forward zone
        when:
            var allowedMoves = arbitrator.getFormationAllowedSubsequentMoves(formation1);
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
            allowedMoves = arbitrator.getFormationAllowedSubsequentMoves(formation1);
        then:
            assertMove(allowedMoves, 120, 4, 5, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedSubsequentMoves(formation1);
        then:
            assertNoMove(allowedMoves, 120);
        when:
            allowedMoves = arbitrator.getFormationAllowedFirstMoves(formation1);
        then:
            assertMove(allowedMoves, 120, 4, 5,  CBMovement.MINIMAL);
    });

    it("Checks formation allowed forward rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
        when:
            var allowedMoves = arbitrator.getFormationAllowedSubsequentTurns(formation1);
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
            allowedMoves = arbitrator.getFormationAllowedSubsequentTurns(formation1);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.EXTENDED);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedSubsequentTurns(formation1);
        then:
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
        when:
            allowedMoves = arbitrator.getFormationAllowedFirstTurns(formation1);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.MINIMAL);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.MINIMAL);
        given:
            unit21.move(map.getHex(4, 4)); // foes on forward zone
        when:
            allowedMoves = arbitrator.getFormationAllowedSubsequentTurns(formation1);
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
            var allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1, false, true);
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
            allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1, false, true);
        then:
            assertMove(allowedMoves, 120, 4, 5, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBack(formation1, false, true);
        then:
            assertMove(allowedMoves, 120, 4, 5,  CBMovement.MINIMAL);
    });

    it("Checks formation allowed backward rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            formation1.angle = 270;
        when:
            var allowedMoves = arbitrator.getFormationAllowedMovesBackTurns(formation1, true);
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
            allowedMoves = arbitrator.getFormationAllowedMovesBackTurns(formation1, true);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.EXTENDED);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedMoves = arbitrator.getFormationAllowedMovesBackTurns(formation1, true);
        then:
            assertMove(allowedMoves, 60, 4, 4, CBMovement.MINIMAL);
            assertMove(allowedMoves, 120, 4, 4, CBMovement.MINIMAL);
        given:
            unit21.move(map.getHex(4, 4)); // foes on backward zone
        when:
            allowedMoves = arbitrator.getFormationAllowedMovesBackTurns(formation1, true);
        then:
            assertNoMove(allowedMoves, 60);
            assertNoMove(allowedMoves, 120);
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
            var allowedRotations = arbitrator.getAllowedSubsequentRotations(unit12);
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
            allowedRotations = arbitrator.getAllowedSubsequentRotations(unit12);
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
        allowedRotations = arbitrator.getAllowedSubsequentRotations(unit12);
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
            allowedRotations = arbitrator.getAllowedFirstRotations(unit12);
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

    function assertFormationRotate(rotates, angle, hexId, type) {
        assert(rotates[angle]).isDefined();
        assert(rotates[angle].hex).equalsTo(hexId);
        assert(rotates[angle].type).equalsTo(type);
    }

    it("Checks formation allowed rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(4, 3)); // foes on forward zone
        when:
            var allowedRotations = arbitrator.getAllowedFormationSubsequentRotations(formation1);
        then:
            assertNoMove(allowedRotations, 0); // angle not allowed
            assertNoMove(allowedRotations, 60); // angle not allowed
            assertNoMove(allowedRotations, 90); // angle not allowed
            assertNoMove(allowedRotations, 120); // angle not allowed
            assertNoMove(allowedRotations, 180); // angle not allowed
            assertNoMove(allowedRotations, 240); // angle not allowed
            assertFormationRotate(allowedRotations, 270, map.getHex(2, 4), CBMovement.NORMAL);
            assertNoMove(allowedRotations, 300); // angle not allowed
        when:
            formation1.movementPoints = 0.5;
            allowedRotations = arbitrator.getAllowedFormationSubsequentRotations(formation1);
        then:
            assertFormationRotate(allowedRotations, 270, map.getHex(2, 4), CBMovement.EXTENDED);
        when:
            formation1.extendedMovementPoints = 0.5;
            allowedRotations = arbitrator.getAllowedFormationSubsequentRotations(formation1);
        then:
            assertNoMove(allowedRotations, 270);
        when:
            allowedRotations = arbitrator.getAllowedFormationFirstRotations(formation1);
        then:
            assertFormationRotate(allowedRotations, 270, map.getHex(2, 4), CBMovement.MINIMAL);
    });

    it("Checks formation confront allowed rotations", () => {
        given:
            var {arbitrator, map, formation1, unit21, unit22} = create2Players1Formation2TroopsTinyGame();
            formation1.move(new CBHexSideId(map.getHex(3, 4), map.getHex(3, 5)));
            unit21.move(map.getHex(3, 6)); // foes on backward zone
            unit21.angle = 60;
            unit22.move(map.getHex(2, 5)); // foes on backward zone
            unit22.angle = 60;
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

    it("Checks if movement inflicts tiredness", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            unit12.movementPoints = 1;
            assert(arbitrator.doesMovementInflictTiredness(unit12, {type:CBMoveProfile.COST_TYPE.ADD, value:1})).isFalse();
            assert(arbitrator.doesMovementInflictTiredness(unit12, {type:CBMoveProfile.COST_TYPE.ADD, value:2})).isTrue();
    });

    it("Checks rout path finding result", () => {
        given:
            var {arbitrator, map, wing1, unit11} = create2Players4UnitsTinyGame();
            let moveProfile = new MoveProfile();
            moveProfile.getRotationCost = function(angle) {
                if (angle<60) {
                    return {type: CBMoveProfile.COST_TYPE.ADD, value: 0.5};
                }
                else if (angle<120) {
                    return {type: CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
                }
                else {
                    return {type: CBMoveProfile.COST_TYPE.IMPASSABLE};
                }
            }
            unit11.type.setMoveProfile(2, moveProfile);
            wing1.setRetreatZone(map.getSouthZone());
            map.getHex(4, 10).type = CBHex.HEX_TYPES.IMPASSABLE;
            map.getHex(3, 10).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        when:
            unit11.move(map.getHex(4, 9));
            var hexes = arbitrator.getAllowedRoutMoves(unit11);
        then:
            assert(hexes).setEqualsTo(new Set([map.getHex(5, 10)]));
    });

    it("Checks cost to engage computation", () => {
        given:
            var {arbitrator, map, unit11, unit21, leader21} = create2Players4UnitsTinyGame();
        when:
            leader21.angle = 270;
            var costToEngage = arbitrator.getCostToEngage(unit11, unit21);
            var whoJoined = arbitrator.getNearestFoesThatCanJoinAndEngage(unit11).foes;
        then:
            assert(costToEngage).equalsTo(1);
            assert(whoJoined).unorderedArrayEqualsTo([unit21]);
        when:
            unit21.angle = 270;
            unit21.hexLocation = leader21.hexLocation.getNearHex(0);
            costToEngage = arbitrator.getCostToEngage(unit11, unit21);
            whoJoined = arbitrator.getNearestFoesThatCanJoinAndEngage(unit11).foes;
        then:
            assert(costToEngage).equalsTo(2);
            assert(whoJoined).unorderedArrayEqualsTo([unit21, leader21]);
        when:
            unit11.move(map.getHex(0, 5));
            costToEngage = arbitrator.getCostToEngage(unit11, unit21);
            whoJoined = arbitrator.getNearestFoesThatCanJoinAndEngage(unit11).foes;
        then:
            assert(costToEngage).equalsTo(7);
            assert(whoJoined).arrayEqualsTo([]);
    });

    it("Checks move away moves when the unit can escape all near enemies", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 9);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(9, 7);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 7);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedMoveAwayMoves(unit11);
        then:
            assert(moves.maxRemainingPoints).equalsTo(0);
            assert(moves.hexLocations).setContentEqualsTo([
                map.getHex(8, 10), map.getHex(7, 10)
            ])
    });

    it("Checks move away moves when the unit can escape some enemies only but can avoid to approch to others", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 9);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(8, 6);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(11, 9);
            unit22.angle = 240;
            leader21.hexLocation = map.getHex(5, 9);
            leader21.angle = 120;
        when:
            var moves = arbitrator.getAllowedMoveAwayMoves(unit11);
        then:
            assert(moves.maxRemainingPoints).equalsTo(0);
            assert(moves.hexLocations).setContentEqualsTo([
                map.getHex(8, 10)
            ])
    });

    it("Checks move away moves when the unit can escape some enemies but cannot avoid to approch to others", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 9);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(8, 7);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(9, 11);
            unit22.angle = 240;
            leader21.hexLocation = map.getHex(7, 11);
            leader21.angle = 120;
        when:
            var moves = arbitrator.getAllowedMoveAwayMoves(unit11);
        then:
            assert(moves.maxRemainingPoints).equalsTo(1);
            assert(moves.hexLocations).setContentEqualsTo([
                map.getHex(8, 8), map.getHex(9, 10), map.getHex(9, 9),
                map.getHex(8, 10), map.getHex(7, 10), map.getHex(7, 9)
            ]);
    });

    it("Checks move away moves when for a formation", () => {
        given:
            var {arbitrator, map, formation1, unit21, unit22, leader21} = create2Players1Formation2TroopsTinyGame();
            formation1.hexLocation = map.getHex(8, 9).toward(120);
            formation1.angle = 30;
            unit21.hexLocation = map.getHex(9, 7);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 7);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedMoveAwayMoves(formation1);
        then:
            assert(moves.maxRemainingPoints).equalsTo(0);
            assert([...moves.hexLocations]).unorderedArrayEqualsTo([
                new CBHexSideId(map.getHex(7, 10), map.getHex(8, 10)),
                new CBHexSideId(map.getHex(8, 10), map.getHex(9, 11))
            ]);
    });

    it("Checks attack moves", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 10);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(9, 6);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 6);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedAttackMoves(unit11);
        then:
            assert(moves).setContentEqualsTo([
                map.getHex(8, 9), map.getHex(9, 10), map.getHex(7, 10)
            ])
    });

    it("Checks fire moves", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 10);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(9, 6);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 6);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedFireMoves(unit11);
        then:
            assert(moves).setContentEqualsTo([
                map.getHex(8, 9), map.getHex(9, 10), map.getHex(7, 11), map.getHex(7, 10)
            ])
    });

    it("Checks retreat moves", () => {
        given:
            var {arbitrator, map, wing1, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            wing1.setRetreatZone(map.getSouthZone());
            unit11.hexLocation = map.getHex(8, 10);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(9, 6);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 6);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedRetreatMoves(unit11);
        then:
            assert(moves).setContentEqualsTo([
                map.getHex(7, 11), map.getHex(8, 11), map.getHex(9, 11)
            ])
    });

    it("Checks retreat moves when no retreat zone is defined", () => {
        given:
            var {arbitrator, map, unit11, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
            unit11.hexLocation = map.getHex(8, 10);
            unit11.angle = 0;
            unit21.hexLocation = map.getHex(9, 6);
            unit21.angle = 180;
            unit22.hexLocation = map.getHex(7, 6);
            unit22.angle = 180;
            leader21.hexLocation = null;
        when:
            var moves = arbitrator.getAllowedRetreatMoves(unit11);
        then:
            assert(moves).isNotDefined();
    });
});