'use strict'

import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    CBHexLocation
} from "./map.js";
import {
    DMask
} from "../widget.js";
import {
    DBoard,
    DImageArtifact, DMultiImagesArtifact, DSimpleLevel, DStackedLevel, DStaticLevel
} from "../board.js";
import {
    CBAbstractGame, CBActuator, CBPiece, CBPieceImageArtifact, HexLocatableMixin, PlayableMixin
} from "./game.js";
import {
    Matrix2D, Point2D
} from "../geometry.js";
import {
    DTranslateLayer, getDrawPlatform
} from "../draw.js";

export function SelectableArtifactMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
        }

        get selectedSettings() {
            return level=>{
                level.setShadowSettings("#FF0000", 10);
            }
        }

        get overSettings() {
            return level=>{
                level.setShadowSettings("#00FFFF", 10);
            }
        }

        unselect() {
            Memento.register(this);
            this.changeSettings(this.settings);
        }

        select() {
            Memento.register(this);
            this.changeSettings(this.selectedSettings);
        }

        onMouseEnter(event) {
            super.onMouseEnter(event);
            if (this.game.selectedPlayable!==this.piece && this.game.canSelectPlayable(this.piece)) {
                this.setSettings(this.overSettings);
            }
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            if (this.game.selectedPlayable!==this.piece && this.game.canSelectPlayable(this.piece)) {
                this.setSettings(this.settings);
            }
            return true;
        }

    }

}

export function RetractableArtifactMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        onMouseMove(event) {
            if (this._retractMouseEvent !== event) {
                this._retractMouseEvent = event;
                if (this._retractToken !== undefined) {
                    getDrawPlatform().clearTimeout(this._retractToken);
                }
                else {
                    this.piece.retractAbove();
                }
                this._retractToken = getDrawPlatform().setTimeout(()=>{
                    this.piece.appearAbove();
                    delete this._retractToken;
                }, 1000);
            }
            return super.onMouseMove ? super.onMouseMove(event) : true;
        }

        onMouseLeave(event) {
            super.onMouseLeave && super.onMouseLeave(event);
            this.piece.appearAbove();
            if (this._retractToken) {
                getDrawPlatform().clearTimeout(this._retractToken);
                delete this._retractToken;
            }
            return true;
        }

    }
}

export function RetractablePieceMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
        }

        retractAbove(event) {
            function retract(hexId, artifacts) {
                let playables = [];
                for (let playable of hexId.playables) {
                    playables.push(...playable.pieces);
                }
                let first = playables.indexOf(this);
                for (let index=first+1; index<playables.length; index++) {
                    artifacts.push(...playables[index].allArtifacts);
                }
            }

            let artifacts = [];
            for (let hexId of this.hexLocation.hexes) {
                retract.call(this, hexId, artifacts);
            }
            this.game.retract(artifacts);
        }

        appearAbove(event) {
            this.game.appear();
        }

        _getAllArtifacts() {
            let artifacts = super._getAllArtifacts();
            for (let actuator of this.game.actuators) {
                if (actuator._getAllArtifacts) artifacts.push(...actuator._getAllArtifacts(this));
            }
            return artifacts;
        }

    }
}

export function RetractableActuatorMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        _getAllArtifacts(playable) {
            let artifacts = [];
            for (let trigger of this.triggers) {
                if (trigger.playable === playable) {
                    artifacts.push(trigger);
                }
            }
            return artifacts;
        }

    }

}

export class CBHexCounterArtifact extends RetractableArtifactMixin(CBPieceImageArtifact) {

    get layer() {
        return CBLevelBuilder.GLAYERS.COUNTERS;
    }

}

export class CBHexCounter extends RetractablePieceMixin(HexLocatableMixin(PlayableMixin(CBPiece))) {

    createArtifact(levelName, images, position, dimension) {
        return new CBHexCounterArtifact(this, levelName, images, position, dimension);
    }

    get counterNature() {
        return true;
    }

}

Object.defineProperty(CBHexLocation.prototype, "counters", {
    get: function() {
        return this.playables.filter(playable=>playable.counterNature);
    }
});

export function WidgetLevelMixin(clazz) {

    return class extends clazz {

        constructor(game, ...args) {
            super(...args);
            this._game = game;
        }

        _processGlobalEvent(source, event, value) {
            if (event === CBAbstractGame.VISIBILITY_EVENT) {
                this.setVisibility(value);
            }
        }

        _memento() {
            return {
                shown: this._shown
            }
        }

        _revert(memento) {
            if (this._shown !== memento.shown) {
                this._shown = memento.shown;
                if (this._shown) {
                    Mechanisms.addListener(this);
                } else {
                    Mechanisms.removeListener(this);
                }
            }
        }

        open(board, location) {
            Memento.register(this);
            this._shown = true;
            Mechanisms.addListener(this);
            this.setVisibility(this._game.visibility);
            super.open(board, location);
        }

        close() {
            Memento.register(this);
            this._shown = false;
            Mechanisms.removeListener(this);
            super.close();
        }

        setVisibility(level) {
            this.alpha = level >= 1;
        }

    }

}
WidgetLevelMixin.VISIBILITY_LEVEL = 2;

export class CBMask extends WidgetLevelMixin(DMask) {

    constructor(...args) {
        super(...args);
    }

}

export let CBMoveMode = {
    NO_CONSTRAINT: 0,
    ATTACK: 1,
    FIRE: 2,
    DEFEND: 3,
    REGROUP: 4,
    RETREAT: 5
}

export function ActivableArtifactMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
            this._active = true;
            this.setSettings(this.settings);
        }

        _memento() {
            let memento = super._memento();
            memento.active = this._active;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            this._active = memento.active;
        }

        activate() {
            Memento.register(this);
            this._active = true;
            this.setSettings(this.settings);
        }

        desactivate() {
            Memento.register(this);
            delete this._active;
            this.setSettings(this.inactiveSettings);
        }

        get settings() {
            return level => {
                level.setShadowSettings("#00FFFF", 10);
            }
        }

        get overSettings() {
            return level => {
                level.setShadowSettings("#FF0000", 10);
            }
        }

        get inactiveSettings() {
            return level => {
                level.setShadowSettings("#000000", 10);
            }
        }

        onMouseEnter(event) {
            super.onMouseEnter(event);
            if (this._active) {
                this.setSettings(this.overSettings);
                this.element.refresh();
            }
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            if (this._active) {
                this.setSettings(this.settings);
                this.element.refresh();
            }
            return true;
        }

    }

}

export function CBActuatorTriggerMixin(clazz) {

    return class extends ActivableArtifactMixin(clazz) {

        constructor(actuator, ...args) {
            super(...args);
            this._actuator = actuator;
        }

        get actuator() {
            return this._actuator;
        }

        onMouseClick(event) {
            this.actuator.onMouseClick(this, event);
            return true;
        }

    }
}

export class CBActuatorImageTrigger extends CBActuatorTriggerMixin(DImageArtifact) {

}

export class CBActuatorMultiImagesTrigger extends CBActuatorTriggerMixin(DMultiImagesArtifact) {

}

export class CBPlayableActuatorTrigger extends CBActuatorImageTrigger {

    constructor(actuator, playable, ...args) {
        super(actuator, ...args);
        this._playable = playable;
    }

    get piece() {
        return this._playable;
    }

    get playable() {
        return this.piece;
    }

    get slot() {
        return this.playable.slot;
    }

    onMouseEnter(event) {
        super.onMouseEnter(event);
        this.playable.retractAbove();
        return true;
    }

    onMouseLeave(event) {
        super.onMouseLeave(event);
        this.playable.appearAbove();
        return true;
    }

}

export class CBActionActuator extends CBActuator {

    constructor(action) {
        super();
        this._action = action;
    }

    get action() {
        return this._action;
    }

    get playable() {
        return this.action.playable;
    }

    initElement(triggers, position = this.playable.location) {
        super.initElement(triggers, position);
    }

}

export class CBLevelBuilder {

    buildLevels() {

        function createPlayableArtifactSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(-slotIndex*20, -slotIndex*20+20));
            return [
                new DTranslateLayer("hex-"+slotIndex, delta),
                new DTranslateLayer("hmarkers-"+slotIndex, delta)
            ]
        }

        function getPlayableArtifactSlot(artifact) {
            let playable = artifact.piece;
            return playable.hexLocation ? playable.hexLocation.playables.indexOf(playable) : 0;
        }

        function getPlayableArtifactLayer(artifact, [countersLayer, markersLayer, actuatorsLayer]) {
            switch (artifact.layer) {
                case CBLevelBuilder.GLAYERS.COUNTERS: return countersLayer;
                case CBLevelBuilder.GLAYERS.MARKERS: return markersLayer;
            }
        }

        function createUnitArtifactSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(slotIndex*20, -slotIndex*20));
            let formationDelta = Matrix2D.translate(new Point2D(slotIndex*20-10, -slotIndex*20+10));
            return [
                new DTranslateLayer("spells-"+slotIndex, delta),
                new DTranslateLayer("formations-"+slotIndex, slotIndex?formationDelta:delta),
                new DTranslateLayer("fmarkers-"+slotIndex, delta),
                new DTranslateLayer("foptions-"+slotIndex, delta),
                new DTranslateLayer("units-"+slotIndex, delta),
                new DTranslateLayer("markers-"+slotIndex, delta),
                new DTranslateLayer("options-"+slotIndex, delta),
                new DTranslateLayer("actuators-"+slotIndex, delta)
            ]
        }

        function getUnitArtifactSlot(artifact) {
            return artifact.slot;
        }

        function getUnitArtifactLayer(artifact, [spellsLayer, formationsLayer, fmarkersLayer, foptionsLayer, unitsLayer, markersLayer, optionsLayer, actuatorsLayer]) {
            switch (artifact.layer) {
                case CBLevelBuilder.ULAYERS.SPELLS: return spellsLayer;
                case CBLevelBuilder.ULAYERS.FORMATIONS: return formationsLayer;
                case CBLevelBuilder.ULAYERS.FMARKERS: return fmarkersLayer;
                case CBLevelBuilder.ULAYERS.FOPTIONS: return foptionsLayer;
                case CBLevelBuilder.ULAYERS.UNITS: return unitsLayer;
                case CBLevelBuilder.ULAYERS.MARKERS: return markersLayer;
                case CBLevelBuilder.ULAYERS.OPTIONS: return optionsLayer;
                case CBLevelBuilder.ULAYERS.ACTUATORS: return actuatorsLayer;
            }
        }

        return [
            new DSimpleLevel("map"),
            new DStackedLevel("ground", getPlayableArtifactSlot, getPlayableArtifactLayer, createPlayableArtifactSlot),
            new DStackedLevel("units", getUnitArtifactSlot, getUnitArtifactLayer, createUnitArtifactSlot),
            new DSimpleLevel("actuators"),
            new DStaticLevel("counters"),
            new DStaticLevel("counter-markers"),
            new DStaticLevel("widgets"),
            new DStaticLevel("widget-items"),
            new DStaticLevel("widget-commands")
        ];
    }

    static ULAYERS = {
        SPELLS: 0,
        FORMATIONS: 1,
        FMARKERS: 2,
        FOPTIONS: 3,
        UNITS: 4,
        MARKERS: 5,
        OPTIONS: 6,
        ACTUATORS: 7
    }

    static GLAYERS = {
        COUNTERS: 0,
        MARKERS: 1
    }
}

export class CBGame extends CBAbstractGame {

    constructor() {
        super(new CBLevelBuilder().buildLevels());
    }

    retract(artifacts) {
        this.appear();
        this._retracted = artifacts;
        for (let artifact of this._retracted) {
            artifact.alpha = 0;
        }
    }

    appear() {
        if (this._retracted) {
            for (let artifact of this._retracted) {
                artifact.alpha = 1;
            }
            delete this._retracted;
        }
    }

}