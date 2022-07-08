'use strict'

import {
    VInputField,
    VList,
    VLine,
    VModal,
    VApp,
    VSelectField,
    VInputTextArea,
    VButtons,
    VDisplay,
    VLink,
    VRow,
    VContainer,
    VWall,
    VSearch,
    VButton,
    VTheme,
    VFileLoaderField,
    VMessageHandler,
    VArticle, VSwitch, VCommand, VSplitterPanel, VConfirmHandler
} from "./vitamins.js";
import {
    UndoRedo
} from "./components.js";

export class CVMessage extends VModal {

    constructor(message) {
        super({ref: CVMessage.MESSAGE_REF});
        this.addClass("message-modal");
        this._display = new VDisplay({ref:"message-display"});
        this.addContainer({ref:"message-display-container", columns:1},$=>$
            .addField({field: this._display})
        );
    }

    show({title, message}) {
        this.title = title;
        this._display.content = message;
        VApp.instance.register(this);
        super.show();
    }

    static MESSAGE_REF = "message";

    static onMessageEmitted({title, message}) {
        new CVMessage().show({title, message});
    }

}
VMessageHandler.addMessageListener(CVMessage);

export class CVConfirm extends VModal {

    constructor() {
        super({ref: CVConfirm.CONFIRM_REF});
        this.addClass("confirm-modal");
        this._display = new VDisplay({ref:"confirm-display"});
        this.addContainer({ref:"confirm-display-container", columns:1},$=>$
            .addField({field: this._display})
            .addField({field: new VButtons({ref: "confirm-buttons", verical:false, buttons:[
                {
                    ref:"confirm-ok", type: VButton.TYPES.ACCEPT, label:"Ok",
                    onClick:event=>{
                        this._actionOk();
                        this.hide();
                    }
                },
                {
                    ref:"confirm-cancel", type: VButton.TYPES.REFUSE, label:"Cancel",
                    onClick:event=>{
                        this._actionCancel();
                        this.hide();
                    }
                }
            ]})})
        );
    }

    show({title, message, actionOk, actionCancel}) {
        this.title = title;
        this._display.content = message;
        this._actionOk = actionOk;
        this._actionCancel = actionCancel;
        VApp.instance.register(this);
        super.show();
    }

    static CONFIRM_REF = "confirm";

    static onConfirmEmitted({title, message, actionOk, actionCancel}) {
        new CVConfirm().show({title, message, actionOk, actionCancel});
    }

}
VConfirmHandler.addMessageListener(CVConfirm);

export class CVContact extends VList {
    constructor({address, phone, email, writeToUs}) {
        super({ref: CVContact.CONTACT_REF});
        this._address = new VLine({ref:"contact-address", text:address})
            .addClass("contact-address-dot");
        this._phone = new VLine({ref:"contact-phone", text:phone})
            .addClass("contact-phone-dot");
        this._email = new VLine({ref:"contact-email", text:email, url:"mailto: "+email})
            .addClass("contact-email-dot");
        this._writeToUs = new VLine({ref:"contact-writetous", text:writeToUs,
            action: ()=>{
                VApp.instance.register(this._writeToUsModal);
                this._writeToUsModal.show();
            }
        }).addClass("contact-writetous-dot");
        this.addLine({field: this._address});
        this.addLine({field: this._phone});
        this.addLine({field: this._email});
        this.addLine({field: this._writeToUs});
        this._writeToUsModal = new CVWriteToUs();
    }

    static CONTACT_REF = "contact-form";
}

export class CVWriteToUs extends VModal {

    constructor() {
        super({ref: CVWriteToUs.WRITE_TO_US_REF, title: CVWriteToUs.WRITE_TO_US_TITLE});
        this._firstName = new VInputField({ref:"contact-firstname", label:"First Name"});
        this._lastName = new VInputField({ref:"contact-lastname", label:"Last Name"});
        this._email = new VInputField({ref:"contact-email", label:"EMail"});
        this._country = new VSelectField({ref:"contact-country", label:"Country",
            options: [
                {ref: "country-fr", value: "fr", text:"France"},
                {ref: "country-it", value: "it", text:"Italy"},
                {ref: "country-sp", value: "sp", text:"Spain"},
                {ref: "country-ge", value: "ge", text:"Germany"}
            ]
        });
        this._subject = new VSelectField({ref:"contact-subject", label:"Subject",
            options: [
                {ref: "subject-rule", value: "rule", text:"The Rules"},
                {ref: "subject-material", value: "material", text:"The Material"},
                {ref: "subject-sceanrii", value: "scenarii", text:"The Scenarios"},
                {ref: "subject-others", value: "others", text:"Others"}
            ]
        });
        this._message = new VInputTextArea({ref:"contact-message", label:"Message"});
        this.addContainer({ref:"writetous-identity", columns:2},$=>$
            .addField({field: this._firstName})
            .addField({field: this._lastName})
            .addField({field: this._email})
            .addField({field: this._country})
            .addField({field: this._subject})
        );
        this.addContainer({ref:"writetous-message", columns:1},$=>$
            .addField({field: this._subject})
            .addField({field: this._message})
            .addField({field:new VButtons({ref: "buttons", buttons:[
                        {ref:"send-message", type:"accept", label:"Send",
                            onClick:event=>console.log("Validate")}
                    ]}
                )}
            )
        );
    }

    static WRITE_TO_US_REF = "write-to-us";
    static WRITE_TO_US_TITLE = "Write To Us";
}

export class CVLegalNotice extends VList {
    constructor({
        legalNotice,
        privateLifePolicy,
        cookiesManagement,
        usagePolicy,
        contributions
    }) {
        super({ref: CVContact.LEGAL_NOTICE_REF});
        if (legalNotice) {
            this._legalNotice = new VLine({ref: "legal-notice", text: legalNotice.label,
                action:()=>this.showArticle(legalNotice.title, legalNotice.content)})
                .addClass("legal-notice-dot");
            this.addLine({field: this._legalNotice});
        }
        if (privateLifePolicy) {
            this._privateLifePolicy = new VLine({ref: "legal-privacy", text: privateLifePolicy.label,
                action:()=>this.showArticle(privateLifePolicy.title, privateLifePolicy.content)})
                .addClass("legal-notice-dot");
            this.addLine({field: this._privateLifePolicy});
        }
        if (cookiesManagement) {
            this._cookiesManagement = new VLine({ref: "legal-cookie", text: cookiesManagement.label,
                action:()=>this.showArticle(cookiesManagement.title, cookiesManagement.content)})
                .addClass("legal-notice-dot");
            this.addLine({field: this._cookiesManagement});
        }
        if (usagePolicy) {
            this._usagePolicy = new VLine({ref: "legal-usage", text: usagePolicy.label,
                action:()=>this.showArticle(usagePolicy.title, usagePolicy.content)})
                .addClass("legal-notice-dot");
            this.addLine({field: this._usagePolicy});
        }
        if (contributions) {
            this._contributions = new VLine({ref: "legal-contributions", text: contributions.label,
                action:()=>this.showArticle(contributions.title, contributions.content)})
                .addClass("legal-notice-dot");
            this.addLine({field: this._contributions});
        }
        this._legalNoticeModal = new CVArticleDisplay();
    }

    showArticle(title, content) {
        console.log("show")
        VApp.instance.register(this._legalNoticeModal);
        this._legalNoticeModal.show(title, content);
    }

    static LEGAL_NOTICE_REF = "legal-form";
}

export class CVArticleDisplay extends VModal {

    constructor() {
        super({ref: CVWriteToUs.ARTICLE_DISPLAY_REF});
        this._display = new VDisplay({ref:"article-display"});
        this.addContainer({ref:"article-display-container", columns:1},$=>$
            .addField({field: this._display})
        );
    }

    show(title, content) {
        this.title = title;
        this._display.content = content;
        super.show();
    }

    static ARTICLE_DISPLAY_REF = "article-display";
}

export class CVPartnerships extends VList {
    constructor(partners) {
        super({ref: CVContact.PARTNERSHIP_REF});
        for (let partner in partners) {
            this["_"+partner] = new VLine({
                ref: "partnership", text: partners[partner].label,
                url: "//"+partners[partner].url
            }).addClass("partnership-dot");
            this.addLine({field: this["_"+partner]});
        }
    }

    gotoPartnership(url) {
        console.log("show !");
    }

    static PARTNERSHIP_REF = "legal-form";
}

export class CVSocialRow extends VRow {
    constructor(medias) {
        super({ref: CVSocialRow.PARTNERSHIP_REF}).addClass("social-row");
        for (let media in medias) {
            this.add(new VLink({ref: "social-"+media, url: "//"+medias[media].url}).addClass("fa fa-"+media));
        }
    }

    static PARTNERSHIP_REF = "social-row";
}

export class CVWall extends VContainer {

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

export class VCThemeEditor extends VSplitterPanel {

    constructor({ref, kind="theme-editor", accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._category = new VSelectField({ref:"theme-category", label:"Category",
            options: [
                {ref: "category-game", value: "game", text:"About The Game"},
                {ref: "category-legends", value: "legends", text:"Stories And Legends"},
                {ref: "category-examples", value: "examples", text:"Play Examples"}
            ]
        });
        this.addOnRight(this._category);
        this._title = new VInputField({
            ref:"theme-title-input", label:"Title",
            onInput: event=>{
                this._theme.title = this._title.value;
            }
        });
        this.addOnRight(this._title);
        this._imageLoader = new VFileLoaderField({
            ref:"theme-image", label:"Image",
            accept, verify,
            onInput: event=>{
                this._theme.image = this._imageLoader.imageSrc;
            }
        });
        this.addOnRight(this._imageLoader);
        this._description = new VInputTextArea({
            ref:"theme-content-input", label:"Description",
            onInput: event=>{
                this._theme.description = this._description.value;
            }
        });
        this.addOnRight(this._description);
        this._send = new VButton({ref: "propose-theme", label:"Propose", type:"accept"});
        this.addOnRight(this._send);
        this._theme = new VTheme({
            ref: "theme1", title: "Bla bla bla", img: `../images/site/themes/rules.png`,
            description: "bla bla bla"
        });
        this.addOnLeft(this._theme);
    }

}

export class VCArticleEditor extends VSplitterPanel {

    constructor({ref, kind="article-editor", accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._articleTitle = new VInputField({
            ref:"article-title-input", label:"Article Title",
            onInput: event=>{
                this._memorize(this._articleTitle);
                this._article.title = this._articleTitle.value;
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
                this._memorize(this._category);
            }
        });
        this.addOnRight(this._category);
        this._paragraphTitle = new VInputField({
            ref:"paragraph-title-input", label:"Paragraph Title",
            onInput: event=>{
                this._memorize(this._paragraphTitle);
                this._paragraph.title = this._paragraphTitle.value;
            }
        });
        this.addOnRight(this._paragraphTitle);
        this._imageLoader = new VFileLoaderField({
            ref:"paragraph-image", label:"Image",
            accept, verify,
            onInput: event=>{
                this._memorize(this._imageLoader);
                this._paragraph.image = this._imageLoader.imageSrc;
            }
        });
        this.addOnRight(this._imageLoader);
        this._imagePos = new VSwitch({ref:"paragraph-image-pos", kind:"paragraph-position",
            options:[
                {title: "left", value: "left"}, {title:"center", value:"center"}, {title:"right", value:"right"}
            ],
            onInput:event=>{
                this._memorize(this._imagePos);
                this._paragraph.imgPos = this._imagePos.value;
            }
        });
        this.addOnRight(this._imagePos);
        this._description = new VInputTextArea({
            ref:"paragraph-content-input", label:"Description",
            onInput: event=>{
                this._memorize();
                this._paragraph.description = this._description.value;
            },
            onChange: event=>{
                delete this._memorized;
            }
        });
        this.addOnRight(this._description);
        this._send = new VButton({ref: "propose-article", label:"Propose", type:"accept"});
        this.addOnRight(this._send);

        this._article = new VArticle({
            ref: "article", title: "Bla bla bla"
        });
        this.createParagraph({
            ref: "paragraph1", title: "Bla bla bla", imgPos:"left", img: `../images/site/factions/orcs.png`,
            description: "bla bla bla"
        });
        this.createParagraph({
            ref: "paragraph2", title: "Bla bla bla", imgPos:"right", img: `../images/site/factions/roughneck.png`,
            description: "bla bla bla"
        });
        this._selectParagraph(this._article.paragraphs[0]);
        this.addOnLeft(this._article);
        this._newParagraphSpecs = {imgPos: "center", title: "Title", description: "Description"};
        this._clean();
    }

    _isDirty() {
        return this._undos && this._undos.length>0;
    }

    _clean() {
        this._undos = [];
        this._redos = [];
    }

    onActivate() {
        UndoRedo.addListener(this);
    }

    onDesactivate() {
        UndoRedo.removeListener(this);
    }

    _memorize(component) {
        if (!component || this._memorized!==component) {
            console.log("memo")
            this._undos.push({
                current: this._paragraph.ref.ref,
                themes: this._category.value,
                article: this._article.specification
            });
            this._redos = [];
            this._memorized = component;
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
            let paragraph = this._article.getParagraph(specification.current);
            this._selectParagraph(paragraph);
        }
    }

    undo() {
        console.log("undo");
        this._redos.push({current: this._paragraph.ref.ref, article:this._article.specification});
        let specification = this._undos.pop();
        this._recover(specification);
    }

    redo() {
        console.log("redo");
        this._undos.push({current: this._paragraph.ref.ref, article:this._article.specification});
        let specification = this._redos.pop();
        this._recover(specification);
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
            this._memorize(null);
            this._selectParagraph(paragraph);
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
        this._memorize(null);
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
        return true;
    }

    _createAfter() {
        this._memorize(null);
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
        return true;
    }

    _deleteParagraph() {
        this._memorize(null);
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
        return true;
    }

    canLeave(leave) {
        if (this._isDirty()) {
            VConfirmHandler.emit({
                title: "Confirm", message: "Article not saved. Do you want to Quit ?",
                actionOk: () => {
                    this._clean();
                    leave();
                },
                actionCancel: () => {
                    this._clean();
                    leave();
                }
            })
            return false;
        }
        return true;
    }
}

