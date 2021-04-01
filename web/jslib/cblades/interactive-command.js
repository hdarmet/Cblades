'use strict'

import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenuItem, DInsert, DMask, DResult, DScene, DIconMenu, DMessage
} from "../widget.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBAction, CBActionActuator, CBGame,
    CBActuatorImageTrigger, CBUnitActuatorTrigger, RetractableActuatorMixin
} from "./game.js";
import {
    DImage
} from "../draw.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    CBOrderInstruction
} from "./unit.js";

export function registerInteractiveCommand() {
    CBInteractivePlayer.prototype.tryToTakeCommand = function(unit, event) {
        unit.launchAction(new InteractiveTakeCommandAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToDismissCommand = function(unit, event) {
        unit.launchAction(new InteractiveDismissCommandAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToChangeOrderInstructions = function(unit, event) {
        unit.launchAction(new InteractiveChangeOrderInstructionAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.startToGiveOrders = function(unit, event) {
        unit.launchAction(new InteractiveGiveOrdersAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.openOrderInstructionMenu = function(unit, offset, allowedOrderInstructions) {
        let popup = new CBOrderInstructionMenu(this.game, unit, allowedOrderInstructions);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }
    CBInteractivePlayer.prototype.changeOrderInstruction = function(unit, orderInstruction, event) {
        unit.wing.changeOrderInstruction(orderInstruction);
    }
    CBActionMenu.menuBuilders.push(
        createCommandMenuItems
    );
}
export function unregisterInteractiveCommand() {
    delete CBInteractivePlayer.prototype.tryToTakeCommand;
    delete CBInteractivePlayer.prototype.tryToDismissCommand;
    delete CBInteractivePlayer.prototype.tryToChangeOrderInstructions;
    delete CBInteractivePlayer.prototype.startToGiveOrders;
    delete CBInteractivePlayer.prototype.openOrderInstructionMenu;
    delete CBInteractivePlayer.prototype.changeOrderInstruction;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createCommandMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveTakeCommandAction extends CBAction {

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
        let close = success=>{
            mask.close(); scene.close();
            if (success) {
                this.unit.takeCommand();
            }
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBTakeCommandInsert(),
            new Point2D(CBTakeCommandInsert.DIMENSION.w/2, -CBTakeCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processTakeCommandResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processTakeCommandResult(diceResult) {
        let result = this.game.arbitrator.processTakeCommandResult(this.unit, diceResult);
        this.markAsFinished();
        return result;
    }

}

export class InteractiveDismissCommandAction extends CBAction {

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
        let close = success=>{
            mask.close(); scene.close();
            if (success) {
                this.unit.dismissCommand();
            }
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBDismissCommandInsert(),
            new Point2D(CBDismissCommandInsert.DIMENSION.w/2, -CBDismissCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processDismissCommandResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processDismissCommandResult(diceResult) {
        let result = this.game.arbitrator.processDismissCommandResult(this.unit, diceResult);
        this.markAsFinished();
        return result;
    }

}

export class InteractiveChangeOrderInstructionAction extends CBAction {

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
        let close = success=>{
            mask.close(); scene.close();
            if (success) {
                this.unit.player.openOrderInstructionMenu(this.unit,
                    this.unit.viewportLocation,
                    this.game.arbitrator.getAllowedOrderInstructions(this.unit));
                Memento.clear();
            }
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBChangeOrderInstructionInsert(),
            new Point2D(CBChangeOrderInstructionInsert.DIMENSION.w/2, -CBChangeOrderInstructionInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processChangeOderInstructionResult(dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processChangeOderInstructionResult(diceResult) {
        let result = this.game.arbitrator.processChangeOrderInstructionResult(this.unit, diceResult);
        this.markAsFinished();
        return result;
    }

}

export class InteractiveGiveOrdersAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let result = new DMessage();
        let dice = new DDice([new Point2D(0, 0)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
            if (this.unit.commandPoints) {
                this._selectUnitsToGiveOrders();
            }
            Memento.clear();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBGiveOrdersInsert(),
            new Point2D(-CBGiveOrdersInsert.DIMENSION.w/4, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                this.unit.receiveCommandPoints(this._processGiveOrdersResult(dice.result));
                result.appear(""+this.unit.commandPoints);
            }),
            new Point2D(CBGiveOrdersInsert.DIMENSION.w/4+40, 0)
        ).addWidget(
            result.setFinalAction(close, this.unit.commandPoints),
            new Point2D(CBGiveOrdersInsert.DIMENSION.w/4, 0)
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processGiveOrdersResult(diceResult) {
        let commandPoints = this.game.arbitrator.computeCommandPoints(this.unit, diceResult);
        this.markAsFinished();
        return commandPoints;
    }

    createGiveOrdersActuator(units) {
        return new CBOrderGivenActuator(this, units);
    }

    _selectUnitsToGiveOrders() {
        let targetUnits = this.game.arbitrator.getUnitsThatMayReceiveOrders(this.unit, this.unit.commandPoints);
        if (targetUnits.length) {
            let ordersActuator = this.createGiveOrdersActuator(targetUnits);
            this.game.openActuator(ordersActuator);
        }
        return targetUnits.length === 0;
    }

    giveOrder(leader, unit, event) {
        let cost = this.game.arbitrator.getOrderGivenCost(leader, unit);
        this.unit.receiveCommandPoints(this.unit.commandPoints-cost);
        unit.receiveOrder(true);
        this.game.closeActuators();
        this._selectUnitsToGiveOrders();
    }
}

function createCommandMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/take-command.png", "/CBlades/images/icons/take-command-gray.png",
            0, 4, event => {
                unit.player.tryToTakeCommand(unit, event);
                return true;
            }).setActive(actions.takeCommand),
        new DIconMenuItem("/CBlades/images/icons/leave-command.png", "/CBlades/images/icons/leave-command-gray.png",
            1, 4, event => {
                unit.player.tryToDismissCommand(unit, event);
                return true;
            }).setActive(actions.leaveCommand),
        new DIconMenuItem("/CBlades/images/icons/change-orders.png", "/CBlades/images/icons/change-orders-gray.png",
            2, 4, event => {
                unit.player.tryToChangeOrderInstructions(unit, event);
                return true;
            }).setActive(actions.changeOrders),
        new DIconMenuItem("/CBlades/images/icons/give-specific-orders.png", "/CBlades/images/icons/give-specific-orders-gray.png",
            3, 4, event => {
                unit.player.startToGiveOrders(unit, event);
                return true;
            }).setActive(actions.giveSpecificOrders)
    ];
}

export class CBOrderInstructionMenu extends DIconMenu {

    constructor(game, unit, allowedOrderInstructions) {
        super(true, new DIconMenuItem("/CBlades/images/markers/attack.png","/CBlades/images/markers/attack-gray.png",
            0, 0, event => {
                unit.player.changeOrderInstruction(unit, CBOrderInstruction.ATTACK, event);
                return true;
            }).setActive(allowedOrderInstructions.attack),
            new DIconMenuItem("/CBlades/images/markers/defend.png","/CBlades/images/markers/defend-gray.png",
                1, 0, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.DEFEND, event);
                    return true;
                }).setActive(allowedOrderInstructions.defend),
            new DIconMenuItem("/CBlades/images/markers/regroup.png","/CBlades/images/markers/regroup-gray.png",
                0, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.REGROUP, event);
                    return true;
                }).setActive(allowedOrderInstructions.regroup),
            new DIconMenuItem("/CBlades/images/markers/retreat.png","/CBlades/images/markers/retreat-gray.png",
                1, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.RETREAT, event);
                    return true;
                }).setActive(allowedOrderInstructions.retreat)
        );
        this._game = game;
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

}

export class CBOrderGivenActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, units) {
        super(action);
        let imageArtifacts = [];
        let orderImage = DImage.getImage("/CBlades/images/actuators/order.png");
        for (let unit of units) {
            let order = new CBUnitActuatorTrigger(this, unit, "units", orderImage,
                new Point2D(unit.location.x, unit.location.y-80), new Dimension2D(105, 97));
            imageArtifacts.push(order);
        }
        this.initElement(imageArtifacts, new Point2D(0, 0));
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact._unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.giveOrder(this.unit, trigger._unit, event);
    }

}

export class CBCommandInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/command-insert.png", CBCommandInsert.DIMENSION);
    }

}
CBCommandInsert.DIMENSION = new Dimension2D(444, 680);

export class CBChangeOrderInstructionInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/change-order-instruction-insert.png", CBChangeOrderInstructionInsert.DIMENSION);
    }

}
CBChangeOrderInstructionInsert.DIMENSION = new Dimension2D(444, 254);

export class CBGiveOrdersInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/orders-given-insert.png", CBGiveOrdersInsert.DIMENSION, CBGiveOrdersInsert.PAGE_DIMENSION);
    }

}
CBGiveOrdersInsert.PAGE_DIMENSION = new Dimension2D(444, 872);
CBGiveOrdersInsert.DIMENSION = new Dimension2D(444, 600);

export class CBTakeCommandInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/take-command-insert.png", CBTakeCommandInsert.DIMENSION);
    }

}
CBTakeCommandInsert.DIMENSION = new Dimension2D(444, 298);

export class CBDismissCommandInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/dismiss-command-insert.png", CBDismissCommandInsert.DIMENSION);
    }

}
CBDismissCommandInsert.DIMENSION = new Dimension2D(444, 305);