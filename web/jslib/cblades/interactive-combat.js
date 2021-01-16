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
    ActuatorImageArtifact
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
    CBInteractivePlayer.prototype.applyLossesToUnit = function(unit, losses, attacker) {
        unit.launchAction(new InteractiveRetreatAction(this.game, unit, losses, attacker));
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

    constructor(game, unit, losses, attacker) {
        super(game, unit);
        this._losses = losses;
        this._attacker = attacker;
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
        this.markAsFinished();
        this.unit.removeAction();
    }

    reorientUnit(angle) {
        this.unit.rotate(canonizeAngle(angle), 0);
    }

    takeALossFromUnit(event) {
        this.game.closeActuators();
        this.unit.takeALoss();
        this.markAsFinished();
        this.unit.removeAction();
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
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(), new Point2D(-160, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processShockAttackResult(foe, supported, dice.result);
                if (success) {
                    result.success().show();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit);
                }
                else {
                    result.failure().show();
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
        if (result.tirednessForAttacker) {
            this.unit.addOneTirednessLevel();
        }
        this.markAsFinished();
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
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBFireAttackInsert(), new Point2D(-160, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processFireAttackResult(foe, dice.result);
                if (success) {
                    result.success().show();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender, this.unit);
                }
                else {
                    result.failure().show();
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
        if (result.lowerFirerMunitions) {
            this.unit.addOneLackOfMunitionsLevel();
        }
        this.markAsFinished();
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
        this._imageArtifacts = [];
        for (let foe of foes) {
            let unsupportedShock = new ActuatorImageArtifact(this, "actuators", unsupportedImage,
                new Point2D(0, 0), new Dimension2D(100, 111));
            unsupportedShock.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            unsupportedShock.pangle = 30;
            unsupportedShock._unit = foe.unit;
            unsupportedShock._supported = false;
            this._imageArtifacts.push(unsupportedShock);
            if (foe.supported) {
                let supportedShock = new ActuatorImageArtifact(this, "actuators", supportedImage,
                    new Point2D(0, 0), new Dimension2D(100, 111));
                supportedShock.position = unsupportedShock.position.translate(30, 30);
                unsupportedShock.position = unsupportedShock.position.translate(-30, -30);
                supportedShock.pangle = 30;
                supportedShock._unit = foe.unit;
                supportedShock._supported = true;
                this._imageArtifacts.push(supportedShock);
            }
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getTrigger(unit, supported) {
        for (let artifact of this._element.artifacts) {
            if (artifact._unit === unit && artifact._supported === supported) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.shockAttackUnit(trigger._unit, trigger._supported, event);
    }

}

export class CBFireAttackActuator extends CBActuator {

    constructor(action, foes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/fire.png");
        this._imageArtifacts = [];
        for (let foe of foes) {
            let fire = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            fire.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            fire.pangle = 30;
            fire._unit = foe.unit;
            this._imageArtifacts.push(fire);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getTrigger(unit) {
        for (let artifact of this._element.artifacts) {
            if (artifact._unit === unit) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.fireAttackUnit(trigger._unit, event);
    }

}

export class CBRetreatActuator extends CBActuator {

    constructor(action, directions) {
        super(action);
        this._imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new ActuatorImageArtifact(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(104, 144));
        loss.loss = true;
        this._imageArtifacts.push(loss);
        let retreatImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
        for (let angle in directions) {
            let orientation = new ActuatorImageArtifact(this, "actuators", retreatImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            orientation.moveType = directions[angle].moveType;
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getLossTrigger() {
        for (let artifact of this._element.artifacts) {
            if (artifact.loss) return artifact;
        }
        //return null;   soon...
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (!artifact.loss && artifact.angle === angle) return artifact;
        }
        return null;
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

        function createMoveTriggers() {
            let moveImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let orientation = new ActuatorImageArtifact(this, "actuators", moveImage,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = moveDirections[angle].moveType;
                this._imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers() {
            let rotateImage = DImage.getImage("/CBlades/images/actuators/retreat-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let orientation = new ActuatorImageArtifact(this, "actuators", rotateImage,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex((angle+180)%360);
                let startLocation = Point2D.position(this.unit.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.concat(targetPosition);
                orientation.moveType = rotateDirections[angle].moveType;
                this._imageArtifacts.push(orientation);
            }
        }

        super(action);
        this._imageArtifacts = [];
        let bloodImage = DImage.getImage("/CBlades/images/actuators/blood.png");
        let loss = new ActuatorImageArtifact(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(104, 144));
        loss.loss = true;
        this._imageArtifacts.push(loss);
        createMoveTriggers.call(this);
        createRotateTriggers.call(this);
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getLossTrigger() {
        for (let artifact of this._element.artifacts) {
            if (artifact.loss) return artifact;
        }
        //return null;   soon...
    }

    getTrigger(angle, rotate) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle && artifact._rotate===rotate) return artifact;
        }
        return null;
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
