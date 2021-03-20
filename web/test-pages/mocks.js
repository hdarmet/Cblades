'use strict';

import {
    DImage
} from "../jslib/draw.js";
import {
    assert
} from "../jstest/jtest.js";

function round(v) {
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
    },

    createElement(tagName) {
        return {tagName, children:[]};
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
    }

}

export function getContextDirectives(context, start=0, end=-1) {
    if (start<0) start = context.directives.length+start+1;
    if (end<0) end = context.directives.length+end+1;
    assert(context.directives.length>=start && context.directives.length>=end).isTrue();
    return start ? context.directives.slice(start, end) : context.directives;
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

export function getDirectives(layer, start=0, end =-1) {
    return getContextDirectives(layer._context, start, end);
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
