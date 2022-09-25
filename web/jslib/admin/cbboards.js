'use strict';

import {
    VSplitterPanel,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Undoable,
    VImage,
    Vitamin, VMagnifiedImage, VMessageHandler, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    VButton,
    VButtons, VDateField,
    VFileLoader,
    VFileLoaderField,
    VFormContainer,
    VInputField, VInputTextArea, VRef,
    VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBConfirm
} from "./cbadministration.js";
import {
    CBUserSelector, loadUsers
} from "./cbuser.js";

export class CBEditBoardPane extends Undoable(VSplitterPanel) {

    constructor({ref, kind, accept, verify, onEdit}) {
        super({ref});
        this.addClass(kind);
        this._imageLoader = new VFileLoaderField({
            ref:"map-image", label:"Image",
            accept, verify,
            magnified: true,
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnLeft(this._imageLoader);
        this._title = new VInputField({
            ref:"map-title-input", label:"Title",
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._description = new VInputTextArea({
            ref:"map-description-input", label:"Description",
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._send = new VButtons({ref: "map-buttons", vertical:false, buttons:[{
                ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                onClick:event=>{
                    this._onEdit();
                }
            }
        ]});
        this.addOnRight(this._send);
        this._onEdit = onEdit;
    }

    canLeave(leave, notLeave) {
        return super.canLeave(leave, notLeave,"Board not saved. Do you want to Quit ?")
    }

    set board(board) {
        this._title.value = board.title;
        this._description.value = board.description;
        this._imageLoader.imageSrc = board.img;
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            title: this._title.value,
            description: this._description.value,
            img: this._imageLoader.imageSrc
        }
    }

    _recover(specification) {
        if (specification) {
            this._title.value = specification.title;
            this._description.value = specification.description;
            this._imageLoader.imageSrc = specification.img;
        }
    }

    openInNewTab(url) {
        window.open(url, '_blank').focus();
    }
}

export class CBEditBoard extends VModal {

    constructor({title, create, board, saveBoard, deleteBoard}) {
        super({"event": "event-form", "title": title});
        this._id = board.id;
        this._boardPane = new CBEditBoardPane({
            ref: "board-editor-pane",
            kind: "board-editor-pane",
            accept: (file)=>{
                if (!VFileLoader.isImage(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            },
            verify: (image)=>{
                if (image.imageWidth!==2046 || image.imageHeight!==3150) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            },
            onEdit: ()=>{
                this._boardPane.openInNewTab("./cb-map-editor.html");
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-event", type: "accept", label: "Save",
                onClick: event => {
                    saveBoard(this.specification);
                }
            },
            {
                ref: "cancel-event", type: "refuse", label: "Cancel",
                onClick: event => {
                    this.hide();
                }
            }]
        });
        if (!create) {
            this._buttons.add(new VButton({
                ref: "delete-event", type: "neutral", label: "Delete",
                onClick: evt => {
                    this.confirm = new CBConfirm().show({
                        ref: "confirm-event-deletion",
                        title: "Delete Event",
                        message: "Do you really want to delete the Event ?",
                        actionOk: evt => deleteBoard(board)
                    });
                }
            }).addClass("right-button"));
        }
        this.addContainer({container: this._boardPane});
        this.addContainer({container: this._buttons});
        this.addClass("board-modal");
    }

    get specification() {
        return {
            id: this._id,
            ...this._boardPane.board
        };
    }

}

export class CBBoardList extends VTable {

    constructor({loadPage, updateBoard, deleteBoard}) {
        super({
            ref: "board-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("board-list");
        this._loadPage = loadPage;
        this._updateBoard = updateBoard;
        this._deleteBoard = deleteBoard;
    }

    set search(search) {
        this._search = search;
    }

    loadBoards() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(pageIndex) {
        function getBoard(line) {
            return {
                id: line.id,
                name: line.name.getText(),
                description: line.description.getText(),
                status: line.status.getValue(),
                icon: line.icon.getSrc(),
                path: line.path
            };
        }

        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let selectBoard = board => {
                let boardEditor = new CBEditBoard({
                    title: "Edit Board",
                    board,
                    saveEvent: board => this._updateBoard(board,
                        eventEditor.imageFiles,
                        () => {
                            boardEditor.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Board", text);
                        }
                    ),
                    deleteEvent: board => this._deleteBoard(event,
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
            };
            let saveBoard = board => this._updateBoard(board, null, null,
                () => showMessage("Board saved."),
                text => showMessage("Unable to Save Board.", text),
            );
            for (let board of pageData.boards) {
                let line;
                let icon = new Img(board.icon).addClass("board-icon")
                    .onMouseClick(event => selectBoard(getBoard(line)));
                let name = new Span(board.name).addClass("board-name")
                    .onMouseClick(event => selectBoard(getBoard(line)));
                let description = new P(board.description).addClass("board-description")
                    .onMouseClick(event => selectBoard(getBoard(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(board.status)
                    .addClass("board-status")
                    .onChange(event => saveBoard(getBoard(line)));
                line = {id: board.id, name, description, icon, status, path:board.path};
                lines.push([icon, name, description, status]);
            }
            let title = new Span(pageData.title)
                .addClass("board-title")
            let pageSummary = new Span()
                .addClass("board-pager")
                .setText(pageData.eventCount ?
                    String.format(CBBoardList.SUMMARY, pageData.boardCount, pageData.firstBoard, pageData.lastBoard) :
                    CBBoardList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Icon", "Name", "Description", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} board(s)";
    static EMPTY_SUMMARY = "There are no board to show";
}

export class CBBoardListPage extends Vitamin(Div) {

    constructor({loadPage, createBoard, updateBoard, deleteBoard}) {
        super({ref: "board-list-page"});
        this._search = new VSearch({
            ref: "board-list-search", searchAction: search => {
                this.loadBoards();
            }
        });
        this._create = new VButton({
            ref: "board-create", type: "neutral", label: "Create Board",
            onClick: event => {
                this._createBoardModal = new CBEditBoard({
                    title: "Create Board",
                    create: true,
                    board: {
                        status: "prp"
                    },
                    saveBoard: board => createBoard(board,
                        this._createBoardModal.path,
                        this._createBoardModal.icon,
                        () => {
                            this._createBoardModal.hide();
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
        this._table = new CBBoardList({loadPage, updateBoard, deleteBoard});
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
            console.log("Load boards success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Boards List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                boardCount: response.count,
                firstEvent: response.page * response.pageSize + 1,
                lastEvent: response.page * response.pageSize + response.boards.length,
                boards: response.boards
            });
        },
        (text, status) => {
            console.log("Load Board failure: " + text + ": " + status);
            showMessage("Unable to load Boards", text);
        }
    );
}

export function createBoard(board, path, icon, success, failure) {
    sendPost("/api/board/create",
        board,
        (text, status) => {
            console.log("Board creation success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Board creation failure: " + text + ": " + status);
            failure(text, status);
        },
        path, icon
    );
}

export function deleteBoard(board, success, failure) {
    sendGet("/api/board/delete/" + board.id,
        (text, status) => {
            console.log("Board delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Board delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function updateBoard(board, path, icon, success, failure) {
    sendPost("/api/board/update/" + board.id,
        board,
        (text, status) => {
            console.log("Board update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Board update failure: " + text + ": " + status);
            failure(text, status);
        },
        path, icon
    );
}

export var vBoardList = new CBBoardListPage({
    loadPage: loadBoards,
    createBoard,
    deleteBoard,
    updateBoard
});