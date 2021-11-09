'use strict'

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D
} from "../jslib/geometry.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../jslib/draw.js";
import {
    Mechanisms, Memento
} from "../jslib/mechanisms.js";
import {
    DBoard, DMultiImagesArtifact, DStaticLevel
} from "../jslib/board.js";
import {
    mockPlatform, getDirectives, resetDirectives, loadAllImages, createEvent, getLayers
} from "./mocks.js";
import {
    DWidget,
    DPopup,
    DIconMenu,
    DIconMenuItem,
    DPushButton,
    DDice,
    DMultiImagesIndicator,
    DInsert,
    DResult,
    DMask,
    DScene,
    DMessage,
    DMultiStatePushButton, DRotatableIndicator, DSwipe, DPrevNavigation, DNextNavigation, D2StatesIconMenuItem
} from "../jslib/widget.js";
import {
    clickOnArtifact, mouseMoveOnArtifact, mouseMoveOutOfArtifact
} from "./cblades/interactive-tools.js";

describe("Widget", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
    });

    function createBoardWithWidgetLevel(width, height, viewPortWidth, viewPortHeight) {
        let widgetsLevel = new DStaticLevel("widgets");
        let itemsLevel = new DStaticLevel("widget-items");
        let commandsLevel = new DStaticLevel("widget-commands");
        let board = new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            widgetsLevel, itemsLevel, commandsLevel);
        let [widgetsLayer, itemsLayer, commandsLayer] = getLayers(board, "widgets", "widget-items", "widget-commands");
        return { board, widgetsLayer, itemsLayer, commandsLayer, widgetsLevel, itemsLevel, commandsLevel }
    }

    it("Checks raw widget opening and closing", () => {
        when:
            var { board, widgetsLayer:layer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            let widget = new DWidget()
                .setPanelSettings(new Dimension2D(100, 150))
                .setLocation(new Point2D(250, 150))
                .setOnBoard(board);
            resetDirectives(layer);
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo(
                [
                    "save()",
                        "setTransform(1, 0, 0, 1, 250, 150)",
                        "shadowColor = #000000",
                        "shadowBlur = 10",
                        "strokeStyle = #000000",
                        "lineWidth = 1",
                        "strokeRect(-50, -75, 100, 150)",
                        "fillStyle = #FFFFFF",
                        "fillRect(-50, -75, 100, 150)",
                    "restore()"
                ]);
        when:
            resetDirectives(layer);
            widget.removeFromBoard();
            board.paint();
        then:
            assert(getDirectives(layer, 4).length).equalsTo(0);
    });

    it("Checks widget adjusting", () => {
        given:
            var { board } = createBoardWithWidgetLevel(1000, 600, 500, 300);
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
            var { board, widgetsLayer:layer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            let popup = new DPopup(new Dimension2D(100, 150));
            board.paint();
            resetDirectives(layer);
        when:
            popup.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(popup.isModal()).isFalse();
            assert(getDirectives(layer)).arrayContains("setTransform(1, 0, 0, 1, 55, 80)");
        when:
            resetDirectives(layer);
            popup.close();
            board.paint();
        then:
            assert(getDirectives(layer)).arrayNotContains("setTransform(1, 0, 0, 1, 55, 80)");
    });

    it("Checks modal opening and closing", () => {
        given:
            var { board, widgetsLayer:layer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            let popup = new DPopup(new Dimension2D(100, 150), true);
            board.paint();
            resetDirectives(layer);
        when:
            popup.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 55, 80)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-50, -75, 100, 150)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -75, 100, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(layer);
            popup.close();
            board.paint();
        then:
            assert(getDirectives(layer, 4)).arrayNotContains([]);
    });

    it("Checks icon menu widget", () => {
        given:
            var { board, widgetsLayer, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(widgetsLayer);
            resetDirectives(itemsLayer);
            let iconMenuItem = new DIconMenuItem(
                "./../images/icons/menu3.png", "./../images/icons/menu3-grayed.png",
                0, 1, ()=>{return true;});
            let menu = new DIconMenu(
                false,
                new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                    0, 0, ()=>{return true;}),
                new DIconMenuItem("./../images/icons/menu2.png", "./../images/icons/menu2-grayed.png",
                    1, 0, ()=>{return true;}),
                iconMenuItem,
                new DIconMenuItem("./../images/icons/menu4.png", "./../images/icons/menu4-grayed.png",
                    1, 1, ()=>{return true;})
            );
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
        then:
            assert(menu.getItem(0, 1)).equalsTo(iconMenuItem);
            assert(menu.getItem(2, 2)).isNotDefined();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 70)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF", "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 100, 100)", "drawImage(./../images/icons/menu4.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)", "drawImage(./../images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 100, 40)", "drawImage(./../images/icons/menu2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 100)", "drawImage(./../images/icons/menu3.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks icon menu item behavior", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(itemsLayer);
            let clicked = 0;
            let icon = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                });
            let menu = new DIconMenu(false, icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            let iconVPLocation = icon.viewportLocation;
        then:
            assert(icon.active).isTrue();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "drawImage(./../images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // mouseover icon
            resetDirectives(itemsLayer);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(./../images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(itemsLayer);
            event = createEvent("mousemove", {offsetX:iconVPLocation.x+30, offsetY:iconVPLocation.y+30});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "drawImage(./../images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(itemsLayer);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).equalsTo(1);
            assert(getDirectives(itemsLayer, 0)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 500, 300)",
                "restore()"
            ]);
    });

    it("Checks tooltip (of icon menu item) behavior", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(commandsLayer);
            let clicked = 0;
            let icon1 = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                },
                "tooltip message");
            let icon2 = new DIconMenuItem("./../images/icons/menu2.png", "./../images/icons/menu2-grayed.png",
                0, 1,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                },
                "other tooltip message");
            let menu = new DIconMenu(false, icon1, icon2);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            var iconVPLocation = icon1.viewportLocation;
        when: // mouseover icon
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            getDrawPlatform().addTime(500);
            resetDirectives(commandsLayer);
            executeTimeouts();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 47.5, 40)",
                    "fillStyle = #FFFFE4",
                    "fillRect(-42.5, -15, 85, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-42.5, -15, 85, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(tooltip message, 0, 0)",
                    "fillStyle = #000000",
                    "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 47.5, 40)",
                    "fillStyle = #FFFFE4", "fillRect(-42.5, -15, 85, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-42.5, -15, 85, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(tooltip message, 0, 0)",
                    "fillStyle = #000000",
                    "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
        when:
            iconVPLocation = icon2.viewportLocation;
            event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            resetDirectives(commandsLayer);
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that tooltip may be undone", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            Memento.activate();
            board.paint();
            resetDirectives(commandsLayer);
            let clicked = 0;
            let icon1 = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                },
                "tooltip message");
            let menu = new DIconMenu(false, icon1);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            var iconVPLocation = icon1.viewportLocation;
        when: // tooltip opened
            Memento.open();
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
            getDrawPlatform().addTime(500);
            resetDirectives(commandsLayer);
            executeTimeouts();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 47.5, 40)",
                    "fillStyle = #FFFFE4", "fillRect(-42.5, -15, 85, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-42.5, -15, 85, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(tooltip message, 0, 0)",
                    "fillStyle = #000000", "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
        when: // current artifact is tooltip
            Memento.open();
            event = createEvent("mousemove", {offsetX:iconVPLocation.x+1, offsetY:iconVPLocation.y+1});
            resetDirectives(commandsLayer);
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 47.5, 40)",
                    "fillStyle = #FFFFE4", "fillRect(-42.5, -15, 85, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-42.5, -15, 85, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(tooltip message, 0, 0)",
                    "fillStyle = #000000", "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
        when: // leave tooltip
            Memento.open();
            event = createEvent("mousemove", {offsetX:iconVPLocation.x+200, offsetY:iconVPLocation.y+200});
            resetDirectives(commandsLayer);
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.undo();
            resetDirectives(commandsLayer);
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 47.5, 40)",
                    "fillStyle = #FFFFE4", "fillRect(-42.5, -15, 85, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-42.5, -15, 85, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(tooltip message, 0, 0)",
                    "fillStyle = #000000", "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
        when:
            Memento.undo();
            resetDirectives(commandsLayer);
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that a tooltip is automatically closed if another one is opened", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(commandsLayer);
            let clicked = 0;
            let icon1 = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                    clicked++;
                    return clicked===2; // click two times to return true;
                },
                "tooltip message");
            let menu = new DIconMenu(false, icon1);
            menu.open(board, new Point2D(5, 5));
            menu.openTooltip("First tooltip", new Point2D(-20, -20));
            loadAllImages();
            board.paint();
            var iconVPLocation = icon1.viewportLocation;
        when: // mouseover icon
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 42.5, 20)",
                    "fillStyle = #FFFFE4",
                    "fillRect(-37.5, -15, 75, 30)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-37.5, -15, 75, 30)",
                    "font = 15px serif", "textAlign = center", "textBaseline = middle",
                    "shadowBlur = 0", "lineWidth = 0",
                    "strokeText(First tooltip, 0, 0)",
                    "fillStyle = #000000",
                    "fillText(First tooltip, 0, 0)",
                "restore()"
            ]);
        when:
            getDrawPlatform().addTime(500);
            resetDirectives(commandsLayer);
            executeTimeouts();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo( [
                "save()",
                "setTransform(1, 0, 0, 1, 47.5, 40)",
                "fillStyle = #FFFFE4",
                "fillRect(-42.5, -15, 85, 30)",
                "strokeStyle = #000000", "lineWidth = 1",
                "strokeRect(-42.5, -15, 85, 30)",
                "font = 15px serif", "textAlign = center", "textBaseline = middle",
                "shadowBlur = 0", "lineWidth = 0",
                "strokeText(tooltip message, 0, 0)",
                "fillStyle = #000000",
                "fillText(tooltip message, 0, 0)",
                "restore()"
            ]);
    });

    it("Checks inactive icon menu item behavior", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(itemsLayer);
            let clicked = false;
            let icon = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{
                clicked=true;
                return true;
            }).setActive(false);
            let menu = new DIconMenu(false, icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
            let iconVPLocation = icon.viewportLocation;
        then:
            assert(icon.active).isFalse();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "drawImage(./../images/icons/menu1-grayed.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // mouseover icon
            resetDirectives(itemsLayer);
            var event = createEvent("mousemove", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer)).arrayEqualsTo([]);
        when: // click on icon : action is not invoked
            resetDirectives(itemsLayer);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isFalse();
    });

    it("Checks 2 states icon menu item behavior", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(itemsLayer);
            let clicked = -1;
            var icon1 = new D2StatesIconMenuItem(
                "./../images/icons/menu1.png",
                "./../images/icons/menu1b.png",
                "./../images/icons/menu1-grayed.png",
                0, 0,
                (event, state)=>{
                    clicked=state;
                    return true;
                });
            var icon2 = new D2StatesIconMenuItem(
                "./../images/icons/menu2.png",
                "./../images/icons/menu2b.png",
                "./../images/icons/menu2-grayed.png",
                1, 0,
                (event, state)=>{
                    clicked=state;
                    return true;
                }).setSecondState(true);
            let menu = new DIconMenu(false, icon1, icon2);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
        then:
            assert(icon1.secondState).isFalse();
            assert(icon2.secondState).isTrue();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 100, 40)',
                    'drawImage(./../images/icons/menu2b.png, -25, -25, 50, 50)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, 40, 40)',
                    'drawImage(./../images/icons/menu1.png, -25, -25, 50, 50)',
                'restore()'
            ]);
        when:
            clickOnArtifact(board, icon2);
        then:
            assert(clicked).isTrue();
    });

    it("Checks icon menu modal mode", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(widgetsLayer);
            let icon = new DIconMenuItem("./../images/icons/menu1.png", "./../images/icons/menu1-grayed.png",
                0, 0,
                ()=>{ return true });
            let menu = new DIconMenu(true, icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000", "fillRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-35, -35, 70, 70)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-35, -35, 70, 70)",
                "restore()"
            ]);
   });

    it("Checks pushButton widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(commandsLayer);
            let pushButton = new DPushButton(
                "./../images/commands/button1.png",
                "./../images/commands/button1-inactive.png",
                new Point2D(60, 60), ()=>{return true;});
            pushButton.setOnBoard(board);
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            pushButton.setPosition(new Point2D(-69, -60));
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 431, 240)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks PushButton item behavior", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(commandsLayer);
            var clicked = false;
            let pushButton = new DPushButton(
                "./../images/commands/button1.png",
                "./../images/commands/button1-inactive.png",
                new Point2D(60, 60),
                ()=>{clicked = true;});
            pushButton.setOnBoard(board);
            loadAllImages();
            var buttonVPLocation = pushButton.trigger.viewportLocation;
            board.paint();
        when: // mouseover icon
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(commandsLayer);
            event = createEvent("mousemove", {offsetX:buttonVPLocation.x+100, offsetY:buttonVPLocation.y+100});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(commandsLayer);
            event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
    });

    it("Checks inactive pushButton item behavior", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(commandsLayer);
            var clicked = false;
            let pushButton = new DPushButton(
                "./../images/commands/button1.png", "./../images/commands/button1-inactive.png",
                new Point2D(60, 60),
                ()=>{clicked = true;});
            pushButton.setOnBoard(board);
            loadAllImages();
            var buttonVPLocation = pushButton.trigger.viewportLocation;
            board.paint();
        then:
            assert(pushButton.active).isTrue();
        when: // mouseover icon
            pushButton.active = false;
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(pushButton.active).isFalse();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1-inactive.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(commandsLayer);
            event = createEvent("mousemove", {offsetX:buttonVPLocation.x+100, offsetY:buttonVPLocation.y+100});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1-inactive.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(commandsLayer);
            event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isFalse();
    });

    it("Checks pushButton animation", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var clicked = false;
            let pushButton = new DPushButton(
                "./../images/commands/button1.png", "./../images/commands/button1-inactive.png",
                new Point2D(60, 60),
                animation=>{clicked = true; animation()});
            pushButton.setOnBoard(board);
            pushButton.setTurnAnimation(false);
            loadAllImages();
            var buttonVPLocation = pushButton.trigger.viewportLocation;
            board.paint();
        when: // click icon once: icon action returns false => menu is not closed
            var event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
        when:
            executeTimeouts();
            resetDirectives(commandsLayer);
            executeTimeouts();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.9686, -0.2487, 0.2487, 0.9686, 60, 60)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks Multi state PushButton widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            resetDirectives(commandsLayer);
            let pushButton = new DMultiStatePushButton(
                ["./../images/commands/button1.png", "./../images/commands/button2.png"],
                new Point2D(60, 60), (state)=>{return true;}
            );
            pushButton.setOnBoard(board);
            loadAllImages();
            board.paint();
        then:
            assert(pushButton.state).equalsTo(0);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 60, 60)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            pushButton.setState(1);
            board.paint();
        then:
            assert(pushButton.state).equalsTo(1);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 60, 60)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/commands/button2.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function executeAllAnimations(layer) {
        var directives = [];
        while(DAnimator.isActive()) {
            resetDirectives(layer);
            executeTimeouts();
            let lastDirectives = getDirectives(layer);
            if (lastDirectives.length) directives = lastDirectives;
        }
        return directives;
    }

    it("Checks Multi State PushButton animation", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var buttonState = -1;
            let pushButton = new DMultiStatePushButton(
                ["./../images/commands/button1.png", "./../images/commands/button2.png"],
                new Point2D(60, 60), (state, animation)=>{
                    buttonState = state;
                    animation();
                }
            );
            pushButton.setOnBoard(board);
            pushButton.setTurnAnimation(false, ()=>{
                pushButton.setState(1);
            });
            loadAllImages();
            var buttonVPLocation = pushButton.trigger.viewportLocation;
            board.paint();
        when:
            var event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(buttonState).equalsTo(0);
        when:
            executeAllAnimations(commandsLayer);
            resetDirectives(commandsLayer);
        then:
            board.repaint();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/button2.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks dice widget", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
            let finished = false;
            dice.setFinalAction(()=>{finished = true;})
            loadAllImages();
        when:
            resetDirectives(itemsLayer);
            dice.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            resetDirectives(itemsLayer);
            for (let index=0; index<40; index++) {
                getDrawPlatform().setRandoms(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
            }
            var diceVPLocation = dice.trigger[0].viewportLocation;
            var event = createEvent("click", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
            executeTimeouts();
        then:
            assert(dice.active).isTrue();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.309, 0.9511, -0.9511, -0.309, 40, -30)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d3.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(-0.3256, -0.9455, 0.9455, -0.3256, -8, 5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            var directives = executeAllAnimations(itemsLayer);
        then:
            assert(finished).isTrue();
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(dice.result).arrayEqualsTo([1, 2]);
        when: // Dice still active : images have red shadow when mouseover
            resetDirectives(itemsLayer);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(./../images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when: // Dice still active : images have blue shadow when mouse out of
            resetDirectives(itemsLayer);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x+200, offsetY:diceVPLocation.y+200});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 40, -10)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, -20, 50)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/dice/d2.png, -50, -44.5, 100, 89)',
                'restore()'
            ]);
        when: // Inactivation : shadows become black
            resetDirectives(itemsLayer);
            dice.active = false;
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
            board.paint();
        then:
            assert(dice.active).isFalse();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when: // Dice not active : dice are not redrawn
            resetDirectives(itemsLayer);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer)).arrayEqualsTo([]);
        when:
            dice.close();
            board.paint();
        then:
            assert(getDirectives(itemsLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()"
            ]);
    });

    it("Checks indicator widget basic features", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let indicator = new DMultiImagesIndicator(["./../images/indicators/indicator1.png"], new Dimension2D(50, 50));
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            indicator.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(indicator.artifact).is(DMultiImagesArtifact);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            indicator.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks multi images indicator widget features", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let indicator = new DMultiImagesIndicator([
                "./../images/indicators/indicator0.png",
                "./../images/indicators/indicator1.png"
            ], new Dimension2D(50, 50));
            loadAllImages();
        when:
            indicator.open(board, new Point2D(10, 20));
            resetDirectives(widgetsLayer);
            indicator.changeState(1);
            board.paint();
        then:
            assert(indicator.state).equalsTo(1);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator0.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            executeAllAnimations(widgetsLayer);
            board.repaint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks rotatble indicator widget features", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let indicator = new DRotatableIndicator([
                "./../images/indicators/indicator0.png"
            ], new Dimension2D(50, 50));
            loadAllImages();
        when:
            indicator.open(board, new Point2D(10, 20));
            resetDirectives(widgetsLayer);
            indicator.changeState(60);
            board.paint();
        then:
            assert(indicator.state).equalsTo(0);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator0.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            executeAllAnimations(widgetsLayer);
            board.repaint();
        then:
            assert(indicator.state).equalsTo(60);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.5, 0.866, -0.866, 0.5, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator0.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            indicator.changeState(300);
            executeAllAnimations(widgetsLayer);
        then:
            assert(indicator.state).equalsTo(-60);
        when:
            indicator.changeState(-300);
            executeAllAnimations(widgetsLayer);
        then:
            assert(indicator.state).equalsTo(60);
    });

    it("Checks simple insert widget", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("./../images/inserts/insert.png", new Dimension2D(200, 190));
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            insert.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -95, 200, 190)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "drawImage(./../images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            insert.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(insert.artifact.onMouseClick()).isTrue();
    });

    it("Checks scrollable insert widget", () => {
        given:
            var { board, widgetsLayer, commandsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("./../images/inserts/insert.png",
                new Dimension2D(200, 300),
                new Dimension2D(290, 390)
            );
            loadAllImages();
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            insert.open(board, new Point2D(150, 200));
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 0, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            clickOnArtifact(board, insert.downButton);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 0, 90, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/up.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            clickOnArtifact(board, insert.rightButton);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 90, 90, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/up.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            clickOnArtifact(board, insert.upButton);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 90, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            clickOnArtifact(board, insert.leftButton);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 0, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer);
            insert.focusOn(new Point2D(290/2, 390/2));
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 45, 45, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF",
                    "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/up.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks insert buttons appearance when mouse is moved over/out of it", () => {
        given:
            var { board, widgetsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("./../images/inserts/insert.png",
                new Dimension2D(200, 300),
                new Dimension2D(200, 390)
            );
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            insert.open(board, new Point2D(150, 200));
            mouseMoveOnArtifact(board, insert.downButton);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 16)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            mouseMoveOutOfArtifact(board, insert.downButton);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 16)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks navigation buttons", () => {
        given:
            var { board, widgetsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var counter = 1;
            var popup = new DPopup(new Dimension2D(500, 200));
            var prevButton = new DPrevNavigation(new Point2D(-50, 0), event=>counter--);
            var nextButton = new DNextNavigation(new Point2D(50, 0), event=>counter++);
            popup.addArtifact(prevButton);
            popup.addArtifact(nextButton);
            loadAllImages();
            popup.open(board, new Point2D(500, 300));
        when:
            resetDirectives(widgetsLayer);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 245, 195)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'strokeStyle = #000000', 'lineWidth = 1',
                    'strokeRect(-250, -100, 500, 200)',
                    'fillStyle = #FFFFFF', 'fillRect(-250, -100, 500, 200)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, 195, 195)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/prev.png, -18, -18, 36, 36)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, 295, 195)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/next.png, -18, -18, 36, 36)',
                'restore()'
            ]);
        when:
            clickOnArtifact(board, prevButton);
        then:
            assert(counter).equalsTo(0);
        when:
            resetDirectives(widgetsLayer);
            prevButton.setActive(false);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 245, 195)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'strokeStyle = #000000', 'lineWidth = 1',
                    'strokeRect(-250, -100, 500, 200)',
                    'fillStyle = #FFFFFF',
                    'fillRect(-250, -100, 500, 200)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, 195, 195)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/commands/prev-inactive.png, -18, -18, 36, 36)',
                'restore()',
                'save()',
                    'setTransform(1, 0, 0, 1, 295, 195)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/next.png, -18, -18, 36, 36)',
                'restore()'
            ]);
        when:
            clickOnArtifact(board, prevButton);
        then:
            assert(counter).equalsTo(0);
    });

    it("Checks ok markers on an insert", () => {
        given:
            var { board, widgetsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("./../images/inserts/insert.png",
                new Dimension2D(200, 300),
                new Dimension2D(200, 390)
            );
        when: // Declare 2 markers but set only 1
            resetDirectives(widgetsLayer);
            insert.open(board, new Point2D(150, 200));
            insert.setMark(new Point2D(20, 50));
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 16)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 100)",
                    "drawImage(./../images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()"
            ]);
        when: // set second marker
            resetDirectives(widgetsLayer);
            insert.setMark(new Point2D(20, 190));
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 16)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 100)",
                    "drawImage(./../images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 240)",
                    "drawImage(./../images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()"
            ]);
        when: // scroll insert making 1st marker non visible
            resetDirectives(widgetsLayer);
            clickOnArtifact(board, insert.downButton);
            board.paint();
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 16)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 150)",
                    "drawImage(./../images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(./../images/commands/up.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks success result widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let result = new DResult().success();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            result.open(board, new Point2D(10, 20));
            result.appear();
            var resultVPLocation = result.trigger.viewportLocation;
            board.paint();
        then:
            assert(result.finished).isTrue();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00FF00", "shadowBlur = 100",
                    "drawImage(./../images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            result.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks failure result widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let result = new DResult().failure();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            result.open(board, new Point2D(10, 20));
            result.appear();
            var resultVPLocation = result.trigger.viewportLocation;
            board.paint();
        then:
            assert(result.finished).isTrue();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(./../images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Acivation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #FF0000", "shadowBlur = 100",
                    "drawImage(./../images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Acivation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(./../images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            result.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks result widget final action", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let clicked = false;
            let result = new DResult().success().setFinalAction(()=>{
                clicked = true;
                result.close();
            });
            result.open(board, new Point2D(10, 20));
            result.appear();
            executeAllAnimations(commandsLayer);
            var resultVPLocation = result.trigger.viewportLocation;
        when:
            var event = createEvent("click", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
        when: // Test animation when widget is closed
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([]);
    });

    it("Checks swipe widget with no swipe", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let swipe = new DSwipe().noSwipe();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            swipe.open(board, new Point2D(10, 20));
            swipe.appear();
            var resultVPLocation = swipe.trigger.viewportLocation;
            board.paint();
        then:
            assert(swipe.finished).isTrue();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
        ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/no-swipe.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00FF00", "shadowBlur = 100",
                    "drawImage(./../images/dice/no-swipe.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/no-swipe.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            swipe.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks swipe widget with swipe up", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let swipe = new DSwipe().swipeUp();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            swipe.open(board, new Point2D(10, 20));
            swipe.appear();
            var resultVPLocation = swipe.trigger.viewportLocation;
            board.paint();
        then:
            assert(swipe.finished).isTrue();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                    "restore()",
                    "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-up.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00FF00", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-up.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-up.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            swipe.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks swipe widget with swipe down", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let swipe = new DSwipe().swipeDown();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            swipe.open(board, new Point2D(10, 20));
            swipe.appear();
            var resultVPLocation = swipe.trigger.viewportLocation;
            board.paint();
        then:
            assert(swipe.finished).isTrue();
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                    "restore()",
                    "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-down.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00FF00", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-down.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(./../images/dice/swipe-down.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            swipe.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks swipe widget final action", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let receivedValue = null;
            let swipe = new DSwipe().swipeDown().setFinalAction(swipeValue=>{
                receivedValue = swipeValue;
                swipe.close();
            });
            swipe.open(board, new Point2D(10, 20));
            swipe.appear();
            executeAllAnimations(commandsLayer);
            var resultVPLocation = swipe.trigger.viewportLocation;
        when:
            var event = createEvent("click", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(receivedValue).equalsTo(DSwipe.SWIPE_DOWN);
        when: // Test animation when widget is closed
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([]);
    });

    it("Checks message widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let message = new DMessage();
            loadAllImages();
        when:
            resetDirectives(commandsLayer);
            message.open(board, new Point2D(10, 20));
            message.appear("12");
            var messageVPLocation = message.trigger.viewportLocation;
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 30)",
                    "font = 90px serif", "textAlign = center", "textBaseline = middle",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 0, 0)",
                    "fillStyle = #8080FF",
                    "fillText(12, 0, 0)",
                "restore()"
            ]);
        when:
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "drawImage(./../images/dice/message.png, -75, -75, 150, 150)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 30)",
                    "font = 90px serif", "textAlign = center", "textBaseline = middle",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 0, 0)", "fillStyle = #8080FF",
                    "fillText(12, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            var event = createEvent("mousemove", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #00FFFF", "shadowBlur = 100",
                    "drawImage(./../images/dice/message.png, -75, -75, 150, 150)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 30)",
                    "font = 90px serif", "textAlign = center", "textBaseline = middle",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 0, 0)",
                    "fillStyle = #8080FF",
                    "fillText(12, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            event = createEvent("mousemove", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #A0FFFF", "shadowBlur = 100",
                    "drawImage(./../images/dice/message.png, -75, -75, 150, 150)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 30)",
                    "font = 90px serif", "textAlign = center", "textBaseline = middle",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 0, 0)",
                    "fillStyle = #8080FF",
                    "fillText(12, 0, 0)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLayer);
            message.close();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks message widget final action", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let min, max;
            let message = new DMessage().setFinalAction((...values)=>{
                min = Math.min(...values);
                max = Math.max(...values);
                message.close();
            });
            message.open(board, new Point2D(10, 20));
            message.appear("12", 1, 2, 3);
            executeAllAnimations(commandsLayer);
            var messageVPLocation = message.trigger.viewportLocation;
        when:
            var event = createEvent("click", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(min).equalsTo(1);
            assert(max).equalsTo(3);
        when: // Test animation when widget is closed
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([]);
    });

    it("Checks mask widget", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let clicked = false;
            let mask = new DMask("#0F0F0F", 0.2).setAction(()=>{
                clicked = true;
                mask.close();
            });
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            mask.open(board);
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.2",
                    "fillStyle = #0F0F0F",
                    "fillRect(0, 0, 500, 300)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            var event = createEvent("click", {offsetX:1, offsetY:1});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
        when:
            mask.alpha = 0;
        then:
            assert(mask._artifact.alpha).equalsTo(0);
            assert(mask._artifact.onMouseMove()).isFalse();
        when:
            mask.alpha = 1;
        then:
            assert(mask._artifact.alpha).equalsTo(0.2);
            assert(mask._artifact.onMouseMove()).isTrue();
    });

    it("Checks scene facility", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let indicator1 = new DMultiImagesIndicator(["./../images/indicators/indicator1.png"], new Dimension2D(50, 50));
            let indicator2 = new DMultiImagesIndicator(["./../images/indicators/indicator2.png"], new Dimension2D(70, 80));
            let scene = new DScene()
                .addWidget(indicator1, new Point2D(0, -100))
                .addWidget(indicator2, new Point2D(0, 100));
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            scene.open(board, new Point2D(10, 10)); // near a border to trigger adjustement
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 30)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 230)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator2.png, -35, -40, 70, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            scene.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that a scene opening/closing is undoable", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            let indicator = new DMultiImagesIndicator(["./../images/indicators/indicator1.png"], new Dimension2D(50, 50));
            let insert = new DInsert("./../images/inserts/insert.png", new Dimension2D(200, 190));
            let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
            let scene = new DScene()
                .addWidget(indicator, new Point2D(-100, -100))
                .addWidget(insert, new Point2D(-100, 100))
                .addWidget(dice, new Point2D(100, 0));
            loadAllImages();
            Memento.activate();
        when:
            resetDirectives(widgetsLayer);
            scene.open(board, new Point2D(250, 150)); // near a border to trigger adjustement
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -95, 200, 190)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(widgetsLayer);
            scene.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer);
            Memento.undo();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -95, 200, 190)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(./../images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            Memento.redo();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

});