'use strict';

import {
    Matrix2D
} from "./geometry.js";

/**
 * plateform is a facade used to abstract the real (DOM) platform. Useful when this platform has to be replaced by a
 * fake one for tests purposes.
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

    rect(context, x, y, w, h) {
        context.rect(x, y, w, h);
    },

    stroke(context) {
        context.stroke();
    },

    fill(context) {
        context.fill();
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
}

/**
 * A DLayer is where drawing are really made. It is essentially a wrapper of a DOM Canvas.
 */
export class DLayer {

    constructor(name, width, height) {
        this._name = name;
        this._root = _platform.createElement("canvas");
        this._context = _platform.getContext(this._root, "2d");
        _platform.setAttribute(this._root, "style", "position: absolute");
        this._setSize(width, height);
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

    drawRect(x, y, w, h) {
        this._execute(()=> {
            _platform.rect(this._context, x, y, w, h);
            _platform.stroke(this._context);
        });
        return this;
    }

    fillRect(x, y, w, h) {
        this._execute(()=> {
            _platform.rect(this._context, x, y, w, h);
            _platform.fill(this._context);
        });
        return this;
    }

    drawImage(image, ...params) {
        image.draw(this, ...params);
        return this;
    }

    setTransform(...params) {
        this._execute(()=> {
            _platform.setTransform(this._context, ...params);
        });
        return this;
    }

    _setSize(width, height) {
        this._width = width;
        this._height = height;
        _platform.setAttribute(this._root, "width", width);
        _platform.setAttribute(this._root, "height", height);
    }

    clear() {
        _platform.save(this._context);
        _platform.resetTransform(this._context);
        _platform.clearRect(this._context, 0, 0, this._width, this._height);
        _platform.restore(this._context);
        delete this._todos;
    }

    get root() {
        return this._root;
    }
}

/**
 * DDraw is the viewport where the drawing is shown. It is essentially a stack of layers.
 */
export class DDraw {

    constructor(width, height) {
        this._root = _platform.createElement("div");
        this._width = width;
        this._height = height;
        _platform.setAttribute(this.root, "style", `width: ${width}px; height:${height}px; border: 1px solid; position: relative`);
        _platform.setAttribute(this.root, "tabindex", "0");
        this._layers = new Map();
        this._transform = [1, 0, 0, 1, 0, 0];
    }

    createLayer(name) {
        let layer = new DLayer(name, this._width, this._height);
        this._layers.set(name, layer);
        _platform.appendChild(this._root, layer.root);
        layer.setTransform(...this._transform);
        return layer;
    }

    getLayer(name) {
        return this._layers.get(name);
    }

    setTransform(matrix) {
        this._transform = matrix.toArray();
        for (let layer of this._layers.values()) {
            layer.setTransform(...this._transform);
        }
        return this;
    }

    setTranslate(point) {
        return this.setTransform(Matrix2D.translate(point));
    }

    get root() {
        return this._root;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    setSize(width, height) {
        this._width = width;
        this._height = height;
        _platform.setAttribute(this.root, "style", `width: ${width}px; height:${height}px; border: 1px solid; position: relative`);
        for (let layer of this._layers.values()) {
            layer._setSize(width, height);
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
        _platform.addEventListener(this.root, 'mousemove', event => {
            let funcWrapper = event => {
                let toBeContinued = func(event);
                _platform.clearTimeout(this._mouseMoveToken);
                if (toBeContinued) {
                    this._mouseMoveToken = _platform.setTimeout(funcWrapper, 10, event);
                }
            }
            funcWrapper(event);
        }, true);
    }

    onMouseWheel(func) {
        _platform.addEventListener(this._root, 'wheel', event => {
            func(event);
            event.preventDefault();
        },true);
    }

}