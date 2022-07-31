'use strict'

import {
    VList,
    VLine,
    VModal,
    VDisplay,
    VLink,
    VRow,
    VMessageHandler,
    VConfirmHandler,
    VMessage,
} from "./vitamins.js";
import {
    VInputField,
    VSelectField,
    VInputTextArea,
    VButtons,
    VButton,
    VPasswordField,
    mandatory,
    matchesEmail, matchesName, matchesPassword, matchesLogin, or, and, isValid, VFormContainer
} from "./vforms.js";

export class CVMessage extends VModal {

    constructor(message) {
        super({ref: CVMessage.MESSAGE_REF});
        this.addClass("message-modal");
        this._display = new VDisplay({ref:"message-display"});
        this.addContainer({
                ref: "message-display-container",
                container: new VFormContainer({columns: 1})
                    .addField({field: this._display})
            }
        );
    }

    show({title, message}) {
        this.title = title;
        this._display.content = message;
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
        this.addContainer({
            ref: "confirm-display-container",
            container: new VFormContainer({columns: 1})
                .addField({field: this._display})
                .addField({
                    field: new VButtons({
                        ref: "confirm-buttons", verical: false, buttons: [
                            {
                                ref: "confirm-ok", type: VButton.TYPES.ACCEPT, label: "Ok",
                                onClick: event => {
                                    this._actionOk();
                                    this.hide();
                                }
                            },
                            {
                                ref: "confirm-cancel", type: VButton.TYPES.REFUSE, label: "Cancel",
                                onClick: event => {
                                    this._actionCancel();
                                    this.hide();
                                }
                            }]
                    })
                })
            }
        );
    }

    show({title, message, actionOk, actionCancel}) {
        this.title = title;
        this._display.content = message;
        this._actionOk = actionOk;
        this._actionCancel = actionCancel;
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
        this.addContainer({
            ref: "writetous-identity",
            container: new VFormContainer({columns: 2})
                .addField({field: this._firstName})
                .addField({field: this._lastName})
                .addField({field: this._email})
                .addField({field: this._country})
                .addField({field: this._subject})
            }
        );
        this.addContainer({
            ref: "writetous-message",
            container: new VFormContainer({columns: 1})
                .addField({field: this._subject})
                .addField({field: this._message})
                .addField({
                    field: new VButtons({
                        ref: "buttons", buttons: [
                            {
                                ref: "send-message", type: "accept", label: "Send",
                                onClick: event => console.log("Validate")
                            }
                        ]
                    })
                })
            }
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
        this._legalNoticeModal.show(title, content);
    }

    static LEGAL_NOTICE_REF = "legal-form";
}

export class CVArticleDisplay extends VModal {

    constructor() {
        super({ref: CVWriteToUs.ARTICLE_DISPLAY_REF});
        this._display = new VDisplay({ref:"article-display"});
        this.addContainer({
            ref: "article-display-container",
            container: new VFormContainer({columns: 1})
                .addField({field: this._display})
            }
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

export class VCLogin extends VModal {

    constructor({connect}) {
        super({"ref":"login", "title":"Connection"});
        this._connect = connect;
        this.addClass("login");
        this._loginField = new VInputField({
            ref:"login", label:"Login", value:"My name",
            validate: mandatory({
                validate: or({
                    message: "Enter login or email",
                    validators: [
                        matchesLogin({}), matchesEmail({})
                    ]
                })
            }),
            onInput:event=>{
                this._forgottenMessage.message = "";
                this.get("Signin").enabled = !!this._loginField.value && !!this._passwordField.value;
            }
        });
        this._passwordField = new VPasswordField({
            ref:"password", label:"Password", value:"P@ssW0rd",
            validate: mandatory({validate: matchesPassword({})}),
            onInput:event=>{
                this._forgottenMessage.message = "";
                this.get("Signin").enabled = !!this._loginField.value && !!this._passwordField.value;
            }
        });
        this._forgottenMessage = new VMessage({ref:"forgotMsg"});
        this._passwordForgotten = new VLink({
            ref:"forgotPsw", text:"Forgot Password ?",
            onClick:event=>{
                this._forgottenMessage.message = "Message sent to your email address";
            }
        });
        this._signInContainer = new VFormContainer({ref:"signin", columns:1},$=>{$
            .addField({field: this._loginField})
            .addField({field: this._passwordField})
            .addField({field: this._forgottenMessage})
            .addField({field: this._passwordForgotten})
            .addField({field:new VButtons({ref: "buttons", buttons:[
                {
                    ref:"Signin", type:"accept", enabled:false, label:"Sign In",
                    onClick:event=>{
                        this.connect();
                    }
                },
                {
                    ref:"Signup", type:"neutral", label:"Sign Up",
                    onClick:event=>{
                        this.removeContainer({container:this._signInContainer});
                        this.addContainer({container:this._signUpContainer});
                        this.removeClass("sign-in");
                        this.addClass("sign-up");
                    }
                }
            ]})});
        });
        this._defineLoginField = new VInputField({
            ref:"def-login", label:"Login", value:"My name",
            validate: mandatory({validate: matchesLogin({})}),
            onInput:event=>{
            }
        });
        this._defineEmailField = new VInputField({
            ref:"def-email", label:"Email", value:"me@me.com",
            validate: mandatory({validate: matchesEmail({})}),
            onInput:event=>{
            }
        });
        this._definePasswordField = new VPasswordField({
            ref:"def-password", label:"Password", value:"",
            validate: mandatory({validate: matchesPassword({})}),
            onInput:event=>{
            }
        });
        this._defineReenterPasswordField = new VPasswordField({
            ref:"def-reply-password", label:"Re-enter Password", value:"",
            validate: mandatory({
                validate: and({
                    validators: [
                        matchesPassword({}),
                        (field, quit)=> {
                            if (quit && this._defineReenterPasswordField.value !== this._definePasswordField.value) {
                                return "Passwords do not match."
                            }
                            return "";
                        }
                    ]
                })
            }),
            onInput:event=>{
            }
        });
        this._defineFirstNameField = new VInputField({
            ref:"def-first-name", label:"First Name", value:"",
            validate: mandatory({validate: matchesName({})}),
            onInput:event=>{
            }
        });
        this._defineLastNameField = new VInputField({
            ref:"def-last-name", label:"Last Name", value:"",
            validate: mandatory({validate: matchesName({})}),
            onInput:event=>{
            }
        });
        this._signUpContainer = new VFormContainer({ref:"signup", columns:2},$=>{$
            .addField({field: this._defineLoginField})
            .addField({field: this._defineEmailField})
            .addField({field: this._definePasswordField})
            .addField({field: this._defineReenterPasswordField})
            .addField({field: this._defineFirstNameField})
            .addField({field: this._defineLastNameField})
            .addField({field:new VButtons({ref: "buttons", buttons:[
                {
                    ref:"Signup", type:"accept", label:"Sign Up",
                    onClick:event=>{
                        this.connect();
                    }},
                {
                    ref:"Signin", type:"neutral", label:"Sign In",
                    onClick:event=>{
                        this.removeContainer({container:this._signUpContainer});
                        this.addContainer({container:this._signInContainer});
                        this.removeClass("sign-up");
                        this.addClass("sign-in");
                    }},
            ]})});
        });
        this.addContainer({container: this._signInContainer});
        this.addClass("sign-in");
    }

    connect() {
        if (isValid(this) && this._connect()) {
            this.hide();
        }
    }

    get connection() {
        return {
            login: this._loginField.value
        }
    }
}