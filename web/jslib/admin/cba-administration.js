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
    requestLog,
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
} from "./cba-notice.js";
import {
    vUserList
} from "./cba-user.js";
import {
    vAnnouncementList
} from "./cba-announcement.js";
import {
    vEventList
} from "./cba-event.js";
import {
    vBoardList
} from "./cba-boards.js";
import {
    vThemeList
} from "./cba-theme.js";
import {
    editPresentation
} from "./cba-presentation.js";
import {
    vArticleList
} from "./cba-article.js";
import {
    vFactionList
} from "./cba-faction.js";
import {
    vMagicArtList
} from "./cba-magic.js";
import {
    vScenarioList
} from "./cba-scenario.js";
import {
    editRuleSet
} from "./cba-ruleset.js";
import {
    vForumList, vForumThreadList
} from "./cba-forum.js";

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
        .addMenu({ref:"theme-menu", label:"Themes", action:()=>{
                window.vPageContent.showThemeList();
            }
        })
        .addMenu({ref:"article-menu", label:"Articles", action:()=>{
                window.vPageContent.showArticleList();
            }
        })
        .addMenu({ref:"scenario-menu", kind:"menu-separator", label:"Scenarios", action:()=>{
                window.vPageContent.showScenarioList();
            }
        })
        .addMenu({ref:"rules-menu", label:"Rules and Player Aids", action:()=>{
                window.vPageContent.showRulesAndPlayerAids();
            }
        })
        .addMenu({ref:"faction-menu", label:"Factions", action:()=>{
                window.vPageContent.showFactionList();
            }
        })
        .addMenu({ref:"magic-menu", label:"Magic Arts", action:()=>{
                window.vPageContent.showMagicArtList();
            }
        })
        .addMenu({ref:"markers-menu", label:"Markers", action:()=>{
                window.vPageContent.showMarkers();
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
        .addMenu({ref:"your-contributions-menu", kind:"menu-separator", label:"Vos contributions", action:()=>{
                window.vPageContent.showYourContributionsEdition();
            }
        })
        .addMenu({ref:"forgot-password-menu", kind:"menu-separator", label:"Mail de renouvellement de Mot de Passe", action:()=>{
                window.vPageContent.showForgotPasswordMailEdition();
            }
        })
        .addMenu({ref:"theme-presentation-menu", label:"Presentation de l'édition de thèmes", action:()=>{
                window.vPageContent.showEditThemePresentation();
            }
        })
        .addMenu({ref:"article-presentation-menu", label:"Presentation de l'édition d'articles", action:()=>{
                window.vPageContent.showEditArticlePresentation();
            }
        })
        .addMenu({ref:"board-presentation-menu", label:"Presentation de l'édition de cartes", action:()=>{
                window.vPageContent.showEditBoardPresentation();
            }
        })
        .addMenu({ref:"scenario-presentation-menu", label:"Presentation de l'édition de scenarii", action:()=>{
                window.vPageContent.showEditScenarioPresentation();
            }
        })
    })
    .addDropdownMenu({ref:"forum-menu", label:"Forum"}, $=>{$
        .addMenu({ref:"list-forums-menu", label:"Les forums", action:()=>{
                window.vPageContent.showForumList();
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

export class CBAConfirm extends VModal {

    constructor() {
        super({ref: CBAConfirm.CONFIRM_REF});
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

export class CBALogin extends VModal {

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
            requestLog("Connection success: " + text + ": " + status);
            success(text);
        },
        (text, status) => {
            requestLog("Connection failure: " + text + ": " + status);
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
            requestLog("Connection success: " + text + ": " + status);
            success(text);
        },
        (text, status) => {
            requestLog("Connection failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vLogin = new CBALogin();

export class CBAPageContent extends VPageContent {

    constructor() {
        super({ref: "page-content"});
    }

    _showUserList(byHistory, historize) {
        return this.changePage(null, vUserList, byHistory, historize);
    }

    showUserList() {
        vUserList.loadUsers();
        this._showUserList(false, ()=> {
                historize("users", "vPageContent._showUserList(true);")
            }
        );
    }

    _showAnnouncementList(byHistory, historize) {
        return this.changePage(null, vAnnouncementList, byHistory, historize);
    }

    showAnnouncementList() {
        vAnnouncementList.loadAnnouncements();
        this._showAnnouncementList(false, ()=> {
                historize("announcement", "vPageContent._showAnnouncementList(true);")
            }
        );
    }

    _showEventList(byHistory, historize) {
        return this.changePage(null, vEventList, byHistory, historize);
    }

    showEventList() {
        vEventList.loadEvents();
        this._showEventList(false, ()=> {
                historize("event", "vPageContent._showEventList(true);")
            }
        );
    }

    _showBoardList(byHistory, historize) {
        return this.changePage(null, vBoardList, byHistory, historize);
    }

    showBoardList() {
        vBoardList.loadBoards();
        this._showBoardList(false, ()=> {
                historize("board", "vPageContent._showBoardList(true);")
            }
        );
    }

    _showThemeList(byHistory, historize) {
        return this.changePage(null, vThemeList, byHistory, historize);
    }

    showThemeList() {
        vThemeList.loadThemes();
        this._showThemeList(false, ()=> {
                historize("theme", "vPageContent._showThemeList(true);")
            }
        );
    }

    _showScenarioList(byHistory, historize) {
        return this.changePage(null, vScenarioList, byHistory, historize);
    }

    showScenarioList() {
        vScenarioList.loadScenarios();
        this._showScenarioList(false, ()=> {
                historize("scenario", "vPageContent._showScenarioList(true);")
            }
        );
    }

    _showArticleList(byHistory, historize) {
        return this.changePage(null, vArticleList, byHistory, historize);
    }

    showArticleList() {
        vArticleList.loadArticles();
        this._showArticleList(false, ()=> {
                historize("article", "vPageContent._showArticleList(true);")
            }
        );
    }

    _showRulesAndPlayerAids(byHistory, historize) {
        editRuleSet.call(this, "Rules And Player Aids", "rules", byHistory, historize);
    }

    showRulesAndPlayerAids() {
        this._showRulesAndPlayerAids(false, ()=> {
                historize("rules", "vPageContent._showRulesAndPlayerAids(true);")
            }
        );
    }

    _showMarkers(byHistory, historize) {
        editRuleSet.call(this, "Markers", "markers", byHistory, historize);
    }

    showMarkers() {
        this._showMarkers(false, ()=> {
                historize("markers", "vPageContent._showMarkers(true);")
            }
        );
    }

    _showFactionList(byHistory, historize) {
        return this.changePage(null, vFactionList, byHistory, historize);
    }

    showFactionList() {
        vFactionList.loadFactions();
        this._showFactionList(false, ()=> {
                historize("faction", "vPageContent._showFactionList(true);")
            }
        );
    }

    _showMagicArtList(byHistory, historize) {
        return this.changePage(null, vMagicArtList, byHistory, historize);
    }

    showMagicArtList() {
        vMagicArtList.loadMagicArts();
        this._showMagicArtList(false, ()=> {
                historize("magic", "vPageContent._showMagicArtList(true);")
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

    _showEditThemePresentation(byHistory, historize) {
        editPresentation.call(this,"Presentation de l'édition de thèmes", "edit-theme-presentation", byHistory, historize);
    }

    showEditThemePresentation() {
        this._showEditThemePresentation(false, ()=> {
                historize("edit-theme-presentation", "vPageContent._showEditThemePresentation(true);")
            }
        );
    }

    _showEditArticlePresentation(byHistory, historize) {
        editPresentation.call(this,"Presentation de l'édition d'articles", "edit-article-presentation", byHistory, historize);
    }

    showEditArticlePresentation() {
        this._showEditArticlePresentation(false, ()=> {
                historize("edit-article-presentation", "vPageContent._showEditArticlePresentation(true);")
            }
        );
    }

    _showEditBoardPresentation(byHistory, historize) {
        editPresentation.call(this,"Presentation de l'édition de cartes", "edit-board-presentation", byHistory, historize);
    }

    showEditBoardPresentation() {
        this._showEditBoardPresentation(false, ()=> {
                historize("edit-board-presentation", "vPageContent._showEditBoardPresentation(true);")
            }
        );
    }

    _showEditScenarioPresentation(byHistory, historize) {
        editPresentation.call(this,"Presentation de l'édition de scénario", "edit-scenario-presentation", byHistory, historize);
    }

    showEditScenarioPresentation() {
        this._showEditScenarioPresentation(false, ()=> {
                historize("edit-scenario-presentation", "vPageContent._showEditScenarioPresentation(true);")
            }
        );
    }

    _showForumList(byHistory, historize) {
        return this.changePage(null, vForumList, byHistory, historize);
    }

    showForumList() {
        vForumList.loadForums();
        this._showForumList(false, ()=> {
                historize("forums", "vPageContent._showForumList(true);")
            }
        );
    }

    _showForumThreadList(forum, byHistory, historize) {
        vForumThreadList.setForum(forum);
        return this.changePage(null, vForumThreadList, byHistory, historize);
    }

    showForumThreadList(forum) {
        this._showForumThreadList(forum, false, ()=> {
                historize("forums", `vPageContent._showForumList(${JSON.stringify(forum)}, true);`)
            }
        );
    }

    _showHome(byHistory, historize) {
        //       return this.changePage(null, vHome, byHistory, historize);
    }

    showHome() {
        this._showHome(false, ()=> {
                //           historize("home", "vPageContent._showHome(true);")
            }
        );
    }
}

window.vPageContent = new CBAPageContent();


