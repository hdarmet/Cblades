'use strict';

import {
    VContainer,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, requestLog, sendGet, Span, I
} from "../vitamin/components.js";
import {
    Undoable,
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range, VButton,
    VButtons, VInputField, VInputTextArea, VOptionViewer, VRef, VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";


export class CBAEditReportEvent extends Undoable(VModal) {

    constructor({create, event, confirm, title}) {
        super({ref:"edit-report-event", title});
        this._target = new Div().addClass("user-ref")
            .add(new Img(event.target.avatar).addClass("user-avatar"))
            .add(new Div().setText(event.target.login).addClass("user-login"))
            .add(new Div().setText(event.target.firstName).addClass("user-first-name"))
            .add(new Div().setText(event.target.lastName).addClass("user-last-name"));
        this.add(this._target);
        this._title = new VInputField({
            ref:"event-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._title);
        this._description = new VInputTextArea({
            ref:"event-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:4995})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._description);
        this._buttons = new VButtons({
            ref: "buttons", buttons: [
                {
                    ref: "ok-event", type: "accept", label: "Ok",
                    onClick: event => {
                        if (this.validate()) {
                            confirm(this.event);
                            this.hide();
                        }
                    }
                },
                {
                    ref: "close-event", type: "neutral", label: "Close",
                    onClick: event => {
                        this.tryToLeave(() => {
                            this.hide();
                        });
                    }
                }
            ]
        });
        this._deleteButton = new VButton({
            ref: "delete-event", type: "refuse", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-event-deletion",
                    title: "Delete Message",
                    message: "Do you really want to delete the Message ?",
                    actionOk: event => {
                        confirm(null);
                        this.hide();
                    }
                });
            }
        });
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("forum-modal");
        this.event = event;
    }

    validate() {
        return !this._title.validate()
            & !this._description.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Message not saved. Do you want to Quit ?")
    }

    get event() {
        return {
            id: this._event.id,
            title: this._title.value,
            description: this._description.value,
            target: this._event.target
        }
    }

    set event(event) {
        this._event = event;
        this._title.value = event.title || "";
        this._description.value = event.description || "";
        this._clean();
        this._memorize();
    }

    _register() {
        return this.event;
    }

    _recover(event) {
        if (event) {
            this._title.value = event.name;
            this._description.value = event.description;
        }
    }

}

export class CBAProcessReport extends Undoable(VModal) {

    constructor({report}) {
        super({ref:"process-report-modal", title: "Process Report"});
        this._sendDate = new Span(new Date(report.sendDate).toLocaleDateString()).addClass("report-date");
        this._reason = new VOptionViewer({value: report.reason, options: [
                {value: "rude", text:"Le propos est injurieux ou offensant."},
                {value: "off-topic", text:"Le propos est hors sujet."}
            ]}).addClass("report-reason");
        this._author = new Div().addClass("user-ref")
            .add(new Img(report.author.avatar).addClass("user-avatar"))
            .add(new Div().setText(report.author.login).addClass("user-login"))
            .add(new Div().setText(report.author.firstName).addClass("user-first-name"))
            .add(new Div().setText(report.author.lastName).addClass("user-last-name"))
            .add(new I("envelope-o").addClass("user-message").onMouseClick(
                evt=>{
                    new CBAEditReportEvent({
                        title: "Message to Reporter",
                        create: !report.authorEvent,
                        event: report.authorEvent || {
                            title: "Title",
                            description: "Description",
                            target: report.author
                        },
                        confirm: event=>{
                            report.authorEvent = event
                        }
                    }).show();
                }
            ));
        this._text = new P(report.text).addClass("report-text");
        this._messageTitle = new Span("Related Message").addClass("report-message-title");
        this._messageForum = new Div().addClass("report-message-forum")
            .add(new Span("Forum:").addClass("report-message-forum-label"))
            .add(new Span(report.message.thread.forum.title).addClass("report-message-forum-title"));
        this._messageThread = new Div().addClass("report-message-thread")
            .add(new Span("Thread:").addClass("report-message-thread-label"))
            .add(new Span(report.message.thread.title).addClass("report-message-thread-title"));
        this._messageDate = new Span(new Date(report.message.publishedDate).toLocaleDateString()).addClass("report-message-date");
        this._messageText = new P(report.message.text).addClass("report-message-text");
        this._messageAuthor = new Div().addClass("user-ref")
            .add(new Img(report.message.author.avatar).addClass("user-avatar"))
            .add(new Div().setText(report.message.author.login).addClass("user-login"))
            .add(new Div().setText(report.message.author.firstName).addClass("user-first-name"))
            .add(new Div().setText(report.message.author.lastName).addClass("user-last-name"))
            .add(new I("envelope-o").addClass("user-message").onMouseClick(
                evt=>{
                    new CBAEditReportEvent({
                        title: "Message to Post Author",
                        create: !report.targetEvent,
                        event: report.targetEvent || {
                            title: "Title",
                            description: "Description",
                            target: report.message.author
                        },
                        confirm: event=>{
                            report.targetEvent = event
                        }
                    }).show();
                }
            ));
        this._message = new Div().addClass("report-message")
            .add(this._messageDate)
            .add(this._messageForum)
            .add(this._messageThread)
            .add(this._messageText)
            .add(this._messageAuthor);
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "close-report", type: "neutral", label: "Close",
                onClick: event => {
                    this.tryToLeave(() => {
                        this.hide();
                    });
                }
            }]
        });
        this.add(this._author)
            .add(this._sendDate)
            .add(this._reason)
            .add(this._text)
            .add(this._messageTitle).add(this._message)
            .add(this._buttons);
        this.addClass("report-modal");
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Report not processed. Do you want to Quit ?")
    }

    _register() {
        return {

        };
    }

    _recover(specification) {
        if (specification) {

        }
    }

}

export class CBAReportList extends VTable {

    constructor({loadPage}) {
        super({
            ref: "report-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: report => this.selectReport(report)
        });
        this.addClass("report-list");
        this._loadPage = loadPage;
    }

    set search(search) {
        this._search = search;
    }

    loadReports() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectReport(report) {
        loadReport(report,
            report=>{
                let reportProcessor = new CBAProcessReport({
                    report
                }).show();
            },

        );

    };

    setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            for (let report of pageData.reports) {
                let sendDate = new Span(new Date(report.sendDate).toLocaleDateString()).addClass("report-date");
                let reason = new VOptionViewer({value: report.reason, options: [
                        {value: "rude", text:"Le propos est injurieux ou offensant."},
                        {value: "off-topic", text:"Le propos est hors sujet."}
                    ]}).addClass("report-reason");
                let text = new P(report.text).addClass("report-text");
                lines.push({source:report, cells:[sendDate, reason, text]});
            }
            let title = new Span(pageData.title)
                .addClass("report-title")
            let pageSummary = new Span()
                .addClass("report-pager")
                .setText(pageData.reportCount ?
                    String.format(CBAReportList.SUMMARY, pageData.reportCount, pageData.firstReport, pageData.lastReport) :
                    CBAReportList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Send Date", "Reason", "Text"],
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

    static SUMMARY = "Showing {1} to {2} of {0} report(s)";
    static EMPTY_SUMMARY = "There are no report to show";
}

export class CBAReportListPage extends Vitamin(Div) {

    constructor({loadPage}) {
        super({ref: "report-list-page"});
        this._search = new VSearch({
            ref: "report-list-search", searchAction: search => {
                this.loadReports();
            }
        });
        this._table = new CBAReportList({loadPage});
        this.add(this._search).add(this._table);
    }

    loadReports() {
        this._table.search = this._search.value;
        this._table.loadReports();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadReports(pageIndex, search, update) {
    sendGet("/api/forum/message/report/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load theme success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Reports List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                reportCount: response.count,
                firstReport: response.page * response.pageSize + 1,
                lastReport: response.page * response.pageSize + response.reports.length,
                reports: response.reports
            });
        },
        (text, status) => {
            requestLog("Load Reports failure: " + text + ": " + status);
            showMessage("Unable to load Reports", text);
        }
    );
}

function parseReport(text) {
    let report = JSON.parse(text);
    return report;
}

export function loadReport(report, success) {
    sendGet("/api/forum/message/report/load/"+report.id,
        (text, status) => {
            requestLog("Report load success: " + text + ": " + status);
            success(parseReport(text));
        },
        (text, status) => {
            requestLog("Load Report failure: " + text + ": " + status);
            showMessage("Unable to load Theme of Id "+report.id, text);
        }
    );
}

export var vReportList = new CBAReportListPage({
    loadPage: loadReports
});