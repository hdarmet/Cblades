'use strict';

import {
    DImage
} from "../jslib/draw.js";

function round(v) {
    return Math.round(v*10000)/10000;
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
        context.directives.push(`lineWidth = ${width}`);
    },

    setStrokeStyle(context, style) {
        context.directives.push(`strokeStyle = ${style}`);
    },

    setFillStyle(context, style) {
        context.directives.push(`fillStyle = ${style}`);
    },

    setShadowColor(context, color) {
        context.directives.push(`shadowColor = ${color}`);
    },

    setShadowBlur(context, width) {
        context.directives.push(`shadowBlur = ${width}`);
    },

    strokeRect(context, x, y, w, h) {
        context.directives.push(`strokeRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    fillRect(context, x, y, w, h) {
        context.directives.push(`fillRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    setTransform(context, a, b, c, d, e, f) {
        context.directives.push(`setTransform(${round(a)}, ${round(b)}, ${round(c)}, ${round(d)}, ${round(e)}, ${round(f)})`);
    },

    drawImage(context, image, ...params) {
        context.directives.push(`drawImage(${image.src}, ${params.join(', ')})`);
    },

    clearRect(context, x, y, w, h) {
        context.directives.push(`clearRect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    save(context) {
        context.directives.push(`save()`);
    },

    restore(context) {
        context.directives.push(`restore()`);
    },

    resetTransform(context) {
        context.directives.push(`resetTransform()`);
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
    }

}

export function getContextDirectives(context, start=0) {
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