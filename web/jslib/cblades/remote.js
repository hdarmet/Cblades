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
import {
    CBSequence
} from "./sequences.js";

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
                new SequenceLoader().load(this.game, sequences => {
                    if (sequences.length>0) {
                        sequences.sort((s1, s2)=>s1.count-s2.count);
                        this.game._sequence = new CBSequence(this.game, sequences.last().count+1);
                        let tick = 0;
                        for (let sequence of sequences) {
                            tick = sequence.replay(tick, () => {
                                sequence===sequences.last() ? this.tryToLoadNewSequence() : null;
                            });
                        }
                    } else {
                        this.tryToLoadNewSequence();
                    }
                });
            }, 4000);
        }
    }

}