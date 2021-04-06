import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    Mechanisms
} from "../mechanisms.js";
import {
    CBAbstractPlayer, CBGame, InsertMixin
} from "./game.js";
import {
    DBoard
} from "../board.js";

export class CBInteractivePlayer extends CBAbstractPlayer {

    constructor() {
        super();
    }

    beforeActivation(unit, action) {
        if (unit.isEngaging()) {
            unit.markAsEngaging(false);
        }
        if (this.game.arbitrator.isUnitEngaged(unit, true)) {
            this.checkDefenderEngagement(unit, unit.viewportLocation, () => {
                this.game.setFocusedUnit(unit);
                super.beforeActivation(unit, action);
            });
        }
        else {
            super.beforeActivation(unit, action);
        }
    }

    launchUnitAction(unit, event) {
        this.openActionMenu(unit,
            new Point2D(event.offsetX, event.offsetY),
            this.game.arbitrator.getAllowedActions(unit));
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
        return !this.game.arbitrator.mustPlayUnit(unit);
    }

    finishTurn(animation) {
        let unit = this.game.selectedUnit;
        this.afterActivation(unit, ()=>{
            super.finishTurn(animation);
        });
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
        scene.addWidget(
            new CBCheckDefenderEngagementInsert(this.game), new Point2D(-CBCheckDefenderEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(this.game), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
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
            paths.push(`/CBlades/images/inserts/tiredness${tiredness}.png`);
            if (tiredness>4) {
                paths.push(`/CBlades/images/inserts/tiredness${tiredness-1}.png`);
            }
            return paths;
        }

        super(getPaths(tiredness), CBWingTirednessIndicator.DIMENSION);
    }

}
CBWingTirednessIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBWeatherIndicator extends DIndicator {

    constructor(weather) {
        function getPaths(weather) {
            let paths = [];
            paths.push(`/CBlades/images/inserts/meteo${weather}.png`);
            if (weather>1) {
                paths.push(`/CBlades/images/inserts/meteo${weather-1}.png`);
            }
            if (weather<6) {
                paths.push(`/CBlades/images/inserts/meteo${weather+1}.png`);
            }
            return paths;
        }

        super(getPaths(weather), CBWingTirednessIndicator.DIMENSION);
    }

}
CBWeatherIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBCheckDefenderEngagementInsert extends InsertMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/check-defender-engagement-insert.png", CBCheckDefenderEngagementInsert.DIMENSION);
    }

}
CBCheckDefenderEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBMoralInsert extends InsertMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/moral-insert.png", CBMoralInsert.DIMENSION);
    }

}
CBMoralInsert.DIMENSION = new Dimension2D(444, 389);
