'use strict'

import {
    CBCounter, CBCounterImageArtifact, CBMoveType, RetractableMixin
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

export class CBSpell extends CBCounter {

    constructor(paths, wizard, spellLevel) {
        super("units", paths, CBSpell.DIMENSION);
        this._spellLevel = spellLevel;
        this._wizard = wizard;
    }

    _memento() {
        return {}
    }

    _revert(memento) {
    }

    createArtifact(levelName, images, location, dimension) {
        return new SpellImageArtifact(this, levelName, images, location, dimension);
    }

    get isSpell() {
        return true;
    }

    get hexLocation() {
        return this.unit.hexLocation;
    }

    get unit() {
        return this._unit ? this._unit : this._wizard;
    }

    get wizard() {
        return this._wizard;
    }

    get game() {
        return this.wizard.game;
    }

    activate() {
        Memento.register(this);
        this.artifact.changeImage(this._spellLevel);
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

export class CBFirePentacleSpell extends CBSpell {

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
    }

}

export class CBFireballSpell extends OptionMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/fireball1.png",
            "/CBlades/images/magic/fire/fireball2.png",
            "/CBlades/images/magic/fire/fireball3.png"
        ], wizard, level);
    }

    _memento() {
        return {
            unit: this._unit
        }
    }

    _revert(memento) {
        this._unit = memento.unit
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

    selectHex(hex) {
        Memento.register(this);
        this._unit = hex.units[0];
        this._wizard.drop(this);
        this._unit.appendOption(this);
        this.activate();
    }

    apply() {
        if (this._result.losses) this.unit.takeALoss();
        this.unit.deleteOption(this);
    }

}

export class CBFireswordSpell extends OptionMixin(CBSpell) {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/firesword1.png",
            "/CBlades/images/magic/fire/firesword2.png",
            "/CBlades/images/magic/fire/firesword3.png"
        ], wizard, level);
    }

    _memento() {
        return {
            unit: this._unit
        }
    }

    _revert(memento) {
        this._unit = memento.unit
    }

    getNextCinematic() {
        if (!this._unit) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_FRIEND};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.NONE};
        }
    }

    selectHex(hex) {
        Memento.register(this);
        this._unit = hex.units[0];
        this._wizard.drop(this);
    }

    apply() {
        this._unit.appendOption(this);
        this.activate();
    }

}

export class CBBlazeSpell extends CBSpell {

    constructor(wizard, level) {
        super([
            "/CBlades/images/magic/fire/fireb.png",
            "/CBlades/images/magic/fire/blaze1.png",
            "/CBlades/images/magic/fire/blaze2.png",
            "/CBlades/images/magic/fire/blaze3.png"
        ], wizard, level);
    }

    get hex() {
        return this._hex;
    }

    get hexLocation() {
        return this.hex ? this.hex : this.unit.hexLocation;
    }

    _memento() {
        return {
            hex: this._hex
        }
    }

    _revert(memento) {
        this._hex = memento.hex
    }

    getNextCinematic() {
        if (!this._hex) {
            return {cinematic: CBSpell.CINEMATIC.SELECT_HEX};
        }
        else {
            return {cinematic: CBSpell.CINEMATIC.NONE};
        }
    }

    selectHex(hex) {
        Memento.register(this);
        this._hex = hex;
    }

    apply() {
        this.activate()
        this.wizard.drop(this);
        this.move(this.hex.location);
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
        new CBSpellDefinition("/CBlades/images/magic/fire/circle1.png", CBFirePentacleSpell,1)
    ],
    ["fireCircle2",
        new CBSpellDefinition("/CBlades/images/magic/fire/circle2.png", CBFirePentacleSpell,1)
    ],
    ["fireCircle3",
        new CBSpellDefinition("/CBlades/images/magic/fire/circle3.png", CBFirePentacleSpell,1)
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
        new CBSpellDefinition("/CBlades/images/magic/fire/blaze2.png", CBBlazeSpell,1)
    ],
    ["blaze3",
        new CBSpellDefinition("/CBlades/images/magic/fire/blaze3.png", CBBlazeSpell,1)
    ],
    ["rainfire1",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire1.png", CBFirePentacleSpell,1)
    ],
    ["rainfire2",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire2.png", CBFirePentacleSpell,1)
    ],
    ["rainfire3",
        new CBSpellDefinition("/CBlades/images/magic/fire/rainfire3.png", CBFirePentacleSpell,1)
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