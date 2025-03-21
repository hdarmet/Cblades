'use strict'

import {
    Dimension2D, Point2D
} from "../../board/geometry.js";
import {
    DDice6, DIconMenuItem, DMask, DResult, DScene
} from "../../board/widget.js";
import {
    WAction
} from "../../wargame/game.js";
import {
    WInsert
} from "../../wargame/playable.js";
import {
    CBActionMenu,
    CBInteractivePlayer,
    CBWeatherIndicator,
    CBWingTirednessIndicator,
    CBMoralInsert,
    WithDiceRoll
} from "./interactive-player.js";
import {
    CBCharge, CBStateSequenceElement
} from "../unit.js";
import {
    WSequence
} from "../../wargame/sequences.js";
import {
    SequenceLoader
} from "../loader.js";
import {
    WUnitSceneAnimation
} from "../../wargame/wunit.js";

export function registerInteractiveRecover() {
    CBInteractivePlayer.prototype.restUnit = function(unit) {
        unit.launchAction(new InteractiveRestingAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.replenishUnitMunitions = function(unit) {
        unit.launchAction(new InteractiveReplenishMunitionsAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.reorganizeUnit = function(unit) {
        unit.launchAction(new InteractiveReorganizeAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.rallyUnit = function(unit) {
        unit.launchAction(new InteractiveRallyAction(this.game, unit));
    }
    CBActionMenu.menuBuilders.push(
        createRecoverMenuItems
    );
}
export function unregisterInteractiveRecover() {
    delete CBInteractivePlayer.prototype.restUnit;
    delete CBInteractivePlayer.prototype.replenishUnitMunitions;
    delete CBInteractivePlayer.prototype.reorganizeUnit;
    delete CBInteractivePlayer.prototype.rallyUnit;
    CBActionMenu.menuBuilders.remove(createRecoverMenuItems);
}

export class InteractiveRestingAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction) {
        let weather = this.game.arbitrator.getWeather(this.game);
        let scene = new DScene();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        scene.tirednessIndicator = new CBWingTirednessIndicator(this.unit.wing);
        scene.result = new DResult();
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBRestInsert(), new Point2D(0, -CBRestInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBCheckRestInsert(), new Point2D(-20, CBCheckRestInsert.DIMENSION.h/2)
        ).addWidget(
            scene.tirednessIndicator,
            new Point2D(-CBRestInsert.DIMENSION.w/2-CBWingTirednessIndicator.DIMENSION.w/2-10, 0)
        ).addWidget(
            new CBWeatherIndicator(weather),
            new Point2D(CBRestInsert.DIMENSION.w/2+CBWeatherIndicator.DIMENSION.w/2-30, 200)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processRestResult(this.unit, scene.dice.result);
                if (result.restingCapacity!==undefined) {
                    scene.tirednessIndicator.changeState(result.restingCapacity-4);
                }
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(CBRestInsert.DIMENSION.w/2+40, 0)
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
                this._processRestResult(result);
                WSequence.appendElement(this.game, new CBRestSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processRestResult(result) {
        if (result.success) {
            this.unit.removeOneTirednessLevel();
        }
        if (result.restingCapacity!==undefined) {
            this.unit.wing.changeTiredness(result.restingCapacity);
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveReplenishMunitionsAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBReplenishMunitionsInsert(), new Point2D(0, -CBReplenishMunitionsInsert.DIMENSION.h/2+10)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processReplenishMunitionsResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(CBReplenishMunitionsInsert.DIMENSION.w/2+40, 0)
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
                this._processReplenishMunitionsResult(result);
                WSequence.appendElement(this.game, new CBRefillSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processReplenishMunitionsResult(result) {
        if (result.success) {
            this.unit.replenishMunitions();
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveReorganizeAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBReorganizeInsert(), new Point2D(CBReorganizeInsert.DIMENSION.w/2, -CBReorganizeInsert.DIMENSION.h/2+-60)
        ).addWidget(
            new CBCheckReorganizeInsert(), new Point2D(CBCheckReorganizeInsert.DIMENSION.w/2, CBCheckReorganizeInsert.DIMENSION.h/2+70)
        ).addWidget(
            new CBMoralInsert(this.unit),
            new Point2D(-CBMoralInsert.DIMENSION.w/2, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processReorganizeResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 0)
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
                this._processReorganizeResult(result);
                WSequence.appendElement(this.game, new CBReorganizeSequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processReorganizeResult(result) {
        if (result.success) {
            this.unit.reorganize();
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveRallyAction extends WAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice6([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBRallyInsert(), new Point2D(CBRallyInsert.DIMENSION.w/2, -CBRallyInsert.DIMENSION.h/2+-60)
        ).addWidget(
            new CBCheckRallyInsert(), new Point2D(CBCheckRallyInsert.DIMENSION.w/2, CBCheckRallyInsert.DIMENSION.h/2+70)
        ).addWidget(
            new CBMoralInsert(this.unit),
            new Point2D(-CBMoralInsert.DIMENSION.w/2, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let result = this.game.arbitrator.processRallyResult(this.unit, scene.dice.result);
                if (result.success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(result);
            }),
            new Point2D(50, 0)
        ).addWidget(
            scene.result.setFinalAction(close),
            new Point2D(0, 0)
        );
        return scene;
    }

    play() {
        this.game.closeActuators();
        this.unit.setCharging(CBCharge.NONE);
        let scene = this.createScene(
            result=>{
                this._processRallyResult(result);
                WSequence.appendElement(this.game, new CBRallySequenceElement({
                    game: this.game, unit: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, WSequence.getSequence(this.game));
                this.game.validate();
            }
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processRallyResult(result) {
        if (result.success) {
            this.unit.rally();
        }
        this.markAsFinished();
        return result;
    }

}

function createRecoverMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/do-rest.png", "./../images/icons/do-rest-gray.png",
            0, 2, event => {
                unit.player.restUnit(unit);
                return true;
            },"Se reposer").setActive(actions.rest),
        new DIconMenuItem("./../images/icons/do-reload.png", "./../images/icons/do-reload-gray.png",
            1, 2, event => {
                unit.player.replenishUnitMunitions(unit);
                return true;
            }, "Se ravitailler en munitions").setActive(actions.reload),
        new DIconMenuItem("./../images/icons/do-reorganize.png", "./../images/icons/do-reorganize-gray.png",
            2, 2, event => {
                unit.player.reorganizeUnit(unit);
                return true;
            }, "Se réorganiser").setActive(actions.reorganize),
        new DIconMenuItem("./../images/icons/do-rally.png", "./../images/icons/do-rally-gray.png",
            3, 2, event => {
                unit.player.rallyUnit(unit);
                return true;
            }, "Se rallier").setActive(actions.rally)
    ];
}

export class CBRestInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/rest-insert.png", CBRestInsert.DIMENSION);
    }

}
CBRestInsert.DIMENSION = new Dimension2D(444, 195);

export class CBCheckRestInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/check-rest-insert.png", CBCheckRestInsert.DIMENSION);
    }

}
CBCheckRestInsert.DIMENSION = new Dimension2D(444, 451);

export class CBReplenishMunitionsInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/check-replenish-munitions-insert.png", CBReplenishMunitionsInsert.DIMENSION);
    }

}
CBReplenishMunitionsInsert.DIMENSION = new Dimension2D(444, 383);

export class CBReorganizeInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/reorganize-insert.png", CBReorganizeInsert.DIMENSION);
    }

}
CBReorganizeInsert.DIMENSION = new Dimension2D(444, 263);

export class CBCheckReorganizeInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/check-reorganize-insert.png", CBCheckReorganizeInsert.DIMENSION);
    }

}
CBCheckReorganizeInsert.DIMENSION = new Dimension2D(444, 245);

export class CBRallyInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/rally-insert.png", CBRallyInsert.DIMENSION);
    }

}
CBRallyInsert.DIMENSION = new Dimension2D(444, 279);

export class CBCheckRallyInsert extends WInsert {

    constructor() {
        super( "./../images/inserts/check-rally-insert.png", CBCheckRallyInsert.DIMENSION);
    }

}
CBCheckRallyInsert.DIMENSION = new Dimension2D(444, 268);


export class CBRestSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"rest", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveRestingAction(this.game, this.unit).replay(this.dice)
        });
    }

}
WSequence.register("rest", CBRestSequenceElement);

export class CBRefillSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"refill", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveReplenishMunitionsAction(this.game, this.unit).replay(this.dice)
        });
    }

}
WSequence.register("refill", CBRefillSequenceElement);

export class CBRallySequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"rally", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: ()=>new InteractiveRallyAction(this.game, this.unit).replay(this.dice)
        });
    }

}
WSequence.register("rally", CBRallySequenceElement);

export class CBReorganizeSequenceElement extends WithDiceRoll(CBStateSequenceElement) {

    constructor({id, game, unit, dice}) {
        super({id, type:"reorganize", game, unit, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new WUnitSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: ()=>new InteractiveReorganizeAction(this.game, this.unit).replay(this.dice)
        });
    }

}
WSequence.register("reorganize", CBReorganizeSequenceElement);


