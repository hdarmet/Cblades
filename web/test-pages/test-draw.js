'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    DDraw,
    DImage,
    setDrawPlatform,
    getDrawPlatform,
    targetPlatform,
    DStaticLayer,
    DAnimation,
    DAnimator,
    DLayer,
    DTranslateLayer
} from "../jslib/draw.js";
import {
    Point2D, Matrix2D, Dimension2D
} from "../jslib/geometry.js";
import {
    mockPlatform, getContextDirectives, resetContextDirectives
} from "./mocks.js";
import {
    Mechanisms
} from "../jslib/mechanisms.js";

describe("Drawing fundamentals", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        Mechanisms.reset();
        DImage.resetCache();
        DAnimator.clear();
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
            assert(draw.root.style).equalsTo("border: 1px solid; position: relative, overflow: hidden");
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
            assert(getDirectives(layer)).arrayEqualsTo([]);
    });

    it("Checks Static Layer", () => {
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer1 = draw.createLayer("layer1");
            var layer2 = draw.addLayer(new DStaticLayer("layer2"));
            draw.setTransform(new Matrix2D(2, 0, 0, 2, 10, 30));
        then:
            assert(layer1.transform.toString()).equalsTo("matrix(2, 0, 0, 2, 10, 30)");
            assert(layer2.transform.toString()).equalsTo("matrix(1, 0, 0, 1, 0, 0)");
    });

    it("Checks Translate Layer", () => {
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer1 = draw.createLayer("layer1");
            var layer2 = draw.addLayer(new DTranslateLayer("layer2", Matrix2D.translate(new Point2D(10, 15))));
            draw.setTransform(new Matrix2D(2, 0, 0, 2, 10, 30));
        then:
            assert(layer1.transform.toString()).equalsTo("matrix(2, 0, 0, 2, 10, 30)");
            assert(layer2.transform.toString()).equalsTo("matrix(2, 0, 0, 2, 30, 60)");
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
            layer.setStrokeSettings("#F0F0F0", 2);
            layer.drawRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(getDirectives(layer)[0]).equalsTo('strokeStyle = #F0F0F0');
            assert(getDirectives(layer)[1]).equalsTo('lineWidth = 2');
            assert(getDirectives(layer)[2]).equalsTo('strokeRect(10, 15, 20, 25)');
        when:
            resetDirectives(layer);
            layer.setFillSettings("#F0F0F0");
            layer.setShadowSettings("#0F0F0F", 15);
            layer.setAlphaSettings(0.3);
            layer.fillRect(new Point2D(15, 10), new Dimension2D(25, 20));
        then:
            assert(getDirectives(layer)[0]).equalsTo('fillStyle = #F0F0F0');
            assert(getDirectives(layer)[1]).equalsTo('shadowColor = #0F0F0F');
            assert(getDirectives(layer)[2]).equalsTo('shadowBlur = 15');
            assert(getDirectives(layer)[3]).equalsTo('globalAlpha = 0.3');
            assert(getDirectives(layer)[4]).equalsTo('fillRect(15, 10, 25, 20)');
    });

    it("Checks set transform on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            draw.setTransform(new Matrix2D(2, 0, 0, 2, 20, 20));
            layer.setTransformSettings(Matrix2D.IDENTITY);
        then:
            assert(draw.transform.toArray()).arrayEqualsTo([2, 0, 0, 2, 20, 20]);
            assert(getDirectives(layer)[0]).equalsTo('setTransform(2, 0, 0, 2, 20, 20)');
            assert(layer.dimension.toString()).equalsTo("dimension(500, 300)");
            assert(layer.visibleArea.toString()).equalsTo("area(-10, -10, 240, 140)");
    });

    it("Checks set translate on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when:
            resetDirectives(layer);
            draw.setTranslate(new Point2D(10, 15));
            layer.setTransformSettings(Matrix2D.IDENTITY);
        then:
            assert(getDirectives(layer)[0]).equalsTo('setTransform(1, 0, 0, 1, 10, 15)');
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
            assert(image.path, "here/where/image.typ");
            assert([...DImage.images.values()]).arrayEqualsTo([image]);
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

    it("Checks image drawing with transform on DDraw", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            resetDirectives(layer);
            var image = DImage.getImage("here/where/image.typ");
            layer.withSettings(
                () => {
                    layer.setTransformSettings(Matrix2D.rotate(90, new Point2D(10, 15)));
                    layer.drawImage(image, 10, 15);
                }
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
            layer.withSettings(
                ()=>{
                    layer.setTransformSettings(Matrix2D.rotate(90, new Point2D(15, 10)));
                    layer.drawImage(image, 15, 10);
                }
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
            layer.setTransformSettings(Matrix2D.IDENTITY);
            layer.drawImage(image2, 10, 10);
            draw.setTranslate(new Point2D(10, 15));
            layer.setTransformSettings(Matrix2D.IDENTITY);
            layer.drawImage(image3, 10, 10);
            layer.fillRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: /* loads the first image: the requested draw directive is done for image1 only **/
            image1._root.onload();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([
                "drawImage(here/where/one.typ, 10, 10)",
                "strokeRect(10, 15, 20, 25)",
                "setTransform(1, 0, 0, 1, 0, 0)"
            ]);
        when: /* load on image that is not the next to draw : no drawing are done */
            resetDirectives(layer);
            image3._root.onload();
        then:
            assert(getDirectives(layer).length).equalsTo(0);
        when: /* load on image that is not the next to draw : no drawing are done */
            image2._root.onload();
        then:
            assert(getDirectives(layer)).arrayEqualsTo([
                "drawImage(here/where/two.typ, 10, 10)",
                "setTransform(1, 0, 0, 1, 10, 15)",
                "drawImage(here/where/three.typ, 10, 10)",
                "fillRect(10, 15, 20, 25)"
            ]);
    });

    it("Checks DDraw fit on window", () => {
        given:
            var draw = buildBasicDrawWithOneLayerNamedLayer1();
            var layer = draw.getLayer("layer1");
        when: /* draws an unloaded image */
            var resizeCount = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    resizeCount++;
                    assert(source).equalsTo(draw);
                    assert(event).equalsTo("draw-resize");
                }
            });
            draw.fitWindow();
        then:
            assert(resizeCount).equalsTo(1);
            assert(draw.dimension.w).equalsTo(1500);
            assert(draw.dimension.h).equalsTo(1000);
            assert(layer.root.width).equalsTo(1500);
            assert(layer.root.height).equalsTo(1000);
        when:
            getDrawPlatform().requestFullscreen();
        then:
            assert(draw.dimension.w).equalsTo(2000);
            assert(draw.dimension.h).equalsTo(1500);
            assert(layer.root.width).equalsTo(2000);
            assert(layer.root.height).equalsTo(1500);
        when:
            getDrawPlatform().exitFullscreen();
        then:
            assert(draw.dimension.w).equalsTo(1500);
            assert(draw.dimension.h).equalsTo(1000);
            assert(layer.root.width).equalsTo(1500);
            assert(layer.root.height).equalsTo(1000);
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
        then:
            assert(moved).equalsTo(1);
        when: // automatic Move event replay
            executeTimeouts();  // executed again
            assert(moved).equalsTo(0);
            executeTimeouts();  // execution string exhausted
            assert(moved).equalsTo(0);
    });

    it("Checks that DDraw mouseleave stops automatic onMouseMove", () => {
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
        then:
            assert(moved).equalsTo(1);
        when: // Leave DDraw
            mouseEvent = new MouseEvent("mouseleave");
            mockPlatform.dispatchEvent(draw.root, "mouseleave", mouseEvent);
            executeTimeouts();  // executed again
            assert(moved).equalsTo(1);
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

    it("Checks requestFullscreen function call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var requestFullscreenInvoked = false;
            window.document.documentElement.requestFullscreen = function(...params) {
                assert(params).arrayEqualsTo([]);
                requestFullscreenInvoked = true;
            }
        when:
            getDrawPlatform().requestFullscreen();
        then:
            assert(requestFullscreenInvoked).isTrue();
    });

    it("Checks exitFullscreen function call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var exitFullscreenInvoked = false;
            window.document.exitFullscreen = function(...params) {
                assert(params).arrayEqualsTo([]);
                exitFullscreenInvoked = true;
            }
        when:
            getDrawPlatform().exitFullscreen();
        then:
            assert(exitFullscreenInvoked).isTrue();
    });

    it("Checks style attribute setter on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            Object.defineProperty(CanvasRenderingContext2D.prototype, "style", {
                get: function(style) {
                    this._style = [];
                    return this._style;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            getDrawPlatform().setStyleAttribute(layer.root, "border", "5px solid red");
        then:
            assert(layer.root.style["border"]).equalsTo("5px solid red");
    });

    it("Checks window style attribute setter on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            Object.defineProperty(HTMLBodyElement.prototype, "style", {
                get: function(style) {
                    this._style = this._style || {};
                    return this._style;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            getDrawPlatform().setWindowStyleAttribute("margin", "0px");
        then:
            assert(window.document.body.style["margin"]).equalsTo("0px");
    });

    it("Checks window window sier attribute setters on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var innerWidthInvoked = false;
            delete window.innerWidth;
            delete window.innerHeight;
            Object.defineProperty(Window.prototype, "innerWidth", {
                get: function(style) {
                    innerWidthInvoked = true;
                    return 2000;
                }
            });
            var innerHeightInvoked = false;
            Object.defineProperty(Window.prototype, "innerHeight", {
                get: function(style) {
                    innerHeightInvoked = true;
                    return 1500;
                }
            });
        when:
            var dimension = getDrawPlatform().getWindowDimension();
        then:
            assert(dimension.toString()).equalsTo("dimension(1998, 1498)");
            assert(innerWidthInvoked).isTrue();
            assert(innerHeightInvoked).isTrue();
    });

    it("Checks strokeRect method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var strokeRectInvoked = false;
            CanvasRenderingContext2D.prototype.strokeRect = function(...params) {
                assert(params).arrayEqualsTo([10, 15, 20, 25]);
                strokeRectInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            layer.drawRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(strokeRectInvoked).isTrue();
    });

    it("Checks fillRect method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var fillRectInvoked = false;
            CanvasRenderingContext2D.prototype.fillRect = function(...params) {
                assert(params).arrayEqualsTo([10, 15, 20, 25]);
                fillRectInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            layer.fillRect(new Point2D(10, 15), new Dimension2D(20, 25));
        then:
            assert(fillRectInvoked).isTrue();
    });

    it("Checks clearRect method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var clearRectInvoked = false;
            CanvasRenderingContext2D.prototype.clearRect = function(...params) {
                assert(params).arrayEqualsTo([0, 0, 500, 300]);
                clearRectInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            layer.clear();
        then:
            assert(clearRectInvoked).isTrue();
    });

    it("Checks drawImage method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var drawImageInvoked = false;
            CanvasRenderingContext2D.prototype.drawImage = function(image, ...params) {
                assert(image.src).equalsTo('here/where/image.typ');
                assert(params).arrayEqualsTo([15, 10]);
                drawImageInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            var image = {
                draw(layer, ...params) {
                    getDrawPlatform().drawImage(layer._context,{src:'here/where/image.typ'}, ...params);
                }
            }
            layer.drawImage(image, 15, 10);
        then:
            assert(drawImageInvoked).isTrue();
    });

    it("Checks strokeText method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var strokeTextInvoked = false;
            CanvasRenderingContext2D.prototype.strokeText = function(...params) {
                assert(params).arrayEqualsTo(["text", 10, 15]);
                strokeTextInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            layer.drawText("text",new Point2D(10, 15));
        then:
            assert(strokeTextInvoked).isTrue();
    });

    it("Checks fillText method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var fillTextInvoked = false;
            CanvasRenderingContext2D.prototype.fillText = function(...params) {
                assert(params).arrayEqualsTo(["text", 10, 15]);
                fillTextInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            layer.fillText("text", new Point2D(10, 15));
        then:
            assert(fillTextInvoked).isTrue();
    });

    it("Checks getImageData method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var getImageData = false;
            CanvasRenderingContext2D.prototype.getImageData = function(...params) {
                assert(params).arrayEqualsTo([100, 150, 1, 1]);
                getImageData = true;
                return {data:[100, 150, 180, 200]};
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer");
            var pixel = layer.getPixel(new Point2D(100, 150));
        then:
            assert(getImageData).isTrue();
            assert(pixel).arrayEqualsTo([100, 150, 180, 200]);
    });

    it("Checks element building methods of the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var draw = new DDraw(new Dimension2D(500, 300));
        then:
            assert(draw.root).is(HTMLDivElement);
        when:
            var layer = draw.createLayer("layer");
            var layer1 = new DLayer("layer1");
            var layer2 = new DLayer("layer2");
            var layer3 = new DLayer("layer3");
            draw.insertLayerBefore(layer1, layer);
            draw.insertLayerAfter(layer2, layer1);
            draw.insertLayerAfter(layer3, layer);
            let canvas = [...draw.root.children];
        then:
            assert(layer.root).is(HTMLCanvasElement);
            assert(layer._context).is(CanvasRenderingContext2D);
            assert(canvas).arrayEqualsTo([layer1.root, layer2.root, layer.root, layer3.root]);
    });

    it("Checks setTransform method call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var setTransformInvoked = false;
            CanvasRenderingContext2D.prototype.setTransform = function(...params) {
                assert(params).arrayEqualsTo([2, 0, 0, 2, 10, 15]);
                setTransformInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
            layer.setTransformSettings(new Matrix2D(2, 0, 0, 2, 10, 15));
        then:
            assert(setTransformInvoked).isTrue();
    });

    it("Checks strokeStyle and lineWidth setter call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var strokeStyleInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "strokeStyle", {
                set: function(style) {
                    assert(style).equalsTo("#0F0F0F");
                    strokeStyleInvoked = true;
                }
            });
            var lineWidthInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "lineWidth", {
                set: function(style) {
                    assert(style).equalsTo(2);
                    lineWidthInvoked = true;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
            layer.setStrokeSettings("#0F0F0F", 2);
        then:
            assert(strokeStyleInvoked).isTrue();
            assert(lineWidthInvoked).isTrue();
    });

    it("Checks fillStyle setter call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var fillStyleInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "fillStyle", {
                set: function(style) {
                    assert(style).equalsTo("#0F0F0F");
                    fillStyleInvoked = true;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
            layer.setFillSettings("#0F0F0F");
        then:
            assert(fillStyleInvoked).isTrue();
    });

    it("Checks shadowColor & shadowBlur setter call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var shadowColorInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowColor", {
                set: function(style) {
                    assert(style).equalsTo("#0F0F0F");
                    shadowColorInvoked = true;
                }
            });
            var shadowBlurInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", {
                set: function(style) {
                    assert(style).equalsTo(15);
                    shadowBlurInvoked = true;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
        when:
            layer.setShadowSettings("#0F0F0F", 15);
        then:
            assert(shadowColorInvoked).isTrue();
            assert(shadowBlurInvoked).isTrue();
    });

    it("Checks globalAlpha setter call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var globalAlphaInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "globalAlpha", {
                set: function(style) {
                    assert(style).equalsTo(0.3);
                    globalAlphaInvoked = true;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
            layer.setAlphaSettings(0.3);
        then:
            assert(globalAlphaInvoked).isTrue();
    });

    it("Checks font & textAlign setter call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var fontInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "font", {
                set: function(style) {
                    assert(style).equalsTo("18px serif");
                    fontInvoked = true;
                }
            });
            var textAlignInvoked = false;
            Object.defineProperty(CanvasRenderingContext2D.prototype, "textAlign", {
                set: function(style) {
                    assert(style).equalsTo("center");
                    textAlignInvoked = true;
                }
            });
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            var layer = draw.createLayer("layer1");
            layer.setTextSettings("18px serif", "center");
        then:
            assert(fontInvoked).isTrue();
            assert(textAlignInvoked).isTrue();
    });

    it("Checks setTimeout function call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var setTimeoutInvoked = false;
            Window.prototype.setTimeout = function(handler, timeout, ...args) {
                assert(handler()).equalsTo(true);
                assert(timeout).equalsTo(100);
                assert(args).arrayEqualsTo([1, 2]);
                setTimeoutInvoked = true;
                return "token";
            }
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
    });

    it("Checks clearTimeout function call on the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var clearTimeoutInvoked = false;
            Window.prototype.clearTimeout = function(token) {
                assert(token).equalsTo("token");
                clearTimeoutInvoked = true;
            }
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
    });

    it("Checks addEventListener of the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var addEventListenerInvoked = false;
            EventTarget.prototype.addEventListener = function(eventType, eventListener, ...args) {
                assert(eventType).equalsTo("click");
                eventListener({preventDefault(){}});
                assert(args).arrayEqualsTo([true]);
                addEventListenerInvoked = true;
            }
        when:
            var draw = new DDraw(new Dimension2D(500, 300));
            draw.onMouseClick(function(event) {return true});
        then:
            assert(addEventListenerInvoked).isTrue();
    });

    it("Checks addWindowEventListener of the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
            var addWindowEventListenerInvoked = false;
            Window.prototype.addEventListener = function(eventType, eventListener, ...args) {
                assert(eventType).equalsTo("resize");
                eventListener({preventDefault(){}});
                assert(args).arrayEqualsTo([true]);
                addWindowEventListenerInvoked = true;
            }
        when:
            getDrawPlatform().addWindowEventListener("resize", event=>true);
        then:
            assert(addWindowEventListenerInvoked).isTrue();
    });

    it("Checks random of the target platform", () => {
        given:
            setDrawPlatform(targetPlatform());
        when:
            var value = getDrawPlatform().random()
        then:
            assert(value>=0 && value<1).isTrue();
    });

    class DummyAnimation extends DAnimation {

        constructor(directives) {
            super();
            this._directives = directives;
        }

        _draw(count, tick) {
            this._directives.push(`draw on count ${count} for tick ${tick}`);
            return tick<4 ? 2 : 0; // play every 40 ms !!!
        }

        _finalize() {
            this._directives.push("finalize");
        }
    }

    it("Checks a simple animation", () => {
        given:
            var directives = [];
        when:
            var animation = new DummyAnimation(directives);
            animation.play(1);
            executeTimeouts();
        then:   // 20 ms : first draw
            assert(DAnimator.isActive()).isTrue();
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0"]);
        when:
            executeTimeouts();
        then:   // 40 ms... nothing more because animation plays every 40 ms
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0"]);
        when:
            executeTimeouts();
        then:   // 60 ms : second draw
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0", "draw on count 1 for tick 2"]);
        when:
            executeTimeouts();
            executeTimeouts();
        then:   // 100 ms : third and final draw
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0",
                "draw on count 1 for tick 2",
                "draw on count 2 for tick 4",
                "finalize"]);
        when:
            executeTimeouts();
            executeTimeouts();
        then:   // 120 ms : no more draw because animation is finished
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0",
                "draw on count 1 for tick 2",
                "draw on count 2 for tick 4",
                "finalize"]);
            assert(DAnimator.isActive()).isFalse();
    });

    it("Checks merge animations", () => {
        given:
            var directives = [];
        when:
            var animation1 = new DummyAnimation(directives);
            var animation2 = new DummyAnimation(directives);
            animation1.play(1);
            animation2.play(2);
            executeTimeouts();
        then:   // 20 ms : first animation
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0"]);
        when:
            executeTimeouts();
        then:   // 40 ms... second animation
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0", "draw on count 0 for tick 0"]);
        when:
            executeTimeouts();
        then:   // 60 ms : first animation again
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0",
                "draw on count 0 for tick 0",
                "draw on count 1 for tick 2"
            ]);
    });

    it("Checks animation cancellation", () => {
        given:
            var directives = [];
        when:
            var animation = new DummyAnimation(directives);
            animation.play(1);
            executeTimeouts();
        then:   // 20 ms : first draw
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0"]);
        when:
            animation.cancel();
        then:
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0", "finalize"]);
        when:
            executeTimeouts();
            executeTimeouts();
        then:
            assert(directives).arrayEqualsTo(["draw on count 0 for tick 0", "finalize"]);
    });

    it("Checks animation with final action", () => {
        given:
            var directives = [];
        when:
            var animation = new DummyAnimation(directives).setFinalAction(()=>{directives.push("final action")});
            animation.play(1);
            executeTimeouts(); // 20 ms
            executeTimeouts();
            executeTimeouts(); // 60 ms
            executeTimeouts();
            executeTimeouts(); // 80 ms
        then:
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0",
                "draw on count 1 for tick 2",
                "draw on count 2 for tick 4",
                "finalize", "final action"]);
    });

    it("Checks animator finalizer", () => {
        given:
            var directives = [];
        when:
            var animation = new DummyAnimation(directives);
            DAnimator.setFinalizer(()=>{directives.push("refresh")});
            animation.play(1);
            executeTimeouts();
        then:
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0", "refresh"
            ]);
            executeTimeouts();
        then:
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0", "refresh", "refresh"
            ]);
        when:
            DAnimator.clear();
            executeTimeouts();
        then:
            assert(directives).arrayEqualsTo([
                "draw on count 0 for tick 0", "refresh", "refresh"
            ]);
    });

});

