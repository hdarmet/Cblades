'use strict';

import {
    Undoable, VModal
} from "../vitamin/vitamins.js";
import {
    VContainer
} from "../vitamin/vcontainer.js";
import {
    VButtons, VInputTextArea
} from "../vitamin/vforms.js";
import {
    Div, Img, P, Span
} from "../vitamin/components.js";

export class CBAEditComments extends Undoable(VModal) {

    constructor({ref, kind, comments, acknowledge}) {
        super({ref, title:"Comments"});
        this.addClass(kind).addClass("comments-editor");
        this._commentsList = new VContainer({ref:"comments-editor"});
        this._newComment = new VInputTextArea({
            ref:"board-new-comment-input", label:"New Comment",
            onChange: event=>{
                this._memorize();
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-comment", type: "accept", label: "Ok",
                onClick: event => {
                    acknowledge(this.comments);
                    this.hide();
                }
            },
                {
                    ref: "cancel-comment", type: "refuse", label: "Cancel",
                    onClick: event => {
                        this.hide();
                    }
                }]
        });
        this.add(this._commentsList).add(this._newComment).add(this._buttons);
        this.comments = comments;
    }

    get comments() {
        return {
            comments: structuredClone(this._comments),
            newComment: this._newComment.value
        }
    }

    set comments(comments) {
        this._recover(comments);
        this._clean();
        this._memorize();
    }

    _register() {
        return this.comments;
    }

    _recover(memento) {
        this._comments = structuredClone(memento.comments);
        this._newComment.value = memento.newComment;
        this._commentsList.clearFields();
        for (let comment of this._comments) {
            this.addComment(comment);
        }
    }

    addComment(comment) {
        let commentField =  new Div().add(
            new Div().add(
                new Span(comment.date.toLocaleDateString()).addClass("comment-date")
            ).add(
                new Img("./../images/site/buttons/cross.png")
                    .addClass("comment-remove")
                    .onMouseClick(event=>{
                            this._comments.remove(commentField._comment);
                            this._commentsList.removeField({field: commentField});
                            this._memorize();
                        }
                    )
            )
        ).add(
            new P(comment.text).addClass("comment-text")
        );
        commentField._comment = comment;
        this._commentsList.addField({
            field: commentField
        });
    }

}
