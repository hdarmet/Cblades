'use strict';

import {
    VHeader, VMainMenu, showMessage
} from "../vitamin/vpage.js";
import {
    VPageContent
} from "../vitamin/vcontainer.js";
import {
    historize, VLoginHandler, VDisplay, VLink, VMessage, VModal
} from "../vitamin/vitamins.js";
import {
    sendGet, sendPost
} from "../vitamin/components.js";
import {
    isValid,
    mandatory,
    matchesEmail,
    matchesLogin,
    matchesPassword,
    or,
    VButton,
    VButtons,
    VFormContainer,
    VInputField,
    VPasswordField
} from "../vitamin/vforms.js";
import {
    editNotice
} from "./cbnotice.js";
import {
    vUserList
} from "./cbuser.js";
import {
    vAnnouncementList
} from "./cbannouncement.js";
import {
    vEventList
} from "./cbevent.js";
import {
    vBoardList
} from "./cbboards.js";

export var vMenu = new VMainMenu({ref:"menu"})
    .addMenu({ref:"home", label:"Accueil", action:()=>{
            //vPageContent.showHome();
    }})
    .addDropdownMenu({ref:"user-menu", label:"Utilisateurs"}, $=>{$
        .addMenu({ref:"list-users-menu", label:"Les utilisateurs", action:()=>{
                window.vPageContent.showUserList();
            }
        })
    })
    .addDropdownMenu({ref:"edition-menu", label:"Edition"}, $=>{$
        .addMenu({ref:"announcement-menu", label:"Annonces", action:()=>{
                window.vPageContent.showAnnouncementList();
            }
        })
        .addMenu({ref:"event-menu", label:"Evènements", action:()=>{
                window.vPageContent.showEventList();
            }
        })
        .addMenu({ref:"board-menu", label:"Cartes", action:()=>{
                window.vPageContent.showBoardList();
            }
        })
    })
    .addDropdownMenu({ref:"edit-notice", label:"Notices et des Mails"}, $=>{$
        .addMenu({ref:"legal-notice-menu", label:"Notice Légale", action:()=>{
                window.vPageContent.showLegalNoticeEdition();
            }
        })
        .addMenu({ref:"private-life-policy-menu", label:"Protection de la Vie Privée", action:()=>{
                window.vPageContent.showPrivateLifePolicyEdition();
            }
        })
        .addMenu({ref:"cookie-management-menu", label:"Gestion des Cookies", action:()=>{
                window.vPageContent.showCookieManagementEdition();
            }
        })
        .addMenu({ref:"usage-policy-menu", label:"Conditions d'Usage", action:()=>{
                window.vPageContent.showUsagePolicyEdition();
            }
        })
        .addMenu({ref:"your-contributions-menu", label:"Vos contributions", action:()=>{
                window.vPageContent.showYourContributionsEdition();
            }
        })
        .addMenu({ref:"forgot-password-menu", label:"Mail de renouvellement de Mot de Passe", action:()=>{
                window.vPageContent.showForgotPasswordMailEdition();
            }
        })
    })
    .addMenu({ref:"login", kind:"right-menu", label:VLoginHandler.connection?"Logout":"Login",
        action:()=> {
            if (VLoginHandler.connection) {
                VLoginHandler.logout();
            } else {

                VLoginHandler.login();
            }
        }
    });
vMenu.onConnection = function({user}) {
    vMenu.get("login").label = user ? "logout" : "login";
}
VLoginHandler.addLoginListener(vMenu);

export var vHeader = new VHeader({
    ref:"header",
    left:"../images/site/left-title.png", right:"../images/site/right-title.png",
    title: "Cursed Blades Administration"
}).addClass("page-header").addVitamin(vMenu);

export class CBConfirm extends VModal {

    constructor() {
        super({ref: CBConfirm.CONFIRM_REF});
        this.addClass("confirm-modal");
        this._display = new VDisplay({ref:"confirm-display"});
        this.add(
            new VFormContainer({columns: 1})
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
        );
    }

    show({title, message, actionOk, actionCancel=()=>this.hide()}) {
        this.title = title;
        this._display.content = message;
        this._actionOk = actionOk;
        this._actionCancel = actionCancel;
        super.show();
        return this;
    }

    static CONFIRM_REF = "confirm";

}

export class CBLogin extends VModal {

    constructor() {
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
                sendGet("/api/login/forgot-password?login=" + this._loginField.value,
                    (text, status) => {
                        this._forgottenMessage.message = "Message sent to your email address";
                    },
                    (text, status) => {
                        showMessage("Unable To Send Mail", text);
                    }
                )
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
                        this.connect(this.login, this.password);
                    }
                }
            ]})});
        });
        this.add(this._signInContainer);
        VLoginHandler.addLoginListener(this);
    }

    get login() {
        return this._loginField.value;
    }

    get password() {
        return this._passwordField.value;
    }

    get connection() {
        return {
            login: this._loginField.value
        }
    }

    connect(login, password) {
        if (isValid(this)) {
            connect(login, password,
                text=>{
                    this.hide();
                    VLoginHandler.connection = JSON.parse(text);
                },
                (text, status)=>{
                    showMessage("Connection refused", text);
                }
            );
        }
    }

    onLoginRequest({login}) {
        if (login) {
            this.show();
        }
        else {
            disconnect(
                (text) => {
                    VLoginHandler.connection = null
                },
                (text, status) => {
                    showMessage("Connection refused", text);
                }
            );
        }
    }

}

export function disconnect(success, failure) {
    sendGet("/api/login/logout",
        (text, status) => {
            console.log("Connection success: " + text + ": " + status);
            success(text);
        },
        (text, status) => {
            console.log("Connection failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function connect(login, password, success, failure) {
    sendPost("/api/login/login",
        {
            login, password
        },
        (text, status) => {
            console.log("Connection success: " + text + ": " + status);
            success(text);
        },
        (text, status) => {
            console.log("Connection failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vLogin = new CBLogin();

export class CBPageContent extends VPageContent {

    constructor() {
        super({ref: "page-content"});
        //this._showHome(true);
    }

    _showUserList(byHistory, historize) {
        return this._changePage(null, vUserList, byHistory, historize);
    }

    showUserList() {
        vUserList.loadUsers();
        this._showUserList(false, ()=> {
                historize("users", "vPageContent._showUserList(true);")
            }
        );
    }

    _showAnnouncementList(byHistory, historize) {
        return this._changePage(null, vAnnouncementList, byHistory, historize);
    }

    showAnnouncementList() {
        vAnnouncementList.loadAnnouncements();
        this._showAnnouncementList(false, ()=> {
                historize("announcement", "vPageContent._showAnnouncementList(true);")
            }
        );
    }

    _showEventList(byHistory, historize) {
        return this._changePage(null, vEventList, byHistory, historize);
    }

    showEventList() {
        vEventList.loadEvents();
        this._showEventList(false, ()=> {
                historize("event", "vPageContent._showEventList(true);")
            }
        );
    }

    _showBoardList(byHistory, historize) {
        return this._changePage(null, vBoardList, byHistory, historize);
    }

    showBoardList() {
        vBoardList.loadBoards();
        this._showBoardList(false, ()=> {
                historize("board", "vPageContent._showBoardList(true);")
            }
        );
    }

    _showLegalNoticeEdition(byHistory, historize) {
        editNotice.call(this,"Legal Notice Edition", "legal-notice", byHistory, historize);
    }

    showLegalNoticeEdition() {
        this._showLegalNoticeEdition(false, ()=> {
                historize("edit-legal-notice", "vPageContent._showLegalNoticeEdition(true);")
            }
        );
    }

    _showPrivateLifePolicyEdition(byHistory, historize) {
        editNotice.call(this,"Private Life Policy Edition", "private-life-policy-notice", byHistory, historize);
    }

    showPrivateLifePolicyEdition() {
        this._showPrivateLifePolicyEdition(false, ()=> {
                historize("edit-private-life-policy", "vPageContent._showPrivateLifePolicyEdition(true);")
            }
        );
    }

    _showCookieManagementEdition(byHistory, historize) {
        editNotice.call(this,"Cookie Management Edition", "cookie-management-notice", byHistory, historize);
    }

    showCookieManagementEdition() {
        this._showCookieManagementEdition(false, ()=> {
                historize("edit-cookie-management", "vPageContent._showCookieManagementEdition(true);")
            }
        );
    }

    _showUsagePolicyEdition(byHistory, historize) {
        editNotice.call(this,"Usage Policy Edition", "usage-policy-notice", byHistory, historize);
    }

    showUsagePolicyEdition() {
        this._showUsagePolicyEdition(false, ()=> {
                historize("edit-usage-policy", "vPageContent._showUsagePolicyEdition(true);")
            }
        );
    }

    _showYourContributionsEdition(byHistory, historize) {
        editNotice.call(this,"Your Contributions Edition", "your-contributions-notice", byHistory, historize);
    }

    showYourContributionsEdition() {
        this._showYourContributionsEdition(false, ()=> {
                historize("edit-your-contributions", "vPageContent._showYourContributionsEdition(true);")
            }
        );
    }

    _showForgotPasswordMailEdition(byHistory, historize) {
        editNotice.call(this,"Mail de renouvellement de mot de Passe", "forgot-password-mail", byHistory, historize);
    }

    showForgotPasswordMailEdition() {
        this._showForgotPasswordMailEdition(false, ()=> {
                historize("edit-forgot-password-mail", "vPageContent._showForgotPasswordMailEdition(true);")
            }
        );
    }

    _showHome(byHistory, historize) {
        //       return this._changePage(null, vHome, byHistory, historize);
    }

    showHome() {
        this._showHome(false, ()=> {
                //           historize("home", "vPageContent._showHome(true);")
            }
        );
    }
}

window.vPageContent = new CBPageContent();


