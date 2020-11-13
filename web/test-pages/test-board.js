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
    Memento
} from "../jslib/mechanisms.js";
import {
    mockPlatform, getContextDirectives, resetContextDirectives
} from "./mocks.js";

describe("Board", ()=> {

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

    function assertLevelIsCleared(level) {
        /* clears level */
        assert(getDirectives(level)[0]).equalsTo("save()");
        assert(getDirectives(level)[1]).equalsTo("resetTransform()");
        assert(getDirectives(level)[2]).equalsTo("clearRect(0, 0, 500, 300)");
        assert(getDirectives(level)[3]).equalsTo("restore()");
    }

    it("Checks element creation/displaying/removing", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels();
            var level = board.getLevel("units");
            var layer = getLayer(level);
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, 0, 0, 50, 50);
            var element = new DElement(artifact);
            element.setLocation(250, 150);
            resetDirectives(level);
            element.setOnBoard(board);
        then: /* No paint here... */
            assert(getDirectives(level).length).equalsTo(0);
        when:
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level)
            /* draws content */
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 225, 125, 50, 50)");
        when:
            resetDirectives(level);
            element.setLocation(260, 170);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 235, 145, 50, 50)");
        when:
            resetDirectives(level);
            element.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[3]).equalsTo("restore()");
    });

    function createImageElement(path, x, y) {
        var image = DImage.getImage(path, x, y);
        image._root.onload();
        var artifact = new DImageArtifact("units", image, x, y, 50, 50);
        return new DElement(artifact);
    }

    it("Checks element showing in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels();
            var level = board.getLevel("units");
            var layer = getLayer(level);
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(250, 150);
            Memento.activate();
        when:
            resetDirectives(level);
            element.show(board);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 225, 125, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(level);
    });

    it("Checks element hiding in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels();
            var level = board.getLevel("units");
            var layer = getLayer(level);
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(250, 150);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.hide(board);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(level);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 225, 125, 50, 50)");
    });

    it("Checks element moves in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels();
            var level = board.getLevel("units");
            var layer = getLayer(level);
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(250, 150);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.move(300, 200);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 275, 175, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 225, 125, 50, 50)");
    });
});
