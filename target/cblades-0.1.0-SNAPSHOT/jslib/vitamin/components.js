"use strict"

import {
    getDrawPlatform
} from "../board/draw.js";

/**
 * Base class for component. These objects are DOM handlers, not subclasses of DOM objects. The DOM object managed by
 * component is referenced by the _root attribute. This DOM object "knows" its element counterpart thanks to a
 * _component attribute added to it. This "back" reference is useful to find the corresponding element when a user
 * event is received by the DOM object
 */
export class DComponent {
    /**
     * Element constructor. This method also creates the corresponding DOM object.
     * @param domType type of the DOM object : DIV, A, LI, etc;
     */
    constructor(domType) {
        this._domType = domType;
        this._root = getDrawPlatform().createElement(domType);
        this._root._component = this;
    }

    getParent() {
        let parentNode = this._root.parentNode;
        while (parentNode !== null && parentNode._component === null) {
            parentNode = parentNode.parentNode;
        }
        return parentNode===null ? parentNode : parentNode._component;
    }

    addStyle(name, value) {
        if (!this._styles) {
            this._styles = new Map();
        }
        this._styles.set(name, value);
        getDrawPlatform().setStyleAttribute(this._root, name, value);
        return this;
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

    containsClass(clazz) {
        return this._classes.indexOf(clazz)>=0;
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
        if (this._classes && this._classes.remove(clazz)>=0) {
            getDrawPlatform().setAttribute(this._root, "class", this._classes.join(" "));
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

    getInnerHTML() {
        return getDrawPlatform().getText(this._root);
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

export function isComponent(any) {
    return any._domType !== undefined;
}

export class DComposed extends DComponent {

    constructor(domType) {
        super(domType);
    }

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
                this._children.insert(index, component);
                getDrawPlatform().insertBefore(this._root, component._root, before._root);
                component._added && component._added();
            }
        }
    }

    remove(component) {
        console.assert(this._children);
        if (this._children) {
            if (this._children.remove(component)>=0) {
                getDrawPlatform().removeChild(this._root, component._root);
                component._removed && component._removed();
            }
        }
    }

    clear() {
        delete this._children;
        getDrawPlatform().replaceChildren(this._root);
    }

    contains(child) {
        return this._children && this._children.indexOf(child)>=0;
    }

    get children() {
        return this._children ? this._children : [];
    }

    _added() {
        if (this._children) {
            for (let component of this._children) {
                component._added && component._added();
            }
        }
    }

    _removed() {
        if (this._children) {
            for (let component of this._children) {
                component._removed && component._removed();
            }
        }
    }

}

export class A extends DComposed {

    constructor(text, href) {
        super("a");
        if (href) this.root.setAttribute("href", href);
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

export class LI extends DComposed {

    constructor(text) {
        super("li");
        text && this.setText(text);
    }

}

export class UL extends DComposed {

    constructor() {
        super("ul");
    }

    add(child) {
        console.assert(child instanceof LI);
        return super.add(child);
    }
}

export class Nav extends DComposed {

    constructor() {
        super("nav");
    }

}

export class Button extends DComposed {

    constructor(text) {
        super("button");
        this.setText(text);
    }

}

export class Div extends DComposed {

    constructor(text) {
        super("div");
        if (text) this.setText(text);
    }

}

export class Form extends DComposed {

    constructor() {
        super("form");
    }

}

export class Label extends DComposed {

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

export class Span extends DComposed {

    constructor(text) {
        super("span");
        this.setText(text);
    }

}

export class P extends DComposed {

    constructor(text) {
        super("p");
        this.setText(text);
    }

}

export class Blockquote extends DComposed {

    constructor(innerHTML) {
        super("blockquote");
        this.setText(innerHTML);
    }

}

export class I extends DComposed {

    constructor(icon) {
        super("i");
        this.addClass("fa fa-"+icon);
    }

}

export class TR extends DComposed {

    constructor() {
        super("tr");
    }

}

export class Table extends DComposed {

    constructor() {
        super("table");
    }

}

export class Thead extends DComposed {

    constructor() {
        super("thead");
    }

}

export class TBody extends DComposed {

    constructor() {
        super("tbody");
    }

}

export class TH extends DComposed {

    constructor(text) {
        super("th");
        this.setText(text);
    }

}

export class TD extends DComposed {

    constructor(text) {
        super("td");
        this.setText(text);
    }

}

export function InputMixin(clazz) {

    return class extends clazz {

        get isInput() {
            return true;
        }

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

export class Option extends DComposed {

    constructor(value, text) {
        super("option");
        this.setValue(value);
        this.setText(text);
    }

    getValue() {
        return this.getAttribute("value");
    }
    setValue(value) {
        this.setAttribute("value", value);
        return this;
    }

}

export class Select extends InputMixin(DComposed) {

    constructor() {
        super("select");
    }

    getOptions() {
        let options = [];
        for (let option of this.children) {
            options.push({value: option.getValue(), text: option.getText()});
        }
        return options;
    }

    setOptions(options) {
        for (let line of options) {
            let option = new Option(line.value, line.text).addClass("select-option");
            this.children.push(option);
            this.add(option);
        }
        return this;
    }

}

export class Enum extends Span {

    constructor(value) {
        super();
        this._value = value;
    }

    getOptions() {
        let options = [];
        for (let option in this._options) {
            options.push({value: option, text: this._options.get(option)});
        }
        return options;
    }

    setOptions(options) {
        this._options = new Map();
        for (let line of options) {
            this._options.set(line.value, line.text);
        }
        if (this._value) {
            this.setText(this._options.get(this._value));
        }
        return this;
    }

    getValue() {
        return this._value;
    }

    setValue(value) {
        this._value = value;
        if (this._value) {
            this.setText(this._options.get(this._value));
        }
        return this;
    }

}

export class Input extends InputMixin(DComposed) {

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

export class Checkbox extends Input {

    constructor() {
        super();
        this.setType("checkbox");
    }

}

export class Radio extends Input {

    constructor(name) {
        super();
        this.setType("radio");
        this.setName(name);
    }

}

export class TextArea extends InputMixin(DComposed) {

    constructor() {
        super("textarea");
    }

}

export class Img extends DComponent {

    constructor(imgSrc, onLoad) {
        super("img");
        imgSrc&&this.setSrc(imgSrc);
        this.root.onload = function(){
            for (let listener of Img._loaderListeners) {
                listener.onImageLoaded(this);
            }
        };
        onLoad && this.onEvent("load", onLoad);
    }

    getSrc() {
        if (this._root.src===undefined) {
            console.assert("undefined !!");
        }
        return this._root.src;
    }

    setSrc(imgSrc, trigger) {
        console.assert(imgSrc)
        this._root.src = imgSrc;
        trigger && this.onEvent("load", trigger);
        return this;
    }

    getDataBlob(fileName, width = this._root.width, height = this._root.height) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(this._root, 0, 0, width, height);
        return dataURLtoBlob(canvas.toDataURL("image/png"));
    }

    getDataURL(fileName, width = this._root.width, height = this._root.height) {
        return URL.createObjectURL(this.getDataBlob(fileName, width, height));
    }

    getFile(fileName, width = this._root.width, height = this._root.height) {
        return new File([this.getDataBlob(fileName, width, height)], fileName);
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
        UndoRedo.listeners.remove(listener);
        if (!UndoRedo.listeners.length) {
            delete UndoRedo.active;
        }
    }

    static emitUndoEvent() {
        let listener = UndoRedo.listeners.last();
        if (listener) {
            listener.undo && listener.undo();
        }
    }

    static emitRedoEvent() {
        for (let listener of UndoRedo.listeners) {
            listener.redo && listener.redo();
        }
    }

}

export function isImageFile(file) {
    return file.type === "image/png" || file.type === "image/jpeg";
}

export function isImageURL(url) {
    let index = url.lastIndexOf(".");
    if (index>=0) {
        let extension = url.substring(index+1);
        return extension === "png" || extension === "jpeg" || extension === "jpg";
    }
    return false;
}

export function sendGet(uri, success, failure, files) {
    getDrawPlatform().requestServer(uri, null, success, failure, files, 'GET');
}

export function sendPost(uri, requestContent, success, failure, files) {
    getDrawPlatform().requestServer(uri, requestContent, success, failure, files, 'POST');
}

export function requestLog(...params) {
    //console.log(...params);
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

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

export function replaceSelectedText(root, node) {
    let sel = window.getSelection();
    let ancestor = sel.baseNode;
    while (ancestor && ancestor !== root) {
        ancestor = ancestor.parentNode;
    }
    if (ancestor === root) {
        if (sel.rangeCount) {
            let range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(node);
            range.setStartAfter(node);
            sel.addRange(range);
        }
    }
}

let _uniqueId=0;

export function getUniqueId() {
    return _uniqueId++;
}

function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}