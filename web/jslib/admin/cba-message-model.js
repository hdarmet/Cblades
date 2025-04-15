'use strict';

import {
    VContainer,
    VTable
} from "../vitamin/vcontainer.js";
import {
    sendGet, sendPost
} from "../board/draw.js";
import {
    Div, Img, P, requestLog, Select, Span
} from "../vitamin/components.js";
import {
    Undoable,
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons,
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

export class CBAMessageModelSelector extends VModal {
    constructor({title, loadPage, category, selectMessageModel}) {
        super({"message-model": "message-model-selector", "title": title});
        this.addClass("message-model-modal");
        this._search = new VSearch({
            ref: "message-model-list-search", searchAction: search => {
                this.loadMessageModels();
            }
        });
        this._table = new CBAMessageModelSelection({loadPage, category, selectMessageModel});
        this.add(new VContainer({ ref:"message-model-selection-modal" }).add(this._search).add(this._table));
    }

    loadMessageModels() {
        this._table.search = this._search.value;
        this._table.loadMessageModels();
        return this;
    }

}

export class CBAMessageModelSelection extends VTable {

    constructor({loadPage, category, selectMessageModel}) {
        super({
            ref: "message-model-selection",
            changePage: pageIndex => this.setPage(pageIndex),
            select: messageModel => selectMessageModel(messageModel)
        });
        this.addClass("message-model-selection");
        this._category = category;
        this._loadPage = loadPage;
    }

    set search(search) {
        this._search = search;
    }

    loadMessageModels() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    setPage(pageIndex) {
        this._loadPage(this._category, pageIndex, this._search, pageData => {
            let lines = [];
            for (let messageModel of pageData.messageModels) {
                let title = new P(messageModel.title).addClass("message-model-title");
                lines.push({source: messageModel, cells:[title]});
            }
            let title = new Span(pageData.title)
                .addClass("message-model-list-title")
            let pageSummary = new Span()
                .addClass("message-model-pager")
                .setText(pageData.messageModelCount ?
                    String.format(CBAMessageModelSelection.SUMMARY, pageData.messageModelCount, pageData.firstMessageModel, pageData.lastMessageModel) :
                    CBAMessageModelSelection.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Title"],
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

    static SUMMARY = "Showing {1} to {2} of {0} message model(s)";
    static EMPTY_SUMMARY = "There are no message models to show";
}

export class CBAEditMessageModel extends Undoable(VModal) {

    constructor({ref, kind, saveMessageModel, deleteMessageModel, create, messageModel}) {
        super({ref, title:"Message Model Edition"});
        this.addClass(kind);
        this._title = new VInputField({
            ref:"message-model-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "message-model-status", label: "Status",
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
        let nameContainer = new VContainer({columns:2}).addField({field:this._title}).addField({field:this._status});
        this.add(nameContainer);
        this._text = new VInputTextArea({
            ref:"message-model-text-input", label:"Text",
            validate: mandatory({validate: range({min:2, max:4995})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._text);
        let userSelector = new CBAUserSelector({
            title:"Select Message Model Author",
            loadPage:loadUsers, selectUser: user=>{
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
        this.add(this._author);
        this._buttons = new VButtons({
            ref: "buttons", buttons: [
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            },
            {
                ref: "save-message-model", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let messageModel = this.messageModel;
                        let newComment = messageModel.comments.newComment;
                        if (newComment) {
                            messageModel.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        messageModel.comments = messageModel.comments.comments;
                        saveMessageModel(messageModel);
                    }
                }
            },
            {
                ref: "close-message-model", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }
        ]
        });
        this._deleteButton = new VButton({
            ref: "delete-event", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-messageModel-deletion",
                    title: "Delete Message Model",
                    message: "Do you really want to delete the Message Model ?",
                    actionOk: event => deleteMessageModel(messageModel)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("message-model-modal");
        this.messageModel = messageModel;
    }

    validate() {
        return !this._title.validate()
            & !this._text.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Message Model not saved. Do you want to Quit ?")
    }

    get messageModel() {
        return {
            id: this._messageModel.id,
            category: this._messageModel.category,
            title: this._title.value,
            text: this._text.value,
            status: this._status.value,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set messageModel(messageModel) {
        this._messageModel = messageModel;
        this._title.value = messageModel.title || "";
        this._status.value = messageModel.status || "prp";
        this._text.value = messageModel.text || "";
        this._author.value = messageModel.author;
        this._comments = {
            comments: this._messageModel.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.messageModel;
    }

    _recover(messageModel) {
        if (messageModel) {
            this._title.value = messageModel.name;
            this._text.value = messageModel.text;
            this._status.value = messageModel.status;
            this._author.value = messageModel.author;
            this._comments = structuredClone(messageModel.comments)
        }
    }

    saved(messageModel) {
        this.messageModel = messageModel;
        this._deleteButton.enabled = true;
        showMessage("Message Model saved.");
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
            "ref": "message-model-comments",
            "kind": "message-model-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAMessageModelList extends VTable {

    constructor({loadPage, saveMessageModel, saveMessageModelStatus, deleteMessageModel}) {
        super({
            ref: "message-model-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectMessageModel(line)
        });
        this.addClass("message-model-list");
        this._loadPage = loadPage;
        this._saveMessageModel = saveMessageModel;
        this._saveMessageModelStatus = saveMessageModelStatus;
        this._deleteMessageModel = deleteMessageModel;
    }

    set search(search) {
        this._search = search;
    }

    loadMessageModels() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectMessageModel(messageModel) {
        loadMessageModel(messageModel,
            messageModel=>{
                let messageModelEditor = new CBAEditMessageModel({
                    title: "Edit Message Model",
                    messageModel,
                    saveMessageModel: messageModel => this._saveMessageModel(messageModel,
                        text => {
                            messageModelEditor.saved(parseMessageModel(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Message Model", text);
                        }
                    ),
                    deleteMessageModel: messageModel => this._deleteMessageModel(messageModel,
                        () => {
                            messageModelEditor.hide();
                            messageModelEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            messageModelEditor.confirm.hide();
                            showMessage("Fail to delete Message Model", text);
                        }
                    ),
                }).show();
            },

        );

    };

    set category(category) {
        this._category = category;
    }

    get category() {
        return this._category;
    }

    setPage(pageNo) {
        this._loadPage(this._category, pageNo, this._search, pageData => {
            let lines = [];
            let saveMessageModelStatus = (messageModel, status) => {
                messageModel.status = status;
                this._saveMessageModelStatus(messageModel,
                    () => showMessage("Message Model saved."),
                    text => showMessage("Unable to Save Message Model.", text),
                );
            }
            for (let messageModel of pageData.messageModels) {
                let title = new Span(messageModel.title).addClass("message-model-title");
                let text = new P(messageModel.text).addClass("message-model-text");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(messageModel.status)
                    .addClass("message-model-status")
                    .onChange(event => saveMessageModelStatus(messageModel, status.getValue()));
                lines.push({source:messageModel, cells:[title, text, status]});
            }
            let title = new Span(pageData.title)
                .addClass("message-model-list-title")
            let pageSummary = new Span()
                .addClass("message-model-pager")
                .setText(pageData.messageModelCount ?
                    String.format(CBAMessageModelList.SUMMARY, pageData.messageModelCount, pageData.firstMessageModel, pageData.lastMessageModel) :
                    CBAMessageModelList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Name", "Text", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} message model(s)";
    static EMPTY_SUMMARY = "There are no message model to show";
}

export class CBAMessageModelListPage extends Vitamin(Div) {

    constructor({loadPage, saveMessageModel, saveMessageModelStatus, deleteMessageModel}) {
        super({ref: "message-model-list-page"});
        this._buttons = new Div().addClass("message-model-buttons");
        this._search = new VSearch({
            ref: "theme-list-search", searchAction: search => {
                this.loadMessageModels();
            }
        });
        this._create = new VButton({
            ref: "message-model-create", type: "neutral", label: "Create Message Model",
            onClick: event => {
                this._createMessageModelModal = new CBAEditMessageModel({
                    title: "Create Message Model",
                    create: true,
                    messageModel: {
                        category: this.category,
                        status: "prp"
                    },
                    saveMessageModel: messageModel => saveMessageModel(messageModel,
                        text => {
                            this._createMessageModelModal.saved(parseMessageModel(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Message Model", text);
                        }
                    ),
                    deleteMessageModel: () => {
                        this._createMessageModelModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAMessageModelList({loadPage, saveMessageModel, saveMessageModelStatus, deleteMessageModel});
        this.add(this._search).add(this._table);
    }

    get createMessageModelModal() {
        return this._createMessageModelModal;
    }

    loadMessageModels() {
        this._table.search = this._search.value;
        this._table.loadMessageModels();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

    get category() {
        return this._table.category;
    }

    set category(category) {
        this._table.category = category;
    }
}

export function loadMessageModels(category, pageIndex, search, update) {
    sendGet("/api/message-model/category/"+category+"?page="+pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load message models success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Message Models List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                messageModelCount: response.count,
                firstMessageModel: response.page * response.pageSize + 1,
                lastMessageModel: response.page * response.pageSize + response.messageModels.length,
                messageModels: response.messageModels
            });
        },
        (text, status) => {
            requestLog("Load Message Models failure: " + text + ": " + status);
            showMessage("Unable to load Message Models", text);
        }
    );
}

function parseMessageModel(text) {
    let messageModel = JSON.parse(text);
    for (let comment of messageModel.comments) {
        comment.date = new Date(comment.date);
    }
    return messageModel;
}

export function loadMessageModel(messageModel, success) {
    sendGet("/api/message-model/load/"+messageModel.id,
        (text, status) => {
            requestLog("Message Model messageModel success: " + text + ": " + status);
            success(parseMessageModel(text));
        },
        (text, status) => {
            requestLog("Load Message Model failure: " + text + ": " + status);
            showMessage("Unable to load Message Model of Id "+messageModel.id, text);
        }
    );
}

export function saveMessageModel(messageModel, success, failure) {
    sendPost(messageModel.id===undefined ? "/api/message-model/create" : "/api/message-model/update/" + messageModel.id,
        messageModel,
        (text, status) => {
            requestLog("Message Model saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Message Model saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveMessageModelStatus(messageModel, success, failure) {
    sendPost("/api/message-model/update-status/" + messageModel.id,
        messageModel,
        (text, status) => {
            requestLog("Message Model status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Message Model status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteMessageModel(messageModel, success, failure) {
    sendGet("/api/message-model/delete/" + messageModel.id,
        (text, status) => {
            requestLog("Message Model delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Message Model delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vMessageModelList = new CBAMessageModelListPage({
    loadPage: loadMessageModels,
    deleteMessageModel,
    saveMessageModel,
    saveMessageModelStatus
});
