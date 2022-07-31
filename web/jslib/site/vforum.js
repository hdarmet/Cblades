'use strict'

import {
    Vitamin, VModal
} from "./vitamins.js";
import {
    VContainer,
    VTable, VTabSet
} from "./vcontainer.js";
import {
    Div, Img, P, I, Span, replaceSelectedText, Blockquote, Input
} from "./components.js";
import {
    VButtons,
    VFormContainer,
    VInputField,
    VInputTextArea, VSelectField
} from "./vforms.js";

export class VForumThreadComments extends VTable {

    constructor({loadPage, insertQuote}) {
        super({ref:"forum-thread-comments",
            changePage: pageIndex=>this._change(pageIndex)
        });
        this._loadPage = loadPage;
        this._insertQuote = insertQuote;
        this._init();
    }

    _init() {
        this._change(0);
    }

    _change(index) {
        this._loadPage(index, page=> {
            let lines = [];
            this._reportModal = new VForumReport();
            for (let comment of page.comments) {
                let icon = new Div().add(new Img(comment.avatarImage)).addClass("avatar-image");
                let identity = new Div().add(new P(comment.avatarIdentity)).addClass("avatar-identity");
                let level = new Div().add(new P(comment.avatarLevel)).addClass("avatar-level");
                let commentCounts = new Div().add(new P('<i class="fa fa-comment"></i>'+comment.avatarCommentCount)).addClass("avatar-comment-count");
                let avatar = new Div().addClass("avatar")
                    .add(icon)
                    .add(identity)
                    .add(level)
                    .add(commentCounts);
                let commentDate= new Div().add(new P("Posted on "+comment.date.toLocaleDateString())).addClass("comment-date");
                let commentText = new Div().add(new P(comment.comment)).addClass("comment-text");
                let likes = new P(comment.likes).addClass("like-comment-count").onMouseClick(event=>console.log("liked"))
                let heart = new I("heart").addClass("like-comment").onMouseClick(event=>console.log("liked"))
                let clickOnLike = ()=>{
                    comment.likes += comment.liked ? -1 : 1;
                    comment.liked = !comment.liked;
                    likes.setText(comment.likes);
                    heart.removeClass(comment.liked ? "comment-not-liked" : "comment-liked");
                    heart.addClass(comment.liked ? "comment-liked" : "comment-not-liked");
                }
                likes.onMouseClick(clickOnLike)
                heart.onMouseClick(clickOnLike)
                heart.addClass(comment.liked ? "comment-liked" : "comment-not-liked");
                let commentCommands = new Div()
                    .add(heart)
                    .add(likes)
                    .add(new P("Reply").addClass("quote-comment").onMouseClick(event=>console.log("replied")))
                    .add(new P("Quote").addClass("quote-comment").onMouseClick(event=>{
                        this._insertQuote(`<p class='cite'>${comment.avatarIdentity} wrote: </p>${commentText.getInnerHTML()}`);
                    }))
                    .add(new P("Report").addClass("quote-comment").onMouseClick(event=>{
                        this._reportModal.show();
                    }))
                    .addClass("comment-commands");
                let commentContent = new Div().addClass("comment-content")
                    .add(commentDate)
                    .add(commentText)
                    .add(commentCommands)
                lines.push([avatar, commentContent]);
            }
            this._currentPage = page.currentPage;
            let title = new Span(page.title)
                .addClass("thread-title")
            let pageSummary = new Span()
                .addClass("thread-pager")
                .setText(String.format(VForumThreadComments.SUMMARY, page.commentCount, page.firstComment, page.lastComment));
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                data: lines
            });
            let first = page.pageCount<=5 ? 0 : page.currentPage-2;
            if (first<0) first = 0;
            let last = page.pageCount<=5 ? page.pageCount-1 : page.currentPage+2;
            if (last>=page.pageCount) last=page.pageCount-1;
            this.setPagination({
                first, last, current:page.currentPage
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} comments";
}

export class EmojiPreference extends Vitamin(Div) {
    constructor({ref, icons =[]}) {
        super({ref});
        this.addClass("emoji-preferences");
        this._icons =icons;
        this._showIcons();
    }

    _createIcon(icon) {
        return new Span("&#x" + icon.toString(16))
            .addClass("emoji-icon")
            .onMouseClick(event => {
                    this.parent.parent.insertText(String.fromCodePoint(icon));
                }
            )
    }

    _showIcons() {
        this.clear();
        for (let icon of this._icons) {
            this.add(this._createIcon(icon));
        }
    }

    registerEmoji(icon) {
        if (this._icons.indexOf(icon)>=0) {
            this._icons.splice(this._icons.indexOf(icon), 1);
        }
        this._icons.unshift(icon);
        if (this._icons.length > 5) this._icons.pop();
        this._showIcons();
    }
}

export class EmojiCatalog extends Vitamin(Div) {

    constructor({ref, icons, pickAction}) {
        super({ref});
        this.addClass("emoji-catalog");
        for (let iconSuite of icons) {
            for (let icon=iconSuite.from; icon<=iconSuite.to; icon++) {
                this.add(new Span("&#x"+icon.toString(16))
                    .addClass("emoji-icon")
                    .onMouseClick(event=>{
                        this.parent.parent.insertText(String.fromCodePoint(icon));
                        pickAction&pickAction(icon);
                    })
                );
            }
        }
    }
}

export class VForumPostEditor extends VContainer {

    constructor({send}) {
        super({ref: "forum-editor", columns: 1});
        this.addClass("forum-thread-post-editor");
        this._send = new Div().setText("Send Post").addClass("forum-send-command").onMouseClick(
            event=>send({content:this._post.value})
        );
        this.add(this._send);
        this._link = new VInputField({
            ref:"post-link", label:"Link"
        });
        this._post = new VInputTextArea({
            ref:"post-input", label:"Your Post", link: text=>{
                document.execCommand('insertHTML', false, `<a href="${this._link.value}" target="_blank">${text}</a>`);
            }
        });
        this.add(this._post).add(this._link);
        this._emojiPreferences = new EmojiPreference({ref:"forum-emoji", icons:[0x1f600, 0x1f601, 0x1f602, 0x1f603, 0x1f604]});
        this._emojiPicker = new VTabSet({ref:"forum-emoji", kind:"forum-emoji", tabs:[
            {
                tab: "&#x1f600;",
                content: new EmojiCatalog({ref:"catalog-emoji", icons:[{from:0x1f600, to:0x1f64f}],
                    pickAction:icon=>this._emojiPreferences.registerEmoji(icon)})
            },
            {
                tab: "&#x1f435;",
                content: new EmojiCatalog({ref:"catalog-animals", icons:[{from:0x1f400, to:0x1f43d}],
                    pickAction:icon=>this._emojiPreferences.registerEmoji(icon)})
            },
            {
                tab: "&#x1f466;",
                content: new EmojiCatalog({ref:"catalog-characters", icons:[{from:0x1f464, to:0x1f483}],
                    pickAction:icon=>this._emojiPreferences.registerEmoji(icon)})
            }
        ]});
        this._emojiPicker.tabBar.add(this._emojiPreferences);
        this.add(this._emojiPicker);
    }

    insertText(text) {
        replaceSelectedText(this._post._input.root, document.createTextNode(text));
    }

    insertQuote(text) {
        replaceSelectedText(this._post._input.root, new Blockquote(text).root);
    }
}

export class VForumThread extends VContainer {

    constructor({loadPage, send}) {
        super({ref: "forum-thread", columns: 1});
        this.addClass("forum-thread");
        this._editPost = new VForumPostEditor({send});
        this._comments = new VForumThreadComments({loadPage, insertQuote:text=>{
            this._editPost.insertQuote(text);
        }});
        this.add(this._comments).add(this._editPost);
    }
}

export class VForumReport extends VModal {

    constructor() {
        super({ref: VForumReport.REPORT_REF, title: VForumReport.REPORT_TITLE});
        this._reason = new VSelectField({ref:"reason", label:"Reason",
            options: [
                {ref: "reason-rude", value: "rude", text:"Le propos est injurieux ou offensant."},
                {ref: "reason-off-topic", value: "off-topic", text:"Le propos est hors sujet."}
            ]
        });
        this._message = new VInputTextArea({ref:"contact-message", label:"Message"});
        this.addContainer({
            ref: "report-message",
            container: new VFormContainer({columns: 1})
                .addField({field: this._reason})
                .addField({field: this._message})
                .addField({
                    field: new VButtons({
                        ref: "buttons", buttons: [
                            {
                                ref: "send-message", type: "accept", label: "Send",
                                onClick: event => {
                                    console.log("Validate");
                                    this.hide();
                                }
                            }
                        ]
                    })
                })
            }
        );
    }

    static REPORT_REF = "forum-report";
    static REPORT_TITLE = "Report";
}
