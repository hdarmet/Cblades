'use strict'

import {
    DIconMenuItem
} from "../widget.js";
import {
    CBAction
} from "./game.js";
import {
    CBActionMenu, CBInteractivePlayer
} from "./interactive-player.js";

export function registerInteractiveMiscellaneous() {
    CBInteractivePlayer.prototype.mergeUnits = function(unit, event) {
        unit.launchAction(new InteractiveMergeUnitAction(this.game, unit, event));
    }
    CBActionMenu.menuBuilders.push(
        createMiscellaneousMenuItems
    );
}
export function unregisterInteractiveMiscellaneous() {
    delete CBInteractivePlayer.prototype.startMoveUnit;
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createMiscellaneousMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

export class InteractiveMergeUnitAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this.game.closeActuators();
        let {replacement, replaced} = this.game.arbitrator.mergedUnit(this.unit);
        let hexLocation = replaced[0].hexLocation;
        replacement.move(hexLocation, 0);
        replacement.markAsBeingPlayed();
        for (let replacedUnit of replaced) {
            replacedUnit.move(null, 0);
        }
        this.markAsFinished();
    }

}

function createMiscellaneousMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/do-fusion.png", "/CBlades/images/icons/do-fusion-gray.png",
            2, 5, event => {
                unit.player.mergeUnits(unit, event);
                return true;
            }).setActive(actions.mergeUnit),
        new DIconMenuItem("/CBlades/images/icons/do-many.png", "/CBlades/images/icons/do-many-gray.png",
            3, 5, () => {
            }).setActive(actions.miscAction)
    ];
}
