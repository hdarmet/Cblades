'use strict';

import {
    VSplitterPanel,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, isImageFile, isImageURL, P, requestLog, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    download,
    Undoable, VImage,
    Vitamin, VMagnifiedImage, VMessageHandler, VModal, VSearch
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
import {
    DetailedForm, DetailedView
} from "../vitamin/structured.js";
import {
    CBASheet
} from "./cba-faction.js";

export class CBAMagicArt extends DetailedView(Vitamin(Div)) {

    constructor({kind, magicArt, action, sheetAction}) {
        super({ref:"magic-"+magicArt.id});
        this._sheetAction = sheetAction;
        this.addClass(kind);
        this._header = new Div().addClass("magic-header");
        this.add(this._header);
        this._illustration = new VImage({ref:"magic-"+magicArt.id+"-image", kind:"magic-image"});
        this._header.add(this._illustration);
        this._name = new P().addClass("magic-name");
        this._header.add(this._name);
        this._description = new P().addClass("magic-description");
        this._header.add(this._description);
        this._content = new Div().addClass("magic-content");
        this.add(this._content);
        this._sheets=[];
        if (magicArt.sheets) {
            for (let sheetSpec of magicArt.sheets) {
                this.createDetailRecord(sheetSpec);
            }
        }
        this.specification = magicArt;
        this.onEvent("click", event=>{
            action && action(this)
        });
    }

    get content() {
        return this._content;
    }

    get detailRecords() {
        return this.sheets;
    }

    _createDetailRecord(detailRecordSpec) {
        return new CBASheet({
            ...detailRecordSpec,
            action: this._sheetAction
        });
    }

    getSheet(ref) {
        for (let sheet of this._sheets) {
            if (sheet.ref.ref === ref) return sheet;
        }
        return null;
    }

    get sheets() {
        return this._sheets;
    }

    get name() {
        return this._name.getText();
    }

    set name(name) {
        this._name.setText(name);
    }

    get description() {
        return this._description.getText();
    }

    set description(description) {
        this._description.setText(description);
    }

    get illustration() {
        return this._illustration.src;
    }

    set illustration(illustration) {
        this._illustration.setSrc(illustration);
    }

    get specification() {
        return {
            name: this._name.getText(),
            description: this._description.getText(),
            illustration: this._illustration.src,
            sheets: this._getDetailRecordsSpecification()
        };
    }

    set specification(specification) {
        this._name.setText(specification.name || "");
        this._description.setText(specification.description || "");
        this._illustration.setSrc(specification.illustration ||  "../images/site/default-image.png");
        this._setDetailRecordsSpecification(specification.sheets);
    }

}

export class CBAEditMagicArtPane extends DetailedForm(Undoable(VSplitterPanel)) {

    constructor({ref, kind, magicArt}) {
        super({ref});
        this.addClass(kind);
        this._newSheetSpecs = {
            version: 0,
            icon: "../images/site/default-sheet-icon.png",
            path: "../images/site/default-sheet.png",
            name: "Sheet name",
            description: "Sheet description"
        };
        this._status = new VSelectField({
            ref: "magic-status", label: "Status",
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
        this.addOnRight(this._status);
        this._magicArtName = new VInputField({
            ref:"magic-name-input", label:"Magic Art Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._magicArtView.name = this._magicArtName.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._magicArtName);
        this._magicArtIllustration = new VFileLoaderField({
            ref:"magic-illustration", label:"Magic Art illustration",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (600 x 350) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==600 || image.imageHeight!==350) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (600 x 350) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                this._magicArtView.illustration = this._magicArtIllustration.imageSrc;
                if (this._magicArtIllustration.file) {
                    this._magicArtView.illustrationFile = this._magicArtIllustration.file;
                }
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._magicArtIllustration);
        this._magicArtDescription = new VInputTextArea({
            ref:"magic-description-input", label:"Magic Art Description",
            validate: mandatory({validate: range({min:2, max:20000})}),
            onInput: event=>{
                this._magicArtView.description = this._magicArtDescription.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._magicArtDescription);
        this._sheetImages = new Div().addClass("sheet-images");
        this.addOnRight(this._sheetImages);
        this._sheetPath = new VFileLoaderField({
            ref:"sheet-path", label:"Sheet Document",
            validate: mandatory({}),
            verify(image) {
                if ((image.imageWidth!==3969 || image.imageHeight!==5613)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (3969 x 5613) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                if (isImageFile(this._sheetPath.file)) {
                    this._sheetIcon.imageSrc = this.getSheetIconSrcFromPath();
                    this._sheetView.icon = this.sheetIconSrc;
                    this._sheetView.iconFile = this.getSheetIconImageFromPath();
                    this._sheetView.path = this.sheetPathSrc;
                }
                else {
                    this._sheetPath.placeholder = "../images/site/document.png";
                    this._sheetView.path = null
                }
                this._sheetView.pathFile = this.sheetPathDocument;
            },
            onChange: event=>{
                this._memorize();
            },
            onClick: event=>{
                if (this._sheetView.path) {
                    download( this._sheetView.path);

                }
                else if (this._sheetView.pathFile) {
                    download( URL.createObjectURL(this._sheetView.pathFile));
                }
            }
        });
        this._sheetImages.add(this._sheetPath.addClass("sheet-image-loader"));
        this._sheetIcon = new VFileLoaderField({
            ref:"sheet-icon", label:"Sheet Icon",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (310 x 438) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==310 || image.imageHeight!==438) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (310 x 438) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                this._sheetView.icon = this.sheetIconSrc;
                if (this._sheetIcon.file) {
                    this._sheetView.iconFile = this.sheetIconImage;
                }
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this._sheetImages.add(this._sheetIcon.addClass("sheet-image-loader"));
        this._sheetName = new VInputField({
            ref:"sheet-name-input", label:"Sheet Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._sheetView.name = this._sheetName.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._sheetName);
        this._sheetDescription = new VInputTextArea({
            ref:"sheet-description-input", label:"Sheet Description",
            validate: mandatory({validate: range({min:2, max:20000})}),
            onInput: event=>{
                this._sheetView.description = this._sheetDescription.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._sheetDescription);
        let userSelector = new CBAUserSelector({title:"Select Magic Art Account", loadPage:loadUsers, selectUser: user=>{
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
        this.magicArt = magicArt;
    }

    _updateForm() {
        this._magicArtName.value = this._magicArtView.name;
        this._magicArtDescription.value = this._magicArtView.description;
        this._magicArtIllustration.imageSrc = this._magicArtView.illustration;
        this._sheetName.value = this._sheetView.name;
        this._sheetDescription.value = this._sheetView.description;
        if (this._sheetView.path) {
            if (isImageURL(this._sheetView.path)) {
                this._sheetPath.imageSrc = this._sheetView.path;
            }
            else {
                this._sheetPath.placeholder = "../images/site/document.png";
            }
        }
        else if (!this._sheetView.pathFile) {
            this._sheetPath.placeholder = "../images/site/default-sheet.png";
        }
        else if (!isImageFile(this._sheetView.pathFile)) {
            this._sheetPath.placeholder = "../images/site/document.png";
        }
        this._sheetIcon.imageSrc = this._sheetView.icon;
    }

    validate() {
        return !this._magicArtName.validate()
            & !this._magicArtDescription.validate()
            & !this._magicArtIllustration.validate()
            & !this._sheetPath.validate()
            & !this._sheetName.validate()
            & !this._sheetDescription.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Magic Art not saved. Do you want to Quit ?")
    }

    get magicArt() {
        return {
            status: this._status.value,
            ...this._magicArtView.specification,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set magicArt(magicArt) {
        this._magicArt = magicArt;
        if (!magicArt.sheets) {
            magicArt.sheets = [
                structuredClone(this._newSheetSpecs)
            ]
        }
        if (this._magicArtView) {
            this.removeFromLeft(this._magicArtView);
        }
        this._magicArtView = new CBAMagicArt({
            sheetAction:sheetView => {
                this.selectDetailRecord(sheetView);
                return true;
            },
            magicArt
        });
        this._magicArtView.sheets[0] && this._selectDetailRecord(this._magicArtView.sheets[0]);
        this.addOnLeft(this._magicArtView);
        this._magicArtName.value = magicArt.name || "";
        this._magicArtDescription.value = magicArt.description || "";
        this._status.value = magicArt.status || "live";
        this._author.value = magicArt.author;
        this._comments = {
            comments: this._magicArt.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            current: this._sheetView ? this._sheetView.ref.ref : null,
            ...this.magicArt
        }
    }

    _recover(specification) {
        if (specification) {
            this._magicArtView.specification = specification;
            for (let sheetView of this._magicArtView.sheets) {
                sheetView.action = event => {
                    this.selectDetailRecord(sheetView);
                    return true;
                }
            }
            this._magicArtName.value = this._magicArtView.name;
            this._magicArtDescription.value = this._magicArtView.description;
            let sheetView = this._magicArtView.getSheet(specification.current);
            this._selectDetailRecord(sheetView);
            this._author.value = specification.author;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(magicArt) {
        this.magicArt = magicArt;
        this._clean();
        this._memorize();
        return true;
    }

    set comments(comments) {
        this._comments = comments;
        this._memorize();
    }

    onComments() {
        new CBAEditComments({
            "ref": "magic-comments",
            "kind": "magic-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    get mainRecordView() {
        return this._magicArtView;
    }

    get detailRecordView() {
        return this._sheetView;
    }

    set detailRecordView(detailRecordView) {
        this._sheetView = detailRecordView;
    }

    get newDetailRecordSpec() {
        return this._newSheetSpecs;
    }

    get sheetPathSrc()  {
        return this._sheetPath.imageSrc;
    }

    get sheetIconSrc()  {
        return this._sheetIcon.imageSrc
    }

    get sheetPathDocument()  {
        return this._sheetPath.file;
    }

    get sheetIconImage()  {
        return this._sheetIcon.file;
    }

    getSheetIconSrcFromPath()  {
        return this._sheetPath.getImageDataURL("icon.png", 310, 438);
    }

    getSheetIconImageFromPath()  {
        return this._sheetPath.getImageFile("icon.png", 310, 438);
    }

    get imageFiles() {
        let images = [];
        let illustration = this._magicArtView.illustrationFile;
        if (illustration) {
            images.push({key: "illustration", file:illustration});
        }
        for (let ordinal=0; ordinal<this._magicArtView.sheets.length; ordinal++) {
            let path = this._magicArtView.sheets[ordinal].pathFile;
            if (path) {
                images.push({key: "path-" + ordinal, file:path});
            }
            let icon = this._magicArtView.sheets[ordinal].iconFile;
            if (icon) {
                images.push({key: "icon-" + ordinal, file:icon});
            }
        }
        return images.length ? images : null;
    }

}

export class CBAEditMagicArt extends VModal {

    constructor({title, create, magicArt, saveMagicArt, deleteMagicArt}) {
        super({ref:"edit-magic-modal", title});
        this._id = magicArt.id;
        this._magicArtPane = new CBAEditMagicArtPane({
            ref: "magic-editor-pane",
            kind: "magic-editor-pane",
            magicArt,
            create,
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-magic", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let magicArt = this.specification;
                        let newComment = magicArt.comments.newComment;
                        if (newComment) {
                            magicArt.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        magicArt.comments = magicArt.comments.comments;
                        saveMagicArt(magicArt);
                    }
                }
            },
            {
                ref: "close-magic", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-magic", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-magic-deletion",
                    title: "Delete Magic Art",
                    message: "Do you really want to delete the Magic Art ?",
                    actionOk: event => deleteMagicArt(magicArt)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._magicArtPane);
        this.add(this._buttons);
        this.addClass("magic-modal");
    }

    tryToLeave(leave, notLeave) {
        return this._magicArtPane.tryToLeave(leave, notLeave);
    }

    validate() {
        return this._magicArtPane.validate();
    }

    saved(magicArt) {
        this._magicArtPane.saved(magicArt);
        this._id = magicArt.id;
        this._deleteButton.enabled = true;
        showMessage("Magic Art saved.");
        return true;
    }

    get imageFiles() {
        return this._magicArtPane.imageFiles;
    }

    get specification() {
        return {
            id: this._id,
            ...this._magicArtPane.magicArt
        };
    }

}

export class CBAMagicArtList extends VTable {

    constructor({loadPage, deleteMagicArt, saveMagicArt, saveMagicArtStatus}) {
        super({
            ref: "magic-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("magic-list");
        this._loadPage = loadPage;
        this._saveMagicArt = saveMagicArt;
        this._saveMagicArtStatus = saveMagicArtStatus;
        this._deleteMagicArt = deleteMagicArt;
    }

    set search(search) {
        this._search = search;
    }

    loadMagicArts() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    selectMagicArt(magicArt) {
        loadMagicArt(magicArt,
            magicArt=>{
                let magicArtEditor = new CBAEditMagicArt({
                    title: "Edit Magic Art",
                    magicArt,
                    saveMagicArt: magicArt => this._saveMagicArt(magicArt,
                        magicArtEditor.imageFiles,
                        text => {
                            magicArtEditor.saved(parseMagicArt(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Magic Art", text);
                        }
                    ),
                    deleteMagicArt: magicArt => this._deleteMagicArt(magicArt,
                        () => {
                            magicArtEditor.hide();
                            magicArtEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            magicArtEditor.confirm.hide();
                            showMessage("Fail to delete Magic Art", text);
                        }
                    ),
                }).show();
            },

        );

    };

    _setPage(pageIndex) {
        function getMagicArt(line) {
            return {
                id: line.id,
                magicArtName: line.name.getText(),
                magicArtDescription: line.description.getText(),
                status: line.status.getValue()
            };
        }
        function getAuthor(magicArt) {
            return magicArt.author.firstName+" "+magicArt.author.lastName;
        }
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveMagicArtStatus = magicArt => this._saveMagicArtStatus(magicArt,
                () => showMessage("Magic Art saved."),
                text => showMessage("Unable to Save Magic Art.", text),
            );
            for (let magicArt of pageData.magicArts) {
                let line;
                let name = new Span(magicArt.name).addClass("magic-name")
                    .onMouseClick(event => this.selectMagicArt(getMagicArt(line)));
                let description = new Span(magicArt.description).addClass("magic-description")
                    .onMouseClick(event => this.selectMagicArt(getMagicArt(line)));
                let illustration = new Img(magicArt.illustration).addClass("magic-illustration")
                    .onMouseClick(event => this.selectMagicArt(getMagicArt(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                .addClass("form-input-select")
                .setValue(magicArt.status)
                .addClass("magic-status")
                .onChange(event => saveMagicArtStatus(getMagicArt(line)));
                line = {id: magicArt.id, name, description, illustration, status};
                lines.push([name, illustration, description, status]);
            }
            let title = new Span(pageData.title)
                .addClass("magic-title")
            let pageSummary = new Span()
                .addClass("magic-pager")
                .setText(pageData.magicArtCount ?
                    String.format(CBAMagicArtList.SUMMARY, pageData.magicArtCount, pageData.firstMagicArt, pageData.lastMagicArt) :
                    CBAMagicArtList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Name", "Illustration", "Description", "Status"],
                data: lines
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

    static SUMMARY = "Showing {1} to {2} of {0} magic art(s)";
    static EMPTY_SUMMARY = "There are no magic art to show";
}

export class CBAMagicArtListPage extends Vitamin(Div) {

    constructor({loadPage, deleteMagicArt, saveMagicArt, saveMagicArtStatus}) {
        super({ref: "magic-list-page"});
        this._search = new VSearch({
            ref: "magic-list-search", searchAction: search => {
                this.loadMagicArts();
            }
        });
        this._create = new VButton({
            ref: "magic-create", type: "neutral", label: "Create Magic Art",
            onClick: event => {
                this._createMagicArtModal = new CBAEditMagicArt({
                    title: "Create Magic Art",
                    create: true,
                    magicArt: {
                        name: "Magic Art Title",
                        version: 0,
                        status: "prp"
                    },
                    saveMagicArt: magicArt => saveMagicArt(magicArt,
                        this._createMagicArtModal.imageFiles,
                        text => {
                            this._createMagicArtModal.saved(parseMagicArt(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Magic Art", text);
                        }
                    ),
                    deleteMagicArt: () => {
                        this._createMagicArtModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAMagicArtList({loadPage, saveMagicArt, saveMagicArtStatus, deleteMagicArt});
        this.add(this._search).add(this._table);
    }

    get createMagicArtModal() {
        return this._createMagicArtModal;
    }

    loadMagicArts() {
        this._table.search = this._search.value;
        this._table.loadMagicArts();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadMagicArts(pageIndex, search, update) {
    sendGet("/api/magicart/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load Magic Art success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Magic Art List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                magicArtCount: response.count,
                firstMagicArt: response.page * response.pageSize + 1,
                lastMagicArt: response.page * response.pageSize + response.magicArts.length,
                magicArts: response.magicArts
            });
        },
        (text, status) => {
            requestLog("Load Magic Art failure: " + text + ": " + status);
            showMessage("Unable to load Magic Arts", text);
        }
    );
}

function parseMagicArt(text) {
    let magicArt = JSON.parse(text);
    for (let comment of magicArt.comments) {
        comment.date = new Date(comment.date);
    }
    return magicArt;
}

export function loadMagicArt(magicArt, success) {
    sendGet("/api/magicart/load/"+magicArt.id,
        (text, status) => {
            requestLog("Magic Art load success: " + text + ": " + status);
            success(parseMagicArt(text));
        },
        (text, status) => {
            requestLog("Load Magic Art failure: " + text + ": " + status);
            showMessage("Unable to load Magic Art of Id "+magicArt.id, text);
        }
    );
}

export function saveMagicArt(magicArt, images, success, failure) {
    sendPost(magicArt.id===undefined ? "/api/magicart/create" : "/api/magicart/update/" + magicArt.id,
        magicArt,
        (text, status) => {
            requestLog("Magic Art saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Magic Art saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveMagicArtStatus(magicArt, success, failure) {
    sendPost("/api/magicart/update-status/" + magicArt.id,
        magicArt,
        (text, status) => {
            requestLog("Magic Art status update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Magic Art status update failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteMagicArt(magicArt, success, failure) {
    sendGet("/api/magicart/delete/" + magicArt.id,
        (text, status) => {
            requestLog("Magic Art delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Magic Art delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vMagicArtList = new CBAMagicArtListPage({
    loadPage: loadMagicArts,
    deleteMagicArt,
    saveMagicArt,
    saveMagicArtStatus
});
