'use strict'

import {
    CBUnitPlayer
} from "./unit.js";
import {
    SequenceLoader
} from "./loader.js";
import {
    getDrawPlatform
} from "../draw.js";

export class CBRemoteUnitPlayer extends CBUnitPlayer {

    finishTurn(animation) {
    }

    beginTurn() {
        super.beginTurn();
        this._activeMode = true;
        this.tryToLoadNewSequence();
    }

    endTurn() {
        super.endTurn();
        delete this._activeMode;
    }

    tryToLoadNewSequence() {
        if (this._activeMode) {
            getDrawPlatform().setTimeout(() => {
                new SequenceLoader().load(this.game, sequence => {
                    if (sequence) {
                        this.game._sequence = sequence;
                        sequence.replay(() => {
                            this.tryToLoadNewSequence();
                        });
                    } else {
                        this.tryToLoadNewSequence();
                    }
                });
            }, 4000);
        }
    }

}