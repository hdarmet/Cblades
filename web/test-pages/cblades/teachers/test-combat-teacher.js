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
    Dimension2D, reverseAngle
} from "../../../jslib/geometry.js";
import {
    CBCombatTeacher
} from "../../../jslib/cblades/teachers/combat-teacher.js";

describe("Combat teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBCombatTeacher);

    class FireWeaponProfile extends CBWeaponProfile {
        constructor() {
            super(0);
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
                this.setWeaponProfile(index, new FireWeaponProfile());
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
        let map = new CBMap("/CBlades/images/maps/map.png");
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
        let map = new CBMap("/CBlades/images/maps/map.png");
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
        loadAllImages();
        return {game, arbitrator, map, unit1, unit2, formation2, wing1, wing2, player1, player2};
    }

    function assertInRetreatZone(zones, angle, col, row, moveType) {
        assert(zones[angle].hex.col).equalsTo(col);
        assert(zones[angle].hex.row).equalsTo(row);
        assert(zones[angle].moveType).equalsTo(moveType);
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
        let map = new CBMap("/CBlades/images/maps/map.png");
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
        return {game, arbitrator, map, player1, formation1, leader11, player2, unit21, unit22, leader21};
    }

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

    it("Checks shock attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 6));
        when:
            var result = arbitrator.processShockAttackResult(unit12, unit21, true, [1, 2]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.tirednessForAttacker).isTrue();
        when:
            result = arbitrator.processShockAttackResult(unit12, unit21, false, [2, 3]);
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
    });

    it("Checks fire attack processing", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
            unit21.move(map.getHex(5, 5));
        when:
            var result = arbitrator.processFireAttackResult(unit12, unit21, [1, 1]);
        then:
            assert(result.success).isTrue();
            assert(result.lossesForDefender).equalsTo(2);
            assert(result.lowerFirerMunitions).isTrue();
        when:
            result = arbitrator.processFireAttackResult(unit12, unit21, [4, 3]);
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