import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    CBAbstractPlayer, CBGame, WidgetLevelMixin
} from "./game.js";
import {
    DBoard
} from "../board.js";

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
                this._selectAndFocusUnit(unit);
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
                this._selectAndFocusUnit(unit);
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
                    this._selectAndFocusUnit(unit);
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

    _selectAndFocusUnit(unit) {
        this.game.setSelectedUnit(unit);
        this.game.setFocusedUnit(unit);
    }

    startActivation(unit, action) {
        if (unit.isEngaging()) {
            unit.markAsEngaging(false);
        }
        this._doPreliminaryActions(unit, ()=> super.startActivation(unit, action));
    }

    launchUnitAction(unit, event) {
        if (!unit.isDestroyed()) {
            this.openActionMenu(unit,
                new Point2D(event.offsetX, event.offsetY),
                this.game.arbitrator.getAllowedActions(unit));
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

    canFinishUnit(unit) {
        return !this.game.arbitrator.canPlayUnit(unit);
    }

    finishTurn(animation) {
        let unit = this.game.selectedUnit;
        this.afterActivation(unit, ()=>{
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

export class CBWingTirednessIndicator extends DIndicator {

    constructor(tiredness) {
        function getPaths(tiredness) {
            let paths = [];
            paths.push(`./../images/inserts/tiredness${tiredness}.png`);
            if (tiredness>4) {
                paths.push(`./../images/inserts/tiredness${tiredness-1}.png`);
            }
            return paths;
        }

        super(getPaths(tiredness), CBWingTirednessIndicator.DIMENSION);
    }

}
CBWingTirednessIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBWeatherIndicator extends DIndicator {

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

}
CBWeatherIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBFogIndicator extends DIndicator {

    constructor(fog) {
        super( [
            `./../images/inserts/fog0.png`,
            `./../images/inserts/fog1.png`,
            `./../images/inserts/fog2.png`,
            `./../images/inserts/fog3.png`
        ], CBFogIndicator.DIMENSION, fog);
    }

}
CBFogIndicator.DIMENSION = new Dimension2D(142, 142);

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

}
CBCheckDefenderEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBLoseCohesionInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, condition) {
        super(game, "./../images/inserts/lose-cohesion-insert.png", CBLoseCohesionInsert.DIMENSION);
        this._condition = condition;
    }

}
CBLoseCohesionInsert.DIMENSION = new Dimension2D(444, 330);

export class CBMoralInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, unit) {
        super(game, "./../images/inserts/moral-insert.png", CBMoralInsert.DIMENSION);
        let delta = (177-57)/4;
        this.setMark(new Point2D(20, 177-(unit.moralProfile.capacity+2)*delta));
        if (unit.isDisrupted() || unit.isRouted()) {
            this.setMark(new Point2D(20, 225));
        }
    }

}
CBMoralInsert.DIMENSION = new Dimension2D(444, 389);
