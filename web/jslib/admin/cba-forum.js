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

    constructor({ref, kind, saveForum, deleteForum, create, forum}) {
        super({ref, title:"Forum Edition"});
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
                ref: "save-forum", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let forum = this.forum;
                        if (forum.author) forum.author = forum.author.id;
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
            id: this._forum.id,
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
            let saveForumStatus = (forum, status) => {
                forum.status = status;
                this._saveForumStatus(forum,
                    () => showMessage("Forum saved."),
                    text => showMessage("Unable to Save Forum.", text),
                );
            }
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
                    .onChange(event => saveForumStatus(forum, status.getValue()));
                let commands = new VButtons({ref: "map-buttons", vertical:false, buttons:[
                    {
                        ref:"threads", type: VButton.TYPES.NEUTRAL, label:"Threads",
                        onClick:event=>{
                            window.vPageContent.showForumThreadList(forum);
                        }
                    }
                ]});
                line = {
                    id: forum.id,
                    title: title.getText(),
                    description: description.getText(),
                    status: status.getValue(),
                    author: forum.author
                };
                lines.push({source:line, cells:[title, description, status, commands]});
            }
            let title = new Span(pageData.title)
                .addClass("forum-title")
            let summary = new Div()
                .addClass("table-display")
                .add(title);
            this.setContent({
                summary,
                columns: ["Title", "Description", "Status", "commands"],
                lines
            });
        });
    }

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

///////////////////////////////////////

export class CBAEditForumThread extends Undoable(VModal) {

    constructor({ref, kind, saveForumThread, deleteForumThread, create, thread}) {
        super({ref, title:"Forum Thread Edition"});
        this.addClass(kind);
        this._title = new VInputField({
            ref:"forum-thread-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "forum-thread-status", label: "Status",
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
            ref:"forum-thread-description-input", label:"Description",
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
                    ref: "save-forum-thread", type: "accept", label: "Save",
                    onClick: event => {
                        if (this.validate()) {
                            let thread = this.thread;
                            if (thread.author) thread.author = thread.author.id;
                            let newComment = thread.comments.newComment;
                            if (newComment) {
                                thread.comments.comments.push({
                                    date: new Date(),
                                    text: newComment,
                                    version: 0
                                });
                            }
                            thread.forum = thread.forum.id;
                            thread.comments = thread.comments.comments;
                            saveForumThread(thread);
                        }
                    }
                },
                {
                    ref: "close-forum-thread", type: "neutral", label: "Close",
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
                    ref: "confirm-forum-thread-deletion",
                    title: "Delete Forum Thread",
                    message: "Do you really want to delete the Forum Thread ?",
                    actionOk: event => deleteForumThread(thread)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("forum-modal");
        this.thread = thread;
    }

    validate() {
        return !this._title.validate()
            & !this._description.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Forum Thread not saved. Do you want to Quit ?")
    }

    get thread() {
        return {
            id: this._thread.id,
            forum: this._thread.forum,
            title: this._title.value,
            description: this._description.value,
            status: this._status.value,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set thread(thread) {
        this._thread = thread;
        this._title.value = thread.title || "";
        this._status.value = thread.status || "prp";
        this._description.value = thread.description || "";
        this._author.value = thread.author;
        this._comments = {
            comments: this._thread.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.thread;
    }

    _recover(thread) {
        if (thread) {
            this._title.value = thread.name;
            this._description.value = thread.description;
            this._status.value = thread.status;
            this._author.value = thread.author;
            this._comments = structuredClone(thread.comments)
        }
    }

    saved(thread) {
        this.thread = thread;
        this._deleteButton.enabled = true;
        showMessage("Forum Thread saved.");
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
            "ref": "forum-thread-comments",
            "kind": "forum-thread-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAForumThreadList extends VTable {

    constructor({loadPage, saveForumThread, saveForumThreadStatus, deleteForumThread}) {
        super({
            ref: "forum-thread-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectForumThread(line)
        });
        this.addClass("forum-thread-list");
        this._loadPage = loadPage;
        this._saveForumThread = saveForumThread;
        this._saveForumThreadStatus = saveForumThreadStatus;
        this._deleteForumThread = deleteForumThread;
    }

    loadForumThreads() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    getForum() {
        return this._forum;
    }

    setForum(forum) {
        this._forum = forum;
        this.loadForumThreads();
        return this;
    }

    selectForumThread(thread) {
        loadForumThread(thread,
            thread=>{
                thread.forum = this._forum;
                let forumThreadEditor = new CBAEditForumThread({
                    title: "Edit Forum Thread",
                    thread,
                    saveForumThread: thread => this._saveForumThread(thread,
                        text => {
                            forumThreadEditor.saved(parseForumThread(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Forum Thread", text);
                        }
                    ),
                    deleteForumThread: thread => this._deleteForumThread(thread,
                        () => {
                            forumThreadEditor.hide();
                            forumThreadEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            forumThreadEditor.confirm.hide();
                            showMessage("Fail to delete Forum Thread", text);
                        }
                    ),
                }).show();
            },

        );

    };

    setPage(page) {
        this._loadPage(this._forum, page, pageData => {
            let lines = [];
            let saveForumThreadStatus = (thread, status) => {
                thread.status = status;
                this._saveForumThreadStatus(thread,
                    () => showMessage("Forum Thread saved."),
                    text => showMessage("Unable to Save Forum Thread.", text),
                );
            }
            for (let thread of pageData.threads) {
                let line;
                let title = new Span(thread.title).addClass("forum-thread-title");
                let description = new P(thread.description).addClass("forum-thread-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(thread.status)
                    .addClass("forum-thread-status")
                    .onChange(event => saveForumThreadStatus(thread, status.getValue()));
                let commands = new VButtons({ref: "map-buttons", vertical:false, buttons:[
                    {
                        ref:"messages", type: VButton.TYPES.NEUTRAL, label:"Messages",
                        onClick:event=>{
                            window.vPageContent.showForumMessageList(thread);
                        }
                    }
                ]});
                line = {
                    id: thread.id,
                    forum: this._forum,
                    title: title.getText(),
                    description: description.getText(),
                    status: status.getValue(),
                    author: thread.author
                };
                lines.push({source:line, cells:[title, description, status, commands]});
            }
            let title = new Span(pageData.title)
                .addClass("forum-thread-title");
            let pageSummary = new Span()
                .addClass("forum-thread-pager")
                .setText(pageData.threadCount ?
                    String.format(CBAForumThreadList.SUMMARY,
                        pageData.threadCount, pageData.firstThread, pageData.lastThread) :
                    CBAForumThreadList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Title", "Description", "Status", "commands"],
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

    static SUMMARY = "Showing {1} to {2} of {0} thread(s)";
    static EMPTY_SUMMARY = "There are no threads to show";
}

export class CBAForumThreadListPage extends Vitamin(Div) {

    constructor({loadPage, saveForumThread, saveForumThreadStatus, deleteForumThread}) {
        super({ref: "forum-thread-list-page"});
        this._buttons = new Div().addClass("forum-threads-buttons");
        this._create = new VButton({
            ref: "forum-thread-create", type: "neutral", label: "Create Forum Thread",
            onClick: event => {
                this._createForumThreadModal = new CBAEditForumThread({
                    title: "Create Forum Thread",
                    create: true,
                    thread: {
                        forum: this._table.getForum(),
                        status: "prp"
                    },
                    saveForumThread: thread => saveForumThread(thread,
                        text => {
                            this._createForumThreadModal.saved(parseForumThread(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Forum Thread", text);
                        }
                    ),
                    deleteForumThread: () => {
                        this._createForumThreadModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._buttons.add(this._create);
        this._table = new CBAForumThreadList({loadPage,
            saveForumThread, saveForumThreadStatus, deleteForumThread});
        this.add(this._buttons).add(this._table);
    }

    get createForumThreadModal() {
        return this._createForumThreadModal;
    }

    setForum(forum) {
        this._table.setForum(forum);
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadForumThreads(forum, pageNo, update) {
    sendGet("/api/forum/thread/all/"+forum.id+"?page="+pageNo,
        (text, status) => {
            requestLog("Load Forum Threads success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Forum Thread List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                threadCount: response.count,
                firstThread: response.page * response.pageSize + 1,
                lastThread: response.page * response.pageSize + response.threads.length,
                threads: response.threads
            });
        },
        (text, status) => {
            requestLog("Load Forum Threads failure: " + text + ": " + status);
            showMessage("Unable to load Forum Threads", text);
        }
    );
}

function parseForumThread(text) {
    let forum = JSON.parse(text);
    for (let comment of forum.comments) {
        comment.date = new Date(comment.date);
    }
    return forum;
}

export function loadForumThread(thread, success) {
    sendGet("/api/forum/thread/load/"+thread.id,
        (text, status) => {
            requestLog("Forum thread success: " + text + ": " + status);
            success(parseForumThread(text));
        },
        (text, status) => {
            requestLog("Load Forum Thread failure: " + text + ": " + status);
            showMessage("Unable to load Forum Thread of Id "+thread.id, text);
        }
    );
}

export function saveForumThread(thread, success, failure) {
    sendPost(thread.id===undefined ? "/api/forum/thread/create" : "/api/forum/thread/update/" + thread.id,
        thread,
        (text, status) => {
            requestLog("Forum Thread saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Thread saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveForumThreadStatus(thread, success, failure) {
    sendPost("/api/forum/thread/update-status/" + thread.id,
        thread,
        (text, status) => {
            requestLog("Forum Thread status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Thread status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteForumThread(thread, success, failure) {
    sendGet("/api/forum/thread/delete/" + thread.id,
        (text, status) => {
            requestLog("Forum Thread delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Thread delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vForumThreadList = new CBAForumThreadListPage({
    loadPage: loadForumThreads,
    deleteForumThread,
    saveForumThread,
    saveForumThreadStatus
});

//////////////////////////////////////////////////////////////////////////////////////

export class CBAForumMessageList extends VTable {

    constructor({loadPage, saveForumMessage, saveForumMessageStatus, deleteForumMessage}) {
        super({
            ref: "forum-message-list",
            changePage: pageIndex => this.setPage(pageIndex)
        });
        this.addClass("forum-message-list");
        this._loadPage = loadPage;
        this._saveForumMessage = saveForumMessage;
        this._deleteForumMessage = deleteForumMessage;
        this._saveForumMessageStatus = saveForumMessageStatus;
    }

    loadForumMessages() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    getThread() {
        return this._thread;
    }

    setThread(thread) {
        this._thread = thread;
        this.loadForumMessages();
        return this;
    }

    setPage(page) {
        this._loadPage(this._thread, page, pageData => {
            let lines = [];
            let saveForumMessageStatus = (message, status) => {
                message.status = status;
                this._saveForumMessageStatus(message,
                    () => showMessage("Forum Thread Message saved."),
                    text => showMessage("Unable to Save Forum Thread Message.", text),
                );
            }
            let deleteForumMessage = message=>{
                this._deleteForumMessage(message,
                    () => {
                        showMessage("Forum Thread Message deleted.")
                        this.refresh();
                    },
                    text => {
                        showMessage("Fail to delete Forum Message", text);
                    }
                );
            }
            for (let message of pageData.messages) {
                let publishedDate = new Span(new Date(message.publishedDate).toLocaleDateString()).addClass("forum-message-text");
                let text = new P(message.text).addClass("forum-message-text");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "arc", text: "Archived"},
                    {value: "blk", text: "Blocked"}
                ])
                    .addClass("form-input-select")
                    .setValue(message.status)
                    .addClass("forum-message-status")
                    .onChange(event => {
                        saveForumMessageStatus(message, status.getValue());
                    });
                let commands = new VButtons({ref: "forum-message-buttons", vertical:false, buttons:[
                    {
                        ref:"delete", type: VButton.TYPES.NEUTRAL, label:"Delete",
                        onClick:event=>{
                            new CBAConfirm().show({
                                ref: "confirm-message-deletion",
                                title: "Delete Message",
                                message: "Do you really want to delete the Message ?",
                                actionOk: event => deleteForumMessage(message)
                            });
                        }
                    }
                ]});
                lines.push({source:message, cells:[publishedDate, text, status, commands]});
            }
            let title = new Span(pageData.title)
                .addClass("forum-message-title");
            let pageSummary = new Span()
                .addClass("forum-message-pager")
                .setText(pageData.messageCount ?
                    String.format(CBAForumMessageList.SUMMARY,
                        pageData.messageCount, pageData.firstMessage, pageData.lastMessage) :
                    CBAForumMessageList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Date", "Text", "Status", "commands"],
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

    static SUMMARY = "Showing {1} to {2} of {0} messages(s)";
    static EMPTY_SUMMARY = "There are no message to show";
}

export class CBAForumMessageListPage extends Vitamin(Div) {

    constructor({loadPage, saveForumMessage, saveForumMessageStatus, deleteForumMessage}) {
        super({ref: "forum-message-list-page"});
        this._table = new CBAForumMessageList({loadPage,
            saveForumMessage, saveForumMessageStatus, deleteForumMessage});
        this.add(this._table);
    }

    setThread(thread) {
        this._table.setThread(thread);
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export var vForumMessageList = new CBAForumMessageListPage({
    loadPage: loadForumMessages,
    deleteForumMessage,
    saveForumMessage,
    saveForumMessageStatus
});

export function loadForumMessages(thread, pageNo, update) {
    sendGet("/api/forum/message/all/"+thread.id+"?page="+pageNo,
        (text, status) => {
            requestLog("Load Forum Messages success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Forum Message List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                messageCount: response.count,
                firstMessage: response.page * response.pageSize + 1,
                lastMessage: response.page * response.pageSize + response.messages.length,
                messages: response.messages
            });
        },
        (text, status) => {
            requestLog("Load Forum Messages failure: " + text + ": " + status);
            showMessage("Unable to load Forum Messages", text);
        }
    );
}

export function saveForumMessage(message, success, failure) {
    sendPost(message.id===undefined ? "/api/forum/message/create" : "/api/forum/message/update/" + message.id,
        message,
        (text, status) => {
            requestLog("Forum Message saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Message saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveForumMessageStatus(message, success, failure) {
    sendPost("/api/forum/message/update-status/" + message.id,
        message,
        (text, status) => {
            requestLog("Forum Message status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Message status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteForumMessage(message, success, failure) {
    sendGet("/api/forum/message/delete/" + message.id,
        (text, status) => {
            requestLog("Forum Message delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Forum Message delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}