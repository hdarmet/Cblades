'use strict'

import {
    A, Button, Checkbox, Div, Form, Img, Input, isImageFile, Label, LI, Option, P, Select, Span, UL
} from "./components.js";
import {
    VImage,
    Vitamin, VMagnifiedImage
} from "./vitamins.js";
import {
    VContainer
} from "./vcontainer.js";


export function mandatory({message, validate}) {
    return function(field, quit) {
        if (field.value === undefined || field.value === null || (field.value.trim && field.value.trim() === "")) {
            return message ? message : field.label + " cannot be empty";
        }
        if (validate) {
            return validate(field, quit);
        }
        return "";
    }
}

export function range({message, min, max}) {
    return function(field, quit) {
        if (field.value === undefined || field.value === null || field.value.trim() === "") {
            return "";
        }
        if (quit) {
            if (min && field.value.length<min) return message ? message : field.label + " must contain at least "+min+" characters.";
            if (max && field.value.length>max) return message ? message : field.label + " must contain at most "+max+" characters.";
        }
        return "";
    }
}

export function isValid(container) {
    let result = true;
    container.visitDown(field=>{
        if (field instanceof VField) {
            result = !field.validate() && result;
        }
        return true;
    });
    return result;
}

export function or({message, validators}) {
    return function(field, quit) {
        for (let validator of validators) {
            if (!validator(field, quit)) return "";
        }
        return message ? message : "Not valid.";
    }
}

export function and({message, validators}) {
    return function(field, quit) {
        for (let validator of validators) {
            let result = validator(field, quit);
            if (result) return message ? message : result;
        }
        return "";
    }
}

export function matches({regex, message}) {
    return function(field, quit) {
        if (field.value === undefined || field.value === null || field.value.trim() === "") {
            return "";
        }
        if (quit) {
            if (field.value.trim().match(regex)) return "";
            return message;
        }
        return "";
    }
}

export function matchesLogin({message}) {
    return matches({regex:/^[\w.-]{0,19}[0-9a-zA-Z]$/u,
        message: message ? message : "Not a valid login"});
}

export function matchesEmail({message}) {
    return matches({regex:/^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})$/,
        message: message ? message : "Not an email"});
}

export function matchesName({message}) {
    return matches({regex:/^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/u,
        message: message ? message : "Not a name"});
}

export function matchesPassword({message}) {
    return matches({regex:/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*.]).{8,}$/gm,
        message: message ? message : "Must contains at least a lowercase and an uppercase letter, a number and a special character."});
}

/**
 * A component that represents an on/off state, materialized by two dots in a horizontal line.
 * The user can switch between these two states by clicking on the corresponding dot.
 * <p> The vitamin is composed of a Label (css class kind? and "form-toggle") containing:
 * <ul>
 *  <li> an Input (no css class)
 *  <li> a slide (a Span element with "slider" and "round" css classes)
 * </ul>
 */
export class VToggleSwitch extends Vitamin(Label) {

    constructor({ref, kind}) {
        super(ref);
        kind && this.addClass(kind);
        this._input = new Input().setType("checkbox");
        this.addClass("form-toggle");
        this.add(this._input)
            .add(new Span().addClass("slider").addClass("round"));
    }

    /**
     * indicates if the toggle is on
     * @return true if the toggle is "on", false otherwise
     */
    get checked() {
        return this._input.getChecked();
    }

    /**
     * switch the value of the toggle
     * @param checked true to set the toggle to "on", false to set the toggle to "off"
     */
    set checked(checked) {
        this._input.setChecked(checked);
    }
}

/**
 * A component that represents a set of (more tha two) states, each one materialized by a big dot on a horizontal line.
 * The user can switch between these states by clicking on the corresponding dot.
 * <p>The DOM counterpart of this vitamin is a DIV (css class kind? and "form-switch-wrapper") witch is an invisible
 * wrapper.
 * <p>It contains another DIV ("form-switch-radio") which is a graphical container (it defines color,
 * font, etc). This container owns:
 * <ul>
 *     <li> a slider (a DIV with css associated css class : "form-switch-option-slider")
 *     <li> for each option: an Input and a Label (no css class associated)
 * </ul>
 */
export class VSwitch extends Vitamin(Div) {

    /**
     * Constructor of the switch
     * @param ref vitamin reference
     * @param kind eventual css class that can be associated with all DOM objects inside the component.
     * @param options list of available states, each one described by a {title, value, checked} object.
     * @param onInput function called each time a new value is "validated"
     * @param onChange function called each time the component value is modified (in the case of a switch onInput and
     * onChange are always called jointly, there are both defined for API consistency)
     */
    constructor({ref, kind, options, onInput, onChange}) {
        super(ref);
        this._inputAction = onInput;
        this._changeAction = onChange;
        this._input = {};
        kind && this.addClass(kind);
        this.addClass("form-switch-wrapper");
        this._content = new Div().addClass("form-switch-radio");
        this.add(this._content);
        let index=0;
        this._sliderWidth = 100/options.length-4;
        this._slider = new Div().addClass("form-switch-option-slider");
        for (let option of options) {
            let input = new Input().setId(`switch-${index}`).setType("radio").setName(ref)
                .onEvent("change", ()=>{
                    let event = new Event("select");
                    event.value = option.value;
                    this.value = option.value;
                    this._inputAction && this._inputAction(event);
                    this._changeAction && this._changeAction(event);
                });
            input._pos = index;
            this._input[option.value] = input;
            if (option.checked) {
                this.value = option.value;
            }
            let label = new Label("").setFor(`switch-${index}`).add(new P(option.title));
            this._content.add(input).add(label);
            index++;
        }
        this._slider.addStyle("width", `${this._sliderWidth}%`)
        this._content.add(this._slider);
    }

    /**
     * Moves a slider on a given option (=state)
     * @param pos index of the option (= state) the slider is going to move on
     * @private
     */
    _moveSlider(pos) {
        this._slider.addStyle("left", `${(this._sliderWidth+4)*pos+2}%`);
    }

    /**
     * returns the value associated with the selected option
     * @return {*}
     */
    get value() {
        return this._current;
    }

    /**
     * sets the value of the option to select. Notes that this method redraws the component on the page
     * @param value value of the option to be selected
     */
    set value(value) {
        if (value !== this._current) {
            this._current !== undefined && this._input[this._current].setChecked(false);
            this._current = value;
            if (value !== undefined) {
                this._input[value].setChecked(true);
                this._moveSlider(this._input[this._current]._pos);
            }
        }
    }

}

export class VDropdownList extends Vitamin(Div) {

    constructor({ref, kind, placeholder="Select", options, selector, onInput, onChange}) {
        super(ref);
        this.addClass("form-dropdown-list");
        kind&&this.addClass(kind);
        this._placeholder = placeholder;
        this._anchor = new Div().setText(this._placeholder)
            .addClass("anchor");
        this._items = new UL().addClass("items");
        this.add(this._anchor).add(this._items);
        this._value = [];
        this._labels = [];
        this._onInput = onInput;
        this._onChange = onChange;
        this.setOptions(options, selector);
    }

    getValue() {
        return this._value;
    }

    get value() {
        return this.getValue();
    }

    get selection() {
        let result = [];
        for (let index=0; index<this._value.length; index++) {
            result.push({
                value: this._value[index],
                label: this._labels[index]
            });
        }
        return result;
    }

    _updateItems() {
        let values = new Set();
        this._labels = [];
        this._value.forEach(value=>values.add(value));
        for (let item of this._items.children) {
            let checked = values.has(item._value);
            item._checkbox.setChecked(checked);
            if (checked) {
                this._labels.push(item._label);
            }
        }
        this._anchor.setText(this._labels.length>0?this._labels.join(", "):this._placeholder);
    }

    setValue(value) {
        this._value = value;
        this._updateItems();
        return this;
    }

    set value(value) {
        this.setValue(value);
    }

    onChange(onChange) {
        this._onChange = onChange;
    }

    onInput(onInput) {
        this._onInput = onInput;
    }

    getAttribute(name) {
        if (name.toLowerCase()==="disabled") {
            return this._disabled;
        }
        else return super.getAttribute(name);
    }

    addAttribute(name, value) {
        if (name.toLowerCase()==="disabled") {
            let disabled = !!this._disabled;
            this._disabled = !!value;
            if (this._disabled !== disabled) {
                if (this._disabled) {
                    this.remove(this._items);
                } else {
                    this.add(this._items);
                }
            }
        }
        else super.addAttribute(name, value);
        return this;
    }

    removeAttribute(name) {
        if (name.toLowerCase()==="disabled") {
            if (this._disabled !== undefined) {
                if (this._disabled) {
                    this.remove(this._items);
                }
                delete this._disabled;
            }
        }
        else super.removeAttribute(name);
        return this;
    }

    setOptions(options, selector) {
        let buildOptions = options=> {
            this._items.clear();
            for (let option of options) {
                let changeAction = event => {
                    this._changeValue(checkbox.getChecked(), option.value, option.label);
                    this._onInput && this._onInput(event);
                    this._onChange && this._onChange(event);
                };
                let checkbox = new Checkbox().onEvent("change", changeAction);
                let label = option.label || option.value;
                let optionLine = new Span(label);
                let item = new LI()
                    .add(checkbox)
                    .add(optionLine);
                optionLine.onEvent("click", event => {
                    checkbox.setChecked(!checkbox.getChecked());
                    changeAction(event);
                });
                item._checkbox = checkbox;
                item._value = option.value;
                item._label = label;
                this._items.add(item);
            }
            if (this._value) this._updateItems();
        }
        if (selector) {
            selector(buildOptions)
        }
        else {
            buildOptions(options);
        }
    }

    _changeValue(selected, optionValue, optionLabel) {
        if (selected) {
            this._value.add(optionValue);
            this._labels.add(optionLabel);
        }
        else {
            this._value.remove(optionValue);
            this._labels.remove(optionLabel);
        }
        this._anchor.setText(this._labels.length>0?this._labels.join(", "):this._placeholder);
    }

}

export class VField extends Vitamin(Div) {

    constructor({ref, label, value="", ...params}) {
        super(ref);
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._message = new P().addClass("form-message");
        this.add(this._message);
        this._initField({value, ...params});
        this._initEvent({value, ...params});
    }

    _onInput(onInput) {
        this.field.onInput(onInput);
    }

    _onChange(onChange) {
        this.field.onChange(onChange);
    }

    _onClick(onClick) {
        this.field.onMouseClick(onClick);
    }

    _initEvent({validate, onInput, onChange, onClick}) {
        this._validate = validate;
        if (validate) {
            this._onInput(event=>{
                this.message = validate(this, false);
                onInput&&onInput(event);
            });
            this._onChange(event=>{
                this.message = validate(this, true);
                onChange&&onChange(event);
            });
        }
        else {
            onInput&&this._onInput(onInput);
            onChange&&this._onChange(onChange);
        }
        onClick&&this._onClick(onClick);
    }

    validate() {
        let message = this._validate ? this._validate(this, true) : "";
        this.message = message;
        return message;
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

    get label() {
        return this._label.getText();
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

    get message() {
        return this._message.getText();
    }

    set message(message) {
        this._message.setText(message);
    }

}


export class VInputField extends VField {

    _initField({value}) {
        this._input = new Input(value).addClass("form-input-text");
        this.value = value ? value : "";
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VDateField extends VField {

    _initField({value}) {
        this._input = new Input(value).setType("date").addClass("form-input-date");
        this.value = value ? value : "";
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VPasswordField extends VField {

    _initField({value}) {
        this._input = new Input(value)
            .setType("password")
            .setAttribute("placeholder", "**********")
            .addClass("form-input-text");
        this.value = value;
        this.add(this._input);
    }

    get field() {
        return this._input;
    }

}

export class VInputTextArea extends VField {

    _initField({value, heading, link}) {
        let createIcon = ({command, text="", classPrefix=command})=>{
            return new Span(text).addClass(`fa fa-${classPrefix} fa-fw`).setAttribute("aria-hidden", true)
                .onEvent("mousedown", event=>{
                    event.preventDefault();
                })
                .onEvent("mouseup", event=>{
                    event.preventDefault();
                    command();
                });
        };
        this._iconBold = createIcon({classPrefix: 'bold', command:()=>this.format('bold')});
        this._iconItalic = createIcon({classPrefix: 'italic', command:()=>this.format('italic')});
        this._iconUnderline = createIcon({classPrefix: 'underline', command:()=>this.format('underline')});
        this._iconH1Heading = createIcon({classPrefix: 'header', text:"1", command:()=>this.format('formatBlock', '<h1>')});
        this._iconH2Heading = createIcon({classPrefix: 'header', text:"2", command:()=>this.format('formatBlock', '<h2>')});
        this._iconH3Heading = createIcon({classPrefix: 'header', text:"3", command:()=>this.format('formatBlock', '<h3>')});
        this._iconH4Heading = createIcon({classPrefix: 'header', text:"4", command:()=>this.format('formatBlock', '<h4>')});
        if (link) {
            this._link=link;
            this._iconLink = createIcon({classPrefix: 'link', command:()=>this._link(document.getSelection())});
        }
        this._iconList = createIcon({classPrefix:'list', command:()=>this.format('insertunorderedlist')});
        this._iconBar = new Div().addClass("editor-toolbar")
            .add(this._iconBold)
            .add(this._iconItalic)
            .add(this._iconUnderline)
            .add(this._iconList);
        if (heading) {
            this._iconBar.add(this._iconH1Heading)
                .add(this._iconH2Heading)
                .add(this._iconH3Heading)
                .add(this._iconH4Heading);
        }
        if (this._iconLink) {
            this._iconBar.add(this._iconLink);
        }
        this.add(this._iconBar);
        this._input = new Div().setText(value).addClass("form-input-textarea").setAttribute("contenteditable", "true");
        this.value = value ? value : "";
        this.add(this._input);
    }

    _onChange(onChange) {
        onChange&&this._input.onEvent("blur", onChange);
    }

    format(command, value) {
        document.execCommand(command, true, value);
    }

    get field() {
        return this._input;
    }

    get value() {
        return this.field.root.innerHTML;
    }

    set value(value) {
        this.field.root.innerHTML = value;
    }

}

export class VOption extends Vitamin(Option) {

    constructor({ref, value, text=value}) {
        super(ref);
        this.setText(text);
        this.setValue(value);
    }

    get value() {
        return this.getValue();
    }

    get text() {
        return this.getText();
    }

}

export class VSelectField extends VField {

    _initField({value, multiple, size, options}) {
        this._select = new Select().addClass("form-input-select");
        this._options = [];
        options && (this.optionLines = options);
        this.value = value;
        this.add(this._select);
        multiple && this._select.setAttribute("multiple", true);
        size && this._select.setAttribute("size", size);
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
            this._select.remove(option);
        }
        this._options = [];
    }

    get values() {
        return [...this._select._root.selectedOptions].map(option=>option.value);
    }

    set values(values) {
        let selected = {};
        for (let value of values) {
            selected[value] = true;
        }
        for (let option of this._select._root) {
            option.selected = !!selected[option.value];
        }
    }

    get options() {
        return this._options;
    }

    set options(options) {
        this._options = options;
    }

}

export class VButton extends Vitamin(Button) {

    constructor({ref, label, type, enabled=true, onClick}) {
        super(ref, label);
        this.addClass("form-button");
        this.addClass("form-button-"+type);
        this._onClick = onClick;
        this.enabled = enabled;
    }

    _setEnabled(enabled) {
        super._setEnabled(enabled);
        this._onClick&&this.onMouseClick(enabled ? event=>{
            event.preventDefault();
            this._onClick(event);
            return true;
        }: null);
    }

    get isInput() {
        return true;
    }

    static TYPES = {
        ACCEPT: "accept",
        REFUSE: "refuse",
        NEUTRAL: "neutral",
    }

}

export class VCommand extends Vitamin(Img) {

    constructor({ref, imgEnabled, imgDisabled=imgEnabled, enabled=true, onClick}) {
        super(ref);
        this._imgEnabled = imgEnabled;
        this._imgDisabled = imgDisabled;
        this._onClick = onClick;
        this.addClass("form-command");
        this.setSrc(imgDisabled);
        enabled&&this._onClick&&this.onMouseClick(event=>{
            event.preventDefault();
            this._onClick(event);
            return true;
        });
        this.enabled = enabled;
    }

    onActivate() {
        super.onActivate();
        this.setSrc(this._imgEnabled);
        this._onClick && this.onMouseClick(this._onClick);
    }

    onDesactivate() {
        super.onDesactivate();
        this.setSrc(this._imgDisabled);
        this.onMouseClick(null);
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

export class VDropdownListField extends VField {

    _initField({value, selector, options}) {
        this._select = new VDropdownList({value, selector, options})
            .addClass("form-input-dropdownlist");
        this.add(this._select);
    }

    get field() {
        return this._select;
    }

    get selection() {
        return this._select.selection;
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

    get isInput() {
        return true;
    }

}

export class VCheckbox extends Vitamin(Label) {

    constructor({ref, title, name, enabled=true, checked=false, onInput, onChange}) {
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
        this.enabled = true;
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

    constructor({ref, title, value=title, name, enabled=true, checked=false, onInput, onChange}) {
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
        this._value = value;
        this.enabled = enabled;
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
        return this.checked ? this._value : null;
    }

    set value(value) {
        this.checked = value === this._value;
    }

}

export class VRadios extends Vitamin(Div) {

    constructor({ref, label, vertical, name, onChange, onInput, radios}) {
        super(ref);
        this._name=name?name:ref;
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._radios = new Div().addClass(vertical ? "form-line-container" : "form-row-container");
        this.add(this._radios);
        for (let radioSpec of radios) {
            if (!radioSpec.name) radioSpec = {...radioSpec, name:this._name};
            let radio = new VRadio({...radioSpec, onChange, onInput});
            this._radios.add(radio);
        }
    }

    get value() {
        for (let radio of this._radios.children) {
            if (radio.name === this._name && radio.checked) return radio.value;
        }
        return null;
    }

    set value(value) {
        for (let radio of this._radios.children) {
            radio.checked = value===radio.ref;
        }
    }

}

export class VFormContainer extends VContainer {

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

    addRadiosField(params) {
        this.addField(params, (params)=>new VRadios(params));
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
        this.add(new VFormContainer({...params}, builder));
        return this;
    }

}

export class VFileLoader extends Vitamin(Div) {

    constructor({ref, accept, verify, magnified=false}) {
        super({ref});
        this._accept = accept;
        this._verify = verify;
        this._magnified = magnified;
        this.addClass("file-loader");
        this.onEvent("drop", event=>this.dropHandler(event));
        this.onEvent("dragover", event=>this.dragOverHandler(event));
    }

    dropHandler(event) {
        event.preventDefault();
        this._files = [];
        if (event.dataTransfer.items) {
            for (let i = 0; i < event.dataTransfer.items.length; i++) {
                if (event.dataTransfer.items[i].kind === 'file') {
                    let file = event.dataTransfer.items[i].getAsFile();
                    this._files.push(file);
                    console.log('... file[' + i + '].name = ' + file.name);
                    if (!this._accept || this._accept(file)) {
                        this.showFile(file);
                    }
                }
            }
        } else {
            for (let i = 0; i < event.dataTransfer.files.length; i++) {
                let file =event.dataTransfer.files[i];
                this._files.push(file);
                console.log('... file[' + i + '].name = ' + file.name);
            }
        }
    }

    _trigger(file) {
        let event = new Event("loadfile");
        event.file = file;
        this._inputAction && this._inputAction(event);
        this._changeAction && this._changeAction(event);
    }

    showFile(file) {
        if (isImageFile(file)) {
            this.setImageSrc(URL.createObjectURL(file), ()=>{
                this._trigger(this.imageSrc);
            });
        }
        else this._trigger(file);
    }

    dragOverHandler(event) {
        event.preventDefault();
    }

    onInput(action) {
        this._inputAction = action;
        return this;
    }

    onChange(action) {
        this._changeAction = action;
        return this;
    }

    get value() {
        return this.files || this._imageSrc;
    }

    get file() {
        return this._files ? this._files[0] : null;
    }

    get files() {
        return this._files;
    }

    get imageSrc() {
        return this._imageSrc;
    }

    set imageSrc(imageSrc) {
        return this.setImageSrc(imageSrc);
    }

    getImageDataURL(fileName, width = this._root.width, height = this._root.height) {
        return this._image.getDataURL(fileName, width, height);
    }

    getImageFile(fileName, width, height) {
        return this._image.getFile(fileName, width, height);
    }

    setImageSrc(src, trigger) {
        if (src) {
            this._imageSrc = src;
            let image = new VMagnifiedImage({
                ref:this.ref+"-image", img:src,
                onLoad: () => {
                    document.body.appendChild(image.root);
                    if (!this._verify || this._verify(image)) {
                        this._image && this.remove(this._image);
                        this._image = image;
                        this.add(this._image);
                        this.addClass("with-image");
                        if (trigger) trigger();
                    } else {
                        document.body.removeChild(image.root);
                    }
                }
            });
            if (!this._magnified) image.desactivateMagnifier();
        }
        else {
            delete this._imageSrc;
            this._image && this.remove(this._image);
            this.removeClass("with-image");
            delete this._image;
        }
    }

    set placeholder(imageSrc) {
        this._image && this.remove(this._image);
        this._image = new VImage({
            ref:this.ref+"-image", img:imageSrc,
        });
        this.addClass("with-image");
        this.add(this._image);
    }

}

export class VFileLoaderField extends VField {

    _initField({accept, verify, imageSrc, magnified}) {
        this._loader = new VFileLoader({
            ref:this.ref+"-loader",
            magnified,
            accept, verify
        }).addClass("form-file-loader");
        this._loader.imageSrc = imageSrc;
        this.add(this._loader);
    }

    get field() {
        return this._loader;
    }

    get value() {
        return this._loader.value;
    }

    get files() {
        return this._loader.files;
    }

    get file() {
        return this._loader.file;
    }

    getImageDataURL(fileName, width = this._root.width, height = this._root.height) {
        return this._loader.getImageDataURL(fileName, width, height);
    }

    getImageFile(fileName, width, height) {
        return this._loader.getImageFile(fileName, width, height);
    }

    get imageSrc() {
        return this._loader.imageSrc;
    }

    set imageSrc(imageSrc) {
        this._loader.setImageSrc(imageSrc);
    }

    set placeholder(imageSrc) {
        this._loader.placeholder = imageSrc;
    }
}

export class VRef extends VField {

    _initField({value, selector, nullable, imgNullable="./../images/site/buttons/cross.png", lineCreator}) {
        this._container = new Div().addClass("form-ref-container");
        this.add(this._container);
        this._refCurrentEnvelope = new Div().addClass("form-ref-current-envelope");
        this._choose = new VButton({
            ref: "form-ref-select", type: "neutral", label: "Select",
            onClick: event => {
                selector.show();
            }
        }).addClass("form-ref-select");
        this._container.add(this._refCurrentEnvelope).add(this._choose);
        this._refCurrent = new Div().addClass("form-ref-current");
        this._refCurrentEnvelope.add(this._refCurrent);
        if (nullable) {
            this._nullable = new VCommand({
                ref: "form-erase-target", imgEnabled:imgNullable,
                onClick: event=> this.value = null
            });
        }
        this._refContent = new Div().addClass("form-ref-content");
        this._lineCreator = lineCreator;
        this.value = value;
    }

    get value() {
        return this._value;
    }

    setValue(value) {
        this.value = value;
        this._onChange({event:"onchange", value});
    }

    set value(value) {
        this._value = value ? value : null;
        this._refContent.clear();
        this._refCurrent.clear();
        if (value) {
            this._refContent.add(this._lineCreator(value));
            this._refCurrent.add(this._refContent);
            if (this._nullable) this._refCurrent.add(this._nullable);
        }
    }

    get field() {
        return this._choose;
    }

}

export class VOptionViewer extends Vitamin(Span) {

    constructor({value, options}) {
        super();
        this.options = options;
        this._value = value;
        this._refresh();
    }

    get options() {
        return this._options;
    }

    set options(options) {
        this._options = options;
        this._mapping = this._prepare(options);
        this._refresh();
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
        this._refresh();
    }

    _prepare(options) {
        let mapping = {};
        for (let option of options) {
            mapping[option.value] = option.text;
        }
        return mapping;
    }

    get text() {
        return this._mapping[this.value];
    }

    _refresh() {
        this.setText(this.text);
    }

}

