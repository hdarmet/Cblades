'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertDirectives, getDirectives,
    getLayers, loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    createTinyGame
} from "./game-examples.js";
import {
    CBFireStart, CBStakes
} from "../../jslib/cblades/miscellaneous.js";
import {
    paint
} from "./interactive-tools.js";

describe("Miscellaneous", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks start fire counter", () => {
        given:
            var {game, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
            var hexId = map.getHex(7,8);
        when:
            var fireStart = new CBFireStart();
            resetDirectives(groundLayer);
            fireStart.addToMap(hexId);
            paint(game);
            loadAllImages();
        then:
            assert(hexId.playables[0]).equalsTo(fireStart);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/actions/start-fire.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks stakes counter", () => {
        given:
            var {game, map} = createTinyGame();
            var [groundLayer] = getLayers(game.board,"hex-0");
            var hexId = map.getHex(7,8);
        when:
            var fireStart = new CBStakes();
            resetDirectives(groundLayer);
            fireStart.addToMap(hexId);
            paint(game);
            loadAllImages();
        then:
            assert(hexId.playables[0]).equalsTo(fireStart);
            assert(getDirectives(groundLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 361.663)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/actions/stakes.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

 });