'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHexSideId, CBMap
} from "../../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer, CBAction
} from "../../../jslib/cblades/game.js";
import {
    CBCharacter, CBCohesion,
    CBCommandProfile,
    CBFormation, CBLackOfMunitions,
    CBMoralProfile,
    CBMoveProfile, CBTiredness,
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
    loadAllImages,
    mergeClasses,
    mockPlatform
} from "../../mocks.js";
import {
    CBUnitManagementTeacher
} from "../../../jslib/cblades/teachers/units-teacher.js";
import {
    CBCommandTeacher
} from "../../../jslib/cblades/teachers/command-teacher.js";

describe("Command teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBCommandTeacher);

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

    it("Checks if a character is allowed to change orders", () => {
        given:
            var {arbitrator, leader11, unit11, wing1} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToChangeOrderInstruction(unit11)).isFalse();
            assert(arbitrator.isAllowedToChangeOrderInstruction(leader11)).isFalse();
        when:
            wing1.setLeader(leader11);
        then:
            assert(arbitrator.isAllowedToChangeOrderInstruction(leader11)).isTrue();
    });

    it("Checks if a character is allowed to give specific orders", () => {
        given:
            var {arbitrator, leader11, unit11, wing1} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToGiveOrders(unit11)).isFalse();
            assert(arbitrator.isAllowedToGiveOrders(leader11)).isTrue();
    });

    it("Checks if a character is allowed to take command", () => {
        given:
            var {arbitrator, leader11, unit11, wing1} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToTakeCommand(unit11)).isFalse();
            assert(arbitrator.isAllowedToTakeCommand(leader11)).isTrue();
        when:
            wing1.setLeader(leader11);
        then:
            assert(arbitrator.isAllowedToTakeCommand(leader11)).isFalse();
    });

    it("Checks if a character is allowed to dismiss command", () => {
        given:
            var {arbitrator, leader11, unit11, wing1} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToDismissCommand(unit11)).isFalse();
            assert(arbitrator.isAllowedToDismissCommand(leader11)).isFalse();
        when:
            wing1.setLeader(leader11);
        then:
            assert(arbitrator.isAllowedToDismissCommand(leader11)).isTrue();
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
            unit11.disrupt();
            unit12.disrupt();
        when:
            var units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([
                {unit:unit11, cost:2, detail:{base:1}}, {unit:unit12, cost:2, detail:{base:1, disrupted:1}}
            ]);
        when:
            unit11.receivesOrder(true)
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([{unit:unit12, cost:2, detail:{base:1, disrupted:1}}]);
        when:
            unit11.receivesOrder(false)
            unit12.launchAction(new CBAction(game, unit12));
            unit12.action.markAsStarted();
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 5);
        then:
            assert(units).unorderedArrayEqualsTo([{unit:unit11, cost:2, detail:{base:1, disrupted:1}}]);
        when:
            leader11.receiveCommandPoints(1);
            units = arbitrator.getUnitsThatMayReceiveOrders(leader11, 1);
        then:
            assert(units).arrayEqualsTo([]);
    });

    it("Checks how much command points are necessary to give an order to a unit", () => {
        given:
            var {game, map, arbitrator, leader11, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getOrderGivenCost(leader11, unit11)).objectEqualsTo({cost:1, detail:{base:1}});
        when:
            unit11.hexLocation = map.getHex(10, 10);
        then:
            assert(arbitrator.getOrderGivenCost(leader11, unit11)).objectEqualsTo({cost:2, detail:{base:1, distance:1}});
        when:
            unit11.disrupt();
        then:
            assert(arbitrator.getOrderGivenCost(leader11, unit11)).objectEqualsTo({cost:3, detail:{base:1, distance:1, disrupted:1}});
        when:
            unit11.rout();
        then:
            assert(arbitrator.getOrderGivenCost(leader11, unit11)).objectEqualsTo({cost:4, detail:{base:1, distance:1, routed:2}});
        when:
            unit11.fixTirednessLevel(CBTiredness.EXHAUSTED);
        then:
            assert(arbitrator.getOrderGivenCost(leader11, unit11)).objectEqualsTo({cost:5, detail:{base:1, distance:1, routed:2, exhausted:1}});
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
            unit11.receivesOrder(true);
            unit12.receivesOrder(true);
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
            unit12.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToMerge(unit11)).isFalse();
        when:
            unit12.receivesOrder(true);
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
            leader12.addToMap(map.getHex(8, 8));
            leader11.move(map.getHex(8, 8));
            leader12.move(map.getHex(8, 8));
            leader11.fixRemainingLossSteps(1);
            leader12.fixRemainingLossSteps(1);
            leader11.receivesOrder(true);
            leader12.receivesOrder(true);
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
            unit11.receivesOrder(true);
            unit12.receivesOrder(true);
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
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player = new CBAbstractPlayer();
        game.addPlayer(player);
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType1 = new CBTestUnitType("unit1", [
                "./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"
            ],
            [
                "./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png",
                "./../images/units/misc/formation2.png", "./../images/units/misc/formation2b.png",
                "./../images/units/misc/formation3.png", "./../images/units/misc/formation3b.png",
                "./../images/units/misc/formation4.png", "./../images/units/misc/formation4b.png"
            ]);
        let unitType2 = new CBTestUnitType("unit2", [
            "./../images/units/misc/unit2.png", "./../images/units/misc/unit2b.png"
        ]);
        let unit1 = new CBTroop(unitType1, wing);
        unit1.addToMap(map.getHex(5, 8));
        let unit2 = new CBTroop(unitType1, wing);
        unit2.addToMap(map.getHex(5, 6));
        let unit3 = new CBTroop(unitType2, wing);
        unit3.addToMap(map.getHex(5, 4));
        let formation = new CBFormation(unitType1, wing);
        formation.angle = 90;
        formation.addToMap(new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, unit1, unit2, unit3, formation, wing, player};
    }

    it("Checks if a formation is allowed to break", () => {
        given:
            var {arbitrator, unit1, formation} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receivesOrder(true);
            formation.receivesOrder(true);
        then:
            assert(arbitrator.isAllowedToBreakFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToBreakFormation(formation)).isFalse();
        when:
            formation.fixRemainingLossSteps(7);
        then:
            assert(arbitrator.isAllowedToBreakFormation(formation)).isTrue();
        when:
            formation.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToBreakFormation(formation)).isFalse();
        when:
            formation.receivesOrder(true);
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
            unit1.receivesOrder(true);
            formation.receivesOrder(true);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(unit1)).isFalse();
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isTrue();
        when:
            formation.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToReleaseTroops(formation)).isFalse();
        when:
            formation.receivesOrder(true);
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
            unit1.receivesOrder(true);
            formation.receivesOrder(true);
            formation.fixRemainingLossSteps(4);
            unit1.angle = 90;
            unit1.move(formation.hexLocation.fromHex, 0);
            unit2.move(null, 0);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(unit1)).isFalse();
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isTrue();
        when:
            formation.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            formation.receivesOrder(true);
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
            unit1.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToIncludeTroops(formation)).isFalse();
        when:
            unit1.receivesOrder(true);
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
            unit1.receivesOrder(true);
            formation.receivesOrder(true);
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
            unit1.receivesOrder(true);
            unit1.angle = 90;
            unit1.move(map.getHex(3, 4), 0);
            unit2.receivesOrder(true);
            unit2.angle = 90;
            unit2.move(map.getHex(3, 5), 0);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isTrue();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isTrue();
        when:
            unit1.receivesOrder(false);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
            assert(arbitrator.isAllowedToCreateFormation(unit2)).isFalse();
        when:
            unit1.receivesOrder(true);
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
            unit2.angle = 60;
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
            unit3.receivesOrder(true);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
        when:
            unit3.move(null, 0);
            formation.move(new CBHexSideId(map.getHex(3, 5), map.getHex(3, 6)), 0);
            formation.receivesOrder(true);
        then:
            assert(arbitrator.isAllowedToCreateFormation(unit1)).isFalse();
    });

    it("Checks formation creation", () => {
        given:
            var {arbitrator, unit1, unit2, map} = createTinyFormationAndTroopsForTheSamePlayerGame();
            unit1.receivesOrder(true);
            unit1.angle = 90;
            unit1.move(map.getHex(3, 4), 0);
            unit2.receivesOrder(true);
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

});