import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DMultiImagesIndicator, DInsert, DMask, DResult, DScene, DRotatableIndicator
} from "../widget.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    CBAbstractPlayer, CBGame, WidgetLevelMixin
} from "./game.js";
import {
    DBoard, DImageArtifact
} from "../board.js";
import {
    DImage
} from "../draw.js";

export class CBInteractivePlayer extends CBAbstractPlayer {

    constructor() {
        super();
    }

    _doDestroyedChecking(unit, hexLocation) {
        if (this.game.arbitrator.doesADestroyedUnitHaveNonRoutedNeighbors(unit, hexLocation)) {
            this._checkIfNeighborsLoseCohesion(unit, hexLocation, () => {
                Memento.clear();
            }, false);
        }
    }

    loseUnit(unit) {
        let hexLocation = unit.hexLocation;
        super.loseUnit(unit);
        this._doDestroyedChecking(unit, hexLocation);
    }

    _doDisruptChecking(unit, processing, cancellable) {
        if (this.game.arbitrator.doesANonRoutedUnitHaveRoutedNeighbors(unit)) {
            this.checkIfAUnitLoseCohesion(unit, () => {
                this._selectAndFocusCounter(unit);
                Memento.clear();
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
                this._selectAndFocusCounter(unit);
                Memento.clear();
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
            this.checkIfAUnitLoseCohesion(neighbor, () => {
                Memento.clear();
                this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, false);
            }, cancellable);
        }
        else {
            processing();
        }
    }

    _checkIfNeighborsLoseCohesion(unit, hexLocation, processing, cancellable) {
        let neighbors = this.game.arbitrator.getFriendNonRoutedNeighbors(unit, hexLocation);
        if (neighbors.length) {
            this._checkIfANonRoutedNeighborLoseCohesion(unit, neighbors, processing, cancellable);
        }
        else {
            processing();
        }
    }

    _doEngagementChecking(unit, processing) {
        if (this.game.arbitrator.isUnitEngaged(unit, true)) {
            this.checkDefenderEngagement(unit, unit.viewportLocation, () => {
                let hexLocation = unit.hexLocation;
                if (unit.isOnBoard()) {
                    this._selectAndFocusCounter(unit);
                    Memento.clear();
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

    _selectAndFocusCounter(unit) {
        this.game.setSelectedCounter(unit);
        this.game.setFocusedCounter(unit);
    }

    startActivation(unit, action) {
        if (unit.isEngaging()) {
            unit.markAsEngaging(false);
        }
        this._doPreliminaryActions(unit, ()=> super.startActivation(unit, action));
    }

    launchCounterAction(counter, event) {
        if (counter.unitNature) {
            if (!counter.isDestroyed()) {
                this.openActionMenu(counter,
                    new Point2D(event.offsetX, event.offsetY),
                    this.game.arbitrator.getAllowedActions(counter));
            }
        }
    }

    afterActivation(unit, action) {
        if (unit && unit.action) {
            if (!unit.action.isStarted()) {
                unit.action.cancel(() => {
                    super.afterActivation(unit, action);
                });
            }
            else if (!unit.action.isFinalized()) {
                unit.action.finalize(() => {
                    super.afterActivation(unit, action);
                });
            }
            else {
                super.afterActivation(unit, action);
            }
        }
        else {
            super.afterActivation(unit, action);
        }
    }

    canFinishCounter(counter) {
        return !this.game.arbitrator.canPlayUnit(counter);
    }

    finishTurn(animation) {
        let counter = this.game.selectedCounter;
        this.afterActivation(counter, ()=>{
            super.finishTurn(animation);
        });
    }

    checkIfAUnitLoseCohesion(unit, action, cancellable) {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            if (cancellable) {
                mask.close();
                scene.close();
            }
            if (result.finished) {
                if (!cancellable) {
                    mask.close();
                    scene.close();
                }
                action();
            }
        }
        mask.setAction(close);
        mask.open(this.game.board, unit.viewportLocation);
        let condition = this.game.arbitrator.getUnitCohesionLostCondition(unit);
        scene.addWidget(
            new CBLoseCohesionInsert(this.game, condition), new Point2D(-CBLoseCohesionInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processCohesionLostResult(unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, unit.viewportLocation);
    }

    checkDefenderEngagement(unit, point, action) {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
            if (result.finished) {
                action();
            }
        }
        mask.setAction(close);
        mask.open(this.game.board, point);
        let condition = this.game.arbitrator.getDefenderEngagementCondition(unit);
        scene.addWidget(
            new CBCheckDefenderEngagementInsert(this.game, condition), new Point2D(-CBCheckDefenderEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game, unit), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processDefenderEngagementResult(unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processCohesionLostResult(unit, diceResult) {
        let result = this.game.arbitrator.processCohesionLostResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
    }

    _processDefenderEngagementResult(unit, diceResult) {
        let result = this.game.arbitrator.processDefenderEngagementResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
    }

    openActionMenu(unit, offset, actions) {
        let popup = new CBActionMenu(this.game, unit, actions);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
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
}
CBActionMenu.menuBuilders = [];

export class CBWingIndicator extends DMultiImagesIndicator {

    constructor(wing, paths) {
        super(paths, CBWingIndicator.DIMENSION, 0);
        this.artifact.changeImage(this._getValue(wing));
        this._bannerArtifact = new DImageArtifact("widgets",
            DImage.getImage(wing.banner),
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


export class CBCheckEngagementInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, url, dimension, condition) {
        super(game, url, dimension);
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

    constructor(game, condition) {
        super(game, "./../images/inserts/check-defender-engagement-insert.png", CBCheckDefenderEngagementInsert.DIMENSION, condition);
    }

    static DIMENSION = new Dimension2D(444, 763);
}

export class CBLoseCohesionInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, condition) {
        super(game, "./../images/inserts/lose-cohesion-insert.png", CBLoseCohesionInsert.DIMENSION);
        this._condition = condition;
    }

    static DIMENSION = new Dimension2D(444, 330);
}

export class CBMoralInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, unit) {
        super(game, "./../images/inserts/moral-insert.png", CBMoralInsert.DIMENSION);
        let delta = (177-57)/4;
        this.setMark(new Point2D(20, 177-(unit.moralProfile.capacity+2)*delta));
        if (unit.isDisrupted() || unit.isRouted()) {
            this.setMark(new Point2D(20, 225));
        }

    }

    static DIMENSION = new Dimension2D(444, 389);
}

