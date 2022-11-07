import {
    Undoable, VImage, Vitamin, VMagnifiedImage
} from "../vitamin/vitamins.js";
import {
    VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    VButton, VButtons, VInputField, VInputTextArea
} from "../vitamin/vforms.js";
import {
    Div, P
} from "../vitamin/components.js";

export class CBSScenario extends Vitamin(Div) {

    constructor({ref, title, img, image, story, victory, specialRules, action}) {
        super({ref});
        this.addClass("scenario");
        this._header = new Div().addClass("scenario-header");
        this.add(this._header);
        this._title = new P(title).addClass("scenario-title");
        this._header.add(this._title);
        this._image = new VMagnifiedImage({ref:this.ref+"-image", kind:"scenario-image", img});
        this._image && this._header.add(this._image);
        this._content = new Div().addClass("scenario-content");
        this.add(this._content);
        this._storyTitle = new P("Story").addClass("scenario-story-title");
        this._content.add(this._storyTitle);
        this._story = new P(story).addClass("scenario-story");
        this._content.add(this._story);
        this._victoryTitle = new P("Victory Conditions").addClass("scenario-victory-title");
        this._content.add(this._victoryTitle);
        this._victory = new P(victory).addClass("scenario-victory");
        this._content.add(this._victory);
        this._specialRulesTitle = new P("Special Rules").addClass("scenario-special-rules-title");
        this._content.add(this._specialRulesTitle);
        this._specialRules = new P(specialRules).addClass("scenario-special-rules");
        this._content.add(this._specialRules);
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

    get victory() {
        return this._victory.getText();
    }

    set victory(victory) {
        this._victory.setText(victory);
    }

    get specialRules() {
        return this._specialRules.getText();
    }

    set specialRules(specialRules) {
        this._specialRules.setText(specialRules);
    }

    get image() {
        return this._image ? this._image.src : null;
    }

    set image(img) {
        this._image = new VImage({ref:this.ref+"-image", kind:"scenario-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            story: this._story.getText(),
            victory: this._victory.getText(),
            specialRules: this._specialRules.getText()
        };
    }

    set specification(specification) {
        this._title.setText(specification.title);
        this._image.setSrc(specification.img);
        this._story.setText(specification.story);
        this._victory.setText(specification.victory);
        this._specialRules.setText(specification.specialRules);
    }

}

export class CBSScenarioEditor extends Undoable(VSplitterPanel) {

    constructor({ref, kind="scenario-editor", onEdit, onPropose}) {
        super({ref});
        this.addClass(kind);
        this._title = new VInputField({
            ref:"scenario-title-input", label:"Title",
            onInput: event=>{
                this._scenario.title = this._title.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._title);
        this._story = new VInputTextArea({
            ref:"scenario-story-input", label:"Story",
            onInput: event=>{
                this._scenario.story = this._story.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._story);
        this._victory = new VInputTextArea({
            ref:"scenario-victory-input", label:"Victory Conditions",
            onInput: event=>{
                this._scenario.victory = this._victory.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._victory);
        this._specialRules = new VInputTextArea({
            ref:"scenario-special-rules-input", label:"Special Rules",
            onInput: event=>{
                this._scenario.specialRules = this._specialRules.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._specialRules);
        this._send = new VButtons({ref: "scenario-buttons", vertical:false, buttons:[
                {
                    ref:"edit", type: VButton.TYPES.NEUTRAL, label:"Edit",
                    onClick:event=>{
                        this._onEdit();
                    }
                },
                {
                    ref:"propose", type: VButton.TYPES.ACCEPT, label:"Propose",
                    onClick:event=>{
                        this._onPropose();
                    }
                }
            ]});
        this.addOnRight(this._send);
        this._onEdit = onEdit;
        this._onPropose = onPropose;
    }

    canLeave(leave, notLeave) {
        super.canLeave(leave, notLeave, "Scenario not saved. Do you want to Quit ?")
    }

    set scenario(scenarioSpec) {
        if (this._scenario) {
            this.removeFromLeft(this._scenario);
        }
        this._scenario = new CBSScenario(scenarioSpec);
        this.addOnLeft(this._scenario);
        this._editScenario();
        this._clean();
        this._memorize();
    }

    _editScenario() {
        this._title.value = this._scenario.title;
        this._story.value = this._scenario.story;
        this._victory.value = this._scenario.victory;
        this._specialRules.value = this._scenario.specialRules;
    }

    _register() {
        return {
            title: this._title.value,
            story: this._story.value,
            victory: this._victory.value,
            specialRules: this._specialRules.value
        }
    }

    _recover(specification) {
        if (specification) {
            this._title.value = specification.title;
            this._story.value = specification.story;
            this._victory.value = specification.victory;
            this._specialRules.value = specification.specialRules;
        }
    }

    openInNewTab(url) {
        window.open(url, '_blank').focus();
    }
}