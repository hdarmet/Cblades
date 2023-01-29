import {
    Dimension2D, Point2D
} from "../../geometry.js";
import {
    DDice, DIconMenu, DMultiImagesIndicator, DMask, DResult, DScene, DRotatableIndicator
} from "../../widget.js";
import {
    Mechanisms
} from "../../mechanisms.js";
import {
    CBAbstractGame
} from "../game.js";
import {
    DBoard, DImageArtifact
} from "../../board.js";
import {
    DImage
} from "../../draw.js";
import {
    CBInsert
} from "../playable.js";
import {
    CBUnitPlayer
} from "../unit.js";
import {
    CBDefenderEngagementSequenceElement,
    CBLoseCohesionSequenceElement,
    CBNextTurnSequenceElement, CBSequence
} from "../sequences.js";
import {
    SequenceLoader
} from "../loader.js";

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
        if (this.game.arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit)) {
            new CBLoseCohesionChecking(this.game, unit).play( () => {
                this._selectAndFocusPlayable(unit);
                this.game.validate();
                processing();
            }, cancellable);
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
            }, cancellable);
        }
        else {
            this._doDisruptChecking(unit, processing, cancellable);
        }
    }

    _checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable) {
        if (neighbors.length) {
            let neighbor = neighbors.pop();
            new CBLoseCohesionChecking(this.game, neighbor).play( () => {
                this.game.validate();
                this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, false);
            }, cancellable);
        }
        else {
            processing();
        }
    }

    _checkIfNeighborsLoseCohesion(unit, hexLocation, processing, cancellable) {
        let neighbors = this.game.arbitrator.getFriendNonRoutedNeighbors(unit, hexLocation);
        this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable);
    }

    _doEngagementChecking(unit, processing) {
        if (this.game.arbitrator.isUnitEngaged(unit, true)) {
            new CBDefenderEngagementChecking(this.game, unit).play(() => {
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

    _selectAndFocusPlayable(unit) {
        this.game.setSelectedPlayable(unit);
        this.game.setFocusedPlayable(unit);
    }

    startActivation(unit, action) {
        if (unit.isEngaging()) {
            unit.setEngaging(false);
        }
        this._doPreliminaryActions(unit, ()=> super.startActivation(unit, action));
    }

    launchPlayableAction(playable, event) {
        if (playable.unitNature) {
            if (!playable.isDestroyed()) {
                this.openActionMenu(playable,
                    new Point2D(event.offsetX, event.offsetY),
                    this.game.arbitrator.getAllowedActions(playable));
            }
        }
        super.launchPlayableAction(playable, event);
    }

    canFinishPlayable(playable) {
        return !this.game.arbitrator.canPlayUnit(playable);
    }

    finishTurn(animation) {
        let playable = this.game.selectedPlayable;
        this.afterActivation(playable, ()=>{
            CBSequence.appendElement(this.game, new CBNextTurnSequenceElement(this.game));
            new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
            super.finishTurn(animation);
        });
    }

    openActionMenu(unit, offset, actions) {
        let popup = new CBActionMenu(this.game, unit, actions);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN));
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
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
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
                let {success} = this._processDefenderEngagementResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction();
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
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBDefenderEngagementSequenceElement(this.game, this.unit, scene.dice.result));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
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
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processDefenderEngagementResult(unit, diceResult) {
        let result = this.game.arbitrator.processDefenderEngagementResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
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
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
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
                let {success} = this._processCohesionLostResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction();
            }),
            new Point2D(70, 70)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play(action, cancellable) {
        let scene = this.createScene(
            ()=>{
                CBSequence.appendElement(this.game, new CBLoseCohesionSequenceElement(this.game, this.unit, scene.dice.result));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            ()=>{
                if (cancellable) {
                    this.game.closePopup();
                }
                if (scene.result.finished) {
                    if (!cancellable) {
                        this.game.closePopup();
                    }
                    action();
                }
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.dice.active = false;
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processCohesionLostResult(unit, diceResult) {
        let result = this.game.arbitrator.processCohesionLostResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
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
        ], CBWeatherIndicator.DIMENSION, weather);
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

export class CBCheckEngagementInsert extends CBInsert {

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

export class CBLoseCohesionInsert extends CBInsert {

    constructor(condition) {
        super("./../images/inserts/lose-cohesion-insert.png", CBLoseCohesionInsert.DIMENSION);
        this._condition = condition;
    }

    static DIMENSION = new Dimension2D(444, 330);
}

export class CBMoralInsert extends CBInsert {

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

