'use strict'

import {
    Point2D, Dimension2D, Matrix2D
} from "../geometry.js";
import {
    DImage, DTranslateLayer, getDrawPlatform
} from "../draw.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DImageArtifact, DSimpleLevel, DStaticLevel, DMultiImagesArtifact, DStackedLevel
} from "../board.js";
import {
    DMask, DMultiStatePushButton, DPushButton
} from "../widget.js";
import {
    CBHexLocation
} from "./map.js";

export let CBStacking = {
    BOTTOM: 0,
    TOP: 1
}

export let CBMoveMode = {
    NO_CONSTRAINT: 0,
    ATTACK: 1,
    FIRE: 2,
    DEFEND: 3,
    REGROUP: 4,
    RETREAT: 5
}

export class CBAbstractArbitrator {

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

}

export class CBAbstractPlayer {

    changeSelection(playable, event) {
        if (this.game.mayChangeSelection(playable)) {
            let lastPlayable = this.game.selectedPlayable;
            if (lastPlayable) {
                lastPlayable.player.afterActivation(lastPlayable, () => {
                    if (lastPlayable !== playable && lastPlayable === this.game.selectedPlayable) {
                        lastPlayable.player.unselectPlayable(lastPlayable, event);
                    }
                    this.selectPlayable(playable, event);
                });
            }
            else {
                this.selectPlayable(playable, event);
            }
        }
    }

    selectPlayable(playable, event) {
        let currentSelectedPlayable = this.game.selectedPlayable;
        playable.select();
        if (!playable.hasBeenActivated()) {
            this.game.closeWidgets();
            if (currentSelectedPlayable !== playable) {
                this.startActivation(playable, () => {
                    this.launchPlayableAction(playable, event);
                });
            } else {
                this.launchPlayableAction(playable, event);
            }
        }
    }

    get units() {
        return this.game.playables.filter(playable=>playable.unitNature && playable.player === this);
    }

    loseUnit(playable) {
        playable.deleteFromMap();
    }

    unselectPlayable(playable) {
        if (playable.action) {
            playable.action.markAsFinished();
        }
        playable.unselect();
    }

    startActivation(playable, action) {
        action();
    }

    /*
    launchPlayableAction(playable, event) {
       // launch action process here
    }
     */

    afterActivation(playable, action) {
        action();
    }

    finishTurn(animation) {
        this.game.nextTurn(animation);
    }

    canFinishPlayable(playable) {
        return true;
    }

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

}

export class CBAction {

    constructor(game, playable) {
        this._playable = playable;
        this._game = game;
        this._status = CBAction.INITIATED;
    }

    _memento() {
        return {
            status: this._status
        }
    }

    _revert(memento) {
        this._status = memento.status;
    }

    isStarted() {
        return this._status >= CBAction.STARTED;
    }

    isCancelled() {
        return this._status === CBAction.CANCELLED;
    }

    isFinished() {
        return this._status >= CBAction.FINISHED;
    }

    isFinalized() {
        return this._status >= CBAction.FINALIZED;
    }

    isFinishable() {
        return true;
    }

    markAsStarted() {
        console.assert(this._status <= CBAction.STARTED);
        if (this._status === CBAction.INITIATED) {
            Memento.register(this);
            this._status = CBAction.STARTED;
            if (this.playable.isCurrentPlayer()) {
                this.playable.markAsPlayed();
            }
            this.game.setFocusedPlayable(null);
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.STARTED);
        }
    }

    markAsFinished() {
        if (this._status < CBAction.FINISHED) {
            Memento.register(this);
            this._status = CBAction.FINISHED;
            if (this.playable.isCurrentPlayer()) {
                this.playable.markAsPlayed();
            }
            this.game.setFocusedPlayable(null);
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHED);
        }
    }

    cancel(action) {
        console.assert(this._status === CBAction.INITIATED);
        Memento.register(this);
        this._status = CBAction.CANCELLED;
        this._game.closeWidgets();
        this.playable.removeAction();
        action && action();
        Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.CANCELLED);
    }

    finalize(action) {
        console.assert(this._status >= CBAction.STARTED);
        if (this._status < CBAction.FINALIZED) {
            Memento.register(this);
            this._status = CBAction.FINALIZED;
            this._game.closeWidgets();
            action && action();
            if (this.playable.isCurrentPlayer()) {
                this.playable.markAsPlayed();
            }
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINALIZED);
        }
    }

    play() {}

    get playable() {
        return this._playable;
    }

    get game() {
        return this._game;
    }

    static INITIATED = 0;
    static STARTED = 1;
    static FINISHABLE = 1;
    static FINISHED = 3;
    static FINALIZED = 4;
    static CANCELLED = -1;
    static PROGRESSION_EVENT = "action-progression";
}

export function CBActivableMixin(clazz) {

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
            if (this._active) {
                this.setSettings(this.overSettings);
                this.element.refresh();
            }
            return true;
        }

        onMouseLeave(event) {
            if (this._active) {
                this.setSettings(this.settings);
                this.element.refresh();
            }
            return true;
        }

    }
}

export function CBActuatorTriggerMixin(clazz) {

    return class extends CBActivableMixin(clazz) {

        constructor(actuator, ...args) {
            super(...args);
            this._actuator = actuator;
        }

        get actuator() {
            return this._actuator;
        }

        onMouseClick(event) {
            this._actuator.onMouseClick(this, event);
            return true;
        }

    }
}

export class CBActuatorImageTrigger extends CBActuatorTriggerMixin(DImageArtifact) {
    constructor(...args) {
        super(...args);
    }
}

export class CBActuatorMultiImagesTrigger extends CBActuatorTriggerMixin(DMultiImagesArtifact) {
    constructor(...args) {
        super(...args);
    }
}

export class CBActuator {

    constructor() {
        this._shown = false;
        this._hideAllowed = true;
    }

    get triggers() {
        return this._triggers;
    }

    initElement(triggers, position = new Point2D(0, 0)) {
        this._triggers = triggers;
        this._element = new DElement(...this._triggers);
        this._element._actuator = this;
        this._element.setLocation(position);
    }

    findTrigger(predicate) {
        for (let artifact of this.triggers) {
            if (predicate(artifact)) return artifact;
        }
        return null;
    }

    get element() {
        return this._element;
    }

    getPosition(location) {
        return this._element.getPosition(location);
    }

    _processGlobalEvent(source, event, value) {
        if (event===CBActuator.VISIBILITY_EVENT) {
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

    show(game) {
        Memento.register(this);
        this._shown = true;
        Mechanisms.addListener(this);
        this.setVisibility(game.visibility);
        this.element.show(game.board);
    }

    hide(game) {
        Memento.register(this);
        this._shown = false;
        Mechanisms.removeListener(this);
        this.element.hide(game.board);
    }

    canBeHidden() {
        return this._hideAllowed;
    }

    enableHide(closeAllowed) {
        this._hideAllowed = closeAllowed;
    }

    setVisibility(level) {}

    static FULL_VISIBILITY = 2;
    static VISIBILITY_EVENT = "actuator-event";
}

export class CBUnitActuatorTrigger extends CBActuatorImageTrigger {

    constructor(actuator, unit, ...args) {
        super(actuator, ...args);
        this._unit = unit;
    }

    get unit() {
        return this._unit;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return CBGame.ULAYERS.ACTUATORS;
    }

    onMouseEnter(event) {
        super.onMouseEnter(event);
        this.unit.retractAbove();
        return true;
    }

    onMouseLeave(event) {
        super.onMouseLeave(event);
        this.unit.appearAbove();
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

export function WidgetLevelMixin(clazz) {

    return class extends clazz {

        constructor(game, ...args) {
            super(...args);
            this._game = game;
        }

        _processGlobalEvent(source, event, value) {
            if (event === WidgetLevelMixin.VISIBILITY_EVENT) {
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
WidgetLevelMixin.VISIBILITY_EVENT = "widget-visibility";
WidgetLevelMixin.VISIBILITY_LEVEL = 2;

export class CBMask extends WidgetLevelMixin(DMask) {

    constructor(...args) {
        super(...args);
    }

}

export function Displayable(clazz) {

    return class extends clazz {

        _memento() {
            let memento = super._memento();
            memento.played = this._played;
            return memento;
        }

        _revert(memento) {
            if (memento.played) {
                this._played = memento.played;
            }
            else {
                delete this._played;
            }
        }

        setOnGame(game) {
            game.counterDisplay.addCounter(this);
        }

        removeFromGame(game) {
            game.counterDisplay.removeCounter(this);
        }

        show(game) {
            game.counterDisplay.appendCounter(this);
        }

        hide(game) {
            game.counterDisplay.deleteCounter(this);
        }

        isShown() {
            return this.element.isShown();
        }

        onMouseClick(event) {
            if (!this.played) {
                this.play(event);
            }
        }

        isFinishable() {
            return this.played;
        }

        markAsPlayed() {
            Memento.register(this);
            this._played = true;
        }

        reset() {
            delete this._played;
        }

        get played() {
            return !!this._played;
        }

    }

}

export class CBCounterDisplay {

    constructor(game) {
        this._game = game;
        this._counters = [];
        this._vertical = CBCounterDisplay.TOP;
        this._horizontal = CBCounterDisplay.LEFT;
        Mechanisms.addListener(this);
    }

    _memento() {
        return {
            counters : [...this._counters],
            vertical : this._vertical,
            horizontal : this._horizontal
        }
    }

    _revert(memento) {
        this._counters = memento.counters;
        this._vertical = memento.vertical;
        this._horizontal = memento.horizontal;
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.ZOOM_EVENT || event===DBoard.RESIZE_EVENT) {
            this.adjustCounterLocations();
        }
        else if (event===DBoard.BORDER_EVENT) {
            switch(value) {
                case DBoard.BORDER.LEFT:
                    this.horizontal = CBCounterDisplay.RIGHT;
                    break;
                case DBoard.BORDER.RIGHT:
                    this.horizontal = CBCounterDisplay.LEFT;
                    break;
                case DBoard.BORDER.TOP:
                    this.vertical = CBCounterDisplay.BOTTOM;
                    break;
                case DBoard.BORDER.BOTTOM:
                    this.vertical = CBCounterDisplay.TOP;
                    break;
            }
        }
    }

    addCounter(counter) {
        console.assert(this._counters.indexOf(counter)<0);
        this._counters.push(counter);
        this._game._registerPlayable(counter);
        this.setCounterLocations();
        counter._setOnGame(this._game);
    }

    removeCounter(counter) {
        let counterIndex = this._counters.indexOf(counter);
        console.assert(counterIndex>=0);
        this._counters.splice(counterIndex, 1);
        this._game._removePlayable(counter);
        this.setCounterLocations();
        counter._removeFromGame();
    }

    appendCounter(counter) {
        console.assert(this._counters.indexOf(counter)<0);
        Memento.register(this);
        this._counters.push(counter);
        this.adjustCounterLocations();
        counter._show(this._game);
    }

    deleteCounter(counter) {
        let counterIndex = this._counters.indexOf(counter);
        console.assert(counterIndex>=0);
        Memento.register(this);
        this._counters.splice(counterIndex, 1);
        this.adjustCounterLocations();
        counter._hide(this._game);
    }

    get horizontal() {
        return this._horizontal;
    }

    set horizontal(horizontal) {
        this._horizontal = horizontal;
        this.setCounterLocations();
    }

    setHorizontal(horizontal) {
        Memento.register(this);
        this.horizontal = horizontal;
        this.adjustCounterLocations();
    }

    get vertical() {
        return this._vertical;
    }

    set vertical(vertical) {
        this._vertical = vertical;
        this.setCounterLocations();
    }

    setVertical(vertical) {
        Memento.register(this);
        this.vertical = vertical;
        this.adjustCounterLocations();
    }

    _computeCounterLocation(setLocation) {
        let level = this._game.board.getLevel("counters");
        let markersLevel = this._game.board.getLevel("counter-markers");
        let zoomFactor= this._game.zoomFactor;
        level.setTransform(Matrix2D.scale(new Point2D(zoomFactor, zoomFactor), new Point2D(0, 0)));
        markersLevel.setTransform(Matrix2D.scale(new Point2D(zoomFactor, zoomFactor), new Point2D(0, 0)));
        let leftBottomPoint = level.getFinalPoint();
        let index = 0;
        for (let counter of this._counters) {
            let x = this._horizontal === CBCounterDisplay.LEFT ?
                CBCounterDisplay.MARGIN * index + CBCounterDisplay.XMARGIN :
                leftBottomPoint.x -CBCounterDisplay.MARGIN * (this._counters.length -index -1) -CBCounterDisplay.YMARGIN ;
            let y = this._vertical === CBCounterDisplay.TOP ?
                CBCounterDisplay.YMARGIN :
                leftBottomPoint.y -CBCounterDisplay.YMARGIN;
            setLocation(counter, new Point2D(x, y));
            index += 1;
        }
    }

    setCounterLocations() {
        this._computeCounterLocation((counter, point)=>counter.location = point);
    }

    adjustCounterLocations() {
        this._computeCounterLocation((counter, point)=>counter.setLocation(point));
    }

    static MARGIN = 200;
    static XMARGIN = 125;
    static YMARGIN = 125;
    static LEFT = 0;
    static RIGHT = 1;
    static TOP = 0;
    static BOTTOM = 1;
}

export class CBGame {

    constructor() {
        this._players = [];
        this._actuators = [];
        this._playables = new Set();
        this._visibility = 2;
        this._commands = new Set();
        this._counterDisplay = new CBCounterDisplay(this);
        Mechanisms.addListener(this);
    }

    fitWindow() {
        this._board.fitWindow();
    }

    _buildBoard(map) {

        function createPlayableArtifactSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(-slotIndex*20, -slotIndex*20+20));
            return [
                new DTranslateLayer("hex-"+slotIndex, delta)
            ]
        }

        function getPlayableArtifactSlot(artifact) {
            let playable = artifact.piece;
            return playable.hexLocation ? playable.hexLocation.playables.indexOf(playable) : 0;
        }

        function getPlayableArtifactLayer(artifact, [hexLayer]) {
            return hexLayer;
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
                case CBGame.ULAYERS.SPELLS: return spellsLayer;
                case CBGame.ULAYERS.FORMATIONS: return formationsLayer;
                case CBGame.ULAYERS.FMARKERS: return fmarkersLayer;
                case CBGame.ULAYERS.FOPTIONS: return foptionsLayer;
                case CBGame.ULAYERS.UNITS: return unitsLayer;
                case CBGame.ULAYERS.MARKERS: return markersLayer;
                case CBGame.ULAYERS.OPTIONS: return optionsLayer;
                case CBGame.ULAYERS.ACTUATORS: return actuatorsLayer;
            }
        }

        this._board = new DBoard(map.dimension, new Dimension2D(1000, 800),
            new DSimpleLevel("map"),
            new DStackedLevel("ground", getPlayableArtifactSlot, getPlayableArtifactLayer, createPlayableArtifactSlot),
            new DStackedLevel("units", getUnitArtifactSlot, getUnitArtifactLayer, createUnitArtifactSlot),
            new DSimpleLevel("actuators"),
            new DStaticLevel("counters"),
            new DStaticLevel("counter-markers"),
            new DStaticLevel("widgets"),
            new DStaticLevel("widget-items"),
            new DStaticLevel("widget-commands"));
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(20, 10);
        this._board.scrollOnBordersOnMouseMove();
        this._board.zoomInOutOnMouseWheel();
        this._board.scrollOnKeyDown()
        this._board.zoomOnKeyDown();
        this._board.undoRedoOnKeyDown();
    }

    _memento() {
        return {
            selectedPlayable: this._selectedPlayable,
            focusedPlayable: this._focusedPlayable,
            actuators: [...this._actuators],
            playables: new Set(this._playables),
            popup: this._popup,
        };
    }

    _revert(memento) {
        this._selectedPlayable = memento.selectedPlayable;
        this._focusedPlayable = memento.focusedPlayable;
        this._actuators = memento.actuators;
        this._playables = memento.playables;
        if (memento.popup) {
            this._popup = memento.popup;
        } else {
            delete this._popup;
        }
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.RESIZE_EVENT) {
            this._refresfCommands();
        }
        else if (event===CBAbstractUnit.DESTROYED_EVENT) {
            if (this.focusedPlayable === source) {
                this.setFocusedPlayable(null);
            }
            if (this.selectedPlayable === source) {
                this.setSelectedPlayable(null);
            }
        }
    }

    recenter(vpoint) {
        this._board.recenter(vpoint);
        this.closePopup();
    }

    setArbitrator(arbitrator) {
        this._arbitrator = arbitrator;
        this._arbitrator.game = this;
    }

    get counterDisplay() {
        return this._counterDisplay;
    }

    get map() {
        return this._map;
    }

    get zoomFactor() {
        return this.board.zoomFactor;
    }

    setMap(map) {
        this._map = map;
        this._buildBoard(map);
        map.element.setOnBoard(this._board);
        map.game = this;
        return this;
    }

    addPlayer(player) {
        player.game = this;
        this._players.push(player);
        if (!this._currentPlayer) {
            this._currentPlayer = player;
        }
    }

    _registerPlayable(unit) {
        console.assert(!this._playables.has(unit));
        this._playables.add(unit)
    }

    _removePlayable(unit) {
        console.assert(this._playables.has(unit));
        this._playables.delete(unit);
    }

    _appendPlayable(unit) {
        console.assert(!this._playables.has(unit));
        Memento.register(this);
        this._playables.add(unit)
    }

    _deletePlayable(unit) {
        console.assert(this._playables.has(unit));
        Memento.register(this);
        this._playables.delete(unit);
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

    _initPlayables(player) {
        if (this._playables) {
            for (let playable of this._playables) {
                playable.init && playable.init(player);
            }
        }
    }

    get playables() {
        return [...this._playables];
    }

    turnIsFinishable() {
        if (!this.canUnselectPlayable()) return false;
        if (this._playables) {
            for (let playable of this._playables) {
                if (playable.isFinishable && !playable.isFinishable()) return false;
            }
        }
        return true;
    }

    openActuator(actuator) {
        Memento.register(this);
        actuator.game = this;
        actuator.visibility = this._visibility;
        actuator.show(this);
        this._actuators.push(actuator);
    }

    enableActuatorsClosing(allowed) {
        for (let actuator of this._actuators) {
            actuator.enableHide(allowed);
        }
    }

    closeActuators() {
        Memento.register(this);
        let actuators = this._actuators;
        this._actuators = [];
        for (let actuator of actuators) {
            if (actuator.canBeHidden()) {
                actuator.hide(this);
            }
            else {
                this._actuators.push(actuator);
            }
        }
    }

    closeWidgets() {
        this.closeActuators();
        this.closePopup();
    }

    mayChangeSelection(playable) {
        if (!this.canSelectPlayable(playable)) return false;
        return !this.selectedPlayable || this.selectedPlayable===playable || this.canUnselectPlayable();
    }

    canUnselectPlayable() {
        return !this.focusedPlayable && (
            !this.selectedPlayable ||
            !this.selectedPlayable.hasBeenActivated() ||
            this.selectedPlayable.action.isFinished() ||
            this.selectedPlayable.action.isFinishable());
    }

    canSelectPlayable(playable) {
        return (!this.focusedPlayable || this.focusedPlayable===playable) && playable.isCurrentPlayer();
    }

    setSelectedPlayable(playable) {
        Memento.register(this);
        if (playable) {
            this._selectedPlayable = playable;
        }
        else {
            delete this._selectedPlayable;
        }
    }

    setFocusedPlayable(playable) {
        Memento.register(this);
        if (playable && playable.isOnBoard()) {
            this._focusedPlayable = playable;
        }
        else {
            delete this._focusedPlayable;
        }
    }

    get selectedPlayable() {
        return this._selectedPlayable;
    }

    get focusedPlayable() {
        return this._focusedPlayable;
    }

    get visibility() {
        return this._visibility;
    }

    _createEndOfTurnCommand() {
        this._endOfTurnCommand = new DPushButton(
            "./../images/commands/turn.png", "./../images/commands/turn-inactive.png",
            new Point2D(-60, -60), animation=>{
            this.currentPlayer.finishTurn(animation);
        }).setTurnAnimation(true);
        this._endOfTurnCommand._processGlobalEvent = (source, event)=>{
            if (event === CBGame.TURN_EVENT ||
                event === CBAction.PROGRESSION_EVENT ||
                event === CBAbstractUnit.DESTROYED_EVENT) {
                this._endOfTurnCommand.active = this.turnIsFinishable();
            }
        }
        Mechanisms.addListener(this._endOfTurnCommand);
    }

    showCommand(command) {
        this._commands.add(command);
        command.setOnBoard(this._board);
    }

    hideCommand(command) {
        this._commands.delete(command);
        command.removeFromBoard();
    }

    _refresfCommands() {
        for (let command of this._commands) {
            command.removeFromBoard();
            command.setOnBoard(this._board);
        }
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
            this.showCommand(this._editorCommand);
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
            this.hideCommand(this._editorCommand);
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
        this._editorCommand = new DMultiStatePushButton(
            ["./../images/commands/editor.png", "./../images/commands/field.png"],
            new Point2D(-480, -60), (state, animation)=>{
                if (!state)
                    CBGame.edit(this);
                else
                    this.closeActuators();
                animation();
        }).setTurnAnimation(true, ()=>this._editorCommand.setState(this._editorCommand.state?0:1));
        this._insertLevelCommand = new DMultiStatePushButton(
            ["./../images/commands/insert0.png", "./../images/commands/insert1.png", "./../images/commands/insert2.png"],
            new Point2D(-540, -60), (state, animation)=>{
                this._visibility = (state+1)%3;
                Mechanisms.fire(this, CBActuator.VISIBILITY_EVENT, this._visibility);
                Mechanisms.fire(this, WidgetLevelMixin.VISIBILITY_EVENT, this._visibility>=1);
                animation();
            })
            .setState(this._visibility)
            .setTurnAnimation(true, ()=>this._insertLevelCommand.setState(this._visibility));
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-600, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            }).setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
        this._settingsCommand.active = false;
        this._saveCommand.active = false;
        this._loadCommand.active = false;
    }

    nextTurn(animation) {
        if (!this.selectedPlayable || this.canUnselectPlayable()) {
            this.closeWidgets();
            this._resetPlayables(this._currentPlayer);
            let indexPlayer = this._players.indexOf(this._currentPlayer);
            this._currentPlayer = this._players[(indexPlayer + 1) % this._players.length];
            this._initPlayables(this._currentPlayer);
            animation && animation();
            Memento.clear();
            Mechanisms.fire(this, CBGame.TURN_EVENT);
        }
    }

    get arbitrator() {
        return this._arbitrator;
    }

    get popup() {
        return this._popup;
    }

    get board() {
        return this._board;
    }

    get root() {
        return this._board.root;
    }

    get actuators() {
        return this._actuators;
    }

    get currentPlayer() {
        return this._currentPlayer;
    }

    set currentPlayer(currentPlayer) {
        this._currentPlayer = currentPlayer;
    }

    start() {
        Memento.activate();
        Mechanisms.fire(this, CBGame.STARTED);
        this._board.paint();
        return this;
    }

    openPopup(popup, location) {
        Memento.register(this);
        if (this._popup) {
            this.closePopup();
        }
        this._popup = popup;
        this._popup.open(this._board, location);
    }

    closePopup() {
        Memento.register(this);
        if (this._popup) {
            this._popup.close();
            delete this._popup;
        }
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

    static TURN_EVENT = "game-turn";
    static SETTINGS_EVENT = "settings-turn";
    static POPUP_MARGIN = 10;
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
    static edit = function(game) {};
}

export class CBPieceImageArtifact extends DMultiImagesArtifact {

    constructor(piece, ...args) {
        super(...args); // levelName, image, position, dimension, pangle=0
        this.setSettings(this.settings);
        this._piece = piece;
    }

    onMouseClick(event) {
        this.piece.onMouseClick && this.piece.onMouseClick(event);
        return true;
    }

    get piece() {
        return this._piece;
    }

    get game() {
        return this.piece.game;
    }

    get settings() {
        return level=>{
            level.setShadowSettings("#000000", 15);
        }
    }

    onMouseEnter(event) {
        return true;
    }

    onMouseLeave(event) {
        return true;
    }

}

function SelectableMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
        }

        get selectedSettings() {
            return level=>{
                level.setShadowSettings("#FF0000", 15);
            }
        }

        get overSettings() {
            return level=>{
                level.setShadowSettings("#00FFFF", 15);
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
            if (this.game.selectedPlayable!==this.unit && this.game.canSelectPlayable(this.unit)) {
                this.setSettings(this.overSettings);
            }
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            if (this.game.selectedPlayable!==this.unit && this.game.canSelectPlayable(this.unit)) {
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

        onMouseEnter(event) {
            super.onMouseEnter(event);
            this.piece.retractAbove();
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            this.piece.appearAbove();
            return true;
        }

    }
}

export function RetractablePlayableMixin(clazz) {

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
                    playables[index].collectArtifactsToRetract(artifacts);
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

    }
}

export function RetractableActuatorMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        collectArtifactsToRetract(unit, artifacts) {
            for (let trigger of this.triggers) {
                if (trigger.unit === unit) {
                    artifacts.push(trigger);
                }
            }
        }

    }
}

export class CBPiece {

    constructor(levelName, paths, dimension) {
        this._levelName = levelName;
        this._images = [];
        for (let path of paths) {
            this._images.push(DImage.getImage(path));
        }
        this._imageArtifact = this.createArtifact(this._levelName, this._images, new Point2D(0, 0), dimension);
        this._element = new DElement(this._imageArtifact);
        this._element._unit = this;
    }

    createArtifact(levelName, images, position, dimension) {
        return new CBPieceImageArtifact(this, levelName, images, position, dimension);
    }

    _memento() {
        return {}
    }

    _revert(memento) {
    }

    get artifact() {
        return this._imageArtifact;
    }

    get angle() {
        return this._element.angle;
    }

    _setAngle(angle) {
        this._element.setAngle(angle);
    }

    set angle(angle) {
        this._setAngle(angle);
    }

    get location() {
        return this._element.location;
    }

    get viewportLocation() {
        return this.artifact.viewportLocation;
    }

    _setLocation(location) {
        this._element.setLocation(location);
    }

    set location(location) {
        this._setLocation(location);
    }

    setLocation(location) {
        Memento.register(this);
        this._setLocation(location);
    }

    get element() {
        return this._element;
    }

    refresh() {
        this._element.refresh();
    }

    get game() {
        return this._game;
    }

    isShown() {
        return !!this._element.board;
    }

    _setOnGame(game) {
        this._element.setOnBoard(game.board);
        this._game = game;
    }

    _removeFromGame() {
        this._element.removeFromBoard();
    }

    _show(game) {
        Memento.register(this);
        this._element.show(game.board);
        this._game = game;
    }

    _hide() {
        Memento.register(this);
        this._element.hide();
    }

    collectArtifactsToRetract(artifacts) {
        artifacts.push(this._imageArtifact);
    }

}

export class CBPlayable extends RetractablePlayableMixin(CBPiece) {

    constructor(levelName, paths, dimension) {
        super(levelName, paths, dimension);
    }

    _getPieces() {
        return [
            this
        ];
    }

    get pieces() {
        return this._getPieces();
    }

}

export class CBCounter extends CBPlayable {

    constructor(levelName, paths, dimension) {
        super(levelName, paths, dimension);
    }

    get counterNature() {
        return true;
    }

    _memento() {
        let memento = super._memento();
        memento.hexLocation = this._hexLocation;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento.hexLocation) {
            this._hexLocation = memento.hexLocation;
        }
        else delete this._hexLocation;
    }

    _addPlayable(hexLocation) {
        hexLocation.game._registerPlayable(this);
        hexLocation._pushPlayable(this);
    }

    _removePlayable(hexLocation) {
        console.assert(hexLocation.game === this.game);
        hexLocation.game._removePlayable(this);
        hexLocation._removePlayable(this);
    }

    _appendPlayable(hexLocation) {
        hexLocation.game._appendPlayable(this);
        hexLocation._appendPlayableOnTop(this);
    }

    _deletePlayable(hexLocation) {
        console.assert(hexLocation.game === this.game);
        hexLocation.game._deletePlayable(this);
        hexLocation._deletePlayable(this);
    }

    addToMap(hexLocation) {
        console.assert(!this._hexLocation);
        this._hexLocation = hexLocation;
        this._addPlayable(hexLocation);
        this._setOnGame(hexLocation.map.game);
        this._setLocation(hexLocation.location);
    }

    removeFromMap() {
        console.assert(this._hexLocation);
        this._removePlayable(this._hexLocation);
        this._removeFromGame();
        delete this._hexLocation;
    }

    appendToMap(hexLocation) {
        console.assert(!this._hexLocation);
        Memento.register(this);
        this._hexLocation = hexLocation;
        this._appendPlayable(hexLocation);
        this._show(hexLocation.map.game);
        this._element.move(hexLocation.location);
    }

    deleteFromMap() {
        console.assert(this._hexLocation);
        Memento.register(this);
        this._deletePlayable(this._hexLocation);
        this._hide();
        delete this._hexLocation;
    }

    get hexLocation() {
        return this._hexLocation;
    }

    static getByType(hexLocation, type) {
        for (let playable of hexLocation.playables) {
            if (playable instanceof type) return playable;
        }
        return null;
    }

}
Object.defineProperty(CBHexLocation.prototype, "counters", {
    get: function() {
        return this.playables.filter(playable=>playable.counterNature);
    }
});

export class UnitImageArtifact extends RetractableArtifactMixin(SelectableMixin(CBPieceImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this.piece;
    }

    get game() {
        return this.unit.game;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return CBGame.ULAYERS.UNITS;
    }
}

export class CBAbstractUnit extends CBPlayable {

    constructor(paths, dimension) {
        super("units", paths, dimension);
    }

    createArtifact(levelName, images, position, dimension) {
        return new UnitImageArtifact(this, levelName, images, position, dimension);
    }

    _memento() {
        let memento = super._memento();
        memento.hexLocation = this._hexLocation;
        memento.action = this._action;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento.hexLocation) {
            this._hexLocation = memento.hexLocation;
        }
        else delete this._hexLocation;
        if (memento.action) {
            this._action = memento.action;
        }
        else delete this._action;
    }

    get unitNature() {
        return true;
    }

    get slot() {
        return this.hexLocation.units.indexOf(this);
    }

    init(player) {
        if (player === this.player) {
        }
    }

    destroy() {
        Memento.register(this);
        this.player.loseUnit(this);
        Mechanisms.fire(this, CBAbstractUnit.DESTROYED_EVENT);
    }

    reset(player) {
        if (player === this.player) {
            delete this._action;
        }
    }

    changeAction(action) {
        Memento.register(this);
        this._action = action;
    }

    launchAction(action) {
        this.changeAction(action);
        action.play();
    }

    removeAction() {
        Memento.register(this);
        delete this._action;
    }

    unselect() {
        console.assert(this.game.selectedPlayable===this);
        this.game.setSelectedPlayable(null);
        this._imageArtifact.unselect();
        this.element.refresh();
        Mechanisms.fire(this, CBAbstractUnit.UNSELECTED_EVENT);
    }

    select() {
        this.game.setSelectedPlayable(this);
        this._imageArtifact.select();
        this.refresh();
        Mechanisms.fire(this, CBAbstractUnit.SELECTED_EVENT);
    }

    get hexLocation() {
        return this._hexLocation;
    }

    set hexLocation(hexLocation) {
        if (this._hexLocation) {
            this.removeFromMap();
        }
        if (hexLocation) {
            this.addToMap(hexLocation, CBStacking.TOP);
        }
    }

    onMouseClick(event) {
        this.player.changeSelection(this, event);
    }

    isCurrentPlayer() {
        return this.player === this.game.currentPlayer;
    }

    isFinishable() {
        if (!this.isCurrentPlayer()) return true;
        return this.player.canFinishPlayable(this);
    }

    isOnBoard() {
        return !!this._hexLocation;
    }

    get action() {
        return this._action;
    }

    addToMap(hexLocation, moveType=CBStacking.TOP) {
        console.assert(!this._hexLocation);
        hexLocation.game._registerPlayable(this);
        this._hexLocation = hexLocation;
        moveType===CBStacking.BOTTOM ? hexLocation._unshiftPlayable(this) : hexLocation._pushPlayable(this);
        this._setOnGame(hexLocation.map.game);
        this._setLocation(hexLocation.location);
    }

    removeFromMap() {
        console.assert(this._hexLocation);
        this.game._removePlayable(this);
        this._hexLocation._removePlayable(this);
        this._removeFromGame();
        delete this._hexLocation;
    }

    appendToMap(hexLocation, moveType =CBStacking.TOP) {
        console.assert(!this._hexLocation);
        Memento.register(this);
        hexLocation.game._appendPlayable(this);
        this._hexLocation = hexLocation;
        moveType===CBStacking.BOTTOM ? hexLocation._appendPlayableOnBottom(this) : hexLocation._appendPlayableOnTop(this);
        this._show(hexLocation.map.game);
        this._element.move(hexLocation.location);
    }

    deleteFromMap() {
        console.assert(this._hexLocation);
        Memento.register(this);
        this.game._deletePlayable(this);
        this._hexLocation._deletePlayable(this);
        this._hide();
        delete this._hexLocation;
    }

    markAsBeingPlayed() {
        if (!this.action) {
            this.launchAction(new CBAction(this.game, this));
        }
        this.action.markAsFinished();
    }

    hasBeenPlayed() {
        return this._action && this._action.isFinished();
    }

    hasBeenActivated() {
        return this._action && this._action.isStarted();
    }

    collectArtifactsToRetract(artifacts) {
        super.collectArtifactsToRetract(artifacts);
        for (let actuator of this.game.actuators) {
            if (actuator.collectArtifactsToRetract) actuator.collectArtifactsToRetract(this, artifacts);
        }
    }
    static SELECTED_EVENT = "unit-selected";
    static UNSELECTED_EVENT = "unit-unselected";
    static DESTROYED_EVENT = "unit-destroyed";
}
Object.defineProperty(CBHexLocation.prototype, "units", {
    get: function() {
        return this.playables.filter(playable=>playable.unitNature);
    }
});
Object.defineProperty(CBHexLocation.prototype, "empty", {
    get: function() {
        return this.units.length===0;
    }
});
Object.defineProperty(CBGame.prototype, "units", {
    get: function() {
        let units = [];
        if (this._playables) {
            for (let playable of this._playables) {
                if (playable.unitNature) {
                    units.push(playable);
                }
            }
        }
        return units;
    }
});

