'use strict'

import {
    after,
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    clickOnCounter
} from "./interactive-tools.js";
import {
    createTinyGame
} from "./game-examples.js";
import {
    registerInteractiveMagic,
    unregisterInteractiveMagic
} from "../../jslib/cblades/interactive-magic.js";

describe("Interactive Magic", ()=> {

    before(() => {
        registerInteractiveMagic();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveMagic();
    });

    it("Checks that the unit menu contains menu items for magic", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 361.6667, 190)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -185, 130, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -185, 130, 370)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(/CBlades/images/icons/cast-spell-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(/CBlades/images/icons/select-spell-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });
});