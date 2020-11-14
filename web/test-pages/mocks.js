'use strict';

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

    rect(context, x, y, w, h) {
        context.directives.push(`rect(${round(x)}, ${round(y)}, ${round(w)}, ${round(h)})`);
    },

    stroke(context) {
        context.directives.push(`stroke()`);
    },

    fill(context) {
        context.directives.push(`fill()`);
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
    }
}

export function getContextDirectives(context) {
    return context.directives;
}
export function resetContextDirectives(context) {
    context.directives = [];
}