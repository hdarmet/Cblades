"use strict"

import {
    getDrawPlatform
} from "../draw.js";

export class DComponent {

}

export class DComposed extends DComponent {

    add(component) {
        if (!this._children) {
            this._children = [];
        }
        this._children.push(component);
        getDrawPlatform().appendChild(this._root, component._root);
        component._added && component._added();
        return this;
    }

    insert(component, before) {
        console.assert(this._children);
        if (this._children) {
            let index = this._children.indexOf(before);
            console.assert(index>=0);
            if (index>=0) {
                this._children.splice(index, 0, component);
                getDrawPlatform().insertBefore(this._root, component._root, before._root);
                component._added && component._added();
            }
        }
    }

    remove(component) {
        console.assert(this._children);
        if (this._children) {
            let index = this._children.indexOf(component);
            console.assert(index>=0);
            if (index>=0) {
                this._children.splice(index, 1);
                getDrawPlatform().removeChild(this._root, component._root);
                component._removed && component._removed();
            }
        }
    }

    contains(child) {
        return this._children && this._children.indexOf(child)>=0;
    }

    get children() {
        return this._children ? this._children : [];
    }

}

export function DOM(clazz) {

    return class extends clazz {

        constructor(domType) {
            super();
            this._domType = domType;
            this._root = getDrawPlatform().createElement(domType);
            this._root._component = this;
        }

        addStyle(name, value) {
            if (!this._styles) {
                this._styles = new Map();
            }
            this._styles.set(name, value);
            getDrawPlatform().setStyleAttribute(this._root, name, value);
            return this;
        }

        getParent() {
            let parentNode = this._root.parentNode;
            while (parentNode !== null && parentNode._component === null) {
                parentNode = parentNode.parentNode;
            }
            return parentNode===null ? parentNode : parentNode._component;
        }

        getStyle(style) {
            return this._styles ? this._styles.get(style) : null;
        }

        setAttribute(name, value) {
            if (!this._attributes) {
                this._attributes = new Map();
            }
            this._attributes.set(name, value);
            getDrawPlatform().setAttribute(this._root, name, value);
            return this;
        }

        removeAttribute(name, value) {
            if (this._attributes) {
                this._attributes.delete(name, value);
                getDrawPlatform().removeAttribute(this._root, name);
            }
            return this;
        }

        getAttribute(attribute) {
            return this._attributes ? this._attributes.get(attribute) : null;
        }

        setWidth(width) {
            return this.addStyle("width", width);
        }

        getWidth() {
            return this.getStyle("width");
        }

        setHeight(height) {
            return this.addStyle("height", height);
        }

        getHeight() {
            return this.getStyle("height");
        }

        setBorder(border) {
            return this.addStyle("border", border);
        }

        getBorder() {
            return this.getStyle("border");
        }

        setColor(color) {
            return this.addStyle("background-color", color);
        }

        getColor() {
            return this.getStyle("background-color");
        }

        setFloating(float) {
            return this.addStyle("float", float);
        }

        getFloating() {
            return this.getStyle("float");
        }

        setOverflow(overflow) {
            return this.addStyle("overflow", overflow);
        }

        getOverflow() {
            return this.getStyle("overflow");
        }

        addClass(clazz) {
            if (!this._classes) {
                this._classes = [];
            }
            if (this._classes.indexOf(clazz)<0) {
                this._classes.push(clazz);
                getDrawPlatform().setAttribute(this._root, "class", this._classes.join(" "));
            }
            return this;
        }

        removeClass(clazz) {
            if (this._classes) {
                let index = this._classes.indexOf(clazz);
                if (index>=0) {
                    this._classes.splice(this._classes.indexOf(clazz), 1);
                    getDrawPlatform().setAttribute(this._root, "class", this._classes.join(" "));
                }
            }
            return this;
        }

        getClasses() {
            return this._classes;
        }

        setText(text) {
            this._text = text;
            text!==undefined&&getDrawPlatform().setText(this._root, text);
            return this;
        }

        getText() {
            return this._text;
        }

        setAlt(alt) {
            this.setAttribute("alt", alt);
            return this;
        }

        getAlt() {
            return this.getAttribute("alt");
        }

        setId(id) {
            this.setAttribute("id", id);
            return this;
        }

        getId() {
            return this.getAttribute("id");
        }

        setType(type) {
            this.setAttribute("type", type);
            return this;
        }

        getType() {
            return this.getAttribute("type");
        }

        setName(name) {
            this.setAttribute("name", name);
            return this;
        }

        getName() {
            return this.getAttribute("name");
        }

        get offsetWidth() {
            return this._root.offsetWidth;
        }

        get offsetHeight() {
            return this._root.offsetHeight;
        }

        get offsetTop() {
            return this._root.offsetTop;
        }

        get offsetLeft() {
            return this._root.offsetLeft;
        }

        get root() {
            return this._root;
        }

        onEvent(event, action) {
            if (this["_"+event]) {
                getDrawPlatform().removeEventListener(this._root, event, this["_"+event]);
                delete this["_"+event];
            }
            if (action) {
                this["_"+event] = action;
                getDrawPlatform().addEventListener(this._root, event, action, false);
            }
            return this;
        }

        onChange(changeAction) {
            return this.onEvent("change", changeAction);
        }

        onInput(inputAction) {
            return this.onEvent("input", inputAction);
        }

        onMouseClick(clickAction) {
            return this.onEvent("click", clickAction);
        }
    }

}

export class A extends DOM(DComposed) {

    constructor(text, href="#") {
        super("a");
        this.root.setAttribute("href", href);
        this.setText(text);
    }

    getHref() {
        this.root.getAttribute("href");
    }

    setHref(href) {
        this.root.setAttribute("href", href);
        return this;
    }

}

export class LI extends DOM(DComposed) {

    constructor(text) {
        super("li");
        text && this.setText(text);
    }

}

export class UL extends DOM(DComposed) {

    constructor() {
        super("ul");
    }

    add(child) {
        console.assert(child instanceof LI);
        return super.add(child);
    }
}

export class Nav extends DOM(DComposed) {

    constructor() {
        super("nav");
    }

}

export class Button extends DOM(DComposed) {

    constructor(text) {
        super("button");
        this.setText(text);
    }

}

export class Div extends DOM(DComposed) {

    constructor() {
        super("div");
    }

}

export class Form extends DOM(DComposed) {

    constructor() {
        super("form");
    }

}

export class Label extends DOM(DComposed) {

    constructor(label) {
        super("label");
        this.setText(label);
    }

    setFor(id) {
        this.setAttribute("for", id);
        return this;
    }

    getFor() {
        return this.getAttribute("for");
    }
}

export class Span extends DOM(DComposed) {

    constructor(text) {
        super("span");
        this.setText(text);
    }

}

export class P extends DOM(DComposed) {

    constructor(text) {
        super("p");
        this.setText(text);
    }

}

export function InputMixin(clazz) {

    return class extends clazz {

        getValue() {
            return this._root.value;
        }

        setValue(value) {
            this._root.value = value;
            return this;
        }

        getDisabled() {
            return this._root.getAttribute("disabled");
        }

        setDisabled(disabled) {
            if (disabled) {
                this._root.setAttribute("disabled", true);
            }
            else {
                this._root.removeAttribute("disabled");
            }
            return this;
        }

    }

}

export class Option extends DOM(DComposed) {

    constructor() {
        super("option");
    }

}

export class Select extends InputMixin(DOM(DComposed)) {

    constructor() {
        super("select");
    }

}

export class Input extends InputMixin(DOM(DComposed)) {

    constructor() {
        super("input");
    }

    getChecked() {
        return this._root.checked;
    }

    setChecked(checked) {
        this._root.checked = checked;
        return this;
    }

}

export class TextArea extends InputMixin(DOM(DComposed)) {

    constructor() {
        super("textarea");
    }

}

export class Img extends DOM(DComponent) {

    constructor(imgSrc, onLoad) {
        super("img");
        this.setSrc(imgSrc);
        this.root.onload = function(){
            for (let listener of Img._loaderListeners) {
                listener.onImageLoaded(this);
            }
        };
        onLoad && this.onEvent("load", onLoad);
    }

    getSrc() {
        return this._root.src;
    }

    setSrc(imgSrc, trigger) {
        this._root.src = imgSrc;
        trigger && this.onEvent("load", trigger);
        return this;
    }

    static _loaderListeners = new Set();

    static addLoaderListener(listener) {
        Img._loaderListeners.add(listener);
    }

    static removeLoaderListener(listener) {
        Img._loaderListeners.delete(listener);
    }

}

export class App extends Div {

}

export class UndoRedo {

    static listeners = [];

    static addListener(listener) {
        UndoRedo.listeners.push(listener);
        if (!UndoRedo.active) {
            UndoRedo.active = true;
        }
    }

    static removeListener(listener) {
        let index = UndoRedo.listeners.indexOf(listener);
        if (index>=0) {
            UndoRedo.listeners.splice(index, 1);
        }
        if (!UndoRedo.listeners.length) {
            delete UndoRedo.active;
        }
    }

    static emitUndoEvent() {
        for (let listener of UndoRedo.listeners) {
            listener.undo && listener.undo();
        }
    }

    static emitRedoEvent() {
        for (let listener of UndoRedo.listeners) {
            listener.redo && listener.redo();
        }
    }

}

document.body.onkeydown = event=>{
    if (event.ctrlKey) {
        if (event.key === 'z' && UndoRedo.active) {
            event.preventDefault();
            return false;
        }
        else if (event.key === 'y' && UndoRedo.active) {
            event.preventDefault();
            return false;
        }
    }
};

document.body.onkeyup = event=>{
    if (event.ctrlKey) {
        if (event.key === 'z' && UndoRedo.active) {
            event.preventDefault();
            UndoRedo.emitUndoEvent();
            return true;
        }
        else if (event.key === 'y' && UndoRedo.active) {
            event.preventDefault();
            UndoRedo.emitRedoEvent();
            return true;
        }
    }
};