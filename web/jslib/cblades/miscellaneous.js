'use strict'

import {
    CBCounterImageArtifact, CBPlayable, RetractableArtifactMixin, RetractableCounterMixin
} from "./game.js";
import {
    Dimension2D
} from "../geometry.js";

class FireStartArtifact extends RetractableArtifactMixin(CBCounterImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBFireStart extends RetractableCounterMixin(CBPlayable) {

    constructor() {
        super("ground", ['/CBlades/images/actions/start-fire.png'], CBFireStart.DIMENSION);
    }

    createArtifact(levelName, images, position, dimension) {
        return new FireStartArtifact(this, levelName, images, position/*.plus(-15, 15)*/, dimension);
    }

    /*
    _memento() {
        let memento = super._memento();
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
    }
    */

}
CBFireStart.DIMENSION = new Dimension2D(142, 142);

class StakesArtifact extends RetractableArtifactMixin(CBCounterImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBStakes extends RetractableCounterMixin(CBPlayable) {

    constructor() {
        super("ground", ['/CBlades/images/actions/stakes.png'], CBStakes.DIMENSION);
    }

    createArtifact(levelName, images, position, dimension) {
        return new StakesArtifact(this, levelName, images, position/*.plus(-15, 15)*/, dimension);
    }

    /*
    _memento() {
        let memento = super._memento();
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
    }
    */

}
CBStakes.DIMENSION = new Dimension2D(142, 142);
