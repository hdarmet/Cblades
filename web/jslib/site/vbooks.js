'use strict'

import {
    Div, Img, P, Span
} from "./components.js";
import {
    Undoable,
    VImage,
    Vitamin,
    VMagnifiedImage,
    VSearch,
} from "./vitamins.js";
import {
    VContainer,
    VSplitterPanel,
    VWall
} from "./vcontainer.js";
import {
    VButton, VButtons, VCommand,
    VFileLoaderField,
    VInputField, VInputTextArea,
    VSelectField,
    VSwitch
} from "./vforms.js";

export class VSummary extends Vitamin(Div) {

    constructor({ref, img, width, title, description}) {
        super({ref});
        this.addClass("gallery-summary");
        this._divImage = new Div();
        this._image = new Img(img).setWidth(width).addClass("gallery-summary-image");
        this._divImage.add(this._image);
        this.add(this._divImage);
        this._content = new Div().addClass("gallery-summary-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-summary-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-summary-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-summary-line");
            this._content.add(this._description);
        }
    }

}

export class VCard extends Vitamin(Div) {

    constructor({ref, img, image, width, title, description, button, action}) {
        super({ref});
        this.addClass("gallery-card");
        if (image) {
            this._image = image;
        }
        else {
            this._image = new VImage({ref:ref+"-image", img, kind:"gallery-card-image", width});
        }
        this.add(this._image);
        this._content = new Div().addClass("gallery-card-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-card-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-card-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-card-line");
            this._content.add(this._description);
        }
        if (button) {
            this._button = new VButton({
                ref: ref + "-button",
                label: button,
                type: VButton.TYPES.ACCEPT,
                onClick: action
            });
            this._content.add(new Span().add(this._button).addClass("gallery-card-button"));
        }
    }

}

export class VGallery extends Vitamin(Div) {

    constructor({ref, card=VCard, kind="gallery-vertical"}, builder) {
        super({ref});
        this._cardClass = card;
        this.addClass("gallery-row");
        kind&&this.addClass(kind);
        this._cards = [];
        builder&&builder(this);
    }

    addCard({card, ...params}) {
        let aCard = card ? card : new this._cardClass({...params});
        aCard._envelope = new Div().addClass("gallery-column");
        aCard._envelope.add(aCard);
        this.add(aCard._envelope);
        this._cards.push(aCard);
        return this;
    }

    clearCards() {
        for (let card of this._cards) {
            this.remove(card._envelope);
        }
        this._cards = [];
    }
}

export class VParagraph extends Vitamin(Div) {

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

export class VVotes extends Vitamin(Div) {

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

export class VArticle extends Vitamin(Div) {

    constructor({ref, kind = "article", title, paragraphs, votes, action}) {
        super({ref});
        this.addClass(kind);
        this._title = new P(title).addClass("article-title");
        this.add(this._title);
        if (votes) {
            this._votes = new VVotes(votes);
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
        let paragraph = new VParagraph(paragraphSpec);
        this.add(paragraph);
        this._paragraphs.push(paragraph);
        return paragraph;
    }

    insertParagraph(paragraphSpec, before) {
        let index = this._paragraphs.indexOf(before);
        let paragraph = new VParagraph(paragraphSpec);
        this._paragraphs.splice(index, 0, paragraph);
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

export class VTheme extends Vitamin(Div) {

    constructor({ref, title, img, description, action}) {
        super({ref});
        this.addClass("theme");
        this._header = new Div().addClass("theme-header");
        this.add(this._header);
        this._image = new VImage({ref:this.ref+"-image", kind:"theme-image", img});
        this._image && this._header.add(this._image);
        this._title = new P(title).addClass("theme-title");
        this._header.add(this._title);
        this._description = new P(description).addClass("theme-description");
        this.add(this._description);
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
        if (this._image) this._header.remove(this._image);
        this._image = new VImage({ref:this.ref+"-image", kind:"theme-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._description.setText(specification.description);
        this._image.setSrc(specification.img);
    }

}

export class VMap extends Vitamin(Div) {

    constructor({ref, title, img, description, action}) {
        super({ref});
        this.addClass("map");
        this._header = new Div().addClass("map-header");
        this.add(this._header);
        this._title = new P(title).addClass("map-title");
        this._header.add(this._title);
        this._image = new VMagnifiedImage({ref:this.ref+"-image", kind:"map-image", img});
        this._image && this._header.add(this._image);
        this._description = new P(description).addClass("map-description");
        this.add(this._description);
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
        this._image = new VImage({ref:this.ref+"-image", kind:"theme-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            description: this._description.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._description.setText(specification.description);
        this._image.setSrc(specification.img);
    }

}

export class VScenario extends Vitamin(Div) {

    constructor({ref, title, img, image, story, victory, specialRules, action}) {
        super({ref});
        this.addClass("scenario");
        this._header = new Div().addClass("scenario-header");
        this.add(this._header);
        this._title = new P(title).addClass("scenario-title");
        this._header.add(this._title);
        this._image = new VMagnifiedImage({ref:this.ref+"-image", kind:"scenario-image", img});
        this._image && this._header.add(this._image);
        this._content = new Div().addClass("scenario-content");
        this.add(this._content);
        this._storyTitle = new P("Story").addClass("scenario-story-title");
        this._content.add(this._storyTitle);
        this._story = new P(story).addClass("scenario-story");
        this._content.add(this._story);
        this._victoryTitle = new P("Victory Conditions").addClass("scenario-victory-title");
        this._content.add(this._victoryTitle);
        this._victory = new P(victory).addClass("scenario-victory");
        this._content.add(this._victory);
        this._specialRulesTitle = new P("Special Rules").addClass("scenario-special-rules-title");
        this._content.add(this._specialRulesTitle);
        this._specialRules = new P(specialRules).addClass("scenario-special-rules");
        this._content.add(this._specialRules);
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

    get story() {
        return this._story.getText();
    }

    set story(story) {
        this._story.setText(story);
    }

    get victory() {
        return this._victory.getText();
    }

    set victory(victory) {
        this._victory.setText(victory);
    }

    get specialRules() {
        return this._specialRules.getText();
    }

    set specialRules(specialRules) {
        this._specialRules.setText(specialRules);
    }

    get image() {
        return this._image ? this._image.src : null;
    }

    set image(img) {
        this._image = new VImage({ref:this.ref+"-image", kind:"scenario-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            story: this._story.getText(),
            victory: this._victory.getText(),
            specialRules: this._specialRules.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._image.setSrc(specification.img);
        this._story.setText(specification.story);
        this._victory.setText(specification.victory);
        this._specialRules.setText(specification.specialRules);
    }

}

export class VNewspaper extends Vitamin(Div) {

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
        voteContainer.add(new VVotes(votes))
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

export class VWallWithSearch extends VContainer {

    constructor({ref, kind="wall-vertical", searchAction}, builder) {
        super({ref});
        this.addClass(kind);
        this._search = new VSearch({ref:ref+"_search", searchAction});
        this.add(this._search);
        this._wall = new VWall({ref:ref+"-content", kind:kind+"-content"}, builder);
        this.add(this._wall);
    }

    setLoadNotes(action) {
        this._wall.setLoadNotes(action);
        return this;
    }
}

export class VThemeEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="theme-editor", accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._category = new VSelectField({ref:"theme-category", label:"Category",
            options: [
                {ref: "category-game", value: "game", text:"About The Game"},
                {ref: "category-legends", value: "legends", text:"Stories And Legends"},
                {ref: "category-examples", value: "examples", text:"Play Examples"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._category);
        this._title = new VInputField({
            ref:"theme-title-input", label:"Title",
            onInput: event=>{
                this._theme.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._imageLoader = new VFileLoaderField({
            ref:"theme-image", label:"Image",
            accept, verify,
            onInput: event=>{
                this._theme.image = this._imageLoader.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._imageLoader);
        this._description = new VInputTextArea({
            ref:"theme-content-input", label:"Description",
            onInput: event=>{
                this._theme.description = this._description.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._description);
        this._send = new VButton({ref: "propose-theme", label:"Propose", type:"accept"});
        this.addOnRight(this._send);
    }

    set theme(specification) {
        if (this._theme) {
            this.removeFromLeft(this._theme);
        }
        this._theme = new VTheme({
            ...specification
        });
        this.addOnLeft(this._theme);
        this._editTheme();
        this._clean();
        this._memorize();
    }

    _editTheme() {
        this._title.value = this._theme.title;
        this._description.value = this._theme.description;
        this._imageLoader.imageSrc = this._theme.image;
    }

    _register() {
        let specification = this._theme.specification;
        specification.category = this._category.value;
        return specification;
    }

    _recover(specification) {
        if (specification) {
            this._theme.specification = specification;
            this._category.value = specification.category;
            this._editTheme();
        }
    }

}

export class VArticleEditor extends Undoable(VSplitterPanel) {

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

    set article(articleSpec) {
        if (this._article) {
            this.removeFromLeft(this._article);
        }
        this._article = new VArticle({
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

export class VMapEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="map-editor", accept, verify, onEdit, onPropose}) {
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
        this._send = new VButtons({ref: "map-buttons", vertical:false, buttons:[
                {
                    ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                    onClick:event=>{
                        this._onEdit();
                    }
                },
                {
                    ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                    onClick:event=>{
                        this._onPropose();
                    }
                }
            ]});
        this.addOnRight(this._send);
        this._onEdit = onEdit;
        this._onPropose = onPropose;
    }

    set map(map) {
        this._title.value = map.title;
        this._description.value = map.description;
        this._imageLoader.imageSrc = map.img;
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

export class VScenarioEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="scenario-editor", onEdit, onPropose}) {
        super({ref});
        this.addClass(kind);
        this._title = new VInputField({
            ref:"map-title-input", label:"Title",
            onInput: event=>{
                this._scenario.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._story = new VInputTextArea({
            ref:"scenario-story-input", label:"Story",
            onInput: event=>{
                this._scenario.story = this._story.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._story);
        this._victory = new VInputTextArea({
            ref:"scenario-victory-input", label:"Victory Conditions",
            onInput: event=>{
                this._scenario.victory = this._victory.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._victory);
        this._specialRules = new VInputTextArea({
            ref:"scenario-special-rules-input", label:"Special Rules",
            onInput: event=>{
                this._scenario.specialRules = this._specialRules.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._specialRules);
        this._send = new VButtons({ref: "scenario-buttons", vertical:false, buttons:[
                {
                    ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                    onClick:event=>{
                        this._onEdit();
                    }
                },
                {
                    ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                    onClick:event=>{
                        this._onPropose();
                    }
                }
            ]});
        this.addOnRight(this._send);
        this._onEdit = onEdit;
        this._onPropose = onPropose;
    }

    set scenario(scenarioSpec) {
        if (this._scenario) {
            this.removeFromLeft(this._scenario);
        }
        this._scenario = new VScenario(scenarioSpec);
        this.addOnLeft(this._scenario);
        this._editScenario();
        this._clean();
        this._memorize();
    }

    _editScenario() {
        this._title.value = this._scenario.title;
        this._story.value = this._scenario.story;
        this._victory.value = this._scenario.victory;
        this._specialRules.value = this._scenario.specialRules;
    }

    _register() {
        return {
            title: this._title.value,
            story: this._story.value,
            victory: this._victory.value,
            specialRules: this._specialRules.value
        }
    }

    _recover(specification) {
        if (specification) {
            this._title.value = specification.title;
            this._story.value = specification.story;
            this._victory.value = specification.victory;
            this._specialRules.value = specification.specialRules;
        }
    }

    openInNewTab(url) {
        window.open(url, '_blank').focus();
    }
}