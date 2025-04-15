'use strict';

import {
    VTable
} from "../vitamin/vcontainer.js";
import {
    sendGet, sendPost
} from "../board/draw.js";
import {
    Div, Img, isImageFile, P, requestLog, Select, Span
} from "../vitamin/components.js";
import {
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    VButton,
    VButtons, VDateField,
    VFileLoader,
    VFileLoaderField,
    VFormContainer,
    VInputField, VInputTextArea, VRef,
    VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";
import {
    CBAUserSelector, loadUsers
} from "./cba-user.js";

export class CBAEditEvent extends VModal {

    constructor({title, create, event, saveEvent, deleteEvent}) {
        super({"event": "event-form", "title": title});
        this._id = event.id;
        this._dateField = new VDateField({
            ref: "event-date", label: "Date",
            value: event.date
        });
        this._titleField = new VInputField({
            ref: "event-title", label: "Titre",
            value: event.title
        });
        this._descriptionField = new VInputTextArea({
            ref: "event-description", label: "Description",
            value: event.description,
            heading: true
        });
        this._statusField = new VSelectField({
            ref: "event-status", label: "Statut",
            value: event.status,
            options: [
                {ref: "id-live", value: "live", text: "Live"},
                {ref: "id-archived", value: "arch", text: "Archived"},
                {ref: "id-soon", value: "soon", text: "Coming Soon"}
            ],
        });
        this._illustration = new VFileLoaderField({
            ref: "event-illustration", label: "Illustration",
            imageSrc: event.illustration,
            accept: file => {
                if (!isImageFile(file)) {
                    this._illustration.message = "The image must be a PNG or JPEG file of size > (200 x 100) pixels.";
                    return false;
                }
                this._illustration.message = "";
                return true;
            },
            verify: image => {
                if (image.imageHeight <= 100 || image.imageWidth <= 200) {
                    this._illustration.message = "The image must be a PNG or JPEG file of size > (200 x 100) pixels.";
                    return false;
                }
                this._illustration.message = "";
                return true;
            },
        });
        let userSelector = new CBAUserSelector({title:"Select Event User", loadPage:loadUsers, selectUser: user=>{
                this._target.setValue(user);
                userSelector.hide();
            }
        }).loadUsers();
        this._target = new VRef({
            ref: "target", label: "Target", nullable: true, selector: userSelector,
            value: event.target,
            lineCreator: account=> new Div().addClass("user-ref")
                .add(new Img(account.avatar).addClass("user-avatar"))
                .add(new Div().setText(account.login).addClass("user-login"))
                .add(new Div().setText(account.firstName).addClass("user-first-name"))
                .add(new Div().setText(account.lastName).addClass("user-last-name")
            )
        });
        let buttons = new VButtons({
            ref: "buttons", buttons: [{
                    ref: "save-event", type: "accept", label: "Save",
                    onClick: event => {
                        saveEvent(this.specification);
                    }
                },
                {
                    ref: "cancel-event", type: "refuse", label: "Cancel",
                    onClick: event => {
                        this.hide();
                    }
                }
            ]
        });
        this._container = new VFormContainer({ref: "event-container", columns: 1}, $=>{$
            .addField({field: this._titleField})
            .addContainer({ columns:3 }, $=>{$
                .addField({field: this._illustration})
                .addField({field: this._dateField})
                .addField({field: this._statusField})
            })
            .addField({field: this._descriptionField})
            .addField({field: this._target})
            .addField({field: buttons});
        });
        if (!create) {
            buttons.add(new VButton({
                ref: "delete-event", type: "neutral", label: "Delete",
                onClick: evt => {
                    this.confirm = new CBAConfirm().show({
                        ref: "confirm-event-deletion",
                        title: "Delete Event",
                        message: "Do you really want to delete the Event ?",
                        actionOk: evt => deleteEvent(event)
                    });
                }
            }).addClass("right-button"));
        }
        this.add(this._container);
        this.addClass("event-form");
    }

    get illustrationFiles() {
        return this._illustration.files && this._illustration.files.length === 1 ?
            [{key: "illustration", file: this._illustration.files[0]}] :
            [];
    }

    get specification() {
        return {
            id: this._id,
            date: this._dateField.value,
            title: this._titleField.value,
            description: this._descriptionField.value,
            status: this._statusField.value,
            illustration: this._illustration.imageSrc,
            target: this._target.value
        };
    }

}

export class CBAEventList extends VTable {

    constructor({loadPage, saveEvent, saveEventStatus, deleteEvent}) {
        super({
            ref: "event-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectEvent(line)
        });
        this.addClass("event-list");
        this._loadPage = loadPage;
        this._saveEvent = saveEvent;
        this._saveEventStatus = saveEventStatus;
        this._deleteEvent = deleteEvent;
    }

    set search(search) {
        this._search = search;
    }

    loadEvents() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectEvent(event) {
        let eventEditor = new CBAEditEvent({
            title: "Edit Event",
            event,
            saveEvent: event => this._saveEvent(event,
                eventEditor.illustrationFiles,
                () => {
                    eventEditor.hide();
                    this.refresh();
                },
                text => {
                    showMessage("Fail to update Event", text);
                }
            ),
            deleteEvent: event => this._deleteEvent(event,
                () => {
                    eventEditor.hide();
                    eventEditor.confirm.hide();
                    this.refresh();
                },
                text => {
                    eventEditor.confirm.hide();
                    showMessage("Fail to delete Event", text);
                }
            ),
        }).show();
    }

    setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveEventStatus = (event, status) => {
                event.status = status;
                this._saveEventStatus(event,
                    () => showMessage("Event saved."),
                    text => showMessage("Unable to Save Event.", text),
                );
            }
            for (let event of pageData.events) {
                let date = new Span(event.date).addClass("event-date");
                let title = new Span(event.title).addClass("event-title");
                let illustration = event.illustration ? new Img(event.illustration).addClass("event-illustration") : new Div();
                let description = new P(event.description).addClass("event-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "arch", text: "Archived"},
                    {value: "soon", text: "Coming Soon"}
                ])
                    .addClass("form-input-select")
                    .setValue(event.status)
                    .addClass("event-status")
                    .onChange(evt => saveEventStatus(event, status.getValue()));
                lines.push({source:event, cells:[date, title, illustration, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("event-title")
            let pageSummary = new Span()
                .addClass("event-pager")
                .setText(pageData.eventCount ?
                    String.format(CBAEventList.SUMMARY, pageData.eventCount, pageData.firstEvent, pageData.lastEvent) :
                    CBAEventList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Date", "Title", "Illustration", "Description", "Status"],
                lines
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

    static SUMMARY = "Showing {1} to {2} of {0} event(s)";
    static EMPTY_SUMMARY = "There are no event to show";
}

export class CBAEventListPage extends Vitamin(Div) {

    constructor({loadPage, saveEvent, saveEventStatus, deleteEvent}) {
        super({ref: "event-list-page"});
        this._search = new VSearch({
            ref: "event-list-search", searchAction: search => {
                this.loadEvents();
            }
        });
        this._create = new VButton({
            ref: "event-create", type: "neutral", label: "Create Event",
            onClick: event => {
                this._createEventModal = new CBAEditEvent({
                    title: "Create Event",
                    create: true,
                    event: {
                        status: "soon"
                    },
                    saveEvent: event => saveEvent(event,
                        this._createEventModal.illustrationFiles,
                        () => {
                            this._createEventModal.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Event", text);
                        }
                    ),
                    deleteEvent: () => {
                        this._createEventModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAEventList({loadPage, saveEvent, saveEventStatus, deleteEvent});
        this.add(this._search).add(this._table);
    }

    get createEventModal() {
        return this._createEventModal;
    }

    loadEvents() {
        this._table.search = this._search.value;
        this._table.loadEvents();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadEvents(pageIndex, search, update) {
    sendGet("/api/event/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load events success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Events List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                eventCount: response.count,
                firstEvent: response.page * response.pageSize + 1,
                lastEvent: response.page * response.pageSize + response.events.length,
                events: response.events
            });
        },
        (text, status) => {
            requestLog("Load Event failure: " + text + ": " + status);
            showMessage("Unable to load Events", text);
        }
    );
}

export function deleteEvent(event, success, failure) {
    sendGet("/api/event/delete/" + event.id,
        (text, status) => {
            requestLog("Event delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Event delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveEvent(event, illustration, success, failure) {
    sendPost(event.id===undefined ? "/api/event/create" : "/api/event/update/" + event.id,
        event,
        (text, status) => {
            requestLog("Event saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Event saving failure: " + text + ": " + status);
            failure(text, status);
        },
        illustration
    );
}

export function saveEventStatus(event, success, failure) {
    sendPost("/api/event/update-status/" + event.id,
        event,
        (text, status) => {
            requestLog("Event status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Event status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vEventList = new CBAEventListPage({
    loadPage: loadEvents,
    deleteEvent,
    saveEvent,
    saveEventStatus
});