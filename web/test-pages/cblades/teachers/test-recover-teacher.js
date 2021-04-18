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
    CBRecoveringTeacher
} from "../../../jslib/cblades/teachers/recover-teacher.js";
import {
    CBWizardryTeacher
} from "../../../jslib/cblades/teachers/magic-teacher.js";
import {
    Dimension2D, reverseAngle
} from "../../../jslib/geometry.js";

describe("Recover teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBRecoveringTeacher);

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

    it("Checks if a replenish ammunition action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToReplenishMunitions(unit12)).isFalse();
        when:
            unit12.addOneLackOfMunitionsLevel();
        then:
            assert(arbitrator.isAllowedToReplenishMunitions(unit12)).isTrue();
    });

    it("Checks if a reorganize action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToReorganize(unit12)).isFalse();
        when:
            unit12.disrupt();
        then:
            assert(arbitrator.isAllowedToReorganize(unit12)).isTrue();
        when:
            unit12.rout();
        then:
            assert(arbitrator.isAllowedToReorganize(unit12)).isFalse();
    });

    it("Checks if a rally action is allowed", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToRally(unit12)).isFalse();
        when:
            unit12.disrupt();
        then:
            assert(arbitrator.isAllowedToRally(unit12)).isFalse();
        when:
            unit12.rout();
        then:
            assert(arbitrator.isAllowedToRally(unit12)).isTrue();
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

    it("Checks replenish munitions result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processReplenishMunitionsResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks reorganize result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processReorganizeResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks rally result processing", () => {
        given:
            var {arbitrator, unit12} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processRallyResult(unit12, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processReplenishMunitionsResult(unit12, [5, 6]);
        then:
            assert(result.success).isFalse();
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