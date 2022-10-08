'use strict';

import {
    Undoable, Vitamin
} from "../vitamin/vitamins.js";
import {
    Div, P, sendGet, sendPost, Span
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

export class CBAPresentation extends Vitamin(Div) {

    constructor({ref}) {
        super({ref});
        this._content = new Div().addClass("display-content");
        this.addClass("presentation-container").add(this._content);
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
            content: this.content
        }
    }

    set specification(specification) {
        this.content = specification.content;
    }

}

export class CBAPresentationEditor extends Undoable(VSplitterPanel) {

    constructor() {
        super({ref: "presentation-editor"});
        this.addClass("presentation-editor");
        this._presentationDisplayContainer = new Div().addClass("presentation-display-container");
        this.addOnLeft(this._presentationDisplayContainer);
        this._presentationDisplay = new CBAPresentation({ref: "presentation-display"});
        this._presentationDisplayContainer.add(this._presentationDisplay);
        this._versionContainer = new VContainer({columns: 2});
        this.addOnRight(this._versionContainer);
        this._version = new VSelectField({
            ref: "presentation-version", label: "Version",
            onInput: event => {
                this.tryToLeave(() => {
                        this.parent.changePresentation(this._version.value);
                    },
                    () => {
                        this._version.value = this._presentationObject.version;
                    });
            }
        });
        this._newVersion = new VInputField({
            ref: "presentation-new-version", label: "New Version",
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
            ref: "copy-presentation", type: "neutral", label: "Copy", enabled: false, onClick: () => {
                this.tryToLeave(() => {
                        let presentation = {
                            presentation: this._presentationObject.presentation,
                            version: this._newVersion.value,
                            published: false
                        }
                        this.setPresentation(presentation);
                        this.parent.addVersion(presentation);
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
        this._presentation = new VInputTextArea({
            ref: "presentation-content-input", label: "Contenu de la Présentation",
            heading: true,
            onInput: event => {
                this._presentationDisplay.content = this._presentation.value;
            },
            onChange: event => {
                this._memorize();
            }
        });
        this.addOnRight(this._presentation);
        this._buttons = new VButtons({
            buttons: [
                {
                    ref: "save-presentation", label: "Save", type: "accept", onClick: event => {
                        this._presentationObject.presentation = this._presentation.value;
                        this.parent.save(this._presentationObject, "Presentation Saved", "Fail to Save Presentation");
                    }
                },
                {
                    ref: "publish-presentation", label: "Publish", type: "publish", onClick: event => {
                        this._presentationObject.presentation = this._presentation.value;
                        this.parent.publish(this._presentationObject);
                        this.parent.save(this._presentationObject, "Presentation Published", "Fail to Publish Presentation");
                    }
                },
                {
                    ref: "delete-presentation", label: "Delete", type: "neutral", onClick: event => {
                        new CBAConfirm().show({
                            ref: "confirm-presentation-deletion",
                            title: "Delete Presentation Version",
                            message: "Do you really want to delete this version of the Presentation ?",
                            actionOk: () => {
                                this.parent.delete(this._presentationObject, "Presentation Deleted", "Fail to Delete Presentation");
                            }
                        });
                    }
                },
                {
                    ref: "cancel-edition", label: "Cancel", type: "refuse", onClick: event => {
                        this.setPresentation(this._presentationObject);
                    }
                }
            ]
        });
        this.addOnRight(this._buttons);
    }

    canLeave(leave, notLeave) {
        return super.canLeave(leave, notLeave, "Presentation not saved. Do you want to Change ?")
    }

    tryToLeave(leave, notLeave) {
        if (this.canLeave(leave, notLeave)) {
            leave();
        }
    }

    _editPresentation() {
        this._presentation.value = this._presentationDisplay.content;
    }

    setPresentation(presentation) {
        this._presentationObject = presentation;
        this._presentationDisplay.content = presentation.presentation;
        this._version.value = presentation.version;
        this._editPresentation();
        this._clean();
        this._memorize();
        return this;
    }

    setVersions(versions) {
        this._version.optionLines = versions;
        if (this._presentationObject) {
            this._version.value = this._presentationObject.version;
            this.get("publish-presentation").enabled = !this._presentationObject.published;
            this.get("delete-presentation").enabled = !this._presentationObject.published;
        }
        return this;
    }

    _register() {
        return this._presentationDisplay.specification;
    }

    _recover(specification) {
        if (specification) {
            this._presentationDisplay.specification = specification;
            this._editPresentation();
        }
    }

}

export class CBAPresentationEditorPage extends VContainer {
    constructor() {
        super({ref: "presentation-editor-page"});
        this._title = new P("").addClass("page-title");
        this._presentationEditor = new CBAPresentationEditor();
        this.addClass("presentation-editor-page")
            .add(this._title)
            .add(this._presentationEditor);
    }

    canLeave(leave, notLeave) {
        return this._presentationEditor.canLeave(leave, notLeave);
    }

    setTitle(title) {
        this._title.setText(title);
        return this;
    }

    setPresentation(presentation) {
        this._presentationEditor.setPresentation(presentation);
        this.setVersions();
        return this;
    }

    changePresentation(version) {
        this._current = this._presentations.find(presentation => presentation.version === version);
        this.setPresentation(this._current);
        return this;
    }

    addVersion(presentation) {
        this._presentations.push(presentation);
        this.setVersions();
        return this;
    }

    setVersions() {
        let versions = this._presentations.map(presentation => {
            return {
                value: presentation.version,
                text: presentation.version + (presentation.published ? " (published)" : "")
            }
        });
        this._presentationEditor.setVersions(versions);
        return this;
    }

    setPresentations(presentations) {
        this._presentations = presentations;
        this.editPublishedPresentation();
        return this;
    }

    editPublishedPresentation() {
        this._current = this._presentations.find(presentation => presentation.published);
        this.setPresentation(this._current);
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

    save(presentation, successMessage, errorMessage) {
        this._saveAction(presentation, successMessage, errorMessage);
    }

    delete(presentation, successMessage, errorMessage) {
        this._deleteAction(presentation, successMessage, errorMessage);
    }

    publish(publishedPresentation) {
        this._presentations.forEach(presentation => presentation.published = presentation === false);
        publishedPresentation.published = true;
        return this;
    }

}

let vPresentationEditorPage = new CBAPresentationEditorPage();

export function loadPresentations(category, success, failure) {
    sendGet("/api/presentation/by-category/" + category,
        (text, status) => {
            let presentations = JSON.parse(text);
            console.log("Presentations loaded.")
            success(presentations, status);
        },
        (text, status) => {
            console.log("Fail to load presentations")
            failure(text, status);
        }
    );
}

export function savePresentation(presentation, success, failure) {
    sendPost("/api/presentation/save",
        presentation,
        (text, status) => {
            console.log("Presentation saved")
            success(text, status);
        },
        (text, status) => {
            console.log("Fail to save presentation")
            failure(text, status);
        }
    );
}

export function deletePresentation(presentation, success, failure) {
    sendGet("/api/presentation/delete/" + presentation.id,
        (text, status) => {
            console.log("Presentation deleted")
            success(text, status);
        },
        (text, status) => {
            console.log("Fail to delete presentation")
            failure(text, status);
        }
    );
}

export function editPresentation(title, category, byHistory, historize) {
    this._changePage(null, vPresentationEditorPage, byHistory, historize,
        switchPage => loadPresentations(category,
            (presentations, status) => {
                vPresentationEditorPage
                    .setTitle(title)
                    .setPresentations(presentations.map(presentation => {
                        return {
                            id: presentation.id,
                            objVersion: presentation.version,
                            presentation: presentation.text,
                            version: presentation.presentationVersion,
                            published: presentation.published
                        }
                    }))
                    .setSave((presentation, successMessage, failureMessage) => {
                        savePresentation({
                            id: presentation.id,
                            version: presentation.objVersion,
                            title: presentation.title,
                            text: presentation.presentation,
                            presentationVersion: presentation.version,
                            published: presentation.published,
                            category
                        },
                        (text, status) => {
                            let result = JSON.parse(text);
                            if (presentation.id === undefined) {
                                presentation.id = result.id;
                                presentation.objVersion = result.version;
                            }
                            vPresentationEditorPage.setVersions();
                            showMessage(successMessage);
                        },
                        (text, status) => {
                            showMessage(failureMessage, text);
                        })
                    })
                    .setDelete((presentation, successMessage, failureMessage) => {
                        deletePresentation(presentation,
                        (text, status) => {
                            vPresentationEditorPage.editPublishedPresentation();
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
                showMessage("Cannot load presentations of category: " + category, text);
            }
        )
    )
}