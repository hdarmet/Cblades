'use strict'

import {
    Area2D,
    canonizeAngle,
    diffAngle,
    Dimension2D, invertAngle, Point2D, sumAngle
} from "../../geometry.js";
import {
    DDice, DIconMenuItem, DInsertFrame, DMask, DResult, DScene
} from "../../widget.js";
import {
    CBAction, CBStacking
} from "../game.js";
import {
    CBActionActuator, CBActuatorImageTrigger, CBMask, CBInsert, RetractableActuatorMixin, CBAbstractInsert, CBGame
} from "../playable.js";
import {
    CBHexLocation,
    CBHexSideId
} from "../map.js";
import {
    CBCharge,
    CBDisplaceAnimation,
    CBUnitActuatorTrigger,
    HexLocated,
    CBStateSequenceElement,
    getUnitFromContext,
    CBSceneAnimation
} from "../unit.js";
import {
    CBActionMenu,
    CBInteractivePlayer,
    WithDiceRoll
} from "./interactive-player.js";
import {
    DAnimation,
    DImage
} from "../../draw.js";
import {
    CBCombatTeacher
} from "../teachers/combat-teacher.js";
import {
    Memento
} from "../../mechanisms.js";
import {
    CBSequence, CBSequenceElement
} from "../sequences.js";
import {
    SequenceLoader
} from "../loader.js";
import {
    DImageArtifact
} from "../../board.js";

export function registerInteractiveCombat() {
    CBInteractivePlayer.prototype.unitShockAttack = function (unit) {
        unit.launchAction(new InteractiveShockAttackAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.unitFireAttack = function (unit) {
        unit.launchAction(new InteractiveFireAttackAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.unitDuelAttack = function (unit) {
        unit.launchAction(new InteractiveDuelAttackAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.unitDuelFire = function (unit) {
        unit.launchAction(new InteractiveDuelFireAction(this.game, unit));
    }
    CBInteractivePlayer.prototype.applyLossesToUnit = function(unit, losses, attacker) {
        for (let loss=1; loss<losses; loss++) {
            unit.takeALoss();
        }
        if (losses>1) {
            CBSequence.appendElement(this.game, new CBStateSequenceElement({game: this.game, unit}));
        }
    }
    CBInteractivePlayer.prototype.ask4LossesToUnit = function(unit, attacker, losses, defenderLocation, advance, continuation) {
        if (!unit.isDestroyed()) {
            unit.launchAction(new InteractiveRetreatAction(
                this.game, unit, losses, attacker, advance, continuation, defenderLocation)
            );
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
    CBActionMenu.menuBuilders.remove(createCombatMenuItems);
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
        this.game.closeActuators();
        this.unit.advance(hexLocation);
        this._finalizeAction();
    }

    _finalizeAction() {
        this.markAsFinished();
        this.unit.removeAction();
        this._continuation(this.unit.hexLocation);
    }

    createAdvanceActuator(directions) {
        return new CBAdvanceActuator(this, directions);
    }

}
CBAction.register("InteractiveAdvanceAction", InteractiveAdvanceAction);

export class InteractiveRetreatAction extends CBAction {

    constructor(game, unit, losses, attacker, advance, continuation, defenderLocation, active=true) {
        super(game, unit);
        this._losses = losses;
        this._attacker = attacker;
        this._defenderLocation = defenderLocation;
        this._advance = advance;
        this._continuation = continuation;
        this._active = active;
    }

    get unit() {
        return this.playable;
    }

    play() {
        if (this.unit.getAttr("retreated")) {
            this.advanceAttacker(() => {
                this._finalizeAction();
            });
        }
        else {
            this.unit.setCharging(CBCharge.NONE);
            this.game.setFocusedPlayable(this.unit);
            this._createRetreatActuator();
        }
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

    advanceAttacker(continuation) {
        let directions = this.game.arbitrator.getAdvanceZones(this._attacker, this._defenderLocation.hexes);
        if (this._advance && this._attacker.isCharging() && directions.length>0) {
            let hexes = [];
            for (let sangle in directions) {
                hexes.push(directions[sangle].hex);
            }
            let enhancedContinuation = hexLocation=> {
                CBSequence.appendElement(this._game,
                    new CBAdvanceSequenceElement({game: this.game, unit:this._attacker, hexLocation})
                );
                new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                continuation();
            };
            if (hexes.length === 1) {
                this._attacker.advance(hexes[0]);
                enhancedContinuation(hexes[0]);
            }
            else {
                this._attacker.player.advanceAttacker(this._attacker, directions, enhancedContinuation);
            }
        }
        else {
            this._attacker.setCharging(CBCharge.NONE);
            continuation();
        }
    }

    retreatUnit(hexLocation, stacking) {
        this.game.closeActuators();
        this.unit.retreat(hexLocation, stacking);
        this.advanceAttacker(() => {
            this._finalizeAction();
        });
    }

    reorientUnit(angle) {
        this.unit.rotate(canonizeAngle(angle), 0);
    }

    takeALossFromUnit(event) {
        if (this._active) {
            this.game.closeActuators();
            this.unit.takeALoss();
            this.advanceAttacker(this._defenderLocation, () => {
                this._finalizeAction();
            });
        }
    }

    _finalizeAction() {
        this.markAsFinished();
        this.unit.removeAction();
        this._continuation();
    }

    createRetreatActuator(directions) {
        return new CBRetreatActuator(this, directions, this._active);
    }

    createFormationRetreatActuator(moveDirections, rotateDirection) {
        return new CBFormationRetreatActuator(this, moveDirections, rotateDirection, this._active);
    }

}
CBAction.register("InteractiveRetreatAction", InteractiveRetreatAction);

export class InteractiveAbstractShockAttackAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
        this._attackHex = unit.formationNature ? unit.hexLocation.fromHex : unit.hexLocation;
        this._attackHexes = new Set();
        let attackHexes = unit.getAttr("attackHexes");
        if (attackHexes) {
            for (let hexSpec of attackHexes) {
                this._attackHexes.add(CBHexLocation.fromSpecs(game.map, hexSpec));
            }
        }
    }

    get unit() {
        return this.playable;
    }

    play() {
        if (this.unit.attackCount<this.unit.allowedAttackCount ||
            this.unit.attackCount>this.unit.resolvedAttackCount) {
            if (this.unit.attackCount < this.unit.allowedAttackCount &&
                this.unit.attackCount === this.unit.resolvedAttackCount) {
                this._createShockAttackActuator(this.unit);
            } else {
                this._bypassAttack(this.unit);
            }
        }
    }

    _bypassAttack(unit) {
        let attackerHex = this.game.map.getHex(
            unit.getAttr("attackerHex.col"),
            unit.getAttr("attackerHex.row")
        );
        let defenderHex = this.game.map.getHex(
            unit.getAttr("defenderHex.col"),
            unit.getAttr("defenderHex.row")
        );
        let defender = this.game.getUnit(this.unit.getAttr("defender"));
        let report = this.game.arbitrator.processShockAttackResult(
            unit, attackerHex, defender, defenderHex,
            unit.getAttr("supported"),
            [unit.getAttr("dice1"), unit.getAttr("dice2")]
        );
        this._attackHexes.add(attackerHex);
        for (let hex of this.unit.hexLocation.hexes) {
            if (!this._attackHexes.has(hex)) {
                this._attackHex = hex;
                break;
            }
        }
        this.markAsStarted();
        let continuation = () => {
            if (this._hasPlayed() || !this._createShockAttackActuator(this.unit)) {
                this.markAsFinished();
            }
            unit.resolvedAttackCount++;
        }
        if (report.lossesForDefender > 0) {
            defender.player.ask4LossesToUnit(
                defender, this.unit,
                report.lossesForDefender, defenderHex,
                true, continuation
            );
        } else {
            continuation();
        }
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
        this._createShockAttackActuator();
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

    createScene(attackerHex, defender, defenderHex, supported, advantage, finalAction, closeAction) { // LA
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(advantage), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                scene.dice.result = [3, 4];
                scene.result.report = this.game.arbitrator.processShockAttackResult(
                    this.unit, attackerHex, defender, defenderHex, supported, scene.dice.result
                );
                let success = scene.result.report.success;
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

    shockAttackUnit(attackerHex, defender, defenderHex, supported, advantage) {
        let continuation = () => {
            this.unit.changeAction(this);   // In case, attack action is replaced by advance action...
            if (this._hasPlayed() || !this._createShockAttackActuator(this.unit)) {
                this.markAsFinished();
            }
            this.unit.resolvedAttackCount++;
        }
        if (this.unit.attackCount<this.unit.allowedAttackCount) {
            this.game.closeActuators();
            let scene;
            scene = this.createScene(
                attackerHex, defender, defenderHex, supported, advantage,
                success => {
                    this.unit.attackCount++;
                    this._processShockAttackResult(success, attackerHex);
                    CBSequence.appendElement(this.game, new CBShockAttackSequenceElement({
                        unit: this.unit, attackerHex, attackHexes: this._attackHexes,
                        defender, defenderHex,
                        supported, advantage: advantage.advantage,
                        game: this.game, dice: scene.dice.result
                    }));
                    defender.player.applyLossesToUnit(defender, scene.result.report.lossesForDefender, this.unit, true, continuation);
                    new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                    this.game.validate();
                },
                success => {
                    this.game.closePopup();
                    if (scene.result.finished) {
                        if (success) {
                            defender.player.ask4LossesToUnit(defender, this.unit,  scene.result.report.lossesForDefender, defender.hexLocation, true, continuation);
                        } else {
                            this.unit.setCharging(CBCharge.NONE);
                            continuation();
                        }
                    }
                }
            );
        }
        else {
            continuation();
        }
    }

    replay(attackerHex, attackHexes, defender, defenderHex, supported, advantageValue, dice) {
        this._attackHexes = new Set([...attackHexes]);
        let advantage = this.game.arbitrator.getShockAttackAdvantage(this.unit, attackerHex, defender, defenderHex, supported);
        let scene = this.createScene(attackerHex, defender, defenderHex, supported, advantage);
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processShockAttackResult(result, attackerHex) { // LA
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

    showRules(foe, supported, advantage) {
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBShockAttackInsert(advantage), new Point2D(-250, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert().focus(
                advantageCell.col, advantageCell.row),
            new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2)
        );
        this.game.openPopup(scene, foe.viewportLocation);
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

    constructor(game, unit) {
        super(game, unit);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeShockAttacked(unit);
    }

}
CBAction.register("InteractiveShockAttackAction", InteractiveShockAttackAction);

export class InteractiveDuelAttackAction extends InteractiveAbstractShockAttackAction {

    constructor(game, unit) {
        super(game, unit);
    }

    _getFoes(unit) {
        return this.game.arbitrator.getFoesThatMayBeDuelAttacked(unit);
    }

}
CBAction.register("InteractiveDuelAttackAction", InteractiveDuelAttackAction);

export class InteractiveAbstractFireAttackAction extends CBAction {

    constructor(game, unit) {
        super(game, unit);
        this._attackHex = unit.formationNature ? unit.hexLocation.fromHex : unit.hexLocation;
        this._attackHexes = new Set();
        let attackHexes = unit.getAttr("attackHexes");
        if (attackHexes) {
            for (let hexSpec of attackHexes) {
                this._attackHexes.add(CBHexLocation.fromSpecs(game.map, hexSpec));
            }
        }
    }

    get unit() {
        return this.playable;
    }

    play() {
        if (this.unit.attackCount<this.unit.allowedAttackCount ||
            this.unit.attackCount>this.unit.resolvedAttackCount) {
            if (this.unit.attackCount < this.unit.allowedAttackCount &&
                this.unit.attackCount === this.unit.resolvedAttackCount) {
                this.unit.setCharging(CBCharge.NONE);
                this._createFireAttackActuator(this.unit);
            } else {
                this._bypassAttack(this.unit);
            }
        }
    }

    _bypassAttack(unit) {
        let attackerHex = this.game.map.getHex(
            unit.getAttr("attackerHex.col"),
            unit.getAttr("attackerHex.row")
        );
        let defenderHex = this.game.map.getHex(
            unit.getAttr("defenderHex.col"),
            unit.getAttr("defenderHex.row")
        );
        let defender = this.game.getUnit(this.unit.getAttr("defender"));
        let report = this.game.arbitrator.processFireAttackResult(
            unit, attackerHex, defender, defenderHex,
            [unit.getAttr("dice1"), unit.getAttr("dice2")]
        );
        this._attackHexes.add(attackerHex);
        for (let hex of this.unit.hexLocation.hexes) {
            if (!this._attackHexes.has(hex)) {
                this._attackHex = hex;
                break;
            }
        }
        this.markAsStarted();
        let continuation = () => {
            if (this._hasPlayed() || !this._createFireAttackActuator(this.unit)) {
                this.markAsFinished();
            }
            unit.resolvedAttackCount++;
        }
        if (report.lossesForDefender > 0) {
            defender.player.ask4LossesToUnit(
                defender, this.unit,
                report.lossesForDefender, defenderHex,
                true, continuation
            );
        } else {
            continuation();
        }
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

    createScene(firerHex, target, targetHex, advantage, finalAction, closeAction) {
        let scene = new DScene();
        scene.result = new DResult();
        scene.dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let mask = new DMask("#000000", 0.3);
        mask.setAction(closeAction);
        this.game.openMask(mask);
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBFireAttackInsert(advantage), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            scene.dice.setFinalAction(()=>{
                scene.dice.active = false;
                scene.dice.result = [3, 4];
                scene.result.report = this.game.arbitrator.processFireAttackResult(
                    this.unit, firerHex, target, targetHex, scene.dice.result
                );
                let success = scene.result.report.success;
                if (success) {
                    scene.result.success().appear();
                }
                else {
                    scene.result.failure().appear();
                }
                finalAction&&finalAction(success)
            }),
            new Point2D(70, 60)
        ).addWidget(
            scene.result.setFinalAction(closeAction),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, this.unit.viewportLocation);
        return scene;
    }

    fireAttackUnit(firerHex, target, targetHex, advantage) {
        let continuation = () => {
            if (this._hasPlayed() || !this._createFireAttackActuator(this.unit)) {
                this.markAsFinished();
            }
            this.unit.resolvedAttackCount++;
        }
        if (this.unit.attackCount<this.unit.allowedAttackCount) {
            this.game.closeActuators();
            let scene;
            scene = this.createScene(
                firerHex, target, targetHex, advantage,
                success => {
                    this.unit.attackCount++;
                    this._processFireAttackResult(success, firerHex);
                    CBSequence.appendElement(this.game, new CBFireAttackSequenceElement({
                        unit: this.unit, firerHex,
                        target, targetHex, targetHexes: this._attackHexes,
                        advantage: advantage.advantage,
                        game: this.game, dice: scene.dice.result
                    }));
                    target.player.applyLossesToUnit(target, scene.result.report.lossesForDefender, this.unit, true, continuation);
                    new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
                    this.game.validate();
                },
                success => {
                    this.game.closePopup();
                    if (scene.result.finished) {
                        if (success) {
                            target.player.ask4LossesToUnit(target, this.unit,  scene.result.report.lossesForDefender, target.hexLocation, false, continuation);
                        } else {
                            this.unit.setCharging(CBCharge.NONE);
                            continuation();
                        }
                    }
                }
            );
        }
        else {
            continuation();
        }
    }

    replay(firerHex, firerHexes, target, targetHex, advantageValue, dice) {
        this._attackHexes = new Set([...firerHexes]);
        let advantage = this.game.arbitrator.getFireAttackAdvantage(this.unit, firerHex, target, targetHex);
        let scene = this.createScene(firerHex, target, targetHex, advantage);
        scene.result.active = false;
        scene.dice.cheat(dice);
    }

    _processFireAttackResult(result, firerHex) {
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

    showRules(foe, advantage) {
        let advantageCell = this._getAdvantageCell(foe);
        let scene = new DScene();
        let mask = new CBMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBFireAttackInsert(advantage), new Point2D(-250, CBFireAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            new CBWeaponTableInsert().focus(
                advantageCell.col, advantageCell.row),
                new Point2D(CBWeaponTableInsert.DIMENSION.w/2-20, CBWeaponTableInsert.DIMENSION.h/2
            )
        );
        this.game.openPopup(scene, foe.viewportLocation);
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

    constructor(game, unit) {
        super(game, unit);
    }

    _getFoes(unit, hexId) {
        return this.game.arbitrator.getFoesThatMayBeFireAttackedFromHex(unit, hexId);
    }

}
CBAction.register("InteractiveFireAttackAction", InteractiveFireAttackAction);

export class InteractiveDuelFireAction extends InteractiveAbstractFireAttackAction {

    constructor(game, unit) {
        super(game, unit);
    }

    _getFoes(unit, hexId) {
        return this.game.arbitrator.getFoesThatMayBeDuelFiredFromHex(unit, hexId);
    }

}
CBAction.register("InteractiveDuelFireAction", InteractiveDuelFireAction);

function createCombatMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/shock-attack.png", "./../images/icons/shock-attack-gray.png",
            0, 1, event => {
                unit.player.unitShockAttack(unit);
                return true;
            }, "Attaquer au choc").setActive(actions.shockAttack),
        new DIconMenuItem("./../images/icons/fire-attack.png", "./../images/icons/fire-attack-gray.png",
            1, 1, event => {
                unit.player.unitFireAttack(unit);
                return true;
            }, "Attaquer au tir").setActive(actions.fireAttack),
        new DIconMenuItem("./../images/icons/shock-duel.png", "./../images/icons/shock-duel-gray.png",
            2, 1, event => {
                unit.player.unitDuelAttack(unit);
                return true;
            }, "Provoquer un duel au choc").setActive(actions.shockDuel),
        new DIconMenuItem("./../images/icons/fire-duel.png", "./../images/icons/fire-duel-gray.png",
            3, 1, event => {
                unit.player.unitDuelFire(unit);
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
        this.action.shockAttackUnit(trigger.attackHex, trigger.unit, trigger.attackedHex, trigger.supported, trigger.advantage);
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
        this.action.fireAttackUnit(trigger.attackHex, trigger.unit, trigger.attackedHex, trigger.advantage);
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
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
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
            artifact.setVisibility && artifact.setVisibility(level===CBGame.FULL_VISIBILITY ? 1:0);
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
        let hexLocation = this.playable.hexLocation.getNearHex(trigger.angle);
        this.action.advanceUnit(hexLocation);
        CBSequence.appendElement(this.game, new CBMoveSequenceElement({
            game:this.playable.game, unit: this.playable, hexLocation, stacking: CBStacking.BOTTOM
        }));
    }

}

export class CBRetreatActuator extends CBActionActuator {

    constructor(action, directions, active) {
        super(action);
        let imageArtifacts = [];
        let bloodImage = DImage.getImage("./../images/actuators/blood.png");
        let loss = active ?
            new CBActuatorImageTrigger(this, "actuators", bloodImage,
                new Point2D(0, 0), new Dimension2D(125, 173)):
            new DImageArtifact( "actuators", bloodImage,
                new Point2D(0, 0), new Dimension2D(125, 173));
        loss.loss = true;
        imageArtifacts.push(loss);
        let retreatImage = DImage.getImage("./../images/actuators/retreat-move.png");
        for (let sangle in directions) {
            let angle = parseInt(sangle);
            let orientation = active ?
                new CBActuatorImageTrigger(this, "actuators", retreatImage,
                    new Point2D(0, 0), new Dimension2D(80, 130)):
                new DImageArtifact( "actuators", retreatImage,
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
            CBSequence.appendElement(this.playable.game, new CBStateSequenceElement({game:this.playable.game, unit: this.playable}));
        }
        else {
            this.action.retreatUnit(
                this.playable.hexLocation.getNearHex(trigger.angle),
                trigger.stacking
            );
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
            CBSequence.appendElement(this.playable.game, new CBStateSequenceElement({game:this.playable.game, unit: this.playable}));
        }
        else if (trigger.rotate) {
            let hex1 = this.playable.hexLocation.getOtherHex(trigger.hex);
            let hex2 = trigger.hex.getNearHex(trigger.angle);
            let delta = diffAngle(this.playable.angle, trigger.angle)*2;
            let angle = sumAngle(this.playable.angle, delta);
            this.action.reorientUnit(angle);
            CBSequence.appendElement(this.playable.game, new CBReorientSequenceElement({
                game:this.playable.game, unit: this.playable, angle
            }));
            let hexLocation = new CBHexSideId(hex1, hex2);
            this.action.retreatUnit(hexLocation, trigger.stacking);
            CBSequence.appendElement(this.game, new CBMoveSequenceElement({
                game:this.playable.game, unit: this.playable, hexLocation, stacking: trigger.stacking
            }));
        }
        else {
            let hex1 = this.playable.hexLocation.fromHex.getNearHex(trigger.angle);
            let hex2 = this.playable.hexLocation.toHex.getNearHex(trigger.angle);
            let hexLocation = new CBHexSideId(hex1, hex2);
            this.action.retreatUnit(hexLocation, trigger.stacking);
            CBSequence.appendElement(this.game, new CBMoveSequenceElement({
                game:this.playable.game, unit: this.playable, hexLocation, stacking: trigger.stacking
            }));
        }
    }

}

export class CBShockAttackInsert extends CBInsert {

    constructor(advantage) {
        super("./../images/inserts/shock-attack-insert.png", CBShockAttackInsert.DIMENSION,  CBShockAttackInsert.PAGE_DIMENSION);
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

    static DIMENSION = new Dimension2D(544, 658);
    static PAGE_DIMENSION = new Dimension2D(544, 850);
}

export class CBFireAttackInsert extends CBInsert {

    constructor(advantage) {
        super("./../images/inserts/fire-attack-insert.png", CBFireAttackInsert.DIMENSION,  CBFireAttackInsert.PAGE_DIMENSION);
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

    static DIMENSION = new Dimension2D(544, 658);
    static PAGE_DIMENSION = new Dimension2D(544, 850);
}

export class CBCombatResultTableInsert extends CBInsert {

    constructor() {
        super("./../images/inserts/combat-result-table-insert.png", CBCombatResultTableInsert.DIMENSION);
    }

}
CBCombatResultTableInsert.DIMENSION = new Dimension2D(804, 174);

export class CBWeaponTableInsert extends CBAbstractInsert {

    constructor() {
        super("./../images/inserts/weapon-table-insert.png", CBWeaponTableInsert.DIMENSION, CBWeaponTableInsert.PAGE_DIMENSION);
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

    static MARGIN = 86;
    static DIMENSION = new Dimension2D(500, 500);
    static PAGE_DIMENSION = new Dimension2D(978, 1146);
    static MARGIN_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
    static MARGIN_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);
    static CONTENT_DIMENSION = new Dimension2D(CBWeaponTableInsert.DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.DIMENSION.h);
    static CONTENT_PAGE_DIMENSION = new Dimension2D(CBWeaponTableInsert.PAGE_DIMENSION.w-CBWeaponTableInsert.MARGIN, CBWeaponTableInsert.PAGE_DIMENSION.h);

}



export function WithCombat(clazz) {

    return class extends clazz {

        constructor({attackerHex, attackHexes, defender, defenderHex, supported, advantage, ...params}) {
            super(params);
            this.attackerHex = attackerHex;
            this.attackHexes = attackHexes?[...attackHexes]:[];
            this.defender = defender;
            this.defenderHex = defenderHex;
            this.supported = supported;
            this.advantage = advantage;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (element.attackerHex.location.toString() !== this.attackerHex.location.toString()) return false;
            if (element.defender !== this.defender) return false;
            if (element.defenderHex.location.toString() !== this.defenderHex.location.toString()) return false;
            if (element.supported !== this.supported) return false;
            if (element.advantage !== this.advantage) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            result+=`, attackerHex: `+this.attackerHex.location.toString();
            result+=`, defender: `+this.defender;
            result+=`, defenderHex: `+this.defenderHex.location.toString();
            result+=`, supported: `+this.supported;
            result+=`, advantage: `+this.advantage;
            return result;
        }

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            spec.attackerHex = CBHexLocation.toSpecs(this.attackerHex);
            spec.defender = this.defender.name;
            spec.defenderHex = CBHexLocation.toSpecs(this.defenderHex);
            spec.attackHexes = [];
            for (let hex of this.attackHexes) {
                spec.attackHexes.push(CBHexLocation.toSpecs(hex));
            }
            spec.supported = this.supported;
            spec.advantage = this.advantage;
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            this.attackerHex = CBHexLocation.fromSpecs(context.game.map, spec.attackerHex);
            this.defender = getUnitFromContext(context, spec.defender);
            this.defenderHex = CBHexLocation.fromSpecs(context.game.map, spec.defenderHex);
            this.attackHexes = [];
            for (let hex of spec.attackHexes) {
                this.attackHexes.push(CBHexLocation.fromSpecs(context.game.map, hex));
            }
            this.supported = spec.supported;
            this.advantage = spec.advantage;
        }

    }

}

export class CBShockAttackSequenceElement extends WithCombat(WithDiceRoll(CBStateSequenceElement)) {

    constructor({id, game, unit, attackerHex, attackHexes, defender, defenderHex, supported, advantage, dice}) {
        super({
            id,
            type: "shock-attack", game,
            unit, attackerHex, attackHexes,
            defender, defenderHex,
            supported, advantage, dice
        });
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => {
                let action = new InteractiveShockAttackAction(this.game, this.unit);
                action.replay(this.attackerHex, this.attackHexes, this.defender, this.defenderHex, this.supported, this.advantage, this.dice)
            }
        });
    }

}
CBSequence.register("shock-attack", CBShockAttackSequenceElement);

export class CBFireAttackSequenceElement extends WithCombat(WithDiceRoll(CBStateSequenceElement)) {

    constructor({id, game, unit, firerHex, target, targetHex, targetHexes, advantage, dice}) {
        super({
            id,
            type: "fire-attack", game,
            unit, attackerHex:firerHex, attackHexes: targetHexes,
            defender:target, defenderHex:targetHex,
            supported:false, advantage, dice
        });
    }

    get delay() { return 1500; }

    apply(startTick) {
        return new CBSceneAnimation({
            unit: this.unit, startTick, duration: this.delay, state: this, game: this.game,
            animation: () => {
                let action = new InteractiveFireAttackAction(this.game, this.unit);
                action.replay(this.attackerHex, this.attackHexes, this.defender, this.defenderHex, this.advantage, this.dice)
            }
        });
    }

}
CBSequence.register("fire-attack", CBFireAttackSequenceElement);

export class CBAsk4RetreatSequenceElement extends CBSequenceElement {

    constructor({id, game, unit, losses, attacker, advance}) {
        super({id, type: "ask4-retreat", game});
        console.log(unit, losses, attacker, advance);
        this.unit = unit;
        this.attacker = attacker;
        this.losses = losses;
        this.advance = advance;
        this.id = 0;
    }

    get delay() { return 0; }

    apply(startTick) {
        return new CBAsk4RetreatAnimation({
            game:this.game, unit:this.unit, id:this.id, losses:this.losses, attacker:this.attacker, startTick
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.unit = this.unit.name;
        spec.attacker = this.attacker.name;
        spec.losses = this.losses;
        spec.advance = this.advance;
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.unit = getUnitFromContext(context, spec.unit);
        this.attacker = getUnitFromContext(context, spec.attacker);
        this.losses = spec.losses;
        this.advance = spec.advance;
        this.id = spec.id;
    }

}
CBSequence.register("ask4-retreat", CBAsk4RetreatSequenceElement);

export class CBRetreatSequenceElement extends HexLocated(CBStateSequenceElement) {

    constructor({id, game, unit, hexLocation, askRequest}) {
        super({id, type: "retreat", unit, hexLocation, stacking:CBStacking.TOP, game});
        this.askRequest = askRequest;
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBRetreatAnimation({
            unit:this.unit, startTick, duration:this.delay, state:this,
            angle:this.unit.angle, hexLocation:this.hexLocation, stacking:this.stacking
        });
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.askRequest = this.askRequest;
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.askrequest = spec.askRequest;
    }

}
CBSequence.register("retreat", CBRetreatSequenceElement);

export class CBAsk4RetreatAnimation extends DAnimation {

    constructor({game, id, unit, losses, attacker, startTick}) {
        super();
        this._game = game;
        this._unit = unit;
        this._losses = losses;
        this._attacker = attacker;
        this._id = id;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            this._unit.launchAction(new InteractiveRetreatAction(this._game, this._unit, this._losses, this._attacker, false,
                ()=>{
                    CBSequence.appendElement(this._game,
                        new CBRetreatSequenceElement({game: this._game, unit:this._unit, hexLocation:this._unit.hexLocation, askRequest:this._id})
                    );
                    new SequenceLoader().save(this._game, CBSequence.getSequence(this._game));
                    this._game.validate();
                },
                this._unit.hexLocation
            ));
        }
        return false;
    }

}

export class CBRetreatAnimation extends CBDisplaceAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state, angle, hexLocation, stacking});
    }

    _draw(count, ticks) {
        if (count===0) {
            this._unit.game.closeActuators();
        }
        return super._draw(count, ticks);
    }

    _finalize() {
        this._unit.player.continueLossApplication &&
            this._unit.player.continueLossApplication(this._unit, this._unit.hexLocation, this._stacking);
        return super._finalize();
    }

}

export class CBAdvanceSequenceElement extends HexLocated(CBStateSequenceElement) {

    constructor({id, game, unit, hexLocation}) {
        super({id, type: "advance", unit, hexLocation, stacking:CBStacking.TOP, game});
    }

    get delay() { return 500; }

    apply(startTick) {
        return new CBAdvanceAnimation({
            unit:this.unit, startTick, duration:this.delay, state:this,
            angle:this.unit.angle, hexLocation:this.hexLocation, stacking:this.stacking
        });
    }

}
CBSequence.register("advance", CBAdvanceSequenceElement);

export class CBAdvanceAnimation extends CBDisplaceAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state, angle, hexLocation, stacking});
    }

    _draw(count, ticks) {
        if (count===0) {
            this._unit.game.closeActuators();
        }
        return super._draw(count, ticks);
    }

}