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

    constructor(type) {
        this.type = type;
    }

    equalsTo(element) {
        if (this.type !== element.type) return false;
        return true;
    }

    toString() {
        return "{ "+this._toString()+" }";
    }

    _toString() {
        let result = "Type: "+this.type;
        return result;
    }

}

export class CBStateSequenceElement extends CBSequenceElement {

    constructor(unit, type="State") {
        super(type);
        this.unit = unit;
        this.cohesion = unit.cohesion;
        this.tiredness = unit.tiredness;
        this.munitions = unit.munitions;
        this.charging = unit.charge;
        this.engaging = unit.isEngaging();
        this.orderGiven = unit.hasReceivedOrder();
        this.played = unit.isPlayed();
    }

    setState(state) {
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
        return new CBUnitAnimation(this.unit, startTick, this.delay, this);
    }

    get delay() { return 0; }

    getUnit() {
        return this.unit;
    }

}

export class CBMoveSequenceElement extends CBStateSequenceElement {

    constructor(unit, hexLocation, stacking) {
        super(unit, "Move");
        this.hexLocation = hexLocation;
        this.stacking = stacking;
    }

    apply(startTick) {
        return new CBMoveAnimation(this.unit, startTick, this.delay, this, undefined, this.hexLocation, this.stacking);
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
        if (this.stacking !== undefined) result+=", HexLocation: "+this.hexLocation.location.toString();
        if (this.stacking !== undefined) result+=", Stacking: "+this.stacking;
        return result;
    }

}

export class CBRotateSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle) {
        super(unit, "Rotate");
        this.angle = angle;
    }

    apply(startTick) {
        return new CBMoveAnimation(this.unit, startTick, this.delay, this, this.angle);
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

}

export class CBReorientSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle) {
        super(unit, "Reorient");
        this.angle = angle;
    }

    apply(startTick) {
        return new CBMoveAnimation(this.unit, startTick, this.delay, this, this.angle);
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
}

export class CBTurnSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle, hexLocation, stacking) {
        super(unit);
        this.type = "Turn";
        this.angle = angle;
        this.hexLocation = hexLocation;
        this.stacking = stacking;
    }

    apply(startTick) {
        return new CBMoveAnimation(this.unit, startTick, this.delay, this, this.angle, this.hexLocation, this.stacking);
    }

    get delay() { return 500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.hexLocation.location.toString() !== element.hexLocation.location.toString()) return false;
        if (this.stacking !== element.stacking) return false;
        if (this.angle !== element.angle) return false;
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.hexLocation !== undefined) result+=", HexLocation: "+this.hexLocation.location.toString();
        if (this.stacking !== undefined) result+=", Stacking: "+this.stacking;
        if (this.angle !== undefined) result+=", Angle: "+this.angle;
        return result;
    }

}

export class CBUnitAnimation extends DAnimation {

    constructor(unit, startTick, duration, state) {
        super();
        this._unit = unit;
        this._state = state;
        this._duration = duration;
        this._tick = startTick+1;
    }

    get tick() {
        return this._tick;
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

    constructor(unit, startTick, duration, state, angle, hexLocation, stacking) {
        super(unit, startTick, duration, state);
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

    constructor(game) {
        super("NextTurn");
        this.game = game;
    }

    apply(startTick) {
        return new CBNextTurnAnimation(this.game, startTick, this.delay);
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

export class CBNextTurnAnimation extends DAnimation {

    constructor(game, startTick, duration) {
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

export class CBRestSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Rest");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new InteractiveRestingAction(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBRefillSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Refill");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new InteractiveReplenishMunitionsAction(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBRallySequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Rally");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new InteractiveRallyAction(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBReorganizeSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Reorganize");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new InteractiveReorganizeAction(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBLoseCohesionSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "LossConsistency");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBLoseCohesionChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBConfrontSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Confront");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBConfrontChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBCrossingSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Crossing");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBLoseCohesionForCrossingChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBAttackerEngagementSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "AttackerEngagement");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBAttackerEngagementChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBDefenderEngagementSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "DefenderEngagement");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBDefenderEngagementChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBDisengagementSequenceElement extends CBStateSequenceElement {

    constructor(game, unit, dice) {
        super(unit, "Disengagement");
        this._game = game;
        this._dice = dice;
    }

    apply(startTick) {
        return new CBSceneAnimation(this.unit, startTick, this.delay, this, this._game,
            ()=>new CBDisengagementChecking(this._game, this.unit).replay(this.dice)
        );
    }

    get dice() { return this._dice; }

    get delay() { return 2500; }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        for (let index=0; index<this._dice.length; index++) {
            if (element[index] !== this._dice[index]) return false;
        }
        return true;
    }

    _toString() {
        let result = super._toString();
        for (let index=0; index<this._dice.length; index++) {
            result+=`, dice${index}: `+this._dice[index];
        }
        return result;
    }

}

export class CBSceneAnimation extends CBUnitAnimation {

    constructor(unit, startTick, duration, state, game, recoveringAnimation) {
        super(unit, startTick, duration, state);
        this._game = game;
        this._recoveringAnimation = recoveringAnimation;
        this.play(this.tick);
    }

    draw(count, ticks) {
        if (count===0) {
            this._recoveringAnimation();
        }
        return super.draw(count, ticks);
    }

    _finalize() {
        this._game.closePopup();
        super._finalize();
    }

}