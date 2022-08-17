'use strict'

import {
    Div, A, Form, Input, Span, App, Img, P, UL, LI, UndoRedo
} from "./components.js";

export function isVitamin(component) {
    return !!component._root._vitamin;
}

export function Vitamin(Component) {

    return class extends Component {

        constructor(ref, ...params) {
            super(...params);
            this._ref = ref;
            this._enabled = true;
            this._initActivation();
            this._root._vitamin = this;
        }

        _initActivation() {
            this._active = false;
            this.addClass("vitamin-inactive");
        }

        get(ref) {
            function visit(component, ref) {
                if (component.children) {
                    for (let child of component.children) {
                        if (child.get) {
                            let result = child.get(ref);
                            if (result) return result;
                        } else {
                            let result = visit(child, ref);
                            if (result) return result;
                        }
                    }
                }
                return null;
            }
            if (ref === this._ref) {
                return this;
            }
            else {
                return visit(this, ref);
            }
        }

        _added() {
            this._activate();
        }

        _removed() {
            this._desactivate();
        }

        visitDown(action) {
            function _visit(component, action) {
                if (component.children) {
                    for (let child of component.children) {
                        if (isVitamin(child)) child.visitDown(action);
                        else {
                            _visit(child, action);
                        }
                    }
                }
            }
            if (action(this)) {
                _visit(this, action);
            }
        }

        visitUp(action) {
            if (action(this)) {
                let parent = this.parent;
                if (parent) {
                    parent.visitUp(action);
                }
            }
        }

        get ref() {
            return this._ref;
        }

        get enabled() {
            this._enabled;
        }

        get active() {
            return this._active;
        }

        get parent() {
            let parent = this.getParent();
            while (parent) {
                if (isVitamin(parent)) return parent;
                parent = parent.getParent();
            }
            return null;
        }

        _updateActivation(active) {
            console.assert(active!==undefined && this._active!==undefined);
            if (active !== this._active) {
                this._active = active;
                if (this._active) {
                    this.onActivate();
                } else {
                    this.onDesactivate();
                }
            }
        }

        onActivate() {
            this.removeClass("vitamin-inactive");
            this.addClass("vitamin-active");
        }

        onDesactivate() {
            this.removeClass("vitamin-active");
            this.addClass("vitamin-inactive");
        }

        _activate() {
            this._updateActivation(!!this.parent && !!this.parent.active);
            if (this._active) {
                this.visitDown(vitamin=> {
                    if (this !== vitamin) {
                        if (vitamin._enabled) {
                            vitamin._updateActivation(true);
                            return true;
                        }
                        else {
                            vitamin._desactivate();
                            return false;
                        }
                    }
                    return true;
                });
                return true;
            }
            else {
                this._desactivate();
                return false;
            }
        }

        _desactivate() {
            this.visitDown(function (vitamin) {
                vitamin._updateActivation(false);
                return true;
            });
        }

        _setEnabled(enabled) {
            console.assert(enabled !== undefined);
            this._enabled = enabled;
            if (enabled) {
                this._activate();
            }
            else {
                this._desactivate();
            }
        }

        set enabled(enabled) {
            this._setEnabled(enabled);
        }

        onEvent(event, action) {
            super.onEvent(event, action ? event=>{
                if (this._active) {
                    return action(event);
                } else {
                    return false;
                }
            } : null);
        }

    }

}

export function Undoable(clazz) {

    return class extends clazz {

        constructor(...params) {
            super(...params);
            this._clean();
        }

        _isDirty() {
            let memento = this._register();
            let lastMemento = this._undos[0];
            return JSON.stringify(memento) !== JSON.stringify(lastMemento);
        }

        _clean() {
            this._undos = [];
            this._redos = [];
        }

        onActivate() {
            super.onActivate();
            UndoRedo.addListener(this);
        }

        onDesactivate() {
            super.onDesactivate();
            UndoRedo.removeListener(this);
        }

        _memorize() {
            let memento = this._register();
            let lastMemento = this._undos[this._undos.length-1];
            if (JSON.stringify(memento) !== JSON.stringify(lastMemento)) {
                this._undos.push(memento);
                console.log(this._undos[this._undos.length-1])
                this._redos = [];
            }
        }

        undo() {
            let memento = this._register();
            let lastMemento = this._undos[this._undos.length-1];
            while (JSON.stringify(memento) === JSON.stringify(lastMemento)) {
                if (this._undos.length === 1) return;
                this._undos.pop();
                lastMemento = this._undos[this._undos.length - 1];
            }
            this._redos.push(memento);
            this._recover(lastMemento);
        }

        redo() {
            let specification = this._redos.pop();
            this._recover(specification);
            this._undos.push(this._register());
        }

        canLeave(leave, message) {
            if (this._isDirty()) {
                VConfirmHandler.emit({
                    title: "Confirm", message,
                    actionOk: () => {
                        this._clean();
                        leave();
                    },
                    actionCancel: () => {
                        this._clean();
                        leave();
                    }
                })
                return false;
            }
            return true;
        }

    }

}

export class VMessageHandler {

    static _listeners = new Set();

    static addMessageListener(listener) {
        VMessageHandler._listeners.add(listener);
    }

    static removeMessageListener(listener) {
        VMessageHandler._listeners.delete(listener);
    }

    static emit({title, message}) {
        for (let listener of VMessageHandler._listeners) {
            listener.onMessageEmitted({title, message});
        }
    }

}

export class VConfirmHandler {

    static _listeners = new Set();

    static addMessageListener(listener) {
        VConfirmHandler._listeners.add(listener);
    }

    static removeMessageListener(listener) {
        VConfirmHandler._listeners.delete(listener);
    }

    static emit({title, message, actionOk, actionCancel}) {
        for (let listener of VConfirmHandler._listeners) {
            listener.onConfirmEmitted({title, message, actionOk, actionCancel});
        }
    }

}

export class VApp extends Vitamin(Div) {

    _initActivation() {
        console.assert(!VApp._instance);
        VApp._instance = this;
        this._active = true;
        this.addClass("vitamin-active");
        this.addClass("app");
    }

    register(modal) {
        if (!this.contains(modal)) {
            this.add(modal);
        }
    }

    static get instance() {
        return VApp._instance;
    }

}

export class VMessage extends Vitamin(P) {

    constructor({ref, message = ""}) {
        super(ref);
        this.addClass("form-message");
        this.setText(message);
    }

    get message() {
        return this.getText();
    }

    set message(message) {
        this.setText(message);
    }

}

export class VText extends Vitamin(P) {

    constructor({ref, text}) {
        super({ref}, text);
    }

}

export class VModal extends Vitamin(Div) {

    constructor({ref, title}, builder) {
        super({ref});
        this.addClass("modal");
        this._content = new Form({ref:"form-"+ref})
            .addClass("modal-content").addClass("modal-animate");
        this._title = new Div().addClass("modal-title")
            .add(new Span(title?title:"").addClass("modal-title-text"));
        this._close = new Img("./../images/site/buttons/cross.png").addClass("modal-title-close");
        this._title.add(this._close);
        this._content.add(this._title);
        this._close.onMouseClick(event=>this.hide());
        builder&&builder(this._content);
        this.add(this._content);
    }

    addContainer({container, ...params}, builder) {
        this._content.add(container, builder);
        return this;
    }

    removeContainer({container}) {
        this._content.remove(container);
        return this;
    }

    get content() {
        return this._content;
    }

    get title() {
        return this._title.children[0].getText();
    }

    set title(title) {
        this._title.children[0].setText(title);
    }

    show() {
        VApp.instance.register(this);
        this.addStyle("display", "block");
        return this;
    }

    hide() {
        this.addStyle("display", "none");
        return this;
    }

}

export class VSearch extends Vitamin(Div) {

    constructor({ref, value, placeholder="Keywords", searchAction}) {
        super(ref);
        this.addClass("search");
        this._input = new Input(value).setType("search").setAttribute("placeholder", placeholder).addClass("search-input-text");
        this.value = value ? value : "";
        this._button = new Div().addClass("search-button");
        this._searchAction = event=>searchAction(this._input.getValue());
        this.add(this._input);
        this.add(this._button);
    }

    get value() {
        return this.field.getValue();
    }

    set value(value) {
        this._input.setValue(value);
    }

    onActivate() {
        super.onActivate();
        this._button.onEvent("click", this._searchAction);
    }

    onDesactivate() {
        super.onDesactivate();
        this._button.onEvent("click", null);
    }
}

export class VImage extends Vitamin(Div) {

    constructor({ref, img, kind="vitamin-image", width, onLoad}) {
        super({ref});
        this._onLoad = onLoad;
        this._image = new Img(img, onLoad).setWidth(width).addClass(kind);
        this.add(this._image);
    }

    get imageRoot() {
        return this._image.root;
    }

    get src() {
        return this._image.getSrc();
    }

    get imageWidth() {
        return this._image.offsetWidth;
    }

    get imageHeight() {
        return this._image.offsetHeight;
    }

    setSrc(imgSrc, trigger=this._onLoad) {
        this._image.setSrc(imgSrc, trigger);
        return this;
    }

}

export class VMagnifiedImage extends VImage {

    constructor({ref, img, kind="vitamin-image", zoomImg=img, width, onLoad}) {
        super({ref, img, kind, width, onLoad});

        this.addClass("img-magnifier-container");
        this._zoomImg = zoomImg;
        this._mouseMoveAction = event=>{
            this._event = event;
        };
        this._mouseEnterAction = event=>{
            this._magnify = true;
            this._event = event;
            setTimeout(()=>{
                if (this._magnify) {
                    this.setMagnifier(5, this._zoomImg, this._event);
                }
            }, 1000);
        };
        this._mouseLeaveAction = event=>{
            delete this._magnify;
            delete this._event;
            this.unsetMagnifier();
        };
        this.activateMagnifier();
    }

    activateMagnifier() {
        this.onEvent("mousemove", this._mouseMoveAction);
        this.onEvent("mouseenter", this._mouseEnterAction);
        this.onEvent("mouseleave", this._mouseLeaveAction);
        return this;
    }

    desactivateMagnifier() {
        this.onEvent("mousemove");
        this.onEvent("mouseenter");
        this.onEvent("mouseleave");
        return this;
    }

    setMagnifier(zoom, zoomImg, event) {

        this._moveMagnifier = event=>{
            if (this._glass) {
                /* Prevent any other actions that may occur when moving over the image */
                event.preventDefault();
                /* Get the cursor's x and y positions: */
                let pos = this.getCursorPos(event);
                let x = pos.x;
                let y = pos.y;
                let w = this._glass.offsetWidth / 2;
                let h = this._glass.offsetHeight / 2;
                /* Prevent the magnifier glass from being positioned outside the image: */
                if (x > this._image.offsetWidth - (w / zoom)) {
                    x = this._image.offsetWidth - (w / zoom);
                }
                if (x < w / zoom) {
                    x = w / zoom;
                }
                if (y > this._image.offsetHeight - (h / zoom)) {
                    y = this._image.offsetHeight - (h / zoom);
                }
                if (y < h / zoom) {
                    y = h / zoom;
                }
                /* Set the position of the magnifier glass: */
                this._glass.addStyle("left", (x - w) + "px");
                this._glass.addStyle("top", (y - h) + "px");
                /* Display what the magnifier glass "sees": */
                this._glass.addStyle("backgroundPosition", "-" + ((x * zoom) - w) + "px -" + ((y * zoom) - h) + "px");
            }
        }

        /* Create magnifier glass: */
        if (!this._glass) {
            this._glass = new Div();
            this._glass.setAttribute("class", "img-magnifier-glass");
            /* Insert magnifier glass: */
            this._image.getParent().insert(this._glass, this._image);
            /* Set background properties for the magnifier glass: */
            this._glass.addStyle("backgroundImage", "url('" + zoomImg + "')");
            this._glass.addStyle("backgroundRepeat", "no-repeat");
            this._glass.addStyle("backgroundSize", (this._image.root.width * zoom) + "px " + (this._image.root.height * zoom) + "px");
            this._glass.onEvent("mousemove", this._moveMagnifier);
            this._image.onEvent("mousemove", this._moveMagnifier);
            this._glass.onEvent("touchmove", this._moveMagnifier);
            this._image.onEvent("touchmove", this._moveMagnifier);
            this._moveMagnifier(event);
        }
    }

    unsetMagnifier() {
        /* Remove magnifier glass: */
        if (this._glass) {
            this._image.getParent().remove(this._glass);
            this._glass.onEvent("mousemove", null);
            this._image.onEvent("mousemove", null);
            this._glass.onEvent("touchmove", null);
            this._image.onEvent("touchmove", null);
            delete this._glass;
        }
    }

    getCursorPos(e) {
        var a, x = 0, y = 0;
        /* Get the x and y positions of the image: */
        a = this._image.root.getBoundingClientRect();
        /* Calculate the cursor's x and y coordinates, relative to the image: */
        x = e.pageX - a.left;
        y = e.pageY - a.top;
        /* Consider any page scrolling: */
        x = x - window.pageXOffset;
        y = y - window.pageYOffset;
        return {x ,y};
    }

}

export class VSlot extends Vitamin(Div) {

    constructor({ref, content}) {
        super({ref});
        content && this.set({content});
    }

    set({content}) {
        if (this._content) {
            this.remove(this._content);
            delete this._content;
        }
        if (content) {
            this._content = content;
            this.add(content);
        }
    }

}

export class VLine extends Vitamin(LI) {

    constructor({ref, text, content, url, action}) {
        if (action) {
            let link = new A(text);
            if (content) link.add(content);
            link.onMouseClick(action);
            content = link;
            text = null;
        }
        else if (url) {
            let link = new A(text).setHref(url).setAttribute("target","_blank");
            if (content) link.add(content);
            content = link;
            text = null;
        }
        super(ref, text);
        if (content) this.add(content);
    }

}

export class VList extends Vitamin(UL) {

    constructor({ref}, builder) {
        super(ref);
        builder && builder(this);
    }

    addLine({field, text, action}) {
        if (field) {
            this.add(field);
        }
        else if (action) {
            this.add(new VLine({ref:this.ref+this.children.size, content:new A(text).onMouseClick(action)}));
        }
        else {
            this.add(new VLine({ref:this.ref+this.children.size, text}));
        }
    }

}

export class VRow extends Vitamin(Div) {

    constructor({ref}, builder) {
        super(ref);
        this.addClass("page-row");
        builder&&builer(this);
    }

}

export class VDisplay extends Vitamin(Div) {

    constructor({ref, content}) {
        super(ref).addClass("display-content");
        content && this.setText(content);
    }

    get content() {
        return this.getText();
    }

    set content(content) {
        this.setText(content);
    }

}

export class VLink extends Vitamin(A) {

    constructor({ref, text, content, onClick, url}) {
        super(ref, text);
        if (onClick) {
            this.onMouseClick(onClick);
        }
        else if (url) {
            this.setHref(url).setAttribute("target","_blank");
        }
        if (content) this.add(content);
    }

}

Function.prototype.clone = function() {
    return this;
}


export function historize(title, revert) {
    history.pushState({
        title, revert
    }, title);
}

window.onpopstate = function (event) {
    if (history._preventDefault) {
        delete history._preventDefault;
    }
    else {
        if (event.state) {
            if (event.state.revert) {
                if (!eval(event.state.revert)) {
                    history._preventDefault = true;
                    history.forward();
                }
            }
        }
    }
    return true;
}

let inheritMap = new Map();
Array.from(document.styleSheets).forEach(function (styleSheet) {
    try {
        Array.from(styleSheet.cssRules).forEach(function (cssRule) {
            if (cssRule.selectorText.trim().match(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*/)) {
                inheritMap.set(cssRule.selectorText.trim().substring(1), cssRule);
            }
        });
    } catch (exception) {}
});
Array.from(document.styleSheets).forEach(function (styleSheet) {
    function cssExtend(cssRule) {
        //console.log(cssRule.cssText);
        if (cssRule.style) {
            let extensions = cssRule.style.getPropertyValue("--extends");
            if (extensions) {
                extensions = extensions.trim().split(",");
                cssRule.style.removeProperty("--extends");
                for (let extension of extensions) {
                    if (extension) {
                        extension = extension.trim();
                        let inherited = inheritMap.get(extension);
                        if (inherited) {
                            cssExtend(inherited);
                            for (let property of inherited.style) {
                                if (cssRule.style.getPropertyValue(property)==="") {
                                    cssRule.style.setProperty(property, inherited.style.getPropertyValue(property));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    try {
        Array.from(styleSheet.cssRules).forEach(function (cssRule) {
            //console.log(cssRule.selectorText);
            cssExtend(cssRule);
        });
    } catch (exception) {console.log(exception)}
});
