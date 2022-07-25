'use strict'

import {
    Div, A, Button, Form, Label, Input, Span, App, Img, P, UL, LI, Select, Option, TextArea, UndoRedo
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
                    this.removeClass("vitamin-inactive");
                    this.addClass("vitamin-active");
                    this.onActivate && this.onActivate();
                } else {
                    this.removeClass("vitamin-active");
                    this.addClass("vitamin-inactive");
                    this.onDesactivate && this.onDesactivate();
                }
            }
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
            UndoRedo.addListener(this);
        }

        onDesactivate() {
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

        canLeave(leave) {
            if (this._isDirty()) {
                VConfirmHandler.emit({
                    title: "Confirm", message: "Article not saved. Do you want to Quit ?",
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

export class VMenuItem extends Vitamin(A) {

    constructor({ref, label, kind, enabled=true, action}) {
        super(ref, label);
        kind && this.addClass(kind);
        this.enabled = enabled;
        this.onMouseClick(
            ()=>this.active&&action()
        );
    }

    get label() {
        return this.getText();
    }

    set label(label) {
        this.setText(label);
    }
}

export class VMenuBarMenuItem extends VMenuItem {

    constructor(params) {
        super(params);
        this.addClass("ddtn-menu-bar-item");
    }

}

export class VDropdownMenu extends Vitamin(Div) {
    constructor({ref, label, kind, enabled=true}, builder) {
        super(ref);
        kind && this.addClass(kind);
        this.addClass("ddtn-dropdown");
        this._button = new Button(label);
        this.add(this._button.addClass("ddtn-droptitle").addClass("ddtn-menu-bar-item"));
        this._content = new Div().addClass("ddtn-dropdown-content");
        this.add(this._content);
        builder&&builder(this);
        this.enabled = enabled;
    }

    addMenu({ref, label, enabled, action, menu}) {
        let vmenu = menu ? menu : new VMenuItem({ref, label, enabled, action});
        this._content.add(vmenu);
        return this;
    }

    removeMenu(ref) {
        let toRemove = this.get(ref);
        this._content.remove(toRemove);
        return this;
    }

    insertMenu({ref, label, enabled, action}, beforeRef) {
        let beforeMenu = this.get(beforeRef);
        console.assert(beforeMenu);
        if (beforeMenu) {
            let menu = new VMenuItem({ref, label, enabled, action});
            this._content.insert(menu, beforeMenu);
        }
        return this;
    }

    get label() {
        return this._button.getText();
    }

    set label(label) {
        this._button.setText(label);
    }
}

export class VMenu extends Vitamin(Div) {

    constructor({ref, kind}) {
        super({ref});
        this.addClass("ddtn-navbar");
        kind && this.addClass(kind);
    }

    addMenu(params) {
        let menu = new VMenuBarMenuItem(params);
        this.add(menu);
        return this;
    }

    insertMenu({menu, ...params}, beforeRef) {
        let beforeMenu = this.get(beforeRef);
        console.assert(beforeMenu);
        if (beforeMenu) {
            let vmenu = menu ? menu : new VMenuBarMenuItem(params);
            this.insert(vmenu, beforeMenu);
        }
        return this;
    }

    removeMenu(ref) {
        let toRemove = this.get(ref);
        this.remove(toRemove);
        return this;
    }

    addDropdownMenu({...params}, builder) {
        let ddmenu = new VDropdownMenu({...params}, builder);
        this.add(ddmenu);
        return this;
    }

    insertDropdownMenu({...params}, beforeRef, builder) {
        let beforeMenu = this.get(beforeRef);
        console.assert(beforeMenu);
        if (beforeMenu) {
            let ddmenu = new VDropdownMenu({...params}, builder);
            this.insert(ddmenu, beforeMenu);
        }
        return this;
    }

}

export class VMainMenu extends Vitamin(Div) {

    constructor({ref}) {
        super({ref:"main-"+ref});
        this.addClass("ddtn-main");
        this._menu = new VMenu({ref});
        this.add(this._menu);
    }

    addMenu(params) {
        this._menu.addMenu(params);
        return this;
    }

    removeMenu(ref) {
        this._menu.removeMenu(ref);
        return this;
    }

    insertMenu({ref, label, enabled, action, menu}, beforeRef) {
        this._menu.insertMenu({ref, label, enabled, action, menu}, beforeRef);
        return this;
    }

    insertDropdownMenu({ref, label, enabled}, beforeRef, builder) {
        this._menu.insertDropdownMenu({ref, label, enabled}, beforeRef, builder);
        return this;
    }

    addDropdownMenu(params, builder) {
        this._menu.addDropdownMenu(params, builder);
        return this;
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
        this._button.onEvent("click", this._searchAction);
    }

    onDesactivate() {
        this._button.onEvent("click", null);
    }
}

export class VContainer extends Vitamin(Div) {

    constructor({ref, enabled=true, separated=false, columns}, builder) {
        super(ref);
        this.enabled = enabled;
        this._fields = [];
        this.addClass("page-container");
        if (!columns || columns===1) {
            this._columns = [this];
            this.addClass("container-1column");
        } else {
            this._columns = [];
            this.addClass("container-row");
            for (let index=0; index<columns; index++) {
                let column = new Div().addClass(`container-${columns}columns`).addClass(`container-column${index}`);
                if (separated && index>0) column.addClass("subsequent-column");
                this._columns.push(column);
                this.add(column);
            }
        }
        builder&&builder(this);
    }

    addField({field, column, ...params}, builder) {
        field = field ? field : builder(params);
        this._columns[column===undefined ? this._fields.length%this._columns.length: column].add(field);
        this._fields.push(field);
        return this;
    }

}

export class VSplitterPanel extends Vitamin(Div) {

    constructor({ref, enabled=true}, builder) {
        super({ref});
        this.enabled = enabled;
        this._leftPane = new Div().addClass("splitter-left-pane");
        this._leftPaneContent = new Div().addClass("splitter-left-pane-content");
        this._separator = new Div().addClass("splitter-separator");
        this._rightPane = new Div().addClass("splitter-right-pane");
        this._rightPaneContent = new Div().addClass("splitter-right-pane-content");
        this.addClass("splitter-panel")
            .add(this._leftPane.add(this._leftPaneContent))
            .add(this._separator)
            .add(this._rightPane.add(this._rightPaneContent));
        this._separator.onEvent("mousedown", event=>{
            //console.log("mouse down: " + e.clientX);
            this._startPoint = {event,
                offsetLeft:  this._separator.offsetLeft,
                offsetTop:   this._separator.offsetTop,
                firstWidth:  this._leftPane.offsetWidth,
                secondWidth: this._rightPane.offsetWidth
            };
            document.onmousemove = event=> {
                let delta = {
                    x: event.clientX - this._startPoint.event.clientX,
                    y: event.clientY - this._startPoint.event.clientY
                };
                // Prevent negative-sized elements
                delta.x = Math.min(Math.max(delta.x, -this._startPoint.firstWidth), this._startPoint.secondWidth);
                this._leftPane.addStyle("width", (this._startPoint.firstWidth + delta.x) + "px");
                this._rightPane.addStyle("width", (this._startPoint.secondWidth - delta.x) + "px");
            };
            document.onmouseup = () => {
                //console.log("mouse up");
                document.onmousemove = document.onmouseup = null;
            }
        });
        builder&&builder(this);
        this._enlargeObserver = new MutationObserver(mutations=>{
            let changed = false;
            for (let mutation of mutations) {
                if (mutation.attributeName === "style") changed = true;
            }
            if (changed) this._resize();
        });
        this._enlargeObserver.observe(this.root, {attributes:true});
        window.addEventListener("resize", event=>{
            this._resize();
        });
    }

    _resize() {
        let separatorWidth = this._separator.offsetWidth;
        let totalWidth = this.offsetWidth-separatorWidth;
        let firstWidth =  this._leftPane.offsetWidth;
        let secondWidth = this._rightPane.offsetWidth;
        let previousTotalWidth = firstWidth + secondWidth;
        this._leftPane.addStyle("width", (firstWidth/previousTotalWidth*totalWidth) + "px");
        this._rightPane.addStyle("width", (secondWidth/previousTotalWidth*totalWidth) + "px");
    }

    addOnLeft(vitamin) {
        this._leftPaneContent.add(vitamin);
        return this;
    }

    removeFromLeft(vitamin) {
        this._leftPaneContent.remove(vitamin);
        return this;
    }

    addOnRight(vitamin) {
        this._rightPaneContent.add(vitamin);
        return this;
    }

    removeFromRight(vitamin) {
        this._rightPaneContent.remove(vitamin);
        return this;
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
        this._content.add(container ? container: new VContainer({...params}, builder));
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

export class VText extends Vitamin(P) {

    constructor({ref, text}) {
        super({ref}, text);
    }

}

export class VHeader extends Vitamin(Div) {

    constructor({ref, left, right, title}) {
        super({ref});
        this.addClass("header-container");
        this._left = new Img(left).addClass("header-left-image");
        this.add(this._left);
        this._title = new VSlot({ref: ref+"-title"}).addClass("header-text");
        this.add(this._title);
        title && this.setTitle(title);
        this._right = new Img(right).addClass("header-right-image");
        this.add(this._right);
    }

    setTitle(title) {
        this._title.set({content: new Span(title)});
    }

    addVitamin(component) {
        this.add(component);
        return this;
    }

}

export class VFooter extends Vitamin(Div) {

    constructor({ref, summary, content}) {
        super({ref});
        this.addClass("footer-container");
        this._summary = new Div().addClass("footer-summary");
        this.add(this._summary);
        this._summary.add(summary);
        this._content = new Div().addClass("footer-content");
        this.add(this._content);
        this._content.add(content);
    }

    addSummaryVitamin(component) {
        this._summary.add(component);
        return this;
    }

    addContentVitamin(component) {
        this._content.add(component);
        return this;
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

export class VWall extends Vitamin(Div) {

    constructor({ref, kind="wall-vertical"}, builder) {
        super({ref});
        kind&&this.addClass(kind);
        this._lastElement =new Div();
        this.add(this._lastElement);
        this._notes = [];
        builder&&builder(this);
    }

    setLoadNotes(action) {
        this._loadNotes = action;
        return this;
    }

    resizeGridItem(note){
        let rowHeight = parseInt(window.getComputedStyle(this.root).getPropertyValue('grid-auto-rows'));
        let rowGap = parseInt(window.getComputedStyle(this.root).getPropertyValue('grid-row-gap'));
        let rowSpan = Math.ceil((note.root.getBoundingClientRect().height+rowGap)/(rowHeight+rowGap));
        note._envelope.root.style.gridRowEnd = "span "+rowSpan;
    }

    onActivate() {
        this.resizeAllGridItems();
        this._resizeAll = ()=>this.resizeAllGridItems();
        window.addEventListener("resize", this._resizeAll);
        this._detectVisibility = ()=>this.detectVisibility();
        window.addEventListener("scroll", this._detectVisibility);
        Img.addLoaderListener(this);
        this.detectVisibility();
    }

    onDesactivate() {
        window.removeEventListener("resize", this._resizeAll);
        window.addEventListener("scroll", this._detectVisibility);
        Img.removeLoaderListener(this);
    }

    onImageLoaded(img) {
        this.resizeAllGridItems();
    }

    resizeAllGridItems() {
        for(let note of this._notes){
            this.resizeGridItem(note);
        }
    }

    addNote(note) {
        note._envelope = new Div();
        note._envelope.add(note);
        this.insert(note._envelope, this._lastElement);
        this._notes.push(note);
        note._added();
        return this;
    }

    clearNotes() {
        for (let note of this._notes) {
            this.remove(note._envelope);
        }
        this._notes = [];
    }

    detectVisibility() {
        let topOfElement = this._lastElement.root.offsetTop;
        let bottomOfElement = this._lastElement.root.offsetTop + this._lastElement.root.offsetHeight + this._lastElement.root.style.marginTop;
        let bottomOfScreen = window.scrollY + window.innerHeight;
        let topOfScreen = window.scrollY;
        if ((bottomOfScreen > topOfElement) && (topOfScreen < bottomOfElement)) {
            this._loadNotes && this._loadNotes();
        }
    }

}
