'use strict';

import {
    Matrix2D, Area2D, Point2D, Dimension2D
} from "./geometry.js";
import {
    Mechanisms
} from "./mechanisms.js";
import {
    requestServer
} from "./request.js";

/**
 * _platform is a facade used to abstract the real (DOM) platform. Useful when this platform has to be replaced by a
 * fake one for tests purposes.
 * _targetPlatform is the facade that connect to the real platform (i.e. the canvas DOM objects on the navigator)
 */
let _targetPlatform = {

    getDefaultContext() {
        if (!this._defaultCanvas) {
            this._defaultCanvas = document.createElement('canvas');
        }
        return this._defaultCanvas.getContext('2d');
    },

    getTime() {
        return new Date().getTime();
    },

    requestFullscreen() {
        window.document.documentElement.requestFullscreen();
    },

    exitFullscreen() {
        window.document.exitFullscreen();
    },

    createElement(tagName) {
        return document.createElement(tagName);
    },

    setStyleAttribute(element, attrName, attrValue) {
        element.style[attrName] = attrValue;
    },

    setAttribute(element, attrName, attrValue) {
        element.setAttribute(attrName, attrValue);
    },

    removeAttribute(element, attrName) {
        element.removeAttribute(attrName);
    },

    setText(element, text) {
        element.textContent = text;
    },

    setWindowStyleAttribute(attrName, attrValue) {
        window.document.body.style[attrName] = attrValue;
    },

    getWindowDimension() {
        return new Dimension2D(window.innerWidth-2, window.innerHeight-2);
    },

    addWindowEventListener(event, func, option=true) {
        window.addEventListener(event, func, option);
    },

    addEventListener(element, event, func, option=true) {
        element.addEventListener(event, func, option);
    },

    setTimeout(handler, timeout, ...args) {
        return window.setTimeout(handler, timeout, ...args);
    },

    clearTimeout(token) {
        window.clearTimeout(token);
    },

    insertBefore(parent, childToInsert, beforeChild) {
        parent.insertBefore(childToInsert, beforeChild);
    },

    appendChild(parent, child) {
        parent.appendChild(child);
    },

    removeChild(parent, child) {
        parent.removeChild(child);
    },

    getContext(element, contextName) {
        return element.getContext(contextName);
    },

    getPixel(context, x, y) {
        return context.getImageData(x, y, 1, 1).data;
    },

    setLineWidth(context, width) {
        context.lineWidth = width;
    },

    setStrokeStyle(context, style) {
        context.strokeStyle = style;
    },

    setFillStyle(context, style) {
        context.fillStyle = style;
    },

    setShadowColor(context, color) {
        context.shadowColor = color
    },

    setShadowBlur(context, width) {
        context.shadowBlur = width;
    },

    setGlobalAlpha(context, alpha) {
        context.globalAlpha = alpha;
    },

    strokeRect(context, x, y, w, h) {
        context.strokeRect(x, y, w, h);
    },

    fillRect(context, x, y, w, h) {
        context.fillRect(x, y, w, h);
    },

    textAlign(context, align) {
        context.textAlign = align;
    },

    textBaseline(context, baseline) {
        context.textBaseline = baseline;
    },

    font(context, font) {
        context.font = font;
    },

    fillText(context, text, x, y) {
        context.fillText(text, x, y);
    },

    strokeText(context, text, x, y) {
        context.strokeText(text, x, y);
    },

    measureText(context, text) {
        return context.measureText(text);
    },

    setTransform(context, a, b, c, d, e, f) {
        context.setTransform(a, b, c, d, e, f);
    },

    drawImage(context, image, ...params) {
        context.drawImage(image, ...params);
    },

    clearRect(context, x, y, w, h) {
        context.clearRect(x, y, w, h);
    },

    save(context) {
        context.save();
    },

    restore(context) {
        context.restore();
    },

    resetTransform(context) {
        context.resetTransform();
    },

    random() {
        return Math.random();
    },

    requestServer(uri, requestContent, success, failure, files, method='POST') {
        return requestServer(uri, requestContent, success, failure, files, method);
    }
}

let _platform = _targetPlatform;

/**
 * Returns the target platform
 */
export function targetPlatform() {
    return _targetPlatform;
}

export function saveContext(context) {
    _platform.save(context);
    context.saved = context.saved !== undefined ? context.saved+1 : 1;
}

export function restoreContext(context) {
    _platform.restore(context);
    context.saved--;
}

export function resetContext(context) {
    while(context.saved) {
        restoreContext(context);
    }
}

/**
 * Manually get/set platform (used to set a testing platform :) )
 */
export function getDrawPlatform() {
    return _platform;
}

export function setDrawPlatform(platform) {
    _platform = platform;
    _platform.init && _platform.init();
}

export function measureText(text, font) {
    let context = _platform.getDefaultContext();
    saveContext(context);
    _platform.font(context, font);
    let measure = _platform.measureText(context, text);
    restoreContext(context);
    return measure;
}

export function sendGet(uri, requestContent, success, failure, files) {
    getDrawPlatform().requestServer(uri, requestContent, success, failure, files, 'GET');
}

export function sendPost(uri, requestContent, success, failure, files) {
    getDrawPlatform().requestServer(uri, requestContent, success, failure, files, 'POST');
}

/**
 * Image cache
 */
let _images = new Map();
/**
 * DImage is a wrapper class on DOM Image, used essentially to optimize (with an image cache) and simplify (hide
 * asynchronous behavior) image management.
 */
export class DImage {

    constructor(path) {
        console.assert(path);
        this._root = _platform.createElement("img");
        this._root.src = path;
        this._todos = [];
        this._root.onload = ()=> {
            for (let todo of this._todos) {
                todo();
            }
            delete this._todos;
        }
    }

    get path() {
        return this._root.src;
    }

    draw(layer, ...params) {
        let todo = ()=>{
            _platform.drawImage(layer._context, this._root, ...params);
        }
        if (this._todos) {
            this._todos.push(()=>{
                layer._continue(todo);
            });
            layer._defer(todo);
        }
        else {
            layer._execute(todo);
        }
        return this;
    }

    static resetCache() {
        _images.clear();
    }

    static getImage(path) {
        let image = _images.get(path);
        if (!image) {
            image = new DImage(path);
            _images.set(path, image);
        }
        return image;
    }

    static get images() {
        return _images;
    }
}

/**
 * A DLayer is where drawing are really made. It is essentially a wrapper of a DOM Canvas.
 */
export class DLayer {

    constructor(name) {
        this._name = name;
        this._root = _platform.createElement("canvas");
        this._context = _platform.getContext(this._root, "2d");
        _platform.setAttribute(this._root, "style", "position: absolute");
    }

    setDraw(draw) {
        this._draw = draw;
        this._updateSize();
    }

    _setSize(dimension) {
        this._root.width = dimension.w;
        this._root.height = dimension.h;
    }

    _execute(todo) {
        if (this._todos) {
            this._todos.push(todo);
        }
        else {
            todo();
        }
    }

    _defer(todo) {
        if (!this._todos) {
            this._todos = [];
        }
        todo._deferred = true;
        this._todos.push(todo);
    }

    _continue(todo) {
        delete todo._deferred;
        if (this._todos && this._todos[0]===todo) {
            let deferred = false;
            let todos = this._todos;
            delete this._todos;
            for (let todo of todos) {
                if (!deferred) {
                    if (!todo._deferred) {
                        todo();
                    } else {
                        deferred = true;
                        this._todos = [];
                        this._todos.push(todo);
                    }
                }
                else {
                    this._todos.push(todo);
                }
            }
        }
    }

    withSettings(action) {
        this._execute(()=>{
            saveContext(this._context);
        });
        action();
        this._execute(()=>{
            restoreContext(this._context);
        });
    }

    getPixel(point) {
        return _platform.getPixel(this._context, point.x, point.y);
    }

    setTransformSettings(matrix) {
        this._execute(()=> {
            let transform = this.transform && matrix ? matrix.concat(this.transform) : this.transform || matrix;
            _platform.setTransform(this._context, ...transform.toArray());
        });
        return this;
    }

    setStrokeSettings(color, width) {
        this._execute(()=> {
            if (color) {
                _platform.setStrokeStyle(this._context, color);
            }
            _platform.setLineWidth(this._context, width);
        });
        return this;
    }

    setFillSettings(color) {
        this._execute(()=> {
            _platform.setFillStyle(this._context, color);
        });
        return this;
    }

    setShadowSettings(color, width) {
        this._execute(()=> {
            if (width && color) {
                _platform.setShadowColor(this._context, color);
            }
            _platform.setShadowBlur(this._context, width);
        });
        return this;
    }

    setAlphaSettings(alpha) {
        this._execute(()=> {
            _platform.setGlobalAlpha(this._context, alpha);
        });
        return this;
    }

    drawRect(anchor, dimension) {
        this._execute(()=> {
            _platform.strokeRect(this._context, anchor.x, anchor.y, dimension.w, dimension.h);
        });
        return this;
    }

    fillRect(anchor, dimension) {
        this._execute(()=> {
            _platform.fillRect(this._context, anchor.x, anchor.y, dimension.w, dimension.h);
        });
        return this;
    }

    setTextSettings(font, textAlign = 'center', textBaseline = 'middle') {
        this._execute(()=> {
            _platform.font(this._context, font);
            if (textAlign) {
                _platform.textAlign(this._context, textAlign);
            }
            if (textBaseline) {
                _platform.textBaseline(this._context, textBaseline);
            }
        });
        return this;
    }

    drawText(text, anchor) {
        this._execute(()=> {
            _platform.strokeText(this._context, text, anchor.x, anchor.y);
        });
        return this;
    }

    fillText(text, anchor) {
        this._execute(()=> {
            _platform.fillText(this._context, text, anchor.x, anchor.y);
        });
        return this;
    }

    drawImage(image, ...params) {
        image.draw(this, ...params);
        return this;
    }

    updateTransform(matrix) {
        this.setTransform(matrix);
    }

    setTransform(matrix) {
        this._execute(()=> {
            this._transform = matrix;
        });
        return this;
    }

    _updateSize() {
        this._setSize(this._draw.dimension);
    }

    clear() {
        // DONT include in a execute() method !
        resetContext(this._context);
        saveContext(this._context);
        _platform.resetTransform(this._context);
        _platform.clearRect(this._context, 0, 0, this._draw.dimension.w, this._draw.dimension.h);
        restoreContext(this._context);
        delete this._todos;
    }

    get name() {
        return this._name;
    }

    get transform() {
        return this._transform;
    }

    get visibleArea() {
        let transform = this.transform.invert();
        return Area2D.rectBoundingArea(transform, 0, 0, this._draw.dimension.w, this._draw.dimension.h);
    }

    get root() {
        return this._root;
    }

    get draw() {
        return this._draw;
    }

    get dimension() {
        return this.draw._dimension;
    }
}

export class DTranslateLayer extends DLayer {

    constructor(name, translate) {
        super(name);
        this._translate = translate;
        this.setTransform(translate);
    }

    updateTransform(matrix) {
        super.updateTransform(this._translate.concat(matrix));
    }

}

/**
 * A DLayer that does not update its transform when Board transform is modified
 */
export class DStaticLayer extends DLayer {

    constructor(name) {
        super(name);
        this.setTransform(Matrix2D.IDENTITY);
    }

    updateTransform(matrix) {}

}
/**
 * DDraw is the viewport where the drawing is shown. It is essentially a stack of layers.
 */
export class DDraw {

    constructor(dimension) {
        this._root = _platform.createElement("div");
        this._layers = new Map();
        this._layersArray = [];
        _platform.setAttribute(this.root, "style", `border: 1px solid; position: relative, overflow: hidden`);
        _platform.setAttribute(this.root, "tabindex", "0");
        this._setSize(dimension);
        this._transform = Matrix2D.IDENTITY;
    }

    fitWindow() {
        let resize= ()=>{
            _platform.setWindowStyleAttribute("margin", "0px");
            _platform.setWindowStyleAttribute("padding", "0px");
            this.setSize(_platform.getWindowDimension());
        }
        resize();
        _platform.addWindowEventListener('resize', resize, false);
    }

    createLayer(name) {
        return this.addLayer(new DLayer(name));
    }

    addLayer(layer) {
        layer.setDraw(this);
        _platform.appendChild(this._root, layer.root);
        this._layers.set(layer.name, layer);
        this._layersArray.push(layer);
        layer.updateTransform(this._transform);
        return layer;
    }

    setLayer(layer, index) {
        layer.setDraw(this, this);
        _platform.insertBefore(this._root, layer.root, this._layersArray[index].root);
        this._layers.set(layer.name, layer);
        this._layersArray.splice(index, 0, layer);
        layer.updateTransform(this._transform);
        return layer;
    }

    insertLayerBefore(layer, beforeLayer) {
        let index = this._layersArray.indexOf(beforeLayer);
        return this.setLayer(layer, index);
    }

    insertLayerAfter(layer, previousLayer) {
        let index = this._layersArray.indexOf(previousLayer);
        return index===this._layersArray.length-1 ? this.addLayer(layer) : this.setLayer(layer, index+1);
    }

    getLayer(name) {
        return this._layers.get(name);
    }

    getLayers() {
        return [...this._layers.values()];
    }

    setTransform(matrix) {
        this._transform = matrix.clone();
        for (let layer of this._layers.values()) {
            layer.updateTransform(this._transform);
        }
        return this;
    }

    setTranslate(point) {
        return this.setTransform(Matrix2D.translate(point));
    }

    get root() {
        return this._root;
    }

    get dimension() {
        return this._dimension;
    }

    get transform() {
        return this._transform;
    }

    _setSize(dimension) {
        this._dimension = dimension;
        this._root.width = this._dimension.w;
        this._root.height = this._dimension.h;
        for(let layer of this._layers.values()) {
            layer._setSize(dimension);
        }
    }

    setSize(dimension) {
        this._setSize(dimension);
        Mechanisms.fire(this, DDraw.RESIZE_EVENT, this._dimension);
    }

    clear() {
        for (let layer of this._layers.values()) {
            layer.clear();
        }
    }

    onMouseClick(func) {
        _platform.addEventListener(this.root, 'click', event => {
            func(event);
            event.preventDefault();
        }, true);
    }

    onKeyDown(func) {
        _platform.addEventListener(this.root, 'keydown', event => {
            func(event);
            event.preventDefault();
        }, true);
    }

    onMouseMove(func) {
        let mouseMoveToken;
        _platform.addEventListener(this.root, 'mousemove', event => {
            let funcWrapper = event => {
                let toBeContinued = func(event);
                _platform.clearTimeout(mouseMoveToken);
                if (toBeContinued) {
                    mouseMoveToken = _platform.setTimeout(funcWrapper, 15, event);
                }
            }
            funcWrapper(event);
        }, true);
        _platform.addEventListener(this.root, 'mouseleave', event => {
            _platform.clearTimeout(mouseMoveToken);
        }, true);
    }

    onMouseWheel(func) {
        _platform.addEventListener(this._root, 'wheel', event => {
            func(event);
            event.preventDefault();
        },true);
    }

    static RESIZE_EVENT = "draw-resize";
}

export class DAnimation {

    constructor() {
    }

    play(startTick) {
        console.assert(startTick>0);
        DAnimator.register(this, startTick);
    }

    execute(ticks) {
        if (this._canceled) {
            return false;
        }
        else {
            if (!this._startTick) {
                this._startTick = ticks;
                this._count = 0;
            } else {
                this._count++;
            }
            return this._draw(this._count, ticks - this._startTick);
        }
    }

    finalize() {
        if (!this._canceled) {
            this._finalize && this._finalize();
            this._finalAction && this._finalAction();
        }
    }

    cancel() {
        this.finalize();
        this._canceled = true;
    }

    setFinalAction(action) {
        this._finalAction = action;
        return this;
    }
}

export class DAnimator {

    constructor() {
        this._clear();
    }

    _clear() {
        this._animations = [];
        this._ticks = 0;
    }

    _stop() {
        _platform.clearTimeout(this._token);
        delete this._token;
        this._clear();
    }

    clear() {
        delete this._finalizer;
        this._stop();
    }

    isActive() {
        return this._token!==undefined;
    }

    getFinalizer() {
        return this._finalizer;
    }

    setFinalizer(finalizer) {
        this._finalizer = finalizer;
    }

    _launch() {
        this._token = _platform.setTimeout(()=>this.play(), 20);
    }

    register(animation, startTick) {
        let animationRow = this._animations[this._ticks+startTick];
        if (!animationRow) {
            let mustLaunch = !this._animations.length;
            animationRow = [];
            this._animations[this._ticks+startTick]=animationRow;
            if (mustLaunch) this._launch();
        }
        animationRow.push(animation);
    }

    play() {
        this._ticks++;
        let animationRow = this._animations[this._ticks];
        delete this._animations[this._ticks];
        if (animationRow) {
            for (let animation of animationRow) {
                let next = animation.execute(this._ticks);
                if (next) {
                    this.register(animation, next);
                } else {
                    animation.finalize();
                }
            }
        }
        if (!this._animations.length || this._ticks===this._animations.length) {
            this._stop();
        }
        else {
            this._launch();
        }
        if (this._finalizer) {
            this._finalizer();
        }
    }
}
DAnimator._instance = new DAnimator();
DAnimator.getFinalizer = function() {
    return DAnimator._instance.getFinalizer();
}
DAnimator.setFinalizer = function(finalizer) {
    DAnimator._instance.setFinalizer(finalizer);
}
DAnimator.register = function(animation, startTick) {
    DAnimator._instance.register(animation, startTick);
}
DAnimator.clear = function() {
    DAnimator._instance.clear();
}
DAnimator.isActive = function() {
    return DAnimator._instance.isActive();
}
