'use strict'

import {
    VInputField, VList, VLine, VModal, VApp, VSelectField, VInputTextArea, VButtons, VDisplay,
    VLink, VRow, VContainer, VWall, VSearch
} from "./vitamins.js";

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
                console.log("write !");
                VApp.instance.add(this._writeToUsModal);
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
        console.log("show !");
        VApp.instance.add(this._legalNoticeModal);
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