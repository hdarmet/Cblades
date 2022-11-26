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

export class CBASheet extends Vitamin(Div) {

    constructor({id, version, path, pathFile, icon, iconFile, name, description, action}) {
        super({ref:"sheet-"+id});
        this._id = id;
        this._version = version;
        this.addClass("embed-sheet");
        this._embed = new Div();
        this.add(this._embed);
        this._embed.addClass("sheet");
        this._path = new VMagnifiedImage({ref:id+"-image", kind:"sheet-image", zoomImg:path, img:icon});
        this._embed.add(this._path);
        this._content = new Div().addClass("sheet-container");
        this._embed.add(this._content);
        this._name = new P(name).addClass("sheet-name");
        this._content.add(this._name);
        this._description = new P(description).addClass("sheet-description");
        this._content.add(this._description);
        this._pathFile = pathFile;
        this._iconFile = iconFile;
        this.action=action;
    }

    set action(action) {
        action && this.onEvent("click", event=>{
            action(this)
        });
    }

    get specification() {
        return {
            id: this._id,
            version: this._version,
            path: this._path.zoomSrc ? this._path.zoomSrc : URL.createObjectURL(this._pathFile),
            icon: this._path.src,
            name: this._name.getText(),
            description: this._description.getText()
        };
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

    get path() {
        return this._path.zoomSrc;
    }

    get icon() {
        return this._path.src;
    }

    get pathFile() {
        return this._pathFile;
    }

    set pathFile(pathFile) {
        this._pathFile = pathFile;
    }

    set path(path) {
        this._path.setZoomSrc(path);
    }

    get iconFile() {
        return this._iconFile;
    }

    set iconFile(iconFile) {
        this._iconFile = iconFile;
    }

    set icon(icon) {
        this._path.setSrc(icon);
    }

}

export class CBAFaction extends DetailedView(Vitamin(Div)) {

    constructor({kind, faction, action, sheetAction}) {
        super({ref:"faction-"+faction.id});
        this._sheetAction = sheetAction;
        this.addClass(kind);
        this._header = new Div().addClass("faction-header");
        this.add(this._header);
        this._illustration = new VImage({ref:"faction-"+faction.id+"-image", kind:"faction-image"});
        this._header.add(this._illustration);
        this._name = new P().addClass("faction-name");
        this._header.add(this._name);
        this._description = new P().addClass("faction-description");
        this._header.add(this._description);
        this._content = new Div().addClass("faction-content");
        this.add(this._content);
        this._sheets=[];
        if (faction.sheets) {
            for (let sheetSpec of faction.sheets) {
                this.createDetailRecord(sheetSpec);
            }
        }
        this.specification = faction;
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

export class CBAEditFactionPane extends DetailedForm(Undoable(VSplitterPanel)) {

    constructor({ref, kind, faction}) {
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
            ref: "faction-status", label: "Status",
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
        this._factionName = new VInputField({
            ref:"faction-name-input", label:"Faction Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._factionView.name = this._factionName.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._factionName);
        this._factionIllustration = new VFileLoaderField({
            ref:"faction-illustration", label:"Faction illustration",
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
                this._factionView.illustration = this._factionIllustration.imageSrc;
                if (this._factionIllustration.file) {
                    this._factionView.illustrationFile = this._factionIllustration.file;
                }
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._factionIllustration);
        this._factionDescription = new VInputTextArea({
            ref:"faction-description-input", label:"Faction Description",
            validate: mandatory({validate: range({min:2, max:20000})}),
            onInput: event=>{
                this._factionView.description = this._factionDescription.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._factionDescription);
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
        let userSelector = new CBAUserSelector({title:"Select Faction Account", loadPage:loadUsers, selectUser: user=>{
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
        this.faction = faction;
    }

    _updateForm() {
        this._factionName.value = this._factionView.name;
        this._factionDescription.value = this._factionView.description;
        this._factionIllustration.imageSrc = this._factionView.illustration;
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
        return !this._factionName.validate()
            & !this._factionDescription.validate()
            & !this._factionIllustration.validate()
            & !this._sheetPath.validate()
            & !this._sheetName.validate()
            & !this._sheetDescription.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Faction not saved. Do you want to Quit ?")
    }

    get faction() {
        return {
            status: this._status.value,
            ...this._factionView.specification,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set faction(faction) {
        this._faction = faction;
        if (!faction.sheets) {
            faction.sheets = [
                structuredClone(this._newSheetSpecs)
            ]
        }
        if (this._factionView) {
            this.removeFromLeft(this._factionView);
        }
        this._factionView = new CBAFaction({
            sheetAction:sheetView => {
                this.selectDetailRecord(sheetView);
                return true;
            },
            faction
        });
        this._factionView.sheets[0] && this._selectDetailRecord(this._factionView.sheets[0]);
        this.addOnLeft(this._factionView);
        this._factionName.value = faction.name || "";
        this._factionDescription.value = faction.description || "";
        this._status.value = faction.status || "live";
        this._author.value = faction.author;
        this._comments = {
            comments: this._faction.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            current: this._sheetView ? this._sheetView.ref.ref : null,
            ...this.faction
        }
    }

    _recover(specification) {
        if (specification) {
            this._factionView.specification = specification;
            for (let sheetView of this._factionView.sheets) {
                sheetView.action = event => {
                    this.selectDetailRecord(sheetView);
                    return true;
                }
            }
            this._factionName.value = this._factionView.name;
            this._factionDescription.value = this._factionView.description;
            let sheetView = this._factionView.getSheet(specification.current);
            this._selectDetailRecord(sheetView);
            this._author.value = specification.author;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(faction) {
        this.faction = faction;
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
            "ref": "faction-comments",
            "kind": "faction-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    get mainRecordView() {
        return this._factionView;
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
        let illustration = this._factionView.illustrationFile;
        if (illustration) {
            images.push({key: "illustration", file:illustration});
        }
        for (let ordinal=0; ordinal<this._factionView.sheets.length; ordinal++) {
            let path = this._factionView.sheets[ordinal].pathFile;
            if (path) {
                images.push({key: "path-" + ordinal, file:path});
            }
            let icon = this._factionView.sheets[ordinal].iconFile;
            if (icon) {
                images.push({key: "icon-" + ordinal, file:icon});
            }
        }
        return images.length ? images : null;
    }

}

export class CBAEditFaction extends VModal {

    constructor({title, create, faction, saveFaction, deleteFaction}) {
        super({ref:"edit-faction-modal", title});
        this._id = faction.id;
        this._factionPane = new CBAEditFactionPane({
            ref: "faction-editor-pane",
            kind: "faction-editor-pane",
            faction,
            create,
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-faction", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let faction = this.specification;
                        let newComment = faction.comments.newComment;
                        if (newComment) {
                            faction.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        faction.comments = faction.comments.comments;
                        saveFaction(faction);
                    }
                }
            },
            {
                ref: "close-faction", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-faction", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-faction-deletion",
                    title: "Delete Faction",
                    message: "Do you really want to delete the Faction ?",
                    actionOk: event => deleteFaction(faction)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._factionPane);
        this.add(this._buttons);
        this.addClass("faction-modal");
    }

    tryToLeave(leave, notLeave) {
        return this._factionPane.tryToLeave(leave, notLeave);
    }

    validate() {
        return this._factionPane.validate();
    }

    saved(faction) {
        this._factionPane.saved(faction);
        this._id = faction.id;
        this._deleteButton.enabled = true;
        showMessage("Faction saved.");
        return true;
    }

    get imageFiles() {
        return this._factionPane.imageFiles;
    }

    get specification() {
        return {
            id: this._id,
            ...this._factionPane.faction
        };
    }

}

export class CBAFactionList extends VTable {

    constructor({loadPage, deleteFaction, saveFaction, saveFactionStatus}) {
        super({
            ref: "faction-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("faction-list");
        this._loadPage = loadPage;
        this._saveFaction = saveFaction;
        this._saveFactionStatus = saveFactionStatus;
        this._deleteFaction = deleteFaction;
    }

    set search(search) {
        this._search = search;
    }

    loadFactions() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    selectFaction(faction) {
        loadFaction(faction,
            faction=>{
                let factionEditor = new CBAEditFaction({
                    title: "Edit Faction",
                    faction,
                    saveFaction: faction => this._saveFaction(faction,
                        factionEditor.imageFiles,
                        text => {
                            factionEditor.saved(parseFaction(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Faction", text);
                        }
                    ),
                    deleteFaction: faction => this._deleteFaction(faction,
                        () => {
                            factionEditor.hide();
                            factionEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            factionEditor.confirm.hide();
                            showMessage("Fail to delete Faction", text);
                        }
                    ),
                }).show();
            },

        );

    };

    _setPage(pageIndex) {
        function getFaction(line) {
            return {
                id: line.id,
                factionName: line.name.getText(),
                factionDescription: line.description.getText(),
                status: line.status.getValue()
            };
        }
        function getAuthor(faction) {
            return faction.author.firstName+" "+faction.author.lastName;
        }
        function getFirstSheet(faction) {
            return "<h4>"+faction.firstSheet.name+"</h4>" + faction.firstSheet.description;
        }
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveFactionStatus = faction => this._saveFactionStatus(faction,
                () => showMessage("Faction saved."),
                text => showMessage("Unable to Save Faction.", text),
            );
            for (let faction of pageData.factions) {
                let line;
                let name = new Span(faction.name).addClass("faction-name")
                    .onMouseClick(event => this.selectFaction(getFaction(line)));
                let description = new Span(faction.description).addClass("faction-description")
                    .onMouseClick(event => this.selectFaction(getFaction(line)));
                let illustration = new Img(faction.illustration).addClass("faction-illustration")
                    .onMouseClick(event => this.selectFaction(getFaction(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                .addClass("form-input-select")
                .setValue(faction.status)
                .addClass("faction-status")
                .onChange(event => saveFactionStatus(getFaction(line)));
                line = {id: faction.id, name, description, illustration, status};
                lines.push([name, illustration, description, status]);
            }
            let title = new Span(pageData.title)
                .addClass("faction-title")
            let pageSummary = new Span()
                .addClass("faction-pager")
                .setText(pageData.factionCount ?
                    String.format(CBAFactionList.SUMMARY, pageData.factionCount, pageData.firstFaction, pageData.lastFaction) :
                    CBAFactionList.EMPTY_SUMMARY);
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

    static SUMMARY = "Showing {1} to {2} of {0} faction(s)";
    static EMPTY_SUMMARY = "There are no faction to show";
}

export class CBAFactionListPage extends Vitamin(Div) {

    constructor({loadPage, deleteFaction, saveFaction, saveFactionStatus}) {
        super({ref: "faction-list-page"});
        this._search = new VSearch({
            ref: "faction-list-search", searchAction: search => {
                this.loadFactions();
            }
        });
        this._create = new VButton({
            ref: "faction-create", type: "neutral", label: "Create Faction",
            onClick: event => {
                this._createFactionModal = new CBAEditFaction({
                    title: "Create Faction",
                    create: true,
                    faction: {
                        name: "Faction Title",
                        version: 0,
                        status: "prp"
                    },
                    saveFaction: faction => saveFaction(faction,
                        this._createFactionModal.imageFiles,
                        text => {
                            this._createFactionModal.saved(parseFaction(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Faction", text);
                        }
                    ),
                    deleteFaction: () => {
                        this._createFactionModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAFactionList({loadPage, saveFaction, saveFactionStatus, deleteFaction});
        this.add(this._search).add(this._table);
    }

    get createFactionModal() {
        return this._createFactionModal;
    }

    loadFactions() {
        this._table.search = this._search.value;
        this._table.loadFactions();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadFactions(pageIndex, search, update) {
    sendGet("/api/faction/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load faction success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Faction List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                factionCount: response.count,
                firstFaction: response.page * response.pageSize + 1,
                lastFaction: response.page * response.pageSize + response.factions.length,
                factions: response.factions
            });
        },
        (text, status) => {
            requestLog("Load Faction failure: " + text + ": " + status);
            showMessage("Unable to load Factions", text);
        }
    );
}

function parseFaction(text) {
    let faction = JSON.parse(text);
    for (let comment of faction.comments) {
        comment.date = new Date(comment.date);
    }
    return faction;
}

export function loadFaction(faction, success) {
    sendGet("/api/faction/load/"+faction.id,
        (text, status) => {
            requestLog("Faction load success: " + text + ": " + status);
            success(parseFaction(text));
        },
        (text, status) => {
            requestLog("Load Faction failure: " + text + ": " + status);
            showMessage("Unable to load Faction of Id "+faction.id, text);
        }
    );
}

export function saveFaction(faction, images, success, failure) {
    sendPost(faction.id===undefined ? "/api/faction/create" : "/api/faction/update/" + faction.id,
        faction,
        (text, status) => {
            requestLog("Faction saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Faction saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveFactionStatus(faction, success, failure) {
    sendPost("/api/faction/update-status/" + faction.id,
        faction,
        (text, status) => {
            requestLog("Faction status update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Faction status update failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteFaction(faction, success, failure) {
    sendGet("/api/faction/delete/" + faction.id,
        (text, status) => {
            requestLog("Faction delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Faction delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vFactionList = new CBAFactionListPage({
    loadPage: loadFactions,
    deleteFaction,
    saveFaction,
    saveFactionStatus
});
