'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHex,
    CBHexSideId, CBMap, CBMoveType
} from "../../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer
} from "../../../jslib/cblades/game.js";
import {
    CBCharge,
    CBCommandProfile, CBLackOfMunitions,
    CBMoralProfile,
    CBMoveProfile, CBTiredness,
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
import {
    CBUnitManagementTeacher
} from "../../../jslib/cblades/teachers/units-teacher.js";
import {
    CBCombatTeacher
} from "../../../jslib/cblades/teachers/combat-teacher.js";
import {
    createTroop, createCharacter, createFormation
} from "./../game-examples.js";

describe("Combat teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBCombatTeacher);

    class FireWeaponProfile extends CBWeaponProfile {
        constructor(...args) {
            super(...args);
        }
        getFireAttackCode() {
            return "FBw";
        }
    }

    class CBTestUnitType extends CBUnitType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new CBWeaponProfile(1, 1, 2, 0));
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
            }
        }
    }

    class CBTestFireUnitType extends CBUnitType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new FireWeaponProfile(0, 0, 1, 2));
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
            }
        }
    }

    function createTinyGame() {
        let game = new CBGame();
        var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        game.setMap(map);
        game.start();
        let unitFireType1 = new CBTestFireUnitType("unit1",
            ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"],
            [
                "./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png",
                "./../images/units/misc/formation2.png", "./../images/units/misc/formation2b.png",
                "./../images/units/misc/formation3.png", "./../images/units/misc/formation3b.png"
            ]);
        let unitType2 = new CBTestUnitType("unit2",
            ["./../images/units/misc/unit2.png", "./../images/units/misc/unit2b.png"],
            ["./../)images/units/misc/formation2.png", "./../images/units/misc/formation2b.png"]);
        let leaderFireType1 = new CBTestUnitType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"]);
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"]);
        return {
            game, map, arbitrator,
            player1, wing1,
            player2, wing2,
            unitFireType1, leaderFireType1,
            unitType2, leaderType2
        };
    }

    function create2Players4UnitsTinyGame() {
        let tinyGame = createTinyGame();
        let {
            game, map,
            wing1, wing2,
            unitFireType1,
            unitType2
        } = tinyGame;
        return {
            ...tinyGame,
            unit11 : createTroop(game, map, unitFireType1, wing1, 0, 5, 8),
            unit12 : createTroop(game, map, unitFireType1, wing1, 0, 5, 7),
            leader11 : createCharacter(game, map, unitFireType1, wing1, 0, 6, 7),
            unit21 : createTroop(game, map, unitType2, wing2, 0, 7, 8),
            unit22 : createTroop(game, map, unitType2, wing2, 0, 7, 7),
            leader21 : createCharacter(game, map, unitType2, wing2, 0, 8, 7)
        }
    }

    function create2Players1Formation2TroopsTinyGame() {
        let tinyGame = createTinyGame();
        let {
            game, map,
            wing1, wing2,
            unitFireType1,
            unitType2
        } = tinyGame;
        return {
            ...tinyGame,
            formation1 : createFormation(game, map, unitFireType1, wing1, 90,5, 8,5, 7),
            leader11 : createCharacter(game, map, unitFireType1, wing1, 0, 6, 7),
            unit21 : createTroop(game, map, unitType2, wing2, 0, 7, 8),
            unit22 : createTroop(game, map, unitType2, wing2, 0, 7, 7),
            leader21 : createCharacter(game, map, unitType2, wing2, 0, 8, 7)
        }
    }

    function assertInRetreatZone(zones, angle, col, row, moveType) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
        assert(zones[angle].moveType).equalsTo(moveType);
    }

    it("Checks attacker engagement result", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 180;
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
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 180;
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
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 180;
        when:
            var result = arbitrator.processConfrontEngagementResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processConfrontEngagementResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks that a unit is allowed to shock attack", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.isAllowedToShockAttack(unit12)).isTrue();
        when:
            unit12.angle = 180;
        then:
            assert(arbitrator.isAllowedToShockAttack(unit12)).isFalse();
    });

    it("Checks engagement condition (first case)", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
            unit12.markAsCharging(CBCharge.CHARGING);
            unit12.angle = 90;
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 180;
            unit21.markAsCharging(CBCharge.CHARGING);
        when:
            var condition = arbitrator.getEngagementCondition(unit12);
        then:
            assert(condition).objectEqualsTo({
                capacity: 1,
                foeIsCharging: 1,
                sideAdvantage: 1,
                unitIsCharging: -1,
                weapons: 0,
                modifier: 2
            });
    });

    it("Checks engagement condition (second case)", () => {
        given:
            var {map, arbitrator, leader11, leader21} = create2Players4UnitsTinyGame();
            leader11.hexLocation = map.getHex(4, 3);
            leader11.angle = 180;
            leader21.hexLocation = leader11.hexLocation.getNearHex(0);
            leader21.angle = 180;
        when:
            var condition = arbitrator.getEngagementCondition(leader11);
        then:
            assert(condition).objectEqualsTo({
                backAdvantage: 2,
                capacity: 1,
                foeIsACharacter: -1,
                unitIsACharacter: 1,
                weapons: 0,
                modifier: 3
            });
    });

    it("Checks that for an engagement the worst foe is selected", () => {
        given:
            var {arbitrator, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit12.markAsCharging(CBCharge.CHARGING);
            unit12.angle = 30;
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 180;
            unit22.hexLocation = unit12.hexLocation.getNearHex(60);
            unit22.angle = 240;
            unit22.markAsCharging(CBCharge.CHARGING);
        when:
            var condition = arbitrator.getEngagementCondition(unit12);
        then:
            assert(condition).objectEqualsTo({
                weapons: 0,
                capacity: 1,
                foeIsCharging: 1,
                unitIsCharging: -1,
                modifier: 1
            });
    });

    it("Checks if a unit has fire capacities", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.hasFireAttackCapacity(unit12)).isTrue();
            assert(arbitrator.hasFireAttackCapacity(unit21)).isFalse();
    });

    it("Checks that a unit is allowed to fire attack", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0);
        then:
            assert(arbitrator.isAllowedToFireAttack(unit12)).isTrue();
            assert(arbitrator.isAllowedToFireAttack(unit21)).isFalse();
        when:
            unit12.angle = 180;
        then:
            assert(arbitrator.isAllowedToFireAttack(unit12)).isFalse();
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

    it("Checks if a character is allowed to attack by duel", () => {
        given:
            var {arbitrator, unit11, leader11, unit21, leader21} = create2Players4UnitsTinyGame();
        when:
            unit21.move(unit11.hexLocation.getNearHex(0));
            leader11.move(unit11.hexLocation);
            leader21.move(unit21.hexLocation);
        then:
            assert(arbitrator.isAllowedToShockDuel(unit11)).isFalse();
            assert(arbitrator.isAllowedToShockDuel(leader11)).isTrue();
        when:
            leader21.move(null);
        then:
            assert(arbitrator.isAllowedToShockDuel(leader11)).isFalse();
        when:
            unit11.move(null);
            leader21.move(unit21.hexLocation);
        then:
            assert(arbitrator.isAllowedToShockDuel(leader11)).isFalse();
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

    it("Checks characters that can be duel attacked", () => {
        given:
            var {arbitrator, map, unit11, leader11, unit21, leader21} = create2Players4UnitsTinyGame();
            unit21.move(unit11.hexLocation.getNearHex(0));
            leader11.move(unit11.hexLocation);
            leader21.move(unit21.hexLocation);
        when:
            var foes = arbitrator.getFoesThatMayBeDuelAttacked(leader11);
        then:
            assert(foes.length).equalsTo(1);
            assert(foes[0].unit).equalsTo(leader21);
            assert(foes[0].supported).isTrue();
        when:
            leader11.addOneTirednessLevel();
            leader11.addOneTirednessLevel();
            foes = arbitrator.getFoesThatMayBeDuelAttacked(leader11);
        then:
            assert(foes[0].supported).isFalse();
    });

    it("Checks combat table result", () => {
        given:
            var arbitrator = new Arbitrator();
        then:
            assert(arbitrator.getCombatTableResult([1, 1], -17)).equalsTo(0);
            assert(arbitrator.getCombatTableResult([3, 4], 4)).equalsTo(1);
            assert(arbitrator.getCombatTableResult([1, 1], 24)).equalsTo(4);
    });

    it("Checks cell in shock weapon table", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getShockWeaponCell(unit12, unit21)).objectEqualsTo({col:7, row:7});
            assert(arbitrator.getFireWeaponCell(unit12, unit21)).objectEqualsTo({col:7, row:8});
    });

    it("Checks if a hex is clear for shock", () => {
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
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 0))).isTrue();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 1))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 2))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 3))).isTrue();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 4))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 5))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 6))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 7))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 1))).isTrue();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 2))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 3))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 4))).isTrue();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 5))).isFalse();
            assert(arbitrator.isClearGroundForShock(map.getHex(4, 6))).isFalse();
    });

    it("Checks if a hex is rough for shock", () => {
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
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 0))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 1))).isTrue();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 2))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 3))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 4))).isTrue();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 5))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 6))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 7))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 1))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 2))).isTrue();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 3))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 4))).isFalse();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 5))).isTrue();
            assert(arbitrator.isRoughGroundForShock(map.getHex(4, 6))).isFalse();
    });

    it("Checks if a hex is difficult for shock", () => {
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
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 0))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 1))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 2))).isTrue();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 3))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 4))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 5))).isTrue();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 6))).isTrue();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 7))).isTrue();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(3, 8))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 1))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 2))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 3))).isTrue();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 4))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 5))).isFalse();
            assert(arbitrator.isDifficultGroundForShock(map.getHex(4, 6))).isTrue();
    });

    it("Checks if a hex side is clear for shock", () => {
        given:
            var {arbitrator, map} = createTinyGame();
            map.getHex(3, 0).toward(60).type = CBHex.HEXSIDE_TYPES.NORMAL;
            map.getHex(3, 1).toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
            map.getHex(3, 2).toward(60).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            map.getHex(3, 3).toward(60).type = CBHex.HEXSIDE_TYPES.CLIMB;
            map.getHex(3, 4).toward(60).type = CBHex.HEXSIDE_TYPES.WALL;
        then:
            assert(arbitrator.isClearHexSideForShock(map.getHex(3, 0).toward(60))).isTrue();
            assert(arbitrator.isClearHexSideForShock(map.getHex(3, 1).toward(60))).isTrue();
            assert(arbitrator.isClearHexSideForShock(map.getHex(3, 2).toward(60))).isFalse();
            assert(arbitrator.isClearHexSideForShock(map.getHex(3, 3).toward(60))).isFalse();
            assert(arbitrator.isClearHexSideForShock(map.getHex(3, 4).toward(60))).isFalse();
    });

    it("Checks if a hex side is difficult for shock", () => {
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

    it("Checks if terrain allows charge", () => {
        given:
            var {arbitrator, map} = createTinyGame();
        then:
            assert(arbitrator.isChargeAllowed(map.getHex(3, 1), map.getHex(3, 2))).isTrue();
        when:
            map.getHex(3, 2).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
        then:
            assert(arbitrator.isChargeAllowed(map.getHex(3, 1), map.getHex(3, 2))).isFalse();
        when:
            map.getHex(4, 1).toward(180).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
        then:
            assert(arbitrator.isChargeAllowed(map.getHex(4, 1), map.getHex(4, 2))).isFalse();
    });

    it("Checks shock attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6));
        when:
            var result = arbitrator.processShockAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, true, [1, 2]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.tirednessForAttacker).isTrue();
        when:
            result = arbitrator.processShockAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, false, [2, 3]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(1);
            assert(result.tirednessForAttacker).isFalse();
        when:
            result = arbitrator.processShockAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, false, [5, 5]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks shock attack computing advantage - first case", () => {
        given:
            var {arbitrator, map, unit12, leader21} = create2Players4UnitsTinyGame();
            leader21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            unit12.markAsCharging(CBCharge.CHARGING);
            unit12.hexLocation.height = 1;
            leader21.fixTirednessLevel(CBTiredness.EXHAUSTED);
            leader21.disrupt();
        when:
            var advantage = arbitrator.getShockAttackAdvantage(unit12, unit12.hexLocation, leader21, leader21.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: 9,
                attacker: unit12,
                attackerAboveDefenfer: 1,
                attackerCapacity: 0,
                attackerCharging: 2,
                attackerTired: -1,
                backAdvantage: 4,
                defender: leader21,
                defenderCapacity: -1,
                defenderDisrupted: 1,
                defenderExhausted: 1,
                defenderIsACharacter: 4,
                defenseBonus: -2,
                weapons: 0
            });

    });

    it("Checks shock attack computing advantage - second case", () => {
        given:
            var {arbitrator, unit11, unit12, leader21} = create2Players4UnitsTinyGame();
            leader21.hexLocation = unit12.hexLocation.getNearHex(0);
            leader21.angle = 180;
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            unit12.hexLocation.height = 1;
            unit12.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit11.hexLocation = unit12.hexLocation;
            leader21.fixTirednessLevel(CBTiredness.EXHAUSTED);
            leader21.disrupt();
            leader21.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        when:
            var advantage = arbitrator.getShockAttackAdvantage(leader21, leader21.hexLocation, unit12, unit12.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: -8,
                attackBonus: 1,
                attacker: leader21,
                attackerBelowDefender: -1,
                attackerCapacity: 1,
                attackerDisrupted: -1,
                attackerExhausted: -2,
                attackerIsACharacter: -4,
                attackerOnDifficultGround: -2,
                defender: unit12,
                defenderCapacity: -0,
                defenderOnRoughGround: -1,
                defenderStacked: 2,
                defenseBonus: -1,
                weapons: 0
            });

    });

    it("Checks shock attack computing advantage - third case", () => {
        given:
            var {arbitrator, unit11, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit22.hexLocation = unit21.hexLocation;
            unit22.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            unit21.angle = 90;
            unit22.angle = 90;
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            unit12.hexLocation.height = 1;
            unit12.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit11.hexLocation = unit12.hexLocation;
            unit21.fixTirednessLevel(CBTiredness.EXHAUSTED);
            unit21.rout();
            unit12.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
        when:
            var advantage = arbitrator.getShockAttackAdvantage(unit12, unit12.hexLocation, unit21, unit21.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: 0,
                attacker: unit12,
                attackerAboveDefenfer: 1,
                attackerCapacity: 0,
                attackerOnRoughGround: -1,
                attackerStacked: -2,
                attackerTired: -1,
                defender: unit21,
                defenderCapacity: -1,
                defenderExhausted: 1,
                defenderOnDifficultGround: -2,
                defenderRouted: 4,
                defenderStacked: 2,
                defenseBonus: -2,
                difficultHexSide: -1,
                sideAdvantage: 2,
                weapons: 0
            });

    });

    it("Checks shock attack computing advantage - fourth case", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0);
            unit21.angle = 90;
            unit21.markAsCharging(CBCharge.CHARGING);
        when:
            var advantage = arbitrator.getShockAttackAdvantage(unit12, unit12.hexLocation, unit21, unit21.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: -3,
                attacker: unit12,
                attackerCapacity: 0,
                defender: unit21,
                defenderCapacity: -1,
                defenderCharging: -2,
                defenseBonus: -2,
                sideAdvantage: 2,
                weapons: 0
            });
    });

    it("Checks if a character is allowed to fire by duel", () => {
        given:
            var {arbitrator, unit11, leader11, unit21, leader21} = create2Players4UnitsTinyGame();
        when:
            unit21.move(unit11.hexLocation.getNearHex(0).getNearHex(0));
            leader11.move(unit11.hexLocation);
            leader21.move(unit21.hexLocation);
        then:
            assert(arbitrator.isAllowedToFireDuel(unit11)).isFalse();
            assert(arbitrator.isAllowedToFireDuel(leader11)).isTrue();
        when:
            leader21.move(null);
        then:
            assert(arbitrator.isAllowedToFireDuel(leader11)).isFalse();
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
        when:
            units = arbitrator.getFoesThatMayBeFireAttackedFromHex(unit12, unit12.hexLocation);
        then:
            assert(units.length).equalsTo(1);
            assert(units[0].unit).equalsTo(unit21);
    });

    it("Checks leaders that may be fired by duel", () => {
        given:
            var {arbitrator, map, unit11, leader11, unit21, leader21} = create2Players4UnitsTinyGame();
            unit21.move(unit11.hexLocation.getNearHex(0).getNearHex(0));
            leader11.move(unit11.hexLocation);
            leader21.move(unit21.hexLocation);
        when:
            var foes = arbitrator.getFoesThatMayBeDuelFired(leader11);
        then:
            assert(foes.length).equalsTo(1);
            assert(foes[0].unit).equalsTo(leader21);
        when:
            foes = arbitrator.getFoesThatMayBeDuelFiredFromHex(leader11, leader11.hexLocation);
        then:
            assert(foes.length).equalsTo(1);
            assert(foes[0].unit).equalsTo(leader21);
    });

    it("Checks fire attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 5));
        when:
            var result = arbitrator.processFireAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, [1, 1]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.lowerFirerMunitions).isTrue();
        when:
            result = arbitrator.processFireAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, [4, 3]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(1);
            assert(result.lowerFirerMunitions).isFalse();
        when:
            result = arbitrator.processFireAttackResult(unit12, unit12.hexLocation, unit21, unit21.hexLocation, [5, 5]);
        then:
            assert(result.success).isFalse();
            assert(result.lowerFirerMunitions).isTrue();
    });

    it("Checks fire attack computing advantage - first case", () => {
        given:
            var {arbitrator, map, unit11, unit12, leader21} = create2Players4UnitsTinyGame();
            leader21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0).getNearHex(0);
            unit12.fixTirednessLevel(CBTiredness.EXHAUSTED);
            unit12.disrupt();
            unit12.markAsCharging(CBCharge.CHARGING);
            unit12.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit12.hexLocation.height = 1;
            unit12.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            unit11.hexLocation = unit12.hexLocation;
            leader21.fixTirednessLevel(CBTiredness.EXHAUSTED);
            leader21.disrupt();
            leader21.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        when:
            var advantage = arbitrator.getFireAttackAdvantage(unit12, unit12.hexLocation, leader21, leader21.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: -1,
                backAdvantage: 2,
                defenseBonus: -2,
                distanceMalus: -2,
                fireBonus: 2,
                firer: unit12,
                firerAboveTarget: 1,
                firerCapacity: 0,
                firerDisrupted: -1,
                firerExhausted: -1,
                firerOnDifficultGround: -1,
                firerStacked: -2,
                scarceMunitions: -1,
                target: leader21,
                targetCapacity: -1,
                targetDisrupted: 1,
                targetIsACharacter: 4,
                targetOnDifficultGround: -4,
                weapons: 4
            });
    });

    it("Checks fire attack computing advantage - second case", () => {
        given:
            var {arbitrator, map, unit11, unit12, leader21} = create2Players4UnitsTinyGame();
            leader21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0).getNearHex(0);
            unit12.fixTirednessLevel(CBTiredness.EXHAUSTED);
            unit12.rout();
            unit12.angle = 90;
            unit12.hexLocation.toward(0).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            unit12.hexLocation.height = 1;
            unit12.hexLocation.type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            unit11.hexLocation = unit12.hexLocation;
            leader21.fixTirednessLevel(CBTiredness.EXHAUSTED);
            leader21.disrupt();
            leader21.angle = 180;
        when:
            var advantage = arbitrator.getFireAttackAdvantage(leader21, leader21.hexLocation, unit12, unit12.hexLocation, true);
        then:
            assert(advantage).objectEqualsTo({
                advantage: -5,
                defenseBonus: -1,
                distanceMalus: -2,
                firer: leader21,
                firerBelowTarget: -1,
                firerCapacity: 1,
                firerDisrupted: -1,
                firerExhausted: -1,
                firerIsACharacter: -4,
                sideAdvantage: 1,
                target: unit12,
                targetCapacity: 0,
                targetOnRoughGround: -2,
                targetProtection: -1,
                targetRouted: 4,
                targetStacked: 2,
                weapons: 0
            });
    });

    function assertNotInZone(zones, angle) {
        assert(zones[angle]).isNotDefined();
    }
    function assertInAdvanceZone(zones, angle, col, row, moveType) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
        assert(zones[angle].moveType).equalsTo(moveType);
    }

    it("Checks unit allowed advance", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(unit12.hexLocation.getNearHex(60));
        when:
            var allowedAdvances = arbitrator.getAdvanceZones(unit12, [
                unit12.hexLocation.getNearHex(0),
                unit12.hexLocation.getNearHex(60),
                unit12.hexLocation.getNearHex(120)
            ]);
        then:
            assertNotInZone(allowedAdvances, 300); // Not in allowed advance zones
            assertInAdvanceZone(allowedAdvances, 0, 5, 6, CBMoveType.FORWARD);
            assertNotInZone(allowedAdvances, 60); // occupied by foe
            assertNotInZone(allowedAdvances, 120); // not in forward zone
            assertNotInZone(allowedAdvances, 180); // not in forward zone and not in allowed advance zones
            assertNotInZone(allowedAdvances, 240); // not in forward zone and not in allowed advance zones
    });

});