'use strict';

import {
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    VButton,
    VButtons,
    VFileLoader,
    VFileLoaderField,
    VFormContainer,
    VInputTextArea,
    VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBConfirm
} from "./cbadministration.js";

export class CBEditAnnouncement extends VModal {

    constructor({title, create, announcement, saveAnnouncement, deleteAnnouncement}) {
        super({"announcement": "announcement-form", "title": title});
        this._id = announcement.id;
        this._descriptionField = new VInputTextArea({
            ref: "announcement-description", label: "Texte de l'annonce",
            value: announcement.description,
            heading: true
        });
        this._statusField = new VSelectField({
            ref: "announcement-status", label: "Statut",
            value: announcement.status,
            options: [
                {ref: "id-live", value: "live", text: "Live"},
                {ref: "id-archived", value: "arch", text: "Archived"},
                {ref: "id-soon", value: "soon", text: "Coming Soon"}
            ],
        });
        this._illustration = new VFileLoaderField({
            ref: "announcement-illustration", label: "Illustration",
            imageSrc: announcement.illustration,
            accept: file => {
                if (!VFileLoader.isImage(file)) {
                    this._illustration.message = "The image must be a PNG or JPEG file of size > (200 x 500) pixels.";
                    return false;
                }
                this._illustration.message = "";
                return true;
            },
            verify: image => {
                if (image.imageHeight <= 200 || image.imageWidth <= 500) {
                    this._illustration.message = "The image must be a PNG or JPEG file of size > (200 x 500) pixels.";
                    return false;
                }
                this._illustration.message = "";
                return true;
            },
        });
        let buttons = new VButtons({
            ref: "buttons", buttons: [
                {
                    ref: "save-announcement", type: "accept", label: "Save",
                    onClick: event => {
                        saveAnnouncement(this.specification);
                    }
                },
                {
                    ref: "cancel-announcement", type: "refuse", label: "Cancel",
                    onClick: event => {
                        this.hide();
                    }
                }
            ]
        });
        this._container = new VFormContainer({ref: "annoucement-container", columns: 1}, $=>{$
            .addField({field: this._illustration})
            .addField({field: this._descriptionField})
            .addField({field: this._statusField})
            .addField({field: buttons});
        });
        if (!create) {
            buttons.add(new VButton({
                ref: "delete-announcement", type: "neutral", label: "Delete",
                onClick: event => {
                    this.confirm = new CBConfirm().show({
                        ref: "confirm-announcement-deletion",
                        title: "Delete Announcement",
                        message: "Do you really want to delete the Announcement ?",
                        actionOk: event => deleteAnnouncement(announcement)
                    });
                }
            }).addClass("right-button"));
        }
        this.addContainer({container: this._container});
        this.addClass("announcement-form");
    }

    get illustrationFiles() {
        return this._illustration.files && this._illustration.files.length === 1 ?
            [{key: "illustration", file: this._illustration.files[0]}] :
            [];
    }

    get specification() {
        return {
            id: this._id,
            description: this._descriptionField.value,
            status: this._statusField.value,
            illustration: this._illustration.imageSrc
        };
    }

}

export class CBAnnouncementList extends VTable {

    constructor({loadPage, updateAnnouncement, deleteAnnouncement}) {
        super({
            ref: "announcement-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("announcement-list");
        this._loadPage = loadPage;
        this._updateAnnouncement = updateAnnouncement;
        this._deleteAnnouncement = deleteAnnouncement;
    }

    set search(search) {
        this._search = search;
    }

    loadAnnouncements() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(pageIndex) {
        function getAnnouncement(line) {
            return {
                id: line.id,
                description: line.description.getText(),
                status: line.status.getValue(),
                illustration: line.illustration.getSrc()
            };
        }

        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let selectAnnouncement = announcement => {
                let announcementEditor = new CBEditAnnouncement({
                    title: "Edit Announcement",
                    announcement,
                    saveAnnouncement: announcement => this._updateAnnouncement(announcement,
                        announcementEditor.illustrationFiles,
                        () => {
                            announcementEditor.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Announcement", text);
                        }
                    ),
                    deleteAnnouncement: announcement => this._deleteAnnouncement(announcement,
                        () => {
                            announcementEditor.hide();
                            announcementEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            announcementEditor.confirm.hide();
                            showMessage("Fail to delete Announcement", text);
                        }
                    ),
                }).show();
            };
            let saveAnnouncement = annoucement => this._updateAnnouncement(annoucement, [],
                () => showMessage("Announcement saved."),
                text => showMessage("Unable to Save Announcement.", text),
            );
            for (let announcement of pageData.announcements) {
                let line;
                let illustration = new Img(announcement.illustration).addClass("announcement-illustration")
                    .onMouseClick(event => selectAnnouncement(getAnnouncement(line)));
                let description = new P(announcement.description).addClass("announcement-description")
                    .onMouseClick(event => selectAnnouncement(getAnnouncement(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "arch", text: "Archived"},
                    {value: "soon", text: "Coming Soon"}
                ])
                    .addClass("form-input-select")
                    .setValue(announcement.status)
                    .addClass("announcement-status")
                    .onChange(event => saveAnnouncement(getAnnouncement(line)));
                line = {id: announcement.id, description, illustration, status};
                lines.push([illustration, description, status]);
            }
            let title = new Span(pageData.title)
                .addClass("announcement-title")
            let pageSummary = new Span()
                .addClass("announcement-pager")
                .setText(pageData.announcementCount ?
                    String.format(CBAnnouncementList.SUMMARY, pageData.announcementCount, pageData.firstAnnouncement, pageData.lastAnnouncement) :
                    CBAnnouncementList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Illustration", "Description", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} announcement(s)";
    static EMPTY_SUMMARY = "There are no announcement to show";
}

export class CBAnnouncementListPage extends Vitamin(Div) {

    constructor({loadPage, createAnnouncement, updateAnnouncement, deleteAnnouncement}) {
        super({ref: "announcement-list-page"});
        this._search = new VSearch({
            ref: "announcement-list-search", searchAction: search => {
                this.loadAnnouncements();
            }
        });
        this._create = new VButton({
            ref: "announcement-create", type: "neutral", label: "Create Announcement",
            onClick: event => {
                this._createAnnouncementModal = new CBEditAnnouncement({
                    title: "Create Announcement",
                    create: true,
                    announcement: {
                        illustration: "../images/site/announcement/default-announcement.png", status: "soon"
                    },
                    saveAnnouncement: announcement => createAnnouncement(announcement,
                        this._createAnnouncementModal.illustrationFiles,
                        () => {
                            this._createAnnouncementModal.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Announcement", text);
                        }
                    ),
                    deleteAnnouncement: () => {
                        this._createAnnouncementModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAnnouncementList({loadPage, updateAnnouncement, deleteAnnouncement});
        this.add(this._search).add(this._table);
    }

    get createAnnouncementModal() {
        return this._createAnnouncementModal;
    }

    loadAnnouncements() {
        this._table.search = this._search.value;
        this._table.loadAnnouncements();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadAnnouncements(pageIndex, search, update) {
    sendGet("/api/announcement/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            console.log("Load announcements success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Announcement List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                announcementCount: response.count,
                firstAnnouncement: response.page * response.pageSize + 1,
                lastAnnouncement: response.page * response.pageSize + response.announcements.length,
                announcements: response.announcements
            });
        },
        (text, status) => {
            console.log("Load Announcement failure: " + text + ": " + status);
            showMessage("Unable to load Announcements", text);
        }
    );
}

export function createAnnouncement(announcement, illustration, success, failure) {
    sendPost("/api/announcement/create",
        announcement,
        (text, status) => {
            console.log("Announcement creation success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Announcement creation failure: " + text + ": " + status);
            failure(text, status);
        },
        illustration
    );
}

export function deleteAnnouncement(announcement, success, failure) {
    sendGet("/api/announcement/delete/" + announcement.id,
        (text, status) => {
            console.log("Announcement delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Announcement delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function updateAnnouncement(announcement, illustration, success, failure) {
    sendPost("/api/announcement/update/" + announcement.id,
        announcement,
        (text, status) => {
            console.log("Announcement update success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            console.log("Announcement update failure: " + text + ": " + status);
            failure(text, status);
        },
        illustration
    );
}

export var vAnnouncementList = new CBAnnouncementListPage({
    loadPage: loadAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    updateAnnouncement
});