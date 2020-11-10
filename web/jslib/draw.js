'use strict';

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
let images = new Map();
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
        if (this._todos) {
            this._todos.push(()=>{
                _platform.drawImage(layer._context, this._root, ...params);
            });
        }
        else {
            _platform.drawImage(layer._context, this._root, ...params);
        }
        return this;
    }

    static getImage(path) {
        let image = images.get(path);
        if (!image) {
            image = new DImage(path);
            images.set(path, image);
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
        _platform.setAttribute(this._root, "width", width);
        _platform.setAttribute(this._root, "height", height);
    }

    drawRect(x, y, w, h) {
        _platform.rect(this._context, x, y, w, h);
        _platform.stroke(this._context);
        return this;
    }

    fillRect(x, y, w, h) {
        _platform.rect(this._context, x, y, w, h);
        _platform.fill(this._context);
        return this;
    }

    drawImage(image, ...params) {
        image.draw(this, ...params);
        return this;
    }

    setTransform(...params) {
        _platform.setTransform(this._context, ...params);
        return this;
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

    setTransform(...params) {
        this._transform = params;
        for (let layer of this._layers.values()) {
            layer.setTransform(...this._transform);
        }
        return this;
    }

    setTranslate(x, y) {
        return this.setTransform(1, 0, 0, 1, x, y);
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

}