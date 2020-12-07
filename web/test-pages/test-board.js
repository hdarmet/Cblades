'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D
} from "../jslib/geometry.js";
import {
    DAnimator,
    DImage, DLayer, setDrawPlatform
} from "../jslib/draw.js";
import {
    Mechanisms, Memento
} from "../jslib/mechanisms.js";
import {
    DArtifactAlphaAnimation,
    DArtifactRotateAnimation,
    DBoard, DElement, DImageArtifact, DMultiImageArtifact
} from "../jslib/board.js";
import {
    mockPlatform, getDirectives, resetDirectives, createEvent, loadAllImages
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
            var board = new DBoard(new Dimension2D(500, 300), new Dimension2D(500, 300), "map", "units", "markers");
        then:
            assert(board.root.tagName).equalsTo('div');
            assert(board.root.style).equalsTo("width: 500px; height:300px; border: 1px solid; position: relative");
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

    function createBoardWithMapUnitsAndMarkersLevels(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight), "map", "units", "markers");
    }

    function assertLevelIsCleared(index, level) {
        /* clears level */
        assert(getDirectives(level)[index]).equalsTo("save()");
        assert(getDirectives(level)[index + 1]).equalsTo("resetTransform()");
        assert(getDirectives(level)[index + 2]).equalsTo("clearRect(0, 0, 500, 300)");
        assert(getDirectives(level)[index + 3]).equalsTo("restore()");
    }

    it("Checks level drawing primitives", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
        when:
            resetDirectives(level);
            level.drawImage(image, new Point2D(10, 20), new Dimension2D(50, 60));
            level.setStrokeSettings("#000000", 2);
            level.drawRect(new Point2D(10, 20), new Dimension2D(50, 60));
            level.setFillSettings("#FFFFFF");
            level.setShadowSettings("#0F0F0F", 15);
            level.setAlphaSettings(0.3);
            level.fillRect(new Point2D(10, 20), new Dimension2D(50, 60));
        then:
            assert(getDirectives(level)[0]).equalsTo("drawImage(../images/unit.png, 10, 20, 50, 60)");
            assert(getDirectives(level)[1]).equalsTo("strokeStyle = #000000");
            assert(getDirectives(level)[2]).equalsTo("lineWidth = 2");
            assert(getDirectives(level)[3]).equalsTo("strokeRect(10, 20, 50, 60)");
            assert(getDirectives(level)[4]).equalsTo("fillStyle = #FFFFFF");
            assert(getDirectives(level)[5]).equalsTo("shadowColor = #0F0F0F");
            assert(getDirectives(level)[6]).equalsTo("shadowBlur = 15");
            assert(getDirectives(level)[7]).equalsTo("globalAlpha = 0.3");
            assert(getDirectives(level)[8]).equalsTo("fillRect(10, 20, 50, 60)");
    });

    it("Checks element creation/displaying/removing", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            element.setLocation(new Point2D(100, 50));
            resetDirectives(level);
            element.setOnBoard(board);
        then: /* No paint here... */
            assert(artifact.board).equalsTo(board);
            assert(element.board).equalsTo(board);
            assert(getDirectives(level).length).equalsTo(0);
        when:
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level)
            /* draws content */
            assert(getDirectives(level)[4]).equalsTo("save()");
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
            assert(getDirectives(level)[6]).equalsTo("restore()");
        when:
            resetDirectives(level);
            element.setLocation(new Point2D(110, 70));
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 85, 45, 50, 50)");
        when:
            resetDirectives(level);
            element.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[3]).equalsTo("restore()");
    });

    it("Checks element refresh feature", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var image1 = DImage.getImage("../images/unit1.png");
            image1._root.onload();
            var image2 = DImage.getImage("../images/unit2.png");
            image2._root.onload();
            var artifact1 = new DImageArtifact("units", image1, new Point2D(-10, -15), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image2, new Point2D(10, 15), new Dimension2D(50, 50), 45);
            var element = new DElement(artifact1, artifact2);
            element.setOnBoard(board);
            board.paint();
            resetDirectives(level);
        when:
            board.paint(); // nothing to paint, everything is fine
        then:
            assert(getDirectives(level).length).equalsTo(0);
        when: // force repainting
            element.refresh();
            board.paint();
        then:
            assert(getDirectives(level).length).equalsTo(11);
            assert(getDirectives(level)).arrayContains("../images/unit1.png");
            assert(getDirectives(level)).arrayContains("../images/unit2.png");
        when:
            resetDirectives(level);
            board.paint(); // nothing to paint again, everything is fine
        then:
            assert(getDirectives(level).length).equalsTo(0);
        when:
            resetDirectives(level);
            board.repaint(); // force repainting
        then:
            assert(getDirectives(level).length).equalsTo(11);
            assert(getDirectives(level)).arrayContains("../images/unit1.png");
            assert(getDirectives(level)).arrayContains("../images/unit2.png");
    });

    it("Checks default element settings", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        when:
            var image = DImage.getImage("../images/unit.png");
            image._root.onload();
            var artifact1 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50), 60);
            var artifact3 = new DImageArtifact("units", image, new Point2D(10, 15), new Dimension2D(50, 50));
            var element = new DElement(artifact1, artifact2);
            element.addArtifact(artifact3);
            element.setOnBoard(board);
            board.paint();
        then:
            assert(element.angle).equalsTo(0);
            assert(element.location.x).equalsTo(0);
            assert(element.location.y).equalsTo(0);
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

    function createBoardWithOneCounter() {
        var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
        var level = board.getLevel("units");
        var image = DImage.getImage("../images/unit.png");
        image._root.onload();
        var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
        var element = new DElement(artifact);
        element.setOnBoard(board);
        resetDirectives(level);
        board.paint();
        assert(getDirectives(level, 4)).arrayEqualsTo([
            "save()",
            "drawImage(../images/unit.png, -25, -25, 50, 50)",
            "restore()"
        ]);
        return { board, level, element, artifact, image };
    }

    it("Checks change artifact position and relative orientation", () => {
        given:
            var {board, artifact, level, image} = createBoardWithOneCounter();
        when: // Change position
            resetDirectives(level);
            artifact.position = new Point2D(-10, -15);
            board.paint();
        then:
            assert(artifact.position.toString()).equalsTo("point(-10, -15)");
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when: // Change orientation
            resetDirectives(level);
            artifact.pangle = 60;
            board.paint();
        then:
            assert(artifact.pangle).equalsTo(60);
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.5, 0.866, -0.866, 0.5, 232.0096, 151.1603)",
                "drawImage(../images/unit.png, -35, -40, 50, 50)",
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

    it("Checks change artifact alpha", () => {
        given:
            var {board, artifact, level, image} = createBoardWithOneCounter();
        when: // Change position
            resetDirectives(level);
            artifact.alpha = 0.3;
            board.paint();
        then:
            assert(artifact.alpha).equalsTo(0.3);
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
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
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image1 = DImage.getImage("../images/unit1.png");
            image1._root.onload();
            var image2 = DImage.getImage("../images/unit2.png");
            image2._root.onload();
            var artifact1 = new DImageArtifact("units", image1, new Point2D(-10, -15), new Dimension2D(50, 50));
            var artifact2 = new DImageArtifact("units", image2, new Point2D(10, 15), new Dimension2D(50, 50), 45);
            var element = new DElement(artifact1, artifact2);
            element.setLocation(new Point2D(100, 50));
            element.setAngle(90);
            resetDirectives(level);
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

    it("Checks search for artifacts from a viewport point", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var mapLevel = board.getLevel("map");
            var level = board.getLevel("units");
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
            assert(level.getAllArtifactsOnPoint(new Point2D(290, 200))).arrayEqualsTo([artifact3, artifact2]);
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
        return new DElement(artifact);
    }

    it("Checks that if element is not in visible area, no drawing order is issued", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            board.zoom(new Point2D(250, 150),1);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
        when:
            resetDirectives(level);
            element.setOnBoard(board);  // VisibleArtifacts not defined here
            board.paint();              // Created starting form here
        then:
            assert(getDirectives(level)).arrayContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.setLocation(new Point2D(-400, 50));
            board.paint();
        then:
            assert(getDirectives(level)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.setLocation(new Point2D(100, 50));
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
            element.setLocation(new Point2D(-400, 50));
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(level)).arrayNotContains("/images/unit.png");
        when:
            resetDirectives(level);
            element.removeFromBoard(board);
            element.setLocation(new Point2D(100, 50));   // VisibleArtifacts defined here
            element.setOnBoard(board);
            board.paint();
        then:
            assert(getDirectives(level)).arrayContains("/images/unit.png");
    });

    it("Checks element showing in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
        when:
            resetDirectives(level);
            element.show(board);
            board.paint();
        then:
            assert(element.board).equalsTo(board);
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(element.board).isNotDefined();
            assert(getDirectives(level).length).equalsTo(4);
            assertLevelIsCleared(0, level);
    });

    it("Checks dynamic adding/removing artifacts on element out of transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = new DElement();
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
            element.setOnBoard(board);
            board.paint();
            Memento.open();
            resetDirectives(level);
        when:
            var image = DImage.getImage("../images/unit.png");
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            loadAllImages();
            element.addArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, 75, 25, 50, 50)",
                "restore()"
            ]);
        when: // add/remove artifacts methods are not bounded to transaction mechanism
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(level);
            element.removeArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level)).arrayEqualsTo([
            ]);
    });

    it("Checks dynamic adding/removing artifacts on element in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = new DElement();
            element.setLocation(new Point2D(100, 50));
            Memento.activate();
            element.show(board);
            board.paint();
            Memento.open();
            resetDirectives(level);
        when:
            var image = DImage.getImage("../images/unit.png");
            var artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            loadAllImages();
            element.appendArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, 75, 25, 50, 50)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(level);
            element.deleteArtifact(artifact);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, 75, 25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks artifact setSettings feature out of transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when: // setSettings method is not bounded to transaction mechanism
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            artifact.setSettings();
            resetDirectives(level);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when: // setSettings method is not bounded to transaction mechanism
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level)).arrayEqualsTo([
            ]);
    });

    it("Checks artifact changeSettings feature in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when:
            Memento.open();
            artifact.changeSettings();
            resetDirectives(level);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when: // changeSettings method is  bounded to transaction mechanism
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
        when: // changeSettings method is bounded to transaction mechanism
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit1.png, -35, -40, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks element hiding in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
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
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
    });

    it("Checks element moves in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setLocation(new Point2D(100, 50));
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.move(new Point2D(150, 100));
            board.paint();
        then:
            assert(element.location.toString()).equalsTo("point(150, 100)");
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 125, 75, 50, 50)");
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(element.location.toString()).equalsTo("point(100, 50)");
            assert(getDirectives(level).length).equalsTo(7);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, 75, 25, 50, 50)");
    });

    it("Checks element rotation in transaction", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
            var element = createImageElement("../images/unit.png", new Point2D(0, 0));
            element.setAngle(90);
            element.setOnBoard(board);
            Memento.activate();
        when:
            resetDirectives(level);
            element.rotate(180);
            board.paint();
        then:
            assert(element.angle).equalsTo(180);
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
            assert(element.angle).equalsTo(90);
            assert(getDirectives(level).length).equalsTo(8);
            assertLevelIsCleared(0, level);
            assert(getDirectives(level)[4]).equalsTo("save()");
            assert(getDirectives(level)[5]).equalsTo("setTransform(0, 1, -1, 0, 250, 150)");
            assert(getDirectives(level)[6]).equalsTo("drawImage(../images/unit.png, -25, -25, 50, 50)");
            assert(getDirectives(level)[7]).equalsTo("restore()");
    });

    it("Checks layer viewport/local localization", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        then:
            assert(level.getPoint(new Point2D(0, 0)).toString()).equalsTo("point(-500, -300)");
            assert(level.getViewportPoint(new Point2D(-500, -300)).toString()).equalsTo("point(0, 0)");
            assert(level.getPoint(new Point2D(250, 150)).toString()).equalsTo("point(0, 0)");
            assert(level.getViewportPoint(new Point2D(0, 0)).toString()).equalsTo("point(250, 150)");
            assert(level.originalPoint.toString()).equalsTo("point(-500, -300)");
            assert(level.finalPoint.toString()).equalsTo("point(500, 300)");
    });

    it("Checks multi images artifact", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(500, 300, 500, 300);
            var level = board.getLevel("units");
        when:
            var image1 = DImage.getImage("../images/unit.png");
            var image2 = DImage.getImage("../images/unit-back.png");
            var image3 = DImage.getImage("../images/unit-inactive.png");
            loadAllImages();
            var artifact = new DMultiImageArtifact("units", [image1, image2, image3],
                new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            resetDirectives(level);
            element.setOnBoard(board);
            Memento.activate();
            Memento.open();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            artifact.setImage(1);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit-back.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            artifact.changeImage(2);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit-inactive.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit-back.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            board.zoomOut(new Point2D(250, 150));
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(0.75);
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.zoomOut(new Point2D(260, 160));
            board.paint();
        then:
            assert(board.zoomFactor).equalsTo(1.125);
            assert(getDirectives(level)[0]).equalsTo("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLevelIsCleared(1, level);
        when:
            resetDirectives(level);
            board.zoomIn(new Point2D(255, 155));
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
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
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
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.paint();
        when:
            resetDirectives(level);
            board.recenter(new Point2D(260, 170));
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
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
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
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
        when:
            resetDirectives(level);
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
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
            assert(board.isOnLeftBorder(new Point2D(19, 150))).isTrue();
            assert(board.isOnLeftBorder(new Point2D(21, 150))).isFalse();
    });

    it("Checks onMouseClick reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            var event = createEvent("click", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks onMouseClick memento aware reflex ", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            var event = createEvent("click", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mementoOpened).isTrue();
    });

    it("Checks onMouseClick artifact reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var mouseClicked = false;
            artifact.onMouseClick = event=> {
                mouseClicked = true;
            };
            element.setOnBoard(board);
        when: // clicks outside the artifact
            resetDirectives(level);
            var event = createEvent("click", {offsetX:50, offsetY:50});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mouseClicked).isFalse();
        when: // clicks inside the artifact
            resetDirectives(level);
            var event = createEvent("click", {offsetX:250, offsetY:150});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(mouseClicked).isTrue();
    });

    it("Checks onMouseMove artifact reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var mouseMoved = false;
            artifact.onMouseMove = event=> {
                mouseMoved = true;
            };
            element.setOnBoard(board);
        when: // clicks outside the artifact
            resetDirectives(level);
            var event = createEvent("mousemove", {offsetX:50, offsetY:50});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(mouseMoved).isFalse();
        when: // clicks inside the artifact
            resetDirectives(level);
            var event = createEvent("mousemove", {offsetX:250, offsetY:150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(mouseMoved).isTrue();
    });

    it("Checks onMouseEnter/onMouseLeave artifact reflexes", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            assert(onArtifact1).isTrue();
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
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            var event = createEvent("keydown", {offsetX:10, offsetY:10});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(mementoOpened).isFalse();
    });

    it("Checks keyDown memento aware reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level);
            var event = createEvent("keydown", {offsetX:10, offsetY:10});
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
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
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
            board.zoomOut(new Point2D(250, 150)); // Mandatory to have space to move
            board.scrollOnKeyDown();
            let nothingDone = false;
            board.onKeyDown(event=>{
               nothingDone = true;
            });
        when:
            resetDirectives(level);
            let event = createEvent("keydown", {key: 'ArrowLeft'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 150)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 260, 160)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowRight'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 160)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'ArrowDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks zoom/onKeydown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            board.zoomOnKeyDown();
            let nothingDone = false;
            board.onKeyDown(event=>{
                nothingDone = true;
            });
        when: // Zoom out
            resetDirectives(level);
            let event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when: // Change focus point
            resetDirectives(level);
            event = createEvent("click", {offsetX: 260, offsetY: 160});
            mockPlatform.dispatchEvent(board.root, "click", event);
            event = createEvent("keydown", {key: 'PageDown'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(1.125, 0, 0, 1.125, 245, 145)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when: // Zoom in
            resetDirectives(level);
            event = createEvent("keydown", {key: 'PageUp'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[0]).equalsTo("setTransform(0.75, 0, 0, 0.75, 250, 150)");
            assertLevelIsCleared(1, level);
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks undoRedo/onKeyDown reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
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
            resetDirectives(level); // Move image one time
            var event = createEvent("click", {offsetX: 260, offsetY: 170});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, -5, 15, 50, 50)");
            resetDirectives(level); // Move image a second time in another transaction
            event = createEvent("click", {offsetX: 240, offsetY: 130});
            mockPlatform.dispatchEvent(board.root, "click", event);
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, -45, -65, 50, 50)");
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'z', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, -5, 15, 50, 50)");
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'y', ctrlKey:true});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(getDirectives(level)[5]).equalsTo("drawImage(../images/unit.png, -45, -65, 50, 50)");
            assert(nothingDone).isFalse();
        when:
            resetDirectives(level);
            event = createEvent("keydown", {key: 'A'});
            mockPlatform.dispatchEvent(board.root, "keydown", event);
        then:
            assert(nothingDone).isTrue();
    });

    it("Checks onMouseClick artifact reflex", () => {
        given:
            var board = createBoardWithMapUnitsAndMarkersLevels(1000, 600, 500, 300);
            var level = board.getLevel("units");
            let image = DImage.getImage("../images/unit.png");
            image._root.onload();
            let artifact = new DImageArtifact("units", image, new Point2D(0, 0), new Dimension2D(50, 50));
            var element = new DElement(artifact);
            var isFocus = false;
            var keyboardReceived = false;
            artifact.onMouseClick = event=> {
                isFocus = true;
            };
            artifact.onKeyDown = event=> {
                keyboardReceived = true;
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
            var { level, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(level);
            new DArtifactRotateAnimation(artifact, 180, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.7071, 0.7071, -0.7071, 0.7071, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0, 1, -1, 0, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(-0.7071, 0.7071, -0.7071, -0.7071, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(-1, 0, 0, -1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks artifact alpha animation", () => {
        given:
            var { level, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(level);
            new DArtifactAlphaAnimation(artifact, 0, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "globalAlpha = 0.75",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "globalAlpha = 0.5",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "globalAlpha = 0.25",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "globalAlpha = 0",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks artifact animation overriding", () => {
        given:
            var { level, artifact } = createBoardWithOneCounter();
        when:
            resetDirectives(level);
            new DArtifactRotateAnimation(artifact, 180, 0, 80);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.7071, 0.7071, -0.7071, 0.7071, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            new DArtifactRotateAnimation(artifact, 180, 0, 80); // Overriding !
            executeTimeouts();
        then: // first animation skipped
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(-1, 0, 0, -1, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)", "restore()"
            ]);
        when:
            resetDirectives(level);
            executeTimeouts();
        then: // second animation started
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "setTransform(-0.7071, -0.7071, 0.7071, -0.7071, 250, 150)",
                "drawImage(../images/unit.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

});
