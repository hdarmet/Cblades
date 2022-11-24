'use strict';

import {
    Undoable, VImage, Vitamin, VMessageHandler
} from "../vitamin/vitamins.js";
import {
    Div, isImageFile, P, requestLog, sendGet, sendPost
} from "../vitamin/components.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    mandatory, range,
    VButton, VButtons, VFileLoaderField, VInputField, VInputTextArea, VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSFormContainer
} from "./cbs-widgets.js";
import {
    CBSEditComments
} from "./cbs-comment.js";

export class CBSTheme extends Vitamin(Div) {

    constructor({theme, action}) {
        super({ref:"theme-"+theme.id});
        this.addClass("theme");
        this._header = new Div().addClass("theme-header");
        this.add(this._header);
        this._illustration = new VImage({
            ref:this.ref+"-illustration",
            kind:"theme-illustration"
        });
        this._header.add(this._illustration);
        this._title = new P().addClass("theme-title");
        this._header.add(this._title);
        this._description = new P().addClass("theme-description");
        this.add(this._description);
        this.specification = theme;
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

    get illustration() {
        return this._illustration ? this._illustration.src : null;
    }

    set illustration(img) {
        if (this._illustration) this._header.remove(this._illustration);
        this._illustration = new VImage({ref:this.ref+"-illustration", kind:"theme-illustration", img});
        this._header.insert(this._illustration, this._title);
    }

    get specification() {
        return {
            id: this._id,
            illustration: this._illustration ? this._illustration.src : null,
            title: this._title.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._id = specification.id;
        this._title.setText(specification.title || "Theme Title");
        this._description.setText(specification.description || "");
        this._illustration.setSrc(specification.illustration || "../images/site/themes/default-theme.png");
    }

}

export class CBSThemeEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="theme-editor", theme={}}) {
        super({ref});
        this.addClass(kind);
        this._category = new VSelectField({ref:"theme-category", label:"Category",
            validate: mandatory({}),
            options: [
                {ref: "category-game", value: "game", text:"About The Game"},
                {ref: "category-legends", value: "legends", text:"Stories And Legends"},
                {ref: "category-examples", value: "examples", text:"Play Examples"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._category);
        this._title = new VInputField({
            ref:"theme-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._themeView.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._illustration = new VFileLoaderField({
            ref:"theme-image", label:"Image",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (450 x 150) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==450 || image.imageHeight!==150) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (450 x 150) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                this._themeView.illustration = this._illustration.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustration);
        this._description = new VInputTextArea({
            ref:"theme-content-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onInput: event=>{
                this._themeView.description = this._description.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._send = new VButton({ref: "propose-theme", label:"Propose", type:"accept"});
        this._send = new VButtons({ref: "board-buttons", vertical:false, buttons:[
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            },
            {
                ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                onClick:event=>{
                    if (this.validate()) {
                        let theme = this.theme;
                        if (theme.comments.newComment) {
                            theme.newComment = theme.comments.newComment;
                        }
                        delete theme.comments;
                        this.saveTheme(theme);
                    }
                }
            }
        ]});
        this.addOnRight(this._send);
        this.theme = theme;
    }

    saveTheme(theme) {
        saveProposedTheme(theme,
            this.imageFiles,
            text => {
                this.saved(parseTheme(text));
            },
            text => {
                showMessage("Fail to update Theme", text);
            }
        );
    }

    validate() {
        return !this._category.validate()
            & !this._illustration.validate()
            & !this._title.validate()
            & !this._description.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave, "Theme not saved. Do you want to Quit ?")
    }

    get theme() {
        this._theme = {
            id: this._theme.id,
            category: this._category.value,
            title: this._title.value,
            description: this._description.value,
            illustration: this._illustration.imageSrc,
            comments: structuredClone(this._comments)
        }
        return this._theme;
    }

    set theme(theme) {
        this._theme = theme;
        if (this._themeView) {
            this.removeFromLeft(this._themeView);
        }
        this._themeView = new CBSTheme({theme});
        this.addOnLeft(this._themeView);
        this._editTheme();
        this._clean();
        this._memorize();
    }

    _editTheme() {
        this._title.value = this._theme.title || "";
        this._description.value = this._theme.description || "";
        this._illustration.imageSrc = this._theme.illustration || "";
        this._comments = {
            comments: this._theme.comments || [],
            newComment: ""
        }
    }

    _register() {
        let specification = this._themeView.specification;
        specification.category = this._category.value;
        return specification;
    }

    _recover(specification) {
        if (specification) {
            this._themeView.specification = specification;
            this._category.value = specification.category;
            this._editTheme();
        }
    }

    set comments(comments) {
        this._comments = structuredClone(comments);
        this._memorize();
    }

    onComments() {
        new CBSEditComments({
            "ref": "theme-comments",
            "kind": "theme-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    saved(theme) {
        this._theme.id = theme.id;
        this._comments = {
            comments: theme.comments || [],
            newComment: ""
        }
        showMessage("Theme saved.");
        this._clean();
        this._memorize();
        return true;
    }

    get imageFiles() {
        return this.illustration ?
            [
                {key: "illustration", file: this.illustration}
            ] :
            [];
    }

    get illustration()  {
        return this._illustration.files ? this._illustration.files[0] : undefined;
    }

}

function parseTheme(text) {
    let theme = JSON.parse(text);
    for (let comment of theme.comments) {
        comment.date = new Date(comment.date);
    }
    return theme;
}

export var vThemeEditor = new CBSThemeEditor({
    ref:"theme-editor"
});

export var vThemeEditorPage = new CBSFormContainer({ref:"theme-editor-page", editor:vThemeEditor});

export function loadThemesByCategory(pageIndex, category, search, update) {
    sendGet("/api/theme/category/" + category + "?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load theme success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Load Theme failure: " + text + ": " + status);
            showMessage("Unable to load Themes", text);
        }
    );
}

export function loadProposedTheme(theme, success) {
    sendGet("/api/theme/load/"+theme.id,
        (text, status) => {
            requestLog("Theme load success: " + text + ": " + status);
            success(parseTheme(text));
        },
        (text, status) => {
            requestLog("Load Theme failure: " + text + ": " + status);
            showMessage("Unable to load Theme of Id "+theme.id, text);
        }
    );
}

export function saveProposedTheme(theme, images, success, failure) {
    sendPost(theme.id===undefined ? "/api/theme/propose" : "/api/theme/amend/" + theme.id,
        theme,
        (text, status) => {
            requestLog("Theme proposal success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Theme proposal failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function loadLiveThemes(update) {
    sendGet("/api/theme/live",
        (text, status) => {
            requestLog("Load live themes success: " + text + ": " + status);
            let themes = JSON.parse(text);
            let options = themes.map(theme=>{return {value:theme.id, label:theme.title}});
            update(options);
        },
        (text, status) => {
            requestLog("Load Live Themes failure: " + text + ": " + status);
            showMessage("Unable to load Themes", text);
        }
    );
}