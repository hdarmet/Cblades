'use strict'

import {
    WHexCounter, WHexCounterArtifact, WLevelBuilder, RetractableArtifactMixin, RetractablePieceMixin
} from "../wargame/playable.js";
import {
    Dimension2D
} from "../board/geometry.js";
import {
    Memento
} from "../board/mechanisms.js";
import {
    CarriableMixin, getUnitFromContext,
    OptionArtifactMixin,
    OptionMixin
} from "../wargame/wunit.js";

class SpellImageArtifact extends OptionArtifactMixin(WHexCounterArtifact) {

    get spell() {
        return this.piece;
    }

/*
    get game() {
        return this.spell.game;
    }
*/

    get unit() {
        return this.spell.unit;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return this.piece.optionNature ? WLevelBuilder.ULAYERS.OPTIONS : WLevelBuilder.ULAYERS.SPELLS;
    }

}

export class CBSpell extends CarriableMixin(RetractablePieceMixin(WHexCounter)) {

    constructor(paths, wizard, spellLevel) {
        super("units", wizard.game, paths, CBSpell.DIMENSION);
        this._spellLevel = spellLevel;
        this._wizard = wizard;
    }

    createArtifact(levelName, images, position, dimension) {
        return new SpellImageArtifact(this, levelName, images, position, dimension);
    }

    _memento() {
        let memento = super._memento();
        memento.activated = this._activated;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._activated = memento.activated;
    }

    _getUnit() {
        return this.wizard;
    }

    get spellLevel() {
        return this._spellLevel;
    }

    get spellNature() {
        return true;
    }

    get unit() {
        return this._getUnit();
    }

    get wizard() {
        return this._wizard;
    }

    get game() {
        return this.wizard.game;
    }

    get optionNature() {
        return false;
    }

    _addPlayable(hexLocation, stacking) {
        if (this.activated) {
            super._addPlayable(hexLocation, stacking);
        }
    }

    _removePlayable(hexLocation) {
        if (this.activated) {
            super._removePlayable(hexLocation);
        }
    }

    _appendPlayable(hexLocation, stacking) {
        if (this.activated) {
            super._appendPlayable(hexLocation, stacking);
        }
    }

    _deletePlayable(hexLocation) {
        if (this.activated) {
            super._deletePlayable(hexLocation);
        }
    }

    _activate() {
        Memento.register(this);
        this.artifact.changeImage(this._spellLevel);
        this._activated = true;
    }

    get activated() {
        return this._activated;
    }

    apply() {
        Memento.register(this);
        this._wizard.forgetSpell();
        this._activate();
    }

    isFinishable() {
        return true;
    }

}
CBSpell.DIMENSION = new Dimension2D(142, 142);
CBSpell.CINEMATIC = {
    APPLY: 0,
    CONTINUE: 1,
    SELECT_FRIEND:2,
    SELECT_FOE:3,
    SELECT_HEX:4,
    RESOLVE:5
}

export class CBSpellDefinition {

    constructor(path, builder, spellLevel, label) {
        this._path = path;
        this._builder = builder;
        this._spellLevel = spellLevel;
        this._label = label;
    }

    get path() {
        return this._path;
    }

    get label() {
        return this._label;
    }

    createSpellCounter(unit) {
        let builder = this._builder;
        return new builder(unit, this._spellLevel);
    }

}

export function HexTargetedMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
        }

        get hex() {
            return this._hex;
        }

        _memento() {
            let memento = super._memento();
            memento.hex = this._hex;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.hex) {
                this._hex = memento.hex;
            }
            else delete this._hex;
        }

        selectHex(hex) {
            Memento.register(this);
            this._hex = hex;
        }

        apply() {
            super.apply();
            this.appendToMap(this.hex);
            this._rotate(0);
        }

        _activate() {
            super._activate();
            this.artifact.changeLevel("ground");
        }

        setOn(hex) {
            this._hex = hex;
            this._activated = true;
            this.artifact.setLevel("ground");
            this.artifact.changeImage(this._spellLevel);
            this.addToMap(this.hex);
            this._angle = 0;
        }

        discard() {
            this.removeFromMap();
            delete this._hex;
        }

    }
}

export function UnitTargetedMixin(clazz) {

    return class extends OptionMixin(clazz) {

        constructor(...args) {
            super(...args);
        }

        _getUnit() {
            if (this._unit) return this._unit;
            else return super._getUnit();
        }

        _memento() {
            let memento = super._memento();
            memento.unit = this._unit;
            return memento;
        }

        get optionNature() {
            return this.activated;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.unit) {
                this._unit = memento.unit;
            }
            else delete this._unit;
        }

        _addPlayable(hexLocation, stacking) {
        }

        _removePlayable(hexLocation) {
        }

        _appendPlayable(hexLocation, stacking) {
        }

        _deletePlayable(hexLocation) {
        }

        selectUnit(unit) {
            Memento.register(this);
            this._unit = unit;
        }

        apply() {
            super.apply();
            this._unit.appendOption(this);
        }

        setOn(unit) {
            this._unit = unit;
            this._activated = true;
            this._unit.addOption(this);
            this.artifact.changeImage(this._spellLevel);
        }

        discard(unit) {
            this._unit.removeOption(this);
            delete this._unit;
        }

    }

}

export class CBArcanePentacleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/pentacle1.png",
            "./../images/magic/arcane/pentacle2.png",
            "./../images/magic/arcane/pentacle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

    toSpecs() {
        return {
            type: "arcane-pentacle",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBArcanePentacleSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("arcane-pentacle", CBArcanePentacleSpell);

export class CBArcaneCircleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/circle1.png",
            "./../images/magic/arcane/circle2.png",
            "./../images/magic/arcane/circle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

    toSpecs() {
        return {
            type: "arcane-circle",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBArcaneCircleSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("arcane-circle", CBArcaneCircleSpell);

export class CBMagicArrowSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/missile1.png",
            "./../images/magic/arcane/missile2.png",
            "./../images/magic/arcane/missile3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FOE};
        }
        else if (!this._applied) {
            return {cinematic: CBSpell.CINEMATIC.CONTINUE};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.RESOLVE, resolver:CBMagicArrowSpell.resolver};
        }
    }

    apply() {
        super.apply();
        this._applied = true;
    }

    resolve(diceResult) {
        this._result = this.game.arbitrator.resolveMagicArrow(this, diceResult);
        if (this._result.losses) {
            this.unit.takeALoss();
        }
        this.unit.deleteOption(this);
        return this._result;
    }

    toSpecs() {
        return {
            type: "magic-arrow",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBMagicArrowSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("magic-arrow", CBMagicArrowSpell);

export class CBArcaneSwordSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/sword1.png",
            "./../images/magic/arcane/sword2.png",
            "./../images/magic/arcane/sword3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FRIEND};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "arcane-sword",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBArcaneSwordSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }
}
WHexCounter.registerTokenType("arcane-sword", CBArcaneSwordSpell);

export class CBArcaneShieldSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/shield1.png",
            "./../images/magic/arcane/shield2.png",
            "./../images/magic/arcane/shield3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FRIEND};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "arcane-shield",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBArcaneShieldSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("arcane-shield", CBArcaneShieldSpell);

export class CBProtectionFromMagicSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/arcane/arcaneb.png",
            "./../images/magic/arcane/protection1.png",
            "./../images/magic/arcane/protection2.png",
            "./../images/magic/arcane/protection3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._hex) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_HEX};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "protection-magic",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBProtectionFromMagicSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("protection-magic", CBProtectionFromMagicSpell);

export class CBFirePentacleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/pentacle1.png",
            "./../images/magic/fire/pentacle2.png",
            "./../images/magic/fire/pentacle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

    toSpecs() {
        return {
            type: "fire-pentacle",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBFirePentacleSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("fire-pentacle", CBFirePentacleSpell);

export class CBFireCircleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/circle1.png",
            "./../images/magic/fire/circle2.png",
            "./../images/magic/fire/circle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

    toSpecs() {
        return {
            type: "fire-circle",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBFireCircleSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("fire-circle", CBFireCircleSpell);

export class CBFireballSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/fireball1.png",
            "./../images/magic/fire/fireball2.png",
            "./../images/magic/fire/fireball3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FOE};
        }
        else if (!this._applied) {
            return {cinematic: CBSpell.CINEMATIC.CONTINUE};
         }
        else {
            return {cinematic: CBSpell.CINEMATIC.RESOLVE, resolver:CBFireballSpell.resolver};
        }
    }

    apply() {
        super.apply();
        this._applied = true;
    }

    resolve(diceResult) {
        this._result = this.game.arbitrator.resolveFireball(this, diceResult);
        if (this._result.losses) {
            this.unit.takeALoss();
        }
        this.unit.deleteOption(this);
        return this._result;
    }

    toSpecs() {
        return {
            type: "fire-ball",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBFireballSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("fire-ball", CBFireballSpell);

export class CBFireswordSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/firesword1.png",
            "./../images/magic/fire/firesword2.png",
            "./../images/magic/fire/firesword3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FRIEND};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "fire-sword",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBFireswordSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("fire-sword", CBFireswordSpell);

export class CBBlazeSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/blaze1.png",
            "./../images/magic/fire/blaze2.png",
            "./../images/magic/fire/blaze3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._hex) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_HEX};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "blaze",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBBlazeSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("blaze", CBBlazeSpell);

export class CBRainFireSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "./../images/magic/fire/fireb.png",
            "./../images/magic/fire/rainfire1.png",
            "./../images/magic/fire/rainfire2.png",
            "./../images/magic/fire/rainfire3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        if (!this._hex) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_HEX};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.APPLY};
        }
    }

    toSpecs() {
        return {
            type: "rain-fire",
            level: this.spellLevel,
            wizard: this.wizard.name
        }
    }

    static fromSpecs(specs, context) {
        return new CBRainFireSpell(getUnitFromContext(context, specs.wizard), specs.level);
    }

}
WHexCounter.registerTokenType("rain-fire", CBRainFireSpell);

CBSpell.laboratory = new Map([
    ["arcanePentacle1",
        new CBSpellDefinition("./../images/magic/arcane/pentacle1.png", CBArcanePentacleSpell,1,
            "Pentacle niveau 1")
    ],
    ["arcanePentacle2",
        new CBSpellDefinition("./../images/magic/arcane/pentacle2.png", CBArcanePentacleSpell,2,
            "Pentacle niveau 2")
    ],
    ["arcanePentacle3",
        new CBSpellDefinition("./../images/magic/arcane/pentacle3.png", CBArcanePentacleSpell,3,
            "Pentacle niveau 3")
    ],
    ["arcaneCircle1",
        new CBSpellDefinition("./../images/magic/arcane/circle1.png", CBArcaneCircleSpell,1,
            "Cercle arcanqiue niveau 1")
    ],
    ["arcaneCircle2",
        new CBSpellDefinition("./../images/magic/arcane/circle2.png", CBArcaneCircleSpell,2,
            "Cercle arcanique niveau 2")
    ],
    ["arcaneCircle3",
        new CBSpellDefinition("./../images/magic/arcane/circle3.png", CBArcaneCircleSpell,3,
            "Cercle arcanique niveau 3")
    ],
    ["magicArrow1",
        new CBSpellDefinition("./../images/magic/arcane/missile1.png", CBMagicArrowSpell,1,
            "Projectile magique niveau 1")
    ],
    ["magicArrow2",
        new CBSpellDefinition("./../images/magic/arcane/missile2.png", CBMagicArrowSpell,2,
            "Projectile magique niveau 2")
    ],
    ["magicArrow3",
        new CBSpellDefinition("./../images/magic/arcane/missile3.png", CBMagicArrowSpell,3,
            "Projectile magique niveau 3")
    ],
    ["arcaneSword1",
        new CBSpellDefinition("./../images/magic/arcane/sword1.png", CBArcaneSwordSpell,1,
            "Epées arcaniques niveau 1")
    ],
    ["arcaneSword2",
        new CBSpellDefinition("./../images/magic/arcane/sword2.png", CBArcaneSwordSpell,2,
            "Epées arcaniques niveau 2")
    ],
    ["arcaneSword3",
        new CBSpellDefinition("./../images/magic/arcane/sword3.png", CBArcaneSwordSpell,3,
            "Epées arcaniques niveau 3")
    ],
    ["arcaneShield1",
        new CBSpellDefinition("./../images/magic/arcane/shield1.png", CBArcaneShieldSpell,1,
            "Boucliers arcaniques niveau 1")
    ],
    ["arcaneShield2",
        new CBSpellDefinition("./../images/magic/arcane/shield2.png", CBArcaneShieldSpell,2,
            "Boucliers arcaniques niveau 2")
    ],
    ["arcaneShield3",
        new CBSpellDefinition("./../images/magic/arcane/shield3.png", CBArcaneShieldSpell,3,
            "Boucliers arcaniques niveau 3")
    ],
    ["protectionFromMagic1",
        new CBSpellDefinition("./../images/magic/arcane/protection1.png", CBProtectionFromMagicSpell,1,
            "Protection contre la magie niveau 1")
    ],
    ["protectionFromMagic2",
        new CBSpellDefinition("./../images/magic/arcane/protection2.png", CBProtectionFromMagicSpell,2,
            "Protection contre la magie niveau 2")
    ],
    ["protectionFromMagic3",
        new CBSpellDefinition("./../images/magic/arcane/protection3.png", CBProtectionFromMagicSpell,3,
            "Protection contre la magie niveau 3")
    ],

    ["firePentacle1",
        new CBSpellDefinition("./../images/magic/fire/pentacle1.png", CBFirePentacleSpell,1,
        "Pentacle niveau 1")
    ],
    ["firePentacle2",
        new CBSpellDefinition("./../images/magic/fire/pentacle2.png", CBFirePentacleSpell,2,
        "Pentacle niveau 2")
    ],
    ["firePentacle3",
        new CBSpellDefinition("./../images/magic/fire/pentacle3.png", CBFirePentacleSpell,3,
        "Pentacle niveau 1")
    ],
    ["fireCircle1",
        new CBSpellDefinition("./../images/magic/fire/circle1.png", CBFireCircleSpell,1,
        "Cercle de feu niveau 1")
    ],
    ["fireCircle2",
        new CBSpellDefinition("./../images/magic/fire/circle2.png", CBFireCircleSpell,2,
        "Cercle de feu niveau 2")
    ],
    ["fireCircle3",
        new CBSpellDefinition("./../images/magic/fire/circle3.png", CBFireCircleSpell,3,
        "Cercle de feu niveau 3")
    ],
    ["fireball1",
        new CBSpellDefinition("./../images/magic/fire/fireball1.png", CBFireballSpell,1,
        "Boule de feu niveau 1")
    ],
    ["fireball2",
        new CBSpellDefinition("./../images/magic/fire/fireball2.png", CBFireballSpell,2,
        "Boule de feu niveau 2")
    ],
    ["fireball3",
        new CBSpellDefinition("./../images/magic/fire/fireball3.png", CBFireballSpell,3,
        "Boule de feu niveau 3")
    ],
    ["fireSword1",
        new CBSpellDefinition("./../images/magic/fire/firesword1.png", CBFireswordSpell,1,
        "Epées enflammées niveau 1")
    ],
    ["fireSword2",
        new CBSpellDefinition("./../images/magic/fire/firesword2.png", CBFireswordSpell,2,
        "Epées enflammées niveau 2")
    ],
    ["fireSword3",
        new CBSpellDefinition("./../images/magic/fire/firesword3.png", CBFireswordSpell,3,
        "Epées enflammées niveau 3")
    ],
    ["blaze1",
        new CBSpellDefinition("./../images/magic/fire/blaze1.png", CBBlazeSpell,1,
        "Brasier niveau 1")
    ],
    ["blaze2",
        new CBSpellDefinition("./../images/magic/fire/blaze2.png", CBBlazeSpell,2,
        "Brasier niveau 2")
    ],
    ["blaze3",
        new CBSpellDefinition("./../images/magic/fire/blaze3.png", CBBlazeSpell,3,
        "Brasier niveau 3")
    ],
    ["rainFire1",
        new CBSpellDefinition("./../images/magic/fire/rainfire1.png", CBRainFireSpell,1,
        "Pluie de feu niveau 1")
    ],
    ["rainFire2",
        new CBSpellDefinition("./../images/magic/fire/rainfire2.png", CBRainFireSpell,2,
        "Pluie de feu niveau 2")
    ],
    ["rainFire3",
        new CBSpellDefinition("./../images/magic/fire/rainfire3.png", CBRainFireSpell,3,
        "Pluie de feu niveau 3")
    ]
]);
