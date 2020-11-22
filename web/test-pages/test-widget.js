'use strict'

import {
    describe, it, before, assert
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D
} from "../jslib/geometry.js";
import {
    DImage, DStaticLayer, setDrawPlatform
} from "../jslib/draw.js";
import {
    Mechanisms, Memento
} from "../jslib/mechanisms.js";
import {
    DBoard, DElement, DImageArtifact
} from "../jslib/board.js";
import {
    mockPlatform, getDirectives, resetDirectives
} from "./mocks.js";
import {
    DWidget, DPopup
} from "../jslib/widget.js";


describe("Widget", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    function createBoardWithWidgetLevel(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            "map", "units", "markers", new DStaticLayer("widgets"));
    }

    it("Checks raw widget opening and closing", () => {
        when:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            let widget = new DWidget()
                .setPanelSettings(new Dimension2D(100, 150))
                .setLocation(new Point2D(250, 150))
                .setOnBoard(board);
            resetDirectives(level);
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo(
                [
                    "save()",
                    "shadowColor = #000000",
                    "shadowBlur = 15",
                    "strokeStyle = #000000",
                    "lineWidth = 1",
                    "setTransform(1, 0, 0, 1, 250, 150)",
                    "strokeRect(-50, -75, 100, 150)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -75, 100, 150)",
                    "restore()"
                ]);
        when:
            resetDirectives(level);
            widget.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(level, 4).length).equalsTo(0);
    });

    it("Checks widget adjusting", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            let widget = new DWidget()
                .setPanelSettings(new Dimension2D(100, 150))
                .setOnBoard(board);
        then:
            assert(widget.adjust(new Point2D(0, 0)).toString()).equalsTo("point(55, 80)");
            assert(widget.adjust(new Point2D(5, 5)).toString()).equalsTo("point(55, 80)");
            assert(widget.adjust(new Point2D(495, 295)).toString()).equalsTo("point(445, 220)");
    });

    it("Checks popup opening and closing", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            let popup1 = new DPopup();
            let popup2 = new DPopup();
            board.paint();
            resetDirectives(level);
        when:
            popup1.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(DPopup._instance).equalsTo(popup1);
            assert(getDirectives(level)).arrayContains("setTransform(1, 0, 0, 1, 55, 80)");
        when:
            resetDirectives(level);
            popup2.open(board, new Point2D(495, 295));
            board.paint();
        then:
            assert(DPopup._instance).equalsTo(popup2);
            assert(getDirectives(level)).arrayContains("setTransform(1, 0, 0, 1, 445, 220)");
            assert(getDirectives(level)).arrayNotContains("setTransform(1, 0, 0, 1, 55, 80)");
        when:
            resetDirectives(level);
            popup2.close();
            board.paint();
        then:
            assert(DPopup._instance).isNotDefined();
            assert(getDirectives(level)).arrayNotContains("setTransform(1, 0, 0, 1, 445, 220)");
    });

    it("Checks that global events close all popup", () => {
        given:
            DPopup.activate();
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            let popup1 = new DPopup();
            popup1.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(DPopup._instance).equalsTo(popup1);
        when:
            Mechanisms.fire(null, "some-event");
        then:
            assert(DPopup._instance).isNotDefined();
    });

});