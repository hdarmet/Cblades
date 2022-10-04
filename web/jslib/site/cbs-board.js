import {
    Undoable, VImage, Vitamin, VMagnifiedImage
} from "../vitamin/vitamins.js";
import {
    Div, P
} from "../vitamin/components.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    VButton, VButtons, VFileLoaderField, VInputField, VInputTextArea
} from "../vitamin/vforms.js";

export class CBSBoard extends Vitamin(Div) {

    constructor({ref, title, img, description, action}) {
        super({ref});
        this.addClass("board");
        this._header = new Div().addClass("board-header");
        this.add(this._header);
        this._title = new P(title).addClass("board-title");
        this._header.add(this._title);
        this._image = new VMagnifiedImage({ref:this.ref+"-image", kind:"board-image", img});
        this._image && this._header.add(this._image);
        this._description = new P(description).addClass("board-description");
        this.add(this._description);
        this.onEvent("click", ()=>{
            action && action(this);
        });
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
    }

    get description() {
        return this._description.getText();
    }

    set description(description) {
        this._description.setText(description);
    }

    get image() {
        return this._image ? this._image.src : null;
    }

    set image(img) {
        this._image = new VImage({ref:this.ref+"-image", kind:"theme-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._description.setText(specification.description);
        this._image.setSrc(specification.img);
    }

}

export class CBSBoardEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="board-editor", accept, verify, onEdit, onPropose}) {
        super({ref});
        this.addClass(kind);
        this._path = new VFileLoaderField({
            ref:"board-image", label:"Image",
            accept, verify,
            magnified: true,
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnLeft(this._path);
        this._name = new VInputField({
            ref:"board-title-input", label:"Name",
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._name);
        this._description = new VInputTextArea({
            ref:"board-description-input", label:"Description",
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._send = new VButtons({ref: "board-buttons", vertical:false, buttons:[
                {
                    ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                    onClick:event=>{
                        this._onEdit();
                    }
                },
                {
                    ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                    onClick:event=>{
                        this._onPropose();
                    }
                }
            ]});
        this.addOnRight(this._send);
        this._onEdit = onEdit;
        this._onPropose = onPropose;
    }

    canLeave(leave, notLeave) {
        return super.canLeave(leave, notLeave,"Board not saved. Do you want to Quit ?")
    }

    set board(board) {
        this._name.value = board.name;
        this._description.value = board.description;
        this._path.imageSrc = board.path;
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            name: this._name.value,
            description: this._description.value,
            path: this._path.imageSrc
        }
    }

    _recover(specification) {
        if (specification) {
            this._name.value = specification.name;
            this._description.value = specification.description;
            this._path.imageSrc = specification.path;
        }
    }

    openInNewTab(url) {
        window.open(url, '_blank').focus();
    }
}
