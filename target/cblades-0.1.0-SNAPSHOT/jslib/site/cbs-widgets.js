'use strict';

import {
    VFormContainer
} from "../vitamin/vforms.js";
import {
    Div
} from "../vitamin/components.js";

export class CBSFormContainer extends VFormContainer {

    constructor({ref, kind=ref, editor}) {
        super({ref});
        this._description = new Div().addClass("description");
        this._editor = editor;
        this.addClass(kind)
            .add(this._description)
            .add(this._editor);
    }

    get description() {
        return this._description;
    }

    set description(description) {
        this._description.setText(description);
    }

    tryToLeave(leave, notLeave) {
        this._editor.tryToLeave(leave, notLeave);
    }

}


