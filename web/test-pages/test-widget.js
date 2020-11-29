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
    mockPlatform, getDirectives, resetDirectives, loadAllImages, createEvent
} from "./mocks.js";
import {
    DWidget, DPopup, DIconMenu, DIconMenuItem
} from "../jslib/widget.js";


describe("Widget", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    function createBoardWithWidgetLevel(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            "map", "units", "markers", new DStaticLayer("widgets"), new DStaticLayer("widget-items"));
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
            let popup1 = new DPopup(new Dimension2D(100, 150));
            let popup2 = new DPopup(new Dimension2D(100, 150));
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
            let popup1 = new DPopup(new Dimension2D(100, 150));
            popup1.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(DPopup._instance).equalsTo(popup1);
        when:
            Mechanisms.fire(null, DBoard.SCROLL_EVENT);
        then:
            assert(DPopup._instance).isNotDefined();
    });

    it("Checks icon menu widget", () => {
        given:
            DPopup.activate();
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            var itemsLevel = board.getLevel("widget-items");
            board.paint();
            resetDirectives(level);
            resetDirectives(itemsLevel);
            let iconMenuItem = new DIconMenuItem(
                "/CBlades/images/icons/menu3.png", "/CBlades/images/icons/menu3-grayed.png",
                0, 1, ()=>{return true;});
            let menu = new DIconMenu(
                new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
                    0, 0, ()=>{return true;}),
                new DIconMenuItem("/CBlades/images/icons/menu2.png", "/CBlades/images/icons/menu2-grayed.png",
                    1, 0, ()=>{return true;}),
                iconMenuItem,
                new DIconMenuItem("/CBlades/images/icons/menu4.png", "/CBlades/images/icons/menu4-grayed.png",
                    1, 1, ()=>{return true;})
            );
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
        then:
            assert(menu.getItem(0, 1)).equalsTo(iconMenuItem);
            assert(menu.getItem(2, 2)).isNotDefined();
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 15",
                "strokeStyle = #000000", "lineWidth = 1",
                "setTransform(1, 0, 0, 1, 70, 70)",
                "strokeRect(-65, -65, 130, 130)",
                "fillStyle = #FFFFFF", "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()", "drawImage(/CBlades/images/icons/menu4.png, 75, 75, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/menu1.png, 15, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/menu2.png, 75, 15, 50, 50)", "restore()",
                "save()", "drawImage(/CBlades/images/icons/menu3.png, 15, 75, 50, 50)", "restore()"
            ]);
    });

    it("Checks icon menu item behavior", () => {
        given:
            DPopup.activate();
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var itemsLevel = board.getLevel("widget-items");
            board.paint();
            resetDirectives(itemsLevel);
            let clicked = 0;
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                });
            let menu = new DIconMenu(icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            let iconVPLocation = icon.viewportLocation;
        then:
            assert(icon.active).isTrue();
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()", "drawImage(/CBlades/images/icons/menu1.png, 15, 15, 50, 50)", "restore()"
            ]);
        when: // mouseover icon
            resetDirectives(itemsLevel);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/icons/menu1.png, 15, 15, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(itemsLevel);
            event = createEvent("mousemove", {offsetX:iconVPLocation.x+30, offsetY:iconVPLocation.y+30});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                "drawImage(/CBlades/images/icons/menu1.png, 15, 15, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(itemsLevel);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).equalsTo(1);
            assert(getDirectives(itemsLevel, 0)).arrayEqualsTo([]); // no repainting
        when: // click icon twice: icon action returns true => menu is closed
            resetDirectives(itemsLevel);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).equalsTo(2);
            assert(getDirectives(itemsLevel, 0)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 500, 300)",
                "restore()"
            ]);
    });

    it("Checks inactive icon menu item behavior", () => {
        given:
            DPopup.activate();
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var itemsLevel = board.getLevel("widget-items");
            board.paint();
            resetDirectives(itemsLevel);
            let clicked = false;
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                clicked=true;
                return true;
            }).setActive(false);
            let menu = new DIconMenu(icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            let iconVPLocation = icon.viewportLocation;
        then:
            assert(icon.active).isFalse();
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()", "drawImage(/CBlades/images/icons/menu1-grayed.png, 15, 15, 50, 50)", "restore()"
            ]);
        when: // mouseover icon
            resetDirectives(itemsLevel);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLevel)).arrayEqualsTo([]);
        when: // click on icon : action is not invoked
            resetDirectives(itemsLevel);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isFalse();
    });

});