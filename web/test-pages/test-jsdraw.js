'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    DDraw, DImage, setDrawPlatform, getDrawPlatform, targetPlatform
} from "../jslib/draw.js";

let platform = {

    createElement(tagName) {
        return {tagName, children:[]};
    },

    setAttribute(element, attrName, attrValue) {
        element[attrName] = attrValue;
    },

    appendChild(parent, child) {
        parent.children.push(child);
    },

    getContext(element, contextName) {
        return {host:element, directives:[]};
    },

    rect(context, x, y, w, h) {
        context.directives.push(`rect(${x}, ${y}, ${w}, ${h})`);
    },

    stroke(context) {
        context.directives.push(`stroke()`);
    },

    fill(context) {
        context.directives.push(`fill()`);
    },

    setTransform(context, a, b, c, d, e, f) {
        context.directives.push(`setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`);
    },

    drawImage(context, image, ...params) {
        context.directives.push(`drawImage(${image.src}, ${params.join(', ')})`);
    }

}

describe("App fundamentals", ()=> {

    before(() => {
        setDrawPlatform(platform);
    });

    it("Checks DDraw creation", () => {
        when:
            var draw = new DDraw(500, 300);
        then:
            assert(draw.root.tagName).equalsTo('div');
            assert(draw.root.style).equalsTo("width: 500px; height:300px; border: 1px solid; position: relative");
            assert(draw.width).equalsTo(500);
            assert(draw.height).equalsTo(300);
        when:
            var layer = draw.createLayer("layer1");
        then:
            assert(layer.root.tagName).equalsTo('canvas');
            assert(layer.root.style).equalsTo("position: absolute");
            assert(layer.root.width).equalsTo(500);
            assert(layer.root.height).equalsTo(300);
            assert(layer._context.directives[0]).equalsTo('setTransform(1, 0, 0, 1, 0, 0)');
    });

    function buildBasicDrawWithOneLayerNamedLayer1() {
        let draw = new DDraw(500, 300);
        draw.createLayer("layer1");
        return draw;
    }

    it("Checks rects drawing on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            layer._context.directives = [];
            layer.drawRect(10, 15, 20, 25);
        then:
            assert(layer._context.directives[0]).equalsTo('rect(10, 15, 20, 25)');
            assert(layer._context.directives[1]).equalsTo('stroke()');
        when:
            layer._context.directives = [];
            layer.fillRect(15, 10, 25, 20);
        then:
            assert(layer._context.directives[0]).equalsTo('rect(15, 10, 25, 20)');
            assert(layer._context.directives[1]).equalsTo('fill()');
    });

    it("Checks set transform on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
        var layer = draw.getLayer("layer1");
        when:
            layer._context.directives = [];
            draw.setTransform(6, 5, 4, 3, 2, 1);
        then:
            assert(layer._context.directives[0]).equalsTo('setTransform(6, 5, 4, 3, 2, 1)');
    });

    it("Checks set translate on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
        var layer = draw.getLayer("layer1");
        when:
            layer._context.directives = [];
        draw.setTranslate(10, 15);
        then:
            assert(layer._context.directives[0]).equalsTo('setTransform(1, 0, 0, 1, 10, 15)');
    });

    it("Checks image drawing on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            layer._context.directives = [];
            var image = DImage.getImage("here/where/image.typ");
            layer.drawImage(image, 10, 15);
        then:
            assert(layer._context.directives.length).equalsTo(0);
        when: /* loads the image: the requested draw directive is done then**/
            image._root.onload();
        then:
            assert(layer._context.directives[0]).equalsTo('drawImage(here/where/image.typ, 10, 15)');
        when: /* draw an already loaded image */
            layer._context.directives = [];
            layer.drawImage(image, 15, 10);
        then:
            assert(layer._context.directives[0]).equalsTo('drawImage(here/where/image.typ, 15, 10)');
    });

    it("Checks all methods of the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var rectInvoked = false;
            CanvasRenderingContext2D.prototype.rect = function(...params) {
                assert(params).arrayEqualsTo([10, 15, 20, 25]);
                rectInvoked = true;
            }
            var strokeInvoked = false;
            CanvasRenderingContext2D.prototype.stroke = function(...params) {
                assert(params.length).equalsTo(0);
                strokeInvoked = true;
            }
            var fillInvoked = false;
            CanvasRenderingContext2D.prototype.fill = function(...params) {
                assert(params.length).equalsTo(0);
                fillInvoked = true;
            }
            var drawImageInvoked = false;
            CanvasRenderingContext2D.prototype.drawImage = function(image, ...params) {
                assert(image.src).equalsTo('here/where/image.typ');
                assert(params).arrayEqualsTo([15, 10]);
                drawImageInvoked = true;
            }
        when:
            var draw = new DDraw(500, 300);
        then:
            assert(draw.root).is(HTMLDivElement);
        when:
            var layer = draw.createLayer("layer1");
        then:
            assert(layer.root).is(HTMLCanvasElement);
            assert(layer._context).is(CanvasRenderingContext2D);
        when:
            layer.drawRect(10, 15, 20, 25);
        then:
            assert(rectInvoked).isTrue();
            assert(strokeInvoked).isTrue();
        when:
            var rectInvoked = false;
            layer.fillRect(10, 15, 20, 25);
        then:
            assert(rectInvoked).isTrue();
            assert(fillInvoked).isTrue();
        when:
            var image = {
                draw(layer, ...params) {
                    getDrawPlatform().drawImage(layer._context,{src:'here/where/image.typ'}, ...params);
                }
            }
            layer.drawImage(image, 15, 10);
        then:
            assert(drawImageInvoked).isTrue();
    });
});

