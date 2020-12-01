'use strict';

import {
    Matrix2D, Area2D, Point2D, Dimension2D
} from "./geometry.js";

/**
 * _platform is a facade used to abstract the real (DOM) platform. Useful when this platform has to be replaced by a
 * fake one for tests purposes.
 * _targetPlateform is the facade that connect to the real platform (i.e. the canvas DOM objects on the navigator)
 */
let _targetPlatform = {

    createElement(tagName) {
        return document.createElement(tagName);
    },

    setAttribute(element, attrName, attrValue) {
        element.setAttribute(attrName, attrValue);
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

    appendChild(parent, child) {
        parent.appendChild(child);
    },

    getContext(element, contextName) {
        return element.getContext(contextName);
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

    strokeRect(context, x, y, w, h) {
        context.strokeRect(x, y, w, h);
    },

    fillRect(context, x, y, w, h) {
        context.fillRect(x, y, w, h);
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
    }
}

let _platform = _targetPlatform;

/**
 * Returns the target platform
 */
export function targetPlatform() {
    return _targetPlatform;
}

/**
 * Manually get/set platform (used to set a testing platform :) )
 */
export function getDrawPlatform() {
    return _platform;
}
export function setDrawPlatform(platform) {
    _platform = platform;
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

    setDraw(draw, dimension) {
        this._draw = draw;
        this._setSize(dimension);
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
            _platform.save(this._context);
        });
        action();
        this._execute(()=>{
            _platform.restore(this._context);
        });
    }

    setTransformSettings(matrix) {
        this._execute(()=> {
            let transform = this.transform && matrix ? matrix.concat(this.transform) : this.transform || matrix;
            transform && _platform.setTransform(this._context, ...transform.toArray());
        });
        return this;
    }

    setStrokeSettings(color, width) {
        this._execute(()=> {
            _platform.setStrokeStyle(this._context, color);
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
            _platform.setShadowColor(this._context, color);
            _platform.setShadowBlur(this._context, width);
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

    drawImage(image, ...params) {
        image.draw(this, ...params);
        return this;
    }

    updateTransform(matrix) {
        this.setTransform(matrix);
    }

    setTransform(matrix) {
        this._transform = matrix;
        this._execute(()=> {
            _platform.setTransform(this._context, ...matrix.toArray());
        });
        return this;
    }

    _setSize(dimension) {
        this._dimension = dimension;
        _platform.setAttribute(this._root, "width", this._dimension.w);
        _platform.setAttribute(this._root, "height", this._dimension.h);
    }

    clear() {
        _platform.save(this._context);
        _platform.resetTransform(this._context);
        _platform.clearRect(this._context, 0, 0, this._dimension.w, this._dimension.h);
        _platform.restore(this._context);
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
        return Area2D.rectBoundingArea(transform, 0, 0, this._dimension.w, this._dimension.h);
    }

    get root() {
        return this._root;
    }

    get draw() {
        return this._draw;
    }

    get dimension() {
        return this._dimension;
    }
}

/**
 * A DLayer that does not update its transform when Board transform is modified
 */
export class DStaticLayer extends DLayer {

    constructor(name) {
        super(name);
        this.setTransform(Matrix2D.getIdentity());
    }

    updateTransform(matrix) {}

}
/**
 * DDraw is the viewport where the drawing is shown. It is essentially a stack of layers.
 */
export class DDraw {

    constructor(dimension) {
        this._root = _platform.createElement("div");
        this._dimension = dimension;
        _platform.setAttribute(this.root, "style", `width: ${this._dimension.w}px; height:${this._dimension.h}px; border: 1px solid; position: relative`);
        _platform.setAttribute(this.root, "tabindex", "0");
        this._layers = new Map();
        this._transform = Matrix2D.getIdentity();
    }

    createLayer(name) {
        return this.addLayer(new DLayer(name));
    }

    addLayer(layer) {
        layer.setDraw(this, this._dimension);
        this._layers.set(layer.name, layer);
        _platform.appendChild(this._root, layer.root);
        layer.updateTransform(this._transform);
        return layer;
    }

    getLayer(name) {
        return this._layers.get(name);
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

    setSize(dimension) {
        this._dimension = dimension;
        _platform.setAttribute(this.root, "style", `width: ${this._dimension.w}px; height:${this._dimension.h}px; border: 1px solid; position: relative`);
        for (let layer of this._layers.values()) {
            layer._setSize(dimension);
        }
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

}