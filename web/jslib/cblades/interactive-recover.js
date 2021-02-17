'use strict'

import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBAction
} from "./game.js";
import {
    CBOrderInstruction
} from "./unit.js";
import {
    CBActionMenu,
    CBInteractivePlayer,
    CBWeatherIndicator,
    CBWingTirednessIndicator,
    CBMoralInsert
} from "./interactive-player.js";

export function registerInteractiveRecover() {
    CBInteractivePlayer.prototype.restUnit = function(unit, event) {
        unit.launchAction(new InteractiveRestingAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.replenishUnitMunitions = function(unit, event) {
        unit.launchAction(new InteractiveReplenishMunitionsAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.reorganizeUnit = function(unit, event) {
        unit.launchAction(new InteractiveReorganizeAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.rallyUnit = function(unit, event) {
        unit.launchAction(new InteractiveRallyAction(this.game, unit, event));
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
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createRecoverMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveRestingAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        let wingTiredness = this.game.arbitrator.getWingTiredness(this.unit);
        let weather = this.game.arbitrator.getWeather();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBRestInsert(), new Point2D(0, -CBRestInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBCheckRestInsert(), new Point2D(-20, CBCheckRestInsert.DIMENSION.h/2)
        ).addWidget(
            new CBWingTirednessIndicator(wingTiredness),
            new Point2D(-CBRestInsert.DIMENSION.w/2-CBWingTirednessIndicator.DIMENSION.w/2-10, 0)
        ).addWidget(
            new CBWeatherIndicator(weather),
            new Point2D(CBRestInsert.DIMENSION.w/2+CBWeatherIndicator.DIMENSION.w/2-30, 200)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success, minorRestingCapacity} = this._processRestResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(CBRestInsert.DIMENSION.w/2+40, 0)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processRestResult(unit, diceResult) {
        let result = this.game.arbitrator.processRestResult(this.unit, diceResult);
        if (result.success) {
            this.unit.removeOneTirednessLevel();
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveReplenishMunitionsAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBReplenishMunitionsInsert(), new Point2D(0, -CBReplenishMunitionsInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processReplenishMunitionsResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(CBReplenishMunitionsInsert.DIMENSION.w/2+40, 0)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processReplenishMunitionsResult(unit, diceResult) {
        let result = this.game.arbitrator.processReplenishMunitionsResult(this.unit, diceResult);
        if (result.success) {
            this.unit.replenishMunitions();
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveReorganizeAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBReorganizeInsert(), new Point2D(CBReorganizeInsert.DIMENSION.w/2, -CBReorganizeInsert.DIMENSION.h/2+-60)
        ).addWidget(
            new CBCheckReorganizeInsert(), new Point2D(CBCheckReorganizeInsert.DIMENSION.w/2, CBCheckReorganizeInsert.DIMENSION.h/2+70)
        ).addWidget(
            new CBMoralInsert(),
            new Point2D(-CBMoralInsert.DIMENSION.w/2, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processReorganizeResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 0)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processReorganizeResult(unit, diceResult) {
        let result = this.game.arbitrator.processReorganizeResult(this.unit, diceResult);
        if (result.success) {
            this.unit.reorganize();
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveRallyAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBRallyInsert(), new Point2D(CBRallyInsert.DIMENSION.w/2, -CBRallyInsert.DIMENSION.h/2+-60)
        ).addWidget(
            new CBCheckRallyInsert(), new Point2D(CBCheckRallyInsert.DIMENSION.w/2, CBCheckRallyInsert.DIMENSION.h/2+70)
        ).addWidget(
            new CBMoralInsert(),
            new Point2D(-CBMoralInsert.DIMENSION.w/2, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processRallyResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(50, 0)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processRallyResult(unit, diceResult) {
        let result = this.game.arbitrator.processRallyResult(this.unit, diceResult);
        if (result.success) {
            this.unit.rally();
        }
        this.markAsFinished();
        return result;
    }

}

function createRecoverMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/do-rest.png", "/CBlades/images/icons/do-rest-gray.png",
            0, 2, event => {
                unit.player.restUnit(unit, event);
                return true;
            }).setActive(actions.rest),
        new DIconMenuItem("/CBlades/images/icons/do-reload.png", "/CBlades/images/icons/do-reload-gray.png",
            1, 2, event => {
                unit.player.replenishUnitMunitions(unit, event);
                return true;
            }).setActive(actions.reload),
        new DIconMenuItem("/CBlades/images/icons/do-reorganize.png", "/CBlades/images/icons/do-reorganize-gray.png",
            2, 2, event => {
                unit.player.reorganizeUnit(unit, event);
                return true;
            }).setActive(actions.reorganize),
        new DIconMenuItem("/CBlades/images/icons/do-rally.png", "/CBlades/images/icons/do-rally-gray.png",
            3, 2, event => {
                unit.player.rallyUnit(unit, event);
                return true;
            }).setActive(actions.rally)
    ];
}

export class CBRestInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/rest-insert.png", CBRestInsert.DIMENSION);
    }

}
CBRestInsert.DIMENSION = new Dimension2D(444, 195);

export class CBCheckRestInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-rest-insert.png", CBCheckRestInsert.DIMENSION);
    }

}
CBCheckRestInsert.DIMENSION = new Dimension2D(444, 451);

export class CBReplenishMunitionsInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-replenish-munitions-insert.png", CBReplenishMunitionsInsert.DIMENSION);
    }

}
CBReplenishMunitionsInsert.DIMENSION = new Dimension2D(444, 383);

export class CBReorganizeInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/reorganize-insert.png", CBReorganizeInsert.DIMENSION);
    }

}
CBReorganizeInsert.DIMENSION = new Dimension2D(444, 263);

export class CBCheckReorganizeInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-reorganize-insert.png", CBCheckReorganizeInsert.DIMENSION);
    }

}
CBCheckReorganizeInsert.DIMENSION = new Dimension2D(444, 245);

export class CBRallyInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/rally-insert.png", CBRallyInsert.DIMENSION);
    }

}
CBRallyInsert.DIMENSION = new Dimension2D(444, 279);

export class CBCheckRallyInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-rally-insert.png", CBCheckRallyInsert.DIMENSION);
    }

}
CBCheckRallyInsert.DIMENSION = new Dimension2D(444, 268);
