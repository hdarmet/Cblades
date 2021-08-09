'use strict'

import {
    CBAbstractUnit,
    CBAction,
    CBActivableMixin,
    CBPiece,
    CBPieceImageArtifact,
    CBGame,
    CBHexCounter,
    DisplayLocatableMixin,
    RetractableArtifactMixin,
    RetractablePieceMixin,
    PlayableMixin
} from "./game.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    DImageArtifact
} from "../board.js";
import {
    CBWing
} from "./unit.js";

class FireStartArtifact extends RetractableArtifactMixin(CBPieceImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBFireStart extends RetractablePieceMixin(CBHexCounter) {

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

    static DIMENSION = new Dimension2D(142, 142);
}

class StakesArtifact extends RetractableArtifactMixin(CBPieceImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBStakes extends RetractablePieceMixin(CBHexCounter) {

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

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBCounterMarkerArtifact extends CBPieceImageArtifact {

    constructor(counter, path, position, dimension= CBCounterMarkerArtifact.MARKER_DIMENSION) {
        super(counter, "counter-markers", [DImage.getImage(path)], position, dimension);
    }

    static MARKER_DIMENSION = new Dimension2D(64, 64);
}

export class DisplayablePlayableArtifact extends CBActivableMixin(CBPieceImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBDisplayableCounter extends PlayableMixin(DisplayLocatableMixin(CBPiece)) {

    constructor(paths, dimension) {
        super("counters", paths, dimension);
        Mechanisms.addListener(this);
    }

    createArtifact(levelName, images, position, dimension) {
        return new DisplayablePlayableArtifact(this, levelName, images, position, dimension);
    }

    isCurrentPlayer() {
        return true;
    }

    markAsPlayed() {
        Memento.register(this);
        this._updatePlayed();
    }

    _updatePlayed() {
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
            delete this._marker;
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

export class CBWeather extends CBDisplayableCounter {

    constructor() {
        super([
            "./../images/counters/meteo1.png",
            "./../images/counters/meteo2.png",
            "./../images/counters/meteo3.png",
            "./../images/counters/meteo4.png",
            "./../images/counters/meteo5.png",
            "./../images/counters/meteo6.png"
        ], CBWeather.DIMENSION);
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

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBFog extends CBDisplayableCounter {

    constructor() {
        super( [
            "./../images/counters/fog0.png",
            "./../images/counters/fog1.png",
            "./../images/counters/fog2.png",
            "./../images/counters/fog3.png"
        ], CBFog.DIMENSION);
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

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBWindDirection extends CBDisplayableCounter {

    constructor() {
        super( [
            "./../images/counters/wind-direction.png"
        ], CBWindDirection.DIMENSION);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.turn(game.arbitrator.getWindDirection(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBGame.SETTINGS_EVENT && value.windDirection!==undefined) {
            this.artifact.turn(value.windDirection);
        }
    }

    play(event) {
        this.game.currentPlayer.playWindDirection(this, event);
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBWingDisplayablePlayable extends CBDisplayableCounter {

    constructor(wing, paths) {
        super( paths, CBWingTiredness.DIMENSION);
        this._wing = wing;
        this.artifact.changeImage(this.getValue(this._wing));
        this._bannerArtifact = new DImageArtifact("counters",
            DImage.getImage(wing.banner),
            new Point2D(
                CBWingDisplayablePlayable.DIMENSION.w/2 - CBWingDisplayablePlayable.BANNER_DIMENSION.w/2 - CBWingDisplayablePlayable.MARGIN,
                0
            ),
            CBWingTiredness.BANNER_DIMENSION
        );
        this.element.addArtifact(this._bannerArtifact);
    }

    get wing() {
        return this._wing;
    }

    registerOnGame(game) {
        this._game = game;
        game._registerPlayable(this);
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBAbstractUnit.SELECTED_EVENT) {
            console.log(event);
        }
        if (event===CBAbstractUnit.SELECTED_EVENT
            && (source.wing && source.wing === this.wing)) {
            !this.isShown() && this.show(this._game);
        } else if ((event===CBAbstractUnit.UNSELECTED_EVENT || event===CBAbstractUnit.DESTROYED_EVENT)
            && (source.wing && source.wing === this.wing)) {
            this.isShown() && this.hide(this._game);
        }
    }

    isFinishable() {
        return this.wing.player!==this.game.currentPlayer || super.isFinishable();
    }

    static DIMENSION = new Dimension2D(142, 142);
    static BANNER_DIMENSION = new Dimension2D(50, 120);
    static MARGIN =5;
}

export class CBWingTiredness extends CBWingDisplayablePlayable {

    constructor(wing) {
        super(wing, [
            "./../images/counters/tiredness4.png",
            "./../images/counters/tiredness5.png",
            "./../images/counters/tiredness6.png",
            "./../images/counters/tiredness7.png",
            "./../images/counters/tiredness8.png",
            "./../images/counters/tiredness9.png",
            "./../images/counters/tiredness10.png",
            "./../images/counters/tiredness11.png"
        ]);
    }

    getValue(wing) {
        return wing.tiredness-4
    }

    play(event) {
        if (this.wing.tiredness===11) {
            this.markAsPlayed();
        }
        else {
            this.game.currentPlayer.playTiredness(this, event);
        }
    }

    _processGlobalEvent(source, event, value) {
        super._processGlobalEvent(source, event, value);
        if (event===CBWing.TIREDNESS_EVENT) {
            this.artifact.changeImage(this.getValue(this._wing));
        }
    }

    isFinishable() {
        return this.wing.tiredness===11 || super.isFinishable();
    }
}

export class CBWingMoral extends CBWingDisplayablePlayable {

    constructor(wing) {
        super(wing, [
            "./../images/counters/moral4.png",
            "./../images/counters/moral5.png",
            "./../images/counters/moral6.png",
            "./../images/counters/moral7.png",
            "./../images/counters/moral8.png",
            "./../images/counters/moral9.png",
            "./../images/counters/moral10.png",
            "./../images/counters/moral11.png"
        ]);
    }

    getValue(wing) {
        return wing.moral-4
    }

    play(event) {
        if (this.wing.moral===11) {
            this.markAsPlayed();
        }
        else {
            this.game.currentPlayer.playMoral(this, event);
        }
    }

    _processGlobalEvent(source, event, value) {
        super._processGlobalEvent(source, event, value);
        if (event===CBWing.MORAL_EVENT) {
            this.artifact.changeImage(this.getValue(this._wing));
        }
    }

    isFinishable() {
        return this.wing.moral===11 || super.isFinishable();
    }
}