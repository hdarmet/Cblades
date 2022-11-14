'use strict';

import {
    VContainer,
    VSplitterPanel,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, P, requestLog, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Undoable, VImage,
    Vitamin, VMagnifiedImage, VMessageHandler, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons,
    VFileLoader,
    VFileLoaderField,
    VInputField, VInputTextArea, VRef, VSelectField
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
import {
    CBAEditComments
} from "./cba-comment.js";

export class CBAScenario extends Vitamin(Div) {

    constructor({ref, title, illustration, story, setUp, victoryConditions, specialRules, action}) {
        super({ref});
        this.addClass("scenario");
        this._title = new P(title).addClass("scenario-title");
        this.add(this._title);
        this._illustration = new VMagnifiedImage({
            ref:this.ref+"-illustration", kind:"scenario-illustration",
            img:illustration||"../images/site/default-image.png"
        });
        this.add(this._illustration);
        this._storyTitle = new P("Story:").addClass("scenario-story-title");
        this.add(this._storyTitle);
        this._story = new P(story).addClass("scenario-story");
        this.add(this._story);
        this._setUpTitle = new P("Set Up:").addClass("scenario-setup-title");
        this.add(this._setUpTitle);
        this._setUp = new P(setUp).addClass("scenario-setup");
        this.add(this._setUp);
        this._victoryConditionsTitle = new P("Victory Conditions:").addClass("scenario-victory-conditions-title");
        this.add(this._victoryConditionsTitle);
        this._victoryConditions = new P(victoryConditions).addClass("scenario-victory-conditions");
        this.add(this._victoryConditions);
        this._specialRulesTitle = new P("Special Rules:").addClass("scenario-special-rules-title");
        this.add(this._specialRulesTitle);
        this._specialRules = new P(specialRules).addClass("scenario-special-rules");
        this.add(this._specialRules);
        this.onEvent("click", ()=>{
            action && action(this);
        });
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
    }

    get story() {
        return this._story.getText();
    }

    set story(story) {
        this._story.setText(story);
    }

    get setUp() {
        return this._setUp.getText();
    }

    set setUp(setUp) {
        this._setUp.setText(setUp);
    }

    get victoryConditions() {
        return this._victoryConditions.getText();
    }

    set victoryConditions(victoryConditions) {
        this._victoryConditions.setText(victoryConditions);
    }

    get specialRules() {
        return this._specialRules.getText();
    }

    set specialRules(specialRules) {
        this._specialRules.setText(specialRules);
    }

    get illustration() {
        return this._illustration ? this._illustration.src : null;
    }

    set illustration(illustration) {
        this._illustration.setSrc(illustration);
        this._illustration.setZoomSrc(illustration);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            illustration: this._illustration ? this._illustration.src : null,
            title: this._title.getText(),
            story: this._story.getText(),
            setUp: this._setUp.getText(),
            victoryConditions: this._victoryConditions.getText(),
            specialRules: this._specialRules.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._story.setText(specification.story);
        this._setUp.setText(specification.setUp);
        this._victoryConditions.setText(specification.victoryConditions);
        this._specialRules.setText(specification.specialRules);
        this._illustration.setSrc(specification.illustration);
    }

}

export class CBAEditScenarioPane extends Undoable(VSplitterPanel) {

    constructor({ref, kind, scenario, create, accept, verify}) {
        super({ref});
        this.addClass(kind);
        this._status = new VSelectField({
            ref: "scenario-status", label: "Status",
            validate: mandatory({}),
            options: [
                {value: "live", text: "Live"},
                {value: "pnd", text: "Pending"},
                {value: "prp", text: "Proposed"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._status);
        this._title = new VInputField({
            ref:"scenario-title-input", label:"Title",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._scenarioView.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._illustrationLoader = new VFileLoaderField({
            ref:"scenario-illustration", label:"Illustration",
            validate: mandatory({}),
            accept, verify,
            onInput: event=>{
                this._scenarioView.illustration = this._illustrationLoader.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustrationLoader);
        this._story = new VInputTextArea({
            ref:"scenario-story-input", label:"Story",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onInput: event=>{
                this._scenarioView.story = this._story.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._story);
        this._setUp = new VInputTextArea({
            ref:"scenario-setup-input", label:"Set Up",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onInput: event=>{
                this._scenarioView.setUp = this._setUp.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._setUp);
        this._victoryConditions = new VInputTextArea({
            ref:"scenario-victoryCondition-input", label:"Victory Conditions",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onInput: event=>{
                this._scenarioView.victoryConditions = this._victoryConditions.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._victoryConditions);
        this._specialRules = new VInputTextArea({
            ref:"scenario-specialRules-input", label:"Special Rules",
            validate: mandatory({validate: range({min:2, max:2000})}),
            onInput: event=>{
                this._scenarioView.specialRules = this._specialRules.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._specialRules);
        let userSelector = new CBAUserSelector({title:"Select Scenario Account", loadPage:loadUsers, selectUser: user=>{
                this._author.setValue(user);
                userSelector.hide();
            }
        }).loadUsers();
        this._author = new VRef({
            ref: "author", label: "Author", nullable: true, selector: userSelector,
            lineCreator: account=> new Div().addClass("user-ref")
                .add(new Img(account.avatar).addClass("user-avatar"))
                .add(new Div().setText(account.login).addClass("user-login"))
                .add(new Div().setText(account.firstName).addClass("user-first-name"))
                .add(new Div().setText(account.lastName).addClass("user-last-name")
            ),
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._author);
        this._buttons = new VButtons({ref: "map-buttons", vertical:false, buttons:[
            {
                ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                onClick:event=>{
                    window.open("./cb-scenario-editor.html?id="+this._scenario.game, '_blank').focus();
                }
            },
            {
                ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                onClick:event=>{
                    this.onComments();
                }
            }
        ]});
        this._buttons.get("edit").enabled = !create;
        this.addOnRight(this._buttons);
        this.scenario = scenario;
    }

    validate() {
        return !this._title.validate()
            & !this._story.validate()
            & !this._setUp.validate()
            & !this._victoryConditions.validate()
            & !this._specialRules.validate()
            & !this._illustrationLoader.validate()
            & !this._status.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Scenario not saved. Do you want to Quit ?")
    }

    get scenario() {
        return {
            status: this._status.value,
            title: this._title.value,
            story: this._story.value,
            setUp: this._setUp.value,
            victoryConditions: this._victoryConditions.value,
            specialRules: this._specialRules.value,
            illustration: this._illustrationLoader.imageSrc,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set scenario(scenario) {
        this._scenario = scenario;
        if (this._scenarioView) {
            this.removeFromLeft(this._scenarioView);
        }
        this._scenarioView = new CBAScenario(scenario);
        this.addOnLeft(this._scenarioView);
        this._status.value = this._scenario.status || "prp";
        this._title.value = this._scenario.title || "";
        this._story.value = this._scenario.story || "";
        this._setUp.value = this._scenario.setUp || "";
        this._victoryConditions.value = this._scenario.victoryConditions || "";
        this._specialRules.value = this._scenario.specialRules || "";
        this._illustrationLoader.imageSrc = this._scenario.illustration || "";
        this._author.value = this._scenario.author;
        this._comments = {
            comments: this._scenario.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.scenario;
    }

    _recover(specification) {
        if (specification) {
            this._status.value = specification.status;
            this._title.value = specification.title;
            this._story.value = specification.story;
            this._setUp.value = specification.setUp;
            this._victoryConditions.value = specification.victoryConditions;
            this._specialRules.value = specification.specialRules;
            this._illustrationLoader.imageSrc = specification.illustration;
            this._author.value = specification.author;
            this._comments = structuredClone(specification.comments)
        }
    }

    saved(scenario) {
        this.scenario = scenario;
        this._buttons.get("edit").enabled = true;
        return true;
    }

    set comments(comments) {
        this._comments = comments;
        this._memorize();
    }

    get scenarioIllustration()  {
        return this._illustrationLoader.files ? this._illustrationLoader.files[0] : undefined;
    }

    onComments() {
        new CBAEditComments({
            "ref": "scenario-comments",
            "kind": "scenario-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBAEditScenario extends VModal {

    constructor({title, create, scenario, saveScenario, deleteScenario}) {
        super({ref:"edit-scenario-modal", title});
        this._id = scenario.id;
        this._scenarioPane = new CBAEditScenarioPane({
            ref: "scenario-editor-pane",
            kind: "scenario-editor-pane",
            scenario,
            create,
            accept(file) {
                if (!VFileLoader.isImage(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size at least (450 x 150) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth<450 || image.imageHeight<150) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size at least (450 x 150) pixels."});
                    return false;
                }
                return true;
            }
        });
        this._buttons = new VButtons({
            ref: "buttons", buttons: [{
                ref: "save-scenario", type: "accept", label: "Save",
                onClick: event => {
                    if (this.validate()) {
                        let scenario = this.specification;
                        let newComment = scenario.comments.newComment;
                        if (newComment) {
                            scenario.comments.comments.push({
                                date: new Date(),
                                text: newComment,
                                version: 0
                            });
                        }
                        scenario.comments = scenario.comments.comments;
                        saveScenario(scenario);
                    }
                }
            },
            {
                ref: "close-scenario", type: "neutral", label: "Close",
                onClick: event => {
                    this.hide();
                }
            }]
        });
        this._deleteButton = new VButton({
            ref: "delete-scenario", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-scenario-deletion",
                    title: "Delete Scenario",
                    message: "Do you really want to delete the Scenario ?",
                    actionOk: event => deleteScenario(scenario)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._scenarioPane);
        this.add(this._buttons);
        this.addClass("scenario-modal");
    }

    validate() {
        return this._scenarioPane.validate();
    }

    saved(scenario) {
        this._scenarioPane.saved(scenario);
        this._id = scenario.id;
        this._deleteButton.enabled = true;
        showMessage("Scenario saved.");
        return true;
    }

    get imageFiles() {
        return this.scenarioIllustration ?
            [
                {key: "illustration", file: this.scenarioIllustration}
            ] :
            [];
    }

    get scenarioIllustration()  {
        return this._scenarioPane.scenarioIllustration;
    }

    get specification() {
        return {
            id: this._id,
            ...this._scenarioPane.scenario
        };
    }

}

export class CBAScenarioList extends VTable {

    constructor({loadPage, saveScenario, saveScenarioStatus, deleteScenario}) {
        super({
            ref: "scenario-list",
            changePage: pageIndex => this._setPage(pageIndex)
        });
        this.addClass("scenario-list");
        this._loadPage = loadPage;
        this._saveScenario = saveScenario;
        this._saveScenarioStatus = saveScenarioStatus;
        this._deleteScenario = deleteScenario;
    }

    set search(search) {
        this._search = search;
    }

    loadScenarios() {
        this._setPage(0);
        return this;
    }

    refresh() {
        this._setPage(this._currentPage);
    }

    selectScenario(scenario) {
        loadScenario(scenario,
            scenario=>{
                let scenarioEditor = new CBAEditScenario({
                    title: "Edit Scenario",
                    scenario,
                    saveScenario: scenario => this._saveScenario(scenario,
                        scenarioEditor.imageFiles,
                        text => {
                            scenarioEditor.saved(parseScenario(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Scenario", text);
                        }
                    ),
                    deleteScenario: scenario => this._deleteScenario(scenario,
                        () => {
                            scenarioEditor.hide();
                            scenarioEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            scenarioEditor.confirm.hide();
                            showMessage("Fail to delete Scenario", text);
                        }
                    ),
                }).show();
            },

        );

    };

    _setPage(pageIndex) {
        function getScenario(line) {
            return {
                id: line.id,
                title: line.title.getText(),
                story: line.story.getText(),
                status: line.status.getValue(),
                illustration: line.illustration.getSrc(),
                author: line.author
            };
        }
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveScenarioStatus = scenario => this._saveScenarioStatus(scenario,
                () => showMessage("Scenario saved."),
                text => showMessage("Unable to Save Scenario.", text),
            );
            for (let scenario of pageData.scenarios) {
                let line;
                let illustration = new Img(scenario.illustration).addClass("scenario-illustration")
                    .onMouseClick(event => this.selectScenario(getScenario(line)));
                let title = new Span(scenario.title).addClass("scenario-name")
                    .onMouseClick(event => this.selectScenario(getScenario(line)));
                let story = new P(scenario.story).addClass("scenario-description")
                    .onMouseClick(event => this.selectScenario(getScenario(line)));
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(scenario.status)
                    .addClass("scenario-status")
                    .onChange(event => saveScenarioStatus(getScenario(line)));
                line = {id: scenario.id, illustration, title, story, status, author:scenario.author};
                lines.push([illustration, title, story, status]);
            }
            let title = new Span(pageData.title)
                .addClass("scenario-title")
            let pageSummary = new Span()
                .addClass("scenario-pager")
                .setText(pageData.eventCount ?
                    String.format(CBAScenarioList.SUMMARY, pageData.scenarioCount, pageData.firstScenario, pageData.lastScenario) :
                    CBAScenarioList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Illustration", "Name", "Story", "Status"],
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

    static SUMMARY = "Showing {1} to {2} of {0} scenario(s)";
    static EMPTY_SUMMARY = "There are no scenario to show";
}

export class CBAScenarioListPage extends Vitamin(Div) {

    constructor({loadPage, saveScenario, saveScenarioStatus, deleteScenario}) {
        super({ref: "scenario-list-page"});
        this._search = new VSearch({
            ref: "scenario-list-search", searchAction: search => {
                this.loadScenarios();
            }
        });
        this._create = new VButton({
            ref: "scenario-create", type: "neutral", label: "Create Scenario",
            onClick: event => {
                this._createScenarioModal = new CBAEditScenario({
                    title: "Create Scenario",
                    create: true,
                    scenario: {
                        status: "prp"
                    },
                    saveScenario: scenario => saveScenario(scenario,
                        this._createScenarioModal.imageFiles,
                        text => {
                            this._createScenarioModal.saved(parseScenario(text));
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Scenario", text);
                        }
                    ),
                    deleteScenario: () => {
                        this._createScenarioModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBAScenarioList({loadPage, saveScenario, saveScenarioStatus, deleteScenario});
        this.add(this._search).add(this._table);
    }

    get createScenarioModal() {
        return this._createScenarioModal;
    }

    loadScenarios() {
        this._table.search = this._search.value;
        this._table.loadScenarios();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

export function loadScenarios(pageIndex, search, update) {
    sendGet("/api/scenario/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load scenario success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Scenario List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                scenarioCount: response.count,
                firstScenario: response.page * response.pageSize + 1,
                lastScenario: response.page * response.pageSize + response.scenarios.length,
                scenarios: response.scenarios
            });
        },
        (text, status) => {
            requestLog("Load Scenario failure: " + text + ": " + status);
            showMessage("Unable to load Scenarios", text);
        }
    );
}

function parseScenario(text) {
    let scenario = JSON.parse(text);
    for (let comment of scenario.comments) {
        comment.date = new Date(comment.date);
    }
    return scenario;
}

export function loadScenario(scenario, success) {
    sendGet("/api/scenario/load/"+scenario.id,
        (text, status) => {
            requestLog("Scenario load success: " + text + ": " + status);
            success(parseScenario(text));
        },
        (text, status) => {
            requestLog("Load Scenario failure: " + text + ": " + status);
            showMessage("Unable to load Scenario of Id "+scenario.id, text);
        }
    );
}

export function saveScenario(scenario, images, success, failure) {
    sendPost(scenario.id===undefined ? "/api/scenario/create" : "/api/scenario/update/" + scenario.id,
        scenario,
        (text, status) => {
            requestLog("Scenario saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Scenario saving failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function saveScenarioStatus(scenario, success, failure) {
    sendPost("/api/scenario/update-status/" + scenario.id,
        scenario,
        (text, status) => {
            requestLog("Scenario status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Scenario status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function deleteScenario(scenario, success, failure) {
    sendGet("/api/scenario/delete/" + scenario.id,
        (text, status) => {
            requestLog("Scenario delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Scenario delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vScenarioList = new CBAScenarioListPage({
    loadPage: loadScenarios,
    deleteScenario,
    saveScenario,
    saveScenarioStatus
});