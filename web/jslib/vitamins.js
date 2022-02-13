'use strict'

import {
    Div, A, Button, Form, Label, Input, Span, App
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
            this._active = false;
            this.addClass("vitamin-inactive");
            this._root._vitamin = this;
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
                for (let child of component.children) {
                    if (isVitamin(child)) child.visitDown(action);
                    else {
                        _visit(child, action);
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

export class VApp extends Vitamin(App) {

    constructor() {
        super();
        this._active = true;
    }

    add(component) {
        super.add(component);
        return this;
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

export class VDropdownMenu extends Vitamin(Div) {
    constructor({ref, title, enabled=true}, builder) {
        super(ref);
        this.addClass("ddtn-dropdown");
        this.add(new Button(title).addClass("ddtn-droptitle"));
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

    addMenu({...params}) {
        let menu = new VMenuItem({...params});
        this.add(menu);
        return this;
    }

    insertMenu({menu, ...params}, beforeRef) {
        let beforeMenu = this.get(beforeRef);
        console.assert(beforeMenu);
        if (beforeMenu) {
            let vmenu = menu ? menu : new VMenuItem({...params});
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

    constructor({ref, label, value="", onInput, onChange}) {
        super(ref);
        this.addClass("form-field");
        this._label = new Label(label).addClass("form-label");
        this.add(this._label);
        this._input = new Input(label).addClass("form-input-text");
        this.value = value;
        onInput&&this._input.onInput(onInput);
        onChange&&this._input.onChange(onChange);
        this.add(this._input);
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

    get enabled() {
        return !this._input.getDisabled();
    }

    set enabled(value) {
        this._input.setDisabled(!value);
    }

    get value() {
        return this._input.getValue();
    }

    set value(value) {
        this._input.setValue(value);
    }

}

export class VContainer extends Vitamin(Div) {

    constructor({ref, enabled=true, columns}, builder) {
        super(ref);
        this.enabled = enabled;
        this._fields = [];
        this.addClass("form-container");
        if (!columns || columns===1) {
            this._columns = [this];
            this.addClass("form-1column");
        } else {
            this._columns = [];
            this.addClass("form-row");
            for (let index=0; index<columns; index++) {
                let column = new Div().addClass(`form-${columns}columns`);
                this._columns.push(column);
                this.add(column);
            }
        }
        builder&&builder(this);
    }

    addField({field, ...params}) {
        field = field ? field : new VField({...params});
        this._columns[this._fields.length%this._columns.length].add(field);
        this._fields.push(field);
        return this;
    }

}

export class VButton extends Vitamin(Button) {

    constructor({ref, label, type, enabled=true, onClick}) {
        super(ref, label);
        this.addClass("form-button");
        if (type==="accept") this.addClass("form-button-accept");
        else if (type==="refuse") this.addClass("form-button-refuse");
        else this.addClass("form-button-neutral");
        onClick&&this.onMouseClick(onClick);
        this.enabled = enabled;
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

    constructor({ref}, builder) {
        super({ref});
        this.addClass("modal");
        this._content = new Form({ref:"form-"+ref})
            .addClass("modal-content").addClass("modal-animate");
        builder&&builder(this._content);
        this.add(this._content);
    }

    addContainer({...params}, builder) {
        this._content.add(new VContainer({...params}, builder));
        return this;
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
