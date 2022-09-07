'use strict'

import {
    A, Button,
    Div, Img, Span
} from "./components.js";
import {
    VConfirmHandler,
    VDisplay,
    Vitamin, VMessageHandler, VModal, VSlot
} from "./vitamins.js";
import {
    VButton, VButtons, VFormContainer
} from "./vforms.js";

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

export class VWarning extends VModal {

    constructor(message) {
        super({ref: VWarning.MESSAGE_REF});
        this.addClass("message-modal");
        this._display = new VDisplay({ref:"message-display"});
        this.addContainer({
            ref: "message-display-container",
            container: new VFormContainer({columns: 1})
                .addField({field: this._display})
        });
    }

    show({title, message}) {
        this.title = title;
        this._display.content = message;
        super.show();
    }

    static MESSAGE_REF = "message";

    static onMessageEmitted({title, message}) {
        new VWarning().show({title, message});
    }

}
VMessageHandler.addMessageListener(VWarning);

export class VConfirm extends VModal {

    constructor() {
        super({ref: VConfirm.CONFIRM_REF});
        this.addClass("confirm-modal");
        this._display = new VDisplay({ref:"confirm-display"});
        this.addContainer({
                ref: "confirm-display-container",
                container: new VFormContainer({columns: 1})
                    .addField({field: this._display})
                    .addField({
                        field: new VButtons({
                            ref: "confirm-buttons", verical: false, buttons: [
                                {
                                    ref: "confirm-ok", type: VButton.TYPES.ACCEPT, label: "Ok",
                                    onClick: event => {
                                        this._actionOk();
                                        this.hide();
                                    }
                                },
                                {
                                    ref: "confirm-cancel", type: VButton.TYPES.REFUSE, label: "Cancel",
                                    onClick: event => {
                                        this._actionCancel();
                                        this.hide();
                                    }
                                }]
                        })
                    })
            }
        );
    }

    show({title, message, actionOk, actionCancel}) {
        this.title = title;
        this._display.content = message;
        this._actionOk = actionOk;
        this._actionCancel = actionCancel;
        super.show();
    }

    static CONFIRM_REF = "confirm";

    static onConfirmEmitted({title, message, actionOk, actionCancel}) {
        new VConfirm().show({title, message, actionOk, actionCancel});
    }

}
VConfirmHandler.addMessageListener(VConfirm);
