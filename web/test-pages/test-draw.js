'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    DDraw, DImage, setDrawPlatform, getDrawPlatform, targetPlatform
} from "../jslib/draw.js";
import {
    Point2D, Matrix2D, Dimension2D
} from "../jslib/geometry.js";
import {
    mockPlatform, getContextDirectives, resetContextDirectives
} from "./mocks.js";

describe("Drawing fundamentals", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
    });

    function getDirectives(layer) {
        return getContextDirectives(layer._context);
    }
    function resetDirectives(layer) {
        resetContextDirectives(layer._context);
    }

    it("Checks DDraw creation", () => {
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
        then:
            assert(draw.root.tagName).equalsTo('div');
            assert(draw.root.style).equalsTo("width: 500px; height:300px; border: 1px solid; position: relative");
            assert(draw.root.tabindex).equalsTo("0");
            assert(draw.dimension.w).equalsTo(500);
            assert(draw.dimension.h).equalsTo(300);
        when:
            var layer = draw.createLayer("layer1");
        then:
            assert(layer.root.tagName).equalsTo('canvas');
            assert(layer.root.style).equalsTo("position: absolute");
            assert(layer.root.width).equalsTo(500);
            assert(layer.root.height).equalsTo(300);
            assert(layer.draw).equalsTo(draw);
            assert(getDirectives(layer)[0]).equalsTo('setTransform(1, 0, 0, 1, 0, 0)');
    });

    function buildBasicDrawWithOneLayerNamedLayer1() {
        let draw = new DDraw(new Dimension2D(500, 300));
        draw.createLayer("layer1");
        return draw;
    }

    it("Checks rects drawing on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            layer.drawRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(getDirectives(layer)[0]).equalsTo('rect(10, 15, 20, 25)');
            assert(getDirectives(layer)[1]).equalsTo('stroke()');
        when:
            resetDirectives(layer);
            layer.fillRect(new Point2D(15, 10), new Dimension2D(25, 20));
        then:
            assert(getDirectives(layer)[0]).equalsTo('rect(15, 10, 25, 20)');
            assert(getDirectives(layer)[1]).equalsTo('fill()');
    });

    it("Checks set transform on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            draw.setTransform(new Matrix2D(2, 0, 0, 2, 20, 20));
        then:
            assert(draw.transform.toArray()).arrayEqualsTo([2, 0, 0, 2, 20, 20]);
            assert(getDirectives(layer)[0]).equalsTo('setTransform(2, 0, 0, 2, 20, 20)');
            assert(layer.visibleArea.toString()).equalsTo("area(-10, -10, 240, 140)");
    });

    it("Checks set translate on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
        var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            draw.setTranslate(new Point2D(10, 15));
        then:
            assert(getDirectives(layer)[0]).equalsTo('setTransform(1, 0, 0, 1, 10, 15)');
    });

    it("Checks image drawing with transform on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            resetDirectives(layer);
            var image = DImage.getImage("here/where/image.typ");
            layer.withTransform(Matrix2D.rotate(90, new Point2D(10, 15)),
                () => layer.drawImage(image, 10, 15)
            );
        then: /* Image is not drawn, but transform is set */
            assert(getDirectives(layer).length).equalsTo(2);
            assert(getDirectives(layer)[0]).equalsTo('save()');
            assert(getDirectives(layer)[1]).equalsTo('setTransform(0, 1, -1, 0, 25, 5)');
        when: /* loads the image: the requested draw directive is done then**/
            resetDirectives(layer);
            image._root.onload();
        then:
            assert(getDirectives(layer).length).equalsTo(2);
            assert(getDirectives(layer)[0]).equalsTo('drawImage(here/where/image.typ, 10, 15)');
            assert(getDirectives(layer)[1]).equalsTo('restore()');
        when: /* draw an already loaded image */
            resetDirectives(layer);
            layer.withTransform(Matrix2D.rotate(90, new Point2D(15, 10)),
                ()=>layer.drawImage(image, 15, 10)
            );
        then:
            assert(getDirectives(layer).length).equalsTo(4);
            assert(getDirectives(layer)[0]).equalsTo('save()');
            assert(getDirectives(layer)[1]).equalsTo('setTransform(0, 1, -1, 0, 25, -5)');
            assert(getDirectives(layer)[2]).equalsTo('drawImage(here/where/image.typ, 15, 10)');
            assert(getDirectives(layer)[3]).equalsTo('restore()');
    });

    it("Checks deferred drawing on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            resetDirectives(layer);
            var image1 = DImage.getImage("here/where/one.typ");
            var image2 = DImage.getImage("here/where/two.typ");
            var image3 = DImage.getImage("here/where/three.typ");
            layer.drawImage(image1, 10, 10);
            layer.drawRect(new Point2D(10, 15), new Dimension2D(20, 25));
            layer.drawImage(image2, 10, 10);
            draw.setTranslate(new Point2D(10, 15));
            layer.drawImage(image3, 10, 10);
            layer.fillRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: /* loads the first image: the requested draw directive is done for image1 only **/
            image1._root.onload();
        then:
            assert(getDirectives(layer).length).equalsTo(3);
            assert(getDirectives(layer)[0]).equalsTo('drawImage(here/where/one.typ, 10, 10)');
            assert(getDirectives(layer)[1]).equalsTo('rect(10, 15, 20, 25)');
            assert(getDirectives(layer)[2]).equalsTo('stroke()');
        when: /* load on image that is not the next to draw : no drawing are done */
            resetDirectives(layer);
            image3._root.onload();
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: /* load on image that is not the next to draw : no drawing are done */
            image2._root.onload();
        then:
            assert(getDirectives(layer)[0]).equalsTo('drawImage(here/where/two.typ, 10, 10)');
            assert(getDirectives(layer)[1]).equalsTo('setTransform(1, 0, 0, 1, 10, 15)');
            assert(getDirectives(layer)[2]).equalsTo('drawImage(here/where/three.typ, 10, 10)');
            assert(getDirectives(layer)[3]).equalsTo('rect(10, 15, 20, 25)');
            assert(getDirectives(layer)[4]).equalsTo('fill()');
    });

    it("Checks image drawing on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            resetDirectives(layer);
            var image = DImage.getImage("here/where/image.typ");
            layer.drawImage(image, 10, 15);
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: /* loads the image: the requested draw directive is done then**/
            image._root.onload();
        then:
            assert(getDirectives(layer)[0]).equalsTo('drawImage(here/where/image.typ, 10, 15)');
        when: /* draw an already loaded image */
            resetDirectives(layer);
            layer.drawImage(image, 15, 10);
        then:
            assert(getDirectives(layer)[0]).equalsTo('drawImage(here/where/image.typ, 15, 10)');
    });

    it("Checks DDraw resize", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            draw.setSize(new Dimension2D(400, 350));
        then:
            assert(draw.dimension.w).equalsTo(400);
            assert(draw.dimension.h).equalsTo(350);
            assert(layer.root.width).equalsTo(400);
            assert(layer.root.height).equalsTo(350);
    });

    it("Checks DDraw clearance", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            var image = DImage.getImage("here/where/image.typ");
            layer.drawImage(image, 10, 15);
            draw.clear();
        then:
            assert(getDirectives(layer).length).equalsTo(4);
            assert(getDirectives(layer)[0]).equalsTo('save()');
            assert(getDirectives(layer)[1]).equalsTo('resetTransform()');
            assert(getDirectives(layer)[2]).equalsTo('clearRect(0, 0, 500, 300)');
            assert(getDirectives(layer)[3]).equalsTo('restore()');
        when: /* Check that clearance cancels all deferred operations */
            resetDirectives(layer);
            image._root.onload();
        then:
            assert(getDirectives(layer).length).equalsTo(0);
    });

    it("Checks DDraw onMouseclick", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var clicked = false;
            draw.onMouseClick(function(event) {
                assert(event).isDefined();
                clicked = true;
            });
        when:
            var mouseEvent = new MouseEvent("click");
            mockPlatform.dispatchEvent(draw.root, "click", mouseEvent);
            assert(clicked).isTrue();
    });

    it("Checks DDraw onMouseWheel", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var wheeled = false;
            draw.onMouseWheel(function(event) {
                assert(event).isDefined();
                wheeled = true;
            });
        when:
            var mouseEvent = new MouseEvent("wheel");
            mockPlatform.dispatchEvent(draw.root, "wheel", mouseEvent);
            assert(wheeled).isTrue();
    });

    it("Checks DDraw onMouseMove", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var moved = 2;
            draw.onMouseMove(function(event) {
                moved===2 && assert(event).isDefined();
                return !!--moved;
            });
        when:
            var mouseEvent = new MouseEvent("mousemove");
            mockPlatform.dispatchEvent(draw.root, "mousemove", mouseEvent);
            assert(moved).equalsTo(1);
            executeTimeouts();  // executed again
            assert(moved).equalsTo(0);
            executeTimeouts();  // execution string exhausted
            assert(moved).equalsTo(0);
    });

    it("Checks DDraw onKeyDown", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var keyDown = false;
            draw.onKeyDown(function(event) {
                assert(event).isDefined();
                keyDown = true;
            });
        when:
            var keyEvent = new KeyboardEvent("keydown");
            mockPlatform.dispatchEvent(draw.root, "keydown", keyEvent);
            assert(keyDown).isTrue();
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
            var clearRectInvoked = false;
            CanvasRenderingContext2D.prototype.clearRect = function(...params) {
                assert(params).arrayEqualsTo([0, 0, 500, 300]);
                clearRectInvoked = true;
            }
            var drawImageInvoked = false;
            CanvasRenderingContext2D.prototype.drawImage = function(image, ...params) {
                assert(image.src).equalsTo('here/where/image.typ');
                assert(params).arrayEqualsTo([15, 10]);
                drawImageInvoked = true;
            }
            var setTimeoutInvoked = false;
            Window.prototype.setTimeout = function(handler, timeout, ...args) {
                assert(handler()).equalsTo(true);
                assert(timeout).equalsTo(100);
                assert(args).arrayEqualsTo([1, 2]);
                setTimeoutInvoked = true;
                return "token";
            }
            var clearTimeoutInvoked = false;
            Window.prototype.clearTimeout = function(token) {
                assert(token).equalsTo("token");
                clearTimeoutInvoked = true;
            }
            var addEventListenerInvoked = false;
            EventTarget.prototype.addEventListener = function(eventType, eventListener, ...args) {
                assert(eventType).equalsTo("click");
                eventListener({preventDefault(){}});
                assert(args).arrayEqualsTo([true]);
                addEventListenerInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
        then:
            assert(draw.root).is(HTMLDivElement);
        when:
            var layer = draw.createLayer("layer1");
        then:
            assert(layer.root).is(HTMLCanvasElement);
            assert(layer._context).is(CanvasRenderingContext2D);
        when:
            layer.drawRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(rectInvoked).isTrue();
            assert(strokeInvoked).isTrue();
        when:
            var rectInvoked = false;
            layer.fillRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(rectInvoked).isTrue();
            assert(fillInvoked).isTrue();
        when:
            layer.clear();
        then:
            assert(clearRectInvoked).isTrue();
        when:
            var image = {
                draw(layer, ...params) {
                    getDrawPlatform().drawImage(layer._context,{src:'here/where/image.typ'}, ...params);
                }
            }
            layer.drawImage(image, 15, 10);
        then:
            assert(drawImageInvoked).isTrue();
        when:
            try {
                var testSetTimeout = window.setTimeout; // remove test setTimeout
                delete window.setTimeout;
                var token = getDrawPlatform().setTimeout(function () {return true;}, 100, 1, 2);
            }
            finally {
                window.setTimeout = testSetTimeout;
            }
        then:
            assert(token).equalsTo("token");
            assert(setTimeoutInvoked).isTrue();
        when:
            try {
                var testClearTimeout = window.clearTimeout; // remove test setTimeout
                delete window.clearTimeout;
                var token = getDrawPlatform().clearTimeout("token");
            }
            finally {
                window.clearTimeout = testClearTimeout;
            }
        then:
            assert(clearTimeoutInvoked).isTrue();
        when:
            draw.onMouseClick(function(event) {return true});
        then:
            assert(addEventListenerInvoked).isTrue();
    });
});

