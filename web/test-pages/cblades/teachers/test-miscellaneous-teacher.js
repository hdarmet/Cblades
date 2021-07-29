'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    CBHexSideId, CBMap
} from "../../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer
} from "../../../jslib/cblades/game.js";
import {
    CBCharacter,
    CBCommandProfile,
    CBFormation,
    CBMoralProfile,
    CBMoveProfile,
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
    CBMiscellaneousTeacher
} from "../../../jslib/cblades/teachers/miscellaneous-teacher.js";

describe("Miscellaneous teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBMiscellaneousTeacher);

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
        var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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

    it("Checks if a unit is allowed to do a miscellaneous action", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToPerformMiscellaneousActions(unit11)).isTrue();
    });

    it("Checks misceallaneous actions acceptance", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.getAllowedMiscellaneousActions(unit11);
        then:
            assert(result).objectEqualsTo({
                setFire: true,
                extinguishFire: true,
                setStakes: true,
                removeStakes: true
            });
    });

    it("Checks set fire success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processSetFireResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processSetFireResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks extinguish fire success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processExtinguishFireResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processExtinguishFireResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks set stakes success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processSetStakesResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processSetStakesResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks remove stakes success checking", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processRemoveStakesResult(unit11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processRemoveStakesResult(unit11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

});