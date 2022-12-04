'use strict';

import {
    VContainer,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, requestLog, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Undoable,
    Vitamin, VModal
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

export class CBAEditForum extends Undoable(VModal) {

    constructor({ref, kind, saveForum, create, forum}) {
        super({ref});
        this.addClass(kind);
        this._title = new VInputField({
            ref:"forum-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "forum-status", label: "Status",
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
        this._description = new VInputTextArea({
            ref:"forum-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:4995})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._description);
        let userSelector = new CBAUserSelector({
            title:"Select Forum Author",
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
        this._buttons = new VButtons({
            ref: "buttons", buttons: [
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            },
            {
                ref: "save-forum", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let forum = this.forum;
                        let newComment = forum.comments.newComment;
                        if (newComment) {
                            forum.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        forum.comments = forum.comments.comments;
                        saveForum(forum);
                    }
                }
            },
            {
                ref: "close-forum", type: "neutral", label: "Close",
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
                    ref: "confirm-forum-deletion",
                    title: "Delete Forum",
                    message: "Do you really want to delete the Forum ?",
                    actionOk: event => deleteForum(forum)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("forum-modal");
        this.forum = forum;
    }

    validate() {
        return !this._title.validate()
            & !this._description.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Forum not saved. Do you want to Quit ?")
    }

    get forum() {
        return {
            id: this._id,
            title: this._title.value,
            description: this._description.value,
            status: this._status.value,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set forum(forum) {
        this._forum = forum;
        this._title.value = forum.title || "";
        this._status.value = forum.status || "prp";
        this._description.value = forum.description || "";
        this._author.value = forum.author;
        this._comments = {
            comments: this._forum.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.forum;
    }

    _recover(forum) {
        if (forum) {
            this._title.value = forum.name;
            this._description.value = forum.description;
            this._status.value = forum.status;
            this._author.value = forum.author;
            this._comments = structuredClone(forum.comments)
        }
    }

    saved(forum) {
        this.forum = forum;
        this._id = forum.id;
        this._deleteButton.enabled = true;
        showMessage("Forum saved.");
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
            "ref": "forum-comments",
            "kind": "forum-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAForumList extends VTable {

    constructor({loadPage, saveForum, saveForumStatus, deleteForum}) {
        super({
            ref: "forum-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectForum(line)
        });
        this.addClass("forum-list");
        this._loadPage = loadPage;
        this._saveForum = saveForum;
        this._saveForumStatus = saveForumStatus;
        this._deleteForum = deleteForum;
    }

    set search(search) {
        this._search = search;
    }

    loadForums() {
        this.setPage();
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectForum(forum) {
        loadForum(forum,
            forum=>{
                let forumEditor = new CBAEditForum({
                    title: "Edit Forum",
                    forum,
                    saveForum: forum => this._saveForum(forum,
                        text => {
                            forumEditor.saved(parseForum(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Forum", text);
                        }
                    ),
                    deleteForum: forum => this._deleteForum(forum,
                        () => {
                            forumEditor.hide();
                            forumEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            forumEditor.confirm.hide();
                            showMessage("Fail to delete Forum", text);
                        }
                    ),
                }).show();
            },

        );

    };

    setPage() {
        this._loadPage(pageData => {
            let lines = [];
            let saveForumStatus = forum => this._saveForumStatus(forum,
                () => showMessage("Forum saved."),
                text => showMessage("Unable to Save Forum.", text),
            );
            for (let forum of pageData.forums) {
                let line;
                let title = new Span(forum.title).addClass("forum-title");
                let description = new P(forum.description).addClass("forum-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(forum.status)
                    .addClass("forum-status")
                    .onChange(event => saveForumStatus(getForum(line)));
                line = {
                    id: forum.id,
                    title: title.getText(),
                    description: description.getText(),
                    status: status.getValue(),
                    author: forum.author
                };
                lines.push({source:line, cells:[title, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("forum-title")
            let summary = new Div()
                .addClass("table-display")
                .add(title);
            this.setContent({
                summary,
                columns: ["Title", "Description", "Status"],
                lines
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} forum(s)";
    static EMPTY_SUMMARY = "There are no forum to show";
}

export class CBAForumListPage extends Vitamin(Div) {

    constructor({loadPage, saveForum, saveForumStatus, deleteForum}) {
        super({ref: "forum-list-page"});
        this._buttons = new Div().addClass("forum-buttons");
        this._create = new VButton({
            ref: "forum-create", type: "neutral", label: "Create Forum",
            onClick: event => {
                this._createForumModal = new CBAEditForum({
                    title: "Create Forum",
                    create: true,
                    forum: {
                        status: "prp"
                    },
                    saveForum: forum => saveForum(forum,
                        text => {
                            this._createForumModal.saved(parseForum(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Forum", text);
                        }
                    ),
                    deleteForum: () => {
                        this._createForumModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._buttons.add(this._create);
        this._table = new CBAForumList({loadPage, saveForum, saveForumStatus, deleteForum});
        this.add(this._buttons).add(this._table);
    }

    get createForumModal() {
        return this._createForumModal;
    }

    loadForums() {
        this._table.loadForums();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadForums(update) {
    sendGet("/api/forum/all",
        (text, status) => {
            requestLog("Load forums success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Forums List",
                forums: response
            });
        },
        (text, status) => {
            requestLog("Load Forums failure: " + text + ": " + status);
            showMessage("Unable to load Forums", text);
        }
    );
}

function parseForum(text) {
    let forum = JSON.parse(text);
    for (let comment of forum.comments) {
        comment.date = new Date(comment.date);
    }
    return forum;
}

export function loadForum(forum, success) {
    sendGet("/api/forum/load/"+forum.id,
        (text, status) => {
            requestLog("Forum forum success: " + text + ": " + status);
            success(parseForum(text));
        },
        (text, status) => {
            requestLog("Load Forum failure: " + text + ": " + status);
            showMessage("Unable to load Forum of Id "+forum.id, text);
        }
    );
}

export function saveForum(forum, success, failure) {
    sendPost(forum.id===undefined ? "/api/forum/create" : "/api/forum/update/" + forum.id,
        forum,
        (text, status) => {
            requestLog("Forum saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveForumStatus(forum, success, failure) {
    sendPost("/api/forum/update-status/" + forum.id,
        forum,
        (text, status) => {
            requestLog("Forum status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteForum(forum, success, failure) {
    sendGet("/api/forum/delete/" + forum.id,
        (text, status) => {
            requestLog("Forum delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vForumList = new CBAForumListPage({
    loadPage: loadForums,
    deleteForum,
    saveForum,
    saveForumStatus
});