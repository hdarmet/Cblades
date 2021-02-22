'use strict'

import {
    DDice, DIconMenu,
    DIconMenuItem, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    CBActionMenu, CBInteractivePlayer, CBWeatherIndicator, CBWingTirednessIndicator
} from "./interactive-player.js";
import {
    CBAction, CBActuator, CBActuatorImageArtifact, CBGame
} from "./game.js";
import {
    Dimension2D,
    Point2D
} from "../geometry.js";
import {
    CBSpell
} from "./magic.js";
import {
    DImage
} from "../draw.js";

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
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN)
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

    play() {
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

    play() {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        let close = ()=>{mask.close(); scene.close();};
        mask.setAction(close);
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
        scene.addWidget(
            new CBCastSpellInsert(), new Point2D(0, 0)
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
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
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

    play() {
        let result = this._spell.getNextCinematic();
        switch (result.cinematic) {
            case CBSpell.CINEMATIC.NONE:
                this._spell.apply();
                this.game.closeActuators();
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

}

export class CBSpellTargetFoesActuator extends CBActuator {

    constructor(action, foeHexes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/spell-target-foe.png");
        let imageArtifacts = [];
        for (let foeHex of foeHexes) {
            let target = new CBActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.unit.location, foeHex.location, 1);
            target._hex = foeHex;
            imageArtifacts.push(target);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(hex) {
        return this.findTrigger(artifact=>artifact._unit === hex);
    }

    onMouseClick(trigger, event) {
        this.action.hexTargeted(trigger._hex, event);
    }

}

export class CBSpellTargetFriendsActuator extends CBActuator {

    constructor(action, friendsHexes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/spell-target-friend.png");
        let imageArtifacts = [];
        for (let friendHex of friendsHexes) {
            let target = new CBActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.unit.location, friendHex.location, 1);
            target._hex = friendHex;
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

export class CBSpellTargetHexesActuator extends CBActuator {

    constructor(action, hexes) {
        super(action);
        let image = DImage.getImage("/CBlades/images/actuators/spell-target-hex.png");
        let imageArtifacts = [];
        for (let hex of hexes) {
            let target = new CBActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(100, 111));
            target.position = Point2D.position(this.unit.location, hex.location, 1);
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
        new DIconMenuItem("/CBlades/images/icons/select-spell.png", "/CBlades/images/icons/select-spell-gray.png",
            0, 5, event => {
                unit.player.choseSpell(unit, event);
                return true;
            }).setActive(actions.prepareSpell),
        new DIconMenuItem("/CBlades/images/icons/cast-spell.png", "/CBlades/images/icons/cast-spell-gray.png",
            1, 5, event => {
                unit.player.tryToCastSpell(unit, event);
                return true;
            }).setActive(actions.castSpell)
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
                            console.assert(unit.isCharacter);
                            unit.choseSpell(spellDefinition);
                            unit.markAsBeingPlayed();
                            return true;
                        }).setActive(true)
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
        super("/CBlades/images/inserts/cast-spell-insert.png", CBCastSpellInsert.DIMENSION);
    }

}
CBCastSpellInsert.DIMENSION = new Dimension2D(283, 700);
