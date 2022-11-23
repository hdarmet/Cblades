'use strict'

import {
    VCommand
} from "./vforms.js";

export function DetailedView(clazz) {
    return class extends clazz {
        createDetailRecord(detailRecordSpec) {
            let detailRecord = this._createDetailRecord(detailRecordSpec);
            this.add(detailRecord);
            this.detailRecords.push(detailRecord);
            return detailRecord;
        }

        insertDetailRecord(detailRecordSpec, before) {
            let index = this.detailRecords.indexOf(before);
            let detailRecord = this._createDetailRecord(detailRecordSpec);
            this.insert(detailRecord, before);
            this.detailRecords.insert(index, detailRecord);
            return detailRecord;
        }

        removeDetailRecord(index) {
            let detailRecord = this.detailRecords[index];
            this.remove(detailRecord);
            this.detailRecords.remove(index);
            return detailRecord;
        }

        exchangeDetailRecords(detailRecord) {
            let index = this.detailRecords.indexOf(detailRecord);
            this.remove(detailRecord);
            this.insert(detailRecord, this.detailRecords[index-1]);
            this.detailRecords.splice(index, 1);
            this.detailRecords.splice(index-1, 0, detailRecord);
        }

        _getDetailRecordsSpecification() {
            return this.detailRecords.map((detailRecord, ordinal)=>{
                return {
                    ordinal,
                    ...detailRecord.specification
                }
            });
        }

        _setDetailRecordsSpecification(specification) {
            for (let detailRecord of this.detailRecords) {
                this.remove(detailRecord);
            }
            this.detailRecords.length = 0;
            for (let detailRecord of specification) {
                this.createDetailRecord(detailRecord);
            }
        }
    };
}

export function DetailedForm(clazz) {
    return class extends clazz {

        createDetailRecord(detailRecordSpec) {
            return this.mainRecordView.createDetailRecord(detailRecordSpec);
        }

        selectDetailRecord(detailRecordView) {
            if (detailRecordView!==this.detailRecordView) {
                this._selectDetailRecord(detailRecordView);
                this._memorize();
            }
        }

        _selectDetailRecord(detailRecordView) {
            this._unselectDetailRecord();
            this.detailRecordView = detailRecordView;
            this.detailRecordView.addClass("selected");
            this._updateForm();
            this._deleteCommand = new VCommand({
                ref:"detail-record-delete-cmd",
                imgEnabled: `../images/site/buttons/minus.png`,
                imgDisabled: `../images/site/buttons/minus-disabled.png`,
                onClick: event=>{
                    event.stopPropagation();
                    return this._deleteDetailRecord();
                }
            }).addClass("delete-command");
            this.detailRecordView.add(this._deleteCommand);
            this._insertBeforeCommand = new VCommand({
                ref: "detail-record-insert-before-cmd",
                illustrationPosition: "center",
                imgEnabled: `../images/site/buttons/plus.png`,
                imgDisabled: `../images/site/buttons/plus-disabled.png`,
                onClick: event=>{
                    event.stopPropagation();
                    return this._createBefore();
                }
            }).addClass("insert-before-command");
            this.detailRecordView.add(this._insertBeforeCommand);
            this._insertAfterCommand = new VCommand({
                ref:"paragraph-insert-after-cmd",
                imgEnabled: `../images/site/buttons/plus.png`,
                imgDisabled: `../images/site/buttons/plus-disabled.png`,
                onClick: event=>{
                    event.stopPropagation();
                    return this._createAfter();
                }
            }).addClass("insert-after-command");
            this.detailRecordView.add(this._insertAfterCommand);
            this._goUpCommand = new VCommand({
                ref: "detail-record-goup-cmd",
                imgEnabled: `../images/site/buttons/goup.png`,
                imgDisabled: `../images/site/buttons/goup-disabled.png`,
                onClick: event => {
                    event.stopPropagation();
                    return this._goUp();
                }
            }).addClass("goup-command");
            this.detailRecordView.add(this._goUpCommand);
            this._goDownCommand = new VCommand({
                ref: "detail-record-godown-cmd",
                imgEnabled: `../images/site/buttons/godown.png`,
                imgDisabled: `../images/site/buttons/godown-disabled.png`,
                onClick: event=>{
                    event.stopPropagation();
                    return this._goDown();
                }
            }).addClass("godown-command");
            this.detailRecordView.add(this._goDownCommand);
            this._updateGoCommands();

        }

        _updateGoCommands() {
            this._goUpCommand.enabled = this.mainRecordView.detailRecords.indexOf(this.detailRecordView)!==0;
            this._goDownCommand.enabled = this.mainRecordView.detailRecords.indexOf(this.detailRecordView)<this.mainRecordView.detailRecords.length-1;
            this._deleteCommand.enabled = this.mainRecordView.detailRecords.length>1;
        }

        _unselectDetailRecord() {
            if (this.detailRecordView) {
                this.detailRecordView.removeClass("selected");
                this.detailRecordView.remove(this._deleteCommand);
                this.detailRecordView.remove(this._goUpCommand);
                this.detailRecordView.remove(this._goDownCommand);
                this.detailRecordView.remove(this._insertBeforeCommand);
                this.detailRecordView.remove(this._insertAfterCommand);
            }
        }

        _goUp() {
            let index = this.mainRecordView.detailRecords.indexOf(this.detailRecordView);
            if (index>0) {
                this.mainRecordView.exchangeDetailRecords(this.detailRecordView);
            }
            this._updateGoCommands();
            return true;
        }

        _goDown() {
            let index = this.mainRecordView.paragraphs.indexOf(this.detailRecordView);
            if (index+1<this.mainRecordView.paragraphs.length) {
                this.mainRecordView.exchangeDetailRecords(this.mainRecordView.paragraphs[index+1]);
            }
            this._updateGoCommands();
            return true;
        }

        _createBefore() {
            let paragraphView = this.mainRecordView.insertDetailRecord({
                ref: crypto.randomUUID(),
                ...this.newDetailRecordSpec,
                action: event => {
                    this.selectDetailRecord(paragraphView);
                    return true;
                }
            }, this.detailRecordView);
            this._selectDetailRecord(paragraphView);
            this._updateGoCommands();
            this._memorize();
            return true;
        }

        _createAfter() {
            let index = this.mainRecordView.detailRecords.indexOf(this.detailRecordView);
            if (index === this.mainRecordView.detailRecords.length-1) {
                let paragraphView = this.createDetailRecord({
                    ref: crypto.randomUUID(),
                    ...this.newDetailRecordSpec
                });
                this._selectDetailRecord(paragraphView);
            }
            else {
                let paragraphView = this.mainRecordView.insertDetailRecord({
                    ref: crypto.randomUUID(),
                    ...this.newDetailRecordSpec,
                    action: event => {
                        this.selectDetailRecord(paragraphView);
                        return true;
                    }
                }, this.mainRecordView.detailRecords[index+1]);
                this._selectDetailRecord(paragraphView);
            }
            this._updateGoCommands();
            this._memorize();
            return true;
        }

        _deleteDetailRecord() {
            let index = this.mainRecordView.detailRecords.indexOf(this.detailRecordView);
            this.mainRecordView.removeDetailRecord(index);
            if (this.mainRecordView.detailRecords.length===0) {
                let paragraphView = this.createDetailRecord({
                    ref: crypto.randomUUID(),
                    ...this.newDetailRecordSpec
                });
                this._selectDetailRecord(paragraphView);
            }
            else {
                this._selectDetailRecord(this.mainRecordView.detailRecords[index]);
            }
            this._updateGoCommands();
            this._memorize();
            return true;
        }

    }
}
