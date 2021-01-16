'use strict'

import {
    DIconMenuItem
} from "../widget.js";
import {
    CBActionMenu
} from "./interactive-player.js";

export function registerInteractiveFormation() {
    CBActionMenu.menuBuilders.push(
        createFormationMenuItems
    );
}
export function unregisterInteractiveFormation() {
    let builderIndex = CBActionMenu.menuBuilders.indexOf(createFormationMenuItems);
    if (builderIndex>=0) {
        CBActionMenu.menuBuilders.splice(builderIndex, 1);
    }
}

function createFormationMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/create-formation.png", "/CBlades/images/icons/create-formation-gray.png",
            0, 3, () => {
            }).setActive(actions.createFormation),
        new DIconMenuItem("/CBlades/images/icons/join-formation.png", "/CBlades/images/icons/join-formation-gray.png",
            1, 3, () => {
            }).setActive(actions.joinFormation),
        new DIconMenuItem("/CBlades/images/icons/leave-formation.png", "/CBlades/images/icons/leave-formation-gray.png",
            2, 3, () => {
            }).setActive(actions.leaveFormation),
        new DIconMenuItem("/CBlades/images/icons/dismiss-formation.png", "/CBlades/images/icons/dismiss-formation-gray.png",
            3, 3, () => {
            }).setActive(actions.breakFormation)
    ];
}
