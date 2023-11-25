'use strict'

import {
    Memento
} from "../mechanisms.js";
import {
    ADELAY,
    DAnimation
} from "../draw.js";

export class CBSequence {

    static appendElement(game, sequence) {
        console.assert(game._sequence);
        game._sequence.appendElement(sequence);
    }

    static addElement(game, sequence) {
        console.assert(game._sequence);
        game._sequence.addElement(sequence);
    }

    static getCount(game) {
        console.assert(game._sequence);
        return game._sequence.count;
    }

    static setCount(game, count) {
        if (!game._sequence) {
            game._sequence = new CBSequence(game, count);
        }
        game._sequence.count;
    }

    static getValidatedCount(game) {
        console.assert(game._sequence);
        return game._sequence.validatedCount;
    }

    static getElements(game) {
        console.assert(game._sequence);
        return game._sequence.elements;
    }

    static getSequence(game) {
        return game._sequence;
    }

    static _constructors = new Map();
    static register(label, seqConstructor) {
        CBSequence._constructors.set(label, seqConstructor);
    }

    static getLauncher(label) {
        return (CBSequence._constructors.get(label)).launch;
    }

    static createElement(id, label) {
        return new (CBSequence._constructors.get(label))({id});
    }

    constructor(game, count=0) {
        this._game = game;
        this._elements = [];
        this._count = count;
    }

    get count() {
        return this._count;
    }

    set count(count) {
        this._count = count;
        this._validatedCount = count;
    }

    commit() {
        console.assert(!this._validated);
        this._validated = this._elements;
        this._validatedCount = this._count;
        this._count++;
        this._elements = [];
        return this;
    }

    get validated() {
        return this._validated || [];
    }

    get validatedCount() {
        return this._validatedCount;
    }

    acknowledge() {
        delete this._validated;
        delete this._validatedCount;
    }

    addElement(element) {
        this._elements.push(element);
        element.game = this._game;
    }

    appendElement(element) {
        if (!this._replayMode) {
            Memento.register(this);
            this._elements.push(element);
            element.game = this._game;
        }
    }

    _memento() {
        return {
            elements: [...this._elements]
        }
    }

    _revert(memento) {
        this._elements = memento.elements;
    }

    get elements() {
        return this._elements;
    }

    replay(tick, action) {
        this._replayMode = true;
        let animation;
        for (let element of this._elements) {
            animation = element.apply(tick);
            tick += element.delay / 20 + 2;
        }
        this._elements = [];
        if (action && animation) {
            animation.setFinalAction(()=>{
                action();
                delete this._replayMode;
            });
        }
        return tick;
    }

    toSpecs(game) {
        let sequenceSpecs = {
            version: this._oversion || 0,
            game: this._game.id,
            count: this._validatedCount,
            elements: []
        };
        let context = {game: this._game};
        for (let element of this.validated) {
            let elementSpecs = {};
            element.toSpecs(elementSpecs, context);
            sequenceSpecs.elements.push(elementSpecs);
        }
        //consoleLog(JSON.stringify(sequenceSpecs));
        return sequenceSpecs;
    }

    fromSpecs(sequenceSpecs, context) {
        //consoleLog(JSON.stringify(specList));
        this.count = sequenceSpecs.count;
        for (let elementSpec of sequenceSpecs.elements) {
            let element = CBSequence.createElement(elementSpec.id, elementSpec.type);
            element.fromSpecs(elementSpec, context);
            this.addElement(element);
        }
    }
}

export class CBSequenceElement {

    constructor({id, type, game}) {
        this.id = id;
        this.type = type;
        this.game = game;
    }

    equalsTo(element) {
        if (this.type !== element.type) return false;
        if (this.game !== element.game) return false;
        return true;
    }

    toString() {
        return "{ "+this._toString()+" }";
    }

    _toString() {
        return "Type: "+this.type;
    }

    toSpecs(spec, context) {
        spec.version = this._oversion || 0;
        spec.type = this.type;
        spec.content = {}
        this._toSpecs(spec.content, context);
    }

    _toSpecs(spec, context) {}

    fromSpecs(spec, context) {
        this.game = context.game;
        this._fromSpecs(spec.content, context);
    }

    _fromSpecs(spec, context) {}

    get delay() { return 0; }

}

export class CBAnimation extends DAnimation {

    constructor({game, startTick, duration}) {
        super();
        this._game = game;
        this._duration = duration;
        this._tick = startTick+1;
        this.play(this.tick);
    }

    get tick() {
        return this._tick;
    }

    get game() {
        return this._game;
    }

    _draw(count, ticks) {
        return this.draw(count, ticks);
    }

    _init() {
    }

    _finalize() {
    }

    _factor(count) {
        return (this._duration === 0) ? 0 : (count * ADELAY)/this._duration;
    }

    draw(count, ticks) {
        return count * ADELAY >= this._duration ? 0 : 1;
    }

}

export class CBNextTurnSequenceElement extends CBSequenceElement {

    constructor({id, game}) {
        super({id, type: "next-turn", game});
    }

    apply(startTick) {
        return new CBNextTurnAnimation({game: this.game, startTick, duration: this.delay});
    }

    get delay() { return 500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.game !== element.game) return false;
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.game !== undefined) result+=", Game: "+this.game.id;
        return result;
    }

}
CBSequence.register("next-turn", CBNextTurnSequenceElement);

export class CBNextTurnAnimation extends DAnimation {

    constructor({game, startTick, duration}) {
        super();
        this._game = game;
        this._duration = duration;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            this._game.nextTurn(this._game._endOfTurnCommand.animation);
        }
        return false;
    }

}

