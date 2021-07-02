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
    assertDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnCounter, showTroop, zoomAndRotate0, showCharacter
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame
} from "./game-examples.js";
import {
    registerInteractiveMiscellaneous,
    unregisterInteractiveMiscellaneous
} from "../../jslib/cblades/interactive-miscellaneous.js";

describe("Interactive Miscellaneous", ()=> {

    before(() => {
        registerInteractiveMiscellaneous();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveMiscellaneous();
    });

    it("Checks that the unit menu contains menu items for miscellaneous actions", () => {
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
                "setTransform(1, 0, 0, 1, 301.6667, 190)",
                "shadowColor = #000000", "shadowBlur = 15",
                "strokeStyle = #000000", "lineWidth = 1",
                "strokeRect(-125, -185, 250, 370)",
                "fillStyle = #FFFFFF",
                "fillRect(-125, -185, 250, 370)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-fusion.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(/CBlades/images/icons/do-many-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function clickOnMergeUnitsAction(game) {
        return clickOnActionMenu(game, 2, 5);
    }

    it("Checks merge units action process", () => {
        given:
            var {game, map, unit1, unit2} = create2UnitsTinyGame();
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(1);
            unit1.move(map.getHex(8, 8), 0);
            unit2.move(map.getHex(8, 8), 0);
            unit1.receivesOrder(true);
            unit2.receivesOrder(true);
            loadAllImages();
            paint(game); // units1 layer is created here !
            var [unitsLayer, units1Layer, markersLayer] = getLayers(game.board,"units-0", "units-1", "markers-0");
            clickOnCounter(game, unit1);
            clickOnMergeUnitsAction(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, units1Layer, markersLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showCharacter("misc/leader1", zoomAndRotate0(500, 496.2243)));
            assertDirectives(unitsLayer, showTroop("misc/unit1", zoomAndRotate0(666.6667, 400)));
            assert(getDirectives(units1Layer, 4)).arrayEqualsTo([
            ]);
            assert(unit1.hexLocation).isNotDefined();
            assert(unit2.hexLocation).isNotDefined();
    });

});