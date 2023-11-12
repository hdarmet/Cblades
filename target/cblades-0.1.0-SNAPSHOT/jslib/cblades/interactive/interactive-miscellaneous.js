'use strict'

import {
    DDice,
    DIconMenu,
    DIconMenuItem, DMask, DResult, DScene, DSwipe
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
    CBCharge, CBStateSequenceElement, CBUnitSceneAnimation
} from "../unit.js";
import {
    Dimension2D, Point2D
} from "../../geometry.js";
import {
    CBBurningCounter, CBFireCounter, CBSmokeCounter, CBStakesCounter
} from "../miscellaneous.js";
import {
    Mechanisms
} from "../../mechanisms.js";
import {
    DImage, getDrawPlatform
} from "../../draw.js";
import {
    CBSceneAnimation,
    CBSequence, CBSequenceElement, WithDiceRoll
} from "../sequences.js";
import {
    SequenceLoader
} from "../loader.js";
import {
    CBHexLocation
} from "../map.js";

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
        let action = new InteractivePlayWeatherAction(this.game, counter);
        counter.launchAction(action);
    }
    CBInteractivePlayer.prototype.playFog = function(counter) {
        let action = new InteractivePlayFogAction(this.game, counter);
        counter.launchAction(action);
    }
    CBInteractivePlayer.prototype.playWindDirection = function(counter) {
        let action = new InteractivePlayWindDirectionAction(this.game, counter);
        counter.launchAction(action);
    }
    CBInteractivePlayer.prototype.playTiredness = function(counter) {
        let action = new InteractivePlayTirednessAction(this.game, counter);
        counter.launchAction(action);
    }
    CBInteractivePlayer.prototype.playMoral = function(counter) {
        let action = new InteractivePlayMoralAction(this.game, counter);
        counter.launchAction(action);
    }
    CBInteractivePlayer.prototype.playSmokeAndFire = function(counter) {
        let action = new InteractivePlaySmokeAndFireAction(this.game, counter);
        counter.launchAction(action);
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
    return fireStart;
}

function deleteStartFireCounter(game, hexLocation) {
    let fireStart = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
    if (fireStart) {
        fireStart.removeFromMap();
    }
    return fireStart;
}

function playFireOption(game, option) {
    if (option.hexLocation === option.fireCounter.hexLocation) {
        if (option.isFirstFire && option.isSecondFire) {
            option.fireCounter.setFire();
            let smokeCounter = PlayableMixin.getOneByType(option.hexLocation, CBSmokeCounter);
            if (smokeCounter) {
                smokeCounter.removeFromMap();
            }
        }
        else if (!option.isFirstFire && !option.isSecondFire) {
            deleteStartFireCounter(game, option.hexLocation);
        }
    }
    else {
        if (option.isFirstFire && option.isSecondFire) {
            createStartFireCounter(game, option.hexLocation);
        }
    }
}

export class InteractiveSetFireAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction) {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather(this.game);
        let scene = new DScene();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        scene.result = new DResult();
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
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processSetFireResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 70)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.game.closeActuators();
        this.unit.setCharging(CBCharge.NONE);
        let scene = this.createScene(
            result=>{
                let fireStart = this._processSetFireResult(result);
                CBSequence.appendElement(this.game, new CBSetFireSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result,
                    token: fireStart
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene(
            result=>{
                this._processSetFireResult(result);
            }
        );
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processSetFireResult(result) {
        let fireStart = null;
        if (result.success) {
            fireStart = createStartFireCounter(this.game, this.unit.hexLocation);
        }
        this.markAsFinished();
        return fireStart;
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

    createScene(finalAction) {
        this.game.closeActuators();
        let weather = this.game.arbitrator.getWeather(this.game);
        let scene = new DScene();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        scene.result = new DResult();
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
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processExtinguishFireResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 70)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.game.closeActuators();
        this.unit.setCharging(CBCharge.NONE);
        let scene = this.createScene(
            result=>{
                let token = this._processExtinguishFireResult(result);
                CBSequence.appendElement(this.game, new CBExtinguishFireSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result, token
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene(
            result=>{
                this._processExtinguishFireResult(result);
            }
        );
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processExtinguishFireResult(result) {
        let token = undefined;
        if (result.success) {
            token = deleteStartFireCounter(this.game, this.unit.hexLocation);
        }
        this.markAsFinished();
        return token;
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

    createScene(finalAction) {
        this.game.closeActuators();
        let scene = new DScene();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        scene.result = new DResult();
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
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processSetStakesResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 70)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.game.closePopup();
        this.unit.setCharging(CBCharge.NONE);
        let scene = this.createScene(
            result=>{
                let token = this._processSetStakesResult(result);
                CBSequence.appendElement(this.game, new CBSetStakesSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result, token
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene(
            result=>{
                this._processSetStakesResult(result);
            }
        );
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processSetStakesResult(result) {
        let token = undefined;
        if (result.success) {
            token = new CBStakesCounter();
            token.angle = this.unit.angle;
            token.appendToMap(this.unit.hexLocation);
        }
        this.markAsFinished();
        return token;
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

    createScene(finalAction) {
        this.game.closeActuators();
        let scene = new DScene();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        scene.result = new DResult();
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
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processRemoveStakesResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 70)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.playable.viewportLocation);
        return scene;
    }

    play() {
        this.game.closePopup();
        this.unit.setCharging(CBCharge.NONE);
        let scene = this.createScene(
            result=>{
                let token = this._processRemoveStakesResult(result);
                CBSequence.appendElement(this.game, new CBRemoveStakesSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result, token
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene(
            result=>{
                this._processRemoveStakesResult(result);
            }
        );
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processRemoveStakesResult(result) {
        let token = undefined;
        if (result.success) {
            token = PlayableMixin.getOneByType(this.unit.hexLocation, CBStakesCounter);
            if (token) {
                token.removeFromMap();
            }
        }
        this.markAsFinished();
        return token;
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

    constructor(game, counter, location=counter?counter.viewportLocation:null) {
        super(game, counter);
        this._location = location;
    }

    createScene(finalAction) {
        this.game.closeActuators();
        let scene = new DScene();
        scene.dice = new DDice([new Point2D(0, 0)]);
        scene.result = new DResult();
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
            scene.dice.setFinalAction(()=>{
                this._played = true;
                scene.dice.active = false;
                scene.dice.result = [6];
                let result = this.game.arbitrator.processPlayFireResult(this.game, scene.dice.result);
                if (result.playFire) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(30, 30)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this._location);
        return scene;
    }

    play() {
        this.game.closePopup();
        let scene = this.createScene(
            result=>{
                this._options = this.createOptions(
                    PlayableMixin.getAllByType(this.game, CBFireCounter),
                );
                this._processPlayFireResult(this.game, result);
                CBSequence.appendElement(this.game, new CBPlaySmokeAndFireSequenceElement({
                    game: this.game, dice: scene.dice.result, location: this._location, options: this._options
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice, options) {
        let scene = this.createScene(
            result=>{
                this._processReplayFireResult(this.game, options);
            }
        );
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _createFires(counters, fireCount, noFireCount) {
        let lotCount = Math.ceil(counters.length/30);
        let fires = [];
        for (let lot=0; lot<lotCount; lot++) {
            let lotFireCount = fireCount;
            let lotNoFireCount = noFireCount;
            while(lotCount+lotNoFireCount>0) {
                let random = getDrawPlatform().random();
                let range = Math.floor(random * (lotFireCount + lotNoFireCount));
                if (range < lotFireCount) {
                    fires.push(true);
                    lotFireCount--;
                } else {
                    fires.push(false);
                    lotNoFireCount--;
                }
            }
        }
        return fires;
    }

    isPlayed() {
        return !!this._played;
    }

    _processPlayFireResult(game, result) {
        this.markAsStarted();
        this.game.setFocusedPlayable(this.playable);
        this.updateSmokes();
        this.putDenseSmoke();
        this.markBurningAsFinished();
        if (result.playFire) {
            this.openPlayFireActuator(this._options);
        }
        else {
            this.markAsFinished();
        }
        this.game.validate();
        return result;
    }

    _processReplayFireResult(game, options) {
        this.updateSmokes();
        this.putDenseSmoke();
        this.markBurningAsFinished();
        this.playAllOptions(options);
        this.game.validate();
    }

    createOptions(counters) {
        return this._createOptions(counters,  15, 15);
    }

    _createOptions(counters, fireCount, noFireCount) {
        let fires = this._createFires(counters, fireCount, noFireCount);
        let options = [];
        for (let counter of counters) {
            if (counter.isFire()) {
                let hexLocation = counter.hexLocation.getNearHex(this.game.windDirection);
                let fireCounter = PlayableMixin.getOneByType(hexLocation, CBFireCounter);
                if (!fireCounter) {
                    options.push({
                        fireCounter: counter,
                        hexLocation,
                        isFirstFire: fires.pop(),
                        isSecondFire: fires.pop()
                    });
                }
            }
            else {
                options.push({
                    fireCounter: counter,
                    hexLocation: counter.hexLocation,
                    isFirstFire: fires.pop(),
                    isSecondFire: fires.pop()
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

    _playOption(option) {
        option.played = true;
        playFireOption(this.game, option);
    }

    playOption(option) {
        this.game.closeActuators();
        this._playOption(option);
        this.openPlayFireActuator(this._options);
    }

    playAllOptions(options) {
        this.game.closeActuators();
        for (let option of options) {
            this._playOption(option);
        }
    }

    isFinishable() {
        for (let option of this._options) {
            if (!option.revealed) return false;
        }
        return true;
    }

}
CBAction.register("InteractivePlaySmokeAndFireAction", InteractivePlaySmokeAndFireAction);

class PlayFireTrigger extends CBPlayableActuatorTrigger {

    constructor(actuator, option, location) {
        let image = DImage.getImage("./../images/actuators/isburning.png");
        super(actuator, option.fireCounter, "actuators", image, location, PlayFireTrigger.DIMENSION);
        this._option = option;
    }

    get counter() {
        return this.playable;
    }

    get option() {
        return this._option;
    }

    static DIMENSION = new Dimension2D(128, 128);
}

class RevealedPlayFireTrigger extends CBPlayableActuatorTrigger {

    constructor(actuator, isFire, option, location) {
        let image = isFire ?
                DImage.getImage("./../images/actuators/burn.png") :
                DImage.getImage("./../images/actuators/nofire.png");
        super(actuator, option.fireCounter, "actuators", image, location, RevealedPlayFireTrigger.DIMENSION);
        this._option = option;
    }

    get counter() {
        return this.playable;
    }

    get option() {
        return this._option;
    }

    static DIMENSION = new Dimension2D(142, 142);
}

export class CBPlayFireActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, options) {
        super(action);
        this._triggers = [];
        for (let option of options) {
            if (!option.played) {
                if (!option.revealed) {
                    let trigger = new PlayFireTrigger(this, option, option.hexLocation.location);
                    this._triggers.push(trigger);
                }
                else {
                    let triggerOne = new RevealedPlayFireTrigger(
                        this, option.isFirstFire, option, option.hexLocation.location);
                    this._triggers.push(triggerOne);
                    let triggerTwo = new RevealedPlayFireTrigger(
                        this, option.isSecondFire, option, option.hexLocation.location.translate(-40, -40));
                    this._triggers.push(triggerTwo);
                }
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

export class CBSetFireSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice, token}) {
        super({id, type:"set-fire", game, unit, dice});
        this.token = token;
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveSetFireAction(this.game, this.unit).replay(this.dice)
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        if (this.token) {
            spec.token = this._token.toSpecs();
        }
    }

}
CBSequence.register("set-fire", CBSetFireSequenceElement);

export class CBExtinguishFireSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice, token}) {
        super({id, type:"extinguish-fire", game, unit, dice});
        this.token = token;
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveExtinguishFireAction(this.game, this.unit).replay(this.dice)
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        if (this.token) {
            spec.token = this.token.toSpecs();
        }
    }

}
CBSequence.register("extinguish-fire", CBExtinguishFireSequenceElement);

export class CBSetStakesSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice, token}) {
        super({id, type:"set-stakes", game, unit, dice});
        this.token = token;
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveSetStakesAction(this.game, this.unit).replay(this.dice)
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        if (this.token) {
            spec.token = this.token.toSpecs();
        }
    }

}
CBSequence.register("set-stakes", CBSetStakesSequenceElement);

export class CBRemoveStakesSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice, token}) {
        super({id, type:"remove-stakes", game, unit, dice});
        this.token = token;
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveRemoveStakesAction(this.game, this.unit).replay(this.dice)
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        if (this.token) {
            spec.token = this.token.toSpecs();
        }
    }

}
CBSequence.register("remove-stakes", CBRemoveStakesSequenceElement);

export class CBPlaySmokeAndFireSequenceElement extends WithDiceRoll(CBSequenceElement) {

    constructor({id, game, location, dice, options}) {
        super({id, type:"fire-and-smoke", game, dice});
        this.options = options;
        this.location = location;
        this._delay = this.options ? 50*this.options.length : 0;
    }

    get delay() { return this._delay; }

    apply(startTick) {
        return new CBSceneAnimation({
            startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractivePlaySmokeAndFireAction(
                this.game, null, this.location).replay(this.dice, this.options)
        });
    }

    _fromSpecs(specs, context) {
        super._fromSpecs(specs, context);
        this._delay = 50*specs.options.length;
        this.location = specs.location;
        this.options = [];
        for (let option of specs.options) {
            this.options.push({
                fireCounter: PlayableMixin.getOneByType(this.game.map.getHex(
                    option.fireCounter.positionCol, option.fireCounter.positionRow), CBFireCounter),
                hexLocation: CBHexLocation.fromSpecs(this.game.map, option.hexLocation),
                isFirstFire: option.isFirstFire,
                isSecondFire: option.isSecondFire
            });
        }
    }

    _toSpecs(specs, context) {
        super._toSpecs(specs, context);
        specs.location = this.location;
        specs.options = [];
        for (let option of this.options) {
            specs.options.add({
                fireCounter: option.fireCounter.toSpecs(),
                hexLocation: option.hexLocation.toSpecs(),
                isFirstFire: option.isFirstFire,
                isSecondFire: option.isSecondFire
            });
        }
    }


}
CBSequence.register("fire-and-smoke", CBPlaySmokeAndFireSequenceElement);
