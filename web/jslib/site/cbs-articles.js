'use strict'

import {
    Div, Img, P, requestLog, sendGet, sendPost
} from "../vitamin/components.js";
import {
    Undoable,
    VImage,
    Vitamin, VLoginHandler
} from "../vitamin/vitamins.js";
import {
    VSplitterPanel, VWallWithSearch
} from "../vitamin/vcontainer.js";
import {
    mandatory, range,
    VButton, VButtons, VCommand, VDropdownListField,
    VFileLoaderField,
    VInputField, VInputTextArea,
    VSwitch
} from "../vitamin/vforms.js";
import {
    loadLiveThemes
} from "./cbs-theme.js";
import {
    CBSEditComments
} from "./cbs-comment.js";
import {
    CBSFormContainer
} from "./cbs-widgets.js";
import {
    showMessage, VHeader
} from "../vitamin/vpage.js";
import {
    CBSTheme, loadThemesByCategory
} from "./cbs-theme.js";

export class CBSParagraph extends Vitamin(Div) {

    constructor({ref, version, illustration, illustrationFile, illustrationPosition, title, text, action}) {
        super({ref});
        this.addClass("embed-paragraph");
        this._embed = new Div();
        this.add(this._embed);
        this._embed.addClass("paragraph");
        this.illustrationPosition = illustrationPosition;
        if (illustration) {
            this._illustration = new VImage({ref:ref+"-image", kind:"paragraph-image", img:illustration});
        }
        if (this._illustration) this._embed.add(this._illustration);
        this._content = new Div().addClass("paragraph-container");
        this._embed.add(this._content);
        this._title = new P(title).addClass("paragraph-title");
        this._content.add(this._title);
        this._text = new P(text).addClass("paragraph-text");
        this._content.add(this._text);
        this._illustrationFile = illustrationFile;
        this._version = version;
        this.action=action;
    }

    set action(action) {
        action && this.onEvent("click", event=>{
            action(this)
        });
    }

    get specification() {
        return {
            ref: this.ref.ref,
            version: this._version,
            illustration: this._illustration ? this._illustration.src : null,
            illustrationPosition: this._illustrationPosition,
            title: this._title.getText(),
            text: this._text.getText()
        };
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
    }

    get text() {
        return this._text.getText();
    }

    set text(text) {
        this._text.setText(text);
    }

    get illustration() {
        return this._illustration ? this._illustration.src : null;
    }

    get illustrationFile() {
        return this._illustrationFile;
    }

    set illustrationFile(illustrationFile) {
        this._illustrationFile = illustrationFile;
    }

    set illustration(illustration) {
        if (this._illustration) {
            this._illustration.setSrc(illustration);
        }
        else {
            this._illustration = new VImage({ref:this.ref+"-image", kind:"paragraph-image", img:illustration});
            this._embed.insert(this._illustration, this._content);
        }
    }

    get illustrationPosition() {
        return this._illustrationPosition;
    }

    set illustrationPosition(illustrationPosition) {
        if (this._illustrationPosition) {
            this.removeClass(`image-on-${this._illustrationPosition}`);
        }
        this._illustrationPosition = illustrationPosition;
        if (this._illustrationPosition) {
            this.addClass(`image-on-${this._illustrationPosition}`);
        }
    }

}

export class CBSPoll extends Vitamin(Div) {

    constructor({ref, poll, likes, dislikes, actionLikes, actionDislikes}) {
        super({ref});
        this._poll = poll;
        console.log("poll : "+poll);
        this._likesIcon = new Div().addClass("likes-icon");
        this._likesValue = new Div().addClass("likes-value").setText(""+likes);
        if (actionLikes) {
            this._likesIcon.onEvent("click", event=>actionLikes(this._likesValue, event));
        }
        this._dislikesIcon = new Div().addClass("dislikes-icon");
        this._dislikesValue = new Div().addClass("dislikes-value").setText(""+dislikes);
        if (actionDislikes) {
            this._dislikesIcon.onEvent("click", event=>actionDislikes(this._dislikesValue, event));
        }
        this.addClass("show-poll")
            .add(this._likesIcon).add(this._likesValue)
            .add(this._dislikesIcon).add(this._dislikesValue);
    }

    get likesIcon() {
        return this._likesIcon;
    }

    get dislikesIcon() {
        return this._dislikesIcon;
    }

    get likes() {
        return parseInt(this._likesValue.getText());
    }

    get dislikes() {
        return parseInt(this._dislikesValue.getText());
    }

    set likes(likes) {
        this._likesValue.setText(""+likes);
    }

    set dislikes(dislikes) {
        this._dislikesValue.setText(""+dislikes);
    }

    get specification() {
        return {
            id: this._poll,
            likes: this.likes,
            dislikes: this.dislikes
        }
    }
}

export class CBSArticle extends Vitamin(Div) {

    constructor({action, paragraphAction, article}) {
        super({ref:"article-"+article.id});
        this._paragraphAction = paragraphAction;
        this.addClass("article");
        this._title = new P(article.title).addClass("article-title");
        this.add(this._title);
        if (article.poll) {
            this._poll = new CBSPoll({
                poll: article.poll.id,
                likes: article.poll.likes,
                dislikes: article.poll.dislikes
            });
            this.add(this._poll);
        }
        this._paragraphs=[];
        if (article.paragraphs) {
            for (let paragraphSpec of article.paragraphs) {
                this.createParagraph(paragraphSpec);
            }
        }
        this.onEvent("click", event=>{
            action && action(this)
        });
    }

    createParagraph(paragraphSpec) {
        let paragraph = new CBSParagraph({
            ...paragraphSpec,
            action: this._paragraphAction
        });
        this.add(paragraph);
        this._paragraphs.push(paragraph);
        return paragraph;
    }

    insertParagraph(paragraphSpec, before) {
        let index = this._paragraphs.indexOf(before);
        let paragraph = new CBSParagraph(paragraphSpec);
        this._paragraphs.insert(index, paragraph);
        this.insert(paragraph, before);
        return paragraph;
    }

    removeParagraph(index) {
        let paragraph = this._paragraphs[index];
        this.remove(paragraph);
        this._paragraphs.splice(index, 1);
        return paragraph;
    }

    exchangeParagraphs(paragraph) {
        let index = this._paragraphs.indexOf(paragraph);
        this.remove(paragraph);
        this.insert(paragraph, this._paragraphs[index-1]);
        this._paragraphs.splice(index, 1);
        this._paragraphs.splice(index-1, 0, paragraph);
    }

    getParagraph(ref) {
        for (let paragraph of this._paragraphs) {
            if (paragraph.ref.ref === ref) return paragraph;
        }
        return null;
    }

    get paragraphs() {
        return this._paragraphs;
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
    }

    get specification() {
        let specification = {
            title: this._title.getText(),
            paragraphs: this._paragraphs.map((paragraph, ordinal)=>{
                return {
                    ordinal,
                    ...paragraph.specification
                }
            })
        };
        if (this._poll) specification.poll = this._poll.specification;
        return specification;
    }

    set specification(specification) {
        this._title.setText(specification.title);
        for (let paragraph of this._paragraphs) {
            this.remove(paragraph);
        }
        this._paragraphs = [];
        for (let paragraphSpec of specification.paragraphs) {
            this.createParagraph(paragraphSpec);
        }
    }
}

export class CBSNewspaper extends Vitamin(Div) {

    constructor({ref, kind="newspaper"}, builder) {
        super({ref});
        kind && this.addClass(kind);
        this._content = new Div().addClass("newspaper-container");
        this.add(this._content);
        builder&&builder(this);
    }

    addParagraph({illustration, illustrationPosition, title, text}, article) {
        let image = new Img(illustration).addClass("paragraph-image");
        article.add(image);
        image.addClass(illustrationPosition==='left' ? "image-on-left" : illustrationPosition==='right' ? "image-on-right" : "image-on-center");
        article.add(new P(title).addClass("paragraph-title"));
        if (Array.isArray(text)) {
            for (let textLine of text) {
                let line = new P(textLine).addClass("paragraph-line");
                article.add(line);
            }
        }
        else {
            article.add(new P(text).addClass("paragraph-line"));
        }
    }

    addArticle({title, paragraphs, poll}) {
        let article = new Div().addClass(("article-container"));
        this._content.add(article);
        article.add(new P(title).addClass("article-title"));
        for (let paragraph of paragraphs) {
            this.addParagraph(paragraph, article);
        }
        let pollContainer = new Div().addClass("poll-container");
        this._poll = new CBSPoll(poll);
        pollContainer.add(this._poll);
        article.add(pollContainer);
        return this;
    }

    setArticle(params) {
        if (this._content) {
            this.remove(this._content);
            this._content = new Div().addClass("newspaper-container");
            this.add(this._content);
        }
        this.addArticle(params);
    }

    get poll() {
        return this._poll;
    }
}

export class CBSArticleEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind, accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._newParagraphSpecs = {
            version: 0,
            illustration: "../images/site/default-image.png",
            illustrationPosition: "right",
            title: "Paragraph title",
            text: "Paragraph text"
        };
        this._themes = new VDropdownListField({ref:"article-theme", label:"Themes",
            validate: mandatory({}),
            selector: buildOptions => {
                loadLiveThemes(buildOptions);
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._themes);
        this._articleTitle = new VInputField({
            ref:"article-title-input", label:"Article Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._articleView.title = this._articleTitle.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._articleTitle);
        this._paragraphTitle = new VInputField({
            ref:"paragraph-title-input", label:"Paragraph Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._paragraphView.title = this._paragraphTitle.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._paragraphTitle);
        this._illustration = new VFileLoaderField({
            ref:"paragraph-image", label:"Image",
            validate: mandatory({}),
            accept, verify,
            onInput: event=>{
                this._paragraphView.illustration = this._illustration.imageSrc;
                if (this._illustration.files && this._illustration.files.length>0) {
                    this._paragraphView.illustrationFile = this._illustration.files[0];
                }
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustration);
        this._illustrationPosition = new VSwitch({ref:"paragraph-image-pos", kind:"paragraph-position",
            options:[
                {title: "left", value: "left"},
                {title:"center", value:"center"},
                {title:"right", value:"right"}
            ],
            onInput:event=>{
                this._paragraphView.illustrationPosition = this._illustrationPosition.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustrationPosition);
        this._text = new VInputTextArea({
            ref:"paragraph-content-input", label:"Text",
            validate: mandatory({validate: range({min:2, max:20000})}),
            onInput: event=>{
                this._paragraphView.text = this._text.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._text);
        this._send = new VButtons({ref: "article-buttons", vertical:false, buttons:[
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
                        let article = this.article;
                        if (article.comments.newComment) {
                            article.newComment = article.comments.newComment;
                        }
                        delete article.comments;
                        this.saveArticle(article);
                    }
                }
            }
        ]});
        this.addOnRight(this._send);
    }

    saveArticle(article) {
        saveProposedArticle(article,
            this.imageFiles,
            text => {
                this.saved(parseArticle(text));
            },
            text => {
                showMessage("Fail to update Article", text);
            }
        );
    }

    validate() {
        return !this._themes.validate()
            & !this._articleTitle.validate()
            & !this._paragraphTitle.validate()
            & !this._text.validate()
            & !this._illustration.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave, "Article not saved. Do you want to Quit ?")
    }

    get article() {
        return {
            themes: this._themes.selection.map(theme=>{ return {
                id: theme.value,
                title: theme.label
            }}),
            ...this._articleView.specification,
            comments: structuredClone(this._comments)
        }
    }

    set article(article) {
        if (!article.paragraphs) {
            article.paragraphs = [
                structuredClone(this._newParagraphSpecs)
            ]
        }
        this._article = article;
        if (this._articleView) {
            this.removeFromLeft(this._articleView);
        }
        this._articleView = new CBSArticle({
            paragraphAction:paragraphView => {
                this.selectParagraph(paragraphView);
                return true;
            },
            article
        });
        this._articleView.paragraphs[0] && this._selectParagraph(this._articleView.paragraphs[0]);
        this.addOnLeft(this._articleView);
        this._articleTitle.value = article.title;
        this._themes.value = article.themes ? article.themes.map(theme=>theme.id) : [];
        this._comments = {
            comments: this._article.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            current: this._paragraphView ? this._paragraphView.ref.ref : null,
            ...this.article
        }
    }

    _recover(specification) {
        if (specification) {
            this._articleView.specification = specification;
            for (let paragraph of this._articleView.paragraphs) {
                paragraph.action = event => {
                    this.selectParagraph(paragraph);
                    return true;
                }
            }
            this._articleTitle.value = this._articleView.title;
            let paragraphView = this._articleView.getParagraph(specification.current);
            this._selectParagraph(paragraphView);
            this._themes.value = specification.themes.map(theme=>theme.id);
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(article) {
        this._article.id = article.id;
        this._comments = {
            comments: article.comments || [],
            newComment: ""
        }
        showMessage("Article saved.");
        return true;
    }

    set comments(comments) {
        this._comments = structuredClone(comments);
        this._memorize();
    }

    onComments() {
        new CBSEditComments({
            "ref": "article-comments",
            "kind": "article-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    createParagraph(paragraphSpec) {
        return this._articleView.createParagraph(paragraphSpec);
    }

    selectParagraph(paragraphView) {
        if (paragraphView!==this._paragraphView) {
            this._selectParagraph(paragraphView);
            this._memorize();
        }
    }

    _selectParagraph(paragraphView) {
        this._unselectParagraph();
        this._paragraphView = paragraphView;
        this._paragraphView.addClass("selected");
        this._articleTitle.value = this._articleView.title;
        this._paragraphTitle.value = this._paragraphView.title;
        this._text.value = this._paragraphView.text;
        this._illustration.imageSrc = this._paragraphView.illustration;
        this._illustrationPosition.value = this._paragraphView.illustrationPosition;
        this._deleteCommand = new VCommand({
            ref:"paragraph-delete-cmd",
            imgEnabled: `../images/site/buttons/minus.png`,
            imgDisabled: `../images/site/buttons/minus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._deleteParagraph();
            }
        }).addClass("delete-command");
        this._paragraphView.add(this._deleteCommand);
        this._insertBeforeCommand = new VCommand({
            ref: "paragraph-insert-before-cmd",
            illustrationPosition: "center",
            imgEnabled: `../images/site/buttons/plus.png`,
            imgDisabled: `../images/site/buttons/plus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._createBefore();
            }
        }).addClass("insert-before-command");
        this._paragraphView.add(this._insertBeforeCommand);
        this._insertAfterCommand = new VCommand({
            ref:"paragraph-insert-after-cmd",
            imgEnabled: `../images/site/buttons/plus.png`,
            imgDisabled: `../images/site/buttons/plus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._createAfter();
            }
        }).addClass("insert-after-command");
        this._paragraphView.add(this._insertAfterCommand);
        this._goUpCommand = new VCommand({
            ref: "paragraph-goup-cmd",
            imgEnabled: `../images/site/buttons/goup.png`,
            imgDisabled: `../images/site/buttons/goup-disabled.png`,
            onClick: event => {
                event.stopPropagation();
                return this._goUp();
            }
        }).addClass("goup-command");
        this._paragraphView.add(this._goUpCommand);
        this._goDownCommand = new VCommand({
            ref: "paragraph-godown-cmd",
            imgEnabled: `../images/site/buttons/godown.png`,
            imgDisabled: `../images/site/buttons/godown-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._goDown();
            }
        }).addClass("godown-command");
        this._paragraphView.add(this._goDownCommand);
        this._updateGoCommands();
    }

    _updateGoCommands() {
        this._goUpCommand.enabled = this._articleView.paragraphs.indexOf(this._paragraphView)!==0;
        this._goDownCommand.enabled = this._articleView.paragraphs.indexOf(this._paragraphView)<this._articleView.paragraphs.length-1;
        this._deleteCommand.enabled = this._articleView.paragraphs.length>1;
    }

    _unselectParagraph() {
        if (this._paragraphView) {
            this._paragraphView.removeClass("selected");
            this._paragraphView.remove(this._deleteCommand);
            this._paragraphView.remove(this._goUpCommand);
            this._paragraphView.remove(this._goDownCommand);
            this._paragraphView.remove(this._insertBeforeCommand);
            this._paragraphView.remove(this._insertAfterCommand);
        }
    }

    _goUp() {
        let index = this._articleView.paragraphs.indexOf(this._paragraphView);
        if (index>0) {
            this._articleView.exchangeParagraphs(this._paragraphView);
        }
        this._updateGoCommands();
        return true;
    }

    _goDown() {
        let index = this._articleView.paragraphs.indexOf(this._paragraphView);
        if (index+1<this._articleView.paragraphs.length) {
            this._articleView.exchangeParagraphs(this._articleView.paragraphs[index+1]);
        }
        this._updateGoCommands();
        return true;
    }

    _createBefore() {
        let paragraphView = this._articleView.insertParagraph({
            ref: crypto.randomUUID(),
            ...this._newParagraphSpecs,
            action: event => {
                this.selectParagraph(paragraphView);
                return true;
            }
        }, this._paragraphView);
        this._selectParagraph(paragraphView);
        this._updateGoCommands();
        this._memorize();
        return true;
    }

    _createAfter() {
        let index = this._articleView.paragraphs.indexOf(this._paragraphView);
        if (index === this._articleView.paragraphs.length-1) {
            let paragraphView = this.createParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs
            });
            this._selectParagraph(paragraphView);
        }
        else {
            let paragraphView = this._article.insertParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs,
                action: event => {
                    this.selectParagraph(paragraphView);
                    return true;
                }
            }, this._article.paragraphs[index+1]);
            this._selectParagraph(paragraphView);
        }
        this._updateGoCommands();
        this._memorize();
        return true;
    }

    _deleteParagraph() {
        let index = this._articleView.paragraphs.indexOf(this._paragraphView);
        this._articleView.removeParagraph(index);
        if (this._articleView.paragraphs.length===0) {
            let paragraphView = this.createParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs
            });
            this._selectParagraph(paragraphView);
        }
        else {
            this._selectParagraph(this._articleView.paragraphs[index]);
        }
        this._updateGoCommands();
        this._memorize();
        return true;
    }

    get imageFiles() {
        let illustrations = [];
        for (let ordinal=0; ordinal<this._articleView.paragraphs.length; ordinal++) {
            let file = this._articleView.paragraphs[ordinal].illustrationFile;
            if (file) {
                illustrations.push({key: "illustration-" + ordinal, file});
            }
        }
        return illustrations.length ? illustrations : null;
    }

}

function parseArticle(text) {
    let article = JSON.parse(text);
    for (let comment of article.comments) {
        comment.date = new Date(comment.date);
    }
    return article;
}

export var vArticleEditor = new CBSArticleEditor({
    ref:"article-editor",
    kind:"article-editor"
});

export var vArticleEditorPage = new CBSFormContainer({ref:"article-editor-page", editor:vArticleEditor});

export function publishArticle(newspaper, article) {
    let myVote = null;
    let vote = doVote=> {
        if (myVote) {
            doVote();
        }
        else {
            readPoll(article.poll.id, vote=>{
                myVote = vote;
                doVote();
            });
        }
    }
    let updatePoll =  poll=> {
        newspaper.poll.likes = poll.likes;
        newspaper.poll.dislikes = poll.dislikes;
        if (poll.option==="like") {
            newspaper.poll.likesIcon.addClass("selected");
        }
        else {
            newspaper.poll.likesIcon.removeClass("selected");
        }
        if (poll.option==="dislike") {
            newspaper.poll.dislikesIcon.addClass("selected");
        }
        else {
            newspaper.poll.dislikesIcon.removeClass("selected");
        }
        myVote = poll;
    }
    if (VLoginHandler.connection) {
        readPoll(article.poll.id, updatePoll);
    }
    return {
        title: article.title,
        paragraphs: article.paragraphs,
        poll: {
            poll: article.poll.id,
            likes: article.poll.likes,
            dislikes: article.poll.dislikes,
            actionLikes: likes => {
                vote(()=>{
                    sendVote(article.poll.id, myVote.option==="like" ? "none" : "like",
                        updatePoll
                    );
                });
            },
            actionDislikes: dislikes => {
                vote(()=>{
                    sendVote(article.poll.id, myVote.option==="dislike" ? "none" : "dislike",
                        updatePoll
                    );
                });
            }
        }
    }
}

export var vNewArticlesWall = new VWallWithSearch({
    ref:"new-articles",
    kind: "new-articles",
    requestNotes: function (page, search) {
        loadRecentArticles(page, search, response=>{
            vNewArticlesWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let article of response) {
            this.addNote(new CBSArticle({
                article,
                action: article => {
                    vPageContent.showNewArticlesNewspaper(article);
                }
            }));
        }
    },
    searchAction: ()=>{
        vNewArticlesWall.clearNotes()
    }
});

export var vThemesAboutGameWall = new VWallWithSearch({
    ref: "themes-about-game",
    kind: "themes-about-game",
    requestNotes: function (page, search) {
        loadThemesByCategory(page, "game", search, response=>{
            vThemesAboutGameWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let theme of response) {
            this.addNote(new CBSTheme({
                ...theme,
                action:theme=>{
                    vPageContent.showArticlesAboutGameThemeWall(theme);
                }
            }));
        }
    },
    searchAction: ()=>{
        vThemesAboutGameWall.clearNotes()
    }
});

export var vThemesAboutLegendsWall = new VWallWithSearch({
    ref: "themes-about-legends",
    kind: "themes-about-legends",
    requestNotes: function (page, search) {
        loadThemesByCategory(page, "legends", search, response=>{
            vThemesAboutLegendsWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let theme of response) {
            this.addNote(new CBSTheme({
                ...theme,
                action:theme=>{
                    vPageContent.showArticlesAboutLegendsThemeWall(theme);
                }
            }));
        }
    },
    searchAction: ()=>{
        vThemesAboutLegendsWall.clearNotes()
    }
});

export var vThemesAboutGameExamplesWall = new VWallWithSearch({
    ref: "themes-about-game-examples",
    kind: "themes-about-game-examples",
    requestNotes: function (page, search) {
        loadThemesByCategory(page, "examples", search, response=>{
            vThemesAboutGameExamplesWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let theme of response) {
            this.addNote(new CBSTheme({
                ...theme,
                action:theme=>{
                    vPageContent.showArticlesAboutGameExamplesThemeWall(theme);
                }
            }));
        }
    },
    searchAction: ()=>{
        vThemesAboutGameExamplesWall.clearNotes()
    }
});

export var vArticlesAboutGameThemeWall = new VWallWithSearch({
    ref:"articles-about-game",
    kind: "articles-about-game",
    requestNotes: function (page, search) {
        loadArticlesByTheme(page, search, vArticlesAboutGameThemeWall._theme, response=>{
            vArticlesAboutGameThemeWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let article of response) {
            this.addNote(new CBSArticle({
                article,
                action: article => {
                    vPageContent.showArticlesAboutGameNewspaper(article);
                }
            }));
        }
    },
    searchAction: ()=>{
        vArticlesAboutGameThemeWall.clearNotes()
    }
});
vArticlesAboutGameThemeWall.setTheme = function(theme) {
    this._theme = theme;
    this.clearNotes();
}

export var vArticlesAboutLegendsThemeWall = new VWallWithSearch({
    ref:"articles-about-legends",
    kind: "articles-about-legends",
    requestNotes: function (page, search) {
        loadArticlesByTheme(page, search, vArticlesAboutLegendsThemeWall._theme, response=>{
            vArticlesAboutLegendsThemeWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let article of response) {
            this.addNote(new CBSArticle({
                article,
                action: article => {
                    vPageContent.showArticlesAboutLegendsNewspaper(article);
                }
            }));
        }
    },
    searchAction: ()=>{
        vArticlesAboutLegendsThemeWall.clearNotes()
    }
});
vArticlesAboutLegendsThemeWall.setTheme = function(theme) {
    this._theme = theme;
    this.clearNotes();
}

export var vArticlesAboutGameExamplesThemeWall = new VWallWithSearch({
    ref:"articles-about-game-examples",
    kind: "articles-about-game-examples",
    requestNotes: function (page, search) {
        loadArticlesByTheme(page, search, vArticlesAboutGameExamplesThemeWall._theme, response=>{
            vArticlesAboutGameExamplesThemeWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let article of response) {
            this.addNote(new CBSArticle({
                article,
                action: article => {
                    vPageContent.showArticlesAboutGameExamplesNewspaper(article);
                }
            }));
        }
    },
    searchAction: ()=>{
        vArticlesAboutGameExamplesThemeWall.clearNotes()
    }
});
vArticlesAboutGameExamplesThemeWall.setTheme = function(theme) {
    this._theme = theme;
    this.clearNotes();
}

export var vNewspaperContent = new CBSNewspaper({
    ref:"newspaper-content"
});

export function readPoll(poll, update) {
    sendGet("/api/like-poll/vote/" + poll,
        (text, status) => {
            requestLog("Read Poll success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Read Poll failure: " + text + ": " + status);
            if (status===403) {
                showMessage("Login required to Vote", "Please login.");
            }
            else {
                showMessage("Unable to read poll", text);
            }
        }
    );
}

export function sendVote(poll, option, update) {
    sendPost("/api/like-poll/vote/" + poll,
        { option },
        (text, status) => {
            requestLog("Vote success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Vote failure: " + text + ": " + status);
            showMessage("Unable to vote", text);
        }
    );
}

export function loadRecentArticles(pageIndex, search, update) {
    sendGet("/api/article/recent?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load article success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Load Article failure: " + text + ": " + status);
            showMessage("Unable to load Articles", text);
        }
    );
}


export function loadArticlesByTheme(pageIndex, search, themeId, update) {
    sendGet("/api/article/by-theme/"+themeId+"?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load article success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Load Article failure: " + text + ": " + status);
            showMessage("Unable to load Articles", text);
        }
    );
}

export function loadProposedArticle(article, success) {
    sendGet("/api/article/load/"+article.id,
        (text, status) => {
            requestLog("Article load success: " + text + ": " + status);
            success(parseArticle(text));
        },
        (text, status) => {
            requestLog("Load Article failure: " + text + ": " + status);
            showMessage("Unable to load Article of Id "+article.id, text);
        }
    );
}

export function saveProposedArticle(article, images, success, failure) {
    sendPost(article.id===undefined ? "/api/article/propose" : "/api/article/amend/" + article.id,
        article,
        (text, status) => {
            requestLog("Article proposal success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Article proposal failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}