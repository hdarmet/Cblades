'use strict'

import {
    DDice,
    DIconMenu,
    DIconMenuItem, DInsert, DMask, DResult, DScene, DSwipe
} from "../../widget.js";
import {
    CBAction, CBStacking, PlayableMixin, CBAbstractGame, CBActuator
} from "../game.js";
import {
    CBActionActuator, CBPlayableActuatorTrigger,
    RetractableActuatorMixin, CBInsert
} from "../playable.js";
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
} from "../unit.js";
import {
    Dimension2D, Point2D
} from "../../geometry.js";
import {
    CBBurningCounter,
    CBFireCounter, CBSmokeCounter, CBStakesCounter
} from "../miscellaneous.js";
import {
    Mechanisms
} from "../../mechanisms.js";
import {
    DImage, getDrawPlatform
} from "../../draw.js";

export function registerInteractiveMiscellaneous() {
    CBInteractivePlayer.prototype.mergeUnits = function(unit) {
        unit.launchAction(new InteractiveMergeUnitAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.choseMiscAction = function(unit) {
        let allowedActions = this.game.arbitrator.getAllowedMiscellaneousActions(unit);
        let popup = new CBMiscellaneousActionsMenu(this.game, unit, allowedActions);
        let offset = unit.viewportLocation;
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN)
        );
    }
    CBInteractivePlayer.prototype.tryToSetFire = function(unit) {
        unit.launchAction(new InteractiveSetFireAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.tryToExtinguishFire = function(unit) {
        unit.launchAction(new InteractiveExtinguishFireAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.tryToSetStakes = function(unit) {
        unit.launchAction(new InteractiveSetStakesAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.tryToRemoveStakes = function(unit) {
        unit.launchAction(new InteractiveRemoveStakesAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.playWeather = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayWeatherAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBInteractivePlayer.prototype.playFog = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayFogAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBInteractivePlayer.prototype.playWindDirection = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayWindDirectionAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBInteractivePlayer.prototype.playTiredness = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayTirednessAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBInteractivePlayer.prototype.playMoral = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlayMoralAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBInteractivePlayer.prototype.playSmokeAndFire = function(counter) {
        if (this.game.canUnselectPlayable()) {
            let action = new InteractivePlaySmokeAndFireAction(this.game, counter);
            let unit = this.game.selectedPlayable;
            this.afterActivation(unit, () => {
                counter.launchAction(action);
            });
        }
    }
    CBActionMenu.menuBuilders.push(
        createMiscellaneousMenuItems
    );
}
export function unregisterInteractiveMiscellaneous() {
    delete CBInteractivePlayer.prototype.startMoveUnit;
    CBActionMenu.menuBuilders.remove(createMiscellaneousMenuItems);
}

export class InteractiveMergeUnitAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.game.closeActuators();
        this.unit.setCharging(CBCharge.NONE);
        let {replacement, replaced} = this.game.arbitrator.mergedUnit(this.unit);
        let hexLocation = this.unit.hexLocation;
        replacement.appendToMap(hexLocation, CBStacking.TOP);
        replacement.rotate(this.unit.angle);
        replacement.setPlayed();
        for (let replacedUnit of replaced) {
            replacedUnit.deleteFromMap();
        }
        this.markAsFinished();
    }

}
CBAction.register("InteractiveMergeUnitAction", InteractiveMergeUnitAction);

function createStartFireCounter(game, hexLocation) {
    let fireStart = new CBFireCounter();
    fireStart.appendToMap(hexLocation);
    if (game.firePlayed) {
        fireStart.setPlayed();
    }
}

function deleteStartFireCounter(game, hexLocation) {
    let fireStart = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
    if (fireStart) {
        fireStart.removeFromMap();
    }
}

export class InteractiveSetFireAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
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
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMiscActionsInsert(),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBSetFireInsert(),
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
                this.game.validate();
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
    }

    _processSetFireResult(unit, diceResult) {
        let result = this.game.arbitrator.processSetFireResult(this.unit, diceResult);
        if (result.success) {
            createStartFireCounter(this.game, unit.hexLocation);
        }
        this.markAsFinished();
        return result;
    }

}
CBAction.register("InteractiveSetFireAction", InteractiveSetFireAction);

export class InteractiveExtinguishFireAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
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
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMiscActionsInsert(),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBExtinguishFireInsert(),
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
                this.game.validate();
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
    }

    _processExtinguishFireResult(unit, diceResult) {
        let result = this.game.arbitrator.processExtinguishFireResult(this.unit, diceResult);
        if (result.success) {
            deleteStartFireCounter(this.game, unit.hexLocation);
        }
        this.markAsFinished();
        return result;
    }

}
CBAction.register("InteractiveExtinguishFireAction", InteractiveExtinguishFireAction);

export class InteractiveSetStakesAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
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
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMiscActionsInsert(),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBSetStakesInsert(),
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
                this.game.validate();
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
    }

    _processSetStakesResult(unit, diceResult) {
        let result = this.game.arbitrator.processSetStakesResult(this.unit, diceResult);
        if (result.success) {
            let stakes = new CBStakesCounter();
            stakes.angle = unit.angle;
            stakes.appendToMap(unit.hexLocation);
        }
        this.markAsFinished();
        return result;
    }

}
CBAction.register("InteractiveSetStakesAction", InteractiveSetStakesAction);

export class InteractiveRemoveStakesAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
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
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBMiscActionsInsert(),
            new Point2D(-CBMiscActionsInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBRemoveStakesInsert(),
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
                this.game.validate();
            }),
            new Point2D(50, 70)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processRemoveStakesResult(unit, diceResult) {
        let result = this.game.arbitrator.processRemoveStakesResult(this.unit, diceResult);
        if (result.success) {
            let stakes = PlayableMixin.getOneByType(unit.hexLocation, CBStakesCounter);
            if (stakes) {
                stakes.removeFromMap();
            }
        }
        this.markAsFinished();
        return result;
    }

}
CBAction.register("InteractiveRemoveStakesAction", InteractiveRemoveStakesAction);

export class InteractivePlayWeatherAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
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
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayWeatherInsert(),
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
                this.game.validate();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processPlayWeatherResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayWeatherResult(game, diceResult);
        this.markAsFinished();
        this.game.changeWeather(result.weather);
        return result;
    }

}
CBAction.register("InteractivePlayWeatherAction", InteractivePlayWeatherAction);

export class InteractivePlayFogAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
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
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayFogInsert(),
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
                this.game.validate();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processPlayFogResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayFogResult(game, diceResult);
        this.markAsFinished();
        this.game.changeFog(result.fog);
        return result;
    }

}
CBAction.register("InteractivePlayFogAction", InteractivePlayFogAction);

export class InteractivePlayWindDirectionAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
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
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayWindDirectionInsert(),
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
                this.game.validate();
            }),
            new Point2D(60, -50)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processPlayWindDirectionResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayWindDirectionResult(game, diceResult);
        this.markAsFinished();
        this.game.changeWindDirection(result.windDirection);
        this.game.validate();
        return result;
    }

}
CBAction.register("InteractivePlayWindDirectionAction", InteractivePlayWindDirectionAction);

export class InteractivePlayTirednessAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
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
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayTirednessInsert(),
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
                    tirednessIndicator.changeState(nextTiredness-4);
                }
                else {
                    swipeResult.noSwipe().appear();
                }
                this.game.validate();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processPlayTirednessResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayTirednessResult(this.playable.wing, diceResult);
        this.markAsFinished();
        if (result.swipe) {
            this.playable.wing.changeTiredness(result.tiredness);
        }
        return result;
    }

}
CBAction.register("InteractivePlayTirednessAction", InteractivePlayTirednessAction);

export class InteractivePlayMoralAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
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
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayMoralInsert(),
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
                    moralIndicator.changeState(nextMoral-4);
                }
                else {
                    swipeResult.noSwipe().appear();
                }
                this.game.validate();
            }),
            new Point2D(60, -100)
        ).addWidget(
            swipeResult.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    _processPlayMoralResult(game, diceResult) {
        let result = this.game.arbitrator.processPlayMoralResult(this.playable.wing, diceResult);
        this.markAsFinished();
        if (result.swipe) {
            this.playable.wing.changeMoral(result.moral);
        }
        return result;
    }

}
CBAction.register("InteractivePlayMoralAction", InteractivePlayMoralAction);

export class InteractivePlaySmokeAndFireAction extends CBAction {

    constructor(game, counter) {
        super(game, counter);
    }

    play() {
        this.game.closePopup();
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(0, 0)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBPlayFireInsert(),
            new Point2D(-CBPlayFireInsert.DIMENSION.w/2, -50)
        ).addWidget(
            new CBPlaySmokeInsert(),
            new Point2D(CBPlaySmokeInsert.DIMENSION.w/2 -20, -CBPlaySmokeInsert.DIMENSION.h/2)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {playFire} = this._processPlayFireResult(this.game, dice.result);
                if (playFire) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
                this.game.validate();
            }),
            new Point2D(30, 30)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
    }

    isPlayed() {
        return true;
    }

    _processPlayFireResult(game, diceResult) {
        this.game.setFocusedPlayable(this.playable);
        this.updateSmokes();
        this.putDenseSmoke();
        this.markBurningAsFinished();
        let result = this.game.arbitrator.processPlayFireResult(game, diceResult);
        if (result.playFire) {
            this._options = this.createOptions(PlayableMixin.getAllByType(this.game, CBFireCounter));
            this.openPlayFireActuator(this._options);
        }
        else {
            this.markAsFinished();
        }
        this.game.validate();
        return result;
    }

    _getIsFire() {
        let random = getDrawPlatform().random();
        let range = Math.floor(random * (this._fireCount + this._noFireCount));
        let isFire = true;
        if (range < this._fireCount) {
            this._fireCount--;
        } else {
            isFire = false;
            this._noFireCount--;
        }
        return isFire;
    }

    createOptions(counters) {
        let options = [];
        let lotCount = Math.ceil(counters.length/30);
        this._fireCount = lotCount * 15;
        this._noFireCount = lotCount * 15;
        for (let counter of counters) {
            if (counter.isFire()) {
                let hexLocation = counter.hexLocation.getNearHex(this.game.windDirection);
                let fireCounter = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
                if (!fireCounter) {
                    let isFire = this._getIsFire();
                    options.push({
                        fireCounter: counter,
                        hexLocation,
                        isFire
                    });
                }
            }
            else {
                let isFire = this._getIsFire();
                options.push({
                    fireCounter: counter,
                    hexLocation: counter.hexLocation,
                    isFire
                });
            }
        }
        return options;
    }

    openPlayFireActuator(options) {
        let finished = true;
        for (let option of options) {
            if (!option.played) {
                finished = false;
            }
        }
        if (!finished) {
            let actuator = new CBPlayFireActuator(this, options);
            this.game.openActuator(actuator);
        }
        else {
            this.markAsFinished();
        }
    }

    updateSmokes() {
        let smokes = PlayableMixin.getAllByType(this.game, CBSmokeCounter);
        for (let smoke of smokes) {
            if (smoke.isDense()) {
                smoke.disperse();
                let hexLocation = smoke.hexLocation.getNearHex(this.game.windDirection);
                let fireCounter = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
                if (!fireCounter || !fireCounter.isFire()) {
                    let smokeCounter = PlayableMixin.getOneByType(hexLocation, CBSmokeCounter);
                    if (!smokeCounter) {
                        smokeCounter = new CBSmokeCounter();
                        smokeCounter.appendToMap(hexLocation);
                    }
                }
            }
            else {
                smoke.removeFromMap();
            }
        }
    }

    putDenseSmoke() {
        for (let counter of PlayableMixin.getAllByType(this.game, CBFireCounter)) {
            if (counter.isFire()) {
                let hexLocation = counter.hexLocation.getNearHex(this.game.windDirection);
                let fireCounter = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
                if (!fireCounter || !fireCounter.isFire()) {
                    let smokeCounter = PlayableMixin.getOneByType(hexLocation, CBSmokeCounter);
                    if (smokeCounter) {
                        smokeCounter.removeFromMap();
                    }
                    smokeCounter = new CBSmokeCounter().densify();
                    smokeCounter.appendToMap(hexLocation);
                }
            }
        }

    }

    markBurningAsFinished() {
        this.game.changeFirePlayed();
        Mechanisms.fire(this, CBBurningCounter.PLAYED_EVENT);
    }

    revealOption(option) {
        this.game.closeActuators();
        option.revealed = true;
        this.openPlayFireActuator(this._options);
    }

    playOption(option) {
        this.game.closeActuators();
        option.played = true;
        if (option.hexLocation === option.fireCounter.hexLocation) {
            if (option.isFire) {
                option.fireCounter.setFire();
                let smokeCounter = PlayableMixin.getOneByType(option.hexLocation, CBSmokeCounter);
                if (smokeCounter) {
                    smokeCounter.removeFromMap();
                }
            }
            else {
                deleteStartFireCounter(this.game, option.hexLocation);
            }
        }
        else {
            if (option.isFire) {
                createStartFireCounter(this.game, option.hexLocation);
            }
        }
        this.openPlayFireActuator(this._options);
    }
}
CBAction.register("InteractivePlaySmokeAndFireAction", InteractivePlaySmokeAndFireAction);

class PlayFireTrigger extends CBPlayableActuatorTrigger {

    constructor(actuator, option) {
        let image = option.revealed ?
            option.isFire ?
                DImage.getImage("./../images/actuators/burn.png") :
                DImage.getImage("./../images/actuators/nofire.png") :
            DImage.getImage("./../images/actuators/isburning.png");
        super(actuator, option.fireCounter, "actuators", image, option.hexLocation.location,
            option.revealed ? PlayFireTrigger.HEAD_DIMENSION : PlayFireTrigger.TAIL_DIMENSION);
        this._option = option;
    }

    get counter() {
        return this.playable;
    }

    get option() {
        return this._option;
    }

    static HEAD_DIMENSION = new Dimension2D(142, 142);
    static TAIL_DIMENSION = new Dimension2D(128, 128);
}

export class CBPlayFireActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, options) {
        super(action);
        this._triggers = [];
        for (let option of options) {
            if (!option.played) {
                let orderGivenHelp = new PlayFireTrigger(this, option);
                this._triggers.push(orderGivenHelp);
            }
        }
        this.initElement(this._triggers, new Point2D(0, 0));
    }

    getTrigger(counter) {
        return this.findTrigger(artifact=>artifact.counter === counter);
    }

    onMouseClick(trigger, event) {
        if (!trigger.option.revealed) {
            this.action.revealOption(trigger.option);
        }
        else {
            this.action.playOption(trigger.option);
        }
    }

}

function createMiscellaneousMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/do-fusion.png", "./../images/icons/do-fusion-gray.png",
            2, 5, event => {
                unit.player.mergeUnits(unit);
                return true;
            }, "Fusionner les troupes").setActive(actions.mergeUnit),
        new DIconMenuItem("./../images/icons/do-many.png", "./../images/icons/do-many-gray.png",
            3, 5, event => {
                unit.player.choseMiscAction(unit);
                return true;
            }, "Actions diverses").setActive(actions.miscActions)
    ];
}

export class CBMiscellaneousActionsMenu extends DIconMenu {

    constructor(game, unit, allowedMiscellaneousActions) {
        super(false, new DIconMenuItem("./../images/actions/start-fire.png","./../images/actions/start-fire-gray.png",
            0, 0, event => {
                unit.player.tryToSetFire(unit);
                return true;
            }, "Mêttre le feu").setActive(allowedMiscellaneousActions.setFire),
            new DIconMenuItem("./../images/actions/extinguish-fire.png","./../images/actions/extinguish-fire-gray.png",
                1, 0, event => {
                    unit.player.tryToExtinguishFire(unit);
                    return true;
                }, "Eteindre le feu").setActive(allowedMiscellaneousActions.extinguishFire),
            new DIconMenuItem("./../images/actions/set-stakes.png","./../images/actions/set-stakes-gray.png",
                0, 1, event => {
                    unit.player.tryToSetStakes(unit);
                    return true;
                }, "Poser des pieux").setActive(allowedMiscellaneousActions.setStakes),
            new DIconMenuItem("./../images/actions/remove-stakes.png","./../images/actions/remove-stakes-gray.png",
                1, 1, event => {
                    unit.player.tryToRemoveStakes(unit);
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

export class CBMiscActionsInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/misc-actions-insert.png", CBMiscActionsInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 641);
}

export class CBSetFireInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/set-fire-insert.png", CBSetFireInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 385);
}

export class CBExtinguishFireInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/extinguish-fire-insert.png", CBExtinguishFireInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 397);
}

export class CBSetStakesInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/set-stakes-insert.png", CBSetStakesInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 334);
}

export class CBRemoveStakesInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/remove-stakes-insert.png", CBRemoveStakesInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 306);
}

export class CBPlayWeatherInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/meteo-insert.png", CBPlayWeatherInsert.DIMENSION, CBPlayWeatherInsert.PAGE_DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 600);
    static PAGE_DIMENSION = new Dimension2D(444, 1124);
}

export class CBPlayFogInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/fog-insert.png", CBPlayFogInsert.DIMENSION, CBPlayFogInsert.PAGE_DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 600);
    static PAGE_DIMENSION = new Dimension2D(444, 686);
}

export class CBPlayWindDirectionInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/wind-direction-insert.png", CBPlayWindDirectionInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 177);
}

export class CBPlayTirednessInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/wing-rest-insert.png", CBPlayTirednessInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 118);
}

export class CBPlayMoralInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/wing-moral-insert.png", CBPlayMoralInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 119);
}

export class CBPlayFireInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/fire-insert.png", CBPlayFireInsert.DIMENSION, CBPlayFireInsert.PAGE_DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 600);
    static PAGE_DIMENSION = new Dimension2D(444, 1074);
}

export class CBPlaySmokeInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/smoke-insert.png", CBPlaySmokeInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 419);
}
