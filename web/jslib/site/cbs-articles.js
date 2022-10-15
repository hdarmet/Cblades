'use strict'

import {
    Div, Img, P
} from "../vitamin/components.js";
import {
    Undoable,
    VImage,
    Vitamin
} from "../vitamin/vitamins.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    VButton, VButtons, VCommand,
    VFileLoaderField,
    VInputField, VInputTextArea,
    VSelectField,
    VSwitch
} from "../vitamin/vforms.js";

export class CBSParagraph extends Vitamin(Div) {

    constructor({ref, img, image, imgPos, title, description, action}) {
        super({ref});
        this.addClass("embed-paragraph");
        this._embed = new Div();
        this.add(this._embed);
        this._embed.addClass("paragraph");
        this.imgPos = imgPos;
        if (image) {
            this._image = image;
        }
        else if (img) {
            this._image = new VImage({ref:ref+"-image", kind:"paragraph-image", img});
        }
        if (this._image) this._embed.add(this._image);
        this._content = new Div().addClass("paragraph-container");
        this._embed.add(this._content);
        this._title = new P(title).addClass("paragraph-title");
        this._content.add(this._title);
        this._description = new P(description).addClass("paragraph-line");
        this._content.add(this._description);
        this.action=action;
    }

    set action(action) {
        action && this.onEvent("click", action);
    }

    get specification() {
        let description;
        description = this._description.getText();
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            imgPos: this._imgPos,
            title: this._title.getText(),
            description: description
        };
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
        if (this._image) {
            this._image.setSrc(img);
        }
        else {
            this._image = new VImage({ref:this.ref+"-image", kind:"paragraph-image", img});
            this._embed.insert(this._image, this._content);
        }
    }

    get imgPos() {
        return this._imgPos;
    }

    set imgPos(imgPos) {
        if (this._imgPos) {
            this.removeClass(`image-on-${this._imgPos}`);
        }
        this._imgPos = imgPos;
        if (this._imgPos) {
            this.addClass(`image-on-${this._imgPos}`);
        }
    }
}

export class CBSVotes extends Vitamin(Div) {

    constructor({ref, likes, dislikes, actionLikes, actionDislikes}) {
        super({ref});
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
        this.addClass("show-votes")
            .add(this._likesIcon).add(this._likesValue)
            .add(this._dislikesIcon).add(this._dislikesValue);
    }

    get likes() {
        return parseInt(this._likesValue.getText());
    }

    get dislikes() {
        return parseInt(this._dislikesValue.getText());
    }

    get specification() {
        return {
            likes: this.likes,
            dislikes: this.dislikes
        }
    }
}

export class CBSArticle extends Vitamin(Div) {

    constructor({ref, kind = "article", title, paragraphs, votes, action}) {
        super({ref});
        this.addClass(kind);
        this._title = new P(title).addClass("article-title");
        this.add(this._title);
        if (votes) {
            this._votes = new CBSVotes(votes);
            this.add(this._votes);
        }
        this._paragraphs=[];
        if (paragraphs) {
            for (let paragraphSpec of paragraphs) {
                this.createParagraph(paragraphSpec);
            }
        }
        this.onEvent("click", event=>{
            action && action(this)
        });
    }

    createParagraph(paragraphSpec) {
        let paragraph = new CBSParagraph(paragraphSpec);
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
            ref: this.ref,
            title: this._title.getText(),
            paragraphs: this._paragraphs.map(paragraph=>paragraph.specification),
        };
        if (this._votes) specification.votes = this._votes.specification;
        return specification;
    }

    set specification(specification) {
        this._title.setText(specification.article.title);
        for (let paragraph of this._paragraphs) {
            this.remove(paragraph);
        }
        this._paragraphs = [];
        for (let paragraphSpec of specification.article.paragraphs) {
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

    addParagraph({img, image, title, description}, article, left) {
        if (image) {
            article.add(image);
        }
        else {
            image = new Img(img).addClass("paragraph-image");
            article.add(image);
        }
        image.addClass(left ? "image-on-left" : "image-on-right");
        article.add(new P(title).addClass("paragraph-title"));
        if (Array.isArray(description)) {
            for (let descriptionLine of description) {
                let line = new P(descriptionLine).addClass("paragraph-line");
                article.add(line);
            }
        }
        else {
            article.add(new P(description).addClass("paragraph-line"));
        }
    }

    addArticle({title, paragraphs, votes}) {
        let article = new Div().addClass(("article-container"));
        this._content.add(article);
        article.add(new P(title).addClass("article-title"));
        let left = true;
        for (let paragraph of paragraphs) {
            this.addParagraph(paragraph, article, left);
            left = !left;
        }
        let voteContainer = new Div().addClass("votes-container");
        voteContainer.add(new CBSVotes(votes))
        article.add(voteContainer);
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

}

export class CBSArticleEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="article-editor", accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._articleTitle = new VInputField({
            ref:"article-title-input", label:"Article Title",
            onInput: event=>{
                this._article.title = this._articleTitle.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._articleTitle);
        this._category = new VSelectField({ref:"article-theme", label:"Themes",
            multiple: true, size: 4,
            options: [
                {ref: "theme-rules", value: "Rules", text:"Rule"},
                {ref: "theme-strategy", value: "Strategy", text:"Stories And Legends"},
                {ref: "theme-magic", value: "Magic", text:"Magic"},
                {ref: "theme-siege", value: "Siege", text:"Siege"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._category);
        this._paragraphTitle = new VInputField({
            ref:"paragraph-title-input", label:"Paragraph Title",
            onInput: event=>{
                this._paragraph.title = this._paragraphTitle.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._paragraphTitle);
        this._imageLoader = new VFileLoaderField({
            ref:"paragraph-image", label:"Image",
            accept, verify,
            onInput: event=>{
                this._paragraph.image = this._imageLoader.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._imageLoader);
        this._imagePos = new VSwitch({ref:"paragraph-image-pos", kind:"paragraph-position",
            options:[
                {title: "left", value: "left"}, {title:"center", value:"center"}, {title:"right", value:"right"}
            ],
            onInput:event=>{
                this._paragraph.imgPos = this._imagePos.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._imagePos);
        this._description = new VInputTextArea({
            ref:"paragraph-content-input", label:"Description",
            onInput: event=>{
                this._paragraph.description = this._description.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._send = new VButton({ref: "propose-article", label:"Propose", type:"accept"});
        this.addOnRight(this._send);
        this._newParagraphSpecs = {imgPos: "center", title: "Title", description: "Description"};
    }

    canLeave(leave, notLeave) {
        return super.canLeave(leave, notLeave, "Article not saved. Do you want to Quit ?")
    }

    set article(articleSpec) {
        if (this._article) {
            this.removeFromLeft(this._article);
        }
        this._article = new CBSArticle({
            ref: articleSpec.ref,
            title: articleSpec.title
        });
        for (let paragraphSpec of articleSpec.paragraphs) {
            this.createParagraph(paragraphSpec);
        }
        this._article.paragraphs[0] && this._selectParagraph(this._article.paragraphs[0]);
        this.addOnLeft(this._article);
        this._clean();
        this._memorize();
    }

    _register() {
        return {
            current: this._paragraph.ref.ref,
            themes: this._category.values,
            article: this._article.specification
        }
    }

    _recover(specification) {
        if (specification) {
            this._article.specification = specification;
            for (let paragraph of this._article.paragraphs) {
                paragraph.action = event => {
                    this.selectParagraph(paragraph);
                    return true;
                }
            }
            this._articleTitle.value = this._article.title;
            this._category.values = specification.themes;
            let paragraph = this._article.getParagraph(specification.current);
            this._selectParagraph(paragraph);
        }
    }

    createParagraph(paragraphSpec) {
        let paragraph = this._article.createParagraph({
            ...paragraphSpec,
            action: event => {
                this.selectParagraph(paragraph);
                return true;
            }
        });
        return paragraph;
    }

    selectParagraph(paragraph) {
        if (paragraph!==this._paragraph) {
            this._selectParagraph(paragraph);
            this._memorize();
        }
    }

    _selectParagraph(paragraph) {
        this._unselectParagraph();
        this._paragraph = paragraph;
        this._paragraph.addClass("selected");
        this._articleTitle.value = this._article.title;
        this._paragraphTitle.value = this._paragraph.title;
        this._description.value = this._paragraph.description;
        this._imageLoader.imageSrc = this._paragraph.image;
        this._imagePos.value = this._paragraph.imgPos;
        this._deleteCommand = new VCommand({
            ref:"paragraph-delete-cmd",
            imgEnabled: `../images/site/buttons/minus.png`,
            imgDisabled: `../images/site/buttons/minus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._deleteParagraph();
            }
        }).addClass("delete-command");
        this._paragraph.add(this._deleteCommand);
        this._insertBeforeCommand = new VCommand({
            ref: "paragraph-insert-before-cmd",
            imgPos: "center",
            imgEnabled: `../images/site/buttons/plus.png`,
            imgDisabled: `../images/site/buttons/plus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._createBefore();
            }
        }).addClass("insert-before-command");
        this._paragraph.add(this._insertBeforeCommand);
        this._insertAfterCommand = new VCommand({
            ref:"paragraph-insert-after-cmd",
            imgEnabled: `../images/site/buttons/plus.png`,
            imgDisabled: `../images/site/buttons/plus-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._createAfter();
            }
        }).addClass("insert-after-command");
        this._paragraph.add(this._insertAfterCommand);
        this._goUpCommand = new VCommand({
            ref: "paragraph-goup-cmd",
            imgEnabled: `../images/site/buttons/goup.png`,
            imgDisabled: `../images/site/buttons/goup-disabled.png`,
            onClick: event => {
                event.stopPropagation();
                return this._goUp();
            }
        }).addClass("goup-command");
        this._paragraph.add(this._goUpCommand);
        this._goDownCommand = new VCommand({
            ref: "paragraph-godown-cmd",
            imgEnabled: `../images/site/buttons/godown.png`,
            imgDisabled: `../images/site/buttons/godown-disabled.png`,
            onClick: event=>{
                event.stopPropagation();
                return this._goDown();
            }
        }).addClass("godown-command");
        this._paragraph.add(this._goDownCommand);
        this._updateGoCommands();
    }

    _updateGoCommands() {
        this._goUpCommand.enabled = this._article.paragraphs.indexOf(this._paragraph)!==0;
        this._goDownCommand.enabled = this._article.paragraphs.indexOf(this._paragraph)<this._article.paragraphs.length-1;
    }

    _unselectParagraph() {
        if (this._paragraph) {
            this._paragraph.removeClass("selected");
            this._paragraph.remove(this._deleteCommand);
            this._paragraph.remove(this._goUpCommand);
            this._paragraph.remove(this._goDownCommand);
            this._paragraph.remove(this._insertBeforeCommand);
            this._paragraph.remove(this._insertAfterCommand);
        }
    }

    _goUp() {
        let index = this._article.paragraphs.indexOf(this._paragraph);
        if (index>0) {
            this._article.exchangeParagraphs(this._paragraph);
        }
        this._updateGoCommands();
        return true;
    }

    _goDown() {
        let index = this._article.paragraphs.indexOf(this._paragraph);
        if (index+1<this._article.paragraphs.length) {
            this._article.exchangeParagraphs(this._article.paragraphs[index+1]);
        }
        this._updateGoCommands();
        return true;
    }

    _createBefore() {
        let paragraph = this._article.insertParagraph({
            ref: crypto.randomUUID(),
            ...this._newParagraphSpecs,
            action: event => {
                this.selectParagraph(paragraph);
                return true;
            }
        }, this._paragraph);
        this._selectParagraph(paragraph);
        this._updateGoCommands();
        this._memorize();
        return true;
    }

    _createAfter() {
        let index = this._article.paragraphs.indexOf(this._paragraph);
        if (index === this._article.paragraphs.length-1) {
            let paragraph = this.createParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs
            });
            this._selectParagraph(paragraph);
        }
        else {
            let paragraph = this._article.insertParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs,
                action: event => {
                    this.selectParagraph(paragraph);
                    return true;
                }
            }, this._article.paragraphs[index+1]);
            this._selectParagraph(paragraph);
        }
        this._updateGoCommands();
        this._memorize();
        return true;
    }

    _deleteParagraph() {
        let index = this._article.paragraphs.indexOf(this._paragraph);
        this._article.removeParagraph(index);
        if (this._article.paragraphs.length===0) {
            let paragraph = this.createParagraph({
                ref: crypto.randomUUID(),
                ...this._newParagraphSpecs
            });
            this._selectParagraph(paragraph);
        }
        else {
            this._selectParagraph(this._article.paragraphs[index]);
        }
        this._updateGoCommands();
        this._memorize();
        return true;
    }

}
