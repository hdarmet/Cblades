'use strict'

import {
    WAction,
    WPiece,
    WPieceImageArtifact,
    DisplayLocatableMixin,
    PlayableMixin,
    WAbstractGame
} from "../wargame/game.js";
import {
    ActivableArtifactMixin,
    WHexCounter, WHexCounterArtifact, WLevelBuilder,
    RetractablePieceMixin
} from "../wargame/playable.js";
import {
    Dimension2D, Point2D
} from "../board/geometry.js";
import {
    DImage
} from "../board/draw.js";
import {
    Mechanisms, Memento
} from "../board/mechanisms.js";
import {
    DImageArtifact
} from "../board/board.js";
import {
    CBWing
} from "./unit.js";

export class CBGroundMarkerArtifact extends WPieceImageArtifact {

    constructor(counter, path, position, dimension= CBCounterMarkerArtifact.DIMENSION) {
        super(counter, "ground", [DImage.getImage(path)], position, dimension);
    }

    get layer() {
        return WLevelBuilder.GLAYERS.MARKERS;
    }

    static DIMENSION = new Dimension2D(64, 64);
}

class BurningArtifact extends ActivableArtifactMixin(WHexCounterArtifact) {

}

export class CBBurningCounter extends RetractablePieceMixin(WHexCounter) {

    constructor(game, images) {
        super("ground", game, images, CBBurningCounter.DIMENSION);
        Mechanisms.addListener(this);
    }

    cancel() {
        super.cancel();
        Mechanisms.removeListener(this);
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

    play(point) {
        if (!this.isPlayed()) {
            this._play(point);
        }
    }

    _play(point) {
        this.game.currentPlayer.playSmokeAndFire(this);
    }

    _processGlobalEvent(source, event, value) {
        if (event === CBBurningCounter.PLAYED_EVENT) {
            this.setPlayed();
        }
        else super._processGlobalEvent && super._processGlobalEvent(source, event, value);
    }

    setPlayed() {
        Memento.register(this);
        if (!this.action) {
            this.launchAction(new WAction(this.game, this));
            this.action.markAsFinished();
        }
        else {
            this._updatePlayed();
        }
    }

    fromSpecs(specs, context) {
        this.angle = specs.angle;
        this._oid = specs.id;
        this._oversion = specs.version;
        if (specs.played) this.setPlayed();
        return this;
    }

    toSpecs() {
        let specs = {
            id: this._oid,
            version: this._oversion || 0,
            angle: this.angle,
            played: this.isPlayed()
        }
        if (this.getPosition()) {
            specs.positionCol = this.getPosition().col;
            specs.positionRow = this.getPosition().row;
        }
        return specs;
    }

    getPosition() {
        return this.hexLocation ? {
            col: this.hexLocation.col,
            row: this.hexLocation.row
        } : null;
    }

    static DIMENSION = new Dimension2D(142, 142);
    static PLAYED_EVENT = "burning-played";
}

export class CBSmokeCounter extends CBBurningCounter {

    constructor(game) {
        super(game, [
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

    toSpecs() {
        return {
            ... super.toSpecs(),
            type: "smoke",
            density: this.isDense()
        }
    }

    fromSpecs(specs, context) {
        super.fromSpecs(specs, context);
        if (specs.density) this.densify();
        return this;
    }

}
WHexCounter.registerTokenType("smoke", CBSmokeCounter);

export class CBFireCounter extends CBBurningCounter {

    constructor(game) {
        super(game, [
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

    toSpecs() {
        return {
            ... super.toSpecs(),
            type: "fire",
            fire: this.isFire()
        }
    }

    fromSpecs(specs, context) {
        super.fromSpecs(specs, context);
        if (specs.fire) this.setFire();
        return this;
    }

}
WHexCounter.registerTokenType("fire", CBFireCounter);

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

class StakesArtifact extends WHexCounterArtifact {

}

export class CBObstacleCounter extends RetractablePieceMixin(WHexCounter) {

    toSpecs() {
        let specs = {
            id: this._oid,
            version: this._oversion || 0,
            angle: this.angle
        }
        if (this.getPosition()) {
            specs.positionCol = this.getPosition().col;
            specs.positionRow = this.getPosition().row;
        }
        return specs;
    }

    fromSpecs(specs, context) {
        this.angle = specs.angle;
        this._oid = specs.id;
        this._oversion = specs.version;
        return this;
    }

    getPosition() {
        return this.hexLocation ? {
            col: this.hexLocation.col,
            row: this.hexLocation.row
        } : null;
    }

    isFinishable() {
        return true;
    }

}

export class CBStakesCounter extends CBObstacleCounter {

    constructor(game) {
        super("ground", game, ["./../images/counters/stakes.png"], CBStakesCounter.DIMENSION);
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

    toSpecs() {
        return {
            ... super.toSpecs(),
            type: "stakes"
        }
    }

    fromSpecs(specs, context) {
        super.fromSpecs(specs, context);
        this.angle = specs.angle;
        this._oid = specs.id;
        this._oversion = specs.version;
        return this;
    }

}
WHexCounter.registerTokenType("stakes", CBStakesCounter);

export class CBCounterMarkerArtifact extends WPieceImageArtifact {

    constructor(counter, path, position, dimension= CBCounterMarkerArtifact.DIMENSION) {
        super(counter, "counter-markers", [DImage.getImage(path)], position, dimension);
    }

    static DIMENSION = new Dimension2D(64, 64);
}

export class DisplayablePlayableArtifact extends ActivableArtifactMixin(WPieceImageArtifact) {

    constructor(fire, ...args) {
        super(fire, ...args);
    }

}

export class CBDisplayableCounter extends PlayableMixin(DisplayLocatableMixin(WPiece)) {

    constructor(game, paths) {
        super("counters", game, paths, CBDisplayableCounter.DIMENSION);
        Mechanisms.addListener(this);
    }

    cancel() {
        super.cancel();
        Mechanisms.removeListener(this);
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

    play(point) {
        if (!this.isPlayed()) {
            this._play(point);
        }
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBWeatherCounter extends CBDisplayableCounter {

    constructor(game) {
        super(game, [
            "./../images/counters/meteo1.png",
            "./../images/counters/meteo2.png",
            "./../images/counters/meteo3.png",
            "./../images/counters/meteo4.png",
            "./../images/counters/meteo5.png",
            "./../images/counters/meteo6.png"
        ]);
    }

    setOnGame() {
        super.setOnGame();
        this.artifact.setImage(this.game.arbitrator.getWeather(this.game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===WAbstractGame.SETTINGS_EVENT && value.weather!==undefined) {
            this.artifact.setImage(value.weather);
        }
    }

    _play(point) {
        this.game.currentPlayer.playWeather(this);
    }

}

export class CBFogCounter extends CBDisplayableCounter {

    constructor(game) {
        super( game, [
            "./../images/counters/fog0.png",
            "./../images/counters/fog1.png",
            "./../images/counters/fog2.png",
            "./../images/counters/fog3.png"
        ]);
    }

    setOnGame() {
        super.setOnGame();
        this.artifact.setImage(this.game.arbitrator.getFog(this.game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===WAbstractGame.SETTINGS_EVENT && value.fog!==undefined) {
            this.artifact.setImage(value.fog-1);
        }
    }

    _play(point) {
        this.game.currentPlayer.playFog(this);
    }

}

export class CBWindDirectionCounter extends CBDisplayableCounter {

    constructor(game) {
        super( game, [
            "./../images/counters/wind-direction.png"
        ]);
    }

    setOnGame() {
        super.setOnGame();
        this.artifact.turn(this.game.arbitrator.getWindDirection(this.game));
    }

    _processGlobalEvent(source, event, value) {
        if (event===WAbstractGame.SETTINGS_EVENT && value.windDirection!==undefined) {
            this.artifact.turn(value.windDirection);
        }
    }

    _play(point) {
        this.game.currentPlayer.playWindDirection(this);
    }

}

export class CBWingDisplayablePlayable extends CBDisplayableCounter {

    constructor(wing, paths) {
        super(wing.player.game, paths);
        this._wing = wing;
        this.artifact.changeImage(this.getValue(this._wing));
        this._bannerArtifact = new DImageArtifact("counters",
            DImage.getImage(wing.banner.path),
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

    play(point) {
        if (!this.isPlayed()) {
            this._play(point);
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

    _play(point) {
        if (this.wing.tiredness===11) {
            this.setPlayed();
        }
        else {
            this.game.currentPlayer.playTiredness(this);
        }
    }

    _processGlobalEvent(source, event, value) {
        super._processGlobalEvent && super._processGlobalEvent(source, event, value);
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

    _play(point) {
        if (this.wing.moral===11) {
            this.setPlayed();
        }
        else {
            this.game.currentPlayer.playMoral(this);
        }
    }

    _processGlobalEvent(source, event, value) {
        super._processGlobalEvent && super._processGlobalEvent(source, event, value);
        if (event===CBWing.MORAL_EVENT) {
            this.artifact.changeImage(this.getValue(this._wing));
        }
    }

    isFinishable() {
        return this.wing.moral===11 || super.isFinishable();
    }
}
