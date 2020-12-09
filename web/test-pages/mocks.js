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

    drawImage(context, image, ...params) {
        write(context, `drawImage(${image.src}, ${params.join(', ')})`);
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

export function getContextDirectives(context, start=0) {
    assert(context.directives.length>=start).isTrue();
    return start ? context.directives.slice(start) : context.directives;
}

export function resetContextDirectives(context) {
    context.directives = [];
}

export function getLayer(level) {
    return level._layer;
}

export function getDirectives(level, start=0) {
    return getContextDirectives(getLayer(level)._context, start);
}

export function resetDirectives(level) {
    resetContextDirectives(getLayer(level)._context);
}

export function startRegister(level) {
    delete getLayer(level)._context._doNotRegister;
}

export function stopRegister(level) {
    getLayer(level)._context._doNotRegister = true;
}

export function removeFilterPainting(artifact) {
    delete artifact.paint;
    artifact.refresh();
}

export function filterPainting(artifact) {
    let paint = artifact.paint;
    artifact.paint = function() {
        try {
            startRegister(artifact.level);
            paint.call(artifact);
        }
        finally {
            stopRegister(artifact.level);
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