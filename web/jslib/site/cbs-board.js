import {
    download,
    Undoable, Vitamin, VMagnifiedImage, VMessageHandler
} from "../vitamin/vitamins.js";
import {
    sendGet, sendPost
} from "../board/draw.js";
import {
    Div, isImageFile, P, requestLog
} from "../vitamin/components.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    mandatory, range,
    VButton, VButtons, VFileLoaderField, VInputField, VInputTextArea
} from "../vitamin/vforms.js";
import {
    CBSEditComments
} from "./cbs-comment.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSGallery
} from "./cbs-container.js";
import {
    CBSFormContainer
} from "./cbs-widgets.js";

export class CBSBoard extends Vitamin(Div) {

    constructor({board, action}) {
        super({ref:"board-"+board.id});
        this.addClass("board");
        this._image = new VMagnifiedImage({ref:this.ref+"-image", kind:"board-image"});
        this.add(this._image);
        this._name = new P().addClass("board-name");
        this.add(this._name);
        this._description = new P().addClass("board-description");
        this.add(this._description);
        this.specification = board;
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

    get image() {
        return this._image ? this._image.src : null;
    }

    set image(img) {
        this._image.setSrc(img);
    }

    get specification() {
        return {
            id: this._id,
            icon: this._icon,
            path: this._image ? this._image.zoomSrc : null,
            name: this._name.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._id = specification.id;
        this._name.setText(specification.name);
        this._description.setText(specification.description);
        this._image.setSrc(specification.path);
        this._image.setZoomSrc(specification.path);
        this._icon = specification.icon;
    }

}

export class CBSBoardEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="board-editor", board={}}) {
        super({ref});
        this.addClass(kind);
        this._path = new VFileLoaderField({
            ref:"board-path", label:"Image",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==2046 || image.imageHeight!==3150) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
                    return false;
                }
                return true;
            },
            magnified: true,
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnLeft(this._path);
        this._name = new VInputField({
            ref:"board-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:20})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._name);
        this._description = new VInputTextArea({
            ref:"board-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._buttons = new VButtons({ref: "board-buttons", vertical:false, buttons:[
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
            },
            {
                ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                onClick:event=>{
                    if (this.validate()) {
                        let board = this.board;
                        if (board.comments.newComment) {
                            board.newComment = board.comments.newComment;
                        }
                        delete board.comments;
                        this.saveBoard(board);
                    }
                }
            }
        ]});
        this.addOnRight(this._buttons);
        this.board = board;
    }

    saveBoard(board) {
        saveProposedBoard(board,
            this.imageFiles,
            text => {
                this.saved(parseBoard(text));
            },
            text => {
                showMessage("Fail to update Board", text);
            }
        );
    }

    validate() {
        return !this._path.validate()
             & !this._name.validate()
             & !this._description.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Board not saved. Do you want to Quit ?")
    }

    get board() {
        this._board = {
            id: this._board.id,
            name: this._name.value,
            description: this._description.value,
            path: this._path.imageSrc,
            icon: this._board.icon || "icon",
            comments: structuredClone(this._comments)
        }
        return this._board;
    }

    set board(board) {
        this._board = board;
        this._name.value = board.name || "";
        this._description.value = board.description || "";
        this._path.imageSrc = board.path || "";
        this._comments = {
            comments: this._board.comments || [],
            newComment: ""
        }
        this._buttons.get("edit").enabled = board.id !== undefined;
        this._clean();
        this._memorize();
    }

    _register() {
        return this.board;
    }

    _recover(specification) {
        if (specification) {
            this._name.value = specification.name;
            this._description.value = specification.description;
            this._path.imageSrc = specification.path;
            this._icon = specification.icon;
            this._comments = structuredClone(specification.comments);
        }
    }

    set comments(comments) {
        this._comments = structuredClone(comments);
        this._memorize();
    }

    onComments() {
        new CBSEditComments({
            "ref": "board-comments",
            "kind": "board-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    saved(board) {
        this._board.id = board.id;
        this._comments = {
            comments: board.comments || [],
            newComment: ""
        }
        this._buttons.get("edit").enabled = true;
        showMessage("Board saved.");
        this._clean();
        this._memorize();
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
        return this._path.files ? this._path.files[0] : undefined;
    }

    get iconImage()  {
        return this._path.getImageFile("icon.png", 205, 315);
    }

}

function parseBoard(text) {
    let board = JSON.parse(text);
    for (let comment of board.comments) {
        comment.date = new Date(comment.date);
    }
    return board;
}

export var vBoardsGallery = new CBSGallery({ref:"boards", kind: "gallery-maps"});

export var vBoardEditor = new CBSBoardEditor({
    ref:"board-editor"
});

export var vBoardEditorPage = new CBSFormContainer({ref:"board-editor-page", editor:vBoardEditor});

export function loadBoards(success) {
    sendGet("/api/board/live",
        (text, status)=>{
            vBoardsGallery.clearCards();
            let maps = JSON.parse(text);
            for (let map of maps) {
                vBoardsGallery.addCard({
                    ref: "map-"+map.id,
                    image: new VMagnifiedImage({
                        ref: `img-map-${map.id}`,
                        img: map.icon,
                        zoomImg: map.path,
                        width: "90%"
                    }),
                    title: map.name,
                    description: map.description,
                    button: "Download", action: event => {
                        download(map.path);
                    }
                });
            }
            success();
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Maps: "+text);
        }
    );
}

export function loadProposedBoard(board, success) {
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

export function saveProposedBoard(board, images, success, failure) {
    sendPost(board.id===undefined ? "/api/board/propose" : "/api/board/amend/" + board.id,
        board,
        (text, status) => {
            requestLog("Board proposal success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Board proposal failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}