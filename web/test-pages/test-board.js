'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D, Matrix2D, Area2D
} from "../jslib/geometry.js";
import {
    DAnimator, DImage, DLayer, DTranslateLayer, setDrawPlatform
} from "../jslib/draw.js";
import {
    Mechanisms, Memento
} from "../jslib/mechanisms.js";
import {
    DArtifactAlphaAnimation, DArtifactRotateAnimation,
    DBoard, DElement, DImageArtifact, DSimpleLevel, DMultiImagesArtifact,
    DTextArtifact, DStaticLevel, DLayeredLevel, DStackedLevel, DRectArtifact, DComposedImageArtifact
} from "../jslib/board.js";
import {
    mockPlatform, getDirectives, resetDirectives, createEvent, loadAllImages, getLayers, assertDirectives
} from "./mocks.js";

describe("Board", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.reset();
        DAnimator.clear();
    });

    it("Checks board creation", () => {
        when:
            var board = new DBoard(new Dimension2D(500, 300), new Dimension2D(500, 300),
                new DSimpleLevel("map"),
                new DSimpleLevel("units"),
                new DSimpleLevel("markers"));
        then:
            assert(board.root.tagName).equalsTo('div');
            assert(board.root.style).equalsTo("border: 1px solid; position: relative, overflow: hidden");
            assert(board.viewportDimension.w).equalsTo(500);
            assert(board.viewportDimension.h).equalsTo(300);
            assert(board.dimension.w).equalsTo(500);
            assert(board.dimension.h).equalsTo(300);
        when:
            var levelMap = board.getLevel("map");
            var levelUnits = board.getLevel("units");
            var levelMarkers = board.getLevel("markers");
        then:
            assert(levelMap).isDefined();
            assert(levelUnits).isDefined();
            assert(levelMarkers).isDefined();
            assert(levelMap._layer).is(DLayer);
            assert(levelMap.transform.toString()).equalsTo("matrix(1, 0, 0, 1, 250, 150)");
            assert(levelMap.viewportDimension.toString()).equalsTo("dimension(500, 300)");
    });

    it("Checks board fit on window", () => {
        given:
            var board = new DBoard(new Dimension2D(2500, 2000), new Dimension2D(500, 300),
                new DSimpleLevel("map"));
            var [mapLayer] = getLayers(board, "map");
        when:
            var resizeCount = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (event === "board-resize") {
                        resizeCount++;
                        assert(source).equalsTo(board);
                    }
                }
            });
            resetDirectives(mapLayer);
            board.fitWindow();
        then:
            assert(board.viewportDimension.w).equalsTo(1500);
            assert(board.viewportDimension.h).equalsTo(1000);
            assert(board.dimension.w).equalsTo(2500);
            assert(board.dimension.h).equalsTo(2000);
            assert(resizeCount).equalsTo(1)
            assert(getDirectives(mapLayer)).arrayEqualsTo([ // ensure that a paint is done...
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()"
            ]);
    });

    function createBoardWithMapUnitsAndMarkersLevels(width, height, viewPortWidth, viewPortHeight) {
        let mapLevel = new DSimpleLevel("map");
        let unitsLevel = new DSimpleLevel("units");
        let markersLevel = new DSimpleLevel("markers");
        let board = new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            mapLevel, unitsLevel, markersLevel);
        var [mapLayer, unitsLayer, markersLayer] = getLayers(board, "map", "units", "markers");
        return { board, mapLevel, unitsLevel, markersLevel, mapLayer, unitsLayer, markersLayer }
    }

    function assertLayerIsCleared(index, layer) {
        /* clears level */
        assert(getDirectives(layer)[index]).equalsTo("save()");
        assert(getDirectives(layer)[index + 1]).equalsTo("resetTransform()");
        assert(getDirectives(layer)[index + 2]).equalsTo("clearRect(0, 0, 500, 300)");
        assert(getDirectives(layer)[index + 3]).equalsTo("restore()");
    }

    it("Checks level drawing primitives", () => {
        given:
            var { unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image = DImage.getImage("../images/unit.png");

            image._root.onload();
        when:
            resetDirectives(layer);
            level.drawImage(image, new Point2D(10, 20), new Dimension2D(50, 60));
            level.setStrokeSettings("#000000", 2);
            level.drawRect(new Point2D(10, 20), new Dimension2D(50, 60));
            level.setFillSettings("#FFFFFF");
            level.setShadowSettings("#0F0F0F", 15);
            level.setAlphaSettings(0.3);
            level.fillRect(new Point2D(10, 20), new Dimension2D(50, 60));
        then:
            assert(getDirectives(layer)[0]).equalsTo("drawImage(../images/unit.png, 10, 20, 50, 60)");
            assert(getDirectives(layer)[1]).equalsTo("strokeStyle = #000000");
            assert(getDirectives(layer)[2]).equalsTo("lineWidth = 2");
            assert(getDirectives(layer)[3]).equalsTo("strokeRect(10, 20, 50, 60)");
            assert(getDirectives(layer)[4]).equalsTo("fillStyle = #FFFFFF");
            assert(getDirectives(layer)[5]).equalsTo("shadowColor = #0F0F0F");
            assert(getDirectives(layer)[6]).equalsTo("shadowBlur = 15");
            assert(getDirectives(layer)[7]).equalsTo("globalAlpha = 0.3");
            assert(getDirectives(layer)[8]).equalsTo("fillRect(10, 20, 50, 60)");
    });

    it("Checks element creation/displaying/removing", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setLocation(new Point2D(100, 50));
        then:
            assert(element.isShown()).isFalse();
            assert(artifact.isShown()).isFalse();
        when:
            resetDirectives(layer);
            element.setOnBoard(board);
        then: /* No paint here... */
            assert(element.isShown()).isTrue();
            assert(artifact.board).equalsTo(board);
            assert(element.board).equalsTo(board);
            assert(artifact.isShown()).isTrue();
            assert(getDirectives(layer).length).equalsTo(0);
        when:
            board.paint();
        then:
            assertLayerIsCleared(0, layer)
            /* draws content */
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            element.setLocation(new Point2D(110, 70));
            board.paint();
        then:
            assertLayerIsCleared(0, layer);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 360, 220)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            element.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(layer).length).equalsTo(4);
            assertLayerIsCleared(0, layer);
    });

    it("Checks element alpha management", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image = DImage.getImage("../images/unit.png");
            loadAllImages();
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setLocation(new Point2D(100, 50));
            resetDirectives(layer);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            element.alpha = 0.5;
            board.paint();
        then:
            assert(element.alpha).equalsTo(0.5);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "globalAlpha = 0.5",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks element refresh feature", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image1 = DImage.getImage("../images/unit1.png");
            image1._root.onload();
            var image2 = DImage.getImage("../images/unit2.png");
            image2._root.onload();
            var artifact1 = new DImageArtifact("units", image1, new Point2D(-10, -15), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image2, new Point2D(10, 15), new Dimension2D(50, 50));
            var element = new DElement(artifact1, artifact2);
            element.setOnBoard(board);
            board.paint();
            resetDirectives(layer);
        when:
            board.paint(); // nothing to paint, everything is fine
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: // force repainting
            element.refresh();
            board.paint();
        then:
            assert(getDirectives(layer).length).equalsTo(12);
            assert(getDirectives(layer)).arrayContains("../images/unit1.png");
            assert(getDirectives(layer)).arrayContains("../images/unit2.png");
        when:
            resetDirectives(layer);
            board.paint(); // nothing to paint again, everything is fine
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when:
            resetDirectives(layer);
            board.repaint(); // force repainting
        then:
            assert(getDirectives(layer).length).equalsTo(12);
            assert(getDirectives(layer)).arrayContains("../images/unit1.png");
            assert(getDirectives(layer)).arrayContains("../images/unit2.png");
    });

    it("Checks default element settings", () => {
        given:
            var {board} = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact1 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            artifact2.pangle = 60;
            var artifact3 = new DImageArtifact("units", image, new Point2D(10, 15), new Dimension2D(50, 50));
            var element = new DElement(artifact1, artifact2);
        then:
            assert(element.hasArtifact(artifact1)).isTrue();
            assert(element.hasArtifact(artifact3)).isFalse();
        when:
            element.addArtifact(artifact3);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(element.angle).equalsTo(0);
            assert(element.location.x).equalsTo(0);
            assert(element.location.y).equalsTo(0);
            assert(element.hasArtifact(artifact3)).isTrue();
            assert(artifact1.pangle).equalsTo(0);
            assert(artifact1.angle).equalsTo(0);
            assert(artifact1.position.x).equalsTo(0);
            assert(artifact1.position.y).equalsTo(0);
            assert(artifact1.location.x).equalsTo(0);
            assert(artifact1.location.y).equalsTo(0);
            assert(artifact1.transform).isNotDefined();
            assert(artifact1.boundingArea.toString()).equalsTo("area(-25, -25, 25, 25)");
            assert(artifact1.viewportBoundingArea.toString()).equalsTo("area(237.5, 137.5, 262.5, 162.5)");
            assert(artifact2.transform.toString()).equalsTo("matrix(0.5, 0.866, -0.866, 0.5, 0, 0)");
            assert(artifact2.boundingArea.toString()).equalsTo("area(-34.1506, -34.1506, 34.1506, 34.1506)");
            assert(artifact2.viewportBoundingArea.toString()).equalsTo("area(-21.9791, 274.431, 12.1715, 308.5817)");
            assert(artifact3.transform.toString()).equalsTo("matrix(1, 0, 0, 1, 10, 15)");
            assert(artifact3.boundingArea.toString()).equalsTo("area(-15, -10, 35, 40)");;
            assert(artifact3.viewportBoundingArea.toString()).equalsTo("area(247.5, 152.5, 272.5, 177.5)");
    });

    it("Checks static level", () => {
        given:
            var widgetsLevel = new DStaticLevel("widgets");
            let board = new DBoard(new Dimension2D(1000, 500), new Dimension2D(500, 250), widgetsLevel);
            let [widgetsLayer] = getLayers(board, "widgets");
        when:
            var image = DImage.getImage("../images/widget.png");
            image._root.onload();
            var artifact = new DImageArtifact("widgets", image, new Point2D(0, 0), new Dimension2D(50, 50));;
            var element = new DElement(artifact);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "drawImage(../images/widget.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks layered level", () => {
        given:
            var unitImage = DImage.getImage("../images/unit.png");
            var markerImage = DImage.getImage("../images/marker.png");
            var unitArtifact = new DImageArtifact("units", unitImage, new Point2D(0, 0), new Dimension2D(50, 50));;
            var markerArtifact = new DImageArtifact("units", markerImage, new Point2D(0, 0), new Dimension2D(50, 50));;
            var unitElement = new DElement(unitArtifact);
            var markerElement = new DElement(markerArtifact);
            let select = function(artifact, [unitLayer, markerLayer]) {
                return artifact === unitArtifact ? unitLayer : markerLayer;
            }
            let unitLayer = new DLayer("unit");
            let markerLayer = new DTranslateLayer("marker", Matrix2D.translate(new Point2D(40, -40)));
            var unitsLevel = new DLayeredLevel("units", select, unitLayer, markerLayer);
            let board = new DBoard(new Dimension2D(1000, 500), new Dimension2D(500, 250), unitsLevel);
            loadAllImages();
        when:
            unitElement.setOnBoard(board);
            markerElement.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(unitLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, 250, 125)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(markerLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, 270, 105)",
                    "drawImage(../images/marker.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(unitsLevel.layers).arrayEqualsTo([unitLayer, markerLayer]);
            assert(unitsLevel.getViewportPoint(new Point2D(0, 0), unitArtifact).toString()).equalsTo("point(250, 125)");
            assert(unitsLevel.getViewportPoint(new Point2D(0, 0), markerArtifact).toString()).equalsTo("point(270, 105)");
            assert(unitsLevel.getOriginalPoint(unitArtifact).toString()).equalsTo("point(-500, -250)");
            assert(unitsLevel.getFinalPoint(unitArtifact).toString()).equalsTo("point(500, 250)");
            assert(unitsLevel.getOriginalPoint(markerArtifact).toString()).equalsTo("point(-540, -210)");
            assert(unitsLevel.getFinalPoint(markerArtifact).toString()).equalsTo("point(460, 290)");
            assert(unitsLevel.getAllArtifactsOnPoint(new Point2D(250, 125))).arrayEqualsTo([unitArtifact]);
            assert(unitsLevel.getAllArtifactsOnPoint(new Point2D(260, 115))).arrayEqualsTo([markerArtifact, unitArtifact]);
            assert(unitsLevel.getArtifactOnPoint(new Point2D(260, 115))).equalsTo(markerArtifact);
            assert(unitsLevel.getAllArtifactsOnPoint(new Point2D(100, 100))).arrayEqualsTo([]);
            assert(unitsLevel.getArtifactOnPoint(new Point2D(100, 100))).isNotDefined();
            assert(unitsLevel.isPointOnArtifact(unitArtifact, new Point2D(250, 125))).isTrue();
            assert(unitsLevel.isPointOnArtifact(markerArtifact, new Point2D(250, 125))).isFalse();
        when:
            var widgetLayer = new DLayer("widget");
            unitsLevel.addLayer(widgetLayer);
        then:
            assert(unitsLevel.layers).arrayEqualsTo([unitLayer, markerLayer, widgetLayer]);
    });

    it("Checks stacked level", () => {
        given:
            var unit1Image = DImage.getImage("../images/unit1.png");
            var unit1Artifact = new DImageArtifact("units", unit1Image, new Point2D(0, 0), new Dimension2D(50, 50));;
            var unit1Element = new DElement(unit1Artifact);
            unit1Artifact.unit = unit1Element;
            unit1Element.main = unit1Artifact;
            var unit2Image = DImage.getImage("../images/unit2.png");
            var unit2Artifact = new DImageArtifact("units", unit2Image, new Point2D(0, 0), new Dimension2D(50, 50));;
            var unit2Element = new DElement(unit2Artifact);
            unit2Artifact.unit = unit2Element;
            unit2Element.main = unit2Artifact;
            var units = [unit1Element, unit2Element];
            let createSlot = function(index) {
                return [
                    new DLayer("unit-"+index),
                    new DLayer("marker-"+index)
                ]
            }
            let selectSlot = function(artifact) {
                return units.indexOf(artifact.unit);
            }
            let selectLayer = function(artifact, [unitLayer, markerLayer]) {
                return artifact.unit.main === artifact ? unitLayer : markerLayer;
            }
            var unitsLevel = new DStackedLevel("units", selectSlot, selectLayer, createSlot);
            let board = new DBoard(new Dimension2D(1000, 500), new Dimension2D(500, 250), unitsLevel);
            loadAllImages();
        when:
            unit1Element.setOnBoard(board);
            unit2Element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(board._draw.getLayer("unit-0"), 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, 250, 125)",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(board._draw.getLayer("unit-1"), 0)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0, 0, 0.5, 250, 125)",
                    "drawImage(../images/unit2.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function createBoardWithOneCounter() {
        var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        var image = DImage.getImage("../images/unit.png");
        image._root.onload();
        var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
        var element = new DElement(artifact);
        element.setOnBoard(board);
        resetDirectives(layer);
        board.paint();
        assert(getDirectives(layer, 4)).arrayEqualsTo([
            "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
            "restore()"
        ]);
        return { board, level, layer, element, artifact, image };
    }

    it("Checks artifact general features", () => {
        given:
            var {artifact} = createBoardWithOneCounter();
        then:
            assert(artifact.getViewportPoint(new Point2D(10, 5)).toString()).equalsTo("point(260, 155)");
            assert(artifact.getPoint(new Point2D(260, 155)).toString()).equalsTo("point(10, 5)");
    });

    it("Checks change artifact position and relative orientation (not undoable)", () => {
        given:
            var {board, artifact, layer, image} = createBoardWithOneCounter();
        when: // Change position
            resetDirectives(layer);
            artifact.position = new Point2D(-10, -15);
            board.paint();
        then:
            assert(artifact.position.toString()).equalsTo("point(-10, -15)");
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // Change orientation
            resetDirectives(layer);
            artifact.pangle = 60;
            board.paint();
        then:
            assert(artifact.pangle).equalsTo(60);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0.866, -0.866, 0.5, 240, 135)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            var orphanArtifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            orphanArtifact.position = new Point2D(10, 10);
            orphanArtifact.pangle = 60;
        then:
            assert(orphanArtifact.position.toString()).equalsTo("point(10, 10)");
            assert(orphanArtifact.pangle).equalsTo(60);
    });

    it("Checks change artifact position and relative orientation (undoable)", () => {
        given:
            var {board, artifact, layer, image} = createBoardWithOneCounter();
            Memento.activate();
            Memento.open();
        when: // Change position
            resetDirectives(layer);
            artifact.position = new Point2D(-10, -15);
            board.paint();
        then:
            assert(artifact.position.toString()).equalsTo("point(-10, -15)");
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 240, 135)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
        ]);
        when: // Change orientation
            resetDirectives(layer);
            artifact.turn(60);
            board.paint();
        then:
            assert(artifact.pangle).equalsTo(60);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.5, 0.866, -0.866, 0.5, 240, 135)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            artifact.shift(new Point2D(10, 10));
            board.paint();
        then:
            assert(artifact.position.toString()).equalsTo("point(10, 10)");
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.5, 0.866, -0.866, 0.5, 260, 160)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(artifact.position.toString()).equalsTo("point(-10, -15)");
            assert(artifact.pangle).equalsTo(0);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 240, 135)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks change artifact level (not undoable)", () => {
        given:
            var { unitsLayer, markersLevel, markersLayer, board } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(unitsLayer, markersLayer);
            board.paint();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
        ]);
        when:
            resetDirectives(unitsLayer, markersLayer);
            artifact.setLevel("markers");
            board.paint();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks change artifact level (undoable)", () => {
        given:
            var { unitsLevel, unitsLayer, markersLevel, markersLayer, board } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(unitsLayer, markersLayer);
            board.paint();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            resetDirectives(unitsLayer, markersLayer);
            artifact.changeLevel("markers");
            board.paint();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer, markersLayer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks change artifact alpha", () => {
        given:
            var {board, artifact, layer, image} = createBoardWithOneCounter();
        when: // Change position
            resetDirectives(layer);
            artifact.alpha = 0.3;
            board.paint();
        then:
            assert(artifact.alpha).equalsTo(0.3);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "globalAlpha = 0.3",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            var orphanArtifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            orphanArtifact.alpha = 0.3;
        then:
            assert(orphanArtifact.alpha).equalsTo(0.3);
    });

    it("Checks element containing multiple artifacts", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image1 = DImage.getImage("../images/unit1.png");
            image1._root.onload();
            var image2 = DImage.getImage("../images/unit2.png");
            image2._root.onload();
            var artifact1 = new DImageArtifact("units", image1, new Point2D(-10, -15), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image2, new Point2D(10, 15), new Dimension2D(50, 50));
            artifact2.pangle = 45;
            var element = new DElement(artifact1, artifact2);
            element.setLocation(new Point2D(100, 50));
            element.setAngle(90);
            resetDirectives(layer);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(element.artifacts).arrayEqualsTo([artifact1, artifact2]);
            assert(element.angle).equalsTo(90);
            assert(element.location.x).equalsTo(100);
            assert(element.location.y).equalsTo(50);
            assert(element.getLocation(new Point2D(5, 10)).x).equalsTo(90);
            assert(element.getLocation(new Point2D(5, 10)).y).equalsTo(55);
            assert(element.getPosition(new Point2D(90, 55)).x).equalsTo(5);
            assert(element.getPosition(new Point2D(90, 55)).y).equalsTo(10);
            assert(element.boundingArea.toString()).equalsTo("area(49.6447, 15, 140, 95.3553)");

            assert(artifact1.level).equalsTo(level);
            assert(artifact1.pangle).equalsTo(0);
            assert(artifact1.angle).equalsTo(90);
            assert(artifact1.position.x).equalsTo(-10);
            assert(artifact1.position.y).equalsTo(-15);
            assert(artifact1.location.x).equalsTo(115);
            assert(artifact1.location.y).equalsTo(40);
            assert(artifact1.getLocation(new Point2D(5, 10)).x).equalsTo(105);
            assert(artifact1.getLocation(new Point2D(5, 10)).y).equalsTo(45);
            assert(artifact1.getPosition(new Point2D(105, 45)).x).equalsTo(5);
            assert(artifact1.getPosition(new Point2D(105, 45)).y).equalsTo(10);
            assert(artifact1.transform.toString()).equalsTo("matrix(0, 1, -1, 0, 115, 40)");
            assert(artifact1.boundingArea.toString()).equalsTo("area(90, 15, 140, 65)");

            assert(artifact2.level).equalsTo(level);
            assert(artifact2.pangle).equalsTo(45);
            assert(artifact2.angle).equalsTo(135);
            assert(artifact2.position.x).equalsTo(10);
            assert(artifact2.position.y).equalsTo(15);
            assert(artifact2.location.x).equalsTo(85);
            assert(artifact2.location.y).equalsTo(60);
            assert(artifact2.transform.toString()).equalsTo("matrix(-0.7071, 0.7071, -0.7071, -0.7071, 85, 60)");
            assert(artifact2.boundingArea.toString()).equalsTo("area(49.6447, 24.6447, 120.3553, 95.3553)");

            assertLayerIsCleared(0, layer);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 1, -1, 0, 365, 190)",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(-0.7071, 0.7071, -0.7071, -0.7071, 335, 210)",
                    "drawImage(../images/unit2.png, -25, -25, 50, 50)",
                "restore()"
            ])
    });

    it("Checks search for artifacts from a viewport point", () => {
        given:
            var { board, mapLevel, unitsLevel } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        when:
            var mapImage = DImage.getImage("../images/map.png");
            mapImage._root.onload();
            var mapArtifact = new DImageArtifact("map", mapImage, new Point2D(0, 0), new Dimension2D(300, 300));
            mapArtifact.pangle = 45;
            var mapElement = new DElement(mapArtifact);
            mapElement.setOnBoard(board);
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact1 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image, new Point2D(80, 100), new Dimension2D(50, 50));
            var artifact3 = new DImageArtifact("units", image, new Point2D(90, 110), new Dimension2D(50, 50));
            var element = new DElement(artifact1, artifact2, artifact3);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(mapArtifact.viewportLocation.toString()).equalsTo("point(250, 150)");
            assert(artifact1.viewportLocation.toString()).equalsTo("point(250, 150)");
            assert(artifact2.viewportLocation.toString()).equalsTo("point(290, 200)");
            assert(artifact3.viewportLocation.toString()).equalsTo("point(295, 205)");
            assert(board.getViewPortPoint(mapArtifact.location).toString()).equalsTo("point(250, 150)");
            assert(board.getViewPortPoint(artifact1.location).toString()).equalsTo("point(250, 150)");
            assert(board.getViewPortPoint(artifact2.location).toString()).equalsTo("point(290, 200)");
            assert(board.getViewPortPoint(artifact3.location).toString()).equalsTo("point(295, 205)");
            assert(mapLevel.getArtifactOnPoint(new Point2D(250, 80))).equalsTo(mapArtifact);
            assert(mapLevel.getArtifactOnPoint(new Point2D(180, 80))).isNotDefined();
            assert(mapLevel.isPointOnArtifact(mapArtifact, new Point2D(250, 80))).isTrue();
            assert(mapLevel.isPointOnArtifact(mapArtifact, new Point2D(180, 80))).isFalse();
            assert(unitsLevel.getAllArtifactsOnPoint(new Point2D(290, 200))).arrayEqualsTo([artifact3, artifact2]);
            assert(board.getArtifactOnPoint(new Point2D(250, 80))).equalsTo(mapArtifact);
            assert(board.getArtifactOnPoint(new Point2D(180, 80))).isNotDefined();
            assert(board.isPointOnArtifact(mapArtifact, new Point2D(250, 80))).isTrue();
            assert(board.isPointOnArtifact(mapArtifact, new Point2D(180, 80))).isFalse();
            assert(board.getAllArtifactsOnPoint(new Point2D(290, 200))).arrayEqualsTo([artifact3, artifact2, mapArtifact]);
    });

    function createImageElement(path, location) {
        let image = DImage.getImage(path);
        image._root.onload();
        let artifact = new DImageArtifact("units", image, location, new Dimension2D(50, 50));
        let element = new DElement(artifact);
        element.artifact = artifact;
        return element;
    }

    it("Checks that if element is not in visible area, no drawing order is issued", () => {
        given:
            var { board, unitsLayer:layer, unitlsLevel:level } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            board.zoom(new Point2D(250, 150),1);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
        when:
            resetDirectives(layer);
            element.setOnBoard(board);  // VisibleArtifacts not defined here
            board.paint();              // Created starting form here
        then:
            assert([...level.artifacts].length).equalsTo(1);
            assert([...level.visibleArtifacts].length).equalsTo(1);
            assert(getDirectives(layer)).arrayContains("/images/unit.png");
        when:
            resetDirectives(layer);
            element.setLocation(new Point2D(-400, 50));
            board.paint();
        then:
            assert([...level.artifacts].length).equalsTo(1);
            assert([...level.visibleArtifacts].length).equalsTo(0);
            assert(getDirectives(layer)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(layer);
            element.setLocation(new Point2D(100, 50));
            board.paint();
        then:
            assert([...level.artifacts].length).equalsTo(1);
            assert([...level.visibleArtifacts].length).equalsTo(1);
            assert(getDirectives(layer)).arrayContains("/images/unit.png");
        when:
            resetDirectives(layer);
            element.removeFromBoard();
            board.paint();
        then:
            assert([...level.artifacts].length).equalsTo(0);
            assert([...level.visibleArtifacts].length).equalsTo(0);
            assert(getDirectives(layer)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(layer);
            element.setLocation(new Point2D(-400, 50));
            element.setOnBoard(board);
            board.paint();
        then:
            assert([...level.artifacts].length).equalsTo(1);
            assert([...level.visibleArtifacts].length).equalsTo(0);
            assert(getDirectives(layer)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(layer);
            element.removeFromBoard(board);
            element.setLocation(new Point2D(100, 50));   // VisibleArtifacts defined here
            element.setOnBoard(board);
            board.paint();
        then:
            assert([...level.artifacts].length).equalsTo(1);
            assert([...level.visibleArtifacts].length).equalsTo(1);
            assert(getDirectives(layer)).arrayContains("/images/unit.png");
    });

    it("Checks element showing in transaction", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
        when:
            resetDirectives(layer);
            element.show(board);
            board.paint();
        then:
            assert(element.board).equalsTo(board);
            assert(getDirectives(layer).length).equalsTo(8);
            assertLayerIsCleared(0, layer);
            assert(getDirectives(layer)).arrayContains("drawImage(../images/unit.png, -25, -25, 50, 50)");
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(element.board).isNotDefined();
            assert(getDirectives(layer).length).equalsTo(4);
            assertLayerIsCleared(0, layer);
    });

    it("Checks dynamic adding/removing artifacts on element out of transaction", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = new DElement();
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
            element.setOnBoard(board);
            board.paint();
            Memento.open();
            resetDirectives(layer);
        when:
            var image = DImage.getImage("../images/unit.png");
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            loadAllImages();
            element.addArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // add/remove artifacts methods are not bounded to transaction mechanism
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([]);
        when:
            resetDirectives(layer);
            element.removeArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([]);
    });

    it("Checks dynamic adding/removing artifacts on element in transaction", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = new DElement();
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
            element.show(board);
            board.paint();
            Memento.open();
            resetDirectives(layer);
        when:
            var image = DImage.getImage("../images/unit.png");
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            loadAllImages();
            element.appendArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(layer);
            element.deleteArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([]);
    });

    it("Checks artifact setSettings feature out of transaction", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image = DImage.getImage("../images/unit1.png");
            loadAllImages()
            var artifact = new DImageArtifact("units", image, new Point2D(-10, -15), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setOnBoard(board);
            Memento.activate();
            Memento.open();
        when:
            artifact.setSettings(level=>{
                level.setShadowSettings("#000000", 15);
            });
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // setSettings method is not bounded to transaction mechanism
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([]);
        when:
            Memento.open();
            artifact.setSettings();
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // setSettings method is not bounded to transaction mechanism
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([]);
    });

    it("Checks artifact changeSettings feature in transaction", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image = DImage.getImage("../images/unit1.png");
            loadAllImages()
            var artifact = new DImageArtifact("units", image, new Point2D(-10, -15), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setOnBoard(board);
            Memento.activate();
            Memento.open();
        when:
            artifact.changeSettings(level=>{
                level.setShadowSettings("#000000", 15);
            });
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            Memento.open();
            artifact.changeSettings();
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // changeSettings method is  bounded to transaction mechanism
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // changeSettings method is bounded to transaction mechanism
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 240, 135)",
                    "drawImage(../images/unit1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks element hiding in transaction", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(layer);
            element.hide(board);
            board.paint();
        then:
            assert(element.board).isNotDefined();
            assert(getDirectives(layer).length).equalsTo(4);
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(element.board).equalsTo(board);
            assertLayerIsCleared(0, layer)
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ] );
    });

    it("Checks element moves in transaction", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(layer);
            element.move(new Point2D(150, 100));
            board.paint();
        then:
            assert(element.location.toString()).equalsTo("point(150, 100)");
            assert(getDirectives(layer).length).equalsTo(8);
            assertLayerIsCleared(0, layer)
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 400, 250)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(element.location.toString()).equalsTo("point(100, 50)");
            assert(getDirectives(layer).length).equalsTo(8);
            assertLayerIsCleared(0, layer)
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 350, 200)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks element rotation in transaction", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setAngle(90);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(layer);
            element.rotate(180);
            board.paint();
        then:
            assert(element.angle).equalsTo(180);
            assert(getDirectives(layer).length).equalsTo(8);
            assertLayerIsCleared(0, layer)
            assert(getDirectives(layer)[4]).equalsTo("save()");
            assert(getDirectives(layer)[5]).equalsTo("setTransform(-1, 0, 0, -1, 250, 150)");
            assert(getDirectives(layer)[6]).equalsTo("drawImage(../images/unit.png, -25, -25, 50, 50)");
            assert(getDirectives(layer)[7]).equalsTo("restore()");
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(element.angle).equalsTo(90);
            assert(getDirectives(layer).length).equalsTo(8);
            assertLayerIsCleared(0, layer)
            assert(getDirectives(layer)[4]).equalsTo("save()");
            assert(getDirectives(layer)[5]).equalsTo("setTransform(0, 1, -1, 0, 250, 150)");
            assert(getDirectives(layer)[6]).equalsTo("drawImage(../images/unit.png, -25, -25, 50, 50)");
            assert(getDirectives(layer)[7]).equalsTo("restore()");
    });

    it("Checks layer viewport/local localization", () => {
        given:
            var { board, unitsLevel:level } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        then:
            assert(level.getPoint(new Point2D(0, 0)).toString()).equalsTo("point(-500, -300)");
            assert(level.getViewportPoint(new Point2D(-500, -300)).toString()).equalsTo("point(0, 0)");
            assert(level.getPoint(new Point2D(250, 150)).toString()).equalsTo("point(0, 0)");
            assert(level.getViewportPoint(new Point2D(0, 0)).toString()).equalsTo("point(250, 150)");
            assert(level.getOriginalPoint().toString()).equalsTo("point(-500, -300)");
            assert(level.getFinalPoint().toString()).equalsTo("point(500, 300)");
    });

    it("Checks images artifact", () => {
        given:
            var {board, unitsLevel: level, unitsLayer: layer} = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image1 = DImage.getImage("../images/unit.png");
            loadAllImages();
            var artifact1 = new DImageArtifact("units", image1,
                new Point2D(25, 25), new Dimension2D(60, 60)
            );
            var artifact2 = new DImageArtifact("units", image1,
                new Point2D(0, 0), new Dimension2D(50, 60),
                new Point2D(0, 0), new Dimension2D(100, 120),
            );
            var element = new DElement(artifact1, artifact2);
            resetDirectives(layer);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 275, 175)",
                    "drawImage(../images/unit.png, -30, -30, 60, 60)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, 0, 0, 100, 120, -25, -30, 50, 60)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            artifact2.sourcePosition = new Point2D(40, 50);
            artifact2.sourceDimension = new Dimension2D(80, 90);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 275, 175)",
                    "drawImage(../images/unit.png, -30, -30, 60, 60)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, 40, 50, 80, 90, -25, -30, 50, 60)",
                "restore()"
            ]);
    });

    it("Checks multi images artifact", () => {
        given:
            var {board, unitsLevel: level, unitsLayer: layer} = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image1 = DImage.getImage("../images/unit.png");
            var image2 = DImage.getImage("../images/unit-back.png");
            var image3 = DImage.getImage("../images/unit-inactive.png");
            loadAllImages();
            var artifact = new DMultiImagesArtifact("units", [image1, image2, image3],
                new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            resetDirectives(layer);
            element.setOnBoard(board);
            Memento.activate();
            Memento.open();
            board.paint();
        then:
            assert(artifact.images).arrayEqualsTo([image1, image2, image3]);
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(artifact.imageIndex).equalsTo(0);
        when:
            resetDirectives(layer);
            artifact.setImage(1);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit-back.png, -25, -25, 50, 50)",
                "restore()"
            ]);
            assert(artifact.imageIndex).equalsTo(1);
        when:
            resetDirectives(layer);
            artifact.changeImage(2);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit-inactive.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit-back.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks composed image artifact (using not undoable APIs)", () => {
        given:
            var {board, unitsLevel: level, unitsLayer: layer} = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var image1 = DImage.getImage("../images/insert1.png");
            var image2 = DImage.getImage("../images/insert2.png");
            loadAllImages();
            var artifact = new DComposedImageArtifact("units", new Point2D(0, 0), new Dimension2D(50, 60));
            artifact.addComposition(image1, new Area2D(0, 0, 20, 60), new Area2D(0, 0, 20, 40));
            artifact.addComposition(image2, new Area2D(20, 0, 50, 60), new Area2D(10, 20, 30, 80));
            var element = new DElement(artifact);
            resetDirectives(layer);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert2.png, 10, 20, 20, 60, -5, -30, 30, 60)",
                "restore()"
            ]);
            assert(artifact.getImage(0)).equalsTo(image1);
            assert(artifact.getComposition(1)).objectEqualsTo({
                image: image2,
                sourceArea: {left: 10, right: 30, top: 20, bottom: 80},
                destArea: {left: 20, right: 50, top: 0, bottom: 60}
            });
        when:
            resetDirectives(layer);
            artifact.setComposition(1, image1, new Area2D(20, 0, 40, 60), new Area2D(20, 30, 40, 90));
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert1.png, 20, 30, 20, 60, -5, -30, 20, 60)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            artifact.removeComposition(1);
            board.paint();
        then:
            assert(artifact.getComposition(1)).isNotDefined();
    });

    it("Checks composed image artifact (using undoable APIs)", () => {
        given:
            var {board, unitsLevel: level, unitsLayer: layer} = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var image1 = DImage.getImage("../images/insert1.png");
            var image2 = DImage.getImage("../images/insert2.png");
            loadAllImages();
            var artifact = new DComposedImageArtifact("units", new Point2D(0, 0), new Dimension2D(50, 60));
            var element = new DElement(artifact);
            element.setOnBoard(board);
        when:
            Memento.activate();
            Memento.open();
            artifact.appendComposition(image1, new Area2D(0, 0, 20, 60), new Area2D(0, 0, 20, 40));
            artifact.appendComposition(image2, new Area2D(20, 0, 50, 60), new Area2D(10, 20, 30, 80));
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert2.png, 10, 20, 20, 60, -5, -30, 30, 60)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(layer);
            artifact.changeComposition(1, image1, new Area2D(20, 0, 40, 60), new Area2D(20, 30, 40, 90));
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert1.png, 20, 30, 20, 60, -5, -30, 20, 60)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(layer);
            artifact.deleteComposition(1);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert1.png, 20, 30, 20, 60, -5, -30, 20, 60)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/insert1.png, 0, 0, 20, 40, -25, -30, 20, 60)",
                    "drawImage(../images/insert2.png, 10, 20, 20, 60, -5, -30, 30, 60)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                "restore()"
            ]);
    });

    it("Checks rectangle artifact", () => {
        given:
            var { board, markersLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var artifact = new DRectArtifact("markers",
                new Point2D(10, 15), new Dimension2D(50, 50),
                "#FF0000", "#00FF00", "#0000FF", 5);
            var element = new DElement(artifact);
            resetDirectives(layer);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.9962, 0.0872, -0.0872, 0.9962, 260, 165)",
                    "fillStyle = #0000FF",
                    "fillRect(-25, -25, 50, 50)",
                    "strokeStyle = #00FF00", "lineWidth = #FF0000",
                    "strokeRect(-25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks text artifact", () => {
        given:
            var { board, markersLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        when:
            var artifact = new DTextArtifact("markers", new Point2D(10, 15), new Dimension2D(50, 50),
                "#FF0000", "#00FF00", 3, "#0000FF", 5,
                "18px serif", "start", "middle", "text");
            var element = new DElement(artifact);
            resetDirectives(layer);
            element.setOnBoard(board);
            Memento.activate();
            Memento.open();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 260, 165)",
                    "font = 18px serif", "textAlign = start", "textBaseline = middle",
                    "shadowColor = #0000FF", "shadowBlur = 5",
                    "strokeStyle = #FF0000", "lineWidth = 3",
                    "strokeText(text, 0, 0)",
                    "fillStyle = #00FF00",
                    "fillText(text, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            artifact.setText("TEXT");
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 260, 165)",
                    "font = 18px serif", "textAlign = start", "textBaseline = middle",
                    "shadowColor = #0000FF", "shadowBlur = 5",
                    "strokeStyle = #FF0000", "lineWidth = 3",
                    "strokeText(TEXT, 0, 0)",
                    "fillStyle = #00FF00",
                    "fillText(TEXT, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 260, 165)",
                    "font = 18px serif", "textAlign = start", "textBaseline = middle",
                    "shadowColor = #0000FF", "shadowBlur = 5",
                    "strokeStyle = #FF0000", "lineWidth = 3",
                    "strokeText(text, 0, 0)",
                    "fillStyle = #00FF00",
                    "fillText(text, 0, 0)",
                "restore()"
            ]);
    });

    it("Checks zooming", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.paint();
        then:
            assert(board.minZoomFactor).equalsTo(0.5);
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 250, 150)");
        when:
            resetDirectives(layer);
            board.zoomOut(new Point2D(250, 150));
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(0.75);
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            board.zoomOut(new Point2D(260, 160));
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(1.125);
            assert(getDirectives(layer)).arrayContains("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            board.zoomIn(new Point2D(255, 155));
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(0.75);
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 248.3333, 148.3333)");
            assertLayerIsCleared(0, layer)
    });

    it("Checks scrolling", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.paint();
        when:
            resetDirectives(layer);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
        when:
            resetDirectives(layer);
            board.scrollOnLeft();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 260, 150)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            board.scrollOnRight();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            board.scrollOnTop();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 160)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            board.scrollOnBottom();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
    });

    it("Checks zoom settings", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        when:
            board.setZoomSettings(2, 12);
            board.zoomOut(new Point2D(250, 150));
        then:
            assert(board.zoomFactor).equalsTo(1);
        when:
            board.zoomOut(new Point2D(250, 150));
        then:
            assert(board.zoomFactor).equalsTo(2);
        when:
            board.zoomOut(new Point2D(250, 150)); // ZoomFactor = 4
            board.zoomOut(new Point2D(250, 150)); // ZoomFactor = 8
            board.zoomOut(new Point2D(250, 150)); // ZoomFactor = 16>12 => 12
        then:
            assert(board.zoomFactor).equalsTo(12);
    });

    it("Checks recenter", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.paint();
        when:
            resetDirectives(layer);
            board.recenter(new Point2D(260, 170));
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 240, 130)");
            assertLayerIsCleared(0, layer)
    });

    it("Checks adjustement", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            board.setZoomSettings(2, 8);
            board.paint();
        when:
            assert(board.zoomFactor).equalsTo(0.5);
            board.zoom(new Point2D(250, 150), 0.2); // Try to zoom in above limits
        then:
            assert(board.zoomFactor).equalsTo(0.5);
        when:
            board.zoom(new Point2D(250, 150), 12);
        then:
            assert(board.zoomFactor).equalsTo(8);
        when:
            board.zoom(new Point2D(250, 150), 1);
            board.center(new Point2D(-499, -299)); // Try to center next left/top border
        then:
            assert(board.location.x).equalsTo(-250);
            assert(board.location.y).equalsTo(-150);
        when:
            board.center(new Point2D(499, 299)); // Try to center next right/bottom border
        then:
            assert(board.location.x).equalsTo(250);
            assert(board.location.y).equalsTo(150);
    });

    it("Checks border detection", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
        when:
            assert(board.isOnLeftBorder(new Point2D(9, 150))).isTrue();
            assert(board.isOnLeftBorder(new Point2D(11, 150))).isFalse();
            assert(board.isOnRightBorder(new Point2D(491, 150))).isTrue();
            assert(board.isOnRightBorder(new Point2D(489, 150))).isFalse();
            assert(board.isOnTopBorder(new Point2D(150, 9))).isTrue();
            assert(board.isOnTopBorder(new Point2D(150, 11))).isFalse();
            assert(board.isOnBottomBorder(new Point2D(150, 29150))).isTrue();
            assert(board.isOnBottomBorder(new Point2D(150, 289))).isFalse();
    });

    it("Checks scroll settings", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
        when:
            resetDirectives(layer);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
        when:
            resetDirectives(layer);
            board.setScrollSettings(25, 20);
            board.scrollOnLeft();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 275, 150)");
            assertLayerIsCleared(0, layer)
            assert(board.isOnLeftBorder(new Point2D(19, 150))).isTrue();
            assert(board.isOnLeftBorder(new Point2D(21, 150))).isFalse();
    });

    it("Checks onMouseClick reflex", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            board.onMouseClick(event=> {
                element.setLocation(new Point2D(event.offsetX, event.offsetY));
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN_EVENT) mementoOpened = true;
                }
            });
        when:
            resetDirectives(layer);
            var event = createEvent("click", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks onMouseClick memento aware reflex ", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            board.onMouseClick(event=> {
                element.move(new Point2D(event.offsetX, event.offsetY));
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN_EVENT) mementoOpened = true;
                }
            });
        when:
            var event = createEvent("click", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isTrue();
    });

    it("Checks onMouseClick artifact reflex", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var mouseClicked = false;
            artifact.onMouseClick = event=> {
                mouseClicked = true;
                return true;
            };
            element.setOnBoard(board);
        when: // clicks outside the artifact
            var event = createEvent("click", {offsetX:50, offsetY:50});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mouseClicked).isFalse();
        when: // clicks inside the artifact
            event = createEvent("click", {offsetX:250, offsetY:150});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mouseClicked).isTrue();
    });

    it("Checks onMouseMove artifact reflex", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var mouseMoved = false;
            artifact.onMouseMove = event=> {
                mouseMoved = true;
                return true;
            };
            element.setOnBoard(board);
        when: // clicks outside the artifact
            var event = createEvent("mousemove", {offsetX:50, offsetY:50});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(mouseMoved).isFalse();
        when: // clicks inside the artifact
            var event = createEvent("mousemove", {offsetX:250, offsetY:150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(mouseMoved).isTrue();
    });

    it("Checks onMouseEnter/onMouseLeave artifact reflexes", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact1 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            let artifact2 = new DImageArtifact("units", image, new Point2D(20, 20), new Dimension2D(50, 50));
            var element = new DElement(artifact1, artifact2);
            var onArtifact1 = false;
            artifact1.onMouseEnter = event=> onArtifact1 = true;
            artifact1.onMouseLeave = event=> onArtifact1 = false
            var onArtifact2 = false;
            artifact2.onMouseEnter = event=> onArtifact2 = true;
            artifact2.onMouseLeave = event=> onArtifact2 = false
            element.setOnBoard(board);
        when: // move mouse outside the two artifacts
            var event = createEvent("mousemove", {offsetX:50, offsetY:50});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(onArtifact1).isFalse();
            assert(onArtifact2).isFalse();
        when: // move over artifact one only
            event = createEvent("mousemove", {offsetX:240, offsetY:140});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(onArtifact1).isTrue();
            assert(onArtifact2).isFalse();
        when: // move over both artifacts
            event = createEvent("mousemove", {offsetX:260, offsetY:160});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(onArtifact1).isFalse();
            assert(onArtifact2).isTrue();
        when: // exit artifact 1
            event = createEvent("mousemove", {offsetX:270, offsetY:170});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(onArtifact1).isFalse();
            assert(onArtifact2).isTrue();
        when: // exit artifact 2
            event = createEvent("mousemove", {offsetX:290, offsetY:190});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(onArtifact1).isFalse();
            assert(onArtifact2).isFalse();
    });

    it("Checks keyDown reflex", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            board.onKeyDown(event=> {
                element.setLocation(new Point2D(event.offsetX, event.offsetY));
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN_EVENT) mementoOpened = true;
                }
            });
        when:
            var event = createEvent("keydown", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks keyDown memento aware reflex", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            board.onKeyDown(event=> {
                element.move(new Point2D(event.offsetX, event.offsetY));
            });
            element.setOnBoard(board);
            Memento.activate();
            var mementoOpened = false;
            Mechanisms.addListener({
                _processGlobalEvent:(source, event, value) => {
                    if (event === Memento.OPEN_EVENT) mementoOpened = true;
                }
            });
        when:
            var event = createEvent("keydown", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(mementoOpened).isTrue();
    });

    it("Checks zoomInOut/onMouseWheel reflex", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.zoomInOutOnMouseWheel();
        when:
            resetDirectives(layer);
            let event = createEvent("wheel", {
                offsetX: 260, offsetY: 170, deltaX: 0, deltaY: -125, deltaZ: 0
            });
            mockPlatform.dispatchEvent(board.root, "wheel", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 245, 140)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            event = createEvent("wheel", {
                offsetX: 260, offsetY: 170, deltaX: 0, deltaY: 125, deltaZ: 0
            });
            mockPlatform.dispatchEvent(board.root, "wheel", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 250, 150)");
            assertLayerIsCleared(0, layer)
    });

    it("Checks scrollOnBorders/onMouseMove reflex", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.scrollOnBordersOnMouseMove();
        when:
            resetDirectives(layer);
            let event = createEvent("mousemove", {offsetX: 5, offsetY: 5});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 260, 160)");
            assertLayerIsCleared(0, layer)
        when:
            resetDirectives(layer);
            event = createEvent("mousemove", {offsetX: 495, offsetY: 295});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
    });

    it("Checks scroll/onKeydown reflex", () => {
        given:
            var { board, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.scrollOnKeyDown();
            let nothingDone = false;
            board.onKeyDown(event=>{
               nothingDone = true;
            });
        when:
            resetDirectives(layer);
            let event = createEvent("keydown", {key: 'ArrowLeft'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 260, 150)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'ArrowUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 260, 160)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'ArrowRight'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 160)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'ArrowDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks zoom/onKeydown reflex", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setOnBoard(board);
            board.zoomOnKeyDown();
            let nothingDone = false;
            board.onKeyDown(event=>{
                nothingDone = true;
            });
        when: // Zoom out
            resetDirectives(layer);
            let event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when: // Change focus point
            resetDirectives(layer);
            event = createEvent("click", {offsetX: 260, offsetY: 160});
            mockPlatform.dispatchEvent(board.root, "click", event);
            event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when: // Zoom in
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'PageUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLayerIsCleared(0, layer)
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks undoRedo/onKeyDown reflex", () => {
        given:
            var { board, unitsLevel:level, unitsLayer:layer } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            board.onMouseClick(event=> {
                let point = board.getBoardPoint(new Point2D(event.offsetX, event.offsetY));
                element.move(point);
                return true; // To open a new transaction
            });
            board.undoRedoOnKeyDown();
            let nothingDone = false;
            board.onKeyDown(event=>{
                nothingDone = true;
            });
            element.setLocation(new Point2D(100, 50));
            element.setOnBoard(board);
            Memento.activate();
            resetDirectives(layer); // Move image one time
            var event = createEvent("click", {offsetX: 260, offsetY: 170});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 260, 170)");
            resetDirectives(layer); // Move image a second time in another transaction
            event = createEvent("click", {offsetX: 240, offsetY: 130});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 240, 130)");
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'z', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 260, 170)");
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'y', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(layer)).arrayContains("setTransform(0.5, 0, 0, 0.5, 240, 130)");
            assert(nothingDone).isFalse();
        when:
            resetDirectives(layer);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks onMouseClick artifact reflex", () => {
        given:
            var { board } = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var isFocus = false;
            var keyboardReceived = false;
            artifact.onMouseClick = event=> {
                isFocus = true;
                return true;
            };
            artifact.onKeyDown = event=> {
                keyboardReceived = true;
                return true;
            };
            element.setOnBoard(board);
        when: // No focus : event is lost
            var event = createEvent("keydown", {});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(isFocus).isFalse();
            assert(keyboardReceived).isFalse();
        when: // make artifact the focus
            var event = createEvent("click", {offsetX:250, offsetY:150});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(isFocus).isTrue();
        when: // No focus : event is processed
            var event = createEvent("keydown", {});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(keyboardReceived).isTrue();
    });

    it("Checks artifact rotate animation", () => {
        given:
            var { layer, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(layer);
            new DArtifactRotateAnimation(artifact, 180, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.7071, 0.7071, -0.7071, 0.7071, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 1, -1, 0, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.7071, 0.7071, -0.7071, -0.7071, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-1, 0, 0, -1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks artifact alpha animation", () => {
        given:
            var { layer, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(layer);
            new DArtifactAlphaAnimation(artifact, 0, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "globalAlpha = 0.75",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "globalAlpha = 0.5",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "globalAlpha = 0.25",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks artifact animation overriding", () => {
        given:
            var { layer, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(layer);
            new DArtifactRotateAnimation(artifact, 180, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.7071, 0.7071, -0.7071, 0.7071, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            new DArtifactRotateAnimation(artifact, 180, 0, 80); // Overriding !
            executeTimeouts();
        then: // first animation skipped
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-1, 0, 0, -1, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            executeTimeouts();
        then: // second animation started
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.7071, -0.7071, 0.7071, -0.7071, 250, 150)",
                    "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

});
