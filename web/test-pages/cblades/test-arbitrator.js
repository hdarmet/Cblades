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
    CBMap, CBMoveMode
} from "../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer
} from "../../jslib/cblades/game.js";
import {
    CBCharacter, CBCharge, CBCommandProfile, CBLackOfMunitions, CBMoralProfile,
    CBMoveProfile, CBOrderInstruction,
    CBTiredness,
    CBTroop,
    CBUnitType, CBWeaponProfile,
    CBWing
} from "../../jslib/cblades/unit.js";
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
            var {arbitrator, wing1, unit12, unit21, unit22} = create2Players4UnitsTinyGame();
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

    it("Checks out of range defending troop allowed actions", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions, {
                moveForward: true,
                moveMode: CBMoveMode.DEFEND,
                moveBack: true,
                escape: true,
                noAction: true
            });
    });

    it("Checks allowed actions for a troop belonging to a reorganizing wing and far from enemy units", () => {
        given:
            var {arbitrator, wing1, unit12} = createTinyGame();
        when:
            wing1.setOrderInstruction(CBOrderInstruction.REGROUP);
            var allowedActions = arbitrator.getAllowedActions(unit12);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveMode: CBMoveMode.REGROUP,
                moveBack: true,
                escape: true,
                noAction: true
            });
        when:
            unit12.disrupt();
            unit12.fixTirednessLevel(CBTiredness.TIRED);
            unit12.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE)
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

    it("Checks character allowed actions", () => {
        given:
            var {arbitrator, map, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.hexLocation = map.getHex(1, 5);
            var allowedActions = arbitrator.getAllowedActions(leader11);
        then:
            assertActions(allowedActions,{
                moveForward: true,
                moveBack: true,
                escape: true,
                moveMode: CBMoveMode.NO_CONSTRAINT,
                noAction: true,
                prepareSpell: true
            });
    });

});