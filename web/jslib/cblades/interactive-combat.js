'use strict'

import {
    canonizeAngle,
    diffAngle,
    Dimension2D, Point2D, sumAngle
} from "../geometry.js";
import {
    DDice, DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBAction, CBActuator, CBHexSideId,
    CBActuatorImageArtifact
} from "./game.js";
import {
    CBFormation
} from "./unit.js";
import {
    CBActionMenu,
    CBInteractivePlayer
} from "./interactive-player.js";
import {
    DElement
} from "../board.js";
import {
    DImage
} from "../draw.js";

export function registerInteractiveCombat() {
    CBInteractivePlayer.prototype.unitShockAttack = function (unit, event) {
        unit.launchAction(new InteractiveShockAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitFireAttack = function (unit, event) {
        unit.launchAction(new InteractiveFireAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.applyLossesToUnit = function(unit, losses, attacker, continuation) {
        unit.launchAction(new InteractiveRetreatAction(this.game, unit, losses, attacker, continuation));
    }
    CBActionMenu.menuBuilders.push(
        createCombatMenuItems
    );
}
export function unregisterInteractiveCombat() {
    delete CBInteractivePlayer.prototype.unitShockAttack;
    delete CBInteractivePlayer.prototype.unitFireAttack;
    delete CBInteractivePlayer.prototype.applyLossesToUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createCombatMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveRetreatAction extends CBAction {

    constructor(game, unit, losses, attacker, continuation) {
        super(game, unit);
        this._losses = losses;
        this._attacker = attacker;
        this._continuation = continuation;
    }

    play() {
        this.game.setFocusedUnit(this.unit);
        this._createRetreatActuator();
    }

    _createRetreatActuator() {
        if (this.unit instanceof CBFormation) {
            let {retreatDirections, rotateDirections} = this.game.arbitrator.getFormationRetreatZones(this.unit, this._attacker);
            let retreatActuator = this.createFormationRetreatActuator(retreatDirections, rotateDirections);
            this.game.openActuator(retreatActuator);
        }
        else {
            let retreatDirections = this.game.arbitrator.getRetreatZones(this.unit, this._attacker);
            let retreatActuator = this.createRetreatActuator(retreatDirections);
            this.game.openActuator(retreatActuator);
        }
    }

    retreatUnit(hexId, event, moveType) {
        this.game.closeActuators();
        this.unit.move(hexId, 0, moveType);
        this.unit.addOneCohesionLevel();
        this._finalizeAction();
    }

    reorientUnit(angle) {
        this.unit.rotate(canonizeAngle(angle), 0);
    }

    takeALossFromUnit(event) {
        this.game.closeActuators();
        this.unit.takeALoss();
        this._finalizeAction();
    }

    _finalizeAction() {
        this.markAsFinished();
        this.unit.removeAction();
        this._continuation();
    }

    createRetreatActuator(directions) {
        return new CBRetreatActuator(this, directions);
    }

    createFormationRetreatActuator(moveDirections, rotateDirection) {
        return new CBFormationRetreatActuator(this, moveDirections, rotateDirection);
    }

}

export class InteractiveShockAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createShockAttackActuator(this.unit);
    }

    _createShockAttackActuator() {
        let foesThatMayBeShockAttacked = this.game.arbitrator.getFoesThatMayBeShockAttacked(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeShockAttacked.length) {
            let shockAttackActuator = this.createShockAttackActuator(foesThatMayBeShockAttacked);
            this.game.openActuator(shockAttackActuator);
        }
    }

    shockAttackUnit(foe, supported, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(), new Point2D(-160, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let report = this._processShockAttackResult(foe, supported, dice.result);
                let continuation = ()=>{
                    if (!report.played) {
                        this._createShockAttackActuator(this.unit);
                    }
                }
                if (report.success) {
                    result.success().appear();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit, continuation);
                }
                else {
                    result.failure().appear();
                    continuation();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    _processShockAttackResult(foe, supported, diceResult) {
        let result = this.game.arbitrator.processShockAttackResult(this.unit, foe, supported, diceResult);
        this.unit.setAttackLocation(result.attackLocation);
        if (result.tirednessForAttacker) {
            this.unit.addOneTirednessLevel();
        }
        if (result.played) {
            this.markAsFinished();
        }
        else {
            this.markAsStarted();
        }
        return result;
    }

    createShockAttackActuator(foes) {
        return new CBShockAttackActuator(this, foes);
    }

}

export class InteractiveFireAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createFireAttackActuator(this.unit);
    }

    _createFireAttackActuator() {
        let foesThatMayBeFireAttacked = this.game.arbitrator.getFoesThatMayBeFireAttacked(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeFireAttacked.length) {
            let fireAttackActuator = this.createFireAttackActuator(foesThatMayBeFireAttacked);
            this.game.openActuator(fireAttackActuator);
        }
    }

    fireAttackUnit(foe, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            mask.close();
            scene.close();
        };
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBFireAttackInsert(), new Point2D(-160, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let report = this._processFireAttackResult(foe, dice.result);
                let continuation = ()=>{
                    if (!report.played) {
                        this._createFireAttackActuator(this.unit);
                    }
                }
                if (report.success) {
                    result.success().appear();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit, continuation);
                }
                else {
                    result.failure().appear();
                    continuation();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    _processFireAttackResult(foe, diceResult) {
        let result = this.game.arbitrator.processFireAttackResult(this.unit, foe, diceResult);
        this.unit.setAttackLocation(result.attackLocation);
        if (result.lowerFirerMunitions) {
            this.unit.addOneLackOfMunitionsLevel();
        }
        if (result.played) {
            this.markAsFinished();
        }
        else {
            this.markAsStarted();
        }
        return result;
    }

    createFireAttackActuator(foes) {
        return new CBFireAttackActuator(this, foes);
    }

}

function createCombatMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/shock-attack.png", "/CBlades/images/icons/shock-attack-gray.png",
            0, 1, event => {
                unit.player.unitShockAttack(unit, event);
                return true;
            }).setActive(actions.shockAttack),
        new DIconMenuItem("/CBlades/images/icons/fire-attack.png", "/CBlades/images/icons/fire-attack-gray.png",
            1, 1, event => {
                unit.player.unitFireAttack(unit, event);
                return true;
            }).setActive(actions.fireAttack),
        new DIconMenuItem("/CBlades/images/icons/shock-duel.png", "/CBlades/images/icons/shock-duel-gray.png",
            2, 1, () => {
            }).setActive(actions.shockDuel),
        new DIconMenuItem("/CBlades/images/icons/fire-duel.png", "/CBlades/images/icons/fire-duel-gray.png",
            3, 1, () => {
            }).setActive(actions.fireDuel)
    ];
}

export class CBShockAttackActuator extends CBActuator {

    constructor(action, foes) {
        super(action);
        let unsupportedImage = DImage.getImage("/CBlades/images/actuators/unsupported-shock.png");
        let supportedImage = DImage.getImage("/CBlades/images/actuators/supported-shock.png");
        let imageArtifacts = [];
        for (let foe of foes) {
            let unsupportedShock = new CBActuatorImageArtifact(this, "actuators", unsupportedImage,
                new Point2D(0, 0), new Dimension2D(100, 111));
            unsupportedShock.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            unsupportedShock.pangle = 30;
            unsupportedShock._unit = foe.unit;
            unsupportedShock._supported = false;
            imageArtifacts.push(unsupportedShock);
            if (foe.supported) {
                let supportedShock = new CBActuatorImageArtifact(this, "actuators", supportedImage,
                    new Point2D(0, 0), new Dimension2D(100, 111));
                supportedShock.position = unsupportedShock.position.translate(30, 30);
                unsupportedShock.position = unsupportedShock.position.translate(-30, -30);
                supportedShock.pangle = 30;
                supportedShock._unit = foe.unit;
                supportedShock._supported = true;
                imageArtifacts.push(supportedShock);
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit, supported) {
        return this.findTrigger(artifact=>artifact._unit === unit && artifact._supported === supported);
    }

    onMouseClick(trigger, event) {
        this.action.shockAttackUnit(trigger._unit, trigger._supported, event);
    }

}

export class CBFireAttackActuator extends CBActuator {

    constructor(action, foes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/fire.png");
        let imageArtifacts = [];
        for (let foe of foes) {
            let fire = new CBActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            fire.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            fire.pangle = 30;
            fire._unit = foe.unit;
            imageArtifacts.push(fire);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact._unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.fireAttackUnit(trigger._unit, event);
    }

}

export class CBRetreatActuator extends CBActuator {

    constructor(action, directions) {
        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new CBActuatorImageArtifact(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(104, 144));
        loss.loss = true;
        imageArtifacts.push(loss);
        let retreatImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
        for (let angle in directions) {
            let orientation = new CBActuatorImageArtifact(this, "actuators", retreatImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            orientation.moveType = directions[angle].moveType;
            imageArtifacts.push(orientation);
        }
        this.initElement(imageArtifacts);
    }

    getLossTrigger() {
        return this.findTrigger(artifact=>artifact.loss);
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=>!artifact.loss && artifact.angle === angle);
    }

    onMouseClick(trigger, event) {
        if (trigger.loss) {
            this.action.takeALossFromUnit(event);
        }
        else {
            this.action.retreatUnit(this.unit.hexLocation.getNearHex(trigger.angle), event, trigger.moveType);
        }
    }

}

export class CBFormationRetreatActuator extends CBActuator {

    constructor(action, moveDirections, rotateDirections) {

        function createMoveTriggers(imageArtifacts) {
            let moveImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageArtifact(this, "actuators", moveImage,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = moveDirections[angle].moveType;
                imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers(imageArtifacts) {
            let rotateImage = DImage.getImage("/CBlades/images/actuators/retreat-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageArtifact(this, "actuators", rotateImage,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = rotateDirections[angle].moveType;
                imageArtifacts.push(orientation);
            }
        }

        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new CBActuatorImageArtifact(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(104, 144));
        loss.loss = true;
        imageArtifacts.push(loss);
        createMoveTriggers.call(this, imageArtifacts);
        createRotateTriggers.call(this, imageArtifacts);
        this.initElement(imageArtifacts);
    }

    getLossTrigger() {
        return this.findTrigger(artifact=>artifact.loss);
    }

    getTrigger(angle, rotate) {
        return this.findTrigger(artifact=>artifact.pangle === angle && artifact.rotate===rotate);
    }

    onMouseClick(trigger, event) {
        if (trigger.loss) {
            this.action.takeALossFromUnit(event);
        }
        else if (trigger.rotate) {
            let hex1 = this.unit.hexLocation.getOtherHex(trigger.hex);
            let hex2 = trigger.hex.getNearHex(trigger.angle);
            let delta = diffAngle(this.unit.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.unit.angle, delta));
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.moveType);
        }
        else {
            let hex1 = this.unit.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.unit.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.moveType);
        }
    }

}

export class CBShockAttackInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/shock-attack-insert.png", CBShockAttackInsert.DIMENSION);
    }

}
CBShockAttackInsert.DIMENSION = new Dimension2D(405, 658);

export class CBFireAttackInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/fire-attack-insert.png", CBShockAttackInsert.DIMENSION);
    }

}
CBFireAttackInsert.DIMENSION = new Dimension2D(405, 658);

export class CBCombatResultTableInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/combat-result-table-insert.png", CBCombatResultTableInsert.DIMENSION);
    }

}
CBCombatResultTableInsert.DIMENSION = new Dimension2D(804, 174);
