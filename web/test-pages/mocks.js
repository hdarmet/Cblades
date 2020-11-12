'use strict';

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
        context.directives.push(`rect(${x}, ${y}, ${w}, ${h})`);
    },

    stroke(context) {
        context.directives.push(`stroke()`);
    },

    fill(context) {
        context.directives.push(`fill()`);
    },

    setTransform(context, a, b, c, d, e, f) {
        context.directives.push(`setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`);
    },

    drawImage(context, image, ...params) {
        context.directives.push(`drawImage(${image.src}, ${params.join(', ')})`);
    },

    clearRect(context, x, y, w, h) {
        context.directives.push(`clearRect(${x}, ${y}, ${w}, ${h})`);
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