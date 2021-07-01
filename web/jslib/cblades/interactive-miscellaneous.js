'use strict'

import {
    DDice,
    DIconMenu,
    DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBAction, CBGame, CBPlayable, WidgetLevelMixin
} from "./game.js";
import {
    CBActionMenu, CBInteractivePlayer, CBWeatherIndicator
} from "./interactive-player.js";
import {
    CBCharge
} from "./unit.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    CBFireStart, CBStakes
} from "./miscellaneous.js";

export function registerInteractiveMiscellaneous() {
    CBInteractivePlayer.prototype.mergeUnits = function(unit, event) {
        unit.launchAction(new InteractiveMergeUnitAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.choseMiscAction = function(unit, event) {
        let allowedActions = this.game.arbitrator.getAllowedMiscellaneousActions(unit);
        let popup = new CBMiscellaneousActionsMenu(this.game, unit, allowedActions);
        let offset = Point2D.getEventPoint(event);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN)
        );

    }
    CBInteractivePlayer.prototype.tryToSetFire = function(unit, event) {
        unit.launchAction(new InteractiveSetFireAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToExtinguishFire = function(unit, event) {
        unit.launchAction(new InteractiveExtinguishFireAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToSetStakes = function(unit, event) {
        unit.launchAction(new InteractiveSetStakesAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToRemoveStakes = function(unit, event) {
        unit.launchAction(new InteractiveRemoveStakesAction(this.game, unit, event));
    }
    CBActionMenu.menuBuilders.push(
        createMiscellaneousMenuItems
    );
}
export function unregisterInteractiveMiscellaneous() {
    delete CBInteractivePlayer.prototype.startMoveUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createMiscellaneousMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveMergeUnitAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        this.unit.markAsCharging(CBCharge.NONE);
        let {replacement, replaced} = this.game.arbitrator.mergedUnit(this.unit);
        let hexLocation = this.unit.hexLocation;
        this.game.appendUnit(replacement, hexLocation);
        replacement.rotate(this.unit.angle);
        replacement.markAsBeingPlayed();
        for (let replacedUnit of replaced) {
            this.game.deleteUnit(replacedUnit);
        }
        this.markAsFinished();
    }

}

export class InteractiveSetFireAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBMiscActionsInsert(this.game),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBSetFireInsert(this.game),
            new Point2D(CBSetFireInsert.DIMENSION.w/2, -CBSetFireInsert.DIMENSION.h/2)
        ).addWidget(
            new CBWeatherIndicator(weather),
            new Point2D(CBWeatherIndicator.DIMENSION.w/2-20, 220)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processSetFireResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processSetFireResult(unit, diceResult) {
        let result = this.game.arbitrator.processSetFireResult(this.unit, diceResult);
        if (result.success) {
            let fireStart = new CBFireStart();
            fireStart.appendToMap(unit.hexLocation);
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveExtinguishFireAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBMiscActionsInsert(this.game),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBExtinguishFireInsert(this.game),
            new Point2D(CBExtinguishFireInsert.DIMENSION.w/2, -CBExtinguishFireInsert.DIMENSION.h/2)
        ).addWidget(
            new CBWeatherIndicator(weather),
            new Point2D(CBWeatherIndicator.DIMENSION.w/2-20, 220)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processExtinguishFireResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processExtinguishFireResult(unit, diceResult) {
        let result = this.game.arbitrator.processExtinguishFireResult(this.unit, diceResult);
        if (result.success) {
            let fireStart = CBPlayable.getByType(unit.hexLocation, CBFireStart);
            if (fireStart) {
                fireStart.removeFromMap(unit.hexLocation);
            }
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveSetStakesAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBMiscActionsInsert(this.game),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBSetStakesInsert(this.game),
            new Point2D(CBSetStakesInsert.DIMENSION.w/2, -CBSetStakesInsert.DIMENSION.h/2)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processSetStakesResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processSetStakesResult(unit, diceResult) {
        let result = this.game.arbitrator.processSetStakesResult(this.unit, diceResult);
        if (result.success) {
            let stakes = new CBStakes();
            stakes.angle = unit.angle;
            stakes.appendToMap(unit.hexLocation);
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveRemoveStakesAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBMiscActionsInsert(this.game),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBRemoveStakesInsert(this.game),
            new Point2D(CBRemoveStakesInsert.DIMENSION.w/2, -CBRemoveStakesInsert.DIMENSION.h/2)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processRemoveStakesResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processRemoveStakesResult(unit, diceResult) {
        let result = this.game.arbitrator.processRemoveStakesResult(this.unit, diceResult);
        if (result.success) {
            let stakes = CBPlayable.getByType(unit.hexLocation, CBStakes);
            if (stakes) {
                stakes.removeFromMap(unit.hexLocation);
            }
        }
        this.markAsFinished();
        return result;
    }

}

function createMiscellaneousMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/do-fusion.png", "/CBlades/images/icons/do-fusion-gray.png",
            2, 5, event => {
                unit.player.mergeUnits(unit, event);
                return true;
            }, "Fusionner les troupes").setActive(actions.mergeUnit),
        new DIconMenuItem("/CBlades/images/icons/do-many.png", "/CBlades/images/icons/do-many-gray.png",
            3, 5, event => {
                unit.player.choseMiscAction(unit, event);
                return true;
            }, "Actions diverses").setActive(actions.miscActions)
    ];
}

export class CBMiscellaneousActionsMenu extends DIconMenu {

    constructor(game, unit, allowedMiscellaneousActions) {
        super(false, new DIconMenuItem("/CBlades/images/actions/start-fire.png","/CBlades/images/actions/start-fire-gray.png",
            0, 0, event => {
                unit.player.tryToSetFire(unit, event);
                return true;
            }, "Mêttre le feu").setActive(allowedMiscellaneousActions.setFire),
            new DIconMenuItem("/CBlades/images/actions/extinguish-fire.png","/CBlades/images/actions/extinguish-fire-gray.png",
                1, 0, event => {
                    unit.player.tryToExtinguishFire(unit, event);
                    return true;
                }, "Eteindre le feu").setActive(allowedMiscellaneousActions.extinguishFire),
            new DIconMenuItem("/CBlades/images/actions/set-stakes.png","/CBlades/images/actions/set-stakes-gray.png",
                0, 1, event => {
                    unit.player.tryToSetStakes(unit, event);
                    return true;
                }, "Poser des pieux").setActive(allowedMiscellaneousActions.setStakes),
            new DIconMenuItem("/CBlades/images/actions/remove-stakes.png","/CBlades/images/actions/remove-stakes-gray.png",
                1, 1, event => {
                    unit.player.tryToRemoveStakes(unit, event);
                    return true;
                }, "Retirer les pieux").setActive(allowedMiscellaneousActions.removeStakes)
        );
        this._game = game;
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

}

export class CBMiscActionsInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/misc-actions-insert.png", CBMiscActionsInsert.DIMENSION);
    }

}
CBMiscActionsInsert.DIMENSION = new Dimension2D(444, 641);

export class CBSetFireInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/set-fire-insert.png", CBSetFireInsert.DIMENSION);
    }

}
CBSetFireInsert.DIMENSION = new Dimension2D(444, 385);

export class CBExtinguishFireInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/extinguish-fire-insert.png", CBExtinguishFireInsert.DIMENSION);
    }

}
CBExtinguishFireInsert.DIMENSION = new Dimension2D(444, 397);

export class CBSetStakesInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/set-stakes-insert.png", CBSetStakesInsert.DIMENSION);
    }

}
CBSetStakesInsert.DIMENSION = new Dimension2D(444, 334);

export class CBRemoveStakesInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "/CBlades/images/inserts/remove-stakes-insert.png", CBRemoveStakesInsert.DIMENSION);
    }

}
CBRemoveStakesInsert.DIMENSION = new Dimension2D(444, 306);