'use strict'

import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    CBHexLocation
} from "./map.js";
import {
    DAbstractInsert,
    DInsert,
    DMask, DMultiStatePushButton, DPushButton
} from "../widget.js";
import {
    DImageArtifact, DMultiImagesArtifact, DSimpleLevel, DStackedLevel, DStaticLevel
} from "../board.js";
import {
    CBAbstractGame,
    CBAbstractPlayer,
    CBAction,
    CBActuator,
    CBPiece,
    CBPieceImageArtifact,
    HexLocatableMixin,
    PlayableMixin
} from "./game.js";
import {
    inside, Matrix2D, Point2D
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

export function GhostArtifactMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
            this.alpha = 0.001;
        }

        mayCaptureEvent(event) {
            return true;
        }

        onMouseEnter(event) {
            super.onMouseEnter(event);
            this.alpha = 1;
            this.element.refresh();
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            this.alpha = 0.001;
            this.element.refresh();
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

export function NeighborRawActuatorArtifactMixin(clazz) {

    return class extends clazz {

        constructor(hexLocation, ...args) {
            super(...args);
            this._hexLocation = hexLocation;
            this.alpha = 0.001;
        }

        get hexLocation() {
            return this._hexLocation;
        }

        appear() {
            this.alpha = 1;
        }

        disappear() {
            this.alpha = 0.001;
        }

    }

}

export function NeighborActuatorArtifactMixin(clazz) {

    return class extends NeighborRawActuatorArtifactMixin(clazz) {

        containsPoint(point) {
            for (let hex of this._hexLocation.hexes) {
                if (inside(point, hex.borders)) return true;
            }
            return false;
        }

        mayCaptureEvent(event) {
            return true;
        }

        onMouseMove(event) {
            this.actuator.highlight(this._hexLocation);
            return true;
        }

    }

}

export function NeighborActuatorMixin(clazz) {

    return class extends clazz {

        highlight(hexLocation) {
            if (this._moveHexLocation !== hexLocation) {
                this._moveHexLocation = hexLocation;
                let hexes = new Set();
                for (let hex of hexLocation.hexes) {
                    hexes.add(hex);
                    for (let angle=0; angle<=300; angle+=60) {
                        hexes.add(hex.getNearHex(angle));
                    }
                }
                for (let trigger of this.triggers) {
                    let visible = false;
                    for (let hex of trigger.hexLocation.hexes) {
                        if (hexes.has(hex)) visible = true;
                    }
                    if (visible) {
                        trigger.appear && trigger.appear();
                    } else {
                        trigger.disappear && trigger.disappear();
                    }
                }
            }
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

export function VisibilityMixin(clazz) {

    return class extends clazz {

        _processGlobalEvent(source, event, value) {
            if (event === CBGame.VISIBILITY_EVENT) {
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

        _registerForVisibility(visibility) {
            Memento.register(this);
            this._shown = true;
            Mechanisms.addListener(this);
            this.setVisibility(visibility);
        }

        _unregisterForVisibility() {
            Memento.register(this);
            this._shown = false;
            Mechanisms.removeListener(this);
        }

        setVisibility(level) {
            this.alpha = level >= 1;
        }

    }

}
VisibilityMixin.VISIBILITY_LEVEL = 2;

export class CBAbstractInsert extends VisibilityMixin(DAbstractInsert) {

    open(board, location) {
        this._registerForVisibility(board.game.visibility);
        super.open(board, location);
    }

    close() {
        this._unregisterForVisibility();
        super.close();
    }
}

export class CBInsert extends VisibilityMixin(DInsert) {

    open(board, location) {
        this._registerForVisibility(board.game.visibility);
        super.open(board, location);
    }

    close() {
        this._unregisterForVisibility();
        super.close();
    }
}

export class CBMask extends VisibilityMixin(DMask) {

    open(board, location) {
        this._registerForVisibility(board.game.visibility);
        super.open(board, location);
    }

    close() {
        this._unregisterForVisibility();
        super.close();
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

export class CBActionActuator extends VisibilityMixin(CBActuator) {

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

    open(game) {
        this._registerForVisibility(game.visibility);
        super.open(game);
    }

    close() {
        this._unregisterForVisibility();
        super.close();
    }

    initElement(triggers, position = this.playable.location) {
        super.initElement(triggers, position);
    }

    setVisibility(level) {
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

export function RetractableGameMixin(gameClass) {

    return class extends gameClass {

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

}

export class CBBasicPlayer extends CBAbstractPlayer {

    finishTurn(animation) {
        this.game.nextTurn(animation);
    }

}

export class CBGame extends RetractableGameMixin(CBAbstractGame) {

    constructor() {
        super(new CBLevelBuilder().buildLevels());
        this._visibility = CBGame.FULL_VISIBILITY;
    }

    _resetPlayables(player) {
        this.closePopup();
        if (this._selectedPlayable) {
            this._selectedPlayable.unselect();
        }
        if (this._playables) {
            for (let playable of this._playables) {
                playable.reset && playable.reset(player);
            }
        }
    }

    get visibility() {
        return this._visibility;
    }

    _initPlayables(player) {
        if (this._playables) {
            for (let playable of this._playables) {
                playable.init && playable.init(player);
            }
        }
    }

    _createEndOfTurnCommand() {
        this._endOfTurnCommand = new DPushButton(
            "./../images/commands/turn.png", "./../images/commands/turn-inactive.png",
            new Point2D(-60, -60), animation=>{
                this.currentPlayer.finishTurn(animation);
            }).setTurnAnimation(true);
        this._endOfTurnCommand._processGlobalEvent = (source, event)=>{
            if (event === CBAbstractGame.TURN_EVENT ||
                event === CBAction.PROGRESSION_EVENT ||
                event === PlayableMixin.DESTROYED_EVENT) {
                this._endOfTurnCommand.active = this.turnIsFinishable();
            }
        }
        Mechanisms.addListener(this._endOfTurnCommand);
    }

    setMenu() {
        this._createEndOfTurnCommand();
        this.showCommand(this._endOfTurnCommand);
        this._showCommand = new DPushButton(
            "./../images/commands/show.png", "./../images/commands/show-inactive.png",
            new Point2D(-120, -60), animation=>{
                this.hideCommand(this._showCommand);
                this.showCommand(this._hideCommand);
                this.showCommand(this._undoCommand);
                this.showCommand(this._redoCommand);
                this.showCommand(this._settingsCommand);
                this.showCommand(this._saveCommand);
                this.showCommand(this._loadCommand);
                this.showCommand(this._insertLevelCommand);
                this.showCommand(this._fullScreenCommand);
                animation();
            });
        this.showCommand(this._showCommand);
        this._hideCommand = new DPushButton(
            "./../images/commands/hide.png", "./../images/commands/hide-inactive.png",
            new Point2D(-120, -60), animation=>{
                this.showCommand(this._showCommand);
                this.hideCommand(this._hideCommand);
                this.hideCommand(this._undoCommand);
                this.hideCommand(this._redoCommand);
                this.hideCommand(this._settingsCommand);
                this.hideCommand(this._saveCommand);
                this.hideCommand(this._loadCommand);
                this.hideCommand(this._insertLevelCommand);
                this.hideCommand(this._fullScreenCommand);
                animation();
            });
        this._undoCommand = new DPushButton(
            "./../images/commands/undo.png", "./../images/commands/undo-inactive.png",
            new Point2D(-180, -60), animation=>{
                Memento.undo();
                animation();
            }).setTurnAnimation(false);
        this._redoCommand = new DPushButton(
            "./../images/commands/redo.png", "./../images/commands/redo-inactive.png",
            new Point2D(-240, -60), animation=>{
                Memento.redo();
                animation();
            }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton(
            "./../images/commands/settings.png","./../images/commands/settings-inactive.png",
            new Point2D(-300, -60), animation=>{});
        this._saveCommand = new DPushButton(
            "./../images/commands/save.png", "./../images/commands/save-inactive.png",
            new Point2D(-360, -60), animation=>{});
        this._loadCommand = new DPushButton(
            "./../images/commands/load.png", "./../images/commands/load-inactive.png",
            new Point2D(-420, -60), animation=>{});
        this._insertLevelCommand = new DMultiStatePushButton(
            ["./../images/commands/insert0.png", "./../images/commands/insert1.png", "./../images/commands/insert2.png"],
            new Point2D(-480, -60), (state, animation)=>{
                this._visibility = (state+1)%3;
                Mechanisms.fire(this, CBGame.VISIBILITY_EVENT, this._visibility>=1);
                animation();
            })
            .setState(this._visibility)
            .setTurnAnimation(true, ()=>this._insertLevelCommand.setState(this._visibility));
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-540, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
        this._settingsCommand.active = false;
        this._saveCommand.active = false;
        this._loadCommand.active = false;
    }

    _reset(animation) {
        this.closeWidgets();
        this._resetPlayables(this._currentPlayer);
        let indexPlayer = this._players.indexOf(this._currentPlayer);
        this._currentPlayer = this._players[(indexPlayer + 1) % this._players.length];
        this._initPlayables(this._currentPlayer);
        animation && animation();
        Memento.clear();
        Mechanisms.fire(this, CBAbstractGame.TURN_EVENT);
    }

    turnIsFinishable() {
        if (!this.canUnselectPlayable()) return false;
        if (this.playables) {
            for (let playable of this.playables) {
                if (playable.isFinishable && !playable.isFinishable()) return false;
            }
        }
        return true;
    }

    nextTurn(animation) {
        if (!this.selectedPlayable || this.canUnselectPlayable()) {
            this._reset(animation);
        }
    }

    static TURN_EVENT = "game-turn";
    static FULL_VISIBILITY = 2;
    static VISIBILITY_EVENT = "game-visibility";
}