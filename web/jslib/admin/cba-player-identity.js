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
    Undoable,
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons,
    VFileLoaderField,
    VInputField, VInputTextArea, VRef,
    VSelectField
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

export class CBAEditPlayerIdentity extends Undoable(VModal) {

    constructor({ref, create, playerIdentity, savePlayerIdentity, deletePlayerIdentity}) {
        super({ref, title:"Player Identity Edition"});
        this._name = new VInputField({
            ref:"player-identity-name-input", label:"Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._path = new VFileLoaderField({
            ref: "player-identity-path", label: "Path",
            imageSrc: playerIdentity.path,
            validate: mandatory({}),
            accept: file => {
                if (!isImageFile(file)) {
                    this._path.message = "The image must be a PNG or JPEG file of size > (354 x 354) pixels.";
                    return false;
                }
                this._path.message = "";
                return true;
            },
            verify: image => {
                if (image.imageHeight !== 354 || image.imageWidth !== 354) {
                    this._path.message = "The image must be a PNG or JPEG file of size > (354 x 354) pixels.";
                    return false;
                }
                this._path.message = "";
                return true;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "player-identity-status", label: "Status",
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
        let pathContainer = new VContainer({columns:2})
            .addField({field:this._path, column:0})
            .addField({field:this._name, column:1})
            .addField({field:this._status, column:1});
        this.add(pathContainer);
        this._description = new VInputTextArea({
            ref:"player-identity-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:4995})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._description);
        let userSelector = new CBAUserSelector({
            title:"Select Player Identity Author",
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
                    ref: "save-player-identity", type: "accept", label: "Save",
                    onClick: event => {
                        if (this.validate()) {
                            let playerIdentity = this.playerIdentity;
                            let newComment = playerIdentity.comments.newComment;
                            if (newComment) {
                                playerIdentity.comments.comments.push({
                                    date: new Date(),
                                    text: newComment,
                                    version: 0
                                });
                            }
                            playerIdentity.comments = playerIdentity.comments.comments;
                            savePlayerIdentity(playerIdentity);
                        }
                    }
                },
                {
                    ref: "close-player-identity", type: "neutral", label: "Close",
                    onClick: event => {
                        this.tryToLeave(() => {
                            this.hide();
                        });
                    }
                }
            ]
        });
        this._deleteButton = new VButton({
            ref: "delete-player-identity", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-player-identity-deletion",
                    title: "Delete Player Identity",
                    message: "Do you really want to delete the Player Identity ?",
                    actionOk: event => deletePlayerIdentity(playerIdentity)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("player-identity-modal");
        this.playerIdentity = playerIdentity;
    }

    validate() {
        return !this._name.validate()
            & !this._path.validate()
            & !this._description.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Player Identity not saved. Do you want to Quit ?")
    }

    get playerIdentity() {
        return {
            id: this._playerIdentity.id,
            name: this._name.value,
            description: this._description.value,
            path: this._path.imageSrc,
            status: this._status.value,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set playerIdentity(playerIdentity) {
        this._playerIdentity = playerIdentity;
        this._name.value = playerIdentity.name || "";
        this._path.imageSrc = playerIdentity.path || "";
        this._status.value = playerIdentity.status || "prp";
        this._description.value = playerIdentity.description || "";
        this._author.value = playerIdentity.author;
        this._comments = {
            comments: this._playerIdentity.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.playerIdentity;
    }

    _recover(playerIdentity) {
        if (playerIdentity) {
            this._name.value = playerIdentity.name;
            this._path.imageSrc = playerIdentity.path;
            this._description.value = playerIdentity.description;
            this._status.value = playerIdentity.status;
            this._author.value = playerIdentity.author;
            this._comments = structuredClone(playerIdentity.comments)
        }
    }

    saved(playerIdentity) {
        this.playerIdentity = playerIdentity;
        this._deleteButton.enabled = true;
        showMessage("Player Identity saved.");
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
            "ref": "player-identity-comments",
            "kind": "player-identity-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAPlayerIdentityList extends VTable {

    constructor({loadPage, savePlayerIdentity, savePlayerIdentityStatus, deletePlayerIdentity}) {
        super({
            ref: "player-identity-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectPlayerIdentity(line)
        });
        this.addClass("player-identity-list");
        this._loadPage = loadPage;
        this._savePlayerIdentity = savePlayerIdentity;
        this._savePlayerIdentityStatus = savePlayerIdentityStatus;
        this._deletePlayerIdentity = deletePlayerIdentity;
    }

    set search(search) {
        this._search = search;
    }

    loadPlayerIdentities() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectPlayerIdentity(playerIdentity) {
        loadPlayerIdentity(playerIdentity,
            playerIdentity=>{
                let playerIdentityEditor = new CBAEditPlayerIdentity({
                    title: "Edit Player Identity",
                    playerIdentity,
                    savePlayerIdentity: playerIdentity => this._savePlayerIdentity(playerIdentity,
                        playerIdentityEditor.pathFiles,
                        () => {
                            playerIdentityEditor.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Player Identity", text);
                        }
                    ),
                    deletePlayerIdentity: event => this._deletePlayerIdentity(playerIdentity,
                        () => {
                            playerIdentityEditor.hide();
                            playerIdentityEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            playerIdentityEditor.confirm.hide();
                            showMessage("Fail to delete Player Identity", text);
                        }
                    ),
                }).show();
            }
        );
    }

    setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let savePlayerIdentityStatus = (playerIdentity, status) => {
                playerIdentity.status = status;
                this._savePlayerIdentityStatus(playerIdentity,
                    () => showMessage("Player Identity saved."),
                    text => showMessage("Unable to Save Player Identity.", text),
                );
            }
            for (let playerIdentity of pageData.playerIdentities) {
                let name = new Span(playerIdentity.name).addClass("player-identity-name");
                let path =new Img(playerIdentity.path).addClass("player-identity-path");
                let description = new P(playerIdentity.description).addClass("player-identity-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(playerIdentity.status)
                    .addClass("player-identity-status")
                    .onChange(evt => savePlayerIdentityStatus(playerIdentity, status.getValue()));
                lines.push({source:playerIdentity, cells:[name, path, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("player-identity-title")
            let pageSummary = new Span()
                .addClass("player-identity-pager")
                .setText(pageData.playerIdentityCount ?
                    String.format(CBAPlayerIdentityList.SUMMARY, pageData.playerIdentityCount, pageData.firstPlayerIdentity, pageData.lastPlayerIdentity) :
                    CBAPlayerIdentityList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Name", "Path", "Description", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} player identity(ies)";
    static EMPTY_SUMMARY = "There are no player identity to show";
}

export class CBAPlayerIdentityListPage extends Vitamin(Div) {

    constructor({loadPage, savePlayerIdentity, savePlayerIdentityStatus, deletePlayerIdentity}) {
        super({ref: "player-identity-list-page"});
        this._search = new VSearch({
            ref: "player-identity-list-search", searchAction: search => {
                this.loadPlayerIdentities();
            }
        });
        this._create = new VButton({
            ref: "event-create", type: "neutral", label: "Create Player Identity",
            onClick: event => {
                this._createPlayerIdentityModal = new CBAEditPlayerIdentity({
                    title: "Create Player Identity",
                    create: true,
                    playerIdentity: {
                        status: "prp"
                    },
                    savePlayerIdentity: playerIdentity => savePlayerIdentity(playerIdentity,
                        this._createPlayerIdentityModal.pathFiles,
                        () => {
                            this._createPlayerIdentityModal.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Player Identity", text);
                        }
                    ),
                    deletePlayerIdentity: () => {
                        this._createPlayerIdentityModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAPlayerIdentityList({loadPage, savePlayerIdentity, savePlayerIdentityStatus, deletePlayerIdentity});
        this.add(this._search).add(this._table);
    }

    get createPlayerIdentityModal() {
        return this._createPlayerIdentityModal;
    }

    loadPlayerIdentities() {
        this._table.search = this._search.value;
        this._table.loadPlayerIdentities();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

function parsePlayerIdentity(text) {
    let forum = JSON.parse(text);
    for (let comment of forum.comments) {
        comment.date = new Date(comment.date);
    }
    return forum;
}

export function loadPlayerIdentity(playerIdentity, success) {
    sendGet("/api/player-identity/load/"+playerIdentity.id,
        (text, status) => {
            requestLog("Load Player Identity success: " + text + ": " + status);
            success(parsePlayerIdentity(text));
        },
        (text, status) => {
            requestLog("Load Player Identity failure: " + text + ": " + status);
            showMessage("Unable to load Player Identity of Id "+playerIdentity.id, text);
        }
    );
}

export function loadPlayerIdentities(pageIndex, search, update) {
    sendGet("/api/player-identity/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load player identities success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Player Identity List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                playerIdentityCount: response.count,
                firstPlayerIdentity: response.page * response.pageSize + 1,
                lastPlayerIdentity: response.page * response.pageSize + response.playerIdentities.length,
                playerIdentities: response.playerIdentities
            });
        },
        (text, status) => {
            requestLog("Load Player Identity failure: " + text + ": " + status);
            showMessage("Unable to load Player Identities", text);
        }
    );
}

export function deletePlayerIdentity(playerIdentity, success, failure) {
    sendGet("/api/player-identity/delete/" + playerIdentity.id,
        (text, status) => {
            requestLog("Player Identity delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Player Identity delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function savePlayerIdentity(playerIdentity, path, success, failure) {
    sendPost(playerIdentity.id===undefined ? "/api/player-identity/create" : "/api/player-identity/update/" + playerIdentity.id,
        playerIdentity,
        (text, status) => {
            requestLog("Player Identity saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Player Identity saving failure: " + text + ": " + status);
            failure(text, status);
        },
        path
    );
}

export function savePlayerIdentityStatus(playerIdentity, success, failure) {
    sendPost("/api/player-identity/update-status/" + playerIdentity.id,
        playerIdentity,
        (text, status) => {
            requestLog("Player Identity status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Player Identity status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vPlayerIdentityList = new CBAPlayerIdentityListPage({
    loadPage: loadPlayerIdentities,
    deletePlayerIdentity,
    savePlayerIdentity,
    savePlayerIdentityStatus
});