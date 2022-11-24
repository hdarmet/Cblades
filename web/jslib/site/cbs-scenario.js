import {
    Undoable, Vitamin, VMagnifiedImage, VMessageHandler
} from "../vitamin/vitamins.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    mandatory, range,
    VButton, VButtons, VFileLoaderField, VInputField, VInputTextArea
} from "../vitamin/vforms.js";
import {
    Div, isImageFile, P, requestLog, sendGet, sendPost
} from "../vitamin/components.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSEditComments
} from "./cbs-comment.js";
import {
    CBSFormContainer
} from "./cbs-widgets.js";

export class CBSScenario extends Vitamin(Div) {

    constructor({scenario, action}) {
        super({ref:"scenario-"+scenario.id});
        this.addClass("scenario");
        this._title = new P().addClass("scenario-title");
        this.add(this._title);
        this._illustration = new VMagnifiedImage({
            ref:this.ref+"-illustration", kind:"scenario-illustration"
        });
        this.add(this._illustration);
        this._storyTitle = new P("Story:").addClass("scenario-story-title");
        this.add(this._storyTitle);
        this._story = new P().addClass("scenario-story");
        this.add(this._story);
        this._setUpTitle = new P("Set Up:").addClass("scenario-setup-title");
        this.add(this._setUpTitle);
        this._setUp = new P().addClass("scenario-setup");
        this.add(this._setUp);
        this._victoryConditionsTitle = new P("Victory Conditions:").addClass("scenario-victory-conditions-title");
        this.add(this._victoryConditionsTitle);
        this._victoryConditions = new P().addClass("scenario-victory-conditions");
        this.add(this._victoryConditions);
        this._specialRulesTitle = new P("Special Rules:").addClass("scenario-special-rules-title");
        this.add(this._specialRulesTitle);
        this._specialRules = new P().addClass("scenario-special-rules");
        this.add(this._specialRules);
        this.specification = scenario;
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
            id: this._id,
            illustration: this._illustration ? this._illustration.src : null,
            title: this._title.getText(),
            story: this._story.getText(),
            setUp: this._setUp.getText(),
            victoryConditions: this._victoryConditions.getText(),
            specialRules: this._specialRules.getText()
        };
    }

    set specification(specification) {
        this._id = specification.id;
        this._title.setText(specification.title || "Scenario Title");
        this._story.setText(specification.story || "");
        this._setUp.setText(specification.setUp || "");
        this._victoryConditions.setText(specification.victoryConditions || "");
        this._specialRules.setText(specification.specialRules || "");
        this._illustration.setSrc(specification.illustration || "../images/site/default-image.png");
    }

}

export class CBSScenarioEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="scenario-editor", create, scenario={}}) {
        super({ref});
        this.addClass(kind);
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
        this._illustration = new VFileLoaderField({
            ref:"scenario-illustration", label:"Illustration",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
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
            },
            onInput: event=>{
                this._scenarioView.illustration = this._illustration.imageSrc;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._illustration);
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
                },
                {
                    ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                    onClick:event=>{
                        if (this.validate()) {
                            let scenario = this.scenario;
                            if (scenario.comments.newComment) {
                                scenario.newComment = scenario.comments.newComment;
                            }
                            delete scenario.comments;
                            this.saveScenario(scenario);
                        }
                    }
                }
            ]});
        this._buttons.get("edit").enabled = !create;
        this.addOnRight(this._buttons);
        this.scenario = scenario;
    }

    saveScenario(scenario) {
        saveProposedScenario(scenario,
            this.imageFiles,
            text => {
                this.saved(parseScenario(text));
            },
            text => {
                showMessage("Fail to update Scenario", text);
            }
        );
    }

    validate() {
        return !this._title.validate()
            & !this._story.validate()
            & !this._setUp.validate()
            & !this._victoryConditions.validate()
            & !this._specialRules.validate()
            & !this._illustration.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave, "Scenario not saved. Do you want to Quit ?")
    }

    get scenario() {
        this._scenario = {
            id: this._scenario.id,
            game: this._scenario.game,
            title: this._title.value,
            story: this._story.value,
            setUp: this._setUp.value,
            victoryConditions: this._victoryConditions.value,
            specialRules: this._specialRules.value,
            illustration: this._illustration.imageSrc,
            comments: structuredClone(this._comments)
        }
        return this._scenario;
    }

    set scenario(scenario) {
        this._scenario = scenario;
        if (this._scenarioView) {
            this.removeFromLeft(this._scenarioView);
        }
        this._scenarioView = new CBSScenario({scenario});
        this.addOnLeft(this._scenarioView);
        this._editScenario();
        this._clean();
        this._memorize();
    }

    _editScenario() {
        this._title.value = this._scenario.title || "";
        this._story.value = this._scenario.story || "";
        this._setUp.value = this._scenario.setUp || "";
        this._victoryConditions.value = this._scenario.victoryConditions || "";
        this._specialRules.value = this._scenario.specialRules || "";
        this._illustration.imageSrc = this._scenario.illustration || "";
        this._comments = {
            comments: this._scenario.comments || [],
            newComment: ""
        }
    }

    _register() {
        return this.scenario;
    }

    _recover(specification) {
        if (specification) {
            this._scenarioView.specification = specification;
            this._editScenario();
        }
    }

    set comments(comments) {
        this._comments = structuredClone(comments);
        this._memorize();
    }

    onComments() {
        new CBSEditComments({
            "ref": "scenario-comments",
            "kind": "scenario-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

    saved(scenario) {
        this._scenario = scenario;
        this._comments = {
            comments: scenario.comments || [],
            newComment: ""
        }
        this._buttons.get("edit").enabled = true;
        showMessage("Scenario saved.");
        this._clean();
        this._memorize();
        return true;
    }

    get imageFiles() {
        return this.illustration ?
            [
                {key: "illustration", file: this.illustration}
            ] :
            [];
    }

    get illustration()  {
        return this._illustration.files ? this._illustration.files[0] : undefined;
    }

}

function parseScenario(text) {
    let scenario = JSON.parse(text);
    for (let comment of scenario.comments) {
        comment.date = new Date(comment.date);
    }
    return scenario;
}

export var vScenarioEditor = new CBSScenarioEditor({
    create: true,
    ref:"scenario-editor"
});

export var vScenarioEditorPage = new CBSFormContainer({ref:"scenario-editor-page", editor:vScenarioEditor});

export function loadProposedScenario(scenario, success) {
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

export function saveProposedScenario(scenario, images, success, failure) {
    sendPost(scenario.id===undefined ? "/api/scenario/propose" : "/api/scenario/amend/" + scenario.id,
        scenario,
        (text, status) => {
            requestLog("Scenario proposal success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Scenario proposal failure: " + text + ": " + status);
            failure(text, status);
        },
        images
    );
}

export function loadLiveScenarios(update) {
    sendGet("/api/scenario/live",
        (text, status) => {
            requestLog("Load live Scenarios success: " + text + ": " + status);
            let scenarios = JSON.parse(text);
            let options = scenarios.map(scenario=>{return {value:scenario.id, label:scenario.title}});
            update(options);
        },
        (text, status) => {
            requestLog("Load Live Scenarios failure: " + text + ": " + status);
            showMessage("Unable to load Scenarios", text);
        }
    );
}