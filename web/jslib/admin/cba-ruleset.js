'use strict';

import {
    download,
    Undoable, VImage, Vitamin, VMessageHandler
} from "../vitamin/vitamins.js";
import {
    Div, isImageFile, isImageURL, P, requestLog, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    VContainer, VSplitterPanel
} from "../vitamin/vcontainer.js";
import {
    mandatory, range,
    VButton, VButtons, VFileLoaderField, VInputField, VInputTextArea, VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";
import {
    DetailedForm, DetailedView
} from "../vitamin/structured.js";
import {
    CBASheet
} from "./cba-faction.js";

export class CBARuleSet extends DetailedView(Vitamin(Div)) {

    constructor({kind, ruleSet, action, sheetAction}) {
        super({ref:"ruleset-editor"});
        this._sheetAction = sheetAction;
        this.addClass(kind);
        this._content = new Div().addClass("ruleset-content");
        this.add(this._content);
        this._sheets=[];
        if (ruleSet.sheets) {
            for (let sheetSpec of ruleSet.sheets) {
                this.createDetailRecord(sheetSpec);
            }
        }
        this.specification = ruleSet;
        this.onEvent("click", event=>{
            action && action(this)
        });
    }

    get content() {
        return this._content;
    }

    get detailRecords() {
        return this.sheets;
    }

    _createDetailRecord(detailRecordSpec) {
        return new CBASheet({
            ...detailRecordSpec,
            action: this._sheetAction
        });
    }

    getSheet(ref) {
        for (let sheet of this._sheets) {
            if (sheet.ref.ref === ref) return sheet;
        }
        return null;
    }

    get sheets() {
        return this._sheets;
    }

    get specification() {
        return {
            sheets: this._getDetailRecordsSpecification()
        };
    }

    set specification(specification) {
        this._setDetailRecordsSpecification(specification.sheets);
    }

}

export class CBARuleSetEditor extends DetailedForm(Undoable(VSplitterPanel)) {

    constructor() {
        super({ref: "ruleset-editor"});
        this.addClass("ruleset-editor");
        this._newSheetSpecs = {
            version: 0,
            icon: "../images/site/default-sheet-icon.png",
            path: "../images/site/default-sheet.png",
            name: "Sheet name",
            description: "Sheet description"
        };
        this._versionContainer = new VContainer({columns: 2});
        this.addOnRight(this._versionContainer);
        this._version = new VSelectField({
            ref: "ruleset-version", label: "Version",
            onInput: event => {
                this.tryToLeave(() => {
                        this.parent.changeRuleSet(this._version.value);
                    },
                    () => {
                        this._version.value = this._ruleSetObject.version;
                    });
            }
        });
        this._newVersion = new VInputField({
            ref: "ruleset-new-version", label: "New Version",
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
            ref: "copy-ruleset", type: "neutral", label: "Copy", enabled: false, onClick: () => {
                this.tryToLeave(() => {
                        let ruleset = {
                            sheets: [],
                            version: this._newVersion.value,
                            published: false
                        }
                        for (let sheet of this._ruleSetObject.sheets) {
                            ruleset.sheets.push({
                                version: 0,
                                name: sheet.name,
                                description: sheet.description,
                                icon: sheet.icon,
                                path: sheet.path
                            });
                        }
                        this.setRuleSet(ruleset);
                        this.parent.addVersion(ruleset);
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
        this._sheetImages = new Div().addClass("sheet-images");
        this.addOnRight(this._sheetImages);
        this._sheetPath = new VFileLoaderField({
            ref:"sheet-path", label:"Sheet Document",
            validate: mandatory({}),
            verify(image) {
                if ((image.imageWidth!==3969 || image.imageHeight!==5613)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (3969 x 5613) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                if (isImageFile(this._sheetPath.file)) {
                    this._sheetIcon.imageSrc = this.getSheetIconSrcFromPath();
                    this._sheetView.icon = this.sheetIconSrc;
                    this._sheetView.iconFile = this.getSheetIconImageFromPath();
                    this._sheetView.path = this.sheetPathSrc;
                }
                else {
                    this._sheetPath.placeholder = "../images/site/document.png";
                    this._sheetView.path = null
                }
                this._sheetView.pathFile = this.sheetPathDocument;
            },
            onChange: event=>{
                this._memorize();
            },
            onClick: event=>{
                if (this._sheetView.path) {
                    download( this._sheetView.path);

                }
                else if (this._sheetView.pathFile) {
                    download( URL.createObjectURL(this._sheetView.pathFile));
                }
            }
        });
        this._sheetImages.add(this._sheetPath.addClass("sheet-image-loader"));
        this._sheetIcon = new VFileLoaderField({
            ref:"sheet-icon", label:"Sheet Icon",
            validate: mandatory({}),
            accept(file) {
                if (!isImageFile(file)) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (310 x 438) pixels."});
                    return false;
                }
                return true;
            },
            verify(image) {
                if (image.imageWidth!==310 || image.imageHeight!==438) {
                    VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (310 x 438) pixels."});
                    return false;
                }
                return true;
            },
            onInput: event=>{
                this._sheetView.icon = this.sheetIconSrc;
                if (this._sheetIcon.file) {
                    this._sheetView.iconFile = this.sheetIconImage;
                }
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this._sheetImages.add(this._sheetIcon.addClass("sheet-image-loader"));
        this._sheetName = new VInputField({
            ref:"sheet-name-input", label:"Sheet Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onInput: event=>{
                this._sheetView.name = this._sheetName.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._sheetName);
        this._sheetDescription = new VInputTextArea({
            ref:"sheet-description-input", label:"Sheet Description",
            validate: mandatory({validate: range({min:2, max:20000})}),
            onInput: event=>{
                this._sheetView.description = this._sheetDescription.value;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this.addOnRight(this._sheetDescription);
        this._buttons = new VButtons({
            buttons: [
                {
                    ref: "save-ruleset", label: "Save", type: "accept", onClick: event => {
                        Object.assign(this._ruleSetObject, this._ruleSetDisplay.specification);
                        this.parent.save(this._ruleSetObject, "Rule Set Saved", "Fail to Save Rule Set");
                    }
                },
                {
                    ref: "publish-ruleset", label: "Publish", type: "publish", onClick: event => {
                        Object.assign(this._ruleSetObject, this._ruleSetDisplay.specification);
                        this.parent.publish(this._ruleSetObject);
                        this.parent.save(this._ruleSetObject, "RuleSet Published", "Fail to Publish Rule Set");
                    }
                },
                {
                    ref: "delete-ruleset", label: "Delete", type: "neutral", onClick: event => {
                        new CBAConfirm().show({
                            ref: "confirm-ruleset-deletion",
                            title: "Delete Rule Set Version",
                            message: "Do you really want to delete this version of the Rule Set ?",
                            actionOk: () => {
                                this.parent.delete(this._ruleSetObject, "Rule Set Deleted", "Fail to Delete Rule Set");
                            }
                        });
                    }
                },
                {
                    ref: "cancel-edition", label: "Cancel", type: "refuse", onClick: event => {
                        this.setRuleSet(this._ruleSetObject);
                    }
                }
            ]
        });
        this.addOnRight(this._buttons);
    }

    get newDetailRecordSpec() {
        return this._newSheetSpecs;
    }

    get mainRecordView() {
        return this._ruleSetDisplay;
    }

    get detailRecordView() {
        return this._sheetView;
    }

    set detailRecordView(detailRecordView) {
        this._sheetView = detailRecordView;
    }

    _updateForm() {
        this._sheetName.value = this._sheetView.name;
        this._sheetDescription.value = this._sheetView.description;
        if (this._sheetView.path) {
            if (isImageURL(this._sheetView.path)) {
                this._sheetPath.imageSrc = this._sheetView.path;
            }
            else {
                this._sheetPath.placeholder = "../images/site/document.png";
            }
        }
        else if (!this._sheetView.pathFile) {
            this._sheetPath.placeholder = "../images/site/default-sheet.png";
        }
        else if (!isImageFile(this._sheetView.pathFile)) {
            this._sheetPath.placeholder = "../images/site/document.png";
        }
        this._sheetIcon.imageSrc = this._sheetView.icon;
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave, "Rule Set not saved. Do you want to Change ?")
    }

    setRuleSet(ruleSet) {
        this._ruleSetObject = ruleSet;
        if (!ruleSet.sheets) {
            ruleSet.sheets = [
                structuredClone(this._newSheetSpecs)
            ]
        }
        if (this._ruleSetDisplay) {
            this.removeFromLeft(this._ruleSetDisplay);
        }
        this._ruleSetDisplay = new CBARuleSet({
            sheetAction:sheetView => {
                this.selectDetailRecord(sheetView);
                return true;
            },
            ruleSet
        });
        this._ruleSetDisplay.sheets[0] && this._selectDetailRecord(this._ruleSetDisplay.sheets[0]);
        this.addOnLeft(this._ruleSetDisplay);
        this._clean();
        this._memorize();
        return this;
    }

    setVersions(versions) {
        this._version.optionLines = versions;
        if (this._ruleSetObject) {
            this._version.value = this._ruleSetObject.version;
            this.get("publish-ruleset").enabled = !this._ruleSetObject.published;
            this.get("delete-ruleset").enabled = !this._ruleSetObject.published;
        }
        return this;
    }

    _register() {
        return this._ruleSetDisplay.specification;
    }

    _recover(specification) {
        if (specification) {
            this._ruleSetDisplay.specification = specification;
            for (let sheetView of this._ruleSetDisplay.sheets) {
                sheetView.action = event => {
                    this.selectDetailRecord(sheetView);
                    return true;
                }
            }
            let sheetView = this._ruleSetDisplay.getSheet(specification.current);
            this._selectDetailRecord(sheetView);
        }
    }

    get sheetPathSrc()  {
        return this._sheetPath.imageSrc;
    }

    get sheetIconSrc()  {
        return this._sheetIcon.imageSrc
    }

    get sheetPathDocument()  {
        return this._sheetPath.file;
    }

    get sheetIconImage()  {
        return this._sheetIcon.file;
    }

    getSheetIconSrcFromPath()  {
        return this._sheetPath.getImageDataURL("icon.png", 310, 438);
    }

    getSheetIconImageFromPath()  {
        return this._sheetPath.getImageFile("icon.png", 310, 438);
    }

    get imageFiles() {
        let images = [];
        for (let ordinal=0; ordinal<this._ruleSetDisplay.sheets.length; ordinal++) {
            let path = this._ruleSetDisplay.sheets[ordinal].pathFile;
            if (path) {
                images.push({key: "path-" + ordinal, file:path});
            }
            let icon = this._ruleSetDisplay.sheets[ordinal].iconFile;
            if (icon) {
                images.push({key: "icon-" + ordinal, file:icon});
            }
        }
        return images.length ? images : null;
    }

}

export class CBARuleSetEditorPage extends VContainer {
    constructor() {
        super({ref: "ruleset-editor-page"});
        this._title = new P("").addClass("page-title");
        this._ruleSetEditor = new CBARuleSetEditor();
        this.addClass("ruleset-editor-page")
            .add(this._title)
            .add(this._ruleSetEditor);
    }

    tryToLeave(leave, notLeave) {
        this._ruleSetEditor.tryToLeave(leave, notLeave);
    }

    setTitle(title) {
        this._title.setText(title);
        return this;
    }

    setRuleSet(ruleSet) {
        this._ruleSetEditor.setRuleSet(ruleSet);
        this.setVersions();
        return this;
    }

    changeRuleSet(version) {
        this._current = this._ruleSets.find(ruleset => ruleset.version === version);
        this.setRuleSet(this._current);
        return this;
    }

    addVersion(ruleSet) {
        this._ruleSets.push(ruleSet);
        this.setVersions();
        return this;
    }

    removeVersion(ruleSet) {
        this._ruleSets.remove(ruleSet);
        this.setVersions();
        return this;
    }

    setVersions() {
        let ruleSets = this._ruleSets.map(ruleSet => {
            return {
                value: ruleSet.version,
                text: ruleSet.version + (ruleSet.published ? " (published)" : "")
            }
        });
        this._ruleSetEditor.setVersions(ruleSets);
        return this;
    }

    setRuleSets(ruleSets) {
        this._ruleSets = ruleSets;
        this.editPublishedRuleSet();
        return this;
    }

    editPublishedRuleSet() {
        this._current = this._ruleSets.find(ruleSet => ruleSet.published);
        this.setRuleSet(this._current);
        return this;
    }

    get imageFiles() {
        return this._ruleSetEditor.imageFiles;
    }

    setSave(saveAction) {
        this._saveAction = saveAction;
        return this;
    }

    setDelete(deleteAction) {
        this._deleteAction = deleteAction;
        return this;
    }

    save(ruleSet, successMessage, errorMessage) {
        this._saveAction(ruleSet, successMessage, errorMessage);
    }

    delete(ruleSet, successMessage, errorMessage) {
        this._deleteAction(ruleSet, successMessage, errorMessage);
    }

    publish(publishedRuleSet) {
        this._ruleSets.forEach(ruleSet => ruleSet.published = ruleSet === false);
        publishedRuleSet.published = true;
        return this;
    }

}

let vRuleSetEditorPage = new CBARuleSetEditorPage();

export function loadRuleSets(category, success, failure) {
    sendGet("/api/ruleset/by-category/" + category,
        (text, status) => {
            let ruleSets = JSON.parse(text);
            requestLog("Rule Sets loaded.")
            success(ruleSets, status);
        },
        (text, status) => {
            requestLog("Fail to load rule sets")
            failure(text, status);
        }
    );
}

export function saveRuleSet(ruleSet, images, success, failure) {
    sendPost("/api/ruleset/save",
        ruleSet,
        (text, status) => {
            requestLog("Rule set saved")
            success(text, status);
        },
        (text, status) => {
            requestLog("Fail to save Rule Set")
            failure(text, status);
        },
        images
    );
}

export function deleteRuleSet(ruleSet, success, failure) {
    sendGet("/api/ruleset/delete/" + ruleSet.id,
        (text, status) => {
            requestLog("Rule Set deleted")
            success(text, status);
        },
        (text, status) => {
            requestLog("Fail to delete Rule set")
            failure(text, status);
        }
    );
}

export function editRuleSet(title, category, byHistory, historize) {
    this.changePage(null, vRuleSetEditorPage, byHistory, historize,
        switchPage => loadRuleSets(category,
            (ruleSets, status) => {
                vRuleSetEditorPage
                    .setTitle(title)
                    .setRuleSets(ruleSets.map(ruleSet => {
                        return {
                            id: ruleSet.id,
                            objVersion: ruleSet.version,
                            sheets: ruleSet.sheets,
                            version: ruleSet.ruleSetVersion,
                            published: ruleSet.published
                        }
                    }))
                    .setSave((ruleSet, successMessage, failureMessage) => {
                        saveRuleSet({
                            id: ruleSet.id,
                            version: ruleSet.objVersion,
                            sheets: ruleSet.sheets,
                            ruleSetVersion: ruleSet.version,
                            published: ruleSet.published,
                            category
                        },
                        vRuleSetEditorPage.imageFiles,
                        (text, status) => {
                            let result = JSON.parse(text);
                            if (ruleSet.id === undefined) {
                                ruleSet.id = result.id;
                                ruleSet.objVersion = result.version;
                            }
                            vRuleSetEditorPage.setVersions();
                            showMessage(successMessage);
                        },
                        (text, status) => {
                            showMessage(failureMessage, text);
                        })
                    })
                    .setDelete((ruleSet, successMessage, failureMessage) => {
                        deleteRuleSet(ruleSet,
                        (text, status) => {
                            vRuleSetEditorPage.editPublishedRuleSet();
                            vRuleSetEditorPage.removeVersion(ruleSet);
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
                showMessage("Cannot load rule sets of category: " + category, text);
            }
        )
    )
}
