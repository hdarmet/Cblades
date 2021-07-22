'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBBlazeSpell, CBFireballSpell,
    CBFireCircleSpell,
    CBFirePentacleSpell, CBFireswordSpell,
    CBRainFireSpell, CBSpell, CBSpellDefinition, HexTargetedMixin, UnitTargetedMixin
} from "../../jslib/cblades/magic.js";
import {
    create2Players2Units2LeadersTinyGame,
    createTinyGameWithLeader
} from "./game-examples.js";
import {
    CBGame
} from "../../jslib/cblades/game.js";

describe("Magic", ()=> {

    class CBTestSpell extends CBSpell {
        constructor(wizard, level) {
            super([
                "./../images/magic/test/spellb.png",
                "./../images/magic/test/spell1.png",
                "./../images/magic/test/spell2.png",
                "./../images/magic/test/spell3.png"
            ], wizard, level);
        }

        getNextCinematic() {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }

        apply() {
            super.apply();
            this.applied = true;
        }
    }

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks spell definition", () => {
        given:
            var {leader:wizard} = createTinyGameWithLeader();
            var definition = new CBSpellDefinition("./../images/magic/test/spell2.png", CBTestSpell,2, "spell two");
        when:
            var spell = definition.createSpellCounter(wizard);
        then:
            assert(definition.path).equalsTo("./../images/magic/test/spell2.png");
            assert(definition.label).equalsTo("spell two");
            assert(spell).is(CBTestSpell);
    });

    it("Checks when a wizard chose a spell and cast it", () => {
        given:
            var {game, map, leader:wizard} = createTinyGameWithLeader();
            var definition = new CBSpellDefinition("./../images/magic/test/spell2.png", CBTestSpell,2);
        when:
            wizard.choseSpell(definition);
            var spell = wizard.chosenSpell;
        then:
            assert(spell).is(CBTestSpell);
            assert(spell.spellNature).isTrue();
            assert(spell.isOption()).isFalse();
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(spell.artifact.spell).equalsTo(spell);
            assert(spell.artifact.game).equalsTo(game);
            assert(spell.artifact.unit).equalsTo(wizard);
            assert(spell.artifact.slot).equalsTo(0);
            assert(spell.artifact.layer).equalsTo(CBGame.ULAYERS.SPELLS);
            assert(spell.getNextCinematic().cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
            assert(spell.hexLocation).equalsTo(wizard.hexLocation);
            assert(spell.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(spell.activated).isFalse();
            assert(spell.artifact.image.path).equalsTo("./../images/magic/test/spellb.png");
        when:
            Memento.open();
            spell.apply();
        then:
            assert(spell.isOption()).isFalse();
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(spell.activated).isTrue();
            assert(spell.artifact.image.path).equalsTo("./../images/magic/test/spell2.png");
        when:
            var hexId = map.getHex(2, 3);
            assert(spell.appendToMap(hexId));
        then:
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
        when:
            spell.deleteFromMap(hexId);
        then:
            assert(hexId.playables.indexOf(spell)).equalsTo(-1);
        when:
            Memento.undo();
        then:
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(spell.hexLocation).equalsTo(wizard.hexLocation);
            assert(spell.activated).isFalse();
            assert(spell.artifact.image.path).equalsTo("./../images/magic/test/spellb.png");
        when:
            spell.apply();
            assert(spell.addToMap(hexId));
        then:
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
        when:
            assert(spell.removeFromMap(hexId));
        then:
            assert(hexId.playables.indexOf(spell)).equalsTo(-1);
    });

    class CBTestHexSpell extends HexTargetedMixin(CBTestSpell) {};

    it("Checks when a wizard chose a hex targeted spell and cast it", () => {
        given:
            var {map, leader:wizard} = createTinyGameWithLeader();
            var definition = new CBSpellDefinition("./../images/magic/test/spell2.png", CBTestHexSpell,2);
            wizard.choseSpell(definition);
            var spell = wizard.chosenSpell;
        when:
            Memento.open();
            var hexId = map.getHex(2, 3);
            spell.selectHex(hexId);
        then:
            assert(spell.hex).equalsTo(hexId);
            assert(spell.activated).isFalse();
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(hexId.playables.indexOf(spell)).equalsTo(-1);
            assert(spell.isOption()).isFalse();
        when:
            Memento.open();
            spell.apply();
        then:
            assert(spell.activated).isTrue();
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
        when:
            Memento.undo();
        then:
            assert(spell.hex).equalsTo(hexId);
            assert(spell.activated).isFalse();
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(hexId.playables.indexOf(spell)).equalsTo(-1);
        when:
            Memento.undo();
        then:
            assert(spell.hex).isNotDefined();
    });

    it("Checks when a hex targeted spell is directly set on a hex", () => {
        given:
            var {map, leader:wizard} = createTinyGameWithLeader();
            var spell = new CBTestHexSpell(wizard, 2);
        when:
            var hexId = map.getHex(2, 3);
            spell.setOn(hexId);
        then:
            assert(spell.activated).isTrue();
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
        when:
            spell.discard();
        then:
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(hexId.playables.indexOf(spell)).equalsTo(-1);
    });

    class CBTestUnitSpell extends UnitTargetedMixin(CBTestSpell) {};

    it("Checks when a wizard chose a unit targeted spell and cast it", () => {
        given:
            var {map, unit, leader:wizard} = createTinyGameWithLeader();
            var definition = new CBSpellDefinition("./../images/magic/test/spell2.png", CBTestUnitSpell,2);
            wizard.choseSpell(definition);
            var spell = wizard.chosenSpell;
        when:
            Memento.open();
            spell.selectUnit(unit);
        then:
            assert(spell.unit).equalsTo(unit);
            assert(spell.activated).isFalse();
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(unit.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).equalsTo(-1);
            assert(spell.isOption()).isFalse();
        when:
            Memento.open();
            spell.apply();
        then:
            assert(spell.activated).isTrue();
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(unit.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isTrue();
        when:
            Memento.undo();
        then:
            assert(spell.unit).equalsTo(unit);
            assert(spell.activated).isFalse();
            assert(wizard.carried.indexOf(spell)).notEqualsTo(-1);
            assert(unit.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).equalsTo(-1);
            assert(spell.isOption()).isFalse();
        when:
            Memento.undo();
        then:
            assert(spell.unit).equalsTo(wizard);
    });

    it("Checks when a unit targeted spell is directly set on a unit", () => {
        given:
            var {map, unit, leader:wizard} = createTinyGameWithLeader();
            var spell = new CBTestUnitSpell(wizard, 2);
        when:
            var hexId = map.getHex(2, 3);
            spell.setOn(unit);
        then:
            assert(spell.activated).isTrue();
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(unit.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isTrue();
        when:
            spell.discard(unit);
            assert(spell.artifact.layer).equalsTo(CBGame.ULAYERS.OPTIONS);
        then:
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(unit.hexLocation.playables.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).equalsTo(-1);
    });

    function checkSpellInLaboratory(wizard, name, type, level, path) {
        var definition = CBSpell.laboratory.get(name);
        assert(definition.path).equalsTo(path);
        let spell = definition.createSpellCounter(wizard);
        assert(spell).is(type);
        assert(spell.spellLevel).equalsTo(level);
    }

    it("Checks when fire spell laboratory", () => {
        given:
            var {leader:wizard} = createTinyGameWithLeader();
        then:
            checkSpellInLaboratory(wizard, "firePentacle1", CBFirePentacleSpell, 1, "./../images/magic/fire/pentacle1.png");
            checkSpellInLaboratory(wizard, "firePentacle2", CBFirePentacleSpell, 2, "./../images/magic/fire/pentacle2.png");
            checkSpellInLaboratory(wizard, "firePentacle3", CBFirePentacleSpell, 3, "./../images/magic/fire/pentacle3.png");
            checkSpellInLaboratory(wizard, "fireCircle1", CBFireCircleSpell, 1, "./../images/magic/fire/circle1.png");
            checkSpellInLaboratory(wizard, "fireCircle2", CBFireCircleSpell, 2, "./../images/magic/fire/circle2.png");
            checkSpellInLaboratory(wizard, "fireCircle3", CBFireCircleSpell, 3, "./../images/magic/fire/circle3.png");
            checkSpellInLaboratory(wizard, "fireball1", CBFireballSpell, 1, "./../images/magic/fire/fireball1.png");
            checkSpellInLaboratory(wizard, "fireball2", CBFireballSpell, 2, "./../images/magic/fire/fireball2.png");
            checkSpellInLaboratory(wizard, "fireball3", CBFireballSpell, 3, "./../images/magic/fire/fireball3.png");
            checkSpellInLaboratory(wizard, "fireSword1", CBFireswordSpell, 1, "./../images/magic/fire/firesword1.png");
            checkSpellInLaboratory(wizard, "fireSword2", CBFireswordSpell, 2, "./../images/magic/fire/firesword2.png");
            checkSpellInLaboratory(wizard, "fireSword3", CBFireswordSpell, 3, "./../images/magic/fire/firesword3.png");
            checkSpellInLaboratory(wizard, "blaze1", CBBlazeSpell, 1, "./../images/magic/fire/blaze1.png");
            checkSpellInLaboratory(wizard, "blaze2", CBBlazeSpell, 2, "./../images/magic/fire/blaze2.png");
            checkSpellInLaboratory(wizard, "blaze3", CBBlazeSpell, 3, "./../images/magic/fire/blaze3.png");
            checkSpellInLaboratory(wizard, "rainFire1", CBRainFireSpell, 1, "./../images/magic/fire/rainfire1.png");
            checkSpellInLaboratory(wizard, "rainFire2", CBRainFireSpell, 2, "./../images/magic/fire/rainfire2.png");
            checkSpellInLaboratory(wizard, "rainFire3", CBRainFireSpell, 3, "./../images/magic/fire/rainfire3.png");
    });

    it("Checks fire pentacle spell", () => {
        given:
            var {leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBFirePentacleSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
        when:
            spell.apply();
        then:
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/pentacle1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(wizard.hexLocation.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
    });

    it("Checks fire circle spell", () => {
        given:
            var {leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireCircle1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBFireCircleSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
        when:
            spell.apply();
        then:
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/circle1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(wizard.hexLocation.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
    });

    it("Checks successful fireball spell", () => {
        given:
            var {map, unit2:foe, leader1:wizard} = create2Players2Units2LeadersTinyGame();
            wizard.hexLocation = map.getHex(5, 9);
            foe.hexLocation = map.getHex(7, 8);
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBFireballSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.SELECT_FOE);
        when:
            spell.selectUnit(foe);
            cinematic = spell.getNextCinematic();
        then:
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.CONTINUE);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(spell.unit).equalsTo(foe);
        when:
            spell.apply();
            cinematic = spell.getNextCinematic();
        then:
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.RESOLVE);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireball1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(foe.options.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isTrue();
        when:
            spell.resolve([1, 2]);
        then:
            assert(foe.options.indexOf(spell)).equalsTo(-1);
            assert(foe.remainingStepCount).equalsTo(1);
            assert(spell.isOption()).isTrue();
    });

    it("Checks failed fireball spell", () => {
        given:
            var {map, unit2:foe, leader1:wizard} = create2Players2Units2LeadersTinyGame();
            wizard.hexLocation = map.getHex(5, 9);
            foe.hexLocation = map.getHex(7, 8);
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var spell = wizard.chosenSpell;
            spell.selectUnit(foe);
            spell.apply();
            spell.resolve([5, 6]);
        then:
            assert(foe.options.indexOf(spell)).equalsTo(-1);
            assert(foe.remainingStepCount).equalsTo(2);
            assert(spell.isOption()).isTrue();
    });

    it("Checks fire sword spell", () => {
        given:
            var {unit, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireSword1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBFireswordSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.SELECT_FRIEND);
        when:
            spell.selectUnit(unit);
            cinematic = spell.getNextCinematic();
        then:
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(spell.unit).equalsTo(unit);
        when:
            spell.apply();
        then:
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/firesword1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(unit.options.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isTrue();
    });

    it("Checks blaze spell", () => {
        given:
            var {map, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("blaze1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBBlazeSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.SELECT_HEX);
        when:
            var hexId = map.getHex(5, 6);
            spell.selectHex(hexId);
            cinematic = spell.getNextCinematic();
        then:
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(spell.hex).equalsTo(hexId);
        when:
            spell.apply();
        then:
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/blaze1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
    });

    it("Checks rain fire spell", () => {
        given:
            var {map, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("rainFire1"));
            var spell = wizard.chosenSpell;
        when:
            var cinematic = spell.getNextCinematic();
        then:
            assert(spell).is(CBRainFireSpell);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.SELECT_HEX);
        when:
            var hexId = map.getHex(5, 6);
            spell.selectHex(hexId);
            cinematic = spell.getNextCinematic();
        then:
            assert(cinematic.cinematic).equalsTo(CBSpell.CINEMATIC.APPLY);
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/fireb.png");
            assert(spell.hex).equalsTo(hexId);
        when:
            spell.apply();
        then:
            assert(spell.artifact.image.path).equalsTo("./../images/magic/fire/rainfire1.png");
            assert(wizard.carried.indexOf(spell)).equalsTo(-1);
            assert(hexId.playables.indexOf(spell)).notEqualsTo(-1);
            assert(spell.isOption()).isFalse();
    });

});