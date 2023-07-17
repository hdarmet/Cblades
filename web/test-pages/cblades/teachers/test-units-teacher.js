'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHexSideId, CBMap
} from "../../../jslib/cblades/map.js";
import {
    CBAction
} from "../../../jslib/cblades/game.js";
import {
    CBGame
} from "../../../jslib/cblades/playable.js";
import {
    CBWeather, WeatherMixin
} from "../../../jslib/cblades/weather.js";
import {
    CBUnitPlayer,
    CBCharacter, CBCharge, CBCohesion,
    CBCommandProfile, CBEngageSideMode,
    CBFormation,
    CBMoralProfile,
    CBMoveProfile, CBOrderInstruction, CBTiredness,
    CBTroop,
    CBWeaponProfile,
    CBWing, CBTroopType
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
    banner, banner1, banner2
} from "../game-examples.js";

describe("Units teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher);

    class CBTestUnitType extends CBTroopType {
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
        let game = new (WeatherMixin(CBGame))("Test");
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, banner1);
        let player2 = new CBUnitPlayer("player2", "/players/player2.png");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, banner2);
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
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    function create2PlayersTinyFormationGame() {
        let game = new CBGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let player2 = new CBUnitPlayer("player2", "/players/player2.png");
        game.addPlayer(player2);
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let wing1 = new CBWing(player1, banner1);
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"]);
        let unit1 = new CBTroop(unitType1, wing1);
        unit1.addToMap(map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing1);
        unit2.addToMap(map.getHex(5, 6));
        let wing2 = new CBWing(player2, banner2);
        let unitType2 = new CBTestUnitType("unit2",
            ["./../images/units/misc/unit2.png", "./../images/units/misc/unit2b.png"],
            ["./../)images/units/misc/formation2.png", "./../images/units/misc/formation2b.png"]);
        let formation2 = new CBFormation(unitType2, wing2);
        formation2.angle = 90;
        formation2.addToMap(new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, unit1, unit2, formation2, wing1, wing2, player1, player2};
    }

    it("Checks get weather", () => {
        given:
            var {game, arbitrator} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getWeather(game)).equalsTo(CBWeather.CLEAR);
    });

    it("Checks if a unit can be played", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.canPlayUnit(unit12)).isTrue();
        when:
            unit12.launchAction(new CBAction(unit12.game, unit12));
            unit12.action.markAsStarted();
        then:
            assert(arbitrator.canPlayUnit(unit12)).isFalse();
        when:
            unit12.action.markAsFinished();
        then:
            assert(arbitrator.canPlayUnit(unit12)).isFalse();
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
            assert(arbitrator.doesHexLocationContainFoes(unit11, map.getHex(2, 2))).isFalse();
            assert(arbitrator.doesHexLocationContainFoes(unit11, unit12.hexLocation)).isFalse();
            assert(arbitrator.doesHexLocationContainFoes(unit11, unit21.hexLocation)).isTrue();
    });

    it("Checks if a hex is adjacent to foes", () => {
        given:
            var {map, arbitrator, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isHexLocationAdjacentToFoes(unit11, unit21.hexLocation.getNearHex(60))).isTrue();
            assert(arbitrator.isHexLocationAdjacentToFoes(unit11, unit21.hexLocation.getNearHex(180).getNearHex(180))).isFalse();
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
            assert(arbitrator.doesHexLocationContainFriends(unit11, map.getHex(2, 2))).isFalse();
            assert(arbitrator.doesHexLocationContainFriends(unit11, unit12.hexLocation)).isTrue();
            assert(arbitrator.doesHexLocationContainFriends(unit11, unit21.hexLocation)).isFalse();
    });

    it("Checks if a character is alone in a hex", () => {
        given:
            var {arbitrator, unit11, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.move(unit11.hexLocation);
        then:
            assert(arbitrator.isAloneInHex(leader11)).isFalse();
        when:
            unit11.move(null);
        then:
            assert(arbitrator.isAloneInHex(leader11)).isTrue();
    });

    it("Checks troop counter", () => {
        given:
            var {arbitrator, unit11, unit12, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = unit11.hexLocation;
            unit12.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.countTroops(unit12.hexLocation)).equalsTo(2);
    });

    it("Checks which troop is stacked with", () => {
        given:
            var {arbitrator, unit11, unit12, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = unit11.hexLocation;
            unit12.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.getTroopsStackedWith(unit12)).arrayEqualsTo([unit11]);
            assert(arbitrator.getTroopsStackedWith(leader11)).unorderedArrayEqualsTo([unit11, unit12]);
    });

    it("Checks which troop is crossed when another troop moves forward", () => {
        given:
            var {arbitrator, unit11, unit12, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = unit11.hexLocation;
            unit12.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.getTroopsToCrossOnForwardMovement(unit11)).arrayEqualsTo([unit12]);
            assert(arbitrator.getTroopsToCrossOnForwardMovement(unit12)).arrayEqualsTo([]);
    });

    it("Checks which troop is crossed when another troop moves backward", () => {
        given:
            var {arbitrator, unit11, unit12, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = unit11.hexLocation;
            unit12.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.getTroopsToCrossOnBackwardMovement(unit12)).arrayEqualsTo([unit11]);
            assert(arbitrator.getTroopsToCrossOnBackwardMovement(unit11)).arrayEqualsTo([]);
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
            unit12.setEngaging(true);
        then:
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit21, true)).isTrue();
            assert(arbitrator.isUnitEngaged(unit21, true)).isTrue();
        when:
            unit12.rout();
        then:
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit21, true)).isFalse();
            assert(arbitrator.isUnitEngaged(unit21, true)).isFalse();
            assert(arbitrator.doesUnitEngage(unit12)).isFalse();
        when:
            unit12.cohesion = CBCohesion.GOOD_ORDER;
            unit21.move(map.getHex(7, 2));
            unit11.move(map.getHex(2, 2));
        then:
            assert(arbitrator.doesUnitEngage(unit12)).isFalse();
            assert(arbitrator.isAUnitEngageAnotherUnit(unit12, unit11)).isFalse();
            assert(arbitrator.isUnitEngaged(unit11)).isFalse();
    });

    it("Checks on which side a unit contact a foe", () => {
        given:
            var {arbitrator, map, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit12.angle = 0;
            unit21.angle = 180;
        then:
            assert(arbitrator.getSideWhereAUnitPotentiallyEngageAnotherUnit(
                unit12, unit21, unit12.hexLocation.getNearHex(0), 0)
            ).equalsTo(CBEngageSideMode.BACK);
            assert(arbitrator.getSideWhereAUnitPotentiallyEngageAnotherUnit(
                unit12, unit21, unit12.hexLocation.getNearHex(0), 90)
            ).equalsTo(CBEngageSideMode.SIDE);
            assert(arbitrator.getSideWhereAUnitPotentiallyEngageAnotherUnit(
                unit12, unit21, unit12.hexLocation.getNearHex(0), 180)
            ).equalsTo(CBEngageSideMode.FRONT);
    });

    it("Checks if a unit is allowed to charge", () => {
        given:
            var {arbitrator, unit1, unit2, wing1, formation2, wing2} = create2PlayersTinyFormationGame();
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isFalse();
            assert(arbitrator.mayUnitCharge(formation2)).isFalse();
        when:
            unit1.receivesOrder(true);
            formation2.receivesOrder(true);
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isTrue();
            assert(arbitrator.mayUnitCharge(formation2)).isFalse();
        when:
            unit1.receivesOrder(false);
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            wing2.setOrderInstruction(CBOrderInstruction.ATTACK);
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isTrue();
            assert(arbitrator.mayUnitCharge(formation2)).isFalse();
        when:
            unit1.addOneTirednessLevel();
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isTrue();
        when:
            unit1.addOneTirednessLevel();
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isFalse();
        when:
            unit2.disrupt();
        then:
            assert(arbitrator.mayUnitCharge(unit2)).isFalse();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.DEFEND);
            unit1.tiredness = CBTiredness.NONE;
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isFalse();
        when:
            unit1.setCharging(CBCharge.CHARGING);
        then:
            assert(arbitrator.mayUnitCharge(unit1)).isTrue();
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

    it("Checks lost of cohesion result", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processCohesionLostResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processCohesionLostResult(unit12, [6, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks lost of cohesion result", () => {
        given:
            var {arbitrator, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            unit11.hexLocation = unit12.hexLocation.getNearHex(0);
            var units = arbitrator.getFriendNonRoutedNeighbors(unit12, unit12.hexLocation);
        then:
            assert(units).equalsTo[unit11];
    });

    it("Checks if a non routed unit is near a routed friend", () => {
        given:
            var {arbitrator, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            unit11.hexLocation = unit12.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit12)).isFalse();
        when:
            unit11.rout();
        then:
            assert(arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit12)).isTrue();
        when:
            unit11.hexLocation = unit11.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit12)).isFalse();
        when:
            unit11.hexLocation = unit12.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit12)).isTrue();
        when:
            unit12.rout();
        then:
            assert(arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit12)).isFalse();
    });

    it("Checks if a routed unit is near a non routed friend", () => {
        given:
            var {arbitrator, leader11, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            unit11.hexLocation = unit12.hexLocation.getNearHex(0);
            leader11.hexLocation = null;
        then:
            assert(arbitrator.doesARoutedUnitHaveNonRoutedNeighbors(unit12)).isFalse();
        when:
            unit12.rout();
        then:
            assert(arbitrator.doesARoutedUnitHaveNonRoutedNeighbors(unit12)).isTrue();
        when:
            unit11.hexLocation = unit11.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.doesARoutedUnitHaveNonRoutedNeighbors(unit12)).isFalse();
        when:
            unit11.hexLocation = unit12.hexLocation.getNearHex(0);
            unit11.rout();
        then:
            assert(arbitrator.doesARoutedUnitHaveNonRoutedNeighbors(unit12)).isFalse();
    });

    it("Checks if a routed unit is near a non routed friend", () => {
        given:
            var {arbitrator, leader11, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            var hex2 = unit12.hexLocation;
            unit11.hexLocation = hex2.getNearHex(0);
            unit12.destroy();
            leader11.hexLocation = null;
        then:
            assert(arbitrator.doesADestroyedUnitHaveNonRoutedNeighbors(unit12, hex2)).isTrue();
        when:
            unit11.hexLocation = unit11.hexLocation.getNearHex(0);
        then:
            assert(arbitrator.doesADestroyedUnitHaveNonRoutedNeighbors(unit12, hex2)).isFalse();
        when:
            unit11.hexLocation = hex2.getNearHex(0);
            unit11.rout();
        then:
            assert(arbitrator.doesADestroyedUnitHaveNonRoutedNeighbors(unit12, hex2)).isFalse();
    });

    it("Checks if a routed unit is near a non routed friend", () => {
        given:
            var {arbitrator, leader11, unit11, unit12} = create2Players4UnitsTinyGame();
        when:
            var conditions = arbitrator.getUnitCohesionLostCondition(unit12);
        then:
            assert(conditions.modifier).equalsTo(0);
    });

    it("Check get wingTiredness", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getWingTiredness(unit12)).equalsTo(10);
    });

    it("Checks unit filtering by type", () => {
        given:
            var arbitrator = new Arbitrator();
            var type1 = new CBTestUnitType("red", ["red/unit1", "red/unit1b"]);
            var type2 = new CBTestUnitType("blue", ["blue/unit1", "blue/unit1b"]);
            var wing1 = new CBWing(new CBUnitPlayer("player1", "/players/player1.png"), banner);
            var unit1 = new CBTroop(type1, wing1);
            var unit2 = new CBTroop(type2, wing1);
            var unit3 = new CBTroop(type1, wing1);
            var units = [unit1, unit2, unit3];
        then:
            assert(arbitrator.getUnitOfType(units, type1)).unorderedArrayEqualsTo([unit1, unit3]);
    });

    it("Checks if how many movement point a unit can use", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getMaxMovementPoints(unit12)).equalsTo(3);
            assert(arbitrator.getMinCostForAttackMove(unit12)).equalsTo(1);
            assert(arbitrator.getMinCostForRoutMove(unit12)).equalsTo(3);
        when:
            unit12.setTiredness(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.getMaxMovementPoints(unit12)).equalsTo(2);
            assert(arbitrator.getMinCostForAttackMove(unit12)).equalsTo(1);
            assert(arbitrator.getMinCostForRoutMove(unit12)).equalsTo(2);
    });

    it("Checks if a unit can get tired", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.canGetTired(unit12)).isTrue();
        when:
            unit12.setTiredness(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.canGetTired(unit12)).isFalse();
        when:
            unit12.setTiredness(CBTiredness.TIRED);
        then:
            assert(arbitrator.canGetTired(unit12)).isTrue();
        when:
            unit12.setCharging(CBCharge.CHARGING);
        then:
            assert(arbitrator.canGetTired(unit12)).isFalse();
        when:
            unit12.setTiredness(CBTiredness.NONE);
        then:
            assert(arbitrator.canGetTired(unit12)).isTrue();
    });

    it("Checks a unit's foe list", () => {
        given:
            var {arbitrator, unit12, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getFoes(unit12)).setEqualsTo(new Set([unit21, unit22, leader21]));
    });

    it("Checks if a troop is stocked with a troop", () => {
        given:
            var {arbitrator, unit11, unit12, leader11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isStackedTroop(unit11)).isFalse();
        when:
            leader11.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.isStackedTroop(unit11)).isFalse();
            assert(arbitrator.isStackedTroop(leader11)).isFalse();
        when:
            unit12.hexLocation = unit11.hexLocation;
        then:
            assert(arbitrator.isStackedTroop(unit11)).isTrue();
            assert(arbitrator.isStackedTroop(unit12)).isTrue();
            assert(arbitrator.isStackedTroop(leader11)).isFalse();
    });

    it("Checks shock attack side", () => {
        given:
            var {arbitrator, unit11, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit11.hexLocation.getNearHex(60).getNearHex(60);
            unit11.angle = 60;
            unit21.angle = 240;
        then:
            assert(arbitrator.getEngagementSide(unit11, unit21)).equalsTo(CBEngageSideMode.NONE);
        when:
            unit21.hexLocation = unit11.hexLocation.getNearHex(60);
        then:
            assert(arbitrator.getEngagementSide(unit11, unit21)).equalsTo(CBEngageSideMode.FRONT);
        when:
            unit21.angle = 150;
        then:
            assert(arbitrator.getEngagementSide(unit11, unit21)).equalsTo(CBEngageSideMode.SIDE);
        when:
            unit21.angle = 90;
        then:
            assert(arbitrator.getEngagementSide(unit11, unit21)).equalsTo(CBEngageSideMode.BACK);
    });

    it("Checks fire attack side", () => {
        given:
            var {arbitrator, unit11, unit21} = create2Players4UnitsTinyGame();
            unit21.hexLocation = unit11.hexLocation.getNearHex(60).getNearHex(60);
            unit11.angle = 60;
            unit21.angle = 240;
        then:
            assert(arbitrator.getFireSide(unit11, unit21)).equalsTo(CBEngageSideMode.FRONT);
        when:
            unit21.angle = 150;
        then:
            assert(arbitrator.getFireSide(unit11, unit21)).equalsTo(CBEngageSideMode.SIDE);
        when:
            unit21.angle = 90;
        then:
            assert(arbitrator.getFireSide(unit11, unit21)).equalsTo(CBEngageSideMode.BACK);
    });

});