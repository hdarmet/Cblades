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
    VButtons, VDateField,
    VFileLoader,
    VFileLoaderField,
    VFormContainer,
    VInputField, VInputTextArea,
    VSelectField
} from "../vitamin/vforms.js";
import {
    VWarning
} from "../vitamin/vpage.js";
import {
    CBConfirm
} from "./cbadministration.js";

export class CBEditEvent extends VModal {

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
                if (!VFileLoader.isImage(file)) {
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
        let buttons = new VButtons({
            ref: "buttons", buttons: [
                {
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
            .addField({field: buttons});
        });
        if (!create) {
            buttons.add(new VButton({
                ref: "delete-event", type: "neutral", label: "Delete",
                onClick: evt => {
                    this.confirm = new CBConfirm().show({
                        ref: "confirm-event-deletion",
                        title: "Delete Event",
                        message: "Do you really want to delete the Event ?",
                        actionOk: evt => deleteEvent(event)
                    });
                }
            }).addClass("right-button"));
        }
        this.addContainer({container: this._container});
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
            illustration: this._illustration.imageSrc
        };
    }

    showMessage(title, text) {
        new VWarning().show({title, message: text});
    }

}

export class CBEventList extends VTable {

    constructor({loadPage, updateEvent, deleteEvent}) {
        super({
            ref: "event-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("event-list");
        this._loadPage = loadPage;
        this._updateEvent = updateEvent;
        this._deleteEvent = deleteEvent;
    }

    set search(search) {
        this._search = search;
    }

    loadEvents() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    _setPage(pageIndex) {
        function getEvent(line) {
            return {
                id: line.id,
                date: line.date.getText(),
                title: line.title.getText(),
                description: line.description.getText(),
                status: line.status.getValue(),
                illustration: line.illustration.getSrc()
            };
        }

        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let selectEvent = event => {
                let eventEditor = new CBEditEvent({
                    title: "Edit Event",
                    event,
                    saveEvent: event => this._updateEvent(event,
                        eventEditor.illustrationFiles,
                        () => {
                            eventEditor.hide();
                            this.refresh();
                        },
                        text => {
                            eventEditor.showMessage("Fail to update Event", text);
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
                            this.showMessage("Fail to delete Event", text);
                        }
                    ),
                }).show();
            };
            let saveEvent = event => this._updateEvent(event, [],
                () => this.parent.showMessage("Event saved."),
                text => this.parent.showMessage("Unable to Save Event.", text),
            );
            for (let event of pageData.events) {
                let line;
                let date = new Span(event.date).addClass("event-date")
                    .onMouseClick(event => selectEvent(getEvent(line)));
                let title = new Span(event.title).addClass("event-title")
                    .onMouseClick(event => selectEvent(getEvent(line)));
                let illustration = new Img(event.illustration).addClass("event-illustration")
                    .onMouseClick(event => selectEvent(getEvent(line)));
                let description = new P(event.description).addClass("event-description")
                    .onMouseClick(event => selectEvent(getEvent(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "arch", text: "Archived"},
                    {value: "soon", text: "Coming Soon"}
                ])
                    .addClass("form-input-select")
                    .setValue(event.status)
                    .addClass("event-status")
                    .onChange(event => saveEvent(getEvent(line)));
                line = {id: event.id, date, title, description, illustration, status};
                lines.push([date, title, illustration, description, status]);
            }
            let title = new Span(pageData.title)
                .addClass("event-title")
            let pageSummary = new Span()
                .addClass("event-pager")
                .setText(pageData.eventCount ?
                    String.format(CBEventList.SUMMARY, pageData.eventCount, pageData.firstEvent, pageData.lastEvent) :
                    CBEventList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Date", "Title", "Illustration", "Description", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} event(s)";
    static EMPTY_SUMMARY = "There are no event to show";
}

export class CBEventListPage extends Vitamin(Div) {

    constructor({loadPage, createEvent, updateEvent, deleteEvent}) {
        super({ref: "event-list-page"});
        this._search = new VSearch({
            ref: "event-list-search", searchAction: search => {
                this.loadEvents();
            }
        });
        this._create = new VButton({
            ref: "event-create", type: "neutral", label: "Create Event",
            onClick: event => {
                this._createEventModal = new CBEditEvent({
                    title: "Create Event",
                    create: true,
                    event: {
                        status: "soon"
                    },
                    saveEvent: event => createEvent(event,
                        this._createEventModal.illustrationFiles,
                        () => {
                            this._createEventModal.hide();
                            this.refresh();
                        },
                        text => {
                            this.showMessage("Fail to create Event", text);
                        }
                    ),
                    deleteEvent: () => {
                        this._createEventModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBEventList({loadPage, updateEvent, deleteEvent});
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

    showMessage(title, text) {
        new VWarning().show({title, message: text});
    }

}

export var vEventList = new CBEventListPage({
    loadPage: (pageIndex, search, update) => {
        sendGet("/api/event/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
            (text, status) => {
                console.log("Load events success: " + text + ": " + status);
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
                console.log("Load Event failure: " + text + ": " + status);
                this.showMessage("Unable to load Events", text);
            }
        );
    },
    createEvent: (event, illustration, success, failure) => {
        sendPost("/api/event/create",
            event,
            (text, status) => {
                console.log("Event creation success: " + text + ": " + status);
                success(text, status);
            },
            (text, status) => {
                console.log("Event creation failure: " + text + ": " + status);
                failure(text, status);
            },
            illustration
        );
    },
    deleteEvent: (event, success, failure) => {
        sendGet("/api/event/delete/" + event.id,
            (text, status) => {
                console.log("Event delete success: " + text + ": " + status);
                success(text, status);
            },
            (text, status) => {
                console.log("Event delete failure: " + text + ": " + status);
                failure(text, status);
            }
        );
    },
    updateEvent: (event, illustration, success, failure) => {
        sendPost("/api/event/update/" + event.id,
            event,
            (text, status) => {
                console.log("Event update success: " + text + ": " + status);
                success(text, status);
            },
            (text, status) => {
                console.log("Event update failure: " + text + ": " + status);
                failure(text, status);
            },
            illustration
        );
    }
});