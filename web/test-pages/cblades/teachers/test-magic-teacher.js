'use strict'

import {
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    WMap
} from "../../../jslib/wargame/map.js";
import {
    WPiece
} from "../../../jslib/wargame/game.js";
import {
    WGame
} from "../../../jslib/wargame/playable.js";
import {
    CBUnitPlayer,
    CBCharacter, CBCommandProfile, CBMagicProfile,
    CBMoralProfile,
    CBMoveProfile,
    CBTroop,
    CBWeaponProfile,
    CBWing, CBTroopType, CBCharacterType
} from "../../../jslib/cblades/unit.js";
import {
    CBMapTeacher
} from "../../../jslib/cblades/teachers/map-teacher.js";
import {
    setDrawPlatform
} from "../../../jslib/board/draw.js";
import {
    loadAllImages,
    mergeClasses,
    mockPlatform
} from "../../board/mocks.js";
import {
    CBUnitManagementTeacher
} from "../../../jslib/cblades/teachers/units-teacher.js";
import {
    CBWizardryTeacher
} from "../../../jslib/cblades/teachers/magic-teacher.js";
import {
    Dimension2D
} from "../../../jslib/board/geometry.js";
import {
    banner1, banner2
} from "../game-examples.js";

describe("Magic teacher", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
    });

    let Arbitrator = mergeClasses(CBMapTeacher, CBUnitManagementTeacher, CBWizardryTeacher);

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

    class CBTestLeaderType extends CBCharacterType {
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

    class CBTestFireWizardType extends CBCharacterType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new CBWeaponProfile());
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
                this.setMagicProfile(index, new CBMagicProfile("fire"));
            }
        }
    }

    class CBTestArcaneWizardType extends CBCharacterType {
        constructor(name, troopPaths, formationPaths=[]) {
            super(name, troopPaths, formationPaths);
            for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
                this.setMoveProfile(index, new CBMoveProfile());
                this.setWeaponProfile(index, new CBWeaponProfile());
                this.setCommandProfile(index, new CBCommandProfile());
                this.setMoralProfile(index, new CBMoralProfile());
                this.setMagicProfile(index, new CBMagicProfile("arcane"));
            }
        }
    }

    function create2Players4UnitsTinyGame() {
        let game = new WGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, banner1);
        let player2 = new CBUnitPlayer("player2", "/players/player2.png");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, banner2);
        let map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let unitType1 = new CBTestUnitType("unit1", ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"])
        let unit11 = new CBTroop(game, unitType1, wing1);
        unit11.addToMap(map.getHex(5, 8));
        let unit12 = new CBTroop(game, unitType1, wing1);
        unit12.addToMap(map.getHex(5, 7));
        let leaderType1 = new CBTestFireWizardType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader11 = new CBCharacter(game, leaderType1, wing1);
        leader11.addToMap(map.getHex(6, 7));
        let unitType2 = new CBTestUnitType("unit2", ["./../images/units/misc/unit2.png", "./../images/units/misc/unit1b.png"])
        let unit21 = new CBTroop(game, unitType2, wing2);
        unit21.addToMap(map.getHex(7, 8));
        let unit22 = new CBTroop(game, unitType2, wing2);
        unit22.addToMap(map.getHex(7, 7));
        let leaderType2 = new CBTestLeaderType("leader2", ["./../images/units/misc/leader2.png", "./../images/units/misc/leader2b.png"])
        let leader21 = new CBCharacter(game, leaderType2, wing2);
        leader21.addToMap(map.getHex(8, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wing2, unit11, unit12, leader11, player2, unit21, unit22, leader21};
    }

    function createNotAWizardTinyGame() {
        let game = new WGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, banner1);
        let map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let leaderType1 = new CBTestLeaderType("leader1", ["./../images/units/misc/leader1.png", "./../images/units/misc/leader1b.png"])
        let leader1 = new CBCharacter(game, leaderType1, wing1);
        leader1.addToMap(map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, leader1};
    }

    function createArcaneWizardTinyGame() {
        let game = new WGame(1);
        let arbitrator = new Arbitrator();
        game.setArbitrator(arbitrator);
        let player1 = new CBUnitPlayer("player1", "/players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, banner1);
        let map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        let leaderType1 = new CBTestArcaneWizardType("wizard1", ["./../images/units/misc/wizard1.png", "./../images/units/misc/wizard1b.png"])
        let wizard1 = new CBCharacter(game, leaderType1, wing1);
        wizard1.addToMap(map.getHex(6, 7));
        game.start();
        loadAllImages();
        return {game, arbitrator, map, player1, wing1, wizard1};
    }

    class TestSpell extends WPiece {
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

    it("Checks the spells a fire wizard may cast", () => {
        given:
            var {arbitrator, leader11} = create2Players4UnitsTinyGame();
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

    it("Checks the spells an arcane wizard may cast", () => {
        given:
            var {arbitrator, wizard1} = createArcaneWizardTinyGame();
        then:
            assert(arbitrator.getAllowedSpells(wizard1)).arrayEqualsTo([
                    "arcanePentacle1", "arcanePentacle2", "arcanePentacle3",
                    "arcaneCircle1", "arcaneCircle2", "arcaneCircle3",
                    "magicArrow1", "magicArrow2", "magicArrow3",
                    "arcaneSword1", "arcaneSword2", "arcaneSword3",
                    "arcaneShield1", "arcaneShield2", "arcaneShield3",
                    "protectionFromMagic1", "protectionFromMagic2", "protectionFromMagic3"
                ]
            );
    });

    it("Checks that a character who is not a wizard cannot cast a spell", () => {
        given:
            var {arbitrator, leader1} = createNotAWizardTinyGame();
        then:
            assert(arbitrator.getAllowedSpells(leader1)).isNotDefined();
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