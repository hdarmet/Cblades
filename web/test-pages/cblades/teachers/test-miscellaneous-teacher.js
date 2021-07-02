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
        let wing1 = new CBWing(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let wing2 = new CBWing(player2);
        var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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

    it("Checks if a unit is allowed to do a miscellaneous action", () => {
        given:
            var {arbitrator, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToPerformMiscellaneousActions(unit11)).isTrue();
    });

});