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
    CBHex,
    CBHexSideId, CBMap, CBMoveType
} from "../../jslib/cblades/map.js";
import {
    CBAction, CBGame, CBAbstractPlayer, CBCounter
} from "../../jslib/cblades/game.js";
import {
    CBCharacter,
    CBCohesion, CBCommandProfile,
    CBFormation,
    CBLackOfMunitions, CBMoralProfile,
    CBMovement, CBMoveProfile,
    CBTiredness,
    CBTroop,
    CBUnitType, CBWeaponProfile,
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
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
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

});