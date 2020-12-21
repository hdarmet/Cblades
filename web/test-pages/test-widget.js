'use strict'

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    Point2D, Dimension2D
} from "../jslib/geometry.js";
import {
    DAnimator,
    DImage, DStaticLayer, getDrawPlatform, setDrawPlatform
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
    DWidget, DPopup, DIconMenu, DIconMenuItem, DPushButton, DDice, DIndicator, DInsert, DResult, DMask, DScene, DMessage
} from "../jslib/widget.js";


describe("Widget", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
    });

    function createBoardWithWidgetLevel(width, height, viewPortWidth, viewPortHeight) {
        return new DBoard(new Dimension2D(width, height), new Dimension2D(viewPortWidth, viewPortHeight),
            "map", "units", "markers",
            new DStaticLayer("widgets"),
            new DStaticLayer("widget-items"),
            new DStaticLayer("widget-commands"));
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

    it("Checks modal opening and closing", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var level = board.getLevel("widgets");
            let popup = new DPopup(new Dimension2D(100, 150), true);
            board.paint();
            resetDirectives(level);
        when:
            popup.open(board, new Point2D(5, 5));
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "setTransform(1, 0, 0, 1, 55, 80)",
                    "strokeRect(-50, -75, 100, 150)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -75, 100, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(level);
            popup.close();
            board.paint();
        then:
            assert(getDirectives(level, 4)).arrayNotContains([]);
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
            let menu = new DIconMenu(false, icon);
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
            let menu = new DIconMenu(false, icon);
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

    it("Checks icon menu modal mode", () => {
        given:
            DPopup.activate();
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var widgetsLevel = board.getLevel("widgets");
            board.paint();
            resetDirectives(widgetsLevel);
            let icon = new DIconMenuItem("/CBlades/images/icons/menu1.png", "/CBlades/images/icons/menu1-grayed.png",
                0, 0,
                ()=>{ return true });
            let menu = new DIconMenu(true, icon);
            menu.open(board, new Point2D(5, 5));
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "setTransform(1, 0, 0, 1, 40, 40)",
                    "strokeRect(-35, -35, 70, 70)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-35, -35, 70, 70)",
                "restore()"
            ]);
   });

    it("Checks pushButton widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            resetDirectives(commandsLevel);
            let pushButton = new DPushButton(
                "/CBlades/images/commands/button1.png",
                "/CBlades/images/commands/button1-inactive.png",
                new Point2D(60, 60), ()=>{return true;});
            pushButton.setOnBoard(board);
            loadAllImages();
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1.png, 35, 35, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            pushButton.setPosition(new Point2D(-69, -60));
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1.png, 406, 215, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks pushButton item behavior", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            resetDirectives(commandsLevel);
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
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1.png, 35, 35, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(commandsLevel);
            event = createEvent("mousemove", {offsetX:buttonVPLocation.x+100, offsetY:buttonVPLocation.y+100});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1.png, 35, 35, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(commandsLevel);
            event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
    });

    it("Checks inactive pushButton item behavior", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            resetDirectives(commandsLevel);
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
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(pushButton.active).isFalse();
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1-inactive.png, 35, 35, 50, 50)",
                "restore()"
            ]);
        when: // mouse outside icon
            resetDirectives(commandsLevel);
            event = createEvent("mousemove", {offsetX:buttonVPLocation.x+100, offsetY:buttonVPLocation.y+100});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1-inactive.png, 35, 35, 50, 50)",
                "restore()"
            ]);
        when: // click icon once: icon action returns false => menu is not closed
            resetDirectives(commandsLevel);
            event = createEvent("click", {offsetX:buttonVPLocation.x, offsetY:buttonVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isFalse();
    });

    it("Checks pushButton animation", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
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
            resetDirectives(commandsLevel);
            executeTimeouts();
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.9686, -0.2487, 0.2487, 0.9686, -13.0364, 16.8064)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/commands/button1.png, 35, 35, 50, 50)",
                "restore()"
            ]);
    });

    function executeAllAnimations(level) {
        var directives = [];
        while(DAnimator.isActive()) {
            resetDirectives(level);
            executeTimeouts();
            let lastDirectives = getDirectives(level);
            if (lastDirectives.length) directives = lastDirectives;
        }
        return directives;
    }

    it("Checks dice widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var itemsLevel = board.getLevel("widget-items");
            board.paint();
            let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
            let finished = false;
            dice.setFinalAction(()=>{finished = true;})
            loadAllImages();
        when:
            resetDirectives(itemsLevel);
            dice.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -10, -54.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -70, 5.5, 100, 89)",
                "restore()"
            ]);
        when:
            resetDirectives(itemsLevel);
            for (let index=0; index<40; index++) {
                getDrawPlatform().setRandoms(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
            }
            var diceVPLocation = dice.trigger[0].viewportLocation;
            var event = createEvent("click", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
            executeTimeouts();
        then:
            assert(dice.active).isTrue();
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.309, 0.9511, -0.9511, -0.309, 23.829, -77.3128)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d3.png, -10, -74.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(-0.3256, -0.9455, 0.9455, -0.3256, -15.3321, -0.9363)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -58, -39.5, 100, 89)",
                "restore()"]);
        when:
            var directives = executeAllAnimations(itemsLevel);
        then:
            assert(finished).isTrue();
            assert(directives).arrayEqualsTo([
                "save()", "resetTransform()", "clearRect(0, 0, 500, 300)", "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -10, -54.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -70, 5.5, 100, 89)",
                "restore()"
            ]);
            assert(dice.result).arrayEqualsTo([1, 2]);
        when: // Dice still active : images have red shadow
            resetDirectives(itemsLevel);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -10, -54.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -70, 5.5, 100, 89)",
                "restore()"
            ]);
        when: // Inactivation : shadows become black
            resetDirectives(itemsLevel);
            dice.active = false;
            board.paint();
        then:
            assert(dice.active).isFalse();
            assert(getDirectives(itemsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -10, -54.5, 100, 89)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -70, 5.5, 100, 89)",
                "restore()"
            ]);
        when: // Dice not active : dice are not redrawn
            resetDirectives(itemsLevel);
            event = createEvent("mousemove", {offsetX:diceVPLocation.x, offsetY:diceVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(itemsLevel)).arrayEqualsTo([]);
        when:
            dice.close();
            board.paint();
        then:
            assert(getDirectives(itemsLevel)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 500, 300)",
                "restore()"]);
    });

    it("Checks indicator widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var widgetsLevel = board.getLevel("widgets");
            board.paint();
            let indicator = new DIndicator(["/CBlades/images/indicators/indicator1.png"], new Dimension2D(50, 50));
            loadAllImages();
        when:
            resetDirectives(widgetsLevel);
            indicator.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/indicators/indicator1.png, -15, -5, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLevel);
            indicator.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks insert widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var widgetsLevel = board.getLevel("widgets");
            board.paint();
            let insert = new DInsert("/CBlades/images/inserts/insert.png", new Dimension2D(200, 190));
            loadAllImages();
        when:
            resetDirectives(widgetsLevel);
            insert.open(board, new Point2D(10, 20));
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #000000", "shadowBlur = 10",
                "drawImage(/CBlades/images/inserts/insert.png, -90, -75, 200, 190)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLevel);
            insert.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks success result widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            let result = new DResult().success();
            loadAllImages();
        when:
            resetDirectives(commandsLevel);
            result.open(board, new Point2D(10, 20));
            result.show();
            var resultVPLocation = result.trigger.viewportLocation;
            board.paint();
        then:
            assert(result.finished).isTrue();
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "globalAlpha = 0",
                    "drawImage(/CBlades/images/dice/success.png, -65, -55, 150, 150)",
                "restore()"]);
        when:
            var directives = executeAllAnimations(commandsLevel);
        then:
            assert(directives).arrayEqualsTo([
                "save()", "resetTransform()", "clearRect(0, 0, 500, 300)", "restore()",
                "save()",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00FF00", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/success.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when: // Activation shadow
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #00A000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/success.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            result.close();
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks failure result widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            let result = new DResult().failure();
            loadAllImages();
        when:
            resetDirectives(commandsLevel);
            result.open(board, new Point2D(10, 20));
            result.show();
            var resultVPLocation = result.trigger.viewportLocation;
            board.paint();
        then:
            assert(result.finished).isTrue();
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "globalAlpha = 0",
                "drawImage(/CBlades/images/dice/failure.png, -65, -55, 150, 150)",
                "restore()"]);
        when:
            var directives = executeAllAnimations(commandsLevel);
        then:
            assert(directives).arrayEqualsTo([
                "save()", "resetTransform()", "clearRect(0, 0, 500, 300)", "restore()",
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when: // Acivation shadow
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #FF0000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when: // Acivation shadow
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, -65, -55, 150, 150)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            result.close();
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks result widget final action", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            let clicked = false;
            let result = new DResult().success().setFinalAction(()=>{
                clicked = true;
                result.close();
            });
            result.open(board, new Point2D(10, 20));
            result.show();
            var resultVPLocation = result.trigger.viewportLocation;
        when:
            var event = createEvent("click", {offsetX:resultVPLocation.x, offsetY:resultVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
        when: // Test animation when widget is closed
            var directives = executeAllAnimations(commandsLevel);
        then:
            assert(directives).arrayEqualsTo([]);
    });




    it("Checks message widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            let message = new DMessage();
            loadAllImages();
        when:
            resetDirectives(commandsLevel);
            message.open(board, new Point2D(10, 20));
            message.show("12");
            var messageVPLocation = message.trigger.viewportLocation;
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "globalAlpha = 0", "drawImage(/CBlades/images/dice/message.png, -65, -55, 150, 150)",
                "restore()",
                "save()",
                    "font = 90px serif", "textAlign = center",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 10, 50)",
                    "fillStyle = #8080FF", "fillText(12, 10, 50)",
                "restore()"
            ]);
        when:
            var directives = executeAllAnimations(commandsLevel);
        then:
            assert(directives).arrayEqualsTo([
                "save()",
                    "resetTransform()", "clearRect(0, 0, 500, 300)",
                "restore()",
                "save()",
                    "drawImage(/CBlades/images/dice/message.png, -65, -55, 150, 150)",
                "restore()",
                "save()",
                    "font = 90px serif", "textAlign = center",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF",
                    "lineWidth = 3", "strokeText(12, 10, 50)",
                    "fillStyle = #8080FF", "fillText(12, 10, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #00FFFF", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/message.png, -65, -55, 150, 150)",
                "restore()",
                "save()",
                    "font = 90px serif", "textAlign = center",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 10, 50)",
                    "fillStyle = #8080FF",
                    "fillText(12, 10, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            var event = createEvent("mousemove", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y+150});
            mockPlatform.dispatchEvent(board.root, "mousemove", event);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #A0FFFF", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/message.png, -65, -55, 150, 150)",
                "restore()",
                "save()",
                    "font = 90px serif", "textAlign = center",
                    "shadowColor = #000000", "shadowBlur = 5",
                    "strokeStyle = #0000FF", "lineWidth = 3",
                    "strokeText(12, 10, 50)",
                    "fillStyle = #8080FF",
                    "fillText(12, 10, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            message.close();
            board.paint();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks message widget final action", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var commandsLevel = board.getLevel("widget-commands");
            board.paint();
            let min, max;
            let message = new DMessage().setFinalAction((...values)=>{
                min = Math.min(...values);
                max = Math.max(...values);
                message.close();
            });
            message.open(board, new Point2D(10, 20));
            message.show("12", 1, 2, 3);
            var messageVPLocation = message.trigger.viewportLocation;
        when:
            var event = createEvent("click", {offsetX:messageVPLocation.x, offsetY:messageVPLocation.y});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(min).equalsTo(1);
            assert(max).equalsTo(3);
        when: // Test animation when widget is closed
            var directives = executeAllAnimations(commandsLevel);
        then:
            assert(directives).arrayEqualsTo([]);
    });

    it("Checks mask widget", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var widgetsLevel = board.getLevel("widgets");
            board.paint();
            let clicked = false;
            let mask = new DMask("#0F0F0F", 0.2).setAction(()=>{
                clicked = true;
                mask.close();
            });
            loadAllImages();
        when:
            resetDirectives(widgetsLevel);
            mask.open(board);
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.2",
                    "fillStyle = #0F0F0F",
                    "fillRect(0, 0, 500, 300)",
                    "restore()"
                ]);
        when:
            resetDirectives(widgetsLevel);
            var event = createEvent("click", {offsetX:1, offsetY:1});
            mockPlatform.dispatchEvent(board.root, "click", event);
        then:
            assert(clicked).isTrue();
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
    });

    it("Checks scene facility", () => {
        given:
            var board = createBoardWithWidgetLevel(1000, 600, 500, 300);
            var widgetsLevel = board.getLevel("widgets");
            board.paint();
            let indicator1 = new DIndicator(["/CBlades/images/indicators/indicator1.png"], new Dimension2D(50, 50));
            let indicator2 = new DIndicator(["/CBlades/images/indicators/indicator2.png"], new Dimension2D(70, 80));
            let scene = new DScene()
                .addWidget(indicator1, new Point2D(0, -100))
                .addWidget(indicator2, new Point2D(0, 100));
            loadAllImages();
        when:
            resetDirectives(widgetsLevel);
            scene.open(board, new Point2D(10, 10)); // near a border to trigger adjustement
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/indicators/indicator1.png, 15, 5, 50, 50)",
                "restore()",
                "save()",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/indicators/indicator2.png, 5, 190, 70, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLevel);
            scene.close();
            board.paint();
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
    });

});