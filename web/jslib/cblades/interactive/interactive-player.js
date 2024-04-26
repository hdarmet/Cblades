import {
    diffAngle,
    Dimension2D, Point2D
} from "../../board/geometry.js";
import {
    DDice6, DIconMenu, DMultiImagesIndicator, DMask, DResult, DScene, DRotatableIndicator
} from "../../board/widget.js";
import {
    Mechanisms, Memento
} from "../../board/mechanisms.js";
import {
    WAbstractGame
} from "../../wargame/game.js";
import {
    DBoard, DImageArtifact
} from "../../board/board.js";
import {
    DImage
} from "../../board/draw.js";
import {
    WInsert
} from "../../wargame/playable.js";
import {
    CBStateSequenceElement,
    CBUnitPlayer
} from "../unit.js";
import {
    WNextTurnSequenceElement, WSequence, WSequenceElement
} from "../../wargame/sequences.js";
import {
    SequenceLoader
} from "../loader.js";
import {
    CBWeather, CBFog
} from "../weather.js";
import {
    WUnitAnimation, WUnitSceneAnimation
} from "../../wargame/wunit.js";

export class CBInteractivePlayer extends CBUnitPlayer {

    _doDestroyedChecking(unit, hexLocation) {
        if (this.game.arbitrator.doesADestroyedUnitHaveNonRoutedNeighbors(unit, hexLocation)) {
            this._checkIfNeighborsLoseCohesion(unit, hexLocation, () => {
                this.game.validate();
            }, false);
        }
    }

    losePlayable(playable) {
        let hexLocation = playable.hexLocation;
        super.losePlayable(playable);
        this._doDestroyedChecking(playable, hexLocation);
    }

    _doDisruptChecking(unit, processing, cancellable) {
        if (!unit.attrs.routChecked && this.game.arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit)) {
            new CBLoseCohesionChecking(this.game, unit).play(
            () => {
                unit.attrs.routChecked = true;
                this._selectAndFocusPlayable(unit);
            },
            processing,
            CBRoutCheckingSequenceElement,
            cancellable);
        }
        else {
            processing();
        }
    }

    _doRoutChecking(unit, processing, cancellable) {
        if (this.game.arbitrator.doesARoutedUnitHaveNonRoutedNeighbors(unit)) {
            this._checkIfNeighborsLoseCohesion(unit, unit.hexLocation, () => {
                this._selectAndFocusPlayable(unit);
                this.game.validate();
                this._doDisruptChecking(unit, processing, false);
            },
            cancellable);
        }
        else {
            this._doDisruptChecking(unit, processing, cancellable);
        }
    }

    routNeighborsChecking(unit, neighbors) {
        this._checkIfAFirstNonRoutedNeighborLoseCohesion(unit, neighbors,
            () => {
                this._selectAndFocusPlayable(unit);
                this.game.validate();
                this._doDisruptChecking(unit, () => {
                    this.launchPlayableAction(unit, unit.viewportLocation);
                }, false);
            }, false);
    }

    _checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable) {
        if (neighbors.length) {
            let neighbor = neighbors.pop();
            new CBLoseCohesionChecking(this.game, neighbor).play(
                () => {
                    neighbor.attrs.routChecked = true;
                },
                ()=>this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, false),
                CBNeighborRoutCheckingSequenceElement,
                cancellable);
        }
        else {
            processing();
        }
    }

    _checkIfAFirstNonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable) {
        neighbors = neighbors.filter(neighbor=>!neighbor.attrs.routChecked);
        if (!unit.attrs.neighborsCohesionLoss && neighbors.length) {
            let neighbor = neighbors.pop();
            new CBLoseCohesionChecking(this.game, neighbor).play(
            () => {
                neighbor.attrs.routChecked = true;
                if (!unit.attrs.neighborsRootChecked) {
                    unit.attrs.neighborsRootChecked = true;
                    WSequence.appendElement(this.game, new CBRootNeighborsCohesionSequenceElement({
                        unit, game: this.game, neighbors
                    }));
                }
                this._selectAndFocusPlayable(unit);
            },
            ()=>this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, false),
                CBNeighborRoutCheckingSequenceElement,
                cancellable);
        }
        else {
            processing();
        }
    }

    _checkIfNeighborsLoseCohesion(unit, hexLocation, processing, cancellable) {
        if (!unit.attrs.neighborsRootChecked) {
            let neighbors = this.game.arbitrator.getFriendNonRoutedNeighbors(unit, hexLocation);
            this._checkIfAFirstNonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable);
        }
    }

    _doEngagementChecking(unit, processing) {
        if (!unit.attrs.defenderEngagementChecking && this.game.arbitrator.isUnitEngaged(unit, true)) {
            new CBDefenderEngagementChecking(this.game, unit).play(() => {
                unit.setEngaging(false);
                unit.attrs.defenderEngagementChecking = true;
                let hexLocation = unit.hexLocation;
                if (unit.isOnHex()) {
                    this._selectAndFocusPlayable(unit);
                    this.game.validate();
                    this._doRoutChecking(unit, processing, false);
                }
            });
        }
        else {
            this._doRoutChecking(unit, processing, true);
        }
    }

    _doPreliminaryActions(unit, processing) {
        this._doEngagementChecking(unit, processing);
    }

    _selectAndFocusPlayable(playable) {
        playable.attrs.focused = true;
        this.game.setSelectedPlayable(playable);
        this.game.setFocusedPlayable(playable);
    }

    startActivation(playable, action) {
        if (playable.unitNature) {
            this._doPreliminaryActions(playable, () => super.startActivation(playable, action));
        }
        else {
            action();
        }
    }

    launchPlayableAction(playable, point) {
        if (playable.unitNature) {
            if (!playable.isDestroyed()) {
                this.openActionMenu(playable, point, this.game.arbitrator.getAllowedActions(playable));
            }
        }
        else {
            playable.play(point);
        }
    }

    canFinishPlayable(playable) {
        return !this.game.arbitrator.canPlayUnit(playable);
    }

    finishTurn(animation) {
        let playable = this.game.selectedPlayable;
        let finishTurn = () => {
            WSequence.appendElement(this.game, new WNextTurnSequenceElement({game: this.game}));
            new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
            super.finishTurn(animation);
        }
        if (playable) {
            this.afterActivation(playable, () => {
                playable.finish();
                finishTurn();
            });
        }
        else {
            finishTurn();
        }
    }

    openActionMenu(unit, offset, actions) {
        let popup = new CBActionMenu(this.game, unit, actions);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + WAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + WAbstractGame.POPUP_MARGIN));
    }

    canPlay() {
        return true;
    }

}

export class CBDefenderEngagementChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(mask);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(this.unit);
        scene.addWidget(
            new CBCheckDefenderEngagementInsert(condition), new Point2D(-CBCheckDefenderEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this.game.arbitrator.processDefenderEngagementResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action) {
        let scene;
        scene = this.createScene(
            success=>{
                if (!success) {
                    this.unit.addOneCohesionLevel();
                }
                WSequence.appendElement(this.game, new CBDefenderEngagementSequenceElement({
                    game: this.game, unit:this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                this.game.closePopup();
                if (scene.result.finished) {
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

}

export class CBLoseCohesionChecking {

    constructor(game, unit) {
        this.game = game;
        this.unit = unit;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        this.game.openMask(mask);
        let condition = this.game.arbitrator.getUnitCohesionLostCondition(this.unit);
        scene.addWidget(
            new CBLoseCohesionInsert(condition), new Point2D(-CBLoseCohesionInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this.game.arbitrator.processCohesionLostResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action, processing, sequenceElement, cancellable) {
        let scene
        scene = this.createScene(
            success=>{
                action();
                if (!success) {
                    this.unit.addOneCohesionLevel();
                }
                WSequence.appendElement(this.game, new sequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                if (cancellable && !scene.result.finished) {
                    Memento.undo();
                }
                else if (scene.result.finished) {
                    this.game.closePopup();
                    processing();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

}

export class CBActionMenu extends DIconMenu {

    constructor(game, unit, actions) {
        let menuItems = [];
        for (let builder of CBActionMenu.menuBuilders) {
            menuItems.push(...builder(unit, actions));
        }
        super(false, ...menuItems);
        this._game = game;
        Mechanisms.addListener(this);
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.ZOOM_EVENT || event===DBoard.SCROLL_EVENT) {
            this._game.closePopup();
        }
    }

    close() {
        super.close();
        Mechanisms.removeListener(this);
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

    static menuBuilders = []
}

export class CBWingIndicator extends DMultiImagesIndicator {

    constructor(wing, paths) {
        super(paths, CBWingIndicator.DIMENSION, 0);
        this.artifact.changeImage(this._getValue(wing));
        this._bannerArtifact = new DImageArtifact("widgets",
            DImage.getImage(wing.banner.path),
            new Point2D(
                CBWingIndicator.DIMENSION.w/2 - CBWingIndicator.BANNER_DIMENSION.w/2 - CBWingIndicator.MARGIN,
                0
            ),
            CBWingIndicator.BANNER_DIMENSION
        );
        this.addArtifact(this._bannerArtifact);
    }

    static DIMENSION = new Dimension2D(142, 142);
    static BANNER_DIMENSION = new Dimension2D(50, 120);
    static MARGIN =5;
}

export class CBWingTirednessIndicator extends CBWingIndicator {

    constructor(wing) {
        super(wing, [
            `./../images/inserts/tiredness4.png`,
            `./../images/inserts/tiredness5.png`,
            `./../images/inserts/tiredness6.png`,
            `./../images/inserts/tiredness7.png`,
            `./../images/inserts/tiredness8.png`,
            `./../images/inserts/tiredness9.png`,
            `./../images/inserts/tiredness10.png`,
            `./../images/inserts/tiredness11.png`
        ]);
    }

    _getValue(wing) {
        return wing.tiredness-4;
    }
}

export class CBWingMoralIndicator extends CBWingIndicator {

    constructor(wing) {
        super(wing, [
            `./../images/inserts/moral4.png`,
            `./../images/inserts/moral5.png`,
            `./../images/inserts/moral6.png`,
            `./../images/inserts/moral7.png`,
            `./../images/inserts/moral8.png`,
            `./../images/inserts/moral9.png`,
            `./../images/inserts/moral10.png`,
            `./../images/inserts/moral11.png`
        ]);
    }

    _getValue(wing) {
        return wing.moral-4;
    }
}

export class CBWeatherIndicator extends DMultiImagesIndicator {

    constructor(weather) {
        super( [
            `./../images/inserts/meteo1.png`,
            `./../images/inserts/meteo2.png`,
            `./../images/inserts/meteo3.png`,
            `./../images/inserts/meteo4.png`,
            `./../images/inserts/meteo5.png`,
            `./../images/inserts/meteo6.png`
        ], CBWeatherIndicator.DIMENSION, CBWeatherIndicator.getCode(weather));
    }

    static getCode(weather) {
        if (weather === CBWeather.HOT) return 0;
        else if (weather === CBWeather.CLEAR) return 1;
        else if (weather === CBWeather.CLOUDY) return 2;
        else if (weather === CBWeather.OVERCAST) return 3;
        else if (weather === CBWeather.RAIN) return 4;
        else return 5;
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBFogIndicator extends DMultiImagesIndicator {

    constructor(fog) {
        super( [
            `./../images/inserts/fog0.png`,
            `./../images/inserts/fog1.png`,
            `./../images/inserts/fog2.png`,
            `./../images/inserts/fog3.png`
        ], CBFogIndicator.DIMENSION, fog);
    }

    static getCode(fog) {
        if (fog === CBFog.NO_FOG) return 0;
        else if (fog === CBFog.MIST) return 1;
        else if (fog === CBFog.DENSE_MIST) return 2;
        else if (fog === CBFog.FOG) return 3;
        else return 4;
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBWindDirectionIndicator extends DRotatableIndicator {

    constructor(angle) {
        super( [
            `./../images/inserts/wind-direction.png`
        ], CBWindDirectionIndicator.DIMENSION, angle);
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBCheckEngagementInsert extends WInsert {

    constructor(url, dimension, condition) {
        super(url, dimension);
        if (condition.weapons) {
            this.setMark(new Point2D(15, 367));
        }
        if (condition.capacity) {
            this.setMark(new Point2D(15, 385));
        }
        if (condition.unitIsACharacter) {
            this.setMark(new Point2D(15, 420));
        }
        if (condition.foeIsACharacter) {
            this.setMark(new Point2D(15, 437));
        }
        if (condition.unitIsCharging) {
            this.setMark(new Point2D(15, 455));
        }
        if (condition.foeIsCharging) {
            this.setMark(new Point2D(15, 505));
        }
        if (condition.sideAdvantage) {
            this.setMark(new Point2D(15, 523));
        }
        if (condition.backAdvantage) {
            this.setMark(new Point2D(15, 541));
        }
    }

}

export class CBCheckDefenderEngagementInsert extends CBCheckEngagementInsert {

    constructor(condition) {
        super("./../images/inserts/check-defender-engagement-insert.png", CBCheckDefenderEngagementInsert.DIMENSION, condition);
    }

    static DIMENSION = new Dimension2D(444, 763);
}

export class CBLoseCohesionInsert extends WInsert {

    constructor(condition) {
        super("./../images/inserts/lose-cohesion-insert.png", CBLoseCohesionInsert.DIMENSION);
        this._condition = condition;
    }

    static DIMENSION = new Dimension2D(444, 330);
}

export class CBMoralInsert extends WInsert {

    constructor(unit) {
        super("./../images/inserts/moral-insert.png", CBMoralInsert.DIMENSION);
        let delta = (177-57)/4;
        this.setMark(new Point2D(20, 177-(unit.moralProfile.capacity+2)*delta));
        if (unit.isDisrupted() || unit.isRouted()) {
            this.setMark(new Point2D(20, 225));
        }

    }

    static DIMENSION = new Dimension2D(444, 389);
}

export class CBDefenderEngagementSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({ id, type:"defender-engagement", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBDefenderEngagementChecking(this.game, this.unit).replay(this.dice)
        });
    }

}
WSequence.register("defender-engagement", CBDefenderEngagementSequenceElement);

export class CBRoutCheckingSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"rout-checking", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        this.unit.setAttr("rout-checked", true);
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBLoseCohesionChecking(this.game, this.unit).replay(this.dice)
        });
    }

    static launch(unit, specs) {
        unit.setAttr("root-checked", true);
        unit.game.selectedPlayable = unit;
        unit.game.focusedPlayable = unit;
    }

}
WSequence.register("rout-checking", CBRoutCheckingSequenceElement);

export class CBNeighborRoutCheckingSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"neighbor-rout-checking", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        this.unit.setAttr("rout-checked", true);
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new CBLoseCohesionChecking(this.game, this.unit).replay(this.dice)
        });
    }

    static launch(unit, specs) {
        unit.setAttr("rout-checked", true);
    }

}
WSequence.register("neighbor-rout-checking", CBNeighborRoutCheckingSequenceElement);

export class CBRootNeighborsCohesionSequenceElement extends CBStateSequenceElement {

    constructor({game, unit, neighbors}) {
        super({type:"neighbors-rout-checking", game, unit});
        this.neighbors = neighbors;
    }

    get delay() { return 0; }

    apply(startTick) {
        this.unit.setAttr("neighborsRootChecked", true);
        /*
        return new CBRootNeighborsCohesionAnimation({
            unit: this.unit, startTick, duration: this.delay,
            state: this, game: this.game,
            neighbors: this.neighbors
        });
         */
        return new WUnitAnimation({
            unit: this.unit, startTick, duration: this.delay,
            state: this, game: this.game
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.neighbors = [];
        for (let neighbor of this.neighbors) {
            spec.neighbors.push(neighbor.name);
        }
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.neighbors = [];
        for (let neighbor of spec.neighbors) {
            this.neighbors.push(context.units.get(neighbor));
        }
    }

    static launch(unit, {neighbors}, context) {
        let units = CBRootNeighborsCohesionSequenceElement.getPlayables(neighbors, context);
        unit.game.currentPlayer.routNeighborsChecking(unit, units);
    }

    static getPlayables(names, context) {
        let playables = [];
        for (let name of names) {
            playables.push(CBRootNeighborsCohesionSequenceElement.getPlayable(name, context));
        }
        return playables;
    }

    static getPlayable(name, context) {
        return context.get(name)
    }
}
WSequence.register("neighbors-rout-checking", CBRootNeighborsCohesionSequenceElement);

export function WithDiceRoll(clazz) {

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

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            for (let index=0;  index<this.dice.length; index++) {
                spec["dice"+(index+1)] = this.dice[index];
            }
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            this.dice = [spec.dice1, spec.dice2];
        }

    }

}

/*
export class CBRootNeighborsCohesionAnimation extends CBAnimation {

    constructor({unit, startTick, duration, state, neighbors}) {
        super({startTick, duration, state});
        this._unit = unit;
        this._neighbors = neighbors;
    }

    _finalize() {
        this._unit.game.currentPlayer.routNeighborsChecking(this._unit, this._neighbors);
        super._finalize();
    }

}
*/


