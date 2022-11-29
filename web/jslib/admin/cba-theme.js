'use strict';

import {
    VContainer,
    VSplitterPanel,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, isImageFile, P, requestLog, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Undoable, VImage,
    Vitamin, VMessageHandler, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons,
    VFileLoaderField,
    VInputField, VInputTextArea, VRef, VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";
import {
    CBAUserSelector, loadUsers
} from "./cba-user.js";
import {
    CBAEditComments
} from "./cba-comment.js";

export class CBATheme extends Vitamin(Div) {

    constructor({ref, title, illustration, description, action}) {
        super({ref});
        this.addClass("theme");
        this._header = new Div().addClass("theme-header");
        this.add(this._header);
        this._illustration = new VImage({ref:this.ref+"-illustration", kind:"theme-illustration", img:illustration||"../images/site/themes/default-theme.png"});
        this._header.add(this._illustration);
        this._title = new P(title).addClass("theme-title");
        this._header.add(this._title);
        this._description = new P(description).addClass("theme-description");
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
            ref: this.ref.ref,
            illustration: this._illustration ? this._illustration.src : null,
            title: this._title.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._description.setText(specification.description);
        this._illustration.setSrc(specification.illustration);
    }

}

export class CBAEditThemePane extends Undoable(VSplitterPanel) {

    constructor({ref, kind, theme, accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._category = new VSelectField({
            ref:"theme-category", label:"Category",
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
        this._status = new VSelectField({
            ref: "theme-status", label: "Status",
            validate: mandatory({}),
            options: [
                {value: "live", text: "Live"},
                {value: "pnd", text: "Pending"},
                {value: "prp", text: "Proposed"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        let nameContainer = new VContainer({columns:2}).addField({field:this._category}).addField({field:this._status});
        this.addOnRight(nameContainer);
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
        this._illustrationLoader = new VFileLoaderField({
            ref:"theme-illustration", label:"Illustration",
            validate: mandatory({}),
            accept, verify,
            onInput: event=>{
                this._themeView.illustration = this._illustrationLoader.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustrationLoader);
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
        let userSelector = new CBAUserSelector({title:"Select Theme Account", loadPage:loadUsers, selectUser: user=>{
                this._author.setValue(user);
                userSelector.hide();
            }
        }).loadUsers();
        this._author = new VRef({
            ref: "author", label: "Author", nullable: true, selector: userSelector,
            lineCreator: account=> new Div().addClass("user-ref")
                .add(new Img(account.avatar).addClass("user-avatar"))
                .add(new Div().setText(account.login).addClass("user-login"))
                .add(new Div().setText(account.firstName).addClass("user-first-name"))
                .add(new Div().setText(account.lastName).addClass("user-last-name")
            ),
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._author);
        this._buttons = new VButtons({ref: "map-buttons", vertical:false, buttons:[
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            }
        ]});
        this.addOnRight(this._buttons);
        this.theme = theme;
    }

    validate() {
        return !this._category.validate()
            & !this._title.validate()
            & !this._description.validate()
            & !this._illustrationLoader.validate()
            & !this._status.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Theme not saved. Do you want to Quit ?")
    }

    get theme() {
        return {
            category: this._category.value,
            status: this._status.value,
            title: this._title.value,
            description: this._description.value,
            illustration: this._illustrationLoader.imageSrc,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set theme(theme) {
        this._theme = theme;
        if (this._themeView) {
            this.removeFromLeft(this._themeView);
        }
        this._themeView = new CBATheme(theme);
        this.addOnLeft(this._themeView);
        this._category.value = this._theme.category || "game";
        this._status.value = this._theme.status || "prp";
        this._title.value = this._theme.title || "";
        this._description.value = this._theme.description || "";
        this._illustrationLoader.imageSrc = this._theme.illustration || "";
        this._author.value = this._theme.author;
        this._comments = {
            comments: this._theme.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.theme;
    }

    _recover(specification) {
        if (specification) {
            this._category.value = specification.category;
            this._status.value = specification.status;
            this._title.value = specification.title;
            this._description.value = specification.description;
            this._illustrationLoader.imageSrc = specification.illustration;
            this._author.value = specification.author;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(theme) {
        this.theme = theme;
        this._clean();
        this._memorize();
        return true;
    }

    set comments(comments) {
        this._comments = comments;
        this._memorize();
    }

    get themeIllustration()  {
        return this._illustrationLoader.files ? this._illustrationLoader.files[0] : undefined;
    }

    onComments() {
        new CBAEditComments({
            "ref": "theme-comments",
            "kind": "theme-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAEditTheme extends VModal {

    constructor({title, create, theme, saveTheme, deleteTheme}) {
        super({ref:"edit-theme-modal", title});
        this._id = theme.id;
        this._themePane = new CBAEditThemePane({
            ref: "theme-editor-pane",
            kind: "theme-editor-pane",
            theme,
            create,
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
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-theme", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let theme = this.specification;
                        let newComment = theme.comments.newComment;
                        if (newComment) {
                            theme.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        theme.comments = theme.comments.comments;
                        saveTheme(theme);
                    }
                }
            },
            {
                ref: "close-theme", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-theme", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-theme-deletion",
                    title: "Delete Theme",
                    message: "Do you really want to delete the Theme ?",
                    actionOk: event => deleteTheme(theme)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._themePane);
        this.add(this._buttons);
        this.addClass("theme-modal");
    }

    tryToLeave(leave, notLeave) {
        return this._themePane.tryToLeave(leave, notLeave);
    }

    validate() {
        return this._themePane.validate();
    }

    saved(theme) {
        this._themePane.saved(theme);
        this._id = theme.id;
        this._deleteButton.enabled = true;
        showMessage("Theme saved.");
        return true;
    }

    get imageFiles() {
        return this.themeIllustration ?
            [
                {key: "illustration", file: this.themeIllustration}
            ] :
            [];
    }

    get themeIllustration()  {
        return this._themePane.themeIllustration;
    }

    get specification() {
        return {
            id: this._id,
            ...this._themePane.theme
        };
    }

}

export class CBAThemeList extends VTable {

    constructor({loadPage, saveTheme, saveThemeStatus, deleteTheme}) {
        super({
            ref: "theme-list",
            changePage: pageIndex => this._setPage(pageIndex),
            select: theme => this.selectTheme(theme)
        });
        this.addClass("theme-list");
        this._loadPage = loadPage;
        this._saveTheme = saveTheme;
        this._saveThemeStatus = saveThemeStatus;
        this._deleteTheme = deleteTheme;
    }

    set search(search) {
        this._search = search;
    }

    loadThemes() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    selectTheme(theme) {
        loadTheme(theme,
            theme=>{
                let themeEditor = new CBAEditTheme({
                    title: "Edit Theme",
                    theme,
                    saveTheme: theme => this._saveTheme(theme,
                        themeEditor.imageFiles,
                        text => {
                            themeEditor.saved(parseTheme(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Theme", text);
                        }
                    ),
                    deleteTheme: theme => this._deleteTheme(theme,
                        () => {
                            themeEditor.hide();
                            themeEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            themeEditor.confirm.hide();
                            showMessage("Fail to delete Theme", text);
                        }
                    ),
                }).show();
            },

        );

    };

    _setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveThemeStatus = theme => this._saveThemeStatus(theme,
                () => showMessage("Theme saved."),
                text => showMessage("Unable to Save Theme.", text),
            );
            for (let theme of pageData.themes) {
                let line;
                let illustration = new Img(theme.illustration).addClass("theme-illustration");
                let category = new Span(theme.category).addClass("theme-category");
                let title = new Span(theme.title).addClass("theme-name");
                let description = new P(theme.description).addClass("theme-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(theme.status)
                    .addClass("theme-status")
                    .onChange(event => saveThemeStatus(getTheme(line)));
                line = {
                    id: theme.id,
                    category: category.getText(),
                    title: title.getText(),
                    description: description.getText(),
                    status: status.getValue(),
                    illustration: illustration.getSrc(),
                    author: theme.author
                };
                lines.push({source:line, cells:[illustration, category, title, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("theme-title")
            let pageSummary = new Span()
                .addClass("theme-pager")
                .setText(pageData.themeCount ?
                    String.format(CBAThemeList.SUMMARY, pageData.themeCount, pageData.firstTheme, pageData.lastTheme) :
                    CBAThemeList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Illustration", "Category", "Name", "Description", "Status"],
                lines
            });
            this._currentPage = pageData.currentPage;
            let first = pageData.pageCount <= 5 ? 0 : pageData.currentPage - 2;
            if (first < 0) first = 0;
            let last = pageData.pageCount <= 5 ? pageData.pageCount - 1 : pageData.currentPage + 2;
            if (last >= pageData.pageCount) last = pageData.pageCount - 1;
            this.setPagination({
                first, last, current: pageData.currentPage
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} theme(s)";
    static EMPTY_SUMMARY = "There are no theme to show";
}

export class CBAThemeListPage extends Vitamin(Div) {

    constructor({loadPage, saveTheme, saveThemeStatus, deleteTheme}) {
        super({ref: "theme-list-page"});
        this._search = new VSearch({
            ref: "theme-list-search", searchAction: search => {
                this.loadThemes();
            }
        });
        this._create = new VButton({
            ref: "theme-create", type: "neutral", label: "Create Theme",
            onClick: event => {
                this._createThemeModal = new CBAEditTheme({
                    title: "Create Theme",
                    create: true,
                    theme: {
                        status: "prp"
                    },
                    saveTheme: theme => saveTheme(theme,
                        this._createThemeModal.imageFiles,
                        text => {
                            this._createThemeModal.saved(parseTheme(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Theme", text);
                        }
                    ),
                    deleteTheme: () => {
                        this._createThemeModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAThemeList({loadPage, saveTheme, saveThemeStatus, deleteTheme});
        this.add(this._search).add(this._table);
    }

    get createThemeModal() {
        return this._createThemeModal;
    }

    loadThemes() {
        this._table.search = this._search.value;
        this._table.loadThemes();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadThemes(pageIndex, search, update) {
    sendGet("/api/theme/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load theme success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Themes List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                themeCount: response.count,
                firstTheme: response.page * response.pageSize + 1,
                lastTheme: response.page * response.pageSize + response.themes.length,
                themes: response.themes
            });
        },
        (text, status) => {
            requestLog("Load Theme failure: " + text + ": " + status);
            showMessage("Unable to load Themes", text);
        }
    );
}

function parseTheme(text) {
    let theme = JSON.parse(text);
    for (let comment of theme.comments) {
        comment.date = new Date(comment.date);
    }
    return theme;
}

export function loadTheme(theme, success) {
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

export function saveTheme(theme, images, success, failure) {
    sendPost(theme.id===undefined ? "/api/theme/create" : "/api/theme/update/" + theme.id,
        theme,
        (text, status) => {
            requestLog("Theme saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Theme saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveThemeStatus(theme, success, failure) {
    sendPost("/api/theme/update-status/" + theme.id,
        theme,
        (text, status) => {
            requestLog("Theme status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Theme status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteTheme(theme, success, failure) {
    sendGet("/api/theme/delete/" + theme.id,
        (text, status) => {
            requestLog("Theme delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Theme delete failure: " + text + ": " + status);
            failure(text, status);
        }
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

export var vThemeList = new CBAThemeListPage({
    loadPage: loadThemes,
    deleteTheme,
    saveTheme,
    saveThemeStatus
});