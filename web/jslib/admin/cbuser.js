'use strict';

import {
    VContainer,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, Select, sendGet, sendPost, Span, Enum
} from "../vitamin/components.js";
import {
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    and,
    mandatory,
    matchesEmail,
    matchesLogin,
    matchesName,
    matchesPassword,
    VButton,
    VButtons,
    VFileLoader,
    VFileLoaderField,
    VFormContainer,
    VInputField,
    VPasswordField,
    VSelectField
} from "../vitamin/vforms.js";
import {
    VWarning
} from "../vitamin/vpage.js";
import {
    CBConfirm
} from "./cbadministration.js";

export class CBUserSelector extends VModal {
    constructor({title, loadPage, selectUser}) {
        super({"user": "user-selector", "title": title});
        this._search = new VSearch({
            ref: "user-list-search", searchAction: search => {
                this.loadUsers();
            }
        });
        this._table = new CBUserSelection({loadPage, selectUser});
        this.addContainer({
            container: new VContainer({ ref:"user-selection-modal" }).add(this._search).add(this._table)
        });
    }

    loadUsers() {
        this._table.search = this._search.value;
        this._table.loadUsers();
        return this;
    }

    showMessage(title, text) {
        new VWarning().show({title, message: text});
    }

}

export class CBUserSelection extends VTable {

    constructor({loadPage, selectUser}) {
        super({
            ref: "user-selection",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("user-selection");
        this._loadPage = loadPage;
        this._selectUser = selectUser;
    }

    set search(search) {
        this._search = search;
    }

    loadUsers() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(pageIndex) {
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

        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            for (let user of pageData.users) {
                let line;
                let login = new P(user.login).addClass("user-Login")
                    .onMouseClick(event => this._selectUser(getUser(line)));
                let firstName = new P(user.firstName).addClass("user-first-name")
                    .onMouseClick(event => this._selectUser(getUser(line)));
                let lastName = new P(user.lastName).addClass("user-last-name")
                    .onMouseClick(event => this._selectUser(getUser(line)));
                let avatar = new Img(user.avatar).addClass("user-avatar")
                    .onMouseClick(event => this._selectUser(getUser(line)));
                let email = new P(user.email).addClass("user-email")
                    .onMouseClick(event => this._selectUser(getUser(line)));
                let status = new Enum(user.status).setOptions([
                    {value: "act", text: "Active"},
                    {value: "pnd", text: "Pending"},
                    {value: "blk", text: "Blocked"}
                ])
                    .addClass("user-status")
                    .onMouseClick(event => selectUser(getUser(line)));
                let role = new Enum(user.role).setOptions([
                    {value: "std", text: "Standard"},
                    {value: "cnt", text: "Contributor"},
                    {value: "adm", text: "Administrator"},
                    {value: "tst", text: "Tester"}
                ])
                    .addClass("user-role")
                    .onMouseClick(event => selectUser(getUser(line)));
                line = {id: user.id, login, firstName, lastName, avatar, email, role, status};
                lines.push([login, firstName, lastName, avatar, email, role, status]);
            }
            let title = new Span(pageData.title)
                .addClass("user-title")
            let pageSummary = new Span()
                .addClass("user-pager")
                .setText(pageData.userCount ?
                    String.format(CBUserSelection.SUMMARY, pageData.userCount, pageData.firstUser, pageData.lastUser) :
                    CBUserSelection.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Login", "First Name", "LastName", "Avatar", "Email", "Role", "Status"],
                data: lines
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

    static SUMMARY = "Showing {1} to {2} of {0} user(s)";
    static EMPTY_SUMMARY = "There are no users to show";
}

export class CBEditUser extends VModal {

    constructor({title, create, user, saveUser, deleteUser}) {
        super({"user": "user-form", "title": title});
        this._id = user.id;
        this._loginField = new VInputField({
            ref: "def-login", label: "Login", value: user.login,
            validate: mandatory({validate: matchesLogin({})}),
        });
        this._emailField = new VInputField({
            ref: "user-email", label: "Email", value: user.email,
            validate: mandatory({validate: matchesEmail({})}),
        });
        this._passwordField = new VPasswordField({
            ref: "user-password", label: "Password", value: "",
            validate: mandatory({validate: matchesPassword({})}),
        });
        this._reenterPasswordField = new VPasswordField({
            ref: "user-reply-password", label: "Re-enter Password", value: "",
            validate: mandatory({
                validate: and({
                    validators: [
                        matchesPassword({}),
                        (field, quit) => {
                            if (quit && this._reenterPasswordField.value !== this._passwordField.value) {
                                return "Passwords do not match."
                            }
                            return "";
                        }
                    ]
                })
            }),
        });
        this._firstNameField = new VInputField({
            ref: "user-first-name", label: "First Name", value: user.firstName,
            validate: mandatory({validate: matchesName({})}),
        });
        this._lastNameField = new VInputField({
            ref: "user-last-name", label: "Last Name", value: user.lastName,
            validate: mandatory({validate: matchesName({})}),
        });
        this._roleField = new VSelectField({
            ref: "user-role", label: "Role", value: user.role,
            options: [
                {ref: "id-standard", value: "std", text: "Standard"},
                {ref: "id-contributor", value: "cnt", text: "Contributor"},
                {ref: "id-administrator", value: "adm", text: "Administrator"},
                {ref: "id-tester", value: "tst", text: "Tester"}
            ],
        });
        this._statusField = new VSelectField({
            ref: "user-status", label: "Status", value: user.status,
            options: [
                {ref: "id-active", value: "act", text: "Active"},
                {ref: "id-pending", value: "pnd", text: "Pending"},
                {ref: "id-blocked", value: "blk", text: "Blocked"}
            ],
        });
        this._avatar = new VFileLoaderField({
            ref: "user-avatar", label: "Avatar",
            imageSrc: user.avatar,
            accept: file => {
                if (!VFileLoader.isImage(file)) {
                    this._avatar.message = "The image must be a PNG or JPEG square file of size > 100 pixels.";
                    return false;
                }
                this._avatar.message = "";
                return true;
            },
            verify: image => {
                if (image.imageWidth !== image.imageHeight || image.imageWidth <= 100) {
                    this._avatar.message = "The image must be a PNG or JPEG square file of size > 100 pixels.";
                    return false;
                }
                this._avatar.message = "";
                return true;
            },
        });
        let buttons = new VButtons({
            ref: "buttons", buttons: [
                {
                    ref: "save-user", type: "accept", label: "Save",
                    onClick: event => {
                        saveUser(this.specification);
                    }
                },
                {
                    ref: "cancel-user", type: "refuse", label: "Cancel",
                    onClick: event => {
                        this.hide();
                    }
                }
            ]
        });
        this._container = new VFormContainer({ref: "signup", columns: 2}, $=>{$
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
                .addField({field: buttons});
        });
        if (!create) {
            buttons.add(new VButton({
                ref: "delete-user", type: "neutral", label: "Delete",
                onClick: event => {
                    this.confirm = new CBConfirm().show({
                        ref: "confirm-user-deletion",
                        title: "Delete User",
                        message: "Do you really want to delete the User ?",
                        actionOk: event => deleteUser(user)
                    });
                }
            }).addClass("right-button"));
        }
        this.addContainer({container: this._container});
        this.addClass("user-form");
    }

    get avatarFiles() {
        return this._avatar.files && this._avatar.files.length === 1 ?
            [{key: "avatar", file: this._avatar.files[0]}] :
            [];
    }

    get specification() {
        let spec = {
            id: this._id,
            login: this._loginField.value,
            email: this._emailField.value,
            firstName: this._firstNameField.value,
            lastName: this._lastNameField.value,
            role: this._roleField.value,
            status: this._statusField.value,
            avatar: this._avatar.imageSrc
        }
        if (this._passwordField.value) {
            spec.password = this._passwordField.value;
        }
        return spec;
    }

    showMessage(title, text) {
        new VWarning().show({title, message: text});
    }

}

export class CBUserList extends VTable {

    constructor({loadPage, updateUser, deleteUser}) {
        super({
            ref: "user-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("user-list");
        this._loadPage = loadPage;
        this._updateUser = updateUser;
        this._deleteUser = deleteUser;
    }

    set search(search) {
        this._search = search;
    }

    loadUsers() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(pageIndex) {
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

        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let selectUser = user => {
                let userEditor = new CBEditUser({
                    title: "Edit User",
                    user,
                    saveUser: user => this._updateUser(user,
                        userEditor.avatarFiles,
                        () => {
                            userEditor.hide();
                            this.refresh();
                        },
                        text => {
                            userEditor.showMessage("Fail to update User", text);
                        }
                    ),
                    deleteUser: user => this._deleteUser(user,
                        () => {
                            userEditor.hide();
                            userEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            userEditor.confirm.hide();
                            this.showMessage("Fail to delete User", text);
                        }
                    ),
                }).show();
            };
            let saveUser = user => this._updateUser(user, [],
                () => this.parent.showMessage("User saved."),
                text => this.parent.showMessage("Unable to Save User.", text),
            );
            for (let user of pageData.users) {
                let line;
                let login = new P(user.login).addClass("user-Login")
                    .onMouseClick(event => selectUser(getUser(line)));
                let firstName = new P(user.firstName).addClass("user-first-name")
                    .onMouseClick(event => selectUser(getUser(line)));
                let lastName = new P(user.lastName).addClass("user-last-name")
                    .onMouseClick(event => selectUser(getUser(line)));
                let avatar = new Img(user.avatar).addClass("user-avatar")
                    .onMouseClick(event => selectUser(getUser(line)));
                let email = new P(user.email).addClass("user-email")
                    .onMouseClick(event => selectUser(getUser(line)));
                let status = new Select().setOptions([
                    {value: "act", text: "Active"},
                    {value: "pnd", text: "Pending"},
                    {value: "blk", text: "Blocked"}
                ])
                    .addClass("form-input-select")
                    .setValue(user.status)
                    .addClass("user-status")
                    .onChange(event => saveUser(getUser(line)));
                let role = new Select().setOptions([
                    {value: "std", text: "Standard"},
                    {value: "cnt", text: "Contributor"},
                    {value: "adm", text: "Administrator"},
                    {value: "tst", text: "Tester"}
                ])
                    .addClass("form-input-select")
                    .setValue(user.role)
                    .addClass("user-role")
                    .onChange(event => saveUser(getUser(line)));
                line = {id: user.id, login, firstName, lastName, avatar, email, role, status};
                lines.push([login, firstName, lastName, avatar, email, role, status]);
            }
            let title = new Span(pageData.title)
                .addClass("user-title")
            let pageSummary = new Span()
                .addClass("user-pager")
                .setText(pageData.userCount ?
                    String.format(CBUserList.SUMMARY, pageData.userCount, pageData.firstUser, pageData.lastUser) :
                    CBUserList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Login", "First Name", "LastName", "Avatar", "Email", "Role", "Status"],
                data: lines
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

    showMessage(title, text) {
        this.parent.showMessage(title, text);
    }

    static SUMMARY = "Showing {1} to {2} of {0} user(s)";
    static EMPTY_SUMMARY = "There are no users to show";
}

export class CBUserListPage extends Vitamin(Div) {

    constructor({loadPage, createUser, updateUser, deleteUser}) {
        super({ref: "user-list-page"});
        this._search = new VSearch({
            ref: "user-list-search", searchAction: search => {
                this.loadUsers();
            }
        });
        this._create = new VButton({
            ref: "user-create", type: "neutral", label: "Create User",
            onClick: event => {
                this._createUserModal = new CBEditUser({
                    title: "Create User",
                    create: true,
                    user: {
                        avatar: "../images/site/avatars/default-avatar.png", role: "std", status: "pnd"
                    },
                    saveUser: user => createUser(user,
                        this.createUserModal.avatarFiles,
                        () => {
                            this.createUserModal.hide();
                            this.refresh();
                        },
                        text => {
                            this.showMessage("Fail to create User", text);
                        }
                    ),
                    deleteUser: () => {
                        this.createUserModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBUserList({loadPage, updateUser, deleteUser});
        this.add(this._search).add(this._table);
    }

    get createUserModal() {
        return this._createUserModal;
    }

    loadUsers() {
        this._table.search = this._search.value;
        this._table.loadUsers();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

    showMessage(title, text) {
        new VWarning().show({title, message: text});
    }

}

export function loadUsers(pageIndex, search, update) {
    sendGet("/api/account/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            console.log("Load user success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "User List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                userCount: response.count,
                firstUser: response.page * response.pageSize + 1,
                lastUser: response.page * response.pageSize + response.users.length,
                users: response.users//getUsers(pageIndex)
            });
        },
        (text, status) => {
            console.log("Load user failure: " + text + ": " + status);
            this.showMessage("Unable to load Users", text);
        }
    );
}

export function createUser(user, avatar, success, failure) {
    sendPost("/api/account/create",
        user,
        (text, status) => {
            console.log("Account creation success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Account creation failure: " + text + ": " + status);
            failure(text, status);
        },
        avatar
    );
}

export function deleteUser(user, success, failure) {
    sendGet("/api/account/delete/" + user.id,
        (text, status) => {
            console.log("Account delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Account delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function updateUser(user, avatar, success, failure) {
    sendPost("/api/account/update/" + user.id,
        user,
        (text, status) => {
            console.log("Account update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Account update failure: " + text + ": " + status);
            failure(text, status);
        },
        avatar
    );
}

export var vUserList = new CBUserListPage({
    loadPage: loadUsers,
    createUser,
    deleteUser,
    updateUser
});