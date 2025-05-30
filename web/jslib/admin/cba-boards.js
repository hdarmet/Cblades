'use strict';

import {
    VContainer,
    VSplitterPanel,
    VTable
} from "../vitamin/vcontainer.js";
import {
    sendGet, sendPost
} from "../board/draw.js";
import {
    Div, Img, isImageFile, P, requestLog, Select, Span
} from "../vitamin/components.js";
import {
    Undoable,
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

export class CBAEditBoardPane extends Undoable(VSplitterPanel) {

    constructor({ref, kind, create, board, accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._path = new VFileLoaderField({
            ref:"board-path", label:"Image",
            validate: mandatory({}),
            accept, verify,
            magnified: true,
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnLeft(this._path);
        this._name = new VInputField({
            ref:"board-name-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:20})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "board-status", label: "Status",
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
        let nameContainer = new VContainer({columns:2}).addField({field:this._name}).addField({field:this._status});
        this.addOnRight(nameContainer);
        this._description = new VInputTextArea({
            ref:"board-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        let userSelector = new CBAUserSelector({title:"Select Board Account", loadPage:loadUsers, selectUser: user=>{
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
                ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                onClick:event=>{
                    window.open("./cb-board-editor.html?id="+this._board.id, '_blank').focus();
                }
            },
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            }
        ]});
        this._buttons.get("edit").enabled = !create;
        this.addOnRight(this._buttons);
        this.board = board;
    }

    validate() {
        return !this._path.validate()
            & !this._name.validate()
            & !this._description.validate()
            & !this._status.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Board not saved. Do you want to Quit ?")
    }

    get board() {
        return {
            name: this._name.value,
            status: this._status.value,
            description: this._description.value,
            path: this._path.imageSrc,
            icon: this._board.icon || "icon",
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set board(board) {
        this._board = board;
        this._name.value = board.name || "";
        this._status.value = board.status || "prp";
        this._description.value = board.description || "";
        this._path.imageSrc = board.path || "";
        this._icon = board.icon || "",
        this._author.value = board.author;
        this._comments = {
            comments: this._board.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.board;
    }

    _recover(specification) {
        if (specification) {
            this._name.value = specification.name;
            this._status.value = specification.status;
            this._description.value = specification.description;
            this._path.imageSrc = specification.path;
            this._author.value = specification.author;
            this._icon = specification.icon;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(board) {
        this.board = board;
        this._buttons.get("edit").enabled = true;
        this._clean();
        this._memorize();
        return true;
    }

    set comments(comments) {
        this._comments = comments;
        this._memorize();
    }

    get boardImage()  {
        return this._path.files ? this._path.files[0] : undefined;
    }

    get iconImage()  {
        return this._path.getImageFile("icon.png", 205, 315);
    }

    onComments() {
        new CBAEditComments({
            "ref": "board-comments",
            "kind": "board-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAEditBoard extends VModal {

    constructor({title, create, board, saveBoard, deleteBoard}) {
        super({ref:"edit-board-modal", title});
        this._id = board.id;
        this._boardPane = new CBAEditBoardPane({
            ref: "board-editor-pane",
            kind: "board-editor-pane",
            board,
            create,
            accept: file=>{
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            },
            verify: image=>{
                if (image.imageWidth!==2046 || image.imageHeight!==3150) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-board", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let board = this.specification;
                        let newComment = board.comments.newComment;
                        if (newComment) {
                            board.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        board.comments = board.comments.comments;
                        saveBoard(board);
                    }
                }
            },
            {
                ref: "close-board", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-event", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-board-deletion",
                    title: "Delete Board",
                    message: "Do you really want to delete the Board ?",
                    actionOk: event => deleteBoard(board)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._boardPane);
        this.add(this._buttons);
        this.addClass("board-modal");
    }

    validate() {
        return this._boardPane.validate();
    }

    tryToLeave(leave, notLeave) {
        return this._boardPane.tryToLeave(leave, notLeave);
    }

    saved(board) {
        this._boardPane.saved(board);
        this._id = board.id;
        this._deleteButton.enabled = true;
        showMessage("Board saved.");
        return true;
    }

    get imageFiles() {
        return this.boardImage ?
            [
                {key: "path", file: this.boardImage},
                {key: "icon", file: this.iconImage}
            ] :
            [];
    }

    get boardImage()  {
        return this._boardPane.boardImage;
    }

    get iconImage()  {
        return this._boardPane.iconImage;
    }

    get specification() {
        return {
            id: this._id,
            ...this._boardPane.board
        };
    }

}

export class CBABoardList extends VTable {

    constructor({loadPage, saveBoard, saveBoardStatus, deleteBoard}) {
        super({
            ref: "board-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectBoard(line)
        });
        this.addClass("board-list");
        this._loadPage = loadPage;
        this._saveBoard = saveBoard;
        this._saveBoardStatus = saveBoardStatus;
        this._deleteBoard = deleteBoard;
    }

    set search(search) {
        this._search = search;
    }

    loadBoards() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectBoard(board) {
        loadBoard(board,
            board=>{
                let boardEditor = new CBAEditBoard({
                    title: "Edit Board",
                    board,
                    saveBoard: board => this._saveBoard(board,
                        boardEditor.imageFiles,
                        text => {
                            boardEditor.saved(parseBoard(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Board", text);
                        }
                    ),
                    deleteBoard: board => this._deleteBoard(board,
                        () => {
                            boardEditor.hide();
                            boardEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            boardEditor.confirm.hide();
                            showMessage("Fail to delete Board", text);
                        }
                    ),
                }).show();
            },

        );

    };

    setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveBoardStatus = (board, status) => {
                board.status = status;
                this._saveBoardStatus(board,
                    () => showMessage("Board saved."),
                    text => showMessage("Unable to Save Board.", text),
                );
            }
            for (let board of pageData.boards) {
                let icon = new Img(board.icon).addClass("board-icon");
                let name = new Span(board.name).addClass("board-name");
                let description = new P(board.description).addClass("board-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(board.status)
                    .addClass("board-status")
                    .onChange(event => saveBoardStatus(board, status.getValue()));
                lines.push({source:board, cells:[icon, name, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("board-title")
            let pageSummary = new Span()
                .addClass("board-pager")
                .setText(pageData.boardCount ?
                    String.format(CBABoardList.SUMMARY, pageData.boardCount, pageData.firstBoard, pageData.lastBoard) :
                    CBABoardList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Icon", "Name", "Description", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} board(s)";
    static EMPTY_SUMMARY = "There are no board to show";
}

export class CBABoardListPage extends Vitamin(Div) {

    constructor({loadPage, saveBoard, saveBoardStatus, deleteBoard}) {
        super({ref: "board-list-page"});
        this._search = new VSearch({
            ref: "board-list-search", searchAction: search => {
                this.loadBoards();
            }
        });
        this._create = new VButton({
            ref: "board-create", type: "neutral", label: "Create Board",
            onClick: event => {
                this._createBoardModal = new CBAEditBoard({
                    title: "Create Board",
                    create: true,
                    board: {
                        status: "prp"
                    },
                    saveBoard: board => saveBoard(board,
                        this._createBoardModal.imageFiles,
                        text => {
                            this._createBoardModal.saved(parseBoard(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Board", text);
                        }
                    ),
                    deleteBoard: () => {
                        this._createBoardModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBABoardList({loadPage, saveBoard, saveBoardStatus, deleteBoard});
        this.add(this._search).add(this._table);
    }

    get createBoardModal() {
        return this._createBoardModal;
    }

    loadBoards() {
        this._table.search = this._search.value;
        this._table.loadBoards();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadBoards(pageIndex, search, update) {
    sendGet("/api/board/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load boards success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Boards List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                boardCount: response.count,
                firstBoard: response.page * response.pageSize + 1,
                lastBoard: response.page * response.pageSize + response.boards.length,
                boards: response.boards
            });
        },
        (text, status) => {
            requestLog("Load Board failure: " + text + ": " + status);
            showMessage("Unable to load Boards", text);
        }
    );
}

function parseBoard(text) {
    let board = JSON.parse(text);
    for (let comment of board.comments) {
        comment.date = new Date(comment.date);
    }
    return board;
}

export function loadBoard(board, success) {
    sendGet("/api/board/load/"+board.id,
        (text, status) => {
            requestLog("Board load success: " + text + ": " + status);
            success(parseBoard(text));
        },
        (text, status) => {
            requestLog("Load Board failure: " + text + ": " + status);
            showMessage("Unable to load Board of Id "+board.id, text);
        }
    );
}

export function saveBoard(board, images, success, failure) {
    sendPost(board.id===undefined ? "/api/board/create" : "/api/board/update/" + board.id,
        board,
        (text, status) => {
            requestLog("Board saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Board saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveBoardStatus(board, success, failure) {
    sendPost("/api/board/update-status/" + board.id,
        board,
        (text, status) => {
            requestLog("Board status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Board status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteBoard(board, success, failure) {
    sendGet("/api/board/delete/" + board.id,
        (text, status) => {
            requestLog("Board delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Board delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vBoardList = new CBABoardListPage({
    loadPage: loadBoards,
    deleteBoard,
    saveBoard,
    saveBoardStatus
});