'use strict'

import {
    Mechanisms,
    Memento
} from "../mechanisms.js";
import {
    CBGame
} from "./playable.js";
import {
    SequenceLoader
} from "./loader.js";
import {
    DAnimation
} from "../draw.js";
import {
    diffAngle, Point2D
} from "../geometry.js";

export class CBSequence {

    static appendElement(game, sequence) {
        if (!game._sequence) {
            game._sequence = new CBSequence(game);
        }
        game._sequence.appendElement(sequence);
    }

    constructor(game) {
        this._game = game;
        this._elements = [];
        Mechanisms.addListener(this);
    }

    addElement(element) {
        this._elements.push(element);
        element.game = this._game;
    }

    appendElement(element) {
        Memento.register(this);
        this._elements.push(element);
        element.game = this._game;
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

    _processGlobalEvent(source, event, value) {
        if (event===CBGame.VALIDATION_EVENT) {
            new SequenceLoader().save(this._game, this);
            Mechanisms.removeListener(this._game._sequence);
            delete this._game._sequence;
        }
    }

    replay(action) {
        let tick = 0;
        let animation;
        for (let element of this.elements) {
            animation = element.apply(tick);
            tick += element.delay/20 +2;
        }
        if (action && animation) {
            animation.setFinalAction(action);
        }
    }

}

export class CBStateSequenceElement {

    constructor(unit) {
        this.type = "State";
        this.unit = unit;
        this.cohesion = unit.cohesion;
        this.tiredness = unit.tiredness;
        this.munitions = unit.munitions;
        this.charging = unit.charging;
        this.engaging = unit.engaging;
        this.orderGiven = unit.orderGiven;
        this.played = unit.played;
    }

    apply(startTick) {
        return new CBUnitAnimation(this.unit, startTick, this.delay, this);
    }

    get delay() { return 0; }

    getUnit() {
        this.game.getUnit(this.unit);
    }

}

export class CBMoveSequenceElement extends CBStateSequenceElement {

    constructor(unit, hexLocation, stacking) {
        super(unit);
        this.type = "Move";
        this.hexLocation = hexLocation;
        this.stacking = stacking;
    }

    apply(startTick) {
        return new CBUnitAnimation(this.unit, startTick, this.delay, this, undefined, this.hexLocation, this.stacking);
    }

    get delay() { return 500; }

}

export class CBRotateSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle) {
        super(unit);
        this.type = "Rotate";
        this.angle = angle;
    }

    apply(startTick) {
        return new CBUnitAnimation(this.unit, startTick, this.delay, this, this.angle);
    }

    get delay() { return 500; }

}

export class CBReorientSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle) {
        super(unit);
        this.type = "Reorient";
        this.angle = angle;
    }

    apply(startTick) {
        return new CBUnitAnimation(this.unit, startTick, this.delay, this, this.angle);
    }

    get delay() { return 500; }

}

export class CBTurnSequenceElement extends CBStateSequenceElement {

    constructor(unit, angle, stacking) {
        super(unit);
        this.type = "Turn";
        this.angle = angle;
        this.hexLocation = unit.hexLocation;
        this.stacking = stacking;
    }

    apply(startTick) {
        return new CBUnitAnimation(this.unit, startTick, this.delay, this, this.angle, this.hexLocation, this.stacking);
    }

    get delay() { return 500; }

}

export class CBUnitAnimation extends DAnimation {

    constructor(unit, startTick, duration, state, angle, hexLocation, stacking) {
        super();
        this._unit = unit;
        this._angle = angle;
        this._hexLocation = hexLocation;
        this._stacking = stacking;
        this._state = state;
        this._duration = duration;
        this.play(startTick+1);
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
        this._unit.setState(this._state);
        delete this._unit._animation;
    }

    _factor(count) {
        return (this._duration === 0) ? 0 : (count * 20)/this._duration;
    }

    draw(count, ticks) {
        let factor = this._factor(count);
        console.log(factor);
        if (this._startAngle) {
            this._unit.element.setAngle(this._startAngle + factor*diffAngle(this._startAngle, this._stopAngle));
        }
        if (this._startLocation) {
            this._unit.element.setLocation(new Point2D(
                this._startLocation.x + factor*(this._stopLocation.x-this._startLocation.x),
                this._startLocation.y + factor*(this._stopLocation.y-this._startLocation.y)
                ));
        }
        return count * 20 >= this._duration ? 0 : 1;
    }

}
