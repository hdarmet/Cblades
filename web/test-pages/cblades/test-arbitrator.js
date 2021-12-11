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
    CBHexSideId, CBMap
} from "../../jslib/cblades/map.js";
import {
    CBPiece
} from "../../jslib/cblades/game.js";
import {
    CBGame, CBMoveMode
} from "../../jslib/cblades/playable.js";
import {
    CBCharacter, CBCharge, CBCommandProfile, CBFormation, CBMunitions, CBMagicProfile, CBMoralProfile,
    CBMoveProfile, CBOrderInstruction,
    CBTiredness,
    CBTroop,
    CBWeaponProfile,
    CBWing, CBTroopType, CBCharacterType, CBUnitPlayer
} from "../../jslib/cblades/unit.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    Dimension2D, invertAngle
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

    class CBTestUnitType extends CBTroopType {
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

    class CBTestLeaderType extends CBCharacterType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new FireWeaponProfile());
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
                this.setMagicProfile(index, new CBMagicProfile("fire"));
            }
        }
    }

    function createTinyGame() {
        let game = new CBGame("Test");
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        wing1.setRetreatZone(map.getWestZone());
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(unitType1, wing1);
        unit11.addToMap(map.getHex(5, 8));
        let unit12 = new CBTroop(unitType1, wing1);
        unit12.addToMap(map.getHex(5, 7));
        let leaderType1 = new CBTestLeaderType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, unit11, unit12, leader11};
    }

    function create2Players4UnitsTinyGame() {
        let {game, arbitrator, map, player1, wing1, unit11, unit12, leader11} = createTinyGame();
        let player2 = new CBUnitPlayer("player2");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        //wing2.setRetreatZone(map.getEastZone());
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    function createTinyFormationGame() {
        let game = new CBGame("Test");
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let arbitrator = new CBArbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, "./../units/banner1.png");
        wing1.setRetreatZone(map.getWestZone());
        let unitType1 = new CBTestUnitType("unit1",
            ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"],
            [
                "./../images/units/misc/unit1L3.png", "./../images/units/misc/unit1L3b.png",
                "./../images/units/misc/unit1L2.png", "./../images/units/misc/unit1L2b.png",
                "./../images/units/misc/unit1L1.png", "./../images/units/misc/unit1L1b.png"
            ])
        let formation11 = new CBFormation(unitType1, wing1);
        formation11.addToMap(new CBHexSideId(map.getHex(5, 8), map.getHex(6, 8)));
        formation11.angle = 30;
        let unit11 = new CBTroop(unitType1, wing1);
        unit11.addToMap(map.getHex(5, 10));
        unit11.angle = 30;
        let unit12 = new CBTroop(unitType1, wing1);
        unit12.addToMap(map.getHex(6, 10));
        unit12.angle = 30;
        let leaderType1 = new CBTestUnitType("leader1", [
            "./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, formation11, unit11, unit12, leader11};
    }

    function create2Players1Formation2UnitsTinyGame() {
        let {game, arbitrator, map, player1, wing1, formation11, unit11, unit12, leader11} = createTinyFormationGame();
        let player2 = new CBUnitPlayer("player2");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, "./../units/banner2.png");
        //wing2.setRetreatZone(map.getEastZone());
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestUnitType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, formation11, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    class TestSpell extends CBPiece {
        constructor(wizard) {
            super("units", ["./../images/magic/red/redspell.png"], new Dimension2D(142, 142));
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
        engaging.angle = invertAngle(angle);
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
            unit12.setCharging(CBCharge.CHARGING);
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
                miscActions: true,
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
            leader11.setCharging(CBCharge.CHARGING);
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                miscActions: true,
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
            unit12.setTiredness(CBTiredness.EXHAUSTED);
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
                miscActions: true,
                fireAttack: true,
                noAction: true
            });
        when:
            unit12.disrupt();
            unit12.setTiredness(CBTiredness.TIRED);
            unit12.setMunitions(CBMunitions.SCARCE);
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
                mergeUnit: true,
                noAction: true
            });
    });

    it("Checks out of range defending troop allowed actions", () => {
        given:
            var {arbitrator, wing1, unit12, unit21} = create2Players4UnitsTinyGame();
            wing1.setOrderInstruction(CBOrderInstruction.DEFEND);
        when:
            unit12.setMunitions(CBMunitions.SCARCE);
            unit21.hexLocation = unit12.hexLocation.getNearHex(0).getNearHex(0);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.DEFEND,
                moveBack: true,
                escape: true,
                fireAttack: true,
                miscActions: true,
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
            unit12.setMunitions(CBMunitions.SCARCE);
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
                miscActions: true,
                reload: true,
                noAction: true
            });
        when:
            unit12.setTiredness(CBTiredness.TIRED);
            allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                moveBack: true,
                escape: true,
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
                mergeUnit: true,
                noAction: true
            });
    });

    it("Checks character allowed actions", () => {
        given:
            var {arbitrator, map, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = map.getHex(1, 5);
            leader11.setMunitions(CBMunitions.SCARCE);
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
                miscActions: true,
                prepareSpell: true,
                noAction: true
            });
        when:
            leader11.setTiredness(CBTiredness.TIRED);
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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
                miscActions: true,
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