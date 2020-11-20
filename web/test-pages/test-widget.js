import {
    describe, it, before, assert
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D
} from "../jslib/geometry.js";
import {
    DImage, DLayer, setDrawPlatform
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
    DWidget
} from "../jslib/widget.js";


describe("Widget", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    function createBoardWithWidgetLevel(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            "map", "units", "markers", "widgets");
    }

    it("Checks raw widget creation", () => {
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
                ["shadowColor = #000000",
                "shadowBlur = 15",
                "strokeStyle = #000000",
                "lineWidth = 1",
                "save()",
                "setTransform(0.5, 0, 0, 0.5, 375, 225)",
                "strokeRect(-50, -75, 100, 150)",
                "restore()",
                "fillStyle = #FFFFFF",
                "save()",
                "setTransform(0.5, 0, 0, 0.5, 375, 225)",
                "fillRect(-50, -75, 100, 150)",
                "restore()"]);
    });

});