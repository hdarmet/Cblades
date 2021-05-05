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
    CBHexSideId,
    CBMap, CBMoveMode
} from "../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer, CBCounter
} from "../../jslib/cblades/game.js";
import {
    CBCharacter, CBCharge, CBCommandProfile, CBFormation, CBLackOfMunitions, CBMoralProfile,
    CBMoveProfile, CBOrderInstruction,
    CBTiredness,
    CBTroop,
    CBUnitType, CBWeaponProfile,
    CBWing
} from "../../jslib/cblades/unit.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    Dimension2D
} from "../../jslib/geometry.js";

describe("Arbitrator", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    class FireWeaponProfile extends CBWeaponProfile {
        constructor() {
            super(0);
        }
        getFireAttackCode() {
            return "FBw";
        }
        getFireRange() {
            return 7;
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

    function createTinyGame() {
        let game = new CBGame();
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        wing1.setRetreatZone(map.getWestZone());
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
        //wing2.setRetreatZone(map.getEastZone());
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    function createTinyFormationGame() {
        let game = new CBGame();
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let wing1 = new CBWing(player1);
        wing1.setRetreatZone(map.getWestZone());
        let unitType1 = new CBTestUnitType("unit1",
            ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"],
            [
                "/CBlades/images/units/misc/unit1L3.png", "/CBlades/images/units/misc/unit1L3b.png",
                "/CBlades/images/units/misc/unit1L2.png", "/CBlades/images/units/misc/unit1L2b.png",
                "/CBlades/images/units/misc/unit1L1.png", "/CBlades/images/units/misc/unit1L1b.png"
            ])
        let formation11 = new CBFormation(unitType1, wing1);
        game.addUnit(formation11, new CBHexSideId(map.getHex(5, 8), map.getHex(6, 8)));
        formation11.angle = 30;
        let unit11 = new CBTroop(unitType1, wing1);
        game.addUnit(unit11, map.getHex(5, 9));
        unit11.angle = 30;
        let unit12 = new CBTroop(unitType1, wing1);
        game.addUnit(unit12, map.getHex(6, 9));
        unit12.angle = 30;
        let leaderType1 = new CBTestUnitType("leader1", [
            "/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        game.addUnit(leader11, map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, formation11, unit11, unit12, leader11};
    }

    function create2Players1Formation2UnitsTinyGame() {
        let {game, arbitrator, map, player1, wing1, formation11, unit11, unit12, leader11} = createTinyFormationGame();
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        //wing2.setRetreatZone(map.getEastZone());
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        game.addUnit(unit21, map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        game.addUnit(unit22, map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        game.addUnit(leader21, map.getHex(8, 7));
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, formation11, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

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

    function moveToEngage(engaging, engaged, angle) {
        engaging.hexLocation = engaged.hexLocation.getNearHex(angle);
        engaging.angle = (angle+180)%360;
    }

    function assertActions(model, value) {
        assert(value).objectEqualsTo(model);
        assert(model).objectEqualsTo(value);
    }

    it("Checks routed troop allowed actions", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            unit12.rout();
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                escape: true
            });
        when:
            unit12.receivesOrder(true);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                rally: true
            });
    });

    it("Checks engaged and routed troop allowed actions", () => {
        given:
            var {arbitrator, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            unit12.rout();
            moveToEngage(unit21, unit12, 0);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                escape: true
            });
        when:
            unit12.receivesOrder(true);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                escape: true
            });
        when:
            moveToEngage(unit22, unit12, 180);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                destroyed: true
            });
    });

    it("Checks charging troop allowed actions", () => {
        given:
            var {arbitrator, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            unit12.markAsCharging(CBCharge.CHARGING);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.ATTACK
            });
        when:
            unit12.receivesOrder(true);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                shockAttack: true
            });
    });

    it("Checks charging character allowed actions", () => {
        given:
            var {arbitrator, leader11, unit12, leader21, unit21} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = unit12.hexLocation;
            leader11.markAsCharging(CBCharge.CHARGING);
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, leader11, 0);
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions, {
                shockAttack: true
            });
        when:
            moveToEngage(leader21, leader11, 0);
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions, {
                shockAttack: true,
                shockDuel: true
            });
    });

    it("Checks allowed actions for a troop that is engaged but does not engage", () => {
        given:
            var {arbitrator, wing1, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            moveToEngage(unit21, unit12, 0);
            unit12.angle = 90;
            let allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                confront: true
            });
    });

    it("Checks allowed actions for a troop belonging to a reorganizing wing and not far from enemy units", () => {
        given:
            var {arbitrator, wing1, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.REGROUP);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                escape: true,
                moveBack: true
            });
        when:
            moveToEngage(unit22, unit12, 180);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                shockAttack: true
            });
    });

    it("Checks allowed actions for a troop belonging to a retreating wing", () => {
        given:
            var {arbitrator, wing1, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.RETREAT);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.RETREAT,
                moveBack: true,
                escape: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                escape: true,
                moveBack: true
            });
        when:
            moveToEngage(unit22, unit12, 180);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                shockAttack: true
            });
    });

    it("Checks allowed actions for a troop belonging to an attacking wing", () => {
        given:
            var {arbitrator, wing1, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.ATTACK,
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                fireAttack: true,
                shockAttack: true
            });
    });

    it("Checks allowed actions for a disrupted troop belonging to an attacking wing", () => {
        given:
            var {arbitrator, wing1, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            unit12.disrupt();
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.ATTACK,
                reorganize: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                fireAttack: true,
                shockAttack: true,
                escape: true,
                moveBack: true
            });
    });

    it("Checks allowed actions for an exhausted troop belonging to an attacking wing", () => {
        given:
            var {arbitrator, wing1, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            unit12.fixTirednessLevel(CBTiredness.EXHAUSTED);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.ATTACK,
                rest: true
            });
        when:
            unit21.hexLocation = unit21.hexLocation.getNearHex(0).getNearHex(0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.FIRE,
                fireAttack: true,
                rest: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                fireAttack: true,
                shockAttack: true,
                escape: true,
                moveBack: true
            });
    });

    it("Checks allowed actions for a troop belonging to a reorganizing wing and far from enemy units", () => {
        given:
            var {arbitrator, map, wing1, unit12, unit21, unit22, leader21} = create2Players4UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.REGROUP);
            unit21.hexLocation = map.getHex(5, 2);
            unit22.hexLocation = map.getHex(5, 3);
            leader21.hexLocation = map.getHex(5, 2);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true,
                fireAttack: true,
                noAction: true
            });
        when:
            unit12.disrupt();
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            unit12.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            unit21.hexLocation = map.getHex(10, 1);
            unit22.hexLocation = map.getHex(11, 1);
            leader21.hexLocation = map.getHex(10, 1);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true,
                reorganize: true,
                reload: true,
                rest: true
            });
    });

    it("Checks allowed actions for a formation belonging to a reorganizing wing", () => {
        given:
            var {arbitrator, map, wing1, formation11, unit11, unit12, unit21, unit22, leader21} = create2Players1Formation2UnitsTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.REGROUP);
            unit21.hexLocation = map.getHex(12, 1);
            unit22.hexLocation = map.getHex(12, 1);
            leader21.hexLocation = map.getHex(12, 1);
            var allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                breakFormation: true,
                leaveFormation: true,
                noAction: true
            });
        when:
            allowedActions = arbitrator.getAllowedActions(unit11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true,
                createFormation: true,
                noAction: true
            });
        when:
            unit11.hexLocation = formation11.hexLocation.fromHex;
            allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                breakFormation: true,
                joinFormation: true,
                leaveFormation: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, unit11, 0);
            allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveBack: true
            });
        when:
            unit21.hexLocation = null;
            unit11.hexLocation = unit12.hexLocation;
            unit11.takeALoss();
            unit12.takeALoss();
        when:
            allowedActions = arbitrator.getAllowedActions(unit11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true,
                mergeUnit: true,
                noAction: true
            });
    });

    it("Checks out of range defending troop allowed actions", () => {
        given:
            var {arbitrator, wing1, unit12, unit21} = create2Players4UnitsTinyGame();
            wing1.setOrderInstruction(CBOrderInstruction.DEFEND);
        when:
            unit12.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            unit21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.DEFEND,
                moveBack: true,
                escape: true,
                fireAttack: true,
                reload: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveBack: true,
                escape: true,
                fireAttack: true,
                shockAttack: true
            });
    });

    it("Checks troop with order allowed actions", () => {
        given:
            var {arbitrator, wing1, unit12, unit21} = create2Players4UnitsTinyGame();
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            unit12.receivesOrder(true);
        when:
            unit12.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            unit12.disrupt();
            unit21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                reorganize: true,
                fireAttack: true,
                reload: true,
                noAction: true
            });
        when:
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                rest: true,
                reorganize: true,
                fireAttack: true,
                reload: true
            });
        when:
            moveToEngage(unit21, unit12, 0);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveBack: true,
                escape: true,
                fireAttack: true,
                shockAttack: true
            });
    });




    it("Checks allowed actions for a formation with order", () => {
        given:
            var {arbitrator, map, wing1, formation11, unit11, unit12, unit21, unit22, leader21} = create2Players1Formation2UnitsTinyGame();
            wing1.setOrderInstruction(CBOrderInstruction.ATTACK);
            formation11.receivesOrder(true);
            unit11.receivesOrder(true);
            unit12.receivesOrder(true);
        when:
            wing1.setOrderInstruction(CBOrderInstruction.REGROUP);
            unit21.hexLocation = map.getHex(12, 1);
            unit22.hexLocation = map.getHex(12, 1);
            leader21.hexLocation = map.getHex(12, 1);
            var allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                breakFormation: true,
                leaveFormation: true,
                noAction: true
            });
        when:
            allowedActions = arbitrator.getAllowedActions(unit11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                createFormation: true,
                noAction: true
            });
        when:
            unit11.hexLocation = formation11.hexLocation.fromHex;
            allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                breakFormation: true,
                joinFormation: true,
                leaveFormation: true,
                noAction: true
            });
        when:
            moveToEngage(unit21, unit11, 0);
            allowedActions = arbitrator.getAllowedActions(formation11);
        then:
            assertActions(allowedActions,{
                moveBack: true,
                shockAttack: true,
                fireAttack: true
            });
        when:
            unit21.hexLocation = null;
            unit11.hexLocation = unit12.hexLocation;
            unit11.takeALoss();
            unit12.takeALoss();
        when:
            allowedActions = arbitrator.getAllowedActions(unit11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                mergeUnit: true,
                noAction: true
            });
    });

    it("Checks character allowed actions", () => {
        given:
            var {arbitrator, map, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = map.getHex(1, 5);
            leader11.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            leader11.disrupt();
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                reload: true,
                reorganize: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
        when:
            leader11.fixTirednessLevel(CBTiredness.TIRED);
            leader11.choseSpell(new TestSpellDefinition());
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                reload: true,
                reorganize: true,
                rest: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                castSpell: true
            });
    });

    it("Checks engaged character allowed actions", () => {
        given:
            var {arbitrator, map, leader11, unit11, unit21, leader21} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = map.getHex(5, 5);
            moveToEngage(unit21, leader11, 0);
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveBack: true,
                escape: true,
                fireAttack: true,
                shockAttack: true
            });
        when:
            unit11.hexLocation = leader11.hexLocation;
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveBack: true,
                escape: true,
                fireAttack: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
        when:
            leader21.hexLocation = unit21.hexLocation;
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveBack: true,
                escape: true,
                fireAttack: true,
                shockDuel: true,
                fireDuel: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
    });

    it("Checks character with order allowed actions", () => {
        given:
            var {arbitrator, map, wing1, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = map.getHex(1, 5);
            leader11.receivesOrder(true);
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                takeCommand: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
        when:
            wing1.setLeader(leader11);
            allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                leaveCommand: true,
                changeOrders: true,
                giveSpecificOrders: true,
                prepareSpell: true,
                noAction: true
            });
    });

    it("Checks that a troop cannot pretend to character actions", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var allowedActions = {};
            let finished = arbitrator._processCharacter(unit11, allowedActions);
        then:
            assert(finished).isFalse();
            assertActions(allowedActions,{});
    });

});