'use strict'

import {
    DDice, DIconMenu,
    DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";
import {
    CBAction, CBAbstractGame
} from "./game.js";
import {
    CBActionActuator,
    CBActuatorImageTrigger,
    WidgetLevelMixin,
    RetractableActuatorMixin
} from "./playable.js";
import {
    Dimension2D,
    Point2D
} from "../geometry.js";
import {
    CBFireballSpell, CBMagicArrowSpell,
    CBSpell
} from "./magic.js";
import {
    DImage
} from "../draw.js";
import {
    CBCombatResultTableInsert
} from "./interactive-combat.js";
import {
    CBUnitActuatorTrigger, CBCharge
} from "./unit.js";

export function registerInteractiveMagic() {
    CBInteractivePlayer.prototype.choseSpell = function(unit, event) {
        unit.launchAction(new InteractiveChoseSpellAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.tryToCastSpell = function(unit, event) {
        unit.launchAction(new InteractiveTryToCastSpellAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.castSpell = function(unit, event) {
        unit.launchAction(new InteractiveCastSpellAction(this.game, unit, event));
    }
    CBInteractivePlayer.prototype.openMagicMenu = function(unit, offset, allowedSpells) {
        let popup = new CBSpellsMenu(this.game, unit, allowedSpells);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN)
        );
    }
    CBActionMenu.menuBuilders.push(
        createMagicMenuItems
    );
}
export function unregisterInteractiveMagic() {
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createMagicMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveChoseSpellAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.unit.player.openMagicMenu(this.unit,
            this.unit.viewportLocation,
            this.game.arbitrator.getAllowedSpells(this.unit));
    }

}

export class InteractiveTryToCastSpellAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{
            this.game.closePopup();
        };
        mask.setAction(close);
        this.game.openMask(mask);
        scene.addWidget(
            new CBCastSpellInsert(this.game), new Point2D(0, 0)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.active = false;
                let {success} = this._processCastSpellResult(this.unit, dice.result);
                if (success) {
                    result.success().appear();
                }
                else {
                    result.failure().appear();
                }
            }),
            new Point2D(CBCastSpellInsert.DIMENSION.w/2+40, 0)
        ).addWidget(
            result.setFinalAction(close),
            new Point2D(0, 0)
        );
        this.game.openPopup(scene, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processCastSpellResult(wizard, diceResult) {
        let result = this.game.arbitrator.processCastSpellResult(this.unit, diceResult);
        if (result.success) {
            wizard.player.castSpell(wizard);
        }
        this.markAsFinished();
        return result;
    }

}

export class InteractiveCastSpellAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
        this.markAsFinished();
        this._spell = this.unit.chosenSpell;
    }

    get unit() {
        return this.playable;
    }

    play() {
        this.unit.markAsCharging(CBCharge.NONE);
        this.game.closeActuators();
        let result = this._spell.getNextCinematic();
        switch (result.cinematic) {
            case CBSpell.CINEMATIC.APPLY:
                this._spell.apply();
                break;
            case CBSpell.CINEMATIC.CONTINUE:
                this._spell.apply();
                this.play();
                break;
            case CBSpell.CINEMATIC.SELECT_FOE:
                this._createSelectFoesActuator(this.unit, result);
                break;
            case CBSpell.CINEMATIC.SELECT_FRIEND:
                this._createSelectFriendsActuator(this.unit, result);
                break;
            case CBSpell.CINEMATIC.SELECT_HEX:
                this._createSelectHexesActuator(this.unit, result);
                break;
            case CBSpell.CINEMATIC.RESOLVE:
                result.resolver.call(this._spell, this);
                break;
        }
    }

    _createSelectFoesActuator() {
        let foesThatMayBeTargeted = this.game.arbitrator.getFoesThatMayBeTargetedBySpell(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeTargeted.length) {
            let targetFoeActuator = this.createTargetFoesActuator(foesThatMayBeTargeted);
            this.game.openActuator(targetFoeActuator);
        }
    }

    _createSelectFriendsActuator() {
        let friendsThatMayBeTargeted = this.game.arbitrator.getFriendsThatMayBeTargetedBySpell(this.unit);
        this.game.closeActuators();
        if (friendsThatMayBeTargeted.length) {
            let targetFriendsActuator = this.createTargetFriendsActuator(friendsThatMayBeTargeted);
            this.game.openActuator(targetFriendsActuator);
        }
    }

    _createSelectHexesActuator() {
        let hexesThatMayBeTargeted = this.game.arbitrator.getHexesThatMayBeTargetedBySpell(this.unit);
        this.game.closeActuators();
        if (hexesThatMayBeTargeted.length) {
            let targetHexesActuator = this.createTargetHexesActuator(hexesThatMayBeTargeted);
            this.game.openActuator(targetHexesActuator);
        }
    }

    createTargetFoesActuator(foes) {
        return new CBSpellTargetFoesActuator(this, foes);
    }

    createTargetFriendsActuator(friends) {
        return new CBSpellTargetFriendsActuator(this, friends);
    }

    createTargetHexesActuator(hexes) {
        return new CBSpellTargetHexesActuator(this, hexes);
    }

    hexTargeted(hex) {
        this.unit.chosenSpell.selectHex(hex);
        this.play();
    }

    unitTargeted(unit) {
        this.unit.chosenSpell.selectUnit(unit);
        this.play();
    }

}

export class CBSpellTargetFoesActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, foes) {
        super(action);
        let image = DImage.getImage("./../images/actuators/spell-target-foe.png");
        let imageArtifacts = [];
        for (let foe of foes) {
            let target = new CBUnitActuatorTrigger(this, foe,"units", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.playable.location, foe.location, 1);
            imageArtifacts.push(target);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(unit) {
        return this.findTrigger(artifact=>artifact.unit === unit);
    }

    onMouseClick(trigger, event) {
        this.action.unitTargeted(trigger.playable, event);
    }

}

export class CBSpellTargetFriendsActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, friends) {
        super(action);
        let image = DImage.getImage("./../images/actuators/spell-target-friend.png");
        let imageArtifacts = [];
        for (let friend of friends) {
            let target = new CBUnitActuatorTrigger(this, friend, "units", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.playable.location, friend.location, 1);
            imageArtifacts.push(target);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(friend) {
        return this.findTrigger(artifact=>artifact.unit === friend);
    }

    onMouseClick(trigger, event) {
        this.action.unitTargeted(trigger.unit, event);
    }

}

export class CBSpellTargetHexesActuator extends CBActionActuator {

    constructor(action, hexes) {
        super(action);
        let image = DImage.getImage("./../images/actuators/spell-target-hex.png");
        let imageArtifacts = [];
        for (let hex of hexes) {
            let target = new CBActuatorImageTrigger(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.playable.location, hex.location, 1);
            target._hex = hex;
            imageArtifacts.push(target);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(hex) {
        return this.findTrigger(artifact=>artifact._hex === hex);
    }

    onMouseClick(trigger, event) {
        this.action.hexTargeted(trigger._hex, event);
    }

}

function createMagicMenuItems(unit, actions) {
    return [
        new DIconMenuItem("./../images/icons/select-spell.png", "./../images/icons/select-spell-gray.png",
            0, 5, event => {
                unit.player.choseSpell(unit, event);
                return true;
            }, "Choisir un sort").setActive(actions.prepareSpell),
        new DIconMenuItem("./../images/icons/cast-spell.png", "./../images/icons/cast-spell-gray.png",
            1, 5, event => {
                unit.player.tryToCastSpell(unit, event);
                return true;
            }, "Lancer le sort choisi").setActive(actions.castSpell)
    ];
}

export class CBSpellsMenu extends DIconMenu {

    constructor(game, unit, allowedSpells) {
        function createSpellIconMenu() {
            let col = 0;
            let row = 0;
            let spellMenuItems = [];
            for (let spellName of allowedSpells) {
                let spellDefinition = CBSpell.laboratory.get(spellName);
                spellMenuItems.push(
                    new DIconMenuItem(spellDefinition.path, "",
                        col, row, event => {
                            console.assert(unit.characterNature);
                            unit.choseSpell(spellDefinition);
                            unit.markAsPlayed();
                            return true;
                        }, spellDefinition.label).setActive(true)
                )
                col++;
                if (col===6) {
                    col=0; row++;
                }
            }
            return spellMenuItems;
        }

        super(false,
            ...createSpellIconMenu()
        );
        this._game = game;
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

}

export class CBCastSpellInsert extends DInsert {

    constructor() {
        super("./../images/inserts/cast-spell-insert.png", CBCastSpellInsert.DIMENSION, CBCastSpellInsert.PAGE_DIMENSION);
    }

}
CBCastSpellInsert.DIMENSION = new Dimension2D(444, 600);
CBCastSpellInsert.PAGE_DIMENSION = new Dimension2D(444, 1100);

CBFireballSpell.resolver = function(action) {
    this.game.closeActuators();
    let result = new DResult();
    let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
    let scene = new DScene();
    let mask = new DMask("#000000", 0.3);
    let close = ()=>{
        this.game.closePopup();
    };
    this.game.openMask(mask);
    scene.addWidget(
        new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
    ).addWidget(
        new CBFireballInsert(this.game), new Point2D(-160, CBFireballInsert.DIMENSION.h/2)
    ).addWidget(
        dice.setFinalAction(()=>{
            dice.active = false;
            let report = this.resolve(dice.result);
            if (report.success) {
                result.success().appear();
            }
            else {
                result.failure().appear();
            }
        }),
        new Point2D(120, 80)
    ).addWidget(
        result.setFinalAction(close),
        new Point2D(0, 0)
    );
    this.game.openPopup(scene, this.location);
}

export class CBFireballInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/fireball-insert.png", CBFireballInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 257);
}

CBMagicArrowSpell.resolver = function(action) {
    this.game.closeActuators();
    let result = new DResult();
    let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
    let scene = new DScene();
    let mask = new DMask("#000000", 0.3);
    let close = ()=>{
        this.game.closePopup();
    };
    this.game.openMask(mask);
    scene.addWidget(
        new CBCombatResultTableInsert(this.game), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
    ).addWidget(
        new CBMagicArrowInsert(this.game), new Point2D(-160, CBMagicArrowInsert.DIMENSION.h/2)
    ).addWidget(
        dice.setFinalAction(()=>{
            dice.active = false;
            let report = this.resolve(dice.result);
            if (report.success) {
                result.success().appear();
            }
            else {
                result.failure().appear();
            }
        }),
        new Point2D(120, 80)
    ).addWidget(
        result.setFinalAction(close),
        new Point2D(0, 0)
    );
    this.game.openPopup(scene, this.location);
}

export class CBMagicArrowInsert extends WidgetLevelMixin(DInsert) {

    constructor(game) {
        super(game, "./../images/inserts/magic-arrow-insert.png", CBMagicArrowInsert.DIMENSION);
    }

    static DIMENSION = new Dimension2D(444, 241);

}