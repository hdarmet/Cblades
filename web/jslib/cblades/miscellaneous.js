'use strict'

import {
    CBAction,
    CBPiece,
    CBPieceImageArtifact,
    DisplayLocatableMixin,
    PlayableMixin,
    CBAbstractGame
} from "./game.js";
import {
    ActivableArtifactMixin,
    CBHexCounter, CBHexCounterArtifact, CBLevelBuilder,
    RetractableArtifactMixin,
    RetractablePieceMixin
} from "./playable.js";
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

export class CBGroundMarkerArtifact extends CBPieceImageArtifact {

    constructor(counter, path, position, dimension= CBCounterMarkerArtifact.MARKER_DIMENSION) {
        super(counter, "ground", [DImage.getImage(path)], position, dimension);
    }

    get layer() {
        return CBLevelBuilder.GLAYERS.MARKERS;
    }

    static MARKER_DIMENSION = new Dimension2D(64, 64);
}

class BurningArtifact extends ActivableArtifactMixin(CBHexCounterArtifact) {

}

export class CBBurningCounter extends RetractablePieceMixin(CBHexCounter) {

    constructor(images) {
        super("ground", images, CBBurningCounter.DIMENSION);
        Mechanisms.addListener(this);
    }

    createArtifact(levelName, images, position, dimension) {
        return new BurningArtifact(this, levelName, images, position/*.plus(-15, 15)*/, dimension);
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

    _updatePlayed() {
        if (this.isPlayed() && !this._playedArtifact) {
            this._playedArtifact = new CBGroundMarkerArtifact(this, "./../images/markers/actiondone.png",
                new Point2D(CBBurningCounter.DIMENSION.w / 2, -CBBurningCounter.DIMENSION.h / 2));
            this.element.appendArtifact(this._playedArtifact);
        }
        else if (!this.isPlayed() && this._playedArtifact) {
            this.element.deleteArtifact(this._playedArtifact);
            delete this._playedArtifact;
        }
    }

    onMouseClick(event) {
        this.play(event);
    }


    play(event) {
        if (!this.isPlayed()) {
            this._play(event);
        }
    }

    _play(event) {
        this.game.currentPlayer.playSmokeAndFire(this, event);
    }

    _processGlobalEvent(source, event, value) {
        if (event === CBBurningCounter.PLAYED_EVENT) {
            this.markAsPlayed();
        }
        else super._processGlobalEvent(source, event, value);
    }

    markAsPlayed() {
        Memento.register(this);
        if (!this.action) {
            this.launchAction(new CBAction(this.game, this));
            this.action.markAsFinished();
        }
        else {
            this._updatePlayed();
        }
    }

    static DIMENSION = new Dimension2D(142, 142);
    static PLAYED_EVENT = "burning-played";
}

export class CBSmokeCounter extends CBBurningCounter {

    constructor() {
        super([
            "./../images/counters/light-smoke.png",
            "./../images/counters/heavy-smoke.png"
        ]);
    }

    isDense() {
        return this.artifact.imageIndex>0;
    }

    densify() {
        this.artifact.changeImage(1);
        return this;
    }

    disperse() {
        this.artifact.changeImage(0);
        return this;
    }

}

export class CBFireCounter extends CBBurningCounter {

    constructor() {
        super([
            "./../images/counters/start-fire.png",
            "./../images/counters/fire.png"
        ]);
    }

    setFire() {
        this.artifact.changeImage(1);
    }

    isFire() {
        return this.artifact.imageIndex>0;
    }

}

export function BurningMixin(gameClass) {

    return class extends gameClass {

        _memento() {
            let memento = super._memento();
            memento.firePlayed = this._firePlayed
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.firePlayed) {
                this._firePlayed = memento.firePlayed;
            } else {
                delete this._firePlayed;
            }
        }

        changeFirePlayed() {
            Memento.register(this);
            this._firePlayed = true;
        }

        get firePlayed() {
            return this._firePlayed;
        }

        _reset(animation) {
            delete this._firePlayed;
            super._reset(animation);
        }

    }

}

class StakesArtifact extends CBHexCounterArtifact {
}

export class CBStakesCounter extends RetractablePieceMixin(CBHexCounter) {

    constructor() {
        super("ground", ["./../images/counters/stakes.png"], CBStakesCounter.DIMENSION);
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

export class DisplayablePlayableArtifact extends ActivableArtifactMixin(CBPieceImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBDisplayableCounter extends PlayableMixin(DisplayLocatableMixin(CBPiece)) {

    constructor(paths) {
        super("counters", paths, CBDisplayableCounter.DIMENSION);
        Mechanisms.addListener(this);
    }

    createArtifact(levelName, images, position, dimension) {
        return new DisplayablePlayableArtifact(this, levelName, images, position, dimension);
    }

    _updatePlayed() {
        if (this.isPlayed() && !this._playedArtifact) {
            this._playedArtifact = new CBCounterMarkerArtifact(this, "./../images/markers/actiondone.png",
                new Point2D(CBDisplayableCounter.DIMENSION.w / 2, -CBDisplayableCounter.DIMENSION.h / 2));
            this.element.appendArtifact(this._playedArtifact);
            this.artifact.desactivate();
        }
        else if (!this.isPlayed() && this._playedArtifact) {
            this.element.deleteArtifact(this._playedArtifact);
            delete this._playedArtifact;
            this.artifact.activate();
        }
    }

    play(event) {
        if (!this.isPlayed()) {
            this._play(event);
        }
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBWeatherCounter extends CBDisplayableCounter {

    constructor() {
        super([
            "./../images/counters/meteo1.png",
            "./../images/counters/meteo2.png",
            "./../images/counters/meteo3.png",
            "./../images/counters/meteo4.png",
            "./../images/counters/meteo5.png",
            "./../images/counters/meteo6.png"
        ]);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.setImage(game.arbitrator.getWeather(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBAbstractGame.SETTINGS_EVENT && value.weather!==undefined) {
            this.artifact.setImage(value.weather);
        }
    }

    _play(event) {
        this.game.currentPlayer.playWeather(this, event);
    }

}

export class CBFogCounter extends CBDisplayableCounter {

    constructor() {
        super( [
            "./../images/counters/fog0.png",
            "./../images/counters/fog1.png",
            "./../images/counters/fog2.png",
            "./../images/counters/fog3.png"
        ]);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.setImage(game.arbitrator.getFog(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBAbstractGame.SETTINGS_EVENT && value.fog!==undefined) {
            this.artifact.setImage(value.fog-1);
        }
    }

    _play(event) {
        this.game.currentPlayer.playFog(this, event);
    }

}

export class CBWindDirectionCounter extends CBDisplayableCounter {

    constructor() {
        super( [
            "./../images/counters/wind-direction.png"
        ]);
    }

    setOnGame(game) {
        super.setOnGame(game);
        this.artifact.turn(game.arbitrator.getWindDirection(game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBAbstractGame.SETTINGS_EVENT && value.windDirection!==undefined) {
            this.artifact.turn(value.windDirection);
        }
    }

    _play(event) {
        this.game.currentPlayer.playWindDirection(this, event);
    }

}

export class CBWingDisplayablePlayable extends CBDisplayableCounter {

    constructor(wing, paths) {
        super( paths);
        this._wing = wing;
        this.artifact.changeImage(this.getValue(this._wing));
        this._bannerArtifact = new DImageArtifact("counters",
            DImage.getImage(wing.banner),
            new Point2D(
                CBWingDisplayablePlayable.DIMENSION.w/2 - CBWingDisplayablePlayable.BANNER_DIMENSION.w/2 - CBWingDisplayablePlayable.MARGIN,
                0
            ),
            CBWingTirednessCounter.BANNER_DIMENSION
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
        if (event===PlayableMixin.SELECTED_EVENT
            && (source.wing && source.wing === this.wing)) {
            !this.isShown() && this.show(this._game);
        } else if ((event===PlayableMixin.UNSELECTED_EVENT || event===PlayableMixin.DESTROYED_EVENT)
            && (source.wing && source.wing === this.wing)) {
            this.isShown() && this.hide(this._game);
        }
    }

    isFinishable() {
        return this.wing.player!==this.game.currentPlayer || super.isFinishable();
    }

    play(event) {
        if (!this.isPlayed()) {
            this._play(event);
        }
    }

    static BANNER_DIMENSION = new Dimension2D(50, 120);
    static MARGIN =5;
}

export class CBWingTirednessCounter extends CBWingDisplayablePlayable {

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

    _play(event) {
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

export class CBWingMoralCounter extends CBWingDisplayablePlayable {

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

    _play(event) {
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