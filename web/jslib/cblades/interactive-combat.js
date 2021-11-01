'use strict'

import {
    Area2D,
    canonizeAngle,
    diffAngle,
    Dimension2D, invertAngle, Point2D, sumAngle
} from "../geometry.js";
import {
    DAbstractInsert,
    DDice, DIconMenuItem, DInsert, DInsertFrame, DMask, DResult, DScene
} from "../widget.js";
import {
    CBAbstractGame,
    CBAction, CBActuator
} from "./game.js";
import {
    CBActionActuator, CBActuatorImageTrigger, CBMask, WidgetLevelMixin, RetractableActuatorMixin
} from "./playable.js";
import {
    CBHexSideId
} from "./map.js";
import {
    CBCharge, CBUnitActuatorTrigger
} from "./unit.js";
import {
    CBActionMenu,
    CBInteractivePlayer
} from "./interactive-player.js";
import {
    DImage
} from "../draw.js";
import {
    CBCombatTeacher
} from "./teachers/combat-teacher.js";
import {
    Memento
} from "../mechanisms.js";

export function registerInteractiveCombat() {
    CBInteractivePlayer.prototype.unitShockAttack = function (unit, event) {
        unit.launchAction(new InteractiveShockAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitFireAttack = function (unit, event) {
        unit.launchAction(new InteractiveFireAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitDuelAttack = function (unit, event) {
        unit.launchAction(new InteractiveDuelAttackAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.unitDuelFire = function (unit, event) {
        unit.launchAction(new InteractiveDuelFireAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.applyLossesToUnit = function(unit, losses, attacker, advance, continuation) {
        for (let loss=1; loss<losses; loss++) {
            unit.takeALoss();
        }
        if (!unit.isDestroyed()) {
            unit.launchAction(new InteractiveRetreatAction(this.game, unit, losses, attacker, advance, continuation));
        }
        else {
            continuation();
        }
    }
    CBInteractivePlayer.prototype.advanceAttacker = function(unit, directions, continuation) {
        unit.launchAction(new InteractiveAdvanceAction(this.game, unit, directions, continuation));
    }
    CBActionMenu.menuBuilders.push(
        createCombatMenuItems
    );
}
export function unregisterInteractiveCombat() {
    delete CBInteractivePlayer.prototype.unitShockAttack;
    delete CBInteractivePlayer.prototype.unitFireAttack;
    delete CBInteractivePlayer.prototype.unitDuelAttack;
    delete CBInteractivePlayer.prototype.applyLossesToUnit;
    delete CBInteractivePlayer.prototype.advanceAttacker;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createCombatMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveAdvanceAction extends CBAction {

    constructor(game, unit, directions, continuation) {
        super(game, unit);
        this._directions = directions;
        this._continuation = continuation;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.game.setFocusedPlayable(this.unit);
        this._createAdvanceActuator();
    }

    _createAdvanceActuator() {
        console.assert(!this.unit.formationNature);
        let advanceActuator = this.createAdvanceActuator(this._directions);
        this.game.openActuator(advanceActuator);
    }

    advanceUnit(hexLocation) {
        let actualHex = this.unit.hexLocation;
        this.game.closeActuators();
        this.unit.advance(hexLocation);
        this._finalizeAction();
    }

    _finalizeAction() {
        this.markAsFinished();
        this.unit.removeAction();
        this._continuation();
    }

    createAdvanceActuator(directions) {
        return new CBAdvanceActuator(this, directions);
    }

}

export class InteractiveRetreatAction extends CBAction {

    constructor(game, unit, losses, attacker, advance, continuation) {
        super(game, unit);
        this._losses = losses;
        this._attacker = attacker;
        this._advance = advance;
        this._continuation = continuation;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.setFocusedPlayable(this.unit);
        this._createRetreatActuator();
    }

    _createRetreatActuator() {
        if (this.unit.formationNature) {
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

    advanceAttacker(hexLocation, continuation) {
        let directions = this.game.arbitrator.getAdvanceZones(this._attacker, hexLocation.hexes);
        if (this._advance && this._attacker.isCharging() && directions.length>0) {
            let hexes = [];
            for (let sangle in directions) {
                hexes.push(directions[sangle].hex);
            }
            if (hexes.length === 1) {
                this._attacker.advance(hexes[0]);
                continuation();
            }
            else {
                this._attacker.player.advanceAttacker(this._attacker, directions, continuation);
            }
        }
        else {
            this._attacker.markAsCharging(CBCharge.NONE);
            continuation();
        }
    }

    retreatUnit(hexLocation, stacking) {
        let actualHex = this.unit.hexLocation;
        this.game.closeActuators();
        this.unit.retreat(hexLocation, stacking);
        this.advanceAttacker(actualHex, ()=>{
            this._finalizeAction();
        });
    }

    reorientUnit(angle) {
        this.unit.rotate(canonizeAngle(angle), 0);
    }

    takeALossFromUnit(event) {
        let actualHex = this.unit.hexLocation;
        this.game.closeActuators();
        this.unit.takeALoss();
        this.advanceAttacker(actualHex, ()=>{
            this._finalizeAction();
        });
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

export class InteractiveAbstractShockAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
        this._attackHex = unit.formationNature ? unit.hexLocation.fromHex : unit.hexLocation;
        this._attackHexes = new Set();
    }

    get unit() {
        return this.playable;
    }

    play() {
        this._createShockAttackActuator(this.unit);
    }

    _memento() {
        let memento =  super._memento();
        memento.attackHex = this._attackHex;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._attackHex = memento.attackHex;
    }

    get attackHex() {
        return this._attackHex;
    }

    _createCombatRecords(foes) {
        let combats = [];
        for (let attackHex of this.unit.hexLocation.hexes) {
            for (let foe of foes) {
                for (let attackedHex of foe.unit.hexLocation.hexes) {
                    if (attackHex.isNearHex(attackedHex)!==false && this.game.arbitrator.canCross(this.unit, attackHex, attackedHex)) {
                        let combat = {foe: foe.unit, attackHex, attackedHex};
                        combats.push(combat);
                        if (foe.unsupported) {
                            combat.unsupported = true;
                            combat.unsupportedAdvantage = this.game.arbitrator.getShockAttackAdvantage(this.unit, attackHex, foe.unit, attackedHex, false); // LA
                        }
                        if (foe.supported) {
                            combat.supported = true;
                            combat.supportedAdvantage = this.game.arbitrator.getShockAttackAdvantage(this.unit, attackHex, foe.unit, attackedHex, true); // LA
                        }
                    }
                }
            }
        }
        return combats;
    }

    _createShockAttackActuator() {
        let foesThatMayBeShockAttacked = this._getFoes(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeShockAttacked.length) {
            let shockHexActuator = this.createShockHexActuator();
            this.game.openActuator(shockHexActuator);
            let combats = this._createCombatRecords(foesThatMayBeShockAttacked);
            let shockAttackActuator = this.createShockAttackActuator(combats);
            this.game.openActuator(shockAttackActuator);
            let shockHelpActuator = this.createShockHelpActuator(combats);
            this.game.openActuator(shockHelpActuator);
            return true;
        }
        return false;
    }

    changeAttackHex(attackHex) {
        this.game.closeActuators();
        Memento.register(this);
        this._attackHex = attackHex;
        this._createShockAttackActuator();
    }

    _hasPlayed() {
        return this._attackHexes.size===(this.unit.formationNature ? 2 : 1);
    }

    shockAttackUnit(attackerHex, defender, defenderHex, supported, advantage, event) { // LA
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
            if (result.finished) {
                let continuation = ()=>{
                    this.unit.changeAction(this);   // In case, attack action is replaced by advance action...
                    if (this._hasPlayed() || !this._createShockAttackActuator(this.unit)) {
                        this.markAsFinished();
                    }
                }
                if (result.report.success) {
                    defender.player.applyLossesToUnit(defender, result.report.lossesForDefender, this.unit, true, continuation);
                }
                else {
                    this.unit.markAsCharging(CBCharge.NONE);
                    continuation();
                }
            }
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(this.game, advantage), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                result.report = this._processShockAttackResult(attackerHex, defender, defenderHex, supported, dice.result);
                if (result.report.success) {
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
        this.game.openPopup(scene, new Point2D(event.offsetX, event.offsetY));
    }

    _processShockAttackResult(attackerHex, defender, defenderHex, supported, diceResult) { // LA
        let result = this.game.arbitrator.processShockAttackResult(this.unit, attackerHex, defender, defenderHex, supported, diceResult);
        this._attackHexes.add(attackerHex);
        for (let hex of this.unit.hexLocation.hexes) {
            if (!this._attackHexes.has(hex)) {
                this._attackHex = hex;
                break;
            }
        }
        if (result.tirednessForAttacker) {
            this.unit.addOneTirednessLevel();
        }
        this.markAsStarted();
        return result;
    }

    _getAdvantageCell(foe) {
        return this.game.arbitrator.getShockWeaponCell(this.unit, foe);
    }

    showRules(foe, supported, advantage, event) {
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBShockAttackInsert(this.game, advantage), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert(this.game).focus(
                advantageCell.col, advantageCell.row),
            new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2)
        );
        this.game.openPopup(scene, new Point2D(event.offsetX, event.offsetY));
    }

    createShockHexActuator() {
        return new CBShockHexActuator(this);
    }

    createShockAttackActuator(combats) {
        return new CBShockAttackActuator(this, combats);
    }

    createShockHelpActuator(combats) {
        return new CBShockHelpActuator(this, combats);
    }

}

export class InteractiveShockAttackAction extends InteractiveAbstractShockAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeShockAttacked(unit);
    }

}

export class InteractiveDuelAttackAction extends InteractiveAbstractShockAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeDuelAttacked(unit);
    }

}

export class InteractiveAbstractFireAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
        this._attackHex = unit.formationNature ? unit.hexLocation.fromHex : unit.hexLocation;
        this._attackHexes = new Set();
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this._createFireAttackActuator(this.unit);
    }

    _memento() {
        let memento =  super._memento();
        memento.attackHex = this._attackHex;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._attackHex = memento.attackHex;
    }

    get attackHex() {
        return this._attackHex;
    }

    changeAttackHex(attackHex) {
        this.game.closeActuators();
        Memento.register(this);
        this._attackHex = attackHex;
        this._createFireAttackActuator();
    }

    _hasPlayed() {
        let played = true;
        for (let hex of this.unit.hexLocation.hexes) {
            if (!this._attackHexes.has(hex)) {
                return false;
            }
        }
        return played;
    }

    _createFireRecords(foes) {
        let fires = [];
        for (let attackHex of this.unit.hexLocation.hexes) {
            for (let foe of foes) {
                for (let attackedHex of foe.unit.hexLocation.hexes) {
                    let fire = {
                        foe: foe.unit,
                        advantage: this.game.arbitrator.getFireAttackAdvantage(this.unit, attackHex, foe.unit, attackedHex),
                        attackHex,
                        attackedHex
                    }
                    fires.push(fire);
                }
            }
        }
        return fires;
    }

    _createFireAttackActuator() {
        let foesThatMayBeFireAttacked = this._getFoes(this.unit, this._attackHex);
        this.game.closeActuators();
        if (foesThatMayBeFireAttacked.length) {
            let fireHexActuator = this.createFireHexActuator();
            this.game.openActuator(fireHexActuator);
            let fires = this._createFireRecords(foesThatMayBeFireAttacked);
            let fireAttackActuator = this.createFireAttackActuator(fires);
            this.game.openActuator(fireAttackActuator);
            let fireHelpActuator = this.createFireHelpActuator(fires);
            this.game.openActuator(fireHelpActuator);
            return true;
        }
        return false;
    }

    fireAttackUnit(firerHex, target, targetHex, advantage, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
            if (result.finished) {
                let continuation = () => {
                    if (this._hasPlayed() || !this._createFireAttackActuator(this.unit)) {
                        this.markAsFinished();
                    }
                }
                if (result.report.success) {
                    target.player.applyLossesToUnit(target, result.report.lossesForDefender, this.unit, false, continuation);
                } else {
                    continuation();
                }
            }
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBFireAttackInsert(this.game, advantage), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                result.report = this._processFireAttackResult(firerHex, target, targetHex, dice.result);
                if (result.report.success) {
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
        this.game.openPopup(scene, new Point2D(event.offsetX, event.offsetY));
    }

    _processFireAttackResult(firerHex, target, targetHex, diceResult) {
        let result = this.game.arbitrator.processFireAttackResult(this.unit, firerHex, target, targetHex, diceResult);
        this._attackHexes.add(firerHex);
        for (let hex of this.unit.hexLocation.hexes) {
            if (!this._attackHexes.has(hex)) {
                this._attackHex = hex;
                break;
            }
        }
        if (result.lowerFirerMunitions) {
            this.unit.addOneMunitionsLevel();
        }
        this.markAsStarted();
        return result;
    }

    _getAdvantageCell(foe) {
        return this.game.arbitrator.getFireWeaponCell(this.unit, foe);
    }

    showRules(foe, advantage, event) {
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask(this.game, "#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBFireAttackInsert(this.game, advantage), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert(this.game).focus(
                advantageCell.col, advantageCell.row),
                new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2
            )
        );
        this.game.openPopup(scene, new Point2D(event.offsetX, event.offsetY));
    }

    createFireHexActuator() {
        return new CBFireHexActuator(this);
    }

    createFireAttackActuator(fires) {
        return new CBFireAttackActuator(this, fires);
    }

    createFireHelpActuator(fires) {
        return new CBFireHelpActuator(this, fires);
    }

}

export class InteractiveFireAttackAction extends InteractiveAbstractFireAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit, hexId) {
        return this.game.arbitrator.getFoesThatMayBeFireAttackedFromHex(unit, hexId);
    }

}

export class InteractiveDuelFireAction extends InteractiveAbstractFireAttackAction {

    constructor(game, unit, event) {
        super(game, unit, event);
    }

    _getFoes(unit, hexId) {
        return this.game.arbitrator.getFoesThatMayBeDuelFiredFromHex(unit, hexId);
    }

}

function createCombatMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/shock-attack.png", "./../images/icons/shock-attack-gray.png",
            0, 1, event => {
                unit.player.unitShockAttack(unit, event);
                return true;
            }, "Attaquer au choc").setActive(actions.shockAttack),
        new DIconMenuItem("./../images/icons/fire-attack.png", "./../images/icons/fire-attack-gray.png",
            1, 1, event => {
                unit.player.unitFireAttack(unit, event);
                return true;
            }, "Attaquer au tir").setActive(actions.fireAttack),
        new DIconMenuItem("./../images/icons/shock-duel.png", "./../images/icons/shock-duel-gray.png",
            2, 1, event => {
                unit.player.unitDuelAttack(unit, event);
                return true;
            }, "Provoquer un duel au choc").setActive(actions.shockDuel),
        new DIconMenuItem("./../images/icons/fire-duel.png", "./../images/icons/fire-duel-gray.png",
            3, 1, event => {
                unit.player.unitDuelFire(unit, event);
                return true;
            }, "Provoquer un duel au tir").setActive(actions.fireDuel)
    ];
}

class ShockHexTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, unit, attackHex) {
        super(actuator, unit, "units",
            DImage.getImage("./../images/actuators/shock-attacker-hex.png"),
            new Point2D(0, 0), new Dimension2D(60, 75));
        this.position = Point2D.position(unit.location, attackHex.location, 1); // LA
        this.pangle = unit.angle;
        this.attackHex = attackHex;
    }

}

export class CBShockHexActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action) {
        super(action);
        let imageArtifacts = [];
        for (let hex of this.playable.hexLocation.hexes) {
            if (hex!==this.action.attackHex && !this.action._attackHexes.has(hex)) {
                var hexTrigger = new ShockHexTrigger(this, this.playable, hex);
                imageArtifacts.push(hexTrigger);
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(attackHex) {
        return this.findTrigger(trigger=>trigger.attackHex === attackHex);
    }

    onMouseClick(trigger, event) {
        this.action.changeAttackHex(trigger.attackHex);
    }

}

class FireHexTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, unit, attackHex) {
        super(actuator, unit, "units",
            DImage.getImage("./../images/actuators/firer-hex.png"),
            new Point2D(0, 0), new Dimension2D(60, 75));
        this.position = Point2D.position(unit.location, attackHex.location, 1); // LA
        this.pangle = unit.angle;
        this.attackHex = attackHex;
    }

}

export class CBFireHexActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action) {
        super(action);
        let imageArtifacts = [];
        for (let hex of this.playable.hexLocation.hexes) {
            if (hex!==this.action.attackHex && !this.action._attackHexes.has(hex)) {
                var hexTrigger = new FireHexTrigger(this, this.playable, hex);
                imageArtifacts.push(hexTrigger);
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(attackHex) {
        return this.findTrigger(trigger=>trigger.attackHex === attackHex);
    }

    onMouseClick(trigger, event) {
        this.action.changeAttackHex(trigger.attackHex);
    }

}

class ShockAttackTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, unit, supported, combat) {
        super(actuator, combat.foe, "units",
            supported ?
                DImage.getImage("./../images/actuators/supported-shock.png"):
                DImage.getImage("./../images/actuators/unsupported-shock.png"),
            new Point2D(0, 0),
            new Dimension2D(100, 111));
        this.position = Point2D.position(unit.location, combat.attackedHex.location, 1); // LA
        this.pangle = 30;
        this.supported = supported;
        this.attackHex = combat.attackHex;
        this.attackedHex = combat.attackedHex;
        this._advantage = supported ? combat.supportedAdvantage : combat.unsupportedAdvantage;
    }

    get advantage() {
        return this._advantage;
    }

}

export class CBShockAttackActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, combats) {
        super(action);
        let imageArtifacts = [];
        for (let combat of combats) {
            if (combat.attackHex === action.attackHex) {
                if (combat.unsupported) {
                    var unsupportedShock = new ShockAttackTrigger(this, this.playable, false, combat);
                    if (combat.supported) {
                        unsupportedShock.position = unsupportedShock.position.translate(-40, -40);
                    }
                    imageArtifacts.push(unsupportedShock);
                }
                if (combat.supported) {
                    var supportedShock = new ShockAttackTrigger(this, this.playable, true, combat);
                    if (combat.unsupported) {
                        supportedShock.position = supportedShock.position.translate(40, 40);
                    }
                    imageArtifacts.push(supportedShock);
                }
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit, supported) {
        return this.findTrigger(trigger=>trigger.unit === unit && trigger.supported === supported);
    }

    onMouseClick(trigger, event) {
        this.action.shockAttackUnit(trigger.attackHex, trigger.unit, trigger.attackedHex, trigger.supported, trigger.advantage, event);
    }

}

class FireAttackTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, unit, combat) {
        super(actuator, combat.foe, "units",
            DImage.getImage("./../images/actuators/fire.png"),
            new Point2D(0, 0),
            new Dimension2D(100, 155));
        this.position = Point2D.position(unit.location, combat.foe.location, 1);
        this.pangle = 30;
        this.attackHex = combat.attackHex;
        this.attackedHex = combat.attackedHex;
        this._advantage = combat.advantage;
    }

    get advantage() {
        return this._advantage;
    }

}

export class CBFireAttackActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, fires) {
        super(action);
        let image = DImage.getImage("./../images/actuators/fire.png");
        let imageArtifacts = [];
        for (let fire of fires) {
            if (fire.attackHex === action.attackHex) {
                let fireTrigger = new FireAttackTrigger(this, this.playable, fire);
                imageArtifacts.push(fireTrigger);
            }
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact.unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.fireAttackUnit(trigger.attackHex, trigger.unit, trigger.attackedHex, trigger.advantage, event);
    }

}

class ShockHelpTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, supported, foe, attackedHex, advantage) {
        let image = supported ?
            DImage.getImage("./../images/actuators/supported-shock-advantage.png"):
            DImage.getImage("./../images/actuators/unsupported-shock-advantage.png");
        super(actuator, foe, "units", image, new Point2D(0, 0), ShockHelpTrigger.DIMENSION);
        this.pangle = 0;
        this.position = Point2D.position(actuator.playable.location, attackedHex.location, 1);
        this._foe = foe;
        this._supported = supported;
        this._advantage = advantage;
    }

    _paint() {
        super._paint();
        this._level.setShadowSettings("#000000", 0);
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings(this._supported ? "#9D2F12" : "#AD5A2D");
        this._level.fillText("" + this._advantage.advantage, new Point2D(0, 0));
    }

    get foe() {
        return this._foe;
    }

    get supported() {
        return this._supported;
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }

}
ShockHelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBShockHelpActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, combats) {
        super(action);
        this._triggers = [];
        for (let combat of combats) {
            if (combat.attackHex === action.attackHex) {
                if (combat.unsupported) {
                    let unsupportedHelp = new ShockHelpTrigger(this, false, combat.foe, combat.attackedHex, combat.unsupportedAdvantage);
                    this._triggers.push(unsupportedHelp);
                    if (combat.supported) {
                        unsupportedHelp.position = unsupportedHelp.position.translate(-75, -75);
                    } else {
                        unsupportedHelp.position = unsupportedHelp.position.translate(40, 40);
                    }
                }
                if (combat.supported) {
                    let supportedHelp = new ShockHelpTrigger(this, true, combat.foe, combat.attackedHex, combat.supportedAdvantage);
                    this._triggers.push(supportedHelp);
                    if (combat.unsupported) {
                        supportedHelp.position = supportedHelp.position.translate(75, 75);
                    } else {
                        supportedHelp.position = supportedHelp.position.translate(40, 40);
                    }
                }
            }
        }
        this.initElement(this._triggers);
    }

    getTrigger(foe, supported) {
        return this.findTrigger(artifact=>artifact.foe === foe && artifact.supported === supported);
    }

    onMouseClick(trigger, event) {
        this.action.showRules(trigger.foe, trigger._supported, trigger._advantage, event);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBAbstractGame.FULL_VISIBILITY ? 1:0);
        }
    }

}

class FireHelpTrigger extends CBUnitActuatorTrigger {

    constructor(actuator, foe, advantage) {
        let image = DImage.getImage("./../images/actuators/fire-advantage.png");
        super(actuator, foe, "units", image, new Point2D(0, 0), ShockHelpTrigger.DIMENSION);
        this.pangle = 0;
        this.position = Point2D.position(actuator.playable.location, foe.location, 1);
        this._foe = foe;
        this._advantage = advantage;
    }

    _paint() {
        super._paint();
        this._level.setShadowSettings("#000000", 0);
        this._level.setTextSettings("bold 30px serif", "center");
        this._level.setFillSettings("#A1124F");
        this._level.fillText("" + this._advantage.advantage, new Point2D(0, 0));
    }

    setVisibility(visibility) {
        this.alpha = visibility;
    }

    get foe() {
        return this._foe;
    }
}
FireHelpTrigger.DIMENSION = new Dimension2D(55, 55);

export class CBFireHelpActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, fires) {
        super(action);
        this._triggers = [];
        for (let fire of fires) {
            if (fire.attackHex === action.attackHex) {
                let help = new FireHelpTrigger(this, fire.foe, fire.advantage);
                this._triggers.push(help);
                help.position = help.position.translate(40, 40);
            }
        }
        this.initElement(this._triggers);
    }

    getTrigger(foe) {
        return this.findTrigger(artifact=>artifact._foe === foe);
    }

    onMouseClick(trigger, event) {
        this.action.showRules(trigger.foe, trigger._advantage, event);
    }

    setVisibility(level) {
        super.setVisibility(level);
        for (let artifact of this.triggers) {
            artifact.setVisibility && artifact.setVisibility(level===CBAbstractGame.FULL_VISIBILITY ? 1:0);
        }
    }
}

export class CBAdvanceActuator extends CBActionActuator {

    constructor(action, directions) {
        super(action);
        let imageArtifacts = [];
        let advanceImage = DImage.getImage("./../images/actuators/advance-move.png");
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let orientation = new CBActuatorImageTrigger(this, "actuators", advanceImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.playable.location, directions[angle].hex.location, 0.9);
            imageArtifacts.push(orientation);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(angle) {
        return this.findTrigger(artifact=> artifact.angle === angle);
    }

    onMouseClick(trigger, event) {
        this.action.advanceUnit(this.playable.hexLocation.getNearHex(trigger.angle));
    }

}

export class CBRetreatActuator extends CBActionActuator {

    constructor(action, directions) {
        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("./../images/actuators/blood.png");
        let loss = new CBActuatorImageTrigger(this, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(125, 173));
        loss.loss = true;
        imageArtifacts.push(loss);
        let retreatImage = DImage.getImage("./../images/actuators/retreat-move.png");
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let orientation = new CBActuatorImageTrigger(this, "actuators", retreatImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.playable.location, directions[angle].hex.location, 0.9);
            orientation.stacking = directions[angle].stacking;
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
            this.action.retreatUnit(this.playable.hexLocation.getNearHex(trigger.angle), trigger.stacking);
        }
    }

}

export class CBFormationRetreatActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, moveDirections, rotateDirections) {

        function createMoveTriggers(imageArtifacts) {
            let moveImage = DImage.getImage("./../images/actuators/retreat-move.png");
            for (let sangle in moveDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageTrigger(this, "actuators", moveImage,
                    new Point2D(0, 0), new Dimension2D(80, 130));
                orientation.pangle = parseInt(angle);
                orientation.rotate = false;
                let unitHex =  moveDirections[angle].hex.getNearHex(invertAngle(angle));
                let startLocation = Point2D.position(this.playable.location, unitHex.location, 1);
                let targetPosition = Point2D.position(unitHex.location, moveDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.plusPoint(targetPosition);
                orientation.stacking = moveDirections[angle].stacking;
                imageArtifacts.push(orientation);
            }
        }

        function createRotateTriggers(imageArtifacts) {
            let rotateImage = DImage.getImage("./../images/actuators/retreat-rotate.png");
            for (let sangle in rotateDirections) {
                let angle = parseInt(sangle);
                let orientation = new CBActuatorImageTrigger(this, "actuators", rotateImage,
                    new Point2D(0, 0), new Dimension2D(80, 96));
                orientation.pangle = parseInt(angle);
                orientation.rotate = true;
                orientation.hex =  rotateDirections[angle].hex.getNearHex(invertAngle(angle));
                let startLocation = Point2D.position(this.playable.location, orientation.hex.location, 1.5);
                let targetPosition = Point2D.position(orientation.hex.location, rotateDirections[angle].hex.location, 0.9);
                orientation.position = startLocation.plusPoint(targetPosition);
                orientation.stacking = rotateDirections[angle].stacking;
                imageArtifacts.push(orientation);
            }
        }

        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("./../images/actuators/blood.png");
        let loss = new CBUnitActuatorTrigger(this, this.playable, "actuators", bloodImage,
            new Point2D(0, 0), new Dimension2D(125, 173));
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
            let hex1 = this.playable.hexLocation.getOtherHex(trigger.hex);
            let hex2 = trigger.hex.getNearHex(trigger.angle);
            let delta = diffAngle(this.playable.angle, trigger.angle)*2;
            this.action.reorientUnit(sumAngle(this.playable.angle, delta));
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.stacking);
        }
        else {
            let hex1 = this.playable.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.playable.hexLocation.toHex.getNearHex(trigger.angle);
            this.action.retreatUnit(new CBHexSideId(hex1, hex2), trigger.stacking);
        }
    }

}

export class CBShockAttackInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, advantage) {
        super(game, "./../images/inserts/shock-attack-insert.png", CBShockAttackInsert.DIMENSION,  CBShockAttackInsert.PAGE_DIMENSION);
        this.setMark(new Point2D(70, 248-advantage.attackerCapacity*35));
        this.setMark(new Point2D(285, 248+advantage.defenderCapacity*35));
        if (advantage.attackBonus) {
            this.setMark(new Point2D(15, 346));
        }
        if (advantage.defenseBonus) {
            this.setMark(new Point2D(15, 364));
        }
        if (advantage.attackerCharging) {
            this.setMark(new Point2D(15, 382));
        }
        if (advantage.defenderCharging) {
            this.setMark(new Point2D(15, 420));
        }
        if (advantage.attackerTired) {
            this.setMark(new Point2D(15, 438));
        }
        if (advantage.attackerExhausted) {
            this.setMark(new Point2D(15, 456));
        }
        if (advantage.defenderExhausted) {
            this.setMark(new Point2D(15, 474));
        }
        if (advantage.attackerDisrupted) {
            this.setMark(new Point2D(15, 492));
        }
        if (advantage.defenderDisrupted) {
            this.setMark(new Point2D(15, 509));
        }
        if (advantage.defenderRouted) {
            this.setMark(new Point2D(15, 527));
        }
        if (advantage.sideAdvantage) {
            this.setMark(new Point2D(15, 545));
        }
        if (advantage.backAdvantage) {
            this.setMark(new Point2D(15, 563));
        }
        if (advantage.attackerAboveDefenfer) {
            this.setMark(new Point2D(15, 581));
        }
        if (advantage.attackerBelowDefender) {
            this.setMark(new Point2D(15, 599));
        }
        if (advantage.attackerOnRoughGround || advantage.defenderOnRoughGround) {
            this.setMark(new Point2D(15, 617));
        }
        if (advantage.attackerOnDifficultGround || advantage.defenderOnDifficultGround) {
            this.setMark(new Point2D(15, 635));
        }
        if (advantage.difficultHexSide) {
            this.setMark(new Point2D(15, 653));
        }
        if (advantage.attackerIsACharacter) {
            this.setMark(new Point2D(15, 671));
        }
        if (advantage.defenderIsACharacter) {
            this.setMark(new Point2D(15, 689));
        }
        if (advantage.attackerStacked) {
            this.setMark(new Point2D(15, 707));
        }
        if (advantage.defenderStacked) {
            this.setMark(new Point2D(15, 725));
        }
        if (advantage.notSupported) {
            this.setMark(new Point2D(15, 815));
        }

    }

}
CBShockAttackInsert.DIMENSION = new Dimension2D(544, 658);
CBShockAttackInsert.PAGE_DIMENSION = new Dimension2D(544, 850);

export class CBFireAttackInsert extends WidgetLevelMixin(DInsert) {

    constructor(game, advantage) {
        super(game, "./../images/inserts/fire-attack-insert.png", CBFireAttackInsert.DIMENSION,  CBFireAttackInsert.PAGE_DIMENSION);
        this.setMark(new Point2D(70, 218-advantage.firerCapacity*35));
        this.setMark(new Point2D(285, 218+advantage.firerCapacity*35));
        if (advantage.fireBonus) {
            this.setMark(new Point2D(15, 327));
        }
        if (advantage.defenseBonus) {
            this.setMark(new Point2D(15, 345));
        }
        if (advantage.firerExhausted) {
            this.setMark(new Point2D(15, 363));
        }
        if (advantage.firerDisrupted) {
            this.setMark(new Point2D(15, 381));
        }
        if (advantage.targetDisrupted) {
            this.setMark(new Point2D(15, 399));
        }
        if (advantage.targetRouted) {
            this.setMark(new Point2D(15, 417));
        }
        if (advantage.sideAdvantage) {
            this.setMark(new Point2D(15, 435));
        }
        if (advantage.backAdvantage) {
            this.setMark(new Point2D(15, 453));
        }
        if (advantage.firerAboveTarget) {
            this.setMark(new Point2D(15, 471));
        }
        if (advantage.firerBelowTarget) {
            this.setMark(new Point2D(15, 489));
        }
        if (advantage.firerOnDifficultGround) {
            this.setMark(new Point2D(15, 507));
        }
        if (advantage.targetOnRoughGround) {
            this.setMark(new Point2D(15, 525));
        }
        if (advantage.targetOnDifficultGround) {
            this.setMark(new Point2D(15, 543));
        }
        if (advantage.targetProtection) {
            this.setMark(new Point2D(15, 561));
        }
        if (advantage.firer.weaponProfile.getFireMalusSegmentSize()===1 && advantage.distanceMalus) {
            this.setMark(new Point2D(15, 581));
        }
        if (advantage.scarceMunitions) {
            this.setMark(new Point2D(15, 653));
        }
        if (advantage.firerIsACharacter) {
            this.setMark(new Point2D(15, 668));
        }
        if (advantage.targetIsACharacter) {
            this.setMark(new Point2D(15, 686));
        }
        if (advantage.firerStacked) {
            this.setMark(new Point2D(15, 705));
        }
        if (advantage.targetStacked) {
            this.setMark(new Point2D(15, 723));
        }
    }

}
CBFireAttackInsert.DIMENSION = new Dimension2D(544, 658);
CBFireAttackInsert.PAGE_DIMENSION = new Dimension2D(544, 850);

export class CBCombatResultTableInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/combat-result-table-insert.png", CBCombatResultTableInsert.DIMENSION);
    }

}
CBCombatResultTableInsert.DIMENSION = new Dimension2D(804, 174);

export class CBWeaponTableInsert extends WidgetLevelMixin(DAbstractInsert) {

    constructor(game) {
        super(game, "./../images/inserts/weapon-table-insert.png", CBWeaponTableInsert.DIMENSION, CBWeaponTableInsert.PAGE_DIMENSION);
        this._margin = new DInsertFrame(this, 0,
            Area2D.create(new Point2D(0, 0), CBWeaponTableInsert.MARGIN_DIMENSION),
            Area2D.create(new Point2D(0, 0), CBWeaponTableInsert.MARGIN_PAGE_DIMENSION)
        )
        this._content = new DInsertFrame(this, 1,
            Area2D.create(new Point2D(86, 0), CBWeaponTableInsert.CONTENT_DIMENSION),
            Area2D.create(new Point2D(86, 0), CBWeaponTableInsert.CONTENT_PAGE_DIMENSION)
        ).setNavigation(true, true, true, true);
        this.addFrame(this._margin);
        this.addFrame(this._content);
    }

    focus(col, row) {
        let colSize = CBWeaponTableInsert.CONTENT_PAGE_DIMENSION.w / CBCombatTeacher.weaponTable.COLCOUNT;
        let rowSize = CBWeaponTableInsert.CONTENT_PAGE_DIMENSION.h / CBCombatTeacher.weaponTable.ROWCOUNT;
        let focusPoint = new Point2D(colSize*col+colSize/2+CBWeaponTableInsert.MARGIN, rowSize*row+rowSize/2);
        this.setMark(focusPoint.plusPoint(new Point2D(-10, 10)));
        this._margin.focusOn(new Point2D(CBWeaponTableInsert.MARGIN/2, rowSize*row+rowSize/2));
        this._content.focusOn(focusPoint);
        return this;
    }

}
CBWeaponTableInsert.MARGIN = 86;
CBWeaponTableInsert.DIMENSION = new Dimension2D(500, 500);
CBWeaponTableInsert.PAGE_DIMENSION = new Dimension2D(978, 1146);
CBWeaponTableInsert.MARGIN_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
CBWeaponTableInsert.MARGIN_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);
CBWeaponTableInsert.CONTENT_DIMENSION = new Dimension2D(CBWeaponTableInsert.DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
CBWeaponTableInsert.CONTENT_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.PAGE_DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);
