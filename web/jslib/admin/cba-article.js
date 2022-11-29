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
    Undoable, VImage,
    Vitamin, VMessageHandler, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons, VDropdownListField,
    VFileLoaderField,
    VInputField, VInputTextArea, VRef, VSelectField, VSwitch
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
import {
    loadLiveThemes
} from "./cba-theme.js";
import {
    DetailedForm, DetailedView
} from "../vitamin/structured.js";

export class CBAParagraph extends Vitamin(Div) {

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

export class CBAArticle extends DetailedView(Vitamin(Div)) {

    constructor({kind, action, paragraphAction, article}) {
        super({ref:"article-"+article.id});
        this._paragraphAction = paragraphAction;
        this.addClass(kind);
        this._title = new P(article.title).addClass("article-title");
        this.add(this._title);
        this._content = new Div().addClass("article-content");
        this.add(this._content);
        this._paragraphs=[];
        if (article.paragraphs) {
            for (let paragraphSpec of article.paragraphs) {
                this.createDetailRecord(paragraphSpec);
            }
        }
        this.onEvent("click", event=>{
            action && action(this)
        });
    }

    get content() {
        return this._content;
    }

    // ++
    get detailRecords() {
        return this.paragraphs;
    }

    // ++
    _createDetailRecord(detailRecordSpec) {
        return new CBAParagraph({
            ...detailRecordSpec,
            action: this._paragraphAction
        });
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
        return {
            title: this._title.getText(),
            paragraphs: this._getDetailRecordsSpecification()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._setDetailRecordsSpecification(specification.paragraphs);
    }

}

export class CBAEditArticlePane extends DetailedForm(Undoable(VSplitterPanel)) {

    constructor({ref, kind, article, accept, verify}) {
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
        this._status = new VSelectField({
            ref: "article-status", label: "Status",
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
        let nameContainer = new VContainer({columns:2}).addField({field:this._themes}).addField({field:this._status});
        this.addOnRight(nameContainer);
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
        let userSelector = new CBAUserSelector({title:"Select Article Account", loadPage:loadUsers, selectUser: user=>{
                this._author.setValue(user);
                userSelector.hide();
            }
        }).loadUsers();
        this._author = new VRef({
            ref: "author", label: "Author", nullable: true, selector: userSelector,
            validate: mandatory({}),
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
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            }
        ]});
        this.addOnRight(this._buttons);
        this.article = article;
    }

    validate() {
        return !this._themes.validate()
            & !this._articleTitle.validate()
            & !this._paragraphTitle.validate()
            & !this._text.validate()
            & !this._illustration.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    // ++
    _updateForm() {
        this._articleTitle.value = this._articleView.title;
        this._paragraphTitle.value = this._paragraphView.title;
        this._text.value = this._paragraphView.text;
        this._illustration.imageSrc = this._paragraphView.illustration;
        this._illustrationPosition.value = this._paragraphView.illustrationPosition;
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Article not saved. Do you want to Quit ?")
    }

    get article() {
        return {
            themes: this._themes.selection.map(theme=>{ return {
                id: theme.value,
                title: theme.label
            }}),
            status: this._status.value,
            ...this._articleView.specification,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set article(article) {
        this._article = article;
        if (!article.paragraphs) {
            article.paragraphs = [
                structuredClone(this._newParagraphSpecs)
            ]
        }
        if (this._articleView) {
            this.removeFromLeft(this._articleView);
        }
        this._articleView = new CBAArticle({
            paragraphAction:paragraphView => {
                this.selectDetailRecord(paragraphView);
                return true;
            },
            article
        });
        this._articleView.paragraphs[0] && this._selectDetailRecord(this._articleView.paragraphs[0]);
        this.addOnLeft(this._articleView);
        this._articleTitle.value = article.title;
        this._themes.value = article.themes ? article.themes.map(theme=>theme.id) : [];
        this._status.value = article.status || "live";
        this._author.value = article.author;
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
            for (let paragraphView of this._articleView.paragraphs) {
                paragraphView.action = event => {
                    this.selectDetailRecord(paragraphView);
                    return true;
                }
            }
            this._articleTitle.value = this._articleView.title;
            let paragraphView = this._articleView.getParagraph(specification.current);
            this._selectDetailRecord(paragraphView);
            this._themes.value = specification.themes.map(theme=>theme.id);
            this._author.value = specification.author;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(article) {
        this.article = article;
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
            "ref": "article-comments",
            "kind": "article-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    // ++
    get mainRecordView() {
        return this._articleView;
    }

    // ++
    get detailRecordView() {
        return this._paragraphView;
    }

    // ++
    set detailRecordView(detailRecordView) {
        this._paragraphView = detailRecordView;
    }

    // ++
    get newDetailRecordSpec() {
        return this._newParagraphSpecs;
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

export class CBAEditArticle extends VModal {

    constructor({title, create, article, saveArticle, deleteArticle}) {
        super({ref:"edit-article-modal", title});
        this._id = article.id;
        this._articlePane = new CBAEditArticlePane({
            ref: "article-editor-pane",
            kind: "article-editor-pane",
            article,
            create,
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (600 x 350) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==600 || image.imageHeight!==350) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (650 x 350) pixels."});
                    return false;
                }
                return true;
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-article", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let article = this.specification;
                        let newComment = article.comments.newComment;
                        if (newComment) {
                            article.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        article.comments = article.comments.comments;
                        saveArticle(article);
                    }
                }
            },
            {
                ref: "close-article", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-article", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-article-deletion",
                    title: "Delete Article",
                    message: "Do you really want to delete the Article ?",
                    actionOk: event => deleteArticle(article)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._articlePane);
        this.add(this._buttons);
        this.addClass("article-modal");
    }

    tryToLeave(leave, notLeave) {
        return this._articlePane.tryToLeave(leave, notLeave);
    }

    validate() {
        return this._articlePane.validate();
    }

    saved(article) {
        this._articlePane.saved(article);
        this._id = article.id;
        this._deleteButton.enabled = true;
        showMessage("Article saved.");
        return true;
    }

    get imageFiles() {
        return this._articlePane.imageFiles;
    }

    get illustration()  {
        return this._articlePane.illustration;
    }

    get specification() {
        return {
            id: this._id,
            ...this._articlePane.article
        };
    }

}

export class CBAArticleList extends VTable {

    constructor({loadPage, deleteArticle, saveArticle, saveArticleStatus}) {
        super({
            ref: "article-list",
            changePage: pageIndex => this._setPage(pageIndex),
            select: line => this.selectArticle(line)
        });
        this.addClass("article-list");
        this._loadPage = loadPage;
        this._saveArticle = saveArticle;
        this._saveArticleStatus = saveArticleStatus;
        this._deleteArticle = deleteArticle;
    }

    set search(search) {
        this._search = search;
    }

    loadArticles() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    selectArticle(article) {
        loadArticle(article,
            article=>{
                let articleEditor = new CBAEditArticle({
                    title: "Edit Article",
                    article,
                    saveArticle: article => this._saveArticle(article,
                        articleEditor.imageFiles,
                        text => {
                            articleEditor.saved(parseArticle(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Article", text);
                        }
                    ),
                    deleteArticle: article => this._deleteArticle(article,
                        () => {
                            articleEditor.hide();
                            articleEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            articleEditor.confirm.hide();
                            showMessage("Fail to delete Article", text);
                        }
                    ),
                }).show();
            },
        );
    };

    _setPage(pageIndex) {
        function getAuthor(article) {
            return article.author.firstName+" "+article.author.lastName;
        }
        function getFirstParagraph(article) {
            return "<h4>"+article.firstParagraph.title+"</h4>" + article.firstParagraph.text;
        }
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveArticleStatus = article => this._saveArticleStatus(article,
                () => showMessage("Article saved."),
                text => showMessage("Unable to Save Article.", text),
            );
            for (let article of pageData.articles) {
                let line;
                let themes = new Span(article.themes.map(theme=>theme.title).join(", ")).addClass("article-themes");
                let title = new Span(article.title).addClass("article-name");
                let author = new Span(getAuthor(article)).addClass("article-name");
                let illustration = new Img(article.firstParagraph.illustration).addClass("article-illustration");
                let firstParagraph = new P(getFirstParagraph(article)).addClass("article-paragraph");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(article.status)
                    .addClass("article-status")
                    .onChange(event => saveArticleStatus(line));
                line = {
                    id: article.id,
                    articleTitle: title.getText(),
                    status: status.getValue()
                };
                lines.push({source:line, cells:[themes, title, author, illustration, firstParagraph, status]});
            }
            let title = new Span(pageData.title)
                .addClass("article-title")
            let pageSummary = new Span()
                .addClass("article-pager")
                .setText(pageData.articleCount ?
                    String.format(CBAArticleList.SUMMARY, pageData.articleCount, pageData.firstArticle, pageData.lastArticle) :
                    CBAArticleList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Themes", "Title", "Author", "Illustration", "First paragraph", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} article(s)";
    static EMPTY_SUMMARY = "There are no article to show";
}

export class CBAArticleListPage extends Vitamin(Div) {

    constructor({loadPage, deleteArticle, saveArticle, saveArticleStatus}) {
        super({ref: "article-list-page"});
        this._search = new VSearch({
            ref: "article-list-search", searchAction: search => {
                this.loadArticles();
            }
        });
        this._create = new VButton({
            ref: "article-create", type: "neutral", label: "Create Article",
            onClick: event => {
                this._createArticleModal = new CBAEditArticle({
                    title: "Create Article",
                    create: true,
                    article: {
                        title: "Article Title",
                        version: 0,
                        status: "prp"
                    },
                    saveArticle: article => saveArticle(article,
                        this._createArticleModal.imageFiles,
                        text => {
                            this._createArticleModal.saved(parseArticle(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Article", text);
                        }
                    ),
                    deleteArticle: () => {
                        this._createArticleModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAArticleList({loadPage, saveArticle, saveArticleStatus, deleteArticle});
        this.add(this._search).add(this._table);
    }

    get createArtcileModal() {
        return this._createArticleModal;
    }

    loadArticles() {
        this._table.search = this._search.value;
        this._table.loadArticles();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadArticles(pageIndex, search, update) {
    sendGet("/api/article/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load article success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Article List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                articleCount: response.count,
                firstArticle: response.page * response.pageSize + 1,
                lastArticle: response.page * response.pageSize + response.articles.length,
                articles: response.articles
            });
        },
        (text, status) => {
            requestLog("Load Article failure: " + text + ": " + status);
            showMessage("Unable to load Articles", text);
        }
    );
}

function parseArticle(text) {
    let article = JSON.parse(text);
    for (let comment of article.comments) {
        comment.date = new Date(comment.date);
    }
    return article;
}

export function loadArticle(article, success) {
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

export function saveArticle(article, images, success, failure) {
    sendPost(article.id===undefined ? "/api/article/create" : "/api/article/update/" + article.id,
        article,
        (text, status) => {
            requestLog("Article saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Article saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveArticleStatus(article, success, failure) {
    sendPost("/api/article/update-status/" + article.id,
        article,
        (text, status) => {
            requestLog("Article status update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Article status update failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteArticle(article, success, failure) {
    sendGet("/api/article/delete/" + article.id,
        (text, status) => {
            requestLog("Article delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Article delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vArticleList = new CBAArticleListPage({
    loadPage: loadArticles,
    deleteArticle,
    saveArticle,
    saveArticleStatus
});