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

// Forum List

export class VForumsList extends VTable {

    constructor({loadForums, selectForum}) {
        super({ref:"forums-list",
            select: selectForum
        });
        loadForums(forums=> {
            let lines = [];
            for (let forum of forums.forums) {
                let forumTitle = new Div().add(new P(forum.title)).addClass("forum-title");
                let forumMessage = new Div().add(new P(forum.message)).addClass("forum-text");
                let forumContent = new Div().addClass("forum-content")
                    .add(forumTitle)
                    .add(forumMessage);
                let forumThreadsCount = new Span(forum.threads).addClass("forum-threads-count");
                let forumRepliesCount = new Span(forum.replies).addClass("forum-replies-count");
                let forumStats = new Div().addClass("forum-stats")
                    .add(new I("comment").setAlt("threads"))
                    .add(forumThreadsCount)
                    .add(new Span(" /"))
                    .add(new I("comments").setAlt("replies"))
                    .add(forumRepliesCount);
                let forumLastMessageDate = new Div()
                    .add(new Span("Last post on ").addClass("forum-last-message-post"))
                    .add(new Span(forum.lastMessageDate.toLocaleDateString()).addClass("forum-last-message-date"));
                let forumLastMessageThread = new Div().add(new Span(forum.lastMessageThread)).addClass("forum-last-message-thread");
                let forumLastMessageAuthor = new Div().add(new Span(forum.lastMessageAuthor)).addClass("forum-last-message-author");
                let forumLastMessage = new Div().addClass("forum-last-messages")
                    .add(forumLastMessageDate)
                    .add(forumLastMessageThread)
                    .add(forumLastMessageAuthor);
                lines.push({source:forum, cells:[forumContent, forumStats, forumLastMessage]});
            }
            this.setContent({
                lines
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

// Forum


export class VProposeThread extends VModal {

    constructor() {
        super({ref: VProposeThread.REF, title: VProposeThread.TITLE});
        this._title = new VInputField({ref:"thread-title", label:"Title"});
        this._message = new VInputTextArea({ref:"thread-message", label:"Message"});
        this.add(
            new VFormContainer({columns: 1})
                .addField({field: this._title})
                .addField({field: this._message})
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
        );
    }

    static REF = "propose-thread";
    static TITLE = "Propose A Thread";
}

export class VForumThreads extends VTable {

    constructor({loadThreads, selectThread}) {
        super({ref:"threads",
            changePage: pageIndex=>this._setPage(pageIndex),
            select: selectThread
        });
        this._loadThreads = loadThreads;
    }

    setForum(forum) {
        this._forum = forum;
        this._setPage(0);
    }

    _setPage(index) {
        this._loadThreads(index, this._forum, forum=> {
            let lines = [];
            !this._proposeThreadModal && (this._proposeThreadModal = new VProposeThread());
            for (let thread of forum.threads) {
                let threadTitle = new Div().add(new P(thread.title)).addClass("thread-title");
                let threadDescription = new Div().add(new P(thread.description)).addClass("thread-text");
                let threadContent = new Div().addClass("thread-content")
                    .add(threadTitle)
                    .add(threadDescription);
                let threadThumbsCount = new Span(thread.messageCount).addClass("threads-message-count");
                let threadMessagesCount = new Span(thread.likeCount).addClass("thread-like-count");
                let threadStats = new Div().addClass("thread-stats")
                    .add(new I("comments").setAlt("replies"))
                    .add(threadThumbsCount)
                    .add(new Span(" /"))
                    .add(new I("thumbs-up").setAlt("thumbs"))
                    .add(threadMessagesCount);
                let threadLastMessageDate = new Div()
                    .add(new Span("Last post on ").addClass("thread-last-message-post"))
                    .add(new Span(thread.lastMessageDate.toLocaleDateString()).addClass("thread-last-message-date"));
                let threadLastMessageAuthor = new Div().add(new Span(thread.lastMessageAuthor)).addClass("thread-last-message-author");
                let threadLastMessage = new Div().addClass("thread-last-message")
                    .add(threadLastMessageDate)
                    .add(threadLastMessageAuthor);
                lines.push({source:thread, cells:[threadContent, threadStats, threadLastMessage]});
            }
            let title = new Span(forum.title)
                .addClass("threads-title")
            let pageSummary = new Span()
                .addClass("threads-pager")
                .setText(String.format(VForumThreads.SUMMARY, forum.threadCount, forum.firstThread, forum.lastThread));
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(new Span("Propose Thread").addClass("propose-thread").onMouseClick(event=>{
                    this._proposeThreadModal.show();
                }))
                .add(pageSummary);
            this.setContent({
                summary,
                lines
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

// Thread

export class VForumThreadMessages extends VTable {

    constructor({loadMessages, insertQuote}) {
        super({ref:"messages",
            changePage: pageIndex=>this._setPage(pageIndex)
        });
        this._loadMessages= loadMessages;
        this._insertQuote = insertQuote;
    }

    setThread(thread) {
        this._thread = thread;
        this._setPage(0);
    }

    _setPage(index) {
        this._loadMessages(index, this._thread, page=> {
            let lines = [];
            !this._reportModal && (this._reportModal = new VForumReport());
            for (let message of page.messages) {
                let icon = new Div().add(new Img(message.avatarImage)).addClass("avatar-image");
                let identity = new Div().add(new P(message.avatarIdentity)).addClass("avatar-identity");
                let level = new Div().add(new P(message.avatarLevel)).addClass("avatar-level");
                let messageCounts = new Div().add(new P('<i class="fa fa-comment"></i>'+message.avatarMessageCount)).addClass("avatar-message-count");
                let avatar = new Div().addClass("avatar")
                    .add(icon)
                    .add(identity)
                    .add(level)
                    .add(messageCounts);
                let messageDate= new Div().add(new P("Posted on "+message.date.toLocaleDateString())).addClass("message-date");
                let messageText = new Div().add(new P(message.text)).addClass("message-text");
                let likeCount = new P(message.likeCount).addClass("like-message-count").onMouseClick(event=>console.log("liked"))
                let heart = new I("heart").addClass("like-message").onMouseClick(event=>console.log("liked"))
                let clickOnLike = ()=>{
                    message.likeCount += message.liked ? -1 : 1;
                    message.liked = !message.liked;
                    likeCount.setText(message.likeCount);
                    heart.removeClass(message.liked ? "message-not-liked" : "message-liked");
                    heart.addClass(message.liked ? "message-liked" : "message-not-liked");
                }
                likeCount.onMouseClick(clickOnLike)
                heart.onMouseClick(clickOnLike)
                heart.addClass(message.liked ? "message-liked" : "message-not-liked");
                let messageCommands = new Div()
                    .add(heart)
                    .add(likeCount)
                    .add(new P("Reply").addClass("quote-message").onMouseClick(event=>console.log("replied")))
                    .add(new P("Quote").addClass("quote-message").onMouseClick(event=>{
                        this._insertQuote(`<p class='cite'>${message.avatarIdentity} wrote: </p>${messageText.getInnerHTML()}`);
                    }))
                    .add(new P("Report").addClass("quote-message").onMouseClick(event=>{
                        this._reportModal.show();
                    }))
                    .addClass("message-commands");
                let messageContent = new Div().addClass("message-content")
                    .add(messageDate)
                    .add(messageText)
                    .add(messageCommands)
                lines.push({cells:[avatar, messageContent]});
            }
            this._currentPage = page.currentPage;
            let title = new Span(page.title)
                .addClass("thread-title")
            let pageSummary = new Span()
                .addClass("thread-pager")
                .setText(String.format(VForumThreadMessages.SUMMARY, page.messageCount, page.firstMessage, page.lastMessage));
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                lines
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

    static SUMMARY = "Showing {1} to {2} of {0} messages";
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
        this._icons.remove(icon);
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
        this.addClass("message-editor");
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

    constructor({loadMessages, send}) {
        super({ref: "forum-thread", columns: 1});
        this.addClass("forum-thread-container");
        this._editPost = new VForumPostEditor({send});
        this._messages = new VForumThreadMessages({loadMessages, insertQuote:text=>{
            this._editPost.insertQuote(text);
        }});
        this.add(this._messages).add(this._editPost);
    }

    setThread(thread) {
        this._messages.setThread(thread);
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
        this.add(
            new VFormContainer({columns: 1})
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
        );
    }

    static REPORT_REF = "forum-report";
    static REPORT_TITLE = "Report";
}


