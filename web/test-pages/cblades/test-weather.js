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

describe("Weather", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks start fire counter", () => {

    });

 });