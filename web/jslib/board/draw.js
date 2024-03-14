'use strict';

import {
    Matrix2D, Area2D, Dimension2D
} from "./geometry.js";
import {
    Mechanisms
} from "./mechanisms.js";
import {
    requestServer
} from "./request.js";

/**
 * Add an item (or a list of items) at the end of an array if (and only if) these items are not already present in the
 * array. When an item is already present, this method just ignore it.
 * @method Array.add
 * @param elements a list or an array of objects
 * @return nothing
 */
Object.defineProperty(Array.prototype, "add", {
    value: function(...elements) {
        for (let element of elements) {
            let index = this.indexOf(element);
            if (index < 0) {
                this.push(element);
            }
        }
    },
    enumerable: false
});

/**
 * Removes an item from an array. If the item is not present in the array, this method just ignore it.
 * @method Array.remove
 * @param element the item to remove
 * @return the index of the item before being removed. -1 id the item is not present in the array.
 */
Object.defineProperty(Array.prototype, "remove", {
    value: function(element) {
        let index = this.indexOf(element);
        if (index>=0) {
            this.splice(index, 1);
        }
        return index;
    },
    enumerable: false
});

/**
 * Tells if an array contains an item.
 * @method Array.contains
 * @param element the item to check
 * @returns true if the array contains the item, false otherwise
 */
Object.defineProperty(Array.prototype, "contains", {
    value: function(element) {
        return this.indexOf(element)>=0;
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, "insert", {
    value: function(index, element) {
        if (index>=0) {
            this.splice(index, 0, element);
        }
    },
    enumerable: false
});

/**
 * Returns the first element of an array.
 * @method Array.first
 * @returns the first item of the array, null if the array is empty
 */
Object.defineProperty(Array.prototype, "first", {
    value: function () {
        return this.length>0 ? this[0] : null;
    },
    enumerable: false
});

/**
 * Returns the last element of an array.
 * @method Array.last
 * @returns the last item of the array, null if the array is empty
 */
Object.defineProperty(Array.prototype, "last", {
    value: function () {
        return this.length>0 ? this[this.length-1] : null;
    },
    enumerable: false
});

/**
 * Returns a subset of an array by selecting the included items that verify a given predicate.
 * @method Array.filter
 * @param predicate the predicate that checks every item in the list. This predicate accepts only the item and returns
 * truthy when the item is successfully checked
 * @returns a new array containing only the relevant items. When no item fits the given predicate, an empty array
 * is returned.
 */
Object.defineProperty(Set.prototype, "filter", {
    value: function (predicate) {
        let result = [];
        for (let record of this) {
            if (predicate(record)) result.push(record);
        }
        return result;
    },
    enumerable: false
});

/**
 * _platform is a facade used to abstract the real (DOM) platform. Useful when this platform has to be replaced by a
 * fake one for tests purposes.
 * _targetPlatform is the facade that connect to the real platform (i.e. the canvas DOM objects on the navigator)
 */
let _targetPlatform = {

    /**
     * Returns the Canvas Context associated to the platform. Note that this method create a Canvas DOM object when
     * none is already defined
     * @returns {CanvasRenderingContext2D}
     */
    getDefaultContext() {
        if (!this._defaultCanvas) {
            this._defaultCanvas = document.createElement('canvas');
        }
        return this._defaultCanvas.getContext('2d');
    },

    /**
     * Returns the "now" timestamp in millis.
     * @return {number}
     */
    getTime() {
        return new Date().getTime();
    },

    /**
     * Requests the DOM to use the fullscreen mode.
     */
    requestFullscreen() {
        window.document.documentElement.requestFullscreen();
    },

    /**
     * Requests the DOM to exit the fullscreen mode.
     */
    exitFullscreen() {
        window.document.exitFullscreen();
    },

    /**
     * Create a DOM object. Note that this object is not inserted in the DOM structure by this method.
     * @param tagName name (type) of the DOM object to create. ie: "P", "Div", "UL", etc.
     * @returns the created DOM object
     */
    createElement(tagName) {
        return document.createElement(tagName);
    },

    /**
     * Add a style to the style attribute of a DOM object. If this style attribute was present when this method is
     * invoked, it is overwritten.
     * @param element DOM element to update
     * @param attrName name of the style to add or to set
     * @param attrValue value to set. If this value is undefined (or null ?) the style is unset
     */
    setStyleAttribute(element, attrName, attrValue) {
        element.style[attrName] = attrValue;
    },

    getAttribute(element, attrName, attrValue) {
        return element.getAttribute(attrName, attrValue);
    },

    /**
     * set an attribute of a DOM object
     * @param element DOM object to modify
     * @param attrName name of the attribute to set
     * @param attrValue value to set of the attribute
     */
    setAttribute(element, attrName, attrValue) {
        element.setAttribute(attrName, attrValue);
    },

    /**
     * get the value of an attribute of a DOM object
     * @param element DOM object to request
     * @param attrName name of the attribute to request
     */
    removeAttribute(element, attrName) {
        element.removeAttribute(attrName);
    },

    /**
     * get the text part of a DOM object
     * @param element DOM object to request
     * @return text contained in the DOMObject
     */
    getText(element) {
        return element.innerHTML;
    },

    /**
     * set the text part of a DOM object
     * @param element DOM object to request
     * @param text text to set
     */
    setText(element, text) {
        element.innerHTML = text;
    },

    /**
     * set style of the navigator's page
     * @param attrName name of the style
     * @param attrValue value to set
     */
    setWindowStyleAttribute(attrName, attrValue) {
        window.document.body.style[attrName] = attrValue;
    },

    /**
     * gets the navigator's page content dimension
     * @return dimension of the navigator's page
     */
    getWindowDimension() {
        return new Dimension2D(window.innerWidth-2, window.innerHeight-2);
    },

    /**
     * add an event listener to the navigator's window
     * @param event name of the event to listen
     * @param func function f(event) triggered by the event
     * @param option option (bubbling or not) of the registration. Defaulted to true
     */
    addWindowEventListener(event, func, option=true) {
        window.addEventListener(event, func, option);
    },

    /**
     * add an event listener to a DOM object
     * @param element element to listen
     * @param event name of the event to listen
     * @param func function f(event) triggered by the event
     * @param option option (bubbling or not) of the registration. Defaulted to true
     */
    addEventListener(element, event, func, option=true) {
        element.addEventListener(event, func, option);
    },

    removeEventListener(element, event, func) {
        element.removeEventListener(event, func);
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

    replaceChildren(parent, ...children) {
        parent.replaceChildren(...children);
    },

    getContext(element, contextName) {
        return element.getContext(contextName, { willReadFrequently: true });
    },

    /**
     * returns the pixel on a given position in a canvas
     * @param context context of the canvas
     * @param x value of the position on the x axis in canvas coordinates
     * @param y value of the position on the y axis in canvas coordinates
     * @return an array of ints: [r, g, b, a]
     */
    getPixel(context, x, y) {
        return context.getImageData(x, y, 1, 1).data;
    },

    /**
     * set the canvas line width
     * @param context context of the canvas
     * @param width line width to set
     */
    setLineWidth(context, width) {
        context.lineWidth = width;
    },

    /**
     * set the canvas stroke style
     * @param context context of the canvas
     * @param stroke style line width to set
     */
    setStrokeStyle(context, style) {
        context.strokeStyle = style;
    },

    /**
     * set the canvas fill style
     * @param context context of the canvas
     * @param style fill style to set
     */
    setFillStyle(context, style) {
        context.fillStyle = style;
    },

    /**
     * set the canvas shadow color
     * @param context context of the canvas
     * @param color shadow color to set
     */
    setShadowColor(context, color) {
        context.shadowColor = color
    },

    /**
     * set the canvas shadow blur
     * @param context context of the canvas
     * @param blur shadow blur to set
     */
    setShadowBlur(context, blur) {
        context.shadowBlur = blur;
    },

    /**
     * set the canvas global alpha
     * @param context context of the canvas
     * @param alpha global alpha to set
     */
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
 * Returns the target platform. It's a true DOM based platform in normal case and a Mock based platform for testing.
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
    _platform._init && _platform._init();
}

/**
 * gets the dimension of a text in the screen. Note line breaks are ignored. The text must be one line high.
 * @param text text to measure
 * @param font font used (type and size) given as a css directive (ex: "15px serif")
 * @return a TextMetrics object
 */
export function measureText(text, font) {
    let context = _platform.getDefaultContext();
    saveContext(context);
    _platform.font(context, font);
    let measure = _platform.measureText(context, text);
    restoreContext(context);
    return measure;
}

/**
 * gets a query parameter of an URL (defaulting the URL with the one used to invoke the application)
 * @param name name of the parameter
 * @param url url from where the parameter retrieved. By default its the one used to invoke the application
 * @return value of the parameter if exists, null otherwise
 */
export function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * sends GET request
 * @param uri URI of the request
 * @param success
 * @param failure
 * @param files files to include in the message as
 */
export function sendGet(uri, success, failure, files) {
    getDrawPlatform().requestServer(uri, null, success, failure, files, 'GET');
}

export function sendPost(uri, requestContent, success, failure, files) {
    getDrawPlatform().requestServer(uri, requestContent, success, failure, files, 'POST');
}

/**
 * Image cache
 */
let _images = new Map();
/**
 * DImage is a wrapper class on DOM Image, used essentially to optimize (with an image cache) and simplify (hiding
 * asynchronous behavior) image management. For a given path, only one such object should be created. It can be reused
 * by many graphical objects. The main mecanism of this class is to block/unblock layers rendering before/when the
 * associated image is loaded.
 */
export class DImage {

    /**
     * builds an image wrapper.
     * @param path image file to load
     */
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

    /**
     * Path of the image to load. This path identifies the image.
     * @return the image path
     */
    get path() {
        return this._root.src;
    }

    /**
     * request a layer to draws the image (or to defer it until the image is not loaded)
     * @param layer layer that has to draw the image in its associated canvas
     * @param params params of the drawing
     * @return this image
     */
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

    /**
     * Clears the DImage cache. This method should only be used for testing purposes.
     */
    static resetCache() {
        _images.clear();
    }

    /**
     * gets an image from the image registry. This method creates (and registers) a corresponding new DImage if such
     * object does not already exist.
     * Only this method should be used to retrieve/create a DImage object for performance reason (but its safe to
     * create an orphan DImage object).
     * @param path path that identifies the requested DImage
     * @return the corresponding DImage
     */
    static getImage(path) {
        let image = _images.get(path);
        if (!image) {
            image = new DImage(path);
            _images.set(path, image);
        }
        return image;
    }

    /**
     * Image registry
     * @return {Map<any, any>}
     */
    static get images() {
        return _images;
    }
}

/**
 * Base class for Layers. A DLayer is where drawing are really made. It is essentially a wrapper of a DOM Canvas. A layer cannot be used
 * directly: it must be inserted in a DDraw viewport.
 * <br>Even if this class is not abstract, real layers are instances of subclasses of DLayer, not direct instances of
 * DLayer.
 */
export class DLayer {

    /**
     * builds a layer
     * @param name name that identifies the layer
     */
    constructor(name) {
        this._name = name;
        this._root = _platform.createElement("canvas");
        this._context = _platform.getContext(this._root, "2d");
        _platform.setAttribute(this._root, "style", "position: absolute");
    }

    /**
     * Sets the internal reference of the DDraw that the layer belongs to.
     * @param draw DDraw owner of the layer
     * @private
     */
    _setDraw(draw) {
        this._draw = draw;
        this._updateSize();
    }

    /**
     * Sets the dimension of the associated canvas
     * @param dimension dimension to set
     * @private
     */
    _setSize(dimension) {
        this._root.width = dimension.w;
        this._root.height = dimension.h;
    }

    /**
     * executes a graphical action if possible (i.e. if the layer is not in deferred mode). If the layer is in deferred
     * mode, the action is deferred to the end of the current deferred action list of the layer.
     * @param todo drawing action (a javascript action) to execute (or defer)
     * @private
     */
    _execute(todo) {
        if (this._todos) {
            this._todos.push(todo);
        }
        else {
            todo();
        }
    }

    /**
     * defers a graphical action. If the layer is already in deferred mode, the action is added at the end of the
     * current deferred action list of the layer.
     * @param todo action to defer
     * @private
     */
    _defer(todo) {
        if (!this._todos) {
            this._todos = [];
        }
        todo._deferred = true;
        this._todos.push(todo);
    }

    /**
     * Try to "continue" the level's painting. This method is invoked by a graphical object when it is ready to be
     * painted (when an image is loaded for example). If the action given as a parameter was "blocking" the layer
     * painting, this painting is resumed until another blocking action is encountered (an action with a deferred flag).
     * @param todo action to unblock.
     * @private
     */
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

    /**
     * Executes an action with setting preservations (save/restore canvas actions before and after the "normal"
     * action)
     * @param action action to execute in a preserved graphical settings
     */
    withSettings(action) {
        this._execute(()=>{
            saveContext(this._context);
        });
        action();
        this._execute(()=>{
            restoreContext(this._context);
        });
    }

    /**
     * gets a pixel
     * @param point position of the pixel (in viewport coordinates).
     * @return an array of 4 integers: [red, green, blue, alpha]
     */
    getPixel(point) {
        return _platform.getPixel(this._context, point.x, point.y);
    }

    /**
     * sets the transform settings (as an action that can be deferred if needed)
     * @param matrix transform matrix to be applied
     * @return this layer
     */
    setTransformSettings(matrix) {
        this._execute(()=> {
            let transform = this.transform && matrix ? matrix.concat(this.transform) : this.transform || matrix;
            _platform.setTransform(this._context, ...transform.toArray());
        });
        return this;
    }

    /**
     * sets the stroke settings (as an action that can be deferred if needed)
     * @param color stroke color (may be undefined)
     * @param width stroke width
     * @return this layer
     */
    setStrokeSettings(color, width) {
        this._execute(()=> {
            if (color) {
                _platform.setStrokeStyle(this._context, color);
            }
            _platform.setLineWidth(this._context, width);
        });
        return this;
    }

    /**
     * sets the fill settings (as an action that can be deferred if needed)
     * @param color fill color
     * @return this layer
     */
    setFillSettings(color) {
        this._execute(()=> {
            _platform.setFillStyle(this._context, color);
        });
        return this;
    }

    /**
     * sets the shadow settings (as an action that can be deferred if needed)
     * @param color shadow color (may be undefined)
     * @param width shadow width
     * @return this layer
     */
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
 * A DLayer that ignores any DDraw transform settings (the identity matrix is applied)
 */
export class DStaticLayer extends DLayer {

    constructor(name) {
        super(name);
        this.setTransform(Matrix2D.IDENTITY);
    }

    updateTransform(matrix) {}
}
/**
 * DDraw is the viewport where the drawing is shown. It is essentially a stack of layers. The order of the layers decide
 * the priority for drawing of their contents (likes layers in Photoshop).
 * The "higher" a layer, is the more it is visible. A layer is "higher" than another one if its index in the DDraw's
 * layers array is higher
 */
export class DDraw {

    /**
     * Initializes the DDraw viewport
     * @param dimension initial dimension of the viewport (the visible portion of the viewport in the screen, not
     * the size of the scrollable content)
     */
    constructor(dimension) {
        this._root = _platform.createElement("div");
        this._layers = new Map();
        this._layersArray = [];
        _platform.setAttribute(this.root, "style",
            `border: 1px solid; position: relative, overflow: hidden`);
        _platform.setAttribute(this.root, "tabindex", "0");
        this._setSize(dimension);
        this._transform = Matrix2D.IDENTITY;
    }

    /**
     * Requests the DDraw viewport to completely fills the navigator page and to react accordingly when the window is
     * resized by the user.
     */
    fitWindow() {
        let resize= ()=>{
            _platform.setWindowStyleAttribute("margin", "0px");
            _platform.setWindowStyleAttribute("padding", "0px");
            this.setSize(_platform.getWindowDimension());
        }
        resize();
        _platform.addWindowEventListener('resize', resize, false);
    }

    /**
     * Creates a new layer and add it on the top of the DDraw viewport. This is not the most common way to add layers
     * to a DDraw viewport because the added layer is a very basic one with no additional capabilities. Mainly used
     * for testing.
     * @param name identification of the new layer
     * @return the created layer
     */
    createLayer(name) {
        return this.addLayer(new DLayer(name));
    }

    /**
     * Add an existing layer on the top of the DDraw viewport
     * @param layer layer to put on the top of the viewport
     * @return the created layer
     */
    addLayer(layer) {
        layer._setDraw(this);
        _platform.appendChild(this._root, layer.root);
        this._layers.set(layer.name, layer);
        this._layersArray.push(layer);
        layer.updateTransform(this._transform);
        return layer;
    }

    /**
     * Add a layer at a given place inside the DDraw viewport's layer array. The above layers (starting with
     * the one which occupies the index position) are leveled up. This method CANNOT be used to move an already present
     * layer in the DDraw viewport. The layer must be removed first.
     * @param layer to add in the viewport
     * @param index of the layer in the layer array (0 for the base layer) after the insertion. The index must be lower
     * or equals to the layer array size.
     * @return the inserted layer
     */
    setLayer(layer, index) {
        console.assert(!layer._draw);
        console.assert(index<=this._layersArray.length);
        layer._setDraw(this);
        if (index===this._layersArray.length) {
            _platform.appendChild(this._root, layer.root);
        }
        else {
            _platform.insertBefore(this._root, layer.root, this._layersArray[index].root);
        }
        this._layers.set(layer.name, layer);
        this._layersArray.insert(index, layer);
        layer.updateTransform(this._transform);
        return layer;
    }

    /**
     * Add a layer just below a given layer. This reference layer (beforeLayer) MUST be present in the DDraw viewport.
     * This method CANNOT be used to move an already present layer in the DDraw viewport. The layer must be removed
     * first.
     * @param layer layer to add in the viewport
     * @param beforeLayer the layer just below which the inserted layer must be placed
     * @return the inserted layer
     */
    insertLayerBefore(layer, beforeLayer) {
        let index = this._layersArray.indexOf(beforeLayer);
        return this.setLayer(layer, index);
    }

    /**
     * Add a layer just above a given layer. This reference layer (previousLayer) MUST be present in the DDraw viewport.
     * This method CANNOT be used to move an already present layer in the DDraw viewport. The layer must be removed
     * first.
     * @param layer layer to add in the viewport
     * @param previousLayer the layer just above which the inserted layer must be placed
     * @return the inserted layer
     */
    insertLayerAfter(layer, previousLayer) {
        let index = this._layersArray.indexOf(previousLayer);
        return this.setLayer(layer, index+1);
    }

    /**
     * Retrieves a layer by its name
     * @param name name that identifies the requested layer
     * @return the layer if it exists in the Viewport, null otherwise
     */
    getLayer(name) {
        return this._layers.get(name);
    }

    /**
     * gets all the viewport's layers. Layers are ordered in this array like they are in the viewport.
     * @return an array of layers
     */
    getLayers() {
        return [...this._layersArray];
    }

    /**
     * Set a transform to the whole viewport. This transform will be applied to all contained layers
     * @param matrix transform to apply to all layers inside de viewport.
     * @return the viewport
     */
    setTransform(matrix) {
        this._transform = matrix.clone();
        for (let layer of this._layers.values()) {
            layer.updateTransform(this._transform);
        }
        return this;
    }

    /**
     * Set a translation transform to the whole viewport. This translation will be applied to all contained layers
     * @param point the {x, y} indicating the move to be done (ie. the (0, 0) point would be moved to this position).
     * @return the viewport
     */
    setTranslate(point) {
        return this.setTransform(Matrix2D.translate(point));
    }

    /**
     * gets the DIV DOM object that roots all the DOM tree associated to the viewport.
     */
    get root() {
        return this._root;
    }

    /**
     * gets the size of the viewport (this is the size of navigator's portion area dedicated to the DDraw, ie. the
     * "visible" area).
     * @return a dimension {w, y} object
     */
    get dimension() {
        return this._dimension;
    }

    /**
     * gets the transform matrix associated to the DDraw viewport
     */
    get transform() {
        return this._transform;
    }

    /**
     * Set the internals of the DDraw viewport to change its dimension
     * @param dimension dimension to set
     * @private
     */
    _setSize(dimension) {
        this._dimension = dimension;
        this._root.width = this._dimension.w;
        this._root.height = this._dimension.h;
        for(let layer of this._layers.values()) {
            layer._setSize(dimension);
        }
    }

    /**
     * Change the dimension of the  DDraw viewport. Note that an event is emitted on the general bus at the ens of the
     * process. The type of the event is DDraw.RESIZE_EVENT, the value is the final dimension of the DDraw viewport.
     * @param dimension dimension to set
     */
    setSize(dimension) {
        this._setSize(dimension);
        Mechanisms.fire(this, DDraw.RESIZE_EVENT, this._dimension);
    }

    /**
     * clears the content (the portion of the navigator page) of the DDraw viewport. This clearing is done by
     * requesting the layers to clear themselves.
     */
    clear() {
        for (let layer of this._layers.values()) {
            layer.clear();
        }
    }

    /**
     * Set the event listener that should be triggered when a mouse click event is received by the DDraw viewport.
     * @param func event listener to set. Cannot be null.
     */
    onMouseClick(func) {
        console.assert(func!==null);
        _platform.addEventListener(this.root, 'click', event => {
            func(event);
            event.preventDefault();
        }, true);
    }

    /**
     * Set the event listener that should be triggered when a keydown event is received by the DDraw viewport.
     * @param func event listener to set. Cannot be null.
     */
    onKeyDown(func) {
        console.assert(func!==null);
        _platform.addEventListener(this.root, 'keydown', event => {
            func(event);
            event.preventDefault();
        }, true);
    }

    /**
     * Set the event listener that should be triggered when a mouse move event is received by the DDraw viewport. Note
     * that this listener is invoked regularly (every 15 ms) while the mouse is inside the DDraw viewport, even if the
     * mouse is not really moving.
     * @param func event listener to set. Cannot be null.
     */
    onMouseMove(func) {
        console.assert(func!==null);
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

    /**
     * Set the event listener that should be triggered when a mouse move wheel is received by the DDraw viewport.
     * @param func event listener to set. Cannot be null.
     */
    onMouseWheel(func) {
        console.assert(func!==null);
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
                this.init();
            } else {
                this._count++;
            }
            return this._draw(this._count, ticks - this._startTick);
        }
    }

    _init() {
    }

    _draw(count, tick) {
        return false;
    }

    _finalize() {
    }

    init() {
        if (!this._canceled) {
            this._init();
            this._initAction && this._initAction();
        }
    }

    finalize() {
        if (!this._canceled) {
            this._finalize();
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

/**
 * Delay between two animation redraw attempts
 * @type {number}
 */
export let ADELAY = 20;

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
        this._token = _platform.setTimeout(()=>this.play(), ADELAY);
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
