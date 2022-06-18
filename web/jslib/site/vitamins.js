'use strict'

import {
    Div, A, Button, Form, Label, Input, Span, App, Img, P, UL, LI, Select, Option, TextArea
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
                for (let child of component.children) {
                    if (child.get) {
                        let result = child.get(ref);
                        if (result) return result;
                    }
                    else {
                        let result = visit(child, ref);
                        if (result) return result;
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
            if (parent) {
                if (isVitamin(parent)) return parent;
                parent = this.getParent();
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
                } else {
                    this.removeClass("vitamin-active");
                    this.addClass("vitamin-inactive");
                }
            }
        }

        _activate() {
            this._updateActivation(!!this.parent && this.parent.active);
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

        set enabled(enabled) {
            console.assert(enabled !== undefined);
            this._enabled = enabled;
            if (enabled) {
                this._activate();
            }
            else {
                this._desactivate();
            }
        }

        onEvent(event, action) {
            super.onEvent(event, event=>{
                if (this._active) {
                    return  action(event);
                } else {
                    return false;
                }
            });
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

    add(component) {
        super.add(component);
        return this;
    }

    static get instance() {
        return VApp._instance;
    }

}

export class VMenuItem extends Vitamin(A) {

    constructor({ref, title, enabled=true, action}) {
        super(ref, title);
        this.enabled = enabled;
        this.onMouseClick(
            ()=>this.active&&action()
        );
    }

}

export class VMenuBarMenuItem extends VMenuItem {

    constructor(params) {
        super(params);
        this.addClass("ddtn-menu-bar-item");
    }

}

export class VDropdownMenu extends Vitamin(Div) {
    constructor({ref, title, enabled=true}, builder) {
        super(ref);
        this.addClass("ddtn-dropdown");
        this.add(new Button(title).addClass("ddtn-droptitle").addClass("ddtn-menu-bar-item"));
        this._content = new Div().addClass("ddtn-dropdown-content");
        this.add(this._content);
        builder&&builder(this);
        this.enabled = enabled;
    }

    addMenu({ref, title, enabled, action, menu}) {
        let vmenu = menu ? menu : new VMenuItem({ref, title, enabled, action});
        this._content.add(vmenu);
        return this;
    }

    removeMenu(ref) {
        let toRemove = this.get(ref);
        this._content.remove(toRemove);
        return this;
    }

    insertMenu({ref, title, enabled, action}, beforeRef) {
        let beforeMenu = this.get(beforeRef);
        console.assert(beforeMenu);
        if (beforeMenu) {
            let menu = new VMenuItem({ref, title, enabled, action});
            this._content.insert(menu, beforeMenu);
        }
        return this;
    }

}

export class VMenu extends Vitamin(Div) {

    constructor({ref}) {
        super({ref});
        this.addClass("ddtn-navbar");
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

    addMenu({ref, title, enabled, action}) {
        this._menu.addMenu({ref, title, enabled, action});
        return this;
    }

    removeMenu(ref) {
        this._menu.removeMenu(ref);
        return this;
    }

    insertMenu({ref, title, enabled, action, menu}, beforeRef) {
        this._menu.insertMenu({ref, title, enabled, action, menu}, beforeRef);
        return this;
    }

    insertDropdownMenu({ref, title, enabled}, beforeRef, builder) {
        this._menu.insertDropdownMenu({ref, title, enabled}, beforeRef, builder);
        return this;
    }

    addDropdownMenu({ref, title, enabled}, builder) {
        this._menu.addDropdownMenu({ref, title, enabled}, builder);
        return this;
    }

}

/*
<div id="id01" class="modal">

  <form class="modal-content animate" action="/action_page.php" method="post">
    <div class="imgcontainer">
      <span onclick="document.getElementById('id01').style.display='none'" class="close" title="Close Modal">&times;</span>
      <img src="img_avatar2.png" alt="Avatar" class="avatar">
    </div>

    <div class="container">
      <label for="uname"><b>Username</b></label>
      <input type="text" placeholder="Enter Username" name="uname" required>

      <label for="psw"><b>Password</b></label>
      <input type="password" placeholder="Enter Password" name="psw" required>

      <button type="submit">Login</button>
      <label>
        <input type="checkbox" checked="checked" name="remember"> Remember me
      </label>
    </div>

    <div class="container" style="background-color:#f1f1f1">
      <button type="button" onclick="document.getElementById('id01').style.display='none'" class="cancelbtn">Cancel</button>
      <span class="psw">Forgot <a href="#">password?</a></span>
    </div>
  </form>
</div>

 */

export class VField extends Vitamin(Div) {

    constructor({ref, label, value="", ...params}) {
        super(ref);
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._initField(params);
    }

    get field() {
        return this._input;
    }

    _updateActivation(active) {
        super._updateActivation(active);
        if (active) {
            this.field.removeAttribute("disabled");
        }
        else {
            this.field.setAttribute("disabled", "true");
        }
    }

    get enabled() {
        return !this.field.getDisabled();
    }

    set enabled(value) {
        this.field.setDisabled(!value);
    }

    get value() {
        return this.field.getValue();
    }

    set value(value) {
        this.field.setValue(value);
    }

}

export class VInputField extends VField {

    _initField({value, onInput, onChange}) {
        this._input = new Input(value).addClass("form-input-text");
        this.value = value ? vale : "";
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VPasswordField extends VField {

    _initField({value, onInput, onChange}) {
        this._input = new Input(value).setType("password").addClass("form-input-text");
        this.value = value;
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VInputTextArea extends VField {

    _initField({value, onInput, onChange}) {
        this._input = new TextArea(value).addClass("form-input-textarea");
        this.value = value ? vale : "";
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VOption extends Vitamin(Option) {

    constructor({ref, value, text}) {
        super(ref);
        this.setText(text);
        this.setAttribute("value", value);
    }

    get value() {
        return this.getAttribute("value");
    }

    get text() {
        return this.getText();
    }

}

export class VSelectField extends VField {

    _initField({value, options, onChange}) {
        this._select = new Select(value).addClass("form-input-select");
        this.value = value;
        this._options = [];
        options && (this.optionLines = options);
        onChange&&this._select.onChange(onChange);
        this.add(this._select);
    }

    get field() {
        return this._select;
    }

    get optionLines() {
        let options = [];
        for (let option of this._options) {
            options.push({ref: option.ref, value: option.value, text: option.text});
        }
        return options;
    }

    set optionLines(options) {
        this._options&&this._removeOptions(this._options);
        for (let line of options) {
            let option = new VOption(line).addClass("form-input-select-option");
            this._options.push(option);
            this._select.add(option);
        }
        return this;
    }

    _removeOptions(options) {
        for (let option of options) {
            this.remove(option);
        }
        this._options = [];
    }

    get options() {
        return this._options;
    }

    set options(options) {
        this._options = options;
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

    addField({field, ...params}, builder) {
        field = field ? field : builder(params);
        this._columns[this._fields.length%this._columns.length].add(field);
        this._fields.push(field);
        return this;
    }

    addInputField(params) {
        this.addField(params, (params)=>new VInputField(params));
        return this;
    }

    addPasswordField(params) {
        this.addField(params, (params)=>new VPasswordField(params));
        return this;
    }

    addCheckBoxesField(params) {
        this.addField(params, (params)=>new VCheckboxes(params));
        return this;
    }

    addRadiosField({...params}) {
        this.addField(params, (params)=>new VRadios(params));
        return this;
    }

}

export class VButton extends Vitamin(Button) {

    constructor({ref, label, type, enabled=true, onClick}) {
        super(ref, label);
        this.addClass("form-button");
        if (type===VButton.TYPES.ACCEPT) this.addClass("form-button-accept");
        else if (type===VButton.TYPES.REFUSE) this.addClass("form-button-refuse");
        else this.addClass("form-button-neutral");
        onClick&&this.onMouseClick(onClick);
        this.enabled = enabled;
    }

    static TYPES = {
        ACCEPT: "accept",
        REFUSE: "refuse",
        NEUTRAL: "neutral",
    }

}

export class VDownload extends Vitamin(A) {

    constructor({ref, label, type, enabled=true, onClick}) {
        super(ref, label);
        this.addClass("form-button");
        if (type===VButton.TYPES.ACCEPT) this.addClass("form-button-accept");
        else if (type===VButton.TYPES.REFUSE) this.addClass("form-button-refuse");
        else this.addClass("form-button-neutral");
        onClick&&this.onMouseClick(onClick);
        this.enabled = enabled;
    }

    static TYPES = {
        ACCEPT: "accept",
        REFUSE: "refuse",
        NEUTRAL: "neutral",
    }

}

export class VButtons extends Vitamin(Div) {

    constructor({ref, vertical, buttons}) {
        super(ref);
        this.addClass(vertical ? "form-row-container" : "form-line-container");
        for (let button of buttons) {
            this.add(new VButton(button));
        }
    }

}

export class VCheckbox extends Vitamin(Label) {

    constructor({ref, title, name, checked=false, onInput, onChange}) {
        super(ref);
        this.addClass("form-checkmark-container");
        this._label = new Div().addClass("form-checkmark-label").setText(title);
        this._input = new Input().setType("checkbox").setName(name?name:ref);
        this.checked = checked;
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this._span = new Span().addClass("form-checkmark");
        this.add(this._input);
        this.add(this._label);
        this.add(this._span);
    }

    _updateActivation(active) {
        super._updateActivation(active);
        if (active) {
            this._input.removeAttribute("disabled");
        }
        else {
            this._input.setAttribute("disabled", "true");
        }
    }

    get name() {
        return this._input.getName();
    }

    set name(name) {
        this._input.setChecked(name);
    }

    get checked() {
        return this._input.getChecked();
    }

    set checked(checked) {
        this._input.setChecked(checked);
    }

    get value() {
        return this.checked ? this._input.getName() : null;
    }

    set value(value) {
        this.checked = value === this._input.getName();
    }

}

export class VCheckboxes extends Vitamin(Div) {

    constructor({ref, label, vertical, onInput, onChange, checkboxes}) {
        super(ref);
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._boxes = new Div().addClass(vertical ? "form-line-container" : "form-row-container");
        this.add(this._boxes);
        for (let checkbox of checkboxes) {
            (onInput&&!checkbox.onInput)&&(checkbox.onInput=onInput);
            (onChange&&!checkbox.onChange)&&(checkbox.onInput=onChange);
            this._boxes.add(new VCheckbox(checkbox));
        }
    }

    get value() {
        let boxes = [];
        for (let box of this._boxes.children) {
            let value = box.checked;
            if (value) boxes.push(box.ref);
        }
        return boxes;
    }

    set value(values) {
        for (let box of this._boxes.children) {
            box.checked = values.indexOf(box.ref)>=0;
        }
    }

}

export class VRadio extends Vitamin(Label) {

    constructor({ref, title, name, checked=false, onInput, onChange}) {
        super(ref);
        this.addClass("form-radio-container");
        this._label = new Div().addClass("form-radio-label").setText(title);
        this._input = new Input().setType("radio").setName(name?name:ref);
        this.checked = checked;
        this._span = new Span().addClass("form-radio");
        this.add(this._input);
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this.add(this._label);
        this.add(this._span);
    }

    _updateActivation(active) {
        super._updateActivation(active);
        if (active) {
            this._input.removeAttribute("disabled");
        }
        else {
            this._input.setAttribute("disabled", "true");
        }
    }

    get name() {
        return this._input.getName();
    }

    set name(name) {
        this._input.setChecked(name);
    }

    get checked() {
        return this._input.getChecked();
    }

    set checked(checked) {
        this._input.setChecked(checked);
    }

    get value() {
        return this.checked ? this._input.getName() : null;
    }

    set value(value) {
        this.checked = value === this._input.getName();
    }

}

export class VRadios extends Vitamin(Div) {

    constructor({ref, label, vertical, name, onChange, onInput, radios}) {
        super(ref);
        name=name?name:ref;
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._radios = new Div().addClass(vertical ? "form-line-container" : "form-row-container");
        this.add(this._radios);
        for (let radio of radios) {
            this._radios.add(new VRadio({...radio, onChange, onInput, name}));
        }
    }

    get value() {
        for (let radio of this._radios.children) {
            if (radio.checked) return radio.ref;
        }
        return null;
    }

    set value(value) {
        for (let radio of this._radios.children) {
            radio.checked = value===radio.ref;
        }
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

    addContainer({...params}, builder) {
        this._content.add(new VContainer({...params}, builder));
        return this;
    }

    get title() {
        return this._title.children[0].getText();
    }

    set title(title) {
        this._title.children[0].setText(title);
    }

    show() {
        this.addStyle("display", "block");
        return this;
    }

    hide() {
        this.addStyle("display", "none");
        return this;
    }

}

export class VForm extends Vitamin(Form) {

    constructor({ref}, builder) {
        super({ref});
        this.addClass("form-form");
        builder&&builder(this);
    }

    addContainer({...params}, builder) {
        this.add(new VContainer({...params}, builder));
        return this;
    }

}

export class VSection extends Vitamin(Div) {

    constructor({ref, enabled=true}, builder) {
        super({ref});
        this.addClass("page-section");
        this.enabled = enabled;
        builder&&builder(this);
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
        this._title = new Span(title).addClass("header-text");
        this.add(this._title);
        this._right = new Img(right).addClass("header-right-image");
        this.add(this._right);
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

export class VMagnifiedImage extends Vitamin(Div) {

    constructor({ref, img, zoomImg, alt, width}) {
        super({ref});
        this.addClass("img-magnifier-container");
        this._image = new Img(img).setAlt(alt).setWidth(width).addClass("gallery-card-image");
        this.add(this._image);
        this.onEvent("mousemove", event=>{
            this._event = event;
        });
        this.onEvent("mouseenter", event=>{
            this._magnify = true;
            this._event = event;
            setTimeout(()=>{
                if (this._magnify) {
                    this.setMagnifier(5, zoomImg, this._event);
                }
            }, 1000);
        });
        this.onEvent("mouseleave", e=>{
            delete this._magnify;
            delete this._event;
            this.unsetMagnifier();
        });

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
        this.set({content});
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

export class VSummary extends Vitamin(Div) {

    constructor({ref, img, alt, width, title, description}) {
        super({ref});
        this.addClass("gallery-summary");
        this._divImage = new Div();
        this._image = new Img(img).setAlt(alt).setWidth(width).addClass("gallery-summary-image");
        this._divImage.add(this._image);
        this.add(this._divImage);
        this._content = new Div().addClass("gallery-summary-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-summary-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-summary-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-summary-line");
            this._content.add(this._description);
        }
    }

}

export class VCard extends Vitamin(Div) {

    constructor({ref, img, image, alt, width, title, description, button, action}) {
        super({ref});
        this.addClass("gallery-card");
        if (image) {
            this._divImage = image;
        }
        else {
            this._divImage = new Div();
            this._image = new Img(img).setAlt(alt).setWidth(width).addClass("gallery-card-image");
            this._divImage.add(this._image);
        }
        this.add(this._divImage);
        this._content = new Div().addClass("gallery-card-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-card-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-card-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-card-line");
            this._content.add(this._description);
        }
        this._button = new VButton({ref:ref+"-button", label:button, type:VButton.TYPES.ACCEPT, onClick:action});
        this._content.add(new Span().add(this._button).addClass("gallery-card-button"));
    }

}

export class VGallery extends Vitamin(Div) {

    constructor({ref, card=VCard, kind="gallery-vertical"}, builder) {
        super({ref});
        this._cardClass = card;
        this.addClass("gallery-row");
        kind&&this.addClass(kind);
        this._cards = [];
        builder&&builder(this);
    }

    addCard({card, ...params}) {
        let aCard = card ? card : new this._cardClass({...params});
        aCard._envelope = new Div().addClass("gallery-column");
        aCard._envelope.add(aCard);
        this.add(aCard._envelope);
        this._cards.push(aCard);
        return this;
    }

    clearCards() {
        for (let card of this._cards) {
            this.remove(card._envelope);
        }
        this._cards = [];
    }
}

export class VFileLoader extends Vitamin(Div) {

    constructor({ref}) {
        super({ref});
        this.addClass("file-loader");
        this.onEvent("drop", event=>this.dropHandler(event));
        this.onEvent("dragover", event=>this.dragOverHandler(event));
    }

    dropHandler(event) {
        event.preventDefault();
        if (event.dataTransfer.items) {
            for (let i = 0; i < event.dataTransfer.items.length; i++) {
                if (event.dataTransfer.items[i].kind === 'file') {
                    let file = event.dataTransfer.items[i].getAsFile();
                    console.log('... file[' + i + '].name = ' + file.name);
                }
            }
        } else {
            for (let i = 0; i < event.dataTransfer.files.length; i++) {
                console.log('... file[' + i + '].name = ' + event.dataTransfer.files[i].name);
            }
        }
    }

    dragOverHandler(event) {
        event.preventDefault();
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

export class VRow extends Vitamin(Div) {

    constructor({ref}, builder) {
        super(ref);
        this.addClass("page-row");
        builder&&builer(this);
    }

}

export class VLink extends Vitamin(A) {

    constructor({ref, text, content, action, url}) {
        super(ref, text);
        if (action) {
            this.onMouseClick(action);
        }
        else if (url) {
            this.setHref(url).setAttribute("target","_blank");
        }
        if (content) this.add(content);
    }

}
