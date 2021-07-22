'use strict'

import {
    CBAction,
    CBActivableMixin,
    CBCounterImageArtifact, CBGame, CBPlayable, Displayable, RetractableArtifactMixin, RetractableCounterMixin
} from "./game.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Mechanisms
} from "../mechanisms.js";

class FireStartArtifact extends RetractableArtifactMixin(CBCounterImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBFireStart extends RetractableCounterMixin(CBPlayable) {

    constructor() {
        super("ground", ["./../images/actions/start-fire.png"], CBFireStart.DIMENSION);
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
        super("ground", ["./../images/actions/stakes.png"], CBStakes.DIMENSION);
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

export class CBCounterMarkerArtifact extends CBCounterImageArtifact {

    constructor(counter, path, position, dimension= CBCounterMarkerArtifact.MARKER_DIMENSION) {
        super(counter, "counter-markers", [DImage.getImage(path)], position, dimension);
    }

}
CBCounterMarkerArtifact.MARKER_DIMENSION = new Dimension2D(64, 64);

class WeatherArtifact extends CBActivableMixin(CBCounterImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBWeather extends Displayable(CBPlayable) {

    constructor() {
        super("counters", [
            "./../images/counters/meteo1.png",
            "./../images/counters/meteo2.png",
            "./../images/counters/meteo3.png",
            "./../images/counters/meteo4.png",
            "./../images/counters/meteo5.png",
            "./../images/counters/meteo6.png"
        ], CBWeather.DIMENSION);
        Mechanisms.addListener(this);
    }

    createArtifact(levelName, images, position, dimension) {
        return new WeatherArtifact(this, levelName, images, position, dimension);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.setImage(game.arbitrator.getWeather(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBGame.SETTINGS_EVENT && value.weather!==undefined) {
            this.artifact.setImage(value.weather);
        }
    }

    play(event) {
        this.game.currentPlayer.playWeather(this, event);
    }

    markAsPlayed() {
        super.markAsPlayed();
        this._marker = new CBCounterMarkerArtifact(this, "./../images/markers/actiondone.png",
            new Point2D(CBWeather.DIMENSION.w/2, -CBWeather.DIMENSION.h/2));
        this.element.appendArtifact(this._marker);
        this.artifact.desactivate();
        Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHED);
    }

    reset() {
        super.reset();
        this.artifact.activate();
        if (this._marker) {
            this.element.deleteArtifact(this._marker);
        }
    }

    _memento() {
        let memento = super._memento();
        memento.marker = this._marker;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento.marker) {
            this._marker = memento.marker;
        }
        else {
            delete this._marker;
        }
    }

}
CBWeather.DIMENSION = new Dimension2D(142, 142);

class FogArtifact extends CBActivableMixin(CBCounterImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBFog extends Displayable(CBPlayable) {

    constructor() {
        super("counters", [
            "./../images/counters/fog0.png",
            "./../images/counters/fog1.png",
            "./../images/counters/fog2.png",
            "./../images/counters/fog3.png"
        ], CBFog.DIMENSION);
        Mechanisms.addListener(this);
    }

    createArtifact(levelName, images, position, dimension) {
        return new FogArtifact(this, levelName, images, position, dimension);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.setImage(game.arbitrator.getFog(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBGame.SETTINGS_EVENT && value.fog!==undefined) {
            this.artifact.setImage(value.fog);
        }
    }

    play(event) {
        this.game.currentPlayer.playFog(this, event);
    }

    markAsPlayed() {
        super.markAsPlayed();
        this._marker = new CBCounterMarkerArtifact(this, "./../images/markers/actiondone.png",
            new Point2D(CBWeather.DIMENSION.w/2, -CBWeather.DIMENSION.h/2));
        this.element.appendArtifact(this._marker);
        this.artifact.desactivate();
        Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHED);
    }

    reset() {
        super.reset();
        this.artifact.activate();
        if (this._marker) {
            this.element.deleteArtifact(this._marker);
        }
    }

    _memento() {
        let memento = super._memento();
        memento.marker = this._marker;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento.marker) {
            this._marker = memento.marker;
        }
        else {
            delete this._marker;
        }
    }

}
CBFog.DIMENSION = new Dimension2D(142, 142);
