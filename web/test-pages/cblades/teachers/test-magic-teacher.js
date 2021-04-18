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

describe("Magic teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBWizardryTeacher);

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
        let map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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

    it("Checks if a unit may chose or cast a spell", () => {
        given:
            var {arbitrator, leader11, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.isAllowedToChoseSpell(unit11)).isFalse();
        assert(arbitrator.isAllowedToChoseSpell(leader11)).isTrue();
        assert(arbitrator.isAllowedToCastSpell(unit11)).isFalse();
        assert(arbitrator.isAllowedToCastSpell(leader11)).isFalse();
        when:
            leader11.choseSpell(new TestSpellDefinition());
        then:
            assert(arbitrator.isAllowedToCastSpell(leader11)).isTrue();
    });

    it("Checks the spells a wizard may cast", () => {
        given:
            var {arbitrator, leader11, unit11} = create2Players4UnitsTinyGame();
        then:
            assert(arbitrator.getAllowedSpells(leader11)).arrayEqualsTo([
                    "firePentacle1", "firePentacle2", "firePentacle3",
                    "fireCircle1", "fireCircle2", "fireCircle3",
                    "fireball1", "fireball2", "fireball3",
                    "fireSword1", "fireSword2", "fireSword3",
                    "blaze1", "blaze2", "blaze3",
                    "rainFire1", "rainFire2", "rainFire3"
                ]
            );
    });

    it("Checks cast spell processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        when:
            var result = arbitrator.processCastSpellResult(leader11, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.processCastSpellResult(leader11, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

    it("Checks foes that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11, unit21, unit22, unit11} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
        unit21.move(map.getHex(5, 3));
        unit11.move(map.getHex(7, 3));
        unit22.move(map.getHex(8, 3));
        var units = arbitrator.getFoesThatMayBeTargetedBySpell(leader11);
        then:
            assert(new Set(units)).setEqualsTo(new Set([unit21]));
    });

    it("Checks friends that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11, unit11, unit12, unit21} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
        unit11.move(map.getHex(5, 3));
        unit21.move(map.getHex(7, 3));
        unit12.move(map.getHex(8, 3));
        var units = arbitrator.getFriendsThatMayBeTargetedBySpell(leader11);
        then:
            assert(new Set(units)).setEqualsTo(new Set([leader11, unit11]));
    });

    it("Checks hexes that may be targeted by a spell", () => {
        given:
            var {arbitrator, map, leader11} = create2Players4UnitsTinyGame();
        when:
            leader11.move(map.getHex(1, 3));
        var hexes = arbitrator.getHexesThatMayBeTargetedBySpell(leader11);
        then:
            assert(hexes.length).equalsTo(127);
        let hexesSet = new Set(hexes);
        assert(hexesSet.has(map.getHex(7, 3))).isTrue();
        assert(hexesSet.has(map.getHex(8, 3))).isFalse();
    });

    it("Checks fireball processing", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
        var spellLevel = 1;
        when:
            var result = arbitrator.resolveFireball(spellLevel, [1, 2]);
        then:
            assert(result.success).isTrue();
        when:
            result = arbitrator.resolveFireball(spellLevel, [5, 6]);
        then:
            assert(result.success).isFalse();
    });

});