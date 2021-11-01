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
    CBAction, CBActuator, CBAbstractGame
} from "./game.js";
import {
    CBActionActuator, RetractableActuatorMixin, WidgetLevelMixin
} from "./playable.js";
import {
    DImage
} from "../draw.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    CBUnitActuatorTrigger, CBCharge,
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
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN));
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

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = success=>{
            this.game.closePopup();
            if (success) {
                this.unit.takeCommand();
            }
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBTakeCommandInsert(this.game),
            new Point2D(CBTakeCommandInsert.DIMENSION.w/2, -CBTakeCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(this.game), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
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
        );
        this.game.openPopup(scene, new Point2D(this._event.offsetX, this._event.offsetY));
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

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = success=>{
            this.game.closePopup();
            if (success) {
                this.unit.dismissCommand();
            }
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBDismissCommandInsert(this.game),
            new Point2D(CBDismissCommandInsert.DIMENSION.w/2, -CBDismissCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(this.game), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
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
        );
        this.game.openPopup(scene, new Point2D(this._event.offsetX, this._event.offsetY));
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

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = success=>{
            this.game.closePopup();
            if (success) {
                this.unit.player.openOrderInstructionMenu(this.unit,
                    this.unit.viewportLocation,
                    this.game.arbitrator.getAllowedOrderInstructions(this.unit));
                Memento.clear();
            }
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBChangeOrderInstructionInsert(this.game),
            new Point2D(CBChangeOrderInstructionInsert.DIMENSION.w/2, -CBChangeOrderInstructionInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(this.game), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
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
        );
        this.game.openPopup(scene, new Point2D(this._event.offsetX, this._event.offsetY));
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

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let result = new DMessage();
        let dice = new DDice([new Point2D(0, 0)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
            if (this.unit.commandPoints) {
                this._selectUnitsToGiveOrders();
            }
            Memento.clear();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBGiveOrdersInsert(this.game, {}),
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
        );
        this.game.openPopup(scene, new Point2D.getEventPoint(this._event));
    }

    showRules(order, event) {
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBGiveOrdersInsert(this.game, order.detail),
            new Point2D(-CBGiveOrdersInsert.DIMENSION.w/4, 0)
        );
        this.game.openPopup(scene, new Point2D.getEventPoint(event));
    }

    _processGiveOrdersResult(diceResult) {
        let commandPoints = this.game.arbitrator.computeCommandPoints(this.unit, diceResult);
        this.markAsFinished();
        return commandPoints;
    }

    createGiveOrdersActuator(orders) {
        return new CBOrderGivenActuator(this, orders);
    }

    createGiveOrdersHelpActuator(orders) {
        return new CBOrderGivenHelpActuator(this, orders);
    }

    _selectUnitsToGiveOrders() {
        let orders = this.game.arbitrator.getUnitsThatMayReceiveOrders(this.unit, this.unit.commandPoints);
        if (orders.length) {
            let ordersActuator = this.createGiveOrdersActuator(orders);
            this.game.openActuator(ordersActuator);
            let helpActuator = this.createGiveOrdersHelpActuator(orders);
            this.game.openActuator(helpActuator);
        }
        return orders.length === 0;
    }

    giveOrder(leader, unit, event) {
        let cost = this.game.arbitrator.getOrderGivenCost(leader, unit).cost;
        this.unit.receiveCommandPoints(this.unit.commandPoints-cost);
        unit.receivesOrder(true);
        this.game.closeActuators();
        this._selectUnitsToGiveOrders();
    }
}

function createCommandMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/take-command.png", "./../images/icons/take-command-gray.png",
            0, 4, event => {
                unit.player.tryToTakeCommand(unit, event);
                return true;
            }, "Prendre le commandement de l'aile").setActive(actions.takeCommand),
        new DIconMenuItem("./../images/icons/leave-command.png", "./../images/icons/leave-command-gray.png",
            1, 4, event => {
                unit.player.tryToDismissCommand(unit, event);
                return true;
            }, "Abandonner le commandement de l'aile").setActive(actions.leaveCommand),
        new DIconMenuItem("./../images/icons/change-orders.png", "./../images/icons/change-orders-gray.png",
            2, 4, event => {
                unit.player.tryToChangeOrderInstructions(unit, event);
                return true;
            }, "Changer les consignes").setActive(actions.changeOrders),
        new DIconMenuItem("./../images/icons/give-specific-orders.png", "./../images/icons/give-specific-orders-gray.png",
            3, 4, event => {
                unit.player.startToGiveOrders(unit, event);
                return true;
            }, "Donner des ordres").setActive(actions.giveSpecificOrders)
    ];
}

export class CBOrderInstructionMenu extends DIconMenu {

    constructor(game, unit, allowedOrderInstructions) {
        super(true, new DIconMenuItem("./../images/markers/attack.png","./../images/markers/attack-gray.png",
            0, 0, event => {
                unit.player.changeOrderInstruction(unit, CBOrderInstruction.ATTACK, event);
                return true;
            }, "Attaque").setActive(allowedOrderInstructions.attack),
            new DIconMenuItem("./../images/markers/defend.png","./../images/markers/defend-gray.png",
                1, 0, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.DEFEND, event);
                    return true;
                }, "Défense").setActive(allowedOrderInstructions.defend),
            new DIconMenuItem("./../images/markers/regroup.png","./../images/markers/regroup-gray.png",
                0, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.REGROUP, event);
                    return true;
                }, "Regroupement").setActive(allowedOrderInstructions.regroup),
            new DIconMenuItem("./../images/markers/retreat.png","./../images/markers/retreat-gray.png",
                1, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.RETREAT, event);
                    return true;
                }, "Retraite").setActive(allowedOrderInstructions.retreat)
        );
        this._game = game;
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

}

class OrderGivenHelpTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, order) {
        let image = DImage.getImage("./../images/actuators/order-given-cost.png");
        super(actuator, order.unit, "units", image, new Point2D(order.unit.location.x, order.unit.location.y-125), OrderGivenHelpTrigger.DIMENSION);
        this.pangle = 0;
        this._order = order;
    }

    _paint() {
        super._paint();
        this._level.setShadowSettings("#000000", 0);
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings("#006600");
        this._level.fillText("" + this._order.cost, new Point2D(0, 0));
    }

    get order() {
        return this._order;
    }

    get unit() {
        return this._order.unit;
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }

}

OrderGivenHelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBOrderGivenHelpActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, orders) {
        super(action);
        this._triggers = [];
        for (let order of orders) {
            let orderGivenHelp = new OrderGivenHelpTrigger(this, order);
            this._triggers.push(orderGivenHelp);
        }
        this.initElement(this._triggers, new Point2D(0, 0));
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact.unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.showRules(trigger.order, event);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBAbstractGame.FULL_VISIBILITY ? 1:0);
        }
    }

}

export class CBOrderGivenActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, orders) {
        super(action);
        let imageArtifacts = [];
        let orderImage = DImage.getImage("./../images/actuators/order.png");
        for (let order of orders) {
            let trigger = new CBUnitActuatorTrigger(this, order.unit, "units", orderImage,
                new Point2D(order.unit.location.x, order.unit.location.y-80), new Dimension2D(105, 97));
            imageArtifacts.push(trigger);
        }
        this.initElement(imageArtifacts, new Point2D(0, 0));
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact.playable === unit);
    }

    onMouseClick(trigger, event) {
        this.action.giveOrder(this.playable, trigger.playable, event);
    }

}

export class CBCommandInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/command-insert.png", CBCommandInsert.DIMENSION);
    }

}
CBCommandInsert.DIMENSION = new Dimension2D(444, 680);

export class CBChangeOrderInstructionInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/change-order-instruction-insert.png", CBChangeOrderInstructionInsert.DIMENSION);
    }

}
CBChangeOrderInstructionInsert.DIMENSION = new Dimension2D(444, 254);

export class CBGiveOrdersInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, detail) {
        super(game, "./../images/inserts/orders-given-insert.png", CBGiveOrdersInsert.DIMENSION, CBGiveOrdersInsert.PAGE_DIMENSION);
        if (detail.base) {
            this.setMark(new Point2D(20, 427));
        }
        if (detail.routed) {
            this.setMark(new Point2D(25, 545));
        }
        if (detail.disrupted) {
            this.setMark(new Point2D(25, 510));
        }
        if (detail.exhausted) {
            this.setMark(new Point2D(25, 530));
        }
        if (detail.distance) {
            this.setMark(new Point2D(25, 565));
        }
    }

}
CBGiveOrdersInsert.PAGE_DIMENSION = new Dimension2D(444, 872);
CBGiveOrdersInsert.DIMENSION = new Dimension2D(444, 600);

export class CBTakeCommandInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/take-command-insert.png", CBTakeCommandInsert.DIMENSION);
    }

}
CBTakeCommandInsert.DIMENSION = new Dimension2D(444, 298);

export class CBDismissCommandInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/dismiss-command-insert.png", CBDismissCommandInsert.DIMENSION);
    }

}
CBDismissCommandInsert.DIMENSION = new Dimension2D(444, 305);