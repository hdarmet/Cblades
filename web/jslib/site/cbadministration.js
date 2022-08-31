import {
    VHeader,
    VMainMenu, VWarning,
} from "./vpage.js";
import {
    VContainer,
    VPageContent, VSplitterPanel, VTable
} from "./vcontainer.js";
import {
    historize, Undoable, VDisplay, Vitamin, VLink, VMessage, VModal, VSearch
} from "./vitamins.js";
import {
    Div, Img, P, Select, Span, sendPost, sendGet
} from "./components.js";
import {
    and, isValid,
    mandatory,
    matchesEmail,
    matchesLogin, matchesName,
    matchesPassword, or, VButton,
    VButtons, VFileLoader, VFileLoaderField,
    VFormContainer,
    VInputField, VInputTextArea,
    VPasswordField, VSelectField
} from "./vforms.js";

var noticeText = `
<h1>The Main Title</h1>
<p>Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit</p>
<h2>The Second Title</h2>
<p>Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit</p>
<h2>The Third Title</h2>
<p>
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
</p>`;

export var connection = null;

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
    .addDropdownMenu({ref:"edit-notice", label:"Edition des Notices"}, $=>{$
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
    })
    .addMenu({ref:"login", kind:"right-menu", label:connection?"Logout":"Login", action:()=>{
        if (connection) {
            sendPost("/api/login/disconnect",null,
                (text, status) => {
                    console.log("Disconnection success: " + text + ": " + status);
                    connection = null
                    vMenu.get("login").label = "login";
                },
                (text, status) => {
                    console.log("Disconnection failure: " + text + ": " + status);
                    vLogin.showMessage(text);
                }
            );
        }
        else {
            vLogin.show();
        }
    }})

export var vHeader = new VHeader({
    ref:"header",
    left:"../images/site/left-title.png", right:"../images/site/right-title.png",
    title: "Cursed Blades Administration"
}).addClass("page-header").addVitamin(vMenu);

export class CBNotice extends Vitamin(Div) {

    constructor({ref}) {
        super({ref});
        this._title = new Span().addClass("modal-title-text");
        this._content = new Div().addClass("display-content");
        this.addClass("notice-container").add(
            new Div().add(this._title).addClass("modal-title")
        ).add(this._content);
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
        return this;
    }

    get content() {
        return this._content.getText();
    }

    set content(content) {
        this._content.setText(content);
        return this;
    }

    get specification() {
        return {
            title: this.title,
            content: this.content
        }
    }

    set specification(specification) {
        this.title = specification.title;
        this.content = specification.content;
    }

}

export class CBNoticeEditor extends Undoable(VSplitterPanel) {

    constructor() {
        super({ref:"notice-editor"});
        this.addClass("notice-editor");
        this._noticeDisplayContainer = new Div().addClass("notice-display-container");
        this.addOnLeft(this._noticeDisplayContainer);
        this._noticeDisplay = new CBNotice({ref:"notice-display"});
        this._noticeDisplayContainer.add(this._noticeDisplay);
        this._versionContainer = new VContainer({columns:2});
        this.addOnRight(this._versionContainer);
        this._version = new VSelectField({
            ref:"notice-version", label:"Version",
            onInput:event=>{
            }
        });
        this._newVersion = new VInputField({
            ref:"notice-new-version", label:"New Version",
            onInput:event=>{
            }
        });
        this._copy = new VButton({ref:"copy-notice", type:"neutral", label:"Copy"});
        this._newVersion.add(this._copy);
        this._versionContainer
            .addField({field: this._version})
            .addField({field:new Div().addClass("new-version").add(this._newVersion).add(this._copy)});
        this._title = new VInputField({
            ref:"notice-content-title", label:"Titre de la Notice",
            onInput: event=>{
                this._noticeDisplay.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._notice = new VInputTextArea({
            ref:"notice-content-input", label:"Contenu de la Notice",
            heading: true,
            onInput: event=>{
                this._noticeDisplay.content = this._notice.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._notice);
        this._buttons = new VButtons({
            buttons:[
                {ref: "save-notice", label:"Save", type:"accept"},
                {ref: "publish-notice", label:"Publish", type:"publish"},
                {ref: "delete-edition", label:"Delete", type:"neutral", onClick:event=>{
                    new CBConfirm().show({
                        ref:"confirm-notice-deletion",
                        title:"Delete Notice Version",
                        message:"Do you really want to delete this version of the Notice ?"
                    });
                }},
                {ref: "cancel-edition", label:"Cancel", type:"refuse"}
            ]
        });
        this.addOnRight(this._buttons);
    }

    canLeave(leave) {
        return super.canLeave(leave, "Notice not saved. Do you want to Quit ?")
    }

    _editNotice() {
        this._title.value = this._noticeDisplay.title;
        this._notice.value = this._noticeDisplay.content;
    }

    setNotice({title, notice, versions, version, published}) {
        this._noticeDisplay.title = title;
        this._noticeDisplay.content = notice;
        this._version.optionLines = versions;
        this._version.value = version;
        this._editNotice();
        this.get("publish-notice").enabled = !published;
        this._clean();
        this._memorize();
        return this;
    }

    _register() {
        return this._noticeDisplay.specification;
    }

    _recover(specification) {
        if (specification) {
            this._noticeDisplay.specification = specification;
            this._editNotice();
        }
    }

}

export class CBNoticeEditorPage extends VContainer {
    constructor() {
        super({ref:"notice-editor-page"});
        this._title = new P("").addClass("page-title");
        this._noticeEditor = new CBNoticeEditor();
        this.addClass("notice-editor-page")
            .add(this._title)
            .add(this._noticeEditor);
    }

    canLeave(leave) {
        return this._noticeEditor.canLeave(leave);
    }

    setTitle(title) {
        this._title.setText(title);
        return this;
    }
    setNotice({title, notice, versions, version, published}) {
        this._noticeEditor.setNotice({title, notice, versions, version, published});
        return this;
    }

}

export class CBUserListPage extends Vitamin(Div) {

    constructor({loadPage, selectUser, saveUser}) {
        super({ref:"user-list-page"});
        this._search = new VSearch({ref: "user-list-search", searchAction:text=>alert(text)});
        this._create = new VButton({ref:"user-create", type:"neutral", label:"Create User",
            onClick:event=>{
                this._createUserModal = new CBEditUser({
                    title: "Create User",
                    create: true,
                    user:{
                        avatar:"../images/site/avatars/default-avatar.png", role:"std", status:"pnd"
                    },
                    save: saveUser
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBUserList({loadPage, selectUser});
        this.add(this._search).add(this._table);
    }

    get createUserModal() {
        return this._createUserModal;
    }

    loadUsers() {
        this._table.loadUsers();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export class CBLogin extends VModal {

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
                sendGet("/api/login/forgot-password?login=" + this._loginField.value,
                    null,
                    (text, status) => {
                        this._forgottenMessage.message = "Message sent to your email address";
                    },
                    (text, status) => {
                        this.showMessage("Unable To Send Mail", text);
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
        this.addContainer({container: this._signInContainer});
    }

    get login() {
        return this._loginField.value;
    }

    get password() {
        return this._passwordField.value;
    }

    showMessage(text) {
        new VWarning().show({title:"Connection refused", message:text});
    }

    connect(login, password) {
        if (isValid(this) && this._connect(login, password)) {
            this.hide();
        }
    }

    get connection() {
        return {
            login: this._loginField.value
        }
    }


}

export var vLogin = new CBLogin({
    connect: (login, password)=>{
        sendPost("/api/login/login",
            {
                login, password
            },
            (text, status) => {
                console.log("Connection success: " + text + ": " + status);
                connection = {
                    login: vLogin.connection
                };
                vMenu.get("login").label = "logout";
                vLogin.hide();
            },
            (text, status) => {
                console.log("Connection failure: " + text + ": " + status);
                vLogin.showMessage(text);
            }
        );
        return false;
    }

});

export class CBConfirm extends VModal {

    constructor() {
        super({ref: CBConfirm.CONFIRM_REF});
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

export class CBEditUser extends VModal {

    constructor({title, create, user, save}) {
        super({"user":"user-form", "title":title});
        this._id = user.id;
        this._loginField = new VInputField({
            ref:"def-login", label:"Login", value:user.login,
            validate: mandatory({validate: matchesLogin({})}),
            onInput:event=>{
            }
        });
        this._emailField = new VInputField({
            ref:"user-email", label:"Email", value:user.email,
            validate: mandatory({validate: matchesEmail({})}),
            onInput:event=>{
            }
        });
        this._passwordField = new VPasswordField({
            ref:"user-password", label:"Password", value:"",
            validate: mandatory({validate: matchesPassword({})}),
            onInput:event=>{
            }
        });
        this._reenterPasswordField = new VPasswordField({
            ref:"user-reply-password", label:"Re-enter Password", value:"",
            validate: mandatory({
                validate: and({
                    validators: [
                        matchesPassword({}),
                        (field, quit)=> {
                            if (quit && this._reenterPasswordField.value !== this._passwordField.value) {
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
        this._firstNameField = new VInputField({
            ref:"user-first-name", label:"First Name", value:user.firstName,
            validate: mandatory({validate: matchesName({})}),
            onInput:event=>{
            }
        });
        this._lastNameField = new VInputField({
            ref:"user-last-name", label:"Last Name", value:user.lastName,
            validate: mandatory({validate: matchesName({})}),
            onInput:event=>{
            }
        });
        this._roleField = new VSelectField({
            ref:"user-role", label:"Role", value:user.role,
            options: [
                {ref: "id-standard", value: "std", text:"Standard"},
                {ref: "id-contributor", value: "cnt", text:"Contributor"},
                {ref: "id-administrator", value: "adm", text:"Administrator"},
                {ref: "id-tester", value: "tst", text:"Tester"}
            ],
            onInput:event=>{
            }
        });
        this._statusField = new VSelectField({
            ref:"user-status", label:"Status", value:user.status,
            options: [
                {ref: "id-active", value: "act", text:"Active"},
                {ref: "id-pending", value: "pnd", text:"Pending"},
                {ref: "id-blocked", value: "blk", text:"Blocked"}
            ],
            onInput:event=>{
            }
        });
        this._avatar = new VFileLoaderField({
            ref:"user-avatar", label:"Avatar",
            imageSrc: user.avatar,
            accept: file=> {
                if (!VFileLoader.isImage(file)) {
                    this._avatar.message = "The image must be a PNG or JPEG square file of size > 100 pixels.";
                    return false;
                }
                this._avatar.message ="";
                return true;
            },
            verify: image=> {
                if (image.imageWidth!==image.imageHeight || image.imageWidth<=100) {
                    this._avatar.message = "The image must be a PNG or JPEG square file of size > 100 pixels.";
                    return false;
                }
                this._avatar.message ="";
                return true;
            },
            onInput: event=>{
            },
            onChange: event=>{
                //this._memorize();
            }
        });
        let buttons = new VButtons({ref: "buttons", buttons:[
            {
                ref:"save-user", type:"accept", label:"Save",
                onClick:event=>{
                    save(this.specification);
                }
            },
            {
                ref:"cancel-user", type:"refuse", label:"Cancel",
                onClick:event=>{
                    this.hide();
                }
            }
        ]});
        this._container = new VFormContainer({ref:"signup", columns:2},$=>{$
            .addField({field: this._loginField})
            .addField({field: this._emailField})
            .addField({field: this._firstNameField})
            .addField({field: this._lastNameField})
            .addContainer({}, $=>{$
                .addField({field: this._passwordField})
                .addField({field: this._reenterPasswordField})
                .addField({field: this._roleField})
                .addField({field: this._statusField})
            })
            .addField({field: this._avatar})
            .addField({field:buttons});
        });
        if (!create) {
            buttons.add(new VButton({
                ref: "delete-user", type: "neutral", label: "Delete",
                onClick: event => {
                    let confirm = new CBConfirm().show({
                        ref:"confirm-user-deletion",
                        title:"Delete User",
                        message:"Do you really want to delete the User ?",
                        actionOk: event=> {
                            sendGet("/api/account/delete/" + user.id,
                                null,
                                (text, status) => {
                                    console.log("Account delete success: " + text + ": " + status);
                                    this.hide();
                                    confirm.hide();
                                    vUserList.refresh();
                                },
                                (text, status) => {
                                    console.log("Account delete failure: " + text + ": " + status);
                                    confirm.hide();
                                    this.showMessage("Fail to delete User", text);
                                }
                            )
                        }
                    });
                }
            }).addClass("right-button"));
        }
        this.addContainer({container: this._container});
        this.addClass("user-form");
    }

    get avatarFiles() {
        return this._avatar.files && this._avatar.files.length===1 ?
            [{key:"avatar", file:this._avatar.files[0]}] :
            [];
    }

    get specification() {
        return {
            id: this._id,
            login: this._loginField.value,
            email: this._emailField.value,
            firstName: this._firstNameField.value,
            lastName: this._lastNameField.value,
            password: this._passwordField.value,
            role: this._roleField.value,
            status: this._statusField.value,
            avatar: this._avatar.imageSrc
        }
    }

    showMessage(title, text) {
        new VWarning().show({title, message:text});
    }

}

export class CBUserList extends VTable {

    constructor({loadPage, selectUser}) {
        super({
            ref:"user-list",
            changePage: pageIndex=>this._setPage(pageIndex)
        });
        this.addClass("user-list");
        this._loadPage = loadPage;
        this._selectUser = selectUser;
    }

    loadUsers() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(page) {
        function getUser(line) {
            return {
                id: line.id,
                login: line.login.getText(),
                firstName: line.firstName.getText(),
                lastName: line.lastName.getText(),
                avatar: line.avatar.getSrc(),
                email: line.email.getText(),
                role: line.role.getValue(),
                status: line.status.getValue()
            };
        }
        this._loadPage(page, page=> {
            let lines = [];
            for (let user of page.users) {
                let line;
                let login = new P(user.login).addClass("user-Login")
                    .onMouseClick(event=>this._selectUser(getUser(line)));
                let firstName = new P(user.firstName).addClass("user-first-name")
                    .onMouseClick(event=>this._selectUser(getUser(line)));
                let lastName = new P(user.lastName).addClass("user-last-name")
                    .onMouseClick(event=>this._selectUser(getUser(line)));
                let avatar = new Img(user.avatar).addClass("user-avatar")
                    .onMouseClick(event=>this._selectUser(getUser(line)));
                let email = new P(user.email).addClass("user-email")
                    .onMouseClick(event=>this._selectUser(getUser(line)));
                let status = new Select().setOptions([
                        { value:"act", text:"Active" },
                        { value:"pnd", text:"Pending" },
                        { value:"blk", text:"Blocked" }
                    ])
                    .addClass("form-input-select")
                    .setValue(user.status)
                    .addClass("user-status");
                let role = new Select().setOptions([
                        { value:"std", text:"Standard" },
                        { value:"cnt", text:"Contributor" },
                        { value:"adm", text:"Administrator" },
                        { value:"tst", text:"Tester" }
                    ])
                    .addClass("form-input-select")
                    .setValue(user.role)
                    .addClass("user-role");
                line = {id:user.id, login, firstName, lastName, avatar, email, role, status};
                lines.push([login, firstName, lastName, avatar, email, role, status]);
            }
            let title = new Span(page.title)
                .addClass("user-title")
            let pageSummary = new Span()
                .addClass("user-pager")
                .setText(String.format(CBUserList.SUMMARY, page.userCount, page.firstUser, page.lastUser));
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Login", "First Name", "LastName", "Avatar", "Email", "Role", "Status"],
                data: lines
            });
            this._currentPage = page.currentPage;
            let first = page.pageCount<=5 ? 0 : page.currentPage-2;
            if (first<0) first = 0;
            let last = page.pageCount<=5 ? page.pageCount-1 : page.currentPage+2;
            if (last>=page.pageCount) last=page.pageCount-1;
            this.setPagination({
                first, last, current:page.currentPage
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} user(s)";
}

function getUsers(pageIndex) {
    let firstNames = ['Dominique', 'Pierre', 'Thomas'];
    let lastNames = ['DUPONT', 'SANCHEZ', 'RODEZ', 'ILLIA', 'TONGI'];
    let statues = ['act', 'act', 'act', 'act', 'pnd', 'blk'];
    let roles = ['std', 'std', 'std', 'cnt', 'adm'];
    let users = [];
    for (let index=pageIndex*20; index<55 && index<pageIndex*20+20; index++) {
        users.push({
            avatar: `../images/site/avatars/avatar${index%3+1}.png`,
            login: "login"+(index),
            firstName: firstNames[index%3],
            lastName: lastNames[index%5],
            email: firstNames[index%3]+"."+lastNames[index%5].toLowerCase()+"@gmail.com",
            role: roles[index%5],
            status: statues[index%6]
        });
    }
    return users;
}

export var vUserList = new CBUserListPage({
    loadPage:(pageIndex, update)=>{
        sendGet("/api/account/all?page="+pageIndex, null,
            (text, status) => {
                console.log("Load user success: " + text + ": " + status);
                let response = JSON.parse(text);
                update({
                    title: "User List",
                    pageCount: Math.ceil(response.count/response.pageSize),
                    currentPage: response.page,
                    userCount: response.count,
                    firstUser: response.page*response.pageSize+1,
                    lastUser: response.page*response.pageSize+response.users.length,
                    users: response.users//getUsers(pageIndex)
                });
                connection = {
                    login: vLogin.connection
                };
            },
            (text, status) => {
                console.log("Load user failure: " + text + ": " + status);
                vLogin.showMessage(text);
            }
        );
    },
    saveUser: user=>{
        sendPost("/api/account/create",
                user,
                (text, status) => {
                    console.log("Account creation success: " + text + ": " + status);
                    vUserList.createUserModal.hide();
                    vUserList.refresh();
                },
                (text, status) => {
                    console.log("Account creation failure: " + text + ": " + status);
                    vUserList.createUserModal.showMessage("Fail to create User", text);
                }
            );
        },
    selectUser: user=>{
        let userEditor = new CBEditUser({title: "Edit User", user, save: user=>{
            sendPost("/api/account/update/"+user.id,
                user,
                (text, status) => {
                    console.log("Account update success: " + text + ": " + status);
                    userEditor.hide();
                    vUserList.refresh();
                },
                (text, status) => {
                    console.log("Account update failure: " + text + ": " + status);
                    userEditor.showMessage("Fail to update User", text);
                },
                userEditor.avatarFiles
            );
        }}).show();
    }
});

let vNoticeEditorPage = new CBNoticeEditorPage();

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

    _showLegalNoticeEdition(byHistory, historize) {
        vNoticeEditorPage
            .setTitle("Legal Notice Edition")
            .setNotice({title:"Legal Notice", notice:noticeText, version:"V1", versions:[
                {value:"V1"}, {value:"V1.1", text:"V1.1 (published)"}, {value:"V2"}
            ]});
        return this._changePage(null, vNoticeEditorPage, byHistory, historize);
    }

    showLegalNoticeEdition() {
        this._showLegalNoticeEdition(false, ()=> {
                historize("edit-legal-notice", "vPageContent._showLegalNoticeEdition(true);")
            }
        );
    }

    _showPrivateLifePolicyEdition(byHistory, historize) {
        vNoticeEditorPage
            .setTitle("Private Life Policy Edition")
            .setNotice({title:"Private Life Policy", notice:noticeText, version:"V1", versions:[
                    {value:"V1"}, {value:"V1.1", text:"V1.1 (published)"}, {value:"V2"}
                ]});
        return this._changePage(null, vNoticeEditorPage, byHistory, historize);
    }

    showPrivateLifePolicyEdition() {
        this._showPrivateLifePolicyEdition(false, ()=> {
                historize("edit-private-life-policy", "vPageContent._showPrivateLifePolicyEdition(true);")
            }
        );
    }

    _showCookieManagementEdition(byHistory, historize) {
        vNoticeEditorPage
            .setTitle("Cookie Management Edition")
            .setNotice({title:"Cookie Management", notice:noticeText, version:"V1", versions:[
                    {value:"V1"}, {value:"V1.1", text:"V1.1 (published)"}, {value:"V2"}
                ]});
        return this._changePage(null, vNoticeEditorPage, byHistory, historize);
    }

    showCookieManagementEdition() {
        this._showCookieManagementEdition(false, ()=> {
                historize("edit-cookie-management", "vPageContent._showCookieManagementEdition(true);")
            }
        );
    }

    _showUsagePolicyEdition(byHistory, historize) {
        vNoticeEditorPage
            .setTitle("Usage Policy Edition")
            .setNotice({title:"Usage Policy", notice:noticeText, version:"V1", versions:[
                    {value:"V1"}, {value:"V1.1", text:"V1.1 (published)"}, {value:"V2"}
                ]});
        return this._changePage(null, vNoticeEditorPage, byHistory, historize);
    }

    showUsagePolicyEdition() {
        this._showUsagePolicyEdition(false, ()=> {
                historize("edit-usage-policy", "vPageContent._showUsagePolicyEdition(true);")
            }
        );
    }

    _showYourContributionsEdition(byHistory, historize) {
        vNoticeEditorPage
            .setTitle("Your Contributions Edition")
            .setNotice({title:"Your Contributions", notice:noticeText, version:"V1", versions:[
                    {value:"V1"}, {value:"V1.1", text:"V1.1 (published)"}, {value:"V2"}
                ]});
        return this._changePage(null, vNoticeEditorPage, byHistory, historize);
    }

    showYourContributionsEdition() {
        this._showYourContributionsEdition(false, ()=> {
                historize("edit-your-contributions", "vPageContent._showYourContributionsEdition(true);")
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


