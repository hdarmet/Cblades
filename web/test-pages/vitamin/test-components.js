'use strict';

import {
    describe, it, before, assert
} from "../../jstest/jtest.js";
import {
    getDrawPlatform,
    setDrawPlatform
} from "../../jslib/board/draw.js";
import {
    createEvent,
    mockPlatform
} from "../board/mocks.js";
import {
    A, UL, OL, Nav, Button, Div, Form,
    Label, Span, P, Blockquote, I, TR,
    Table, Thead, TBody, TH, TD, LI, Enum,
    Radio, Checkbox, Img,
    Select, Option, Input, TextArea, Password,
    DComponent, DComposed, isComponent, addKeyboardEventListener, UndoRedo,
    isImageURL, isImageFile, getUniqueId, replaceSelectedText, requestLog
} from "../../jslib/vitamin/components.js";

describe("components fundamentals", ()=> {

    var root;

    before(() => {
        setDrawPlatform(mockPlatform);
        addKeyboardEventListener();
        root = getDrawPlatform().createElement('html');
    });

    it("Checks components basic features", () => {
        when:
            var component = new DComponent("div");
            getDrawPlatform().appendChild(root, component.root);
            component.setAttribute("lang", "fr");
            component.setAttribute("title", "Title of the div");
            component.addClass("class-div");
            component.addClass("strong-class");
            component.setWidth("1000px");
            component.setHeight("800px");
            component.setBorder("1px solid black");
            component.setText("Content of the div");
            component.setColor("red");
            component.setFloating("right");
            component.setOverflow("hidden");
            component.setAlt("div to test");
            component.setId("123");
            component.setType("none");
            component.setName("divtest");
        then:
            assert(component.getAttribute("lang")).equalsTo("fr");
            assert(component.getStyle("width")).equalsTo("1000px");
            assert(component.getWidth()).equalsTo("1000px");
            assert(component.getHeight()).equalsTo("800px");
            assert(component.getBorder()).equalsTo("1px solid black");
            assert(component.getHeight()).equalsTo("800px");
            assert(component.getColor()).equalsTo("red");
            assert(component.getFloating()).equalsTo("right");
            assert(component.getOverflow()).equalsTo("hidden");
            assert(component.containsClass("class-div")).isTrue();
            assert(component.containsClass("class-p")).isFalse();
            assert(component.getClasses()).arrayEqualsTo(["class-div", "strong-class"]);
            assert(component.getText()).equalsTo("Content of the div");
            assert(component.getAlt()).equalsTo("div to test");
            assert(component.getId()).equalsTo("123");
            assert(component.getType()).equalsTo("none");
            assert(component.getName()).equalsTo("divtest");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style='width:1000px;height:800px;border:1px solid black;background-color:red;float:right;overflow:hidden;' lang='fr' title='Title of the div' class='class-div strong-class' alt='div to test' id='123' type='none' name='divtest'>\n" +
                "\t\tContent of the div\n" +
                "\t</div>\n" +
                "</html>\n");
            assert(component.getInnerHTML()).equalsTo("Content of the div");
        when:
            component.removeAttribute("title");
            component.removeClass("class-div");
        then:
            assert(component.getAttribute("title")).isNotDefined();
            assert(component.containsClass("class-div")).isFalse();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style='width:1000px;height:800px;border:1px solid black;background-color:red;float:right;overflow:hidden;' lang='fr' class='strong-class' alt='div to test' id='123' type='none' name='divtest'>\n" +
                "\t\tContent of the div\n" +
                "\t</div>\n" +
                "</html>\n");
        when:
            component.root.offsetHeight = 100;
            component.root.offsetWidth = 200;
            component.root.offsetTop = 50;
            component.root.offsetLeft = 30;
        then:
            assert(component.offsetHeight).equalsTo(100);
            assert(component.offsetWidth).equalsTo(200);
            assert(component.offsetTop).equalsTo(50);
            assert(component.offsetLeft).equalsTo(30);
    });

    it("Checks components events features", () => {
        given:
            var component = new DComponent("div");
            getDrawPlatform().appendChild(root, component.root);
        when:
            var clicked = false;
            component.onEvent("click", e => {
                clicked = true;
            });
            var event = createEvent("click", {offsetX: 0, offsetY: 0});
            mockPlatform.dispatchEvent(component.root, "click", event);
        then:
            assert(clicked).isTrue();
        when:
            clicked = false;
            component.onEvent("click", e => {
            });
            mockPlatform.dispatchEvent(component.root, "click", event);
        then:
            assert(clicked).isFalse();
        when:
            component.onMouseClick(e => {
                clicked = true;
            });
            var event = createEvent("click", {offsetX: 0, offsetY: 0});
            mockPlatform.dispatchEvent(component.root, "click", event);
        then:
            assert(clicked).isTrue();
        when:
            var change = false;
            component.onChange(e => {
                change = true;
            });
            var event = createEvent("change", {offsetX: 0, offsetY: 0});
            mockPlatform.dispatchEvent(component.root, "change", event);
        then:
            assert(change).isTrue();
        when:
            var input = false;
            component.onInput(e => {
                input = true;
            });
            var event = createEvent("input", {offsetX: 0, offsetY: 0});
            mockPlatform.dispatchEvent(component.root, "input", event);
        then:
            assert(input).isTrue();
    });

    it("Checks isComponent", () => {
        when:
            var div = new DComposed("div");
        then:
            assert(isComponent({})).isFalse();
            assert(isComponent(div)).isTrue();
    });

    it("Checks composition features", () => {
        when:
            var div = new DComposed("div");
            getDrawPlatform().appendChild(root, div.root);
            var p1 = new DComponent("p").setText("p1");
            div.add(p1);
        then:
            assert(p1.getParent()).equalsTo(div);
            assert(getDrawPlatform().innerHtml(root)).equalsTo(
                "<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp1\n" +
                "\t\t</p>\n" +
                "\t</div>\n" +
                "</html>\n"
            );
        when:
            var p0 = new DComponent("p").setText("p0");
            var p2 = new DComponent("p").setText("p2");
            div.add(p2);
            div.insert(p0, p1);
        then:
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp0\n" +
                "\t\t</p>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp1\n" +
                "\t\t</p>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp2\n" +
                "\t\t</p>\n" +
                "\t</div>\n" +
                "</html>\n"
            );
        when:
            div.remove(p1);
        then:
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp0\n" +
                "\t\t</p>\n" +
                "\t\t<p style=''>\n" +
                "\t\t\tp2\n" +
                "\t\t</p>\n" +
                "\t</div>\n" +
                "</html>\n");
            assert(div.contains(p0)).isTrue();
            assert(div.contains(p1)).isFalse();
            assert(div.children).arrayEqualsTo([p0, p2]);
        when:
            div.clear();
        then:
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t</div>\n" +
                "</html>\n");
    });

    it("Checks composition features", () => {
        when:
            var div = new DComposed("div");
            getDrawPlatform().appendChild(root, div.root);
            var p0 = new DComposed("p");
            var p1 = new DComponent("p");
            p0.add(p1);
            p1._added = () => p1._isAdded = true;
            p1._removed = () => p1._isRemoved = true;
            assert(p1._isAdded).isNotDefined();
            assert(p1._isRemoved).isNotDefined();
            div.add(p0);
        then:
            assert(p1._isAdded).isTrue();
            assert(p1._isRemoved).isNotDefined();
        when:
            div.remove(p0);
        then:
            assert(p1._isAdded).isTrue();
            assert(p1._isRemoved).isTrue();
    });

    it("Checks composition features", () => {
        given:
            var div = new DComposed("div");
            var elem = getDrawPlatform().createElement("span");
            getDrawPlatform().appendChild(div.root, elem);
            div._childrenAnchor = () => elem;
        when:
            var p1 = new DComponent("p");
            div.add(p1);
        then:
            assert(p1.getParent()).equalsTo(div);
    });

    it("Checks A element features", () => {
        when:
            var link = new A("Click me", "https://www.example.com");
            getDrawPlatform().appendChild(root, link.root);
        then:
            assert(link.getText()).equalsTo("Click me");
            assert(link.getHref()).equalsTo("https://www.example.com");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<a style='' href='https://www.example.com'>\n" +
                "\t\tClick me\n" +
                "\t</a>\n" +
                "</html>\n");
        when:
            link.setHref("https://www.new-example.com");
            link.setText("New text");
        then:
            assert(link.getText()).equalsTo("New text");
            assert(link.getHref()).equalsTo("https://www.new-example.com");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<a style='' href='https://www.new-example.com'>\n" +
                "\t\tNew text\n" +
                "\t</a>\n" +
                "</html>\n");
    });

    it("Checks LI element features", () => {
        when:
            var li = new LI("one option");
            getDrawPlatform().appendChild(root, li.root);
        then:
            assert(li.getText()).equalsTo("one option");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<li style=''>\n" +
                "\t\tone option\n" +
                "\t</li>\n" +
                "</html>\n");
    });

    it("Checks UL element features", () => {
        when:
            // Create a new UL element
            var lines = new UL();
            getDrawPlatform().appendChild(root, lines.root);
        then:
            // Check that the UL element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ul style=''>\n" +
                "\t</ul>\n" +
                "</html>\n");
        when:
            // Create and add some LI elements to the UL
            var listItem1 = new LI("Item 1");
            var listItem2 = new LI("Item 2");
            lines.add(listItem1).add(listItem2);
        then:
            // Check that the UL now contains the LI elements
            assert(lines.children.length).equalsTo(2);
            assert(lines.contains(listItem1)).isTrue();
            assert(lines.contains(listItem2)).isTrue();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ul style=''>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 1\n" +
                "\t\t</li>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 2\n" +
                "\t\t</li>\n" +
                "\t</ul>\n" +
                "</html>\n");
        when:
            // Remove an LI element from the UL
            lines.remove(listItem1);
        then:
            // Check that the LI element has been removed
            assert(lines.children.length).equalsTo(1);
            assert(lines.contains(listItem1)).isFalse();
            assert(lines.contains(listItem2)).isTrue();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ul style=''>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 2\n" +
                "\t\t</li>\n" +
                "\t</ul>\n" +
                "</html>\n");
        when:
            // Clear all LI elements from the UL
            lines.clear();
        then:
            // Check that the UL is now empty
            assert(lines.children.length).equalsTo(0);
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ul style=''>\n" +
                "\t</ul>\n" +
                "</html>\n");
    });

    it("Checks OL element features", () => {
        when:
            // Create a new OL element
            var lines = new OL();
            getDrawPlatform().appendChild(root, lines.root);
        then:
            // Check that the UL element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ol style=''>\n" +
                "\t</ol>\n" +
                "</html>\n");
        when:
            // Create and add some LI elements to the UL
            var listItem1 = new LI("Item 1");
            var listItem2 = new LI("Item 2");
            lines.add(listItem1).add(listItem2);
        then:
            // Check that the UL now contains the LI elements
            assert(lines.children.length).equalsTo(2);
            assert(lines.contains(listItem1)).isTrue();
            assert(lines.contains(listItem2)).isTrue();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ol style=''>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 1\n" +
                "\t\t</li>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 2\n" +
                "\t\t</li>\n" +
                "\t</ol>\n" +
                "</html>\n");
        when:
            // Remove an LI element from the UL
            lines.remove(listItem1);
        then:
            // Check that the LI element has been removed
            assert(lines.children.length).equalsTo(1);
            assert(lines.contains(listItem1)).isFalse();
            assert(lines.contains(listItem2)).isTrue();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ol style=''>\n" +
                "\t\t<li style=''>\n" +
                "\t\t\tItem 2\n" +
                "\t\t</li>\n" +
                "\t</ol>\n" +
                "</html>\n");
        when:
            // Clear all LI elements from the UL
            lines.clear();
        then:
            // Check that the UL is now empty
            assert(lines.children.length).equalsTo(0);
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<ol style=''>\n" +
                "\t</ol>\n" +
                "</html>\n");
    });

    it("Checks Nav element features", () => {
        when:
            // Create a new Nav element
            var nav = new Nav();
            getDrawPlatform().appendChild(root, nav.root);
        then:
            // Check that the Nav element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<nav style=''>\n" +
                "\t</nav>\n" +
                "</html>\n");
    });

    it("Checks Button element features", () => {
        when:
            // Create a new Button element
            var button = new Button("Click Me");
            getDrawPlatform().appendChild(root, button.root);
        then:
            // Check that the Button element has the correct text
            assert(button.getText()).equalsTo("Click Me");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<button style=''>\n" +
                "\t\tClick Me\n" +
                "\t</button>\n" +
                "</html>\n");
        when:
            // Change the text of the button
            button.setText("New Text");
        then:
            // Check that the text has been updated
            assert(button.getText()).equalsTo("New Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<button style=''>\n" +
                "\t\tNew Text\n" +
                "\t</button>\n" +
                "</html>\n");
    });

    it("Checks Div element features", () => {
        when:
            // Create a new Div element
            var div = new Div("Initial Text");
            getDrawPlatform().appendChild(root, div.root);
        then:
            // Check that the Div element has the correct initial text
            assert(div.getText()).equalsTo("Initial Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\tInitial Text\n" +
                "\t</div>\n" +
                "</html>\n");
        when:
            // Change the text of the div
            div.setText("Updated Text");
        then:
            // Check that the text has been updated
            assert(div.getText()).equalsTo("Updated Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\tUpdated Text\n" +
                "\t</div>\n" +
                "</html>\n");
        when:
            // Create a new empty Div element
            var emptyDiv = new Div();
            getDrawPlatform().appendChild(root, emptyDiv.root);
        then:
            // Check that the empty Div element has no text
            assert(emptyDiv.getText()).equalsTo("");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<div style=''>\n" +
                "\t\tUpdated Text\n" +
                "\t</div>\n" +
                "\t<div style=''>\n" +
                "\t</div>\n" +
                "</html>\n");
    });

    it("Checks Form element features", () => {
        when:
            // Create a new Form element
            var form = new Form();
            getDrawPlatform().appendChild(root, form.root);
        then:
            // Check that the Form element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<form style=''>\n" +
                "\t</form>\n" +
                "</html>\n");
    });

    it("Checks Label element features", () => {
        when:
            // Create a new Label element
            var label = new Label("My Label");
            getDrawPlatform().appendChild(root, label.root);
        then:
            // Check that the Label element has the correct text
            assert(label.getText()).equalsTo("My Label");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<label style=''>\n" +
                "\t\tMy Label\n" +
                "\t</label>\n" +
                "</html>\n");
        when:
            // Set the 'for' attribute of the label
            label.setFor("myInput");
        then:
            // Check that the 'for' attribute has been set correctly
            assert(label.getFor()).equalsTo("myInput");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<label style='' for='myInput'>\n" +
                "\t\tMy Label\n" +
                "\t</label>\n" +
                "</html>\n");
    });

    it("Checks Span element features", () => {
        when:
            // Create a new Span element
            var span = new Span("My Span");
            getDrawPlatform().appendChild(root, span.root);
        then:
            // Check that the Span element has the correct text
            assert(span.getText()).equalsTo("My Span");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<span style=''>\n" +
                "\t\tMy Span\n" +
                "\t</span>\n" +
                "</html>\n");
        when:
            // Change the text of the span
            span.setText("New Span Text");
        then:
            // Check that the text has been updated
            assert(span.getText()).equalsTo("New Span Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<span style=''>\n" +
                "\t\tNew Span Text\n" +
                "\t</span>\n" +
                "</html>\n");
    });

    it("Checks P element features", () => {
        when:
            // Create a new P element
            var p = new P("My Paragraph");
            getDrawPlatform().appendChild(root, p.root);
        then:
            // Check that the P element has the correct text
            assert(p.getText()).equalsTo("My Paragraph");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<p style=''>\n" +
                "\t\tMy Paragraph\n" +
                "\t</p>\n" +
                "</html>\n");
        when:
            // Change the text of the paragraph
            p.setText("New Paragraph Text");
        then:
            // Check that the text has been updated
            assert(p.getText()).equalsTo("New Paragraph Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<p style=''>\n" +
                "\t\tNew Paragraph Text\n" +
                "\t</p>\n" +
                "</html>\n");
    });

    it("Checks Blockquote element features", () => {
        when:
            // Create a new Blockquote element
            var blockquote = new Blockquote("My Blockquote");
            getDrawPlatform().appendChild(root, blockquote.root);
        then:
            // Check that the Blockquote element has the correct text
            assert(blockquote.getText()).equalsTo("My Blockquote");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<blockquote style=''>\n" +
                "\t\tMy Blockquote\n" +
                "\t</blockquote>\n" +
                "</html>\n");
        when:
            // Change the text of the blockquote
            blockquote.setText("New Blockquote Text");
        then:
            // Check that the text has been updated
            assert(blockquote.getText()).equalsTo("New Blockquote Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<blockquote style=''>\n" +
                "\t\tNew Blockquote Text\n" +
                "\t</blockquote>\n" +
                "</html>\n");
    });

    it("Checks I element features", () => {
        when:
            // Create a new I element
            var i = new I("home");
            getDrawPlatform().appendChild(root, i.root);
        then:
            // Check that the I element has the correct class
            assert(i.containsClass("fa fa-home")).isTrue();
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<i style='' class='fa fa-home'>\n" +
                "\t</i>\n" +
                "</html>\n");
    });

    it("Checks TR element features", () => {
        when:
            // Create a new TR element
            var tr = new TR();
            getDrawPlatform().appendChild(root, tr.root);
        then:
            // Check that the TR element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<tr style=''>\n" +
                "\t</tr>\n" +
                "</html>\n");
    });

    it("Checks Table element features", () => {
        when:
            // Create a new Table element
            var table = new Table();
            getDrawPlatform().appendChild(root, table.root);
        then:
            // Check that the Table element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t</table>\n" +
                "</html>\n");
    });

    it("Checks Thead element features within a table structure", () => {
        when:
            // Create a new Table element
            var table = new Table();
            getDrawPlatform().appendChild(root, table.root);
            // Create a new Thead element
            var thead = new Thead();
            table.add(thead);
        then:
            // Check that the Thead element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<thead style=''>\n" +
                "\t\t</thead>\n" +
                "\t</table>\n" +
                "</html>\n");
            // Create a new TR element for the header row
            var headerRow = new TR();
            thead.add(headerRow);
            // Create a new TH element
            var th = new TH("My Header");
            headerRow.add(th);
        then:
            // Check that the Thead element contains the TH element
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<thead style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<th style=''>\n" +
                "\t\t\t\t\tMy Header\n" +
                "\t\t\t\t</th>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</thead>\n" +
                "\t</table>\n" +
                "</html>\n");
    });

    it("Checks TBody element features within a table structure", () => {
        when:
            // Create a new Table element
            var table = new Table();
            getDrawPlatform().appendChild(root, table.root);
            // Create a new TBody element
            var tbody = new TBody();
            table.add(tbody);
        then:
            // Check that the TBody element is initially empty
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<tbody style=''>\n" +
                "\t\t</tbody>\n" +
                "\t</table>\n" +
                "</html>\n");
            // Create a new TR element for the body row
            var bodyRow = new TR();
            tbody.add(bodyRow);
            // Create a new TD element
            var td = new TD("My Data");
            bodyRow.add(td);
        then:
            // Check that the TBody element contains the TD element
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<tbody style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<td style=''>\n" +
                "\t\t\t\t\tMy Data\n" +
                "\t\t\t\t</td>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</tbody>\n" +
                "\t</table>\n" +
                "</html>\n");
    });

    it("Checks TH element features within a table structure", () => {
        when:
            // Create a new Table element
            var table = new Table();
            getDrawPlatform().appendChild(root, table.root);
            // Create a new Thead element
            var thead = new Thead();
            table.add(thead);
            // Create a new TR element for the header row
            var headerRow = new TR();
            thead.add(headerRow);
            // Create a new TH element
            var th = new TH("My Header");
            headerRow.add(th);
        then:
            // Check that the TH element has the correct text
            assert(th.getText()).equalsTo("My Header");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<thead style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<th style=''>\n" +
                "\t\t\t\t\tMy Header\n" +
                "\t\t\t\t</th>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</thead>\n" +
                "\t</table>\n" +
                "</html>\n");
        when:
            // Change the text of the header
            th.setText("New Header Text");
        then:
            // Check that the text has been updated
            assert(th.getText()).equalsTo("New Header Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<thead style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<th style=''>\n" +
                "\t\t\t\t\tNew Header Text\n" +
                "\t\t\t\t</th>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</thead>\n" +
                "\t</table>\n" +
                "</html>\n");
    });

    it("Checks TD element features within a table structure", () => {
        when:
            // Create a new Table element
            var table = new Table();
            getDrawPlatform().appendChild(root, table.root);
            // Create a new TBody element
            var tbody = new TBody();
            table.add(tbody);
            // Create a new TR element for the body row
            var bodyRow = new TR();
            tbody.add(bodyRow);
            // Create a new TD element
            var td = new TD("My Data");
            bodyRow.add(td);
        then:
            // Check that the TD element has the correct text
            assert(td.getText()).equalsTo("My Data");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<tbody style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<td style=''>\n" +
                "\t\t\t\t\tMy Data\n" +
                "\t\t\t\t</td>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</tbody>\n" +
                "\t</table>\n" +
                "</html>\n");
        when:
            // Change the text of the data cell
            td.setText("New Data Text");
        then:
            // Check that the text has been updated
            assert(td.getText()).equalsTo("New Data Text");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<table style=''>\n" +
                "\t\t<tbody style=''>\n" +
                "\t\t\t<tr style=''>\n" +
                "\t\t\t\t<td style=''>\n" +
                "\t\t\t\t\tNew Data Text\n" +
                "\t\t\t\t</td>\n" +
                "\t\t\t</tr>\n" +
                "\t\t</tbody>\n" +
                "\t</table>\n" +
                "</html>\n");
    });

    it("Checks Option element features within a select structure", () => {
        when:
            // Create a new Select element
            var select = new Select();
            getDrawPlatform().appendChild(root, select.root);
            // Create a new Option element
            var option = new Option("option1", "Option 1").addClass('select-option');
            select.add(option);
        then:
            // Check that the Option element has the correct value and text
            assert(option.getValue()).equalsTo("option1");
            assert(option.getText()).equalsTo("Option 1");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<select style=''>\n" +
                "\t\t<option style='' value='option1' class='select-option'>\n" +
                "\t\t\tOption 1\n" +
                "\t\t</option>\n" +
                "\t</select>\n" +
                "</html>\n");
    });

    it("Checks Select element features with options", () => {
        when:
            // Create a new Select element
            var select = new Select();
            getDrawPlatform().appendChild(root, select.root);
            select.setOptions([{value: "value1", text: "Option 1"}, {value: "value2", text: "Option 2"}]);
            select.setValue("value1");
            select.setDisabled(true);
        then:
            assert(select.isInput).isTrue();
            assert(select.getDisabled()).isTrue();
            assert(select.getValue()).equalsTo("value1");
            // Check that the Select now contains the Option elements
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<select style='' value='value1' disabled='true'>\n" +
                "\t\t<option style='' value='value1' class='select-option'>\n" +
                "\t\t\tOption 1\n" +
                "\t\t</option>\n" +
                "\t\t<option style='' value='value2' class='select-option'>\n" +
                "\t\t\tOption 2\n" +
                "\t\t</option>\n" +
                "\t</select>\n" +
                "</html>\n");
            assert(select.getOptions()).arraySameTo([{value: "value1", text: "Option 1"}, {
                value: "value2",
                text: "Option 2"
            }]);
        when:
            select.setDisabled(false);
        then:
            assert(select.getDisabled()).isFalse();
            // Check that the Select now contains the Option elements
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<select style='' value='value1'>\n" +
                "\t\t<option style='' value='value1' class='select-option'>\n" +
                "\t\t\tOption 1\n" +
                "\t\t</option>\n" +
                "\t\t<option style='' value='value2' class='select-option'>\n" +
                "\t\t\tOption 2\n" +
                "\t\t</option>\n" +
                "\t</select>\n" +
                "</html>\n");
    });

    it("Checks Enum element features", () => {
        when:
            // Create a new Enum element
            var enumElement = new Enum("value1");
            enumElement.setOptions([
                {value: "value1", text: "Option 1"},
                {value: "value2", text: "Option 2"},
                {value: "value3", text: "Option 3"}
            ]);
            getDrawPlatform().appendChild(root, enumElement.root);
        then:
            // Check that the Enum element has the correct name and options
            assert(enumElement.getValue()).equalsTo("value1");
            assert(enumElement.getOptions()).arraySameTo([
                {value: "value1", text: "Option 1"},
                {value: "value2", text: "Option 2"},
                {value: "value3", text: "Option 3"}
            ]);
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<span style=''>\n" +
                "\t\tOption 1\n" +
                "\t</span>\n" +
                "</html>\n");
        when:
            // Change the selected option
            enumElement.setValue("value2");
        then:
            // Check that the selected option has been updated
            assert(enumElement.getValue()).equalsTo("value2");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<span style=''>\n" +
                "\t\tOption 2\n" +
                "\t</span>\n" +
                "</html>\n");
    });

    it("Checks Input element features", () => {
        when:
            // Create a new Input element
            var input = new Input();
            getDrawPlatform().appendChild(root, input.root);
        then:
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<input style=''>\n" +
                "\t</input>\n" +
                "</html>\n");
            assert(input.isInput).isTrue();
        when:
            input.setChecked(true);
        then:
            assert(input.getChecked()).isTrue();
        when:
            input.setChecked(false);
        then:
            assert(input.getChecked()).isFalse();
    });

    it("Checks Password element features", () => {
        when:
            // Create a new Password element
            var password = new Password();
            getDrawPlatform().appendChild(root, password.root);
            assert(password.isInput).isTrue();
        then:
            // Check that the Password element has the correct type
            assert(password.getType()).equalsTo("password");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<input style='' type='password'>\n" +
                "\t</input>\n" +
                "</html>\n");
    });

    it("Checks Checkbox element features", () => {
        when:
            // Create a new Password element
            var checkbox = new Checkbox();
            getDrawPlatform().appendChild(root, checkbox.root);
            assert(checkbox.isInput).isTrue();
        then:
            // Check that the Password element has the correct type
            assert(checkbox.getType()).equalsTo("checkbox");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<input style='' type='checkbox'>\n" +
                "\t</input>\n" +
                "</html>\n");
    });

    it("Checks Radio element features", () => {
        when:
            // Create a new Password element
            var radio = new Radio("myRadio");
            getDrawPlatform().appendChild(root, radio.root);
            assert(radio.isInput).isTrue();
        then:
            // Check that the Password element has the correct type
            assert(radio.getType()).equalsTo("radio");
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<input style='' type='radio' name='myRadio'>\n" +
                "\t</input>\n" +
                "</html>\n");
    });

    it("Checks Textarea element features", () => {
        when:
            // Create a new Password element
            var textarea = new TextArea();
            getDrawPlatform().appendChild(root, textarea.root);
            assert(textarea.isInput).isTrue();
        then:
            // Check that the Password element has the correct type
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<textarea style=''>\n" +
                "\t</textarea>\n" +
                "</html>\n");
    });

    it("Checks Img element features", () => {
        when:
            // Create a new Img element
            var imgSrc = "https://via.placeholder.com/150.png"; // Example image URL
            var img = new Img(imgSrc);
            getDrawPlatform().appendChild(root, img.root);
        then:
            // Check that the Img element has the correct src
            assert(img.getSrc()).equalsTo(imgSrc);
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<img style='' src='" + imgSrc + "'>\n" +
                "\t</img>\n" +
                "</html>\n");
        when:
            // Change the src of the image
            var newImgSrc = "https://via.placeholder.com/200.png";
            img.setSrc(newImgSrc);
        then:
            // Check that the src has been updated
            assert(img.getSrc()).equalsTo(newImgSrc);
            assert(getDrawPlatform().innerHtml(root)).equalsTo("<html style=''>\n" +
                "\t<img style='' src='" + newImgSrc + "'>\n" +
                "\t</img>\n" +
                "</html>\n");
        when:
            // Create a new Img element with a load event
            var loadTriggered = false;
            var imgLoad = new Img(newImgSrc, () => {
                loadTriggered = true;
            });
            getDrawPlatform().appendChild(root, imgLoad.root);
        then:
            // Check that the load event is triggered
            assert(loadTriggered).isFalse();
            getDrawPlatform().dispatchEvent(imgLoad.root, "load", {});
            assert(loadTriggered).isTrue();
        when:
            var result = img.getDataURL(newImgSrc, 100, 50);
        then:
            assert(JSON.stringify(result)).equalsTo("{\"URL\":{}}");
        when:
            result = img.getFile(newImgSrc, 100, 50);
        then:
            assert(JSON.stringify(result)).equalsTo("{\"File\":\"https://via.placeholder.com/200.png\",\"filename\":{}}");
    });

    it("Checks Img loading listener", () => {
        given:
            // Create a new Img element
            var imgSrc = "https://via.placeholder.com/150.png"; // Example image URL
            var img = new Img(imgSrc);
            getDrawPlatform().appendChild(root, img.root);
            var loadedImage = null;
            var listener = {
                onImageLoaded(imgRoot) {
                    loadedImage = imgRoot;
                }
            };
            Img.addLoaderListener(listener);
        when:
            img.root.onload();
        then:
            assert(loadedImage).equalsTo(img.root);
        when:
            loadedImage = null;
            Img.removeLoaderListener(listener);
        then:
            assert(loadedImage).isNotDefined();
    });

    it("Checks do/undo features", () => {
        given:
            var valueOne = 0
            var listenerOne = {
                registerValue(value) {
                    this.pvalue = value;
                    return this;
                },
                undo() {
                    this.nvalue = valueOne;
                    valueOne = this.pvalue;
                },
                redo() {
                    valueOne = this.nvalue;
                }
            }
            UndoRedo.addListener(listenerOne.registerValue(valueOne));
        when:
            valueOne = 1;
            var event = createEvent("keydown", {"ctrlKey": true, "key":"z"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(0);
        when:
            event = createEvent("keydown", {"ctrlKey": true, "key":"y"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(1);
        when:
            UndoRedo.removeListener(listenerOne);
            var event = createEvent("keydown", {"ctrlKey": true, "key":"z"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(1);
    });

    it("Checks do/undo suites", () => {
        given:
            var valueOne = 0
            var listenerOne = {
                registerValue(value) {
                    this.pvalue = value;
                    return this;
                },
                undo() {
                    this.nvalue = valueOne;
                    valueOne = this.pvalue;
                },
                redo() {
                    valueOne = this.nvalue;
                }
            }
            UndoRedo.addListener(listenerOne.registerValue(valueOne));
            valueOne = 1;
            var listenerTwo = {
                registerValue(value) {
                    this.pvalue = value;
                    return this;
                },
                undo() {
                    this.nvalue = valueOne;
                    valueOne = this.pvalue;
                },
                redo() {
                    valueOne = this.nvalue;
                }
            }
            UndoRedo.addListener(listenerTwo.registerValue(valueOne));
            valueOne = 2;
        when:
            var event = createEvent("keydown", {"ctrlKey": true, "key":"z"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(1);
        when:
            UndoRedo.removeListener(listenerTwo);
            event = createEvent("keydown", {"ctrlKey": true, "key":"z"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(0);
        when:
            event = createEvent("keydown", {"ctrlKey": true, "key":"y"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(1);
        when:
            UndoRedo.addListener(listenerTwo);
            event = createEvent("keydown", {"ctrlKey": true, "key":"y"});
            mockPlatform.dispatchEvent(mockPlatform.getDocument().body, "keydown", event);
        then:
            assert(valueOne).equalsTo(2);
    });

    it("Checks Image checking methods", () => {
        when:
            var pngUrl = "https://via.placeholder.com/150.png";
            var jpgUrl = "https://via.placeholder.com/150.jpg";
            var xlsUrl = "https://via.placeholder.com/150.xls";
            var noTypeUrl = "https://viaplaceholdercom/150";
        then:
            assert(isImageURL(pngUrl)).isTrue();
            assert(isImageURL(jpgUrl)).isTrue();
            assert(isImageURL(xlsUrl)).isFalse();
            assert(isImageURL(noTypeUrl)).isFalse();
        when:
            var pngFile = { type: "image/png" };
            var jpgFile = { type: "image/jpeg" };
            var xlsFile = { type: "application/vnd.ms-excel" };
            var noTypeFile = { type: "application/vnd.ms-excel" };
        then:
            assert(isImageFile(pngFile)).isTrue();
            assert(isImageFile(jpgFile)).isTrue();
            assert(isImageFile(xlsFile)).isFalse();
            assert(isImageFile(noTypeFile)).isFalse();
    });

    it("Checks unique ID generator", () => {
        then:
            assert(getUniqueId()).equalsTo(0);
            assert(getUniqueId()).equalsTo(1);
            assert(getUniqueId()).equalsTo(2);
    });

    it("Checks Selected Text replacement", () => {
        when:
            var root = {};
            var node = {};
            var contentDeleted = null;
            var nodeInserted = null;
            var startAfter = null;
            var addedRange = null;
            var range = {
                deleteContents() {
                    contentDeleted = true;
                },
                insertNode(node) {
                    nodeInserted = node;
                },
                setStartAfter(node) {
                    startAfter = node;
                }
            }
            getDrawPlatform().setSelection({
                baseNode : {
                    parentNode: root
                },
                rangeCount: 10,
                getRangeAt(first) {
                    return range;
                },
                addRange(range) {
                    addedRange = range;
                }
            });
        when:
            replaceSelectedText(root, node);
        then:
            assert(contentDeleted).isTrue();
            assert(nodeInserted).equalsTo(node);
            assert(startAfter).equalsTo(node);
            assert(addedRange).equalsTo(range);
    });

    it("Checks String Format method", () => {
        then:
            assert(String.format("Hello {0} : {1}, {3}", "World", 2)).equalsTo("Hello World : 2, {3}");
    });

    it("Checks String Format method", () => {
        then:
            requestLog("Something to log");
    });

});

