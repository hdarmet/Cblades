'use strict';

import {
    DImage
} from "../jslib/draw.js";
import {
    assert
} from "../jstest/jtest.js";
import {
    Dimension2D
} from "../jslib/geometry.js";

export function round(v) {
    return Math.round(v*10000)/10000;
}

function write(context, directive) {
    if (!context._doNotRegister) {
        context.directives.push(directive)
    }
}

export let mockPlatform = {

    init() {
        this._pixel = [255, 255, 255, 255];
        this._defaultContext = this.getContext();
        this._time = 100;
        this._mockWindow = {
            innerWidth:1500, innerHeight:1000,
            defaultWidth:1500, defaultHeight:1000,
            body:{
                style:{}
            },
            fullScreen: false
        };
    },

    getDefaultContext() {
        return this._defaultContext;
    },

    setTime(time) {
        this._time = time;
    },

    addTime(delay) {
        this._time += delay;
    },

    getTime() {
        return this._time;
    },

    measureText(context, text) {
        write(context, `measureText(${text})`);
        return {
            width: text.length*5
        };
    },

    requestFullscreen() {
        this._mockWindow.fullScreen = true;
        this._mockWindow.innerWidth = 2000;
        this._mockWindow.innerHeight = 1500;
        this.dispatchWindowEvent("resize", {});
    },

    exitFullscreen() {
        this._mockWindow.fullScreen = false;
        this._mockWindow.innerWidth = this._mockWindow.defaultWidth;
        this._mockWindow.innerHeight = this._mockWindow.defaultHeight;
        this.dispatchWindowEvent("resize", {});
    },

    resizeWindow(width, height) {
        this._mockWindow.innerWidth = width;
        this._mockWindow.innerHeight = height;
        this._mockWindow.defaultWidth = width;
        this._mockWindow.defaultHeight = height;
        this.dispatchWindowEvent("resize", {});
    },

    setStyleAttribute(element, attrName, attrValue) {
        element.style[attrName] = attrValue;
    },

    setWindowStyleAttribute(attrName, attrValue) {
        this._mockWindow.body.style[attrName] = attrValue;
    },

    getWindowDimension() {
        return new Dimension2D(this._mockWindow.innerWidth, this._mockWindow.innerHeight);
    },

    addWindowEventListener(event, func, option=true) {
        this.addEventListener(this._mockWindow, event, func, option=true);
    },

    dispatchWindowEvent(eventType, event) {
        this.dispatchEvent(this._mockWindow, eventType, event);
    },

    createElement(tagName) {
        return {tagName, style:{}, children:[]};
    },

    setAttribute(element, attrName, attrValue) {
        element[attrName] = attrValue;
    },

    appendChild(parent, child) {
        parent.children.push(child);
    },

    insertBefore(parent, newChild, nextChild) {
        let index = parent.children.indexOf(nextChild);
        assert(index>=0).isTrue();
        parent.children.splice(index, 0, newChild);
    },

    getContext(element, contextName) {
        return {host:element, directives:[]};
    },

    setLineWidth(context, width) {
        write(context, `lineWidth = ${width}`);
    },

    setStrokeStyle(context, style) {
        write(context, `strokeStyle = ${style}`);
    },

    setFillStyle(context, style) {
        write(context, `fillStyle = ${style}`);
    },

    setShadowColor(context, color) {
        write(context, `shadowColor = ${color}`);
    },

    setShadowBlur(context, width) {
        write(context, `shadowBlur = ${width}`);
    },

    setGlobalAlpha(context, alpha) {
        write(context, `globalAlpha = ${alpha}`);
    },

    strokeRect(context, x, y, w, h) {
        write(context, `strokeRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    fillRect(context, x, y, w, h) {
        write(context, `fillRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    setTransform(context, a, b, c, d, e, f) {
        write(context, `setTransform(${round(a)}, ${round(b)}, ${round(c)}, ${round(d)}, ${round(e)}, ${round(f)})`);
    },

    _pixel : [255, 255, 255, 255],

    getPixel(x, y) {
        return this._pixel;
    },

    setPixel(pixel) {
        this._pixel = pixel;
    },

    drawImage(context, image, ...params) {
        console.assert(image.src);
        for(let index in params) {
            if (typeof(params[index])==="number") {
                params[index] = round(params[index]);
            }
        }
        write(context, `drawImage(${image.src}, ${params.join(', ')})`);
    },

    textAlign(context, align) {
        write(context, `textAlign = ${align}`);
    },

    font(context, font) {
        write(context, `font = ${font}`);
    },

    textBaseline(context, baseline) {
        write(context, `textBaseline = ${baseline}`);
    },

    fillText(context, text, x, y) {
        write(context, `fillText(${text}, ${x}, ${y})`);
    },

    strokeText(context, text, x, y) {
        write(context, `strokeText(${text}, ${x}, ${y})`);
    },

    clearRect(context, x, y, w, h) {
        write(context, `clearRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    save(context) {
        write(context, `save()`);
    },

    restore(context) {
        write(context, `restore()`);
    },

    resetTransform(context) {
        write(context, `resetTransform()`);
    },

    setTimeout(handler, timeout, ...args) {
        return window.setTimeout(handler, timeout, ...args);
    },

    clearTimeout(token) {
        window.clearTimeout(token);
    },

    addEventListener(element, event, func, option=true) {
        if (!element.listeners) {
            element.listeners = {};
        }
        if (!element.listeners[event]) {
            element.listeners[event] = [];
        }
        element.listeners[event].push(func);
    },

    dispatchEvent(element, eventType, event) {
        if (element.listeners && element.listeners[eventType]) {
            for (let listener of element.listeners[eventType]) {
                listener(event);
            }
        }
    },

    setRandoms(...values) {
        if (!this._randoms) {
            this._randoms = values;
        }
        else {
            this._randoms.push(...values);
        }
    },

    resetRandoms(...values) {
        this._randoms = values;
    },

    random() {
        console.assert(this._randoms);
        return this._randoms.length ===1 ? this._randoms[0] : this._randoms.shift();
    },

    requestServer(uri, requestContent, success, failure, files, method) {
        this._request = {
            uri, requestContent, files, method, success, failure
        }
    },

    getRequest() {
        return this._request;
    },

    requestSucceeds(text, status) {
        this._request.success(text, status);
    },

    requestFails(text, status) {
        this._request.failure(text, status);
    }
}

export function getContextDirectives(context, start=0, end=-1) {
    if (start<0) start = context.directives.length+start+1;
    if (end<0) end = context.directives.length+end+1;
    assert(context.directives.length>=start && context.directives.length>=end).isTrue();
    return start!==0 || end!==context.directives.length ? context.directives.slice(start, end) : context.directives;
}

export function resetContextDirectives(context) {
    context.directives = [];
}

export function getLayers(board, ...layerNames) {
    let result = [];
    for (let name of layerNames) {
        result.push(board._draw.getLayer(name));
    }
    return result;
}

export function resetAllDirectives(board) {
    resetDirectives(...board._draw.getLayers());
}

export function getDirectives(layer, start=0, end =-1) {
    return getContextDirectives(layer._context, start, end);
}

export function skipDirectives(layer, count) {
    layer._context.directives.splice(0, count);
}

export function assertDirectives(layer, model) {
    assert(layer._context.directives.slice(0, model.length)).arrayEqualsTo(model);
    skipDirectives(layer, model.length);
}

export function assertNoMoreDirectives(layer, count=0) {
    if (count) skipDirectives(layer, count);
    assert(layer._context.directives.length).equalsTo(0);
}

export function assertClearDirectives(layer, w= 1000, h= 800) {
    assertDirectives(layer, [
        "save()",
            "resetTransform()",
            `clearRect(0, 0, ${w}, ${h})`,
        "restore()"
    ]);
}

export function findInDirectives(layer, model, start=0, end =-1) {
    let directives = getContextDirectives(layer._context, start, end);
    for (let directive of directives) {
        if (directive.indexOf(model)>=0) return true;
    }
    return false;
}

export function resetDirectives(...layers) {
    for (let layer of layers) {
        resetContextDirectives(layer._context);
    }
}

export function startRegister(layer) {
    delete layer._context._doNotRegister;
}

export function stopRegister(layer) {
    layer._context._doNotRegister = true;
}

export function removeFilterPainting(artifact) {
    delete artifact.paint;
    artifact.refresh();
}

export function filterPainting(artifact) {
    let paint = artifact.paint;
    artifact.paint = function() {
        try {
            startRegister(artifact.level.layer);
            paint.call(artifact);
        }
        finally {
            stopRegister(artifact.level.layer);
        }
    }
    artifact.refresh();
}

export function loadAllImages() {
    for (let image of DImage.images.values()) {
        if (image._todos) {
            image._root.onload();
        }
    }
}

export function createEvent(eventType, args) {
    return {
        type: eventType,
        ...args,
        defaultStatus: true,
        preventDefault() {
            this.defaultStatus = false;
        }
    };
}

export function assertHex(hex, coords) {
    assert(hex.col).equalsTo(coords[0]);
    assert(hex.row).equalsTo(coords[1]);
}

export function assertHexSide(hexSide, fromCoords, toCoords) {
    assert(hexSide.fromHex.col).equalsTo(fromCoords[0]);
    assert(hexSide.fromHex.row).equalsTo(fromCoords[1]);
    assert(hexSide.toHex.col).equalsTo(toCoords[0]);
    assert(hexSide.toHex.row).equalsTo(toCoords[1]);
}

export function mergeClasses(...classes) {
    let merged = class {};
    for (let clazz of classes) {
        Object.getOwnPropertyNames( clazz.prototype ).forEach(methodName => {
            if (methodName !== "constructor") {
                merged.prototype[methodName] = clazz.prototype[methodName];
            }
        })
    }
    return merged;
}

export class MockPromise {

    then(success, failure) {
        this._success = success;
        this._failure = failure;
        this._next = new MockPromise();
        return this._next;
    }

    catch(failure) {
        return this.then(undefined, failure);
    }

    succeeds(result) {
        this._status = true;
        if (this._success) {
            let newResult = this._success(result);
            if (newResult instanceof MockPromise) {
                this._resolve(newResult);
            }
            else {
                this.continueOnSuccess(newResult);
            }
        }
        else {
            this.continueOnSuccess(result);
        }
    }

    fails(result) {
        this._status = false;
        if (this._failure) {
            let newResult = this._failure(result);
            if (newResult instanceof MockPromise) {
                this._resolve(newResult);
            }
            else {
                this.continueOnFailure(newResult);
            }
        }
        else {
            this.continueOnFailure(result);
        }
    }

    _resolve(result) {
        if (result._status === true) {
            this.continueOnSuccess(result);
        } else if (result._status === false) {
            this.continueOnFailure(result);
        } else {
            result.succeeds = (newResult) => {
                result._status = true;
                this.continueOnSuccess(newResult);
            }
            result.fails = (newResult) => {
                result._status = false;
                this.continueOnFailure(newResult);
            }
        }
    }

    continueOnSuccess(result) {
        if (this._next) {
            this._next.succeeds(result);
        }
    }

    continueOnFailure(result) {
        if (this._next) {
            this._next.fails(result);
        }
    }

}

export class ResponsePromise extends MockPromise {

    constructor(message) {
        super();
        this._message = message;
    }

    then(success, failure) {
        let nextPromise = super.then(success, failure);
        this.succeeds(this._message);
        return nextPromise;
    }

}
