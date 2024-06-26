'use strict'

import {
    CBUnitPlayer, CBStateSequenceElement
} from "./unit.js";
import {
    SequenceLoader
} from "./loader.js";
import {
    getDrawPlatform
} from "../board/draw.js";
import {
    WSequence
} from "../wargame/sequences.js";
import {
    InteractiveRetreatAction,
    CBAsk4RetreatSequenceElement, InteractiveAdvanceAction
} from "./interactive/interactive-combat.js";

export class CBRemoteUnitPlayer extends CBUnitPlayer {

    finishTurn(animation) {
    }

    beginTurn() {
        super.beginTurn();
        this.getFocus();
    }

    endTurn() {
        super.endTurn();
        this.releaseFocus();
    }

    getFocus() {
        this._activeMode = true;
        this.tryToLoadNewSequence();
    }

    releaseFocus() {
        delete this._activeMode;
    }

    tryToLoadNewSequence() {
        if (this._activeMode) {
            getDrawPlatform().setTimeout(() => {
                new SequenceLoader().load(this.game, sequences => {
                    if (sequences.length>0) {
                        sequences.sort((s1, s2)=>s1.count-s2.count);
                        this.game._sequence = new WSequence(this.game, sequences.last().count+1);
                        let tick = 0;
                        for (let sequence of sequences) {
                            tick = sequence.replay(tick, () => {
                                if (sequence===sequences.last()) {
                                    this.tryToLoadNewSequence();
                                }
                            });
                        }
                    } else {
                        this.tryToLoadNewSequence();
                    }
                });
            }, 4000);
        }
    }

    continueLossApplication(unit) {
        unit.action && unit.action.continueLossApplication();
    }

    applyLossesToUnit(unit, losses, attacker) {
        //losses = 2;
        for (let loss=1; loss<losses; loss++) {
            unit.takeALoss();
        }
        if (losses>0) {
            WSequence.appendElement(this.game, new CBStateSequenceElement({game: this.game, unit}));
            if (!unit.isDestroyed()) {
                WSequence.appendElement(this.game,
                    new CBAsk4RetreatSequenceElement({game: this.game, unit, losses, attacker})
                );
            }
        }
    }

    ask4LossesToUnit(unit, attacker, losses, defenderLocation, advance, continuation) {
        if (!unit.isDestroyed()) {
            let enhancedContinuation = ()=>{
                this.releaseFocus();
                continuation();
            }
            this.getFocus();
            unit.launchAction(new InteractiveRetreatAction(
                this.game, unit, losses, attacker, advance, enhancedContinuation, defenderLocation,
                false
            ));
        }
        else {
            continuation();
        }
    }

    /*
    advanceAttacker(unit, directions, continuation) {
        unit.launchAction(new InteractiveAdvanceAction(this.game, unit, directions, continuation,
            false));
        CBSequence.appendElement(this.game,
            new CBAsk4AdvanceSequenceElement({game: this.game, unit, directions})
        );
        new SequenceLoader().save(this.game, CBSequence.getSequence(this.game));
    }
*/
}