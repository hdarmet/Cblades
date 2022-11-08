'use strict';

import {
    Undoable, Vitamin
} from "../vitamin/vitamins.js";
import {
    Div, P, requestLog, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    VContainer, VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    VButton, VButtons, VInputField, VInputTextArea, VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";

export class CBANotice extends Vitamin(Div) {

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

export class CBANoticeEditor extends Undoable(VSplitterPanel) {

    constructor() {
        super({ref: "notice-editor"});
        this.addClass("notice-editor");
        this._noticeDisplayContainer = new Div().addClass("notice-display-container");
        this.addOnLeft(this._noticeDisplayContainer);
        this._noticeDisplay = new CBANotice({ref: "notice-display"});
        this._noticeDisplayContainer.add(this._noticeDisplay);
        this._versionContainer = new VContainer({columns: 2});
        this.addOnRight(this._versionContainer);
        this._version = new VSelectField({
            ref: "notice-version", label: "Version",
            onInput: event => {
                this.tryToLeave(() => {
                        this.parent.changeNotice(this._version.value);
                    },
                    () => {
                        this._version.value = this._noticeObject.version;
                    });
            }
        });
        this._newVersion = new VInputField({
            ref: "notice-new-version", label: "New Version",
            validate: (field, quit) => {
                if (field.value !== undefined) {
                    for (let option of this._version.optionLines) {
                        if (option.value === field.value) {
                            this._copy.enabled = false;
                            return "This version already exist";
                        }
                    }
                }
                if (field.value !== undefined && field.value.length > 0) {
                    this._copy.enabled = true;
                }
                return "";
            },
            onInput: event => {
            }
        });
        this._copy = new VButton({
            ref: "copy-notice", type: "neutral", label: "Copy", enabled: false, onClick: () => {
                this.tryToLeave(() => {
                        let notice = {
                            title: this._noticeObject.title,
                            notice: this._noticeObject.notice,
                            version: this._newVersion.value,
                            published: false
                        }
                        this.setNotice(notice);
                        this.parent.addVersion(notice);
                        this._newVersion.value = "";
                        showMessage("You're working now on a new version.");
                    },
                    () => {
                    });
            }
        });
        this._newVersion.add(this._copy);
        this._versionContainer
            .addField({field: this._version})
            .addField({field: new Div().addClass("new-version").add(this._newVersion).add(this._copy)});
        this._title = new VInputField({
            ref: "notice-content-title", label: "Titre de la Notice",
            onInput: event => {
                this._noticeDisplay.title = this._title.value;
            },
            onChange: event => {
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._notice = new VInputTextArea({
            ref: "notice-content-input", label: "Contenu de la Notice",
            heading: true,
            onInput: event => {
                this._noticeDisplay.content = this._notice.value;
            },
            onChange: event => {
                this._memorize();
            }
        });
        this.addOnRight(this._notice);
        this._buttons = new VButtons({
            buttons: [
                {
                    ref: "save-notice", label: "Save", type: "accept", onClick: event => {
                        this._noticeObject.title = this._title.value;
                        this._noticeObject.notice = this._notice.value;
                        this.parent.save(this._noticeObject, "Notice Saved", "Fail to Save Notice");
                    }
                },
                {
                    ref: "publish-notice", label: "Publish", type: "publish", onClick: event => {
                        this._noticeObject.title = this._title.value;
                        this._noticeObject.notice = this._notice.value;
                        this.parent.publish(this._noticeObject);
                        this.parent.save(this._noticeObject, "Notice Published", "Fail to Publish Notice");
                    }
                },
                {
                    ref: "delete-notice", label: "Delete", type: "neutral", onClick: event => {
                        new CBAConfirm().show({
                            ref: "confirm-notice-deletion",
                            title: "Delete Notice Version",
                            message: "Do you really want to delete this version of the Notice ?",
                            actionOk: () => {
                                this.parent.delete(this._noticeObject, "Notice Deleted", "Fail to Delete Notice");
                            }
                        });
                    }
                },
                {
                    ref: "cancel-edition", label: "Cancel", type: "refuse", onClick: event => {
                        this.setNotice(this._noticeObject);
                    }
                }
            ]
        });
        this.addOnRight(this._buttons);
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave, "Notice not saved. Do you want to Change ?")
    }

    _editNotice() {
        this._title.value = this._noticeDisplay.title;
        this._notice.value = this._noticeDisplay.content;
    }

    setNotice(notice) {
        this._noticeObject = notice;
        this._noticeDisplay.title = notice.title;
        this._noticeDisplay.content = notice.notice;
        this._version.value = notice.version;
        this._editNotice();
        this._clean();
        this._memorize();
        return this;
    }

    setVersions(versions) {
        this._version.optionLines = versions;
        if (this._noticeObject) {
            this._version.value = this._noticeObject.version;
            this.get("publish-notice").enabled = !this._noticeObject.published;
            this.get("delete-notice").enabled = !this._noticeObject.published;
        }
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

export class CBANoticeEditorPage extends VContainer {
    constructor() {
        super({ref: "notice-editor-page"});
        this._title = new P("").addClass("page-title");
        this._noticeEditor = new CBANoticeEditor();
        this.addClass("notice-editor-page")
            .add(this._title)
            .add(this._noticeEditor);
    }

    tryToLeave(leave, notLeave) {
        this._noticeEditor.tryToLeave(leave, notLeave);
    }

    setTitle(title) {
        this._title.setText(title);
        return this;
    }

    setNotice(notice) {
        this._noticeEditor.setNotice(notice);
        this.setVersions();
        return this;
    }

    changeNotice(version) {
        this._current = this._notices.find(notice => notice.version === version);
        this.setNotice(this._current);
        return this;
    }

    addVersion(notice) {
        this._notices.push(notice);
        this.setVersions();
        return this;
    }

    removeVersion(notice) {
        this._notices.remove(notice);
        this.setVersions();
        return this;
    }

    setVersions() {
        let versions = this._notices.map(notice => {
            return {
                value: notice.version,
                text: notice.version + (notice.published ? " (published)" : "")
            }
        });
        this._noticeEditor.setVersions(versions);
        return this;
    }

    setNotices(notices) {
        this._notices = notices;
        this.editPublishedNotice();
        return this;
    }

    editPublishedNotice() {
        this._current = this._notices.find(notice => notice.published);
        this.setNotice(this._current);
        return this;
    }

    setSave(saveAction) {
        this._saveAction = saveAction;
        return this;
    }

    setDelete(deleteAction) {
        this._deleteAction = deleteAction;
        return this;
    }

    save(notice, successMessage, errorMessage) {
        this._saveAction(notice, successMessage, errorMessage);
    }

    delete(notice, successMessage, errorMessage) {
        this._deleteAction(notice, successMessage, errorMessage);
    }

    publish(publishedNotice) {
        this._notices.forEach(notice => notice.published = notice === false);
        publishedNotice.published = true;
        return this;
    }

}

let vNoticeEditorPage = new CBANoticeEditorPage();

export function loadNotices(category, success, failure) {
    sendGet("/api/notice/by-category/" + category,
        (text, status) => {
            let notices = JSON.parse(text);
            requestLog("Notices loaded.")
            success(notices, status);
        },
        (text, status) => {
            requestLog("Fail to load notices")
            failure(text, status);
        }
    );
}

export function saveNotice(notice, success, failure) {
    sendPost("/api/notice/save",
        notice,
        (text, status) => {
            requestLog("Notice saved")
            success(text, status);
        },
        (text, status) => {
            requestLog("Fail to save notice")
            failure(text, status);
        }
    );
}

export function deleteNotice(notice, success, failure) {
    sendGet("/api/notice/delete/" + notice.id,
        (text, status) => {
            requestLog("Notice deleted")
            success(text, status);
        },
        (text, status) => {
            requestLog("Fail to delete notice")
            failure(text, status);
        }
    );
}

export function editNotice(title, category, byHistory, historize) {
    this.changePage(null, vNoticeEditorPage, byHistory, historize,
        switchPage => loadNotices(category,
            (notices, status) => {
                vNoticeEditorPage
                    .setTitle(title)
                    .setNotices(notices.map(notice => {
                        return {
                            id: notice.id,
                            objVersion: notice.version,
                            title: notice.title,
                            notice: notice.text,
                            version: notice.noticeVersion,
                            published: notice.published
                        }
                    }))
                    .setSave((notice, successMessage, failureMessage) => {
                        saveNotice({
                            id: notice.id,
                            version: notice.objVersion,
                            title: notice.title,
                            text: notice.notice,
                            noticeVersion: notice.version,
                            published: notice.published,
                            category
                        },
                        (text, status) => {
                            let result = JSON.parse(text);
                            if (notice.id === undefined) {
                                notice.id = result.id;
                                notice.objVersion = result.version;
                            }
                            vNoticeEditorPage.setVersions();
                            showMessage(successMessage);
                        },
                        (text, status) => {
                            showMessage(failureMessage, text);
                        })
                    })
                    .setDelete((notice, successMessage, failureMessage) => {
                        deleteNotice(notice,
                        (text, status) => {
                            vNoticeEditorPage.editPublishedNotice();
                            vNoticeEditorPage.removeVersion(notice);
                            showMessage(successMessage);
                        },
                        (text, status) => {
                            showMessage(failureMessage, text);
                        })
                    }
                );
                switchPage();
            },
            (text, status) => {
                showMessage("Cannot load notices of category: " + category, text);
            }
        )
    )
}