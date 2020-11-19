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
    Mechanisms,
    Memento
} from "../jslib/mechanisms.js";
import {
    mockPlatform, getContextDirectives, resetContextDirectives
} from "./mocks.js";

describe("Board", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
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
            var board = new DBoard(500, 300, 500, 300, "map", "units", "markers");
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

    function createBoardWithMapUnitsAndMarkersLevels(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(width, height, viewPortWidth, viewPortHeight, "map", "units", "markers");
    }

    function assertLevelIsCleared(index, level) {
        /* clears level */
        assert(getDirectives(level)[index]).equalsTo("save()");
        assert(getDirectives(level)[index + 1]).equalsTo("resetTransform()");
        assert(getDirectives(level)[index + 2]).equalsTo("clearRect(0, 0, 500, 300)");
        assert(getDirectives(level)[index + 3]).equalsTo("restore()");
    }

    it("Checks element creation/displaying/removing", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, 0, 0, 50, 50);
            var element = new DElement(artifact);
            element.setLocation(100, 50);
            resetDirectives(level);
            element.setOnBoard(board);
        then: /* No paint here... */
            assert(artifact.board).equalsTo(board);
            assert(element.board).equalsTo(board);
            assert(getDirectives(level).length).equalsTo(0);
        when:
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level)
            /* draws content */
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
        when:
            resetDirectives(level);
            element.setLocation(110, 70);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 85, 45, 50, 50)");
        when:
            resetDirectives(level);
            element.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[3]).equalsTo("restore()");
    });

    it("Checks default element settings", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact1 = new DImageArtifact("units", image, 0, 0, 50, 50);
            var artifact2 = new DImageArtifact("units", image, 0, 0, 50, 50, 60);
            var artifact3 = new DImageArtifact("units", image, 10, 15, 50, 50);
            var element = new DElement(artifact1, artifact2, artifact3);
            resetDirectives(level);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(element.angle).equalsTo(0);
            assert(element.x).equalsTo(0);
            assert(element.y).equalsTo(0);
            assert(artifact1.pangle).equalsTo(0);
            assert(artifact1.angle).equalsTo(0);
            assert(artifact1.px).equalsTo(0);
            assert(artifact1.py).equalsTo(0);
            assert(artifact1.x).equalsTo(0);
            assert(artifact1.y).equalsTo(0);
            assert(artifact1.transform).isNotDefined();
            assert(artifact1.boundingRect.toString()).equalsTo("area(-25, -25, 25, 25)");
            assert(artifact2.transform.toString()).equalsTo("matrix(0.5, 0.866, -0.866, 0.5, 0, 0)");
            assert(artifact2.boundingRect.toString()).equalsTo("area(-34.1506, -34.1506, 34.1506, 34.1506)");
            assert(artifact3.transform.toString()).equalsTo("matrix(1, 0, 0, 1, 10, 15)");
            assert(artifact3.boundingRect.toString()).equalsTo("area(-15, -10, 35, 40)");
    });

    it("Checks element containing multiple artifacts", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image1 = DImage.getImage("../images/unit1.png");
            image1._root.onload();
            var image2 = DImage.getImage("../images/unit2.png");
            image2._root.onload();
            var artifact1 = new DImageArtifact("units", image1, -10, -15, 50, 50);
            var artifact2 = new DImageArtifact("units", image2, 10, 15, 50, 50, 45);
            var element = new DElement(artifact1, artifact2);
            element.setLocation(100, 50);
            element.setRotation(90);
            resetDirectives(level);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(element.angle).equalsTo(90);
            assert(element.x).equalsTo(100);
            assert(element.y).equalsTo(50);
            assert(artifact1.pangle).equalsTo(0);
            assert(artifact1.angle).equalsTo(90);
            assert(artifact1.px).equalsTo(-10);
            assert(artifact1.py).equalsTo(-15);
            assert(artifact1.x).equalsTo(115);
            assert(artifact1.y).equalsTo(40);
            assert(artifact1.transform.toString()).equalsTo("matrix(0, 1, -1, 0, 115, 40)");
            assert(artifact1.boundingRect.toString()).equalsTo("area(90, 15, 140, 65)");
            assert(artifact2.pangle).equalsTo(45);
            assert(artifact2.angle).equalsTo(135);
            assert(artifact2.px).equalsTo(10);
            assert(artifact2.py).equalsTo(15);
            assert(artifact2.x).equalsTo(85);
            assert(artifact2.y).equalsTo(60);
            assert(artifact2.transform.toString()).equalsTo("matrix(-0.7071, 0.7071, -0.7071, -0.7071, 85, 60)");
            assert(artifact2.boundingRect.toString()).equalsTo("area(49.6447, 24.6447, 120.3553, 95.3553)");
            assert(getDirectives(level).length).equalsTo(12);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("save()");
            assert(getDirectives(level)[5]).equalsTo("setTransform(0, 1, -1, 0, 405, 75)");
            assert(getDirectives(level)[6]).equalsTo("drawImage(../images/unit1.png, 90, 15, 50, 50)");
            assert(getDirectives(level)[7]).equalsTo("restore()");
            assert(getDirectives(level)[8]).equalsTo("save()");
            assert(getDirectives(level)[9]).equalsTo("setTransform(-0.7071, 0.7071, -0.7071, -0.7071, 437.5305, 192.3223)");
            assert(getDirectives(level)[10]).equalsTo("drawImage(../images/unit2.png, 60, 35, 50, 50)");
            assert(getDirectives(level)[11]).equalsTo("restore()");
    });

    function createImageElement(path, x, y) {
        let image = DImage.getImage(path, x, y);
        image._root.onload();
        let artifact = new DImageArtifact("units", image, x, y, 50, 50);
        return new DElement(artifact);
    }

    it("Checks that if element is not in visible area, no drawing order is issued", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            board.zoom(250, 150,1);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(100, 50);
        when:
            resetDirectives(level);
            element.setOnBoard(board);  // VisibleArtifacts not defined here
            board.paint();              // Created starting form here
        then:
            assert(getDirectives(level)).arrayContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.setLocation(-400, 50);
            board.paint();
        then:
            assert(getDirectives(level)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.setLocation(100, 50);
            board.paint();
        then:
            assert(getDirectives(level)).arrayContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(level)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.setLocation(-400, 50);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(level)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.removeFromBoard(board);
            element.setLocation(100, 50);   // VisibleArtifacts defined here
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(level)).arrayContains("/images/unit.png");
    });

    it("Checks element showing in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(100, 50);
            Memento.activate();
        when:
            resetDirectives(level);
            element.show(board);
            board.paint();
        then:
            assert(element.board).equalsTo(board);
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(element.board).isNotDefined();
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(0, level);
    });

    it("Checks element hiding in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(100, 50);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.hide(board);
            board.paint();
        then:
            assert(element.board).isNotDefined();
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(0, level);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(element.board).equalsTo(board);
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
    });

    it("Checks element moves in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setLocation(100, 50);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.move(150, 100);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 125, 75, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(5);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
    });

    it("Checks element rotation in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            element.setRotation(90);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.rotate(180);
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(8);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("save()");
            assert(getDirectives(level)[5]).equalsTo("setTransform(-1, 0, 0, -1, 250, 150)");
            assert(getDirectives(level)[6]).equalsTo("drawImage(../images/unit.png, -25, -25, 50, 50)");
            assert(getDirectives(level)[7]).equalsTo("restore()");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(8);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("save()");
            assert(getDirectives(level)[5]).equalsTo("setTransform(0, 1, -1, 0, 250, 150)");
            assert(getDirectives(level)[6]).equalsTo("drawImage(../images/unit.png, -25, -25, 50, 50)");
            assert(getDirectives(level)[7]).equalsTo("restore()");
    });

    it("Checks zooming", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        then:
            assert(board.minZoomFactor).equalsTo(0.5);
            assert(getDirectives(level)[1]).equalsTo("setTransform(0.5, 0, 0, 0.5, 250, 150)");
        when:
            resetDirectives(level);
            board.zoomOut(250, 150);
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(0.75);
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.zoomOut(260, 160);
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(1.125);
            assert(getDirectives(level)[0]).equalsTo("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.zoomIn(255, 155);
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(0.75);
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 248.3333, 148.3333)");
            assertLevelIsCleared(1, level);
    });

    it("Checks scrolling", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        when:
            resetDirectives(level);
            board.zoomOut(250, 150); // Mandatory to have space to move
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
        when:
            resetDirectives(level);
            board.scrollOnLeft();
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 150)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.scrollOnRight();
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.scrollOnTop();
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 160)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.scrollOnBottom();
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
    });

    it("Checks zoom settings", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        when:
            board.setZoomSettings(2, 12);
            board.zoomOut(250, 150);
        then:
            assert(board.zoomFactor).equalsTo(1);
        when:
            board.zoomOut(250, 150);
        then:
            assert(board.zoomFactor).equalsTo(2);
        when:
            board.zoomOut(250, 150); // ZoomFactor = 4
            board.zoomOut(250, 150); // ZoomFactor = 8
            board.zoomOut(250, 150); // ZoomFactor = 16>12 => 12
        then:
            assert(board.zoomFactor).equalsTo(12);
    });

    it("Checks recenter", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOut(250, 150); // Mandatory to have space to move
            board.paint();
        when:
            resetDirectives(level);
            board.recenter(260, 170);
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 240, 130)");
            assertLevelIsCleared(1, level);
    });

    it("Checks adjustement", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.setZoomSettings(2, 8);
            board.paint();
        when:
            assert(board.zoomFactor).equalsTo(0.5);
            board.zoom(250, 150, 0.2); // Try to zoom in above limits
        then:
            assert(board.zoomFactor).equalsTo(0.5);
        when:
            board.zoom(250, 150, 12);
        then:
            assert(board.zoomFactor).equalsTo(8);
        when:
            board.zoom(250, 150, 1);
            board.center(-499, -299); // Try to center next left/top border
        then:
            assert(board.x).equalsTo(-250);
            assert(board.y).equalsTo(-150);
        when:
            board.center(499, 299); // Try to center next right/bottom border
        then:
            assert(board.x).equalsTo(250);
            assert(board.y).equalsTo(150);
    });

    it("Checks border detection", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        when:
            assert(board.isOnLeftBorder(9, 150)).isTrue();
            assert(board.isOnLeftBorder(11, 150)).isFalse();
            assert(board.isOnRightBorder(491, 150)).isTrue();
            assert(board.isOnRightBorder(489, 150)).isFalse();
            assert(board.isOnTopBorder(150, 9)).isTrue();
            assert(board.isOnTopBorder(150, 11)).isFalse();
            assert(board.isOnBottomBorder(150, 29150)).isTrue();
            assert(board.isOnBottomBorder(150, 289)).isFalse();
    });

    it("Checks scroll settings", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        when:
            resetDirectives(level);
            board.zoomOut(250, 150); // Mandatory to have space to move
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
        when:
            resetDirectives(level);
            board.setScrollSettings(25, 20);
            board.scrollOnLeft();
            board.paint();
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 275, 150)");
            assertLevelIsCleared(1, level);
            assert(board.isOnLeftBorder(19, 150)).isTrue();
            assert(board.isOnLeftBorder(21, 150)).isFalse();
    });

    function createEvent(eventType, args) {
        return {
            type: eventType,
            ...args,
            defaultStatus: true,
            preventDefault() {
                this.defaultStatus = false;
            }
        };
    }

    it("Checks onMouse reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            board.onMouseClick(event=> {
                element.move(event.x, event.y);
                return false; // To open a new transaction
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN) mementoOpened = true;
                }
            });
        when:
            resetDirectives(level);
            var event = createEvent("click", {x:10, y:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks onMouse memento aware reflex ", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            board.onMouseClick(event=> {
                element.move(event.x, event.y);
                return true; // To open a new transaction
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN) mementoOpened = true;
                }
            });
        when:
            resetDirectives(level);
            var event = createEvent("click", {x:10, y:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isTrue();
    });

    it("Checks keyDown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            board.onKeyDown(event=> {
                element.move(event.x, event.y);
                return false; // To open a new transaction
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN) mementoOpened = true;
                }
            });
        when:
            resetDirectives(level);
            var event = createEvent("keydown", {x:10, y:10});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks keyDown memento aware reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            board.onKeyDown(event=> {
                element.move(event.x, event.y);
                return true; // To open a new transaction
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN) mementoOpened = true;
                }
            });
        when:
            resetDirectives(level);
            var event = createEvent("keydown", {x:10, y:10});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(mementoOpened).isTrue();
    });

    it("Checks zoomInOut/onMouseWheel reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomInOutOnMouseWheel();
        when:
            resetDirectives(level);
            let event = createEvent("wheel", {
                offsetX: 260, offsetY: 170, deltaX: 0, deltaY: -125, deltaZ: 0
            });
            mockPlatform.dispatchEvent(board.root, "wheel", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 245, 140)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            event = createEvent("wheel", {
                offsetX: 260, offsetY: 170, deltaX: 0, deltaY: 125, deltaZ: 0
            });
            mockPlatform.dispatchEvent(board.root, "wheel", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.5, 0, 0, 0.5, 250, 150)");
            assertLevelIsCleared(1, level);
    });

    it("Checks scrollOnBorders/onMouseMove reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOut(250, 150); // Mandatory to have space to move
            board.scrollOnBordersOnMouseMove();
        when:
            resetDirectives(level);
            let event = createEvent("mousemove", {offsetX: 5, offsetY: 5});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(level)[1]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 160)");
            assertLevelIsCleared(2, level);
        when:
            resetDirectives(level);
            event = createEvent("mousemove", {offsetX: 495, offsetY: 295});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(level)[1]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(2, level);
    });

    it("Checks scroll/onKeydown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOut(250, 150); // Mandatory to have space to move
            board.scrollOnKeyDown();
        when:
            resetDirectives(level);
            let event = createEvent("keydown", {key: 'ArrowLeft'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 150)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 160)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowRight'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 160)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
    });

    it("Checks zoom/onKeydown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOnKeyDown();
        when: // Zoom out
            resetDirectives(level);
            let event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
        when: // Change focus point
            resetDirectives(level);
            event = createEvent("click", {offsetX: 260, offsetY: 160});
            mockPlatform.dispatchEvent(board.root, "click", event);
            event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLevelIsCleared(1, level);
        when: // Zoom in
            resetDirectives(level);
            event = createEvent("keydown", {key: 'PageUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
    });

    it("Checks undoRedo/onKeyDown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", 0, 0);
            board.onMouseClick(event=> {
                let point = board.getBoardXY(event.offsetX, event.offsetY);
                element.move(point.x, point.y);
                return true; // To open a new transaction
            });
            board.undoRedoOnKeyDown();
            element.setLocation(100, 50);
            element.setOnBoard(board);
            Memento.activate();
            resetDirectives(level); // Move image one time
            var event = createEvent("click", {offsetX: 260, offsetY: 170});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, -5, 15, 50, 50)");
            resetDirectives(level); // Move image a second time in another transaction
            event = createEvent("click", {offsetX: 240, offsetY: 130});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, -45, -65, 50, 50)");
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'z', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, -5, 15, 50, 50)");
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'y', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[4]).equalsTo("drawImage(../images/unit.png, -45, -65, 50, 50)");

    });

});
