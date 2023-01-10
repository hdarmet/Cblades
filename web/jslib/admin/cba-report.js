'use strict';

import {
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, requestLog, sendGet, sendPost, Span, I, Select
} from "../vitamin/components.js";
import {
    Undoable,
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range, VButton,
    VButtons, VInputField, VInputTextArea, VOptionViewer
} from "../vitamin/vforms.js";
import {
    showMessage, VWarning
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";
import {
    CBAMessageModelSelector, loadMessageModels
} from "./cba-message-model.js";
import {
    CBAForumThreadSelector, loadForums, loadForumThreads
} from "./cba-forum.js";

export class CBAEditReportEvent extends Undoable(VModal) {

    constructor({category, create, event, confirm, title}) {
        super({ref:"edit-report-event", title});
        this._target = new Div().addClass("user-ref")
            .add(new Img(event.target.avatar).addClass("user-avatar"))
            .add(new Div().setText(event.target.login).addClass("user-login"))
            .add(new Div().setText(event.target.firstName).addClass("user-first-name"))
            .add(new Div().setText(event.target.lastName).addClass("user-last-name"))
            .add(new VButton({ref: "choose-model", label:"model", type:VButton.TYPES.NEUTRAL,
            onClick: event=>{
                let messageModelSelector = new CBAMessageModelSelector({
                    title:"Select Message Model",
                    category,
                    loadPage:loadMessageModels,
                    selectMessageModel: messageModel=>{
                        this._title.value = messageModel.title;
                        this._description.value = messageModel.text;
                        messageModelSelector.hide();
                    }
                }).loadMessageModels().show();
            }
        }));
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
        this._messageToReporter = new Div().addClass("message-to-user");
        this._messageToTarget = new Div().addClass("message-to-user");
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
                        category: "msgr",
                        event: report.authorEvent || {
                            title: "Title",
                            description: "Description",
                            target: report.author
                        },
                        confirm: event=>{
                            report.authorEvent = event;
                            if (!event) {
                                this._messageToReporter.clear();
                            }
                            else {
                                this._messageToReporter.add(new Span(event.title));
                            }
                        }
                    }).show();
                }
            ))
            .add(this._messageToReporter);
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
                        category: "msga",
                        event: report.targetEvent || {
                            title: "Title",
                            description: "Description",
                            target: report.message.author
                        },
                        confirm: event=>{
                            report.targetEvent = event;
                            if (!event) {
                                this._messageToTarget.clear();
                            }
                            else {
                                this._messageToTarget.add(new Span(event.title));
                            }
                        }
                    }).show();
                }
            ))
            .add(this._messageToTarget);
        this._message = new Div().addClass("report-message")
            .add(this._messageDate)
            .add(this._messageForum)
            .add(this._messageThread)
            .add(this._messageText)
            .add(this._messageAuthor);
        this._close = new VButton({
            ref: "close-report", type: VButton.TYPES.NEUTRAL, label: "Close",
            onClick: event => {
                this.tryToLeave(() => {
                    this.hide();
                });
            }
        });
        this._selectCommand = new Select().setOptions([
            {value: "na", text: "Close Report as Not Applicable"},
            {value: "ban", text: "Remove Message and Ban Author"},
            {value: "wrn", text: "Remove Message and Warn Author"},
            {value: "mv", text: "Move Message"}
        ]).addClass("select-command").onEvent("change",
            event=> {
                if (this._selectCommand.getValue()==="mv") {
                    this._selectThread();
                }
            }
        );
        this._confirm = new VButton({
            ref: "confirm-report", type: VButton.TYPES.ACCEPT, label: "Confirm",
            onClick: event => {
                switch (this._selectCommand.getValue()) {
                    case "na":
                        this._closeReport(report);
                        break;
                    case "ban":
                        if (report.targetEvent) {
                            this._blockMessage(report, true);                        }
                        else {
                            showMessage("Ban Author", "To Ban an Account a message must be sent to him")
                        }
                        break;
                    case "wrn":
                        this._blockMessage(report, false);
                        break;
                    case "mv":
                        if (this._thread) {
                            this._moveMessage(report);
                        }
                        else {
                            showMessage("Move Message", "A Target thread must be defined.")
                        }
                        break;
                }
            }
        });
        this._threadSlot = new Div().addClass("report-thread");
        this._commands = new Div().addClass("report-command")
            .add(this._close)
            .add(this._selectCommand)
            .add(this._threadSlot)
            .add(this._confirm);
        this.add(this._author)
            .add(this._sendDate)
            .add(this._reason)
            .add(this._text)
            .add(this._messageTitle).add(this._message)
            .add(this._commands);
        this.addClass("report-modal");
    }

    _closeReport(report) {
        new CBAConfirm().show({
            ref: "close-report-confirm",
            title: "Close Report",
            message: "Do you really want to close the report as Not Applicable ?",
            actionOk: event => {
                closeReport(
                    report,
                    report.authorEvent,
                    report.targetEvent,
                    ()=>{
                        this.hide();
                        showMessage("Report Closed");
                    }
                );
            }
        });
    }

    _blockMessage(report, ban) {
        new CBAConfirm().show({
            ref: "block-message-confirm",
            title: "Block Message"+(ban?" and ban author":""),
            message: "Do you really want to block the Forum Message ?",
            actionOk: event => {
                blockMessage(
                    report, ban,
                    report.authorEvent,
                    report.targetEvent,
                    ()=>{
                        this.hide();
                        showMessage("Message Blocked"+(ban?" and Author Banned":""));
                    }
                );
            }
        });
    }

    _moveMessage(report, thread) {
        new CBAConfirm().show({
            ref: "move-message-confirm",
            title: "Move Message",
            message: "Do you really want to move the Forum Message ?",
            actionOk: event => {
                moveMessage(
                    report, this._thread.id,
                    report.authorEvent,
                    report.targetEvent,
                    ()=>{
                        this.hide();
                        showMessage("Message Moved");
                    }
                );
            }
        });
    }

    _selectThread() {
        let forumSelector = new CBAForumThreadSelector({
            title: "Select Thread",
            loadForums,
            loadThreads: loadForumThreads,
            selectThread: thread => {
                this._thread = thread;
                this._threadSlot.clear();
                this._threadSlot.add(new Span(thread.title));
                forumSelector.hide();
            }
        }).loadForums().show();
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
            showMessage("Unable to load Report of Id "+report.id, text);
        }
    );
}

export function closeReport(report, reporterEvent, authorEvent, success) {
    sendPost("/api/forum/message/report/close/"+report.id,
        {
            reporter: reporterEvent,
            author: authorEvent,
        },
        (text, status) => {
            requestLog("Report closing success: " + text + ": " + status);
            success(parseReport(text));
        },
        (text, status) => {
            requestLog("Load Report failure: " + text + ": " + status);
            showMessage("Unable to close Report of Id "+report.id, text);
        }
    );
}

export function blockMessage(report, ban, reporterEvent, authorEvent, success) {
    sendPost("/api/forum/message/report/"+(ban?"block-and-ban":"block-message")+"/"+report.id,
        {
            reporter: reporterEvent,
            author: authorEvent,
        },
        (text, status) => {
            requestLog("Blocking message success: " + text + ": " + status);
            success(parseReport(text));
        },
        (text, status) => {
            requestLog("Blocking message failure: " + text + ": " + status);
            showMessage("Unable to block message for report: "+report.id, text);
        }
    );
}

export function moveMessage(report, threadId, reporterEvent, authorEvent, success) {
    sendPost("/api/forum/message/report/move-message/"+report.id,
        {
            reporter: reporterEvent,
            author: authorEvent,
            thread: threadId
        },
        (text, status) => {
            requestLog("Moving message success: " + text + ": " + status);
            success(parseReport(text));
        },
        (text, status) => {
            requestLog("Moving message failure: " + text + ": " + status);
            showMessage("Unable to move message for report: "+report.id, text);
        }
    );
}

export var vReportList = new CBAReportListPage({
    loadPage: loadReports
});