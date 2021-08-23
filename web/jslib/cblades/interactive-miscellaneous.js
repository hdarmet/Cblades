'use strict'

import {
    DDice,
    DIconMenu,
    DIconMenuItem, DInsert, DMask, DResult, DScene, DSwipe
} from "../widget.js";
import {
    CBAction, CBStacking, PlayableMixin, CBAbstractGame
} from "./game.js";
import {
    WidgetLevelMixin
} from "./playable.js";
import {
    CBActionMenu,
    CBInteractivePlayer,
    CBWeatherIndicator,
    CBFogIndicator,
    CBWindDirectionIndicator,
    CBWingTirednessIndicator,
    CBWingMoralIndicator
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
import {
    Memento
} from "../mechanisms.js";

export function registerInteractiveMiscellaneous() {
    CBInteractivePlayer.prototype.mergeUnits = function(unit, event) {
        unit.launchAction(new InteractiveMergeUnitAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.choseMiscAction = function(unit, event) {
        let allowedActions = this.game.arbitrator.getAllowedMiscellaneousActions(unit);
        let popup = new CBMiscellaneousActionsMenu(this.game, unit, allowedActions);
        let offset = Point2D.getEventPoint(event);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN)
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
    CBInteractivePlayer.prototype.playWeather = function(counter, event) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayWeatherAction(this.game, counter, event);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                action.play();
            });
        }
    }
    CBInteractivePlayer.prototype.playFog = function(counter, event) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayFogAction(this.game, counter, event);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                action.play();
            });
        }
    }
    CBInteractivePlayer.prototype.playWindDirection = function(counter, event) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayWindDirectionAction(this.game, counter, event);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                action.play();
            });
        }
    }
    CBInteractivePlayer.prototype.playTiredness = function(counter, event) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayTirednessAction(this.game, counter, event);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                action.play();
            });
        }
    }
    CBInteractivePlayer.prototype.playMoral = function(counter, event) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayMoralAction(this.game, counter, event);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                action.play();
            });
        }
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

    get unit() {
        return this.playable;
    }

    play() {
        this.game.closeActuators();
        this.unit.markAsCharging(CBCharge.NONE);
        let {replacement, replaced} = this.game.arbitrator.mergedUnit(this.unit);
        let hexLocation = this.unit.hexLocation;
        replacement.appendToMap(hexLocation, CBStacking.TOP);
        replacement.rotate(this.unit.angle);
        replacement.markAsBeingPlayed();
        for (let replacedUnit of replaced) {
            replacedUnit.deleteFromMap();
        }
        this.markAsFinished();
    }

}

export class InteractiveSetFireAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather(this.game);
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

    get unit() {
        return this.playable;
    }

    play() {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather(this.game);
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
            let fireStart = PlayableMixin.getByType(unit.hexLocation, CBFireStart);
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

    get unit() {
        return this.playable;
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

    get unit() {
        return this.playable;
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
            let stakes = PlayableMixin.getByType(unit.hexLocation, CBStakes);
            if (stakes) {
                stakes.removeFromMap(unit.hexLocation);
            }
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractivePlayWeatherAction extends CBAction {

    constructor(game, counter, event) {
        super(game, counter);
        this._event = event;
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather(this.game);
        let swipeResult = new DSwipe();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let weatherIndicator = new CBWeatherIndicator(weather);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBPlayWeatherInsert(this.game),
            new Point2D(-CBPlayWeatherInsert.DIMENSION.w/2, 0)
        ).addWidget(
            weatherIndicator,
            new Point2D(CBWeatherIndicator.DIMENSION.w/2-20, 100)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {swipe, weather:nextWeather} = this._processPlayWeatherResult(this.game, dice.result);
                if (weather>0 && swipe === -1) {
                    swipeResult.swipeUp().appear();
                    weatherIndicator.changeState(nextWeather);
                }
                else if (weather<5 && swipe === 1) {
                    swipeResult.swipeDown().appear();
                    weatherIndicator.changeState(nextWeather);
                }
                else {
                    swipeResult.noSwipe().appear();
                }
                Memento.clear();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processPlayWeatherResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayWeatherResult(game, diceResult);
        this.markAsFinished();
        this.game.changeWeather(result.weather);
        return result;
    }

}

export class InteractivePlayFogAction extends CBAction {

    constructor(game, counter, event) {
        super(game, counter);
        this._event = event;
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let fog = this.game.arbitrator.getFog(this.game);
        let swipeResult = new DSwipe();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let weatherIndicator = new CBFogIndicator(fog);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBPlayFogInsert(this.game),
            new Point2D(-CBPlayFogInsert.DIMENSION.w/2, 0)
        ).addWidget(
            weatherIndicator,
            new Point2D(CBFogIndicator.DIMENSION.w/2-20, 100)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {swipe, fog:nextFog} = this._processPlayFogResult(this.game, dice.result);
                if (fog>0 && swipe === -1) {
                    swipeResult.swipeUp().appear();
                }
                else if (fog<5 && swipe === 1) {
                    swipeResult.swipeDown().appear();
                    weatherIndicator.changeState(nextFog);
                }
                else {
                    swipeResult.noSwipe().appear();
                    weatherIndicator.changeState(nextFog);
                }
                Memento.clear();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processPlayFogResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayFogResult(game, diceResult);
        this.markAsFinished();
        this.game.changeFog(result.fog);
        return result;
    }

}

export class InteractivePlayWindDirectionAction extends CBAction {

    constructor(game, counter, event) {
        super(game, counter);
        this._event = event;
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let windDirection = this.game.arbitrator.getWindDirection(this.game);
        let swipeResult = new DSwipe();
        let dice = new DDice([new Point2D(0, 0)]);
        let windDirectionIndicator = new CBWindDirectionIndicator(windDirection);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBPlayWindDirectionInsert(this.game),
            new Point2D(-CBPlayWindDirectionInsert.DIMENSION.w/2, -50)
        ).addWidget(
            windDirectionIndicator,
            new Point2D(CBWindDirectionIndicator.DIMENSION.w/2-20, 75)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {swipe, windDirection:nextWindDirection} = this._processPlayWindDirectionResult(this.game, dice.result);
                if (swipe === -1) {
                    swipeResult.swipeUp().appear();
                    windDirectionIndicator.changeState(nextWindDirection);
                }
                else if (swipe === 1) {
                    swipeResult.swipeDown().appear();
                    windDirectionIndicator.changeState(nextWindDirection);
                }
                else {
                    swipeResult.noSwipe().appear();
                }
            }),
            new Point2D(60, -50)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processPlayWindDirectionResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayWindDirectionResult(game, diceResult);
        this.markAsFinished();
        this.game.changeWindDirection(result.windDirection);
        Memento.clear();
        return result;
    }

}

export class InteractivePlayTirednessAction extends CBAction {

    constructor(game, counter, event) {
        super(game, counter);
        this._event = event;
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let swipeResult = new DSwipe();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let tirednessIndicator = new CBWingTirednessIndicator(this.playable.wing);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBPlayTirednessInsert(this.game),
            new Point2D(-CBPlayTirednessInsert.DIMENSION.w/2, 0)
        ).addWidget(
            tirednessIndicator,
            new Point2D(CBWingTirednessIndicator.DIMENSION.w/2-20, 100)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {swipe, tiredness:nextTiredness} = this._processPlayTirednessResult(this.game, dice.result);
                if (nextTiredness>0 && swipe === -1) {
                    swipeResult.swipeUp().appear();
                }
                else {
                    swipeResult.noSwipe().appear();
                    tirednessIndicator.changeState(nextTiredness-4);
                }
                Memento.clear();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processPlayTirednessResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayTirednessResult(game, this.playable.wing, diceResult);
        this.markAsFinished();
        if (result.swipe) {
            this.playable.wing.changeTiredness(result.tiredness);
        }
        return result;
    }

}

export class InteractivePlayMoralAction extends CBAction {

    constructor(game, counter, event) {
        super(game, counter);
        this._event = event;
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let swipeResult = new DSwipe();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let moralIndicator = new CBWingMoralIndicator(this.playable.wing);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBPlayMoralInsert(this.game),
            new Point2D(-CBPlayMoralInsert.DIMENSION.w/2, 0)
        ).addWidget(
            moralIndicator,
            new Point2D(CBWingMoralIndicator.DIMENSION.w/2-20, 100)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {swipe, moral:nextMoral} = this._processPlayMoralResult(this.game, dice.result);
                if (nextMoral>0 && swipe === -1) {
                    swipeResult.swipeUp().appear();
                }
                else {
                    swipeResult.noSwipe().appear();
                    moralIndicator.changeState(nextMoral-4);
                }
                Memento.clear();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processPlayMoralResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayMoralResult(game, this.playable.wing, diceResult);
        this.markAsFinished();
        if (result.swipe) {
            this.playable.wing.changeMoral(result.moral);
        }
        return result;
    }

}

function createMiscellaneousMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/do-fusion.png", "./../images/icons/do-fusion-gray.png",
            2, 5, event => {
                unit.player.mergeUnits(unit, event);
                return true;
            }, "Fusionner les troupes").setActive(actions.mergeUnit),
        new DIconMenuItem("./../images/icons/do-many.png", "./../images/icons/do-many-gray.png",
            3, 5, event => {
                unit.player.choseMiscAction(unit, event);
                return true;
            }, "Actions diverses").setActive(actions.miscActions)
    ];
}

export class CBMiscellaneousActionsMenu extends DIconMenu {

    constructor(game, unit, allowedMiscellaneousActions) {
        super(false, new DIconMenuItem("./../images/actions/start-fire.png","./../images/actions/start-fire-gray.png",
            0, 0, event => {
                unit.player.tryToSetFire(unit, event);
                return true;
            }, "Mêttre le feu").setActive(allowedMiscellaneousActions.setFire),
            new DIconMenuItem("./../images/actions/extinguish-fire.png","./../images/actions/extinguish-fire-gray.png",
                1, 0, event => {
                    unit.player.tryToExtinguishFire(unit, event);
                    return true;
                }, "Eteindre le feu").setActive(allowedMiscellaneousActions.extinguishFire),
            new DIconMenuItem("./../images/actions/set-stakes.png","./../images/actions/set-stakes-gray.png",
                0, 1, event => {
                    unit.player.tryToSetStakes(unit, event);
                    return true;
                }, "Poser des pieux").setActive(allowedMiscellaneousActions.setStakes),
            new DIconMenuItem("./../images/actions/remove-stakes.png","./../images/actions/remove-stakes-gray.png",
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
        super(game, "./../images/inserts/misc-actions-insert.png", CBMiscActionsInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 641);
}

export class CBSetFireInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/set-fire-insert.png", CBSetFireInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 385);
}

export class CBExtinguishFireInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/extinguish-fire-insert.png", CBExtinguishFireInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 397);
}

export class CBSetStakesInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/set-stakes-insert.png", CBSetStakesInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 334);
}

export class CBRemoveStakesInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/remove-stakes-insert.png", CBRemoveStakesInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 306);
}

export class CBPlayWeatherInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/meteo-insert.png", CBPlayWeatherInsert.DIMENSION, CBPlayWeatherInsert.PAGE_DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 600);
    static PAGE_DIMENSION = new Dimension2D(444, 1124);
}

export class CBPlayFogInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/fog-insert.png", CBPlayFogInsert.DIMENSION, CBPlayFogInsert.PAGE_DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 600);
    static PAGE_DIMENSION = new Dimension2D(444, 686);
}

export class CBPlayWindDirectionInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/wind-direction-insert.png", CBPlayWindDirectionInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 177);
}

export class CBPlayTirednessInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/wing-rest-insert.png", CBPlayTirednessInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 118);
}

export class CBPlayMoralInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/wing-moral-insert.png", CBPlayMoralInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 119);
}
