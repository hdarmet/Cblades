'use strict'

import {
    Memento
} from "../mechanisms.js";
import {
    ADELAY,
    DAnimation
} from "../draw.js";
import {
    diffAngle, Point2D
} from "../geometry.js";
import {
    InteractiveRallyAction, InteractiveReorganizeAction,
    InteractiveReplenishMunitionsAction,
    InteractiveRestingAction
} from "./interactive/interactive-recover.js";
import {
    CBDefenderEngagementChecking, CBLoseCohesionChecking
} from "./interactive/interactive-player.js";
import {
    CBAttackerEngagementChecking,
    CBConfrontChecking,
    CBDisengagementChecking,
    CBLoseCohesionForCrossingChecking
} from "./interactive/interactive-movement.js";
import {
    InteractiveChangeOrderInstructionAction,
    InteractiveDismissCommandAction,
    InteractiveGiveOrdersAction,
    InteractiveTakeCommandAction
} from "./interactive/interactive-command.js";
import {
    CBCharge, CBCohesion, CBMunitions, CBOrderInstruction, CBTiredness, CBUnit
} from "./unit.js";
import {
    CBStacking
} from "./game.js";
import {
    CBHexSideId
} from "./map.js";
import {
    InteractiveRetreatAction,
    InteractiveShockAttackAction
} from "./interactive/interactive-combat.js";
import {
    SequenceLoader
} from "./loader.js";

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

    static createElement(label) {
        return new (CBSequence._constructors.get(label))({});
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
        return this._validated;
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

}

export class CBSequenceElement {

    constructor({type, game}) {
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

    toSpec(spec, context) {
        spec.version = this._oversion || 0;
        spec.type = this.type;
    }

    fromSpec(spec, context) {
        this.game = context.game;
    }

    get delay() { return 0; }
}

function getUnitFromContext(context, spec) {
    if (!context.units) {
        context.units = new Map();
        for (let playable of context.game.playables) {
            if (playable instanceof CBUnit) {
                context.units.set(playable.name, playable);
            }
        }
    }
    return context.units.get(spec);
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

    init() {
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

export class CBUnitAnimation extends CBAnimation {

    constructor({unit, state, ...params}) {
        super(params);
        this._unit = unit;
        this._state = state;
    }

    _draw(count, ticks) {
        if (count===0) {
            if (this._unit._animation) {
                this._unit._animation.cancel();
            }
            this._unit._animation = this;
            this.init && this.init();
        }
        return super._draw(count, ticks);
    }

    _finalize() {
        super._finalize();
        this._unit.setState(this._state);
        delete this._unit._animation;
    }

}

export let CBSceneAnimation = SceneAnimation(CBAnimation);
export let CBUnitSceneAnimation = SceneAnimation(CBUnitAnimation);

export class CBStateSequenceElement extends CBSequenceElement {

    constructor({unit, game, type="State"}) {
        super({type, game});
        unit&&this.setUnit(unit);
    }

    setUnit(unit) {
        this.unit = unit;
        this.steps = unit.isOnHex() ? unit.steps : 0;
        this.cohesion = unit.cohesion;
        this.tiredness = unit.tiredness;
        this.munitions = unit.munitions;
        this.charging = unit.charge;
        this.engaging = unit.isEngaging();
        this.orderGiven = unit.hasReceivedOrder();
        this.played = unit.isPlayed();
    }

    setState(state) {
        if (state.steps !== undefined) this.steps = state.steps;
        if (state.cohesion !== undefined) this.cohesion = state.cohesion;
        if (state.tiredness !== undefined) this.tiredness = state.tiredness;
        if (state.munitions !== undefined) this.munitions = state.munitions;
        if (state.charging !== undefined) this.charging = state.charging;
        if (state.engaging !== undefined) this.engaging = state.engaging;
        if (state.orderGiven !== undefined) this.orderGiven = state.orderGiven;
        if (state.played !== undefined) this.played = state.played;
        return this;
    }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.steps !== element.steps) return false;
        if (this.unit !== element.unit) return false;
        if (this.cohesion !== element.cohesion) return false;
        if (this.tiredness !== element.tiredness) return false;
        if (this.munitions !== element.munitions) return false;
        if (this.charging !== element.charging) return false;
        if (this.engaging !== element.engaging) return false;
        if (this.orderGiven !== element.orderGiven) return false;
        if (this.played !== element.played) return false;
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.unit !== undefined) result+=", Unit: "+this.unit.name;
        if (this.steps !== undefined) result+=", Unit: "+this.unit.steps;
        if (this.cohesion !== undefined) result+=", Cohesion: "+this.cohesion;
        if (this.tiredness !== undefined) result+=", Tiredness: "+this.tiredness;
        if (this.munitions !== undefined) result+=", Munitions: "+this.munitions;
        if (this.charging !== undefined) result+=", Charging: "+this.charging;
        if (this.engaging !== undefined) result+=", Engaging: "+this.engaging;
        if (this.orderGiven !== undefined) result+=", OrderGiven: "+this.orderGiven;
        if (this.played !== undefined) result+=", Played: "+this.played;
        return result;
    }

    apply(startTick) {
        return new CBUnitAnimation({unit:this.unit, startTick, duration:this.delay, state:this});
    }

    get delay() { return 0; }

    toSpec(spec, context) {
        super.toSpec(spec, context);
        spec.unit = this.unit.name;
        spec.steps = this.unit.steps;
        spec.cohesion = this.getCohesionCode(this.cohesion);
        spec.tiredness = this.getTirednessCode(this.tiredness);
        spec.ammunition = this.getMunitionsCode(this.munitions);
        spec.charging = this.getChargingCode(this.charging);
        spec.engaging = this.engaging;
        spec.orderGiven = this.orderGiven;
        spec.played = this.played;
    }

    fromSpec(spec, context) {
        super.fromSpec(spec, context);
        let unit = getUnitFromContext(context, spec.unit);
        if (unit) {
            this.setUnit(unit);
        }
        if (spec.steps !== undefined) {

            this.steps = spec.steps;
        }
        if (spec.tiredness !== undefined) {
            this.tiredness = this.getTiredness(spec.tiredness);
        }
        if (spec.cohesion !== undefined) {
            this.cohesion = this.getCohesion(spec.cohesion);
        }
        if (spec.ammunition !== undefined) {
            this.munitions = this.getMunitions(spec.ammunition);
        }
        if (spec.charging !== undefined) {
            this.charging = this.getCharging(spec.charging);
        }
        if (spec.engaging !== undefined) {
            this.engaging = spec.engaging;
        }
        if (spec.orderGiven !== undefined) {
            this.orderGiven = spec.orderGiven;
        }
        if (spec.played !== undefined) {
            this.played = spec.played;
        }
    }

    getTirednessCode(tiredness) {
        if (tiredness===CBTiredness.TIRED) return "T";
        else if (tiredness===CBTiredness.EXHAUSTED) return "E";
        else return "F";
    }

    getMunitionsCode(munitions) {
        if (munitions===CBMunitions.SCARCE) return "S";
        else if (munitions===CBMunitions.EXHAUSTED) return "E";
        else return "P";
    }

    getCohesionCode(cohesion) {
        if (cohesion===CBCohesion.DISRUPTED) return "D";
        else if (cohesion===CBCohesion.ROUTED) return "R";
        else if (cohesion===CBCohesion.DESTROYED) return "X";
        else return "GO";
    }

    getChargingCode(charging) {
        if (charging===CBCharge.CHARGING) return "C";
        else if (charging===CBCharge.BEGIN_CHARGE) return "BC";
        else if (charging===CBCharge.CAN_CHARGE) return "CC";
        else return "N";
    }

    getTiredness(code) {
        switch (code) {
            case "F": return CBTiredness.NONE;
            case "T": return CBTiredness.TIRED;
            case "E": return CBTiredness.EXHAUSTED;
        }
    }

    getMunitions(code) {
        switch (code) {
            case "P": return CBMunitions.NONE;
            case "S": return CBMunitions.SCARCE;
            case "E": return CBMunitions.EXHAUSTED;
        }
    }

    getCohesion(code) {
        switch (code) {
            case "GO": return CBCohesion.GOOD_ORDER;
            case "D": return CBCohesion.DISRUPTED;
            case "R": return CBCohesion.ROUTED;
            case "X": return CBCohesion.DESTROYED;
        }
    }

    getCharging(code) {
        switch (code) {
            case "BC": return CBCharge.BEGIN_CHARGE;
            case "CC": return CBCharge.CAN_CHARGE;
            case "C": return CBCharge.CHARGING;
            case "N": return CBCharge.NONE;
        }
    }

}
CBSequence.register("State", CBStateSequenceElement);

export function HexLocated(clazz) {

    return class extends clazz {

        constructor({hexLocation, stacking, ...params}) {
            super(params);
            this.hexLocation = hexLocation;
            this.stacking = stacking;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (this.hexLocation.location.toString() !== element.hexLocation.location.toString()) return false;
            if (this.stacking !== element.stacking) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            if (this.hexLocation !== undefined) result+=", HexLocation: "+this.hexLocation.location.toString();
            if (this.stacking !== undefined) result+=", Stacking: "+this.stacking;
            return result;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            if (this.hexLocation instanceof CBHexSideId) {
                spec.hexCol = this.hexLocation.fromHex.col;
                spec.hexRow = this.hexLocation.fromHex.row;
                spec.hexAngle = this.hexLocation.angle;
            }
            else {
                spec.hexCol = this.hexLocation.col;
                spec.hexRow = this.hexLocation.row;
            }
            spec.stacking = this.getStackingCode(this.stacking);
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            if (spec.hexCol !== undefined) {
                this.hexLocation = context.game.map.getHex(spec.hexCol, spec.hexRow);
                if (spec.hexAngle!==undefined) {
                    this.hexLocation = this.hexLocation.toward(spec.hexAngle);
                }
            }
            if (spec.stacking !== undefined) {
                this.stacking = this.getStacking(spec.stacking)
            }
        }

        getStackingCode(stacking) {
            if (stacking===CBStacking.TOP) return "T";
            else return "B";
        }

        getStacking(code) {
            switch (code) {
                case "T": return CBStacking.TOP;
                case "B": return CBStacking.BOTTOM;
            }
        }

    }

}

export class CBMoveSequenceElement extends HexLocated(CBStateSequenceElement) {

    constructor({game, unit, hexLocation, hexAngle, stacking}) {
        super({type: "Move", game, unit, hexLocation, hexAngle, stacking});
    }

    get delay() { return 500; }

    apply(startTick) {
        this.game.centerOn(this.unit.viewportLocation);
        return new CBMoveAnimation({
            unit:this.unit, startTick, duration:this.delay,
            state:this, hexLocation:this.hexLocation, stacking:this.stacking
        });
    }

}
CBSequence.register("Move", CBMoveSequenceElement);

export function Oriented(clazz) {

    return class extends clazz {

        constructor({angle, ...params}) {
            super(params);
            this.angle = angle;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (this.angle !== element.angle) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            if (this.angle !== undefined) result+=", Angle: "+this.angle;
            return result;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            spec.angle = this.angle;
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            if (spec.angle !== undefined) {
                this.angle = spec.angle;
            }
        }

    }

}

export class CBRotateSequenceElement extends Oriented(CBStateSequenceElement) {

    constructor({game, unit, angle}) {
        super({type: "Rotate", game, unit, angle});
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBMoveAnimation({
            unit: this.unit, startTick, duration:this.delay, state:this, angle:this.angle
        });
    }

}
CBSequence.register("Rotate", CBRotateSequenceElement);

export class CBReorientSequenceElement extends Oriented(CBStateSequenceElement) {

    constructor({game, unit, angle}) {
        super({type: "Reorient", game, unit, angle});
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBMoveAnimation({
            unit: this.unit, startTick, duration: this.delay, state:this, angle:this.angle
        });
    }

}
CBSequence.register("Reorient", CBReorientSequenceElement);

export class CBTurnSequenceElement extends Oriented(HexLocated(CBStateSequenceElement)) {

    constructor({game, unit, angle, hexLocation, stacking}) {
        super({type:"Turn", game, unit, angle, hexLocation, stacking});
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBMoveAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, angle:
            this.angle, hexLocation: this.hexLocation, stacking: this.stacking
        });
    }

}
CBSequence.register("Turn", CBTurnSequenceElement);

export class CBMoveAnimation extends CBUnitAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state});
        this._angle = angle;
        this._hexLocation = hexLocation;
        this._stacking = stacking;
    }

    init() {
        super.init();
        if (this._angle!==undefined) {
            this._startAngle = this._unit.element.angle;
            this._unit._rotate(this._angle);
            this._stopAngle = this._unit.element.angle;
            this._unit.element.setAngle(this._startAngle);
        }
        if (this._hexLocation!==undefined) {
            this._startLocation = this._unit.element.location;
            this._unit._move(this._hexLocation, this._stacking);
            this._stopLocation = this._unit.element.location;
            this._unit.element.setLocation(this._startLocation);
        }
    }

    _finalize() {
        if (this._stopAngle) {
            this._unit.element.setAngle(this._stopAngle);
        }
        if (this._stopLocation) {
            this._unit.element.setLocation(this._stopLocation);
        }
        super._finalize();
    }

    draw(count, ticks) {
        let factor = this._factor(count);
        if (this._startAngle!==undefined) {
            console.log(this._startAngle + factor*diffAngle(this._startAngle, this._stopAngle));
            this._unit.element.setAngle(this._startAngle + factor*diffAngle(this._startAngle, this._stopAngle));
        }
        if (this._startLocation!==undefined) {
            this._unit.element.setLocation(new Point2D(
                this._startLocation.x + factor*(this._stopLocation.x-this._startLocation.x),
                this._startLocation.y + factor*(this._stopLocation.y-this._startLocation.y)
            ));
        }
        return super.draw(count, ticks);
    }

}

export class CBNextTurnSequenceElement extends CBSequenceElement {

    constructor({game}) {
        super({type: "NextTurn", game});
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
CBSequence.register("NextTurn", CBNextTurnSequenceElement);

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

function WithDiceRoll(clazz) {

    return class extends clazz {

        constructor({dice, ...params}) {
            super(params);
            this.dice = dice;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            for (let index=0; index<this.dice.length; index++) {
                if (element[index] !== this.dice[index]) return false;
            }
            return true;
        }

        _toString() {
            let result = super._toString();
            for (let index=0; index<this.dice.length; index++) {
                result+=`, dice${index}: `+this.dice[index];
            }
            return result;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            for (let index=0;  index<this.dice.length; index++) {
                spec["dice"+(index+1)] = this.dice[index];
            }
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            this.dice = [spec.dice1, spec.dice2];
        }
    }

}

export class CBRestSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({type:"Rest", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveRestingAction(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Rest", CBRestSequenceElement);

export class CBRefillSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({type:"Refill", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveReplenishMunitionsAction(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Refill", CBRefillSequenceElement);

export class CBRallySequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({type:"Rally", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: ()=>new InteractiveRallyAction(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Rally", CBRallySequenceElement);

export class CBReorganizeSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({type:"Reorganize", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: ()=>new InteractiveReorganizeAction(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Reorganize", CBReorganizeSequenceElement);

export class CBLoseCohesionSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({type:"LossConsistency", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBLoseCohesionChecking(this.game, this.unit).replay(this.dice)
        });
    }
}
CBSequence.register("LossConsistency", CBLoseCohesionSequenceElement);

export class CBConfrontSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({ type: "Confront", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBConfrontChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Confront", CBConfrontSequenceElement);

export class CBCrossingSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({ type:"Crossing", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBLoseCohesionForCrossingChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Crossing", CBCrossingSequenceElement);

export class CBAttackerEngagementSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({ type:"AttackerEngagement", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBAttackerEngagementChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("AttackerEngagement", CBAttackerEngagementSequenceElement);

export class CBDefenderEngagementSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({ type:"DefenderEngagement", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBDefenderEngagementChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("DefenderEngagement", CBDefenderEngagementSequenceElement);

export class CBDisengagementSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({game, unit, dice}) {
        super({ type:"Disengagement", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBDisengagementChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Disengagement", CBDisengagementSequenceElement);

export function SceneAnimation(clazz) {

    return class extends clazz {
        constructor({animation, ...params}) {
            super(params);
            this._animation = animation;
        }

        draw(count, ticks) {
            if (count === 0) {
                this._animation();
            }
            return super.draw(count, ticks);
        }

        _finalize() {
            this.game.closePopup();
            super._finalize();
        }
    }

}

function WithLeader(clazz) {

    return class extends clazz {

        constructor({leader, ...params}) {
            super(params);
            this.leader = leader;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            this.leader && (spec.leader = this.leader.name);
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            if (spec.leader !== undefined) {
                this.leader = getUnitFromContext(context, spec.leader);
            }
        }

    }

}

export class CBTry2ChangeOrderInstructionSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({game, leader, dice}) {
        super({type: "Try2ChangeOrderInst", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveChangeOrderInstructionAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("Try2ChangeOrderInst", CBTry2ChangeOrderInstructionSequenceElement);

export class CBChangeOrderInstructionSequenceElement extends WithLeader(WithOrderInstruction(CBSequenceElement)) {

    constructor({game, leader, orderInstruction}) {
        super({type: "ChangeOrderInst", leader, orderInstruction, game});
    }

    apply(startTick) {
        return new CBChangeOrderAnimation({
            game: this.game, leader:this.leader, orderInstruction: this.orderInstruction, startTick, duration:200
        });
    }

}
CBSequence.register("ChangeOrderInst", CBChangeOrderInstructionSequenceElement);

export function WithOrderInstruction(clazz) {

    return class extends clazz {

        constructor({orderInstruction, ...params}) {
            super(params);
            this.orderInstruction = orderInstruction;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (this.orderInstruction !== element.orderInstruction) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            if (this.orderInstruction !== undefined) result+=", Order Instruction: "+this.orderInstruction;
            return result;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            spec.orderInstruction = this.getOrderInstructionCode(this.orderInstruction);
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            if (spec.orderInstruction !== undefined) {
                this.orderInstruction = this.getOrderInstruction(spec.orderInstruction);
            }
        }

        getOrderInstructionCode(orderInstruction) {
            if (orderInstruction===CBOrderInstruction.ATTACK) return "A";
            else if (orderInstruction===CBOrderInstruction.DEFEND) return "D";
            else if (orderInstruction===CBOrderInstruction.REGROUP) return "G";
            else return "R";
        }

        getOrderInstruction(code) {
            switch (code) {
                case "A": return CBOrderInstruction.ATTACK;
                case "D": return CBOrderInstruction.DEFEND;
                case "G": return CBOrderInstruction.REGROUP;
                case "R": return CBOrderInstruction.RETREAT;
            }
        }

    }

}

export class CBChangeOrderAnimation extends DAnimation {

    constructor({game, leader, orderInstruction, startTick, duration}) {
        super();
        this._game = game;
        this._leader = leader;
        this._duration = duration;
        this._orderInstruction = orderInstruction;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0 && this._leader) {
            this._leader.wing.changeOrderInstruction(this._orderInstruction);
        }
        return false;
    }

}

export class CBTry2TakeCommandSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({game, leader, dice}) {
        super({type: "Try2TakeCommand", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveTakeCommandAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("Try2TakeCommand", CBTry2TakeCommandSequenceElement);

export class CBTry2DismissCommandSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({game, leader, dice}) {
        super({type: "Try2DismissCommand", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveDismissCommandAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("Try2DismissCommand", CBTry2DismissCommandSequenceElement);

export class CBGiveOrdersSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({game, leader, dice}) {
        super({type: "GiveOrders", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveGiveOrdersAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("GiveOrders", CBGiveOrdersSequenceElement);

function WithInCommand(clazz) {

    return class extends clazz {

        constructor({inCommand, ...params}) {
            super(params);
            this.inCommand = inCommand;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (element.inCommand !== this.inCommand) return false;
            return true;
        }

        _toString() {
            return super._toString() + `, inCommand: `+this.inCommand;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            spec.inCommand = this.inCommand;
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            this.inCommand = spec.inCommand;
        }
    }

}

export class CBManageCommandSequenceElement extends WithLeader(WithInCommand(CBSequenceElement)) {

    constructor({game, leader, inCommand}) {
        super({type: "ManageCommand", leader, inCommand, game});
    }

    apply(startTick) {
        return new CBManageCommandAnimation({
            game: this.game, leader:this.leader, inCommand: this.inCommand, startTick, duration:200
        });
    }

}
CBSequence.register("ManageCommand", CBManageCommandSequenceElement);

export class CBManageCommandAnimation extends DAnimation {

    constructor({game, leader, inCommand, startTick, duration}) {
        super();
        this._game = game;
        this._leader = leader;
        this._duration = duration;
        this._inCommand = inCommand;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            this._leader.wing.setLeader(this._inCommand ? this._leader : null);
        }
        return false;
    }

}

function WithCombat(clazz) {

    return class extends clazz {

        constructor({attackerHex, defender, defenderHex, supported, advantage, ...params}) {
            super(params);
            this.attackerHex = attackerHex;
            this.defender = defender;
            this.defenderHex = defenderHex;
            this.supported = supported;
            this.advantage = advantage;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (element.attackerHex.location.toString() !== this.attackerHex.location.toString()) return false;
            if (element.defender !== this.defender) return false;
            if (element.defenderHex.location.toString() !== this.defenderHex.location.toString()) return false;
            if (element.supported !== this.supported) return false;
            if (element.advantage !== this.advantage) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            result+=`, attackerHex: `+this.attackerHex.location.toString();
            result+=`, defender: `+this.defender;
            result+=`, defenderHex: `+this.defenderHex.location.toString();
            result+=`, supported: `+this.supported;
            result+=`, advantage: `+this.advantage;
            return result;
        }

        toSpec(spec, context) {
            super.toSpec(spec, context);
            spec.attackerHexCol = this.attackerHex.col;
            spec.attackerHexRow = this.attackerHex.row;
            spec.defender = this.defender.name;
            spec.defenderHexCol = this.defenderHex.col;
            spec.defenderHexRow = this.defenderHex.row;
            spec.supported = this.supported;
            spec.advantage = this.advantage;
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            this.attackerHex = context.game.map.getHex(spec.attackerHexCol, spec.attackerHexRow);
            this.defender = getUnitFromContext(context, spec.defender);
            this.defenderHex = context.game.map.getHex(spec.defenderHexCol, spec.defenderHexRow);
            this.supported = spec.supported;
            this.advantage = spec.advantage;
        }

    }

}

export class CBShockAttackSequenceElement extends WithCombat(WithDiceRoll(CBStateSequenceElement)) {

    constructor({game, unit, attackerHex, defender, defenderHex, supported, advantage, dice}) {
        super({type: "ShockAttack", game, unit, attackerHex, defender, defenderHex, supported, advantage, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveShockAttackAction(this.game, this.unit)
                .replay(this.attackerHex, this.defender, this.defenderHex, this.supported, this.advantage, this.dice)
        });
    }

}
CBSequence.register("ShockAttack", CBShockAttackSequenceElement);

export class CBFireAttackSequenceElement extends WithCombat(WithDiceRoll(CBStateSequenceElement)) {

    constructor({game, unit, firerHex, target, targetHex, advantage, dice}) {
        super({
            type: "FireAttack", game, unit, attackerHex:firerHex, defender:target, defenderHex:targetHex,
            supported:false, advantage, dice
        });
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveFireAttackAction(this.game, this.unit)
                .replay(this.attackerHex, this.defender, this.defenderHex, this.advantage, this.dice)
        });
    }

}
CBSequence.register("FireAttack", CBFireAttackSequenceElement);

export class CBAsk4RetreatSequenceElement extends CBSequenceElement {

    constructor({game, unit, losses, attacker, advance}) {
        super({type: "Ask4Retreat", game});
        console.log(unit, losses, attacker, advance);
        this.unit = unit;
        this.attacker = attacker;
        this.losses = losses;
        this.advance = advance;
        this.id = 0;
    }

    get delay() { return 0; }

    apply(startTick) {
        return new CBAsk4RetreatAnimation({
            game:this.game, unit:this.unit, id:this.id, losses:this.losses, attacker:this.attacker, startTick
        });
    }

    toSpec(spec, context) {
        super.toSpec(spec, context);
        spec.unit = this.unit.name;
        spec.attacker = this.attacker.name;
        spec.losses = this.losses;
        spec.advance = this.advance;
    }

    fromSpec(spec, context) {
        super.fromSpec(spec, context);
        this.unit = getUnitFromContext(context, spec.unit);
        this.attacker = getUnitFromContext(context, spec.attacker);
        this.losses = spec.losses;
        this.advance = spec.advance;
        this.id = spec.id;
    }

}
CBSequence.register("Ask4Retreat", CBAsk4RetreatSequenceElement);

export class CBRetreatSequenceElement extends HexLocated(CBStateSequenceElement) {

    constructor({game, unit, hexLocation, askRequest}) {
        super({type: "Retreat", unit, hexLocation, stacking:CBStacking.TOP, game});
        this.askRequest = askRequest;
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBRetreatAnimation({
            unit:this.unit, startTick, duration:this.delay, state:this,
            angle:this.unit.angle, hexLocation:this.hexLocation, stacking:this.stacking
        });
    }

    toSpec(spec, context) {
        super.toSpec(spec, context);
        spec.askRequest = this.askRequest;
    }

    fromSpec(spec, context) {
        super.fromSpec(spec, context);
        this.askrequest = spec.askRequest;
    }

}
CBSequence.register("Retreat", CBRetreatSequenceElement);

export class CBAsk4RetreatAnimation extends DAnimation {

    constructor({game, id, unit, losses, attacker, startTick}) {
        super();
        this._game = game;
        this._unit = unit;
        this._losses = losses;
        this._attacker = attacker;
        this._id = id;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            this._unit.launchAction(new InteractiveRetreatAction(this._game, this._unit, this._losses, this._attacker, false,
                ()=>{
                    CBSequence.appendElement(this._game,
                        new CBRetreatSequenceElement({game: this._game, unit:this._unit, hexLocation:this._unit.hexLocation, askRequest:this._id})
                    );
                    new SequenceLoader().save(this._game, CBSequence.getSequence(this._game));
                    this._game.validate();
                }
            ));
        }
        return false;
    }

}

export class CBRetreatAnimation extends CBMoveAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state, angle, hexLocation, stacking});
    }

    _draw(count, ticks) {
        if (count===0) {
            this._unit.game.closeActuators();
        }
        return super._draw(count, ticks);
    }

    _finalize() {
        this._unit.player.continueLossApplication(this._unit, this._hexLocation, this._stacking);
        return super._finalize();
    }

}