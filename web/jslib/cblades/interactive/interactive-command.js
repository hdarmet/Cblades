'use strict'

import {
    Dimension2D, Point2D
} from "../../geometry.js";
import {
    DDice, DIconMenuItem, DMask, DResult, DScene, DIconMenu, DMessage
} from "../../widget.js";
import {
    CBAction, CBAbstractGame, CBStacking
} from "../game.js";
import {
    CBActionActuator, RetractableActuatorMixin, CBInsert, CBGame
} from "../playable.js";
import {
    DAnimation,
    DImage
} from "../../draw.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    CBUnitActuatorTrigger, CBCharge,
    CBOrderInstruction, getUnitFromContext, CBStateSequenceElement
} from "../unit.js";
import {
    CBSceneAnimation,
    CBSequence, CBSequenceElement,
    WithDiceRoll
} from "../sequences.js";
import {
    SequenceLoader
} from "../loader.js";

export function registerInteractiveCommand() {
    CBInteractivePlayer.prototype.tryToTakeCommand = function(unit) {
        unit.launchAction(new InteractiveTakeCommandAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.tryToDismissCommand = function(unit) {
        unit.launchAction(new InteractiveDismissCommandAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.tryToChangeOrderInstructions = function(unit) {
        unit.launchAction(new InteractiveChangeOrderInstructionAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.startToGiveOrders = function(unit) {
        unit.launchAction(new InteractiveGiveOrdersAction(this.game, unit));
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
    CBActionMenu.menuBuilders.remove(createCommandMenuItems);
}

export class InteractiveTakeCommandAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBTakeCommandInsert(),
            new Point2D(CBTakeCommandInsert.DIMENSION.w/2, -CBTakeCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this.game.arbitrator.processTakeCommandResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 60)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let scene = this.createScene(
            success=>{
                this._processTakeCommandResult(success);
                CBSequence.appendElement(this.game, new CBTry2TakeCommandSequenceElement({
                    game: this.game, leader: this.unit, dice: scene.dice.result
                }));
                if (success) {
                    this.unit.takeCommand();
                    CBSequence.appendElement(this.game, new CBManageCommandSequenceElement({
                        game: this.game, leader: this.unit, inCommand: true
                    }));
                }
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            success=>{
                this.game.closePopup();
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processTakeCommandResult(result) {
        this.markAsFinished();
        return result;
    }

}
CBAction.register("InteractiveTakeCommandAction", InteractiveTakeCommandAction);

export class InteractiveDismissCommandAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBDismissCommandInsert(),
            new Point2D(CBDismissCommandInsert.DIMENSION.w/2, -CBDismissCommandInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this.game.arbitrator.processDismissCommandResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 60)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let scene = this.createScene(
            success=>{
                this._processDismissCommandResult();
                CBSequence.appendElement(this.game, new CBTry2DismissCommandSequenceElement({
                    game: this.game, leader: this.unit, dice: scene.dice.result
                }));
                if (success) {
                    this.unit.dismissCommand();
                    CBSequence.appendElement(this.game, new CBManageCommandSequenceElement({
                        game: this.game, leader: this.unit, inCommand: false
                    }));
                }
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            success=>{
                this.game.closePopup();
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processDismissCommandResult() {
        this.markAsFinished();
    }

}
CBAction.register("InteractiveDismissCommandAction", InteractiveDismissCommandAction);

export class InteractiveChangeOrderInstructionAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBChangeOrderInstructionInsert(),
            new Point2D(CBChangeOrderInstructionInsert.DIMENSION.w/2, -CBChangeOrderInstructionInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBCommandInsert(), new Point2D(-CBCommandInsert.DIMENSION.w/2, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let {success} = this.game.arbitrator.processChangeOrderInstructionResult(this.unit, scene.dice.result);
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success);
            }),
            new Point2D(70, 60)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let scene = this.createScene(
            ()=>{
                this._processChangeOderInstructionResult();
                CBSequence.appendElement(this.game, new CBTry2ChangeOrderInstructionSequenceElement({
                    game: this.game, leader: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            success=>{
                this.game.closePopup();
                if (success) {
                    this.unit.player.openOrderInstructionMenu(this.unit,
                        this.unit.viewportLocation,
                        this.game.arbitrator.getAllowedOrderInstructions(this.unit));
                }
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processChangeOderInstructionResult() {
        this.markAsFinished();
    }

}
CBAction.register("InteractiveChangeOrderInstructionAction", InteractiveChangeOrderInstructionAction);

export class InteractiveGiveOrdersAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
    }

    get unit() {
        return this.playable;
    }

    createScene(finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DMessage();
        scene.dice = new DDice([new Point2D(0, 0)]);
        let mask = new DMask("#000000", 0.3);
        closeAction&&mask.setAction(closeAction);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBGiveOrdersInsert({}),
            new Point2D(-CBGiveOrdersInsert.DIMENSION.w/4, 0)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                let commandPoints = this.game.arbitrator.computeCommandPoints(this.unit, scene.dice.result);
                finalAction&&finalAction(commandPoints);
                scene.result.appear(""+commandPoints);
            }),
            new Point2D(CBGiveOrdersInsert.DIMENSION.w/4+40, 0)
        ).addWidget(
            scene.result.setFinalAction(closeAction, this.unit.commandPoints),
            new Point2D(CBGiveOrdersInsert.DIMENSION.w/4, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    play() {
        this.unit.setCharging(CBCharge.NONE);
        this.game.closeActuators();
        let scene = this.createScene(
            commandPoints=>{
                this.unit.receiveCommandPoints(commandPoints);
                this.unit.setPlayed();
                CBSequence.appendElement(this.game, new CBGiveOrdersSequenceElement({
                    game: this.game, leader: this.unit, dice: scene.dice.result
                }));
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                this.game.validate();
            },
            success=>{
                this.game.closePopup();
                if (this.unit.commandPoints) {
                    this._selectUnitsToGiveOrders();
                }
                this.game.validate();
            }
        );
    }

    replay(dice) {
        let scene = this.createScene();
        scene.result.active = false;
        scene.dice.cheat(dice);
    }


    distributeCommandPoints(dice) {
        let commandPoints = this.game.arbitrator.computeCommandPoints(this.unit, [dice]);
        this.unit.receiveCommandPoints(commandPoints);
        if (this.unit.commandPoints) {
            this._selectUnitsToGiveOrders();
        }
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
            new CBGiveOrdersInsert(order.detail),
            new Point2D(-CBGiveOrdersInsert.DIMENSION.w/4, 0)
        );
        this.game.openPopup(scene, new Point2D.getEventPoint(event));
    }

    _processGiveOrdersResult() {
        this.markAsFinished();
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
        CBSequence.appendElement(this.game, new CBStateSequenceElement({game: this.game, unit}));
        this.game.closeActuators();
        this._selectUnitsToGiveOrders();
    }
}
CBAction.register("InteractiveGiveOrdersAction", InteractiveGiveOrdersAction);

function createCommandMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/take-command.png", "./../images/icons/take-command-gray.png",
            0, 4, event => {
                unit.player.tryToTakeCommand(unit);
                return true;
            }, "Prendre le commandement de l'aile").setActive(actions.takeCommand),
        new DIconMenuItem("./../images/icons/leave-command.png", "./../images/icons/leave-command-gray.png",
            1, 4, event => {
                unit.player.tryToDismissCommand(unit);
                return true;
            }, "Abandonner le commandement de l'aile").setActive(actions.leaveCommand),
        new DIconMenuItem("./../images/icons/change-orders.png", "./../images/icons/change-orders-gray.png",
            2, 4, event => {
                unit.player.tryToChangeOrderInstructions(unit);
                return true;
            }, "Changer les consignes").setActive(actions.changeOrders),
        new DIconMenuItem("./../images/icons/give-specific-orders.png", "./../images/icons/give-specific-orders-gray.png",
            3, 4, event => {
                unit.player.startToGiveOrders(unit);
                return true;
            }, "Donner des ordres").setActive(actions.giveSpecificOrders)
    ];
}

export class CBOrderInstructionMenu extends DIconMenu {

    constructor(game, unit, allowedOrderInstructions) {
        super(true, new DIconMenuItem("./../images/markers/attack.png","./../images/markers/attack-gray.png",
            0, 0, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.ATTACK);
                    CBSequence.appendElement(game, new CBChangeOrderInstructionSequenceElement({
                        game, leader: unit, orderInstruction: CBOrderInstruction.ATTACK
                    }));
                    return true;
                }, "Attaque").setActive(allowedOrderInstructions.attack),
            new DIconMenuItem("./../images/markers/defend.png","./../images/markers/defend-gray.png",
                1, 0, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.DEFEND);
                    CBSequence.appendElement(game, new CBChangeOrderInstructionSequenceElement({
                        game, leader: unit, orderInstruction: CBOrderInstruction.DEFEND
                    }));
                    return true;
                }, "Défense").setActive(allowedOrderInstructions.defend),
            new DIconMenuItem("./../images/markers/regroup.png","./../images/markers/regroup-gray.png",
                0, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.REGROUP);
                    CBSequence.appendElement(game, new CBChangeOrderInstructionSequenceElement({
                        game, leader: unit, orderInstruction: CBOrderInstruction.REGROUP
                    }));
                    return true;
                }, "Regroupement").setActive(allowedOrderInstructions.regroup),
            new DIconMenuItem("./../images/markers/retreat.png","./../images/markers/retreat-gray.png",
                1, 1, event => {
                    unit.player.changeOrderInstruction(unit, CBOrderInstruction.RETREAT);
                    CBSequence.appendElement(game, new CBChangeOrderInstructionSequenceElement({
                        game, leader: unit, orderInstruction: CBOrderInstruction.RETREAT
                    }));
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
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
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

export class CBCommandInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/command-insert.png", CBCommandInsert.DIMENSION);
    }

}
CBCommandInsert.DIMENSION = new Dimension2D(444, 680);

export class CBChangeOrderInstructionInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/change-order-instruction-insert.png", CBChangeOrderInstructionInsert.DIMENSION);
    }

}
CBChangeOrderInstructionInsert.DIMENSION = new Dimension2D(444, 254);

export class CBGiveOrdersInsert extends CBInsert {

    constructor(detail) {
        super("./../images/inserts/orders-given-insert.png", CBGiveOrdersInsert.DIMENSION, CBGiveOrdersInsert.PAGE_DIMENSION);
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

export class CBTakeCommandInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/take-command-insert.png", CBTakeCommandInsert.DIMENSION);
    }

}
CBTakeCommandInsert.DIMENSION = new Dimension2D(444, 298);

export class CBDismissCommandInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/dismiss-command-insert.png", CBDismissCommandInsert.DIMENSION);
    }

}
CBDismissCommandInsert.DIMENSION = new Dimension2D(444, 305);


export function WithLeader(clazz) {

    return class extends clazz {

        constructor({leader, ...params}) {
            super(params);
            this.leader = leader;
        }

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            this.leader && (spec.leader = this.leader.name);
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            if (spec.leader !== undefined) {
                this.leader = getUnitFromContext(context, spec.leader);
            }
        }

    }

}

export class CBTry2ChangeOrderInstructionSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({id, game, leader, dice}) {
        super({id, type: "try2-order-instructions", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveChangeOrderInstructionAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("try2-order-instructions", CBTry2ChangeOrderInstructionSequenceElement);

export class CBChangeOrderInstructionSequenceElement extends WithLeader(WithOrderInstruction(CBSequenceElement)) {

    constructor({id, game, leader, orderInstruction}) {
        super({id, type: "change-instructions", leader, orderInstruction, game});
    }

    apply(startTick) {
        return new CBChangeOrderAnimation({
            game: this.game, leader:this.leader, orderInstruction: this.orderInstruction, startTick, duration:200
        });
    }

}
CBSequence.register("change-instructions", CBChangeOrderInstructionSequenceElement);

export function WithOrderInstruction(clazz) {

    return class extends clazz {

        constructor({orderInstruction, ...params}) {
            super(params);
            this.orderInstruction = orderInstruction;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (this.orderInstruction !== element.orderInstruction) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            if (this.orderInstruction !== undefined) result+=", Order Instruction: "+this.orderInstruction;
            return result;
        }

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            spec.orderInstruction = this.getOrderInstructionCode(this.orderInstruction);
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            if (spec.orderInstruction !== undefined) {
                this.orderInstruction = this.getOrderInstruction(spec.orderInstruction);
            }
        }

        getOrderInstructionCode(orderInstruction) {
            if (orderInstruction===CBOrderInstruction.ATTACK) return "A";
            else if (orderInstruction===CBOrderInstruction.DEFEND) return "D";
            else if (orderInstruction===CBOrderInstruction.REGROUP) return "G";
            else return "R";
        }

        getOrderInstruction(code) {
            switch (code) {
                case "A": return CBOrderInstruction.ATTACK;
                case "D": return CBOrderInstruction.DEFEND;
                case "G": return CBOrderInstruction.REGROUP;
                case "R": return CBOrderInstruction.RETREAT;
            }
        }

    }

}

export class CBChangeOrderAnimation extends DAnimation {

    constructor({game, leader, orderInstruction, startTick, duration}) {
        super();
        this._game = game;
        this._leader = leader;
        this._duration = duration;
        this._orderInstruction = orderInstruction;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0 && this._leader) {
            this._leader.wing.changeOrderInstruction(this._orderInstruction);
        }
        return false;
    }

}

export class CBTry2TakeCommandSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({id, game, leader, dice}) {
        super({id, type: "try2-take-command", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveTakeCommandAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("try2-take-command", CBTry2TakeCommandSequenceElement);

export class CBTry2DismissCommandSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({id, game, leader, dice}) {
        super({id, type: "try2-dismiss-command", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveDismissCommandAction(this.game, this.leader).replay(this.dice)
        });
    }

}
CBSequence.register("try2-dismiss-command", CBTry2DismissCommandSequenceElement);

export class CBGiveOrdersSequenceElement extends WithLeader(WithDiceRoll(CBSequenceElement)) {

    constructor({id, game, leader, dice}) {
        super({id, type: "give-orders", game, leader, dice});
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => new InteractiveGiveOrdersAction(this.game, this.leader).replay(this.dice)
        });
    }

    static launch(leader, {dice1}, context) {
        new InteractiveGiveOrdersAction(leader.game, leader).distributeCommandPoints(dice1);
    }

}
CBSequence.register("give-orders", CBGiveOrdersSequenceElement);

export function WithInCommand(clazz) {

    return class extends clazz {

        constructor({inCommand, ...params}) {
            super(params);
            this.inCommand = inCommand;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (element.inCommand !== this.inCommand) return false;
            return true;
        }

        _toString() {
            return super._toString() + `, inCommand: `+this.inCommand;
        }

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            spec.inCommand = this.inCommand;
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            this.inCommand = spec.inCommand;
        }
    }

}

export class CBManageCommandSequenceElement extends WithLeader(WithInCommand(CBSequenceElement)) {

    constructor({id, game, leader, inCommand}) {
        super({id, type: "manage-command", leader, inCommand, game});
    }

    apply(startTick) {
        return new CBManageCommandAnimation({
            game: this.game, leader:this.leader, inCommand: this.inCommand, startTick, duration:200
        });
    }

}
CBSequence.register("manage-command", CBManageCommandSequenceElement);

export class CBManageCommandAnimation extends DAnimation {

    constructor({game, leader, inCommand, startTick, duration}) {
        super();
        this._game = game;
        this._leader = leader;
        this._duration = duration;
        this._inCommand = inCommand;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            this._leader.wing.setLeader(this._inCommand ? this._leader : null);
        }
        return false;
    }

}
