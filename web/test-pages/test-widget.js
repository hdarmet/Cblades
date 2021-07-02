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
    DBoard, DStaticLevel
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
    DIndicator,
    DInsert,
    DResult,
    DMask,
    DScene,
    DMessage,
    DMultiStatePushButton
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
                        "shadowBlur = 15",
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
                    "shadowColor = #000000", "shadowBlur = 15",
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
                "/CBlades/images/icons/menu3.png", "/CBlades/images/icons/menu3-grayed.png",
                0, 1, ()=>{return true;});
            let menu = new DIconMenu(
                false,
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 70)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF", "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 100, 100)", "drawImage(/CBlades/images/icons/menu4.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 40)", "drawImage(/CBlades/images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 100, 40)", "drawImage(/CBlades/images/icons/menu2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 100)", "drawImage(/CBlades/images/icons/menu3.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks icon menu item behavior", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(itemsLayer);
            let clicked = 0;
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
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
                    "drawImage(/CBlades/images/icons/menu1.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/icons/menu1.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/icons/menu1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(itemsLayer);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).equalsTo(1);
            assert(getDirectives(itemsLayer, 0)).arrayEqualsTo([]); // no repainting
        when: // click icon twice: icon action returns true => menu is closed
            resetDirectives(itemsLayer);
            event = createEvent("click", {offsetX:iconVPLocation.x, offsetY:iconVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).equalsTo(2);
            assert(getDirectives(itemsLayer, 0)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 500, 300)",
                "restore()"
            ]);
    });

    it("Checks inactive icon menu item behavior", () => {
        given:
            var { board, itemsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(itemsLayer);
            let clicked = false;
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
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
                    "drawImage(/CBlades/images/icons/menu1-grayed.png, -25, -25, 50, 50)",
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

    it("Checks icon menu modal mode", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            resetDirectives(widgetsLayer);
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
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
                    "shadowColor = #000000", "shadowBlur = 15",
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
                "/CBlades/images/commands/button1.png",
                "/CBlades/images/commands/button1-inactive.png",
                new Point2D(60, 60), ()=>{return true;});
            pushButton.setOnBoard(board);
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 60, 60)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
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
                "/CBlades/images/commands/button1.png",
                "/CBlades/images/commands/button1-inactive.png",
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
                    "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
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
                "/CBlades/images/commands/button1.png", "/CBlades/images/commands/button1-inactive.png",
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
                    "drawImage(/CBlades/images/commands/button1-inactive.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/commands/button1-inactive.png, -25, -25, 50, 50)",
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
                "/CBlades/images/commands/button1.png", "/CBlades/images/commands/button1-inactive.png",
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
                    "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks Multi state PushButton widget", () => {
        given:
            var { board, commandsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            resetDirectives(commandsLayer);
            let pushButton = new DMultiStatePushButton(
                ["/CBlades/images/commands/button1.png", "/CBlades/images/commands/button2.png"],
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
                "drawImage(/CBlades/images/commands/button1.png, -25, -25, 50, 50)",
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
                "drawImage(/CBlades/images/commands/button2.png, -25, -25, 50, 50)",
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
                ["/CBlades/images/commands/button1.png", "/CBlades/images/commands/button2.png"],
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
                    "drawImage(/CBlades/images/commands/button2.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
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
                    "drawImage(/CBlades/images/dice/d3.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(-0.3256, -0.9455, 0.9455, -0.3256, -8, 5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
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
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(dice.result).arrayEqualsTo([1, 2]);
        when: // Dice still active : images have red shadow
            resetDirectives(itemsLayer);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when: // Inactivation : shadows become black
            resetDirectives(itemsLayer);
            dice.active = false;
            board.paint();
        then:
            assert(dice.active).isFalse();
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 40, -10)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, -20, 50)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
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

    it("Checks indicator widget", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let indicator = new DIndicator(["/CBlades/images/indicators/indicator1.png"], new Dimension2D(50, 50));
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            indicator.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            indicator.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks simple insert widget", () => {
        given:
            var { board, widgetsLayer } = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("/CBlades/images/inserts/insert.png", new Dimension2D(200, 190));
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
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer);
            insert.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks scrollable insert widget", () => {
        given:
            var { board, widgetsLayer, commandsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("/CBlades/images/inserts/insert.png",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 90, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/up.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 90, 90, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/up.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 90, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 0, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/inserts/insert.png, 45, 45, 200, 300, -100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 85, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/left.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 215, 200)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/right.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 315)",
                    "shadowColor = #00FFFF",
                    "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/up.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks insert buttons appearance when mouse is moved over/out of it", () => {
        given:
            var { board, widgetsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("/CBlades/images/inserts/insert.png",
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
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
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
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks ok markers on an insert", () => {
        given:
            var { board, widgetsLayer} = createBoardWithWidgetLevel(1000, 600, 500, 300);
            board.paint();
            let insert = new DInsert("/CBlades/images/inserts/insert.png",
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
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 100)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
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
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 100)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 240)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
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
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 85)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/up.png, -25, -25, 50, 50)",
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
                "save()",
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
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
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
                "save()",
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
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
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
            var directives = executeAllAnimations(commandsLayer);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 10, 20)",
                    "drawImage(/CBlades/images/dice/message.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/message.png, -75, -75, 150, 150)",
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
                    "drawImage(/CBlades/images/dice/message.png, -75, -75, 150, 150)",
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
            let indicator1 = new DIndicator(["/CBlades/images/indicators/indicator1.png"], new Dimension2D(50, 50));
            let indicator2 = new DIndicator(["/CBlades/images/indicators/indicator2.png"], new Dimension2D(70, 80));
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
                    "drawImage(/CBlades/images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 40, 230)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/indicators/indicator2.png, -35, -40, 70, 80)",
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
            let indicator = new DIndicator(["/CBlades/images/indicators/indicator1.png"], new Dimension2D(50, 50));
            let insert = new DInsert("/CBlades/images/inserts/insert.png", new Dimension2D(200, 190));
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
                    "drawImage(/CBlades/images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -95, 200, 190)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
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
                    "drawImage(/CBlades/images/indicators/indicator1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -95, 200, 190)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(/CBlades/images/inserts/insert.png, 0, 0, 200, 190, -100, -95, 200, 190)",
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