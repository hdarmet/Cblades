'use strict'

import {
    DIconMenuItem
} from "../widget.js";
import {
    CBActionMenu
} from "./interactive-player.js";

export function registerInteractiveMagic() {
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

function createMagicMenuItems(unit, actions) {
    return [
        new DIconMenuItem("/CBlades/images/icons/select-spell.png", "/CBlades/images/icons/select-spell-gray.png",
            0, 5, () => {
            }).setActive(actions.prepareSpell),
        new DIconMenuItem("/CBlades/images/icons/cast-spell.png", "/CBlades/images/icons/cast-spell-gray.png",
            1, 5, () => {
            }).setActive(actions.castSpell)
    ];
}
