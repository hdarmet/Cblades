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
    }

    _change(index) {
        this._loadPage(index, page=> {
            let lines = [];
            !this._reportModal && (this._reportModal = new VForumReport());
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

    getThread() {
        return this._thread;
    }

    setThread(thread) {
        this._thread = thread;
        this._change(0);
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

    setThread(thread) {
        this._comments.setThread(thread);
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


export class VForumsList extends VTable {

    constructor({loadForums, selectForum}) {
        super({ref:"forums-list",
            select: selectForum
        });
        loadForums(forums=> {
            let lines = [];
            for (let forum of forums.forums) {
                let forumTitle = new Div().add(new P(forum.title)).addClass("forum-comment-title");
                let forumComment = new Div().add(new P(forum.comment)).addClass("forum-comment-text");
                let forumContent = new Div().addClass("forum-content")
                    .add(forumTitle)
                    .add(forumComment);
                let forumThreadsCount = new Span(forum.threads).addClass("forum-threads-count");
                let forumRepliesCount = new Span(forum.replies).addClass("forum-replies-count");
                let forumStats = new Div().addClass("forum-stats")
                    .add(new I("comment").setAlt("threads"))
                    .add(forumThreadsCount)
                    .add(new Span(" /"))
                    .add(new I("comments").setAlt("replies"))
                    .add(forumRepliesCount);
                let forumLastCommentDate = new Div()
                    .add(new Span("Last post on ").addClass("forum-comment-post"))
                    .add(new Span(forum.lastCommentDate.toLocaleDateString()).addClass("forum-comment-date"));
                let forumLastCommentThread = new Div().add(new Span(forum.lastCommentThread)).addClass("forum-comment-thread");
                let forumLastCommentAuthor = new Div().add(new Span(forum.lastCommentAuthor)).addClass("forum-comment-author");
                let forumLastComment = new Div().addClass("forum-comments")
                    .add(forumLastCommentDate)
                    .add(forumLastCommentThread)
                    .add(forumLastCommentAuthor);
                lines.push([forumContent, forumStats, forumLastComment]);
            }
            this.setContent({
                data: lines
            });
        });
    }

}

export class VForums extends VContainer {

    constructor({loadForums, selectForum}) {
        super({ref: "forums", columns: 1});
        this.addClass("forums-container");
        this._forums = new VForumsList({loadForums, selectForum});
        this.add(this._forums);
    }
}



export class VProposeThread extends VModal {

    constructor() {
        super({ref: VProposeThread.REF, title: VProposeThread.TITLE});
        this._title = new VInputField({ref:"thread-title", label:"Title"});
        this._comment = new VInputTextArea({ref:"thread-comment", label:"Comment"});
        this.addContainer({
            ref: "thread-comment",
            container: new VFormContainer({columns: 1})
                .addField({field: this._title})
                .addField({field: this._comment})
                .addField({
                    field: new VButtons({
                        ref: "buttons", buttons: [
                            {
                                ref: "propose-thread", type: "accept", label: "Propose",
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

    static REF = "propose-thread";
    static TITLE = "Propose A Thread";
}



export class VForumThreads extends VTable {

    constructor({loadThreads, selectThread}) {
        super({ref:"forum-threads",
            changePage: pageIndex=>this._change(pageIndex),
            select: selectThread
        });
        this._loadThreads = loadThreads;
    }

    setForum(forum) {
        this._forum = forum;
        this._change(0);
    }

    _change(index) {
        this._loadThreads(index, forum=> {
            let lines = [];
            !this._proposeThreadModal && (this._proposeThreadModal = new VProposeThread());
            for (let thread of forum.threads) {
                let threadTitle = new Div().add(new P(thread.title)).addClass("thread-comment-title");
                let threadComment = new Div().add(new P(thread.comment)).addClass("thread-comment-text");
                let threadContent = new Div().addClass("thread-content")
                    .add(threadTitle)
                    .add(threadComment);
                let threadThumbsCount = new Span(thread.threads).addClass("threads-count");
                let threadCommentsCount = new Span(thread.comments).addClass("thread-comments-count");
                let threadStats = new Div().addClass("thread-stats")
                    .add(new I("comments").setAlt("replies"))
                    .add(threadThumbsCount)
                    .add(new Span(" /"))
                    .add(new I("thumbs-up").setAlt("thumbs"))
                    .add(threadCommentsCount);
                let threadLastCommentDate = new Div()
                    .add(new Span("Last post on ").addClass("thread-comment-post"))
                    .add(new Span(thread.lastCommentDate.toLocaleDateString()).addClass("thread-comment-date"));
                let threadLastCommentAuthor = new Div().add(new Span(thread.lastCommentAuthor)).addClass("thread-comment-author");
                let threadLastComment = new Div().addClass("thread-comments")
                    .add(threadLastCommentDate)
                    .add(threadLastCommentAuthor);
                lines.push([threadContent, threadStats, threadLastComment]);
            }
            let title = new Span(forum.title)
                .addClass("thread-title")
            let pageSummary = new Span()
                .addClass("thread-pager")
                .setText(String.format(VForumThreads.SUMMARY, forum.threadsCount, forum.firstThread, forum.lastThread));
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(new Span("Propose Thread").addClass("propose-thread").onMouseClick(event=>{
                    this._proposeThreadModal.show();
                }))
                .add(pageSummary);
            this.setContent({
                summary,
                data: lines
            });
            let first = forum.pageCount<=5 ? 0 : forum.currentPage-2;
            if (first<0) first = 0;
            let last = forum.pageCount<=5 ? forum.pageCount-1 : forum.currentPage+2;
            if (last>=forum.pageCount) last=forum.pageCount-1;
            this.setPagination({
                first, last, current:forum.currentPage
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} threads";
}

export class VForum extends VContainer {

    constructor({loadThreads, selectThread}) {
        super({ref: "forum", columns: 1});
        this.addClass("forum-container");
        this._threads = new VForumThreads({loadThreads, selectThread});
        this.add(this._threads);
    }

    setForum(forum) {
        this._threads.setForum(forum);
    }

}

