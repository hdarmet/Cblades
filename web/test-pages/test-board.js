'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    DBoard, DElement, DImageArtifact
} from "../jslib/board.js";
import {
    DImage, DLayer, setDrawPlatform
} from "../jslib/draw.js";
import {
    mockPlatform, getContextDirectives, resetContextDirectives
} from "./mocks.js";

describe("Geometry", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
    });

    function getLayer(level) {
        return level._layer;
    }
    function getDirectives(level) {
        return getContextDirectives(getLayer(level)._context);
    }
    function resetDirectives(level) {
        resetContextDirectives(getLayer(level)._context);
    }

    it("Checks board creation", () => {
        when:
            var board = new DBoard(500, 300, "map", "units", "markers");
        then:
            assert(board.root.tagName).equalsTo('div');
            assert(board.root.style).equalsTo("width: 500px; height:300px; border: 1px solid; position: relative");
            assert(board.viewPortWidth).equalsTo(500);
            assert(board.viewPortHeight).equalsTo(300);
        when:
            var levelMap = board.getLevel("map");
            var levelUnits = board.getLevel("units");
            var levelMarkers = board.getLevel("markers");
        then:
            assert(levelMap).isDefined();
            assert(levelUnits).isDefined();
            assert(levelMarkers).isDefined();
            assert(levelMap._layer).is(DLayer);
    });

    function createBoardWithMapUnitsAndMarkersLevels() {
        return new DBoard(500, 300, "map", "units", "markers");
    }

    it("Checks element creation and displaying", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels();
            var level = board.getLevel("units");
            var layer = getLayer(level);
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, 250, 150, 50, 50);
            var element = new DElement(artifact)
            resetDirectives(level);
            element.show(board);
        then: /* No paint here... */
            assert(getDirectives(level).length).equalsTo(0);
        when:
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            /* clears level */
            assert(getDirectives(level)[0]).equalsTo("save()");
            assert(getDirectives(level)[1]).equalsTo("resetTransform()");
            assert(getDirectives(level)[2]).equalsTo("clearRect(0, 0, 500, 300)");
            assert(getDirectives(level)[3]).equalsTo("restore()");
            /* draws content */
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 225, 125, 50, 50)");
        when:
            resetDirectives(level);
            element.setLocation(10, 20);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 235, 145, 50, 50)");
        when:
            resetDirectives(level);
            element.hide();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assert(getDirectives(level)[3]).equalsTo("restore()");
    });

});
