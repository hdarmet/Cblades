'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    getDirectives, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms
} from "../../jslib/mechanisms.js";
import {
    CBGame, CBHexId, CBMap, CBUnit
} from "../../jslib/cblades/game.js";

describe("Game", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    it("Checks raw widget opening and closing", () => {
        given:
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit("/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
        when:
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(mapLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

});