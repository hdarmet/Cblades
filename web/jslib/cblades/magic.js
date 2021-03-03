'use strict'

import {
    CBPlayable, CBCounterImageArtifact, RetractableMixin
} from "./game.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CarriableMixin,
    OptionArtifactMixin,
    OptionMixin
} from "./unit.js";

class SpellImageArtifact extends OptionArtifactMixin(RetractableMixin(CBCounterImageArtifact)) {

    constructor(spell, ...args) {
        super(spell, ...args);
    }

    get spell() {
        return this._counter;
    }

    get game() {
        return this.spell.game;
    }

    get unit() {
        return this.spell.unit;
    }

}

export class CBSpell extends CarriableMixin(CBPlayable) {

    constructor(paths, wizard, spellLevel) {
        super("units", paths, CBSpell.DIMENSION);
        this._spellLevel = spellLevel;
        this._wizard = wizard;
    }

    createArtifact(levelName, images, location, dimension) {
        return new SpellImageArtifact(this, levelName, images, location, dimension);
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

    isOption() {
        return false;
    }

    _addPlayable(hexLocation) {
        if (this.activated) {
            super._addPlayable(hexLocation);
        }
    }

    _removePlayable(hexLocation) {
        if (this.activated) {
            super._removePlayable(hexLocation);
        }
    }

    _appendPlayable(hexLocation) {
        if (this.activated) {
            super._appendPlayable(hexLocation);
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

    constructor(path, builder, spellLevel) {
        this._path = path;
        this._builder = builder;
        this._spellLevel = spellLevel;
    }

    get path() {
        return this._path;
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
            //delete this._unit;
        }

        apply() {
            super.apply();
            this.appendToMap(this.hex);
            this._rotate(0);
        }

        _activate() {
            super._activate();
            this.artifact.changeLevel("terran");
        }

        setOn(hex) {
            this._hex = hex;
            this._activated = true;
            this.artifact.setLevel("terran");
            this.artifact.changeImage(this._spellLevel);
            this.addToMap(this.hex);
            this._angle = 0;
        }

        discard() {
            this.removeFromMap(this.hex);
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

        isOption() {
            return this.activated;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.unit) {
                this._unit = memento.unit;
            }
            else delete this._unit;
        }

        _addPlayable(hexLocation) {
        }

        _removePlayable(hexLocation) {
        }

        _appendPlayable(hexLocation) {
        }

        _deletePlayable(hexLocation) {
        }

        selectHex(hex) {
            Memento.register(this);
            this._unit = hex.units[0];
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

export class CBFirePentacleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/pentacle1.png",
            "/CBlades/images/magic/fire/pentacle2.png",
            "/CBlades/images/magic/fire/pentacle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

}

export class CBFireCircleSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/circle1.png",
            "/CBlades/images/magic/fire/circle2.png",
            "/CBlades/images/magic/fire/circle3.png"
        ], wizard, level);
    }

    getNextCinematic() {
        return {cinematic: CBSpell.CINEMATIC.APPLY};
    }

    apply() {
        this.selectHex(this._wizard.hexLocation);
        super.apply();
    }

}

export class CBFireballSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/fireball1.png",
            "/CBlades/images/magic/fire/fireball2.png",
            "/CBlades/images/magic/fire/fireball3.png"
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
        if (this._result.losses) this.unit.takeALoss();
        this.unit.deleteOption(this);
        return this._result;
    }

}

export class CBFireswordSpell extends UnitTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/firesword1.png",
            "/CBlades/images/magic/fire/firesword2.png",
            "/CBlades/images/magic/fire/firesword3.png"
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

}

export class CBBlazeSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/blaze1.png",
            "/CBlades/images/magic/fire/blaze2.png",
            "/CBlades/images/magic/fire/blaze3.png"
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

}

export class CBRainFireSpell extends HexTargetedMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/rainfire1.png",
            "/CBlades/images/magic/fire/rainfire2.png",
            "/CBlades/images/magic/fire/rainfire3.png"
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

}

CBSpell.laboratory = new Map([
    ["firePentacle1",
        new CBSpellDefinition("/CBlades/images/magic/fire/pentacle1.png", CBFirePentacleSpell,1)
    ],
    ["firePentacle2",
        new CBSpellDefinition("/CBlades/images/magic/fire/pentacle2.png", CBFirePentacleSpell,2)
    ],
    ["firePentacle3",
        new CBSpellDefinition("/CBlades/images/magic/fire/pentacle3.png", CBFirePentacleSpell,3)
    ],
    ["fireCircle1",
        new CBSpellDefinition("/CBlades/images/magic/fire/circle1.png", CBFireCircleSpell,1)
    ],
    ["fireCircle2",
        new CBSpellDefinition("/CBlades/images/magic/fire/circle2.png", CBFireCircleSpell,2)
    ],
    ["fireCircle3",
        new CBSpellDefinition("/CBlades/images/magic/fire/circle3.png", CBFireCircleSpell,3)
    ],
    ["fireball1",
        new CBSpellDefinition("/CBlades/images/magic/fire/fireball1.png", CBFireballSpell,1)
    ],
    ["fireball2",
        new CBSpellDefinition("/CBlades/images/magic/fire/fireball2.png", CBFireballSpell,2)
    ],
    ["fireball3",
        new CBSpellDefinition("/CBlades/images/magic/fire/fireball3.png", CBFireballSpell,3)
    ],
    ["fireSword1",
        new CBSpellDefinition("/CBlades/images/magic/fire/firesword1.png", CBFireswordSpell,1)
    ],
    ["fireSword2",
        new CBSpellDefinition("/CBlades/images/magic/fire/firesword2.png", CBFireswordSpell,2)
    ],
    ["fireSword3",
        new CBSpellDefinition("/CBlades/images/magic/fire/firesword3.png", CBFireswordSpell,3)
    ],
    ["blaze1",
        new CBSpellDefinition("/CBlades/images/magic/fire/blaze1.png", CBBlazeSpell,1)
    ],
    ["blaze2",
        new CBSpellDefinition("/CBlades/images/magic/fire/blaze2.png", CBBlazeSpell,2)
    ],
    ["blaze3",
        new CBSpellDefinition("/CBlades/images/magic/fire/blaze3.png", CBBlazeSpell,3)
    ],
    ["rainFire1",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire1.png", CBRainFireSpell,1)
    ],
    ["rainFire2",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire2.png", CBRainFireSpell,2)
    ],
    ["rainFire3",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire3.png", CBRainFireSpell,3)
    ]
]);
