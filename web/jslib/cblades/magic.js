'use strict'

import {
    CBPlayable, CBCounterImageArtifact, CBMoveType, RetractableMixin
} from "./game.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    Memento
} from "../mechanisms.js";
import {
    OptionArtifactMixin,
    OptionMixin
} from "./unit.js";
import {
    DDice, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBCombatResultTableInsert
} from "./interactive-combat.js";

class SpellImageArtifact extends OptionArtifactMixin(RetractableMixin(CBCounterImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
        this._option = false;
    }

    _memento() {
        let memento = super._memento();
        memento.option = this._option;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._option = memento.option;
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

export class CBSpell extends CBPlayable {

    constructor(paths, wizard, spellLevel) {
        super("units", paths, CBSpell.DIMENSION);
        this._spellLevel = spellLevel;
        this._wizard = wizard;
    }

    createArtifact(levelName, images, location, dimension) {
        return new SpellImageArtifact(this, levelName, images, location, dimension);
    }

    _getHexLocation() {
        return this.wizard.hexLocation;
    }

    _getUnit() {
        return this.wizard;
    }

    get isSpell() {
        return true;
    }

    get hexLocation() {
        return this._getHexLocation();
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

    _activate() {
        Memento.register(this);
        this.artifact.changeImage(this._spellLevel);
    }

    apply() {
        Memento.register(this);
        this._wizard.forgetSpell();
    }

    move(location) {
        Memento.register(this);
        if (this.location) {
            if (!location) {
                this._element.hide();
            }
        }
        if (location && !this.location) this._element.show(this.game.board);
        if (location) {
            this._element.move(location);
        }
    }

    rotate(angle) {
        Memento.register(this);
        this._element.rotate(angle);
    }

}
CBSpell.DIMENSION = new Dimension2D(142, 142);
CBSpell.CINEMATIC = {
    NONE: 0,
    SELECT_FRIEND:1,
    SELECT_FOE:2,
    SELECT_HEX:3,
    RESOLVE:4
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

        _getHexLocation() {
            if (this.hex) return this.hex;
            else return super._getHexLocation();
        }

        _memento() {
            let memento = super._memento();
            memento.hex = this._hex;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.unit) {
                this._hex = memento.hex;
            }
            else delete this._hex;
        }

        selectHex(hex) {
            Memento.register(this);
            this._hex = hex;
            delete this._unit;
        }

        apply() {
            super.apply();
            this._activate();
            this.appendToMap(this.hex);
            this.move(this.hex.location);
        }

        _activate() {
            super._activate();
            this.artifact.changeLevel("terran");
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

        _getHexLocation() {
            if (this.unit) return this.unit;
            else return super._getHexLocation();
        }

        _memento() {
            let memento = super._memento();
            memento.unit = this._unit;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.unit) {
                this._unit = memento.unit;
            }
            else delete this._unit;
        }

        selectHex(hex) {
            Memento.register(this);
            this._activate();
            this._unit = hex.units[0];
            this.wizard.forgetSpell(this);
            this._unit.appendOption(this);
        }

        apply() {
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
        return {cinematic: CBSpell.CINEMATIC.NONE};
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
        return {cinematic: CBSpell.CINEMATIC.NONE};
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
        else if (!this._resolved) {
            return {cinematic: CBSpell.CINEMATIC.RESOLVE, resolver:CBFireballSpell.resolver};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.NONE};
        }
    }

    resolve(diceResult) {
        this._resolved = true;
        this._result = this.game.arbitrator.resolveFireball(this, diceResult);
        return this._result;
    }

    apply() {
        if (this._result.losses) this.unit.takeALoss();
        this.unit.deleteOption(this);
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
            return {cinematic: CBSpell.CINEMATIC.NONE};
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
            return {cinematic: CBSpell.CINEMATIC.NONE};
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
            return {cinematic: CBSpell.CINEMATIC.NONE};
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
    ["firesword1",
        new CBSpellDefinition("/CBlades/images/magic/fire/firesword1.png", CBFireswordSpell,1)
    ],
    ["firesword2",
        new CBSpellDefinition("/CBlades/images/magic/fire/firesword2.png", CBFireswordSpell,2)
    ],
    ["firesword3",
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
    ["rainfire1",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire1.png", CBRainFireSpell,1)
    ],
    ["rainfire2",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire2.png", CBRainFireSpell,2)
    ],
    ["rainfire3",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire3.png", CBRainFireSpell,3)
    ]
]);

CBFireballSpell.resolver = function(action) {
    this.game.closeActuators();
    let result = new DResult();
    let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
    let scene = new DScene();
    let mask = new DMask("#000000", 0.3);
    let close = ()=>{
        mask.close();
        scene.close();
    };
    mask.open(this.game.board, this.location);
    scene.addWidget(
        new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
    ).addWidget(
        new CBFireballInsert(), new Point2D(-160, CBFireballInsert.DIMENSION.h/2-40)
    ).addWidget(
        dice.setFinalAction(()=>{
            dice.active = false;
            let report = this.resolve(dice.result);
            if (report.success) {
                result.success().appear();
                action.play();
            }
            else {
                result.failure().appear();
                action.play();
            }
        }),
        new Point2D(70, 60)
    ).addWidget(
        result.setFinalAction(close),
        new Point2D(0, 0)
    ).open(this.game.board, this.location);
}

export class CBFireballInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/fireball-insert.png", CBFireballInsert.DIMENSION);
    }

}
CBFireballInsert.DIMENSION = new Dimension2D(444, 257);