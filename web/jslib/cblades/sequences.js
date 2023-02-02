'use strict'

import {
    Memento
} from "../mechanisms.js";
import {
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
    InteractiveChangeOrderInstructionAction
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
        if (!this._validated) {
            this._validated = this._elements;
            this._validatedCount = this._count;
            this._count++;
            this._elements = [];
        }
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
}

export class CBStateSequenceElement extends CBSequenceElement {

    constructor({unit, game, type="State"}) {
        super({type, game});
        if (unit) this.setUnit(unit);
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
        if (!context.units) {
            context.units = new Map();
            for (let playable of context.game.playables) {
                if (playable instanceof CBUnit) {
                    context.units.set(playable.name, playable);
                }
            }
        }
        let unit = context.units.get(spec.unit);
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

        get delay() { return 500; }

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

    apply(startTick) {
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

        get delay() { return 500; }

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

    apply(startTick) {
        return new CBMoveAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, angle:
            this.angle, hexLocation: this.hexLocation, stacking: this.stacking
        });
    }

}
CBSequence.register("Turn", CBTurnSequenceElement);

export class CBUnitAnimation extends DAnimation {

    constructor({unit, game, startTick, duration, state}) {
        super();
        this._unit = unit;
        this._game = game;
        this._state = state;
        this._duration = duration;
        this._tick = startTick+1;
    }

    get tick() {
        return this._tick;
    }

    get game() {
        return this._game;
    }

    _draw(count, ticks) {
        if (count===0) {
            if (this._unit._animation) {
                this._unit._animation.cancel();
            }
            this._unit._animation = this;
            this.init && this.init();
        }
        return this.draw(count, ticks);
    }

    init() {
    }

    _finalize() {
        this._unit.setState(this._state);
        delete this._unit._animation;
    }

    _factor(count) {
        return (this._duration === 0) ? 0 : (count * 20)/this._duration;
    }

    draw(count, ticks) {
        return count * 20 >= this._duration ? 0 : 1;
    }

}

export class CBMoveAnimation extends CBUnitAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state});
        this._angle = angle;
        this._hexLocation = hexLocation;
        this._stacking = stacking;
        this.play(this.tick);
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
        if (this._startAngle) {
            this._unit.element.setAngle(this._startAngle + factor*diffAngle(this._startAngle, this._stopAngle));
        }
        if (this._startLocation) {
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

        get delay() { return 2500; }

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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
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

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBDisengagementChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
CBSequence.register("Disengagement", CBDisengagementSequenceElement);

export class CBSceneAnimation extends CBUnitAnimation {

    constructor({unit, startTick, duration, state, game, animation}) {
        super({unit, game, startTick, duration, state});
        this._animation = animation;
        this.play(this.tick);
    }

    draw(count, ticks) {
        if (count===0) {
            this._animation();
        }
        return super.draw(count, ticks);
    }

    _finalize() {
        this.game.closePopup();
        super._finalize();
    }

}

export class CBTryChangeOrderInstructionSequenceElement extends WithDiceRoll(CBSequenceElement) {

    constructor({game, leader, dice}) {
        super({type: "Try2ChangeOrderInst", game, dice});
        this.leader = leader;
    }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveChangeOrderInstructionAction(this.game, this._leader).replay(this.dice)
        });
    }

}
CBSequence.register("Try2ChangeOrderInst", CBTryChangeOrderInstructionSequenceElement);

export class CBChangeOrderInstructionSequenceElement extends WithOrderInstruction(CBSequenceElement) {

    constructor({game, leader, instruction}) {
        super({type: "ChangeOrderInst", game, leader});
        this._instruction = instruction;
    }

    apply(startTick) {
        return new CBChangeOrderAnimation({
            game: this.game, leader:this._leader, instruction: this._instruction, startTick, duration:200
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

        get delay() { return 500; }

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
            spec.orderInstruction = this.orderInstruction;
        }

        fromSpec(spec, context) {
            super.fromSpec(spec, context);
            if (spec.orderInstruction !== undefined) {
                this.orderInstruction = spec.orderInstruction;
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
        if (count===0) {
            this._leader.changeOrderInstruction(this._orderInstruction);
        }
        return false;
    }

}