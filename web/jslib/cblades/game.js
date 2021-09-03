'use strict'

import {
    Point2D, Dimension2D, Matrix2D
} from "../geometry.js";
import {
    DImage, getDrawPlatform
} from "../draw.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DMultiImagesArtifact
} from "../board.js";
import {
    DMultiStatePushButton, DPushButton
} from "../widget.js";

export let CBStacking = {
    BOTTOM: 0,
    TOP: 1
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
        this.game.closeWidgets();
        if (!playable.isActivated()) {
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

    losePlayable(playable) {
        playable.deleteFromMap();
    }

    unselectPlayable(playable) {
        playable.unselect();
    }

    startActivation(playable, action) {
        action();
    }

    launchPlayableAction(playable, event) {
    }

    afterActivation(playable, action) {
        if (playable && playable.action) {
            if (!playable.action.isStarted()) {
                playable.action.cancel(() => {
                    action();
                });
            }
            else if (!playable.action.isFinalized()) {
                playable.action.finalize(() => {
                    action();
                });
            }
            else {
                action();
            }
        }
        else {
            action();
        }
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

    isPlayed() {
        return this.isFinished();
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
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.STARTED);
        }
    }

    markAsFinished() {
        if (this._status < CBAction.FINISHED) {
            Memento.register(this);
            this._status = CBAction.FINISHED;
            if (!this.playable.isCurrentPlayer || this.playable.isCurrentPlayer()) {
                this.playable._updatePlayed();
            }
            if (this.playable === this.game.focusedPlayable) {
                this.game.setFocusedPlayable(null);
            }
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
            if (!this.playable.isCurrentPlayer || this.playable.isCurrentPlayer()) {
                this.playable._updatePlayed();
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
    static FINISHED = 3;
    static FINALIZED = 4;
    static CANCELLED = -1;
    static PROGRESSION_EVENT = "action-progression";
    static FINISHABLE = 1;
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

export class CBAbstractGame {

    constructor(levels) {
        this._players = [];
        this._actuators = [];
        this._playables = new Set();
        this._visibility = 2;
        this._commands = new Set();
        this._levels = levels;
        this._counterDisplay = new CBCounterDisplay(this);
        Mechanisms.addListener(this);
    }

    fitWindow() {
        this._board.fitWindow();
    }

    _buildBoard(map) {
        this._board = new DBoard(map.dimension, new Dimension2D(1000, 800), ...this._levels);
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
            firePlayed: this._firePlayed
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
        if (memento.firePlayed) {
            this._firePlayed = memento.firePlayed;
        } else {
            delete this._firePlayed;
        }
    }

    changeFirePlayed() {
        Memento.register(this);
        this._firePlayed = true;
    }

    get firePlayed() {
        return this._firePlayed;
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.RESIZE_EVENT) {
            this._refresfCommands();
        }
        else if (event===PlayableMixin.DESTROYED_EVENT) {
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

    _registerPlayable(playable) {
        console.assert(!this._playables.has(playable));
        this._playables.add(playable)
    }

    _removePlayable(playable) {
        console.assert(this._playables.has(playable));
        this._playables.delete(playable);
    }

    _appendPlayable(playable) {
        console.assert(!this._playables.has(playable));
        Memento.register(this);
        this._playables.add(playable)
    }

    _deletePlayable(playable) {
        console.assert(this._playables.has(playable));
        Memento.register(this);
        this._playables.delete(playable);
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
            !this.selectedPlayable.isActivated() ||
            this.selectedPlayable.action.isFinished() ||
            this.selectedPlayable.action.isFinishable());
    }

    canSelectPlayable(playable) {
        return (!this.focusedPlayable || this.focusedPlayable===playable) &&
            (!playable.isCurrentPlayer || playable.isCurrentPlayer());
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
        if (playable && playable.isOnHex()) {
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
            if (event === CBAbstractGame.TURN_EVENT ||
                event === CBAction.PROGRESSION_EVENT ||
                event === PlayableMixin.DESTROYED_EVENT) {
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
                    CBAbstractGame.edit(this);
                else
                    this.closeActuators();
                animation();
        }).setTurnAnimation(true, ()=>this._editorCommand.setState(this._editorCommand.state?0:1));
        this._insertLevelCommand = new DMultiStatePushButton(
            ["./../images/commands/insert0.png", "./../images/commands/insert1.png", "./../images/commands/insert2.png"],
            new Point2D(-540, -60), (state, animation)=>{
                this._visibility = (state+1)%3;
                Mechanisms.fire(this, CBActuator.VISIBILITY_EVENT, this._visibility);
                Mechanisms.fire(this, CBAbstractGame.VISIBILITY_EVENT, this._visibility>=1);
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
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
        this._settingsCommand.active = false;
        this._saveCommand.active = false;
        this._loadCommand.active = false;
    }

    nextTurn(animation) {
        if (!this.selectedPlayable || this.canUnselectPlayable()) {
            this.closeWidgets();
            this._resetPlayables(this._currentPlayer);
            delete this._firePlayed;
            let indexPlayer = this._players.indexOf(this._currentPlayer);
            this._currentPlayer = this._players[(indexPlayer + 1) % this._players.length];
            this._initPlayables(this._currentPlayer);
            animation && animation();
            Memento.clear();
            Mechanisms.fire(this, CBAbstractGame.TURN_EVENT);
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
        Mechanisms.fire(this, CBAbstractGame.STARTED);
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

    static TURN_EVENT = "game-turn";
    static SETTINGS_EVENT = "settings-turn";
    static POPUP_MARGIN = 10;
    static edit = function(game) {};
}
CBAbstractGame.VISIBILITY_EVENT = "game-visibility";

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
            level.setShadowSettings("#000000", 10);
        }
    }

    onMouseEnter(event) {
        return true;
    }

    onMouseLeave(event) {
        return true;
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
        return this._element.isShown();
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

    _getAllArtifacts() {
        return [ this.artifact ];
    }

    get allArtifacts() {
        return this._getAllArtifacts();
    }

    _getPieces() {
        return [ this ];
    }

    get pieces() {
        return this._getPieces();
    }

    _processGlobalEvent(source, event, value) {
    }
}

export function DisplayLocatableMixin(clazz) {

    return class extends clazz {

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

    }

}

export function HexLocatableMixin(clazz) {

    return class extends clazz {

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

        _addPlayable(hexLocation, stacking) {
            console.assert(stacking !== undefined);
            hexLocation.game._registerPlayable(this);
            stacking===CBStacking.BOTTOM ? hexLocation._unshiftPlayable(this) : hexLocation._pushPlayable(this);
        }

        _removePlayable(hexLocation) {
            console.assert(hexLocation.game === this.game);
            hexLocation.game._removePlayable(this);
            hexLocation._removePlayable(this);
        }

        _appendPlayable(hexLocation, stacking) {
            console.assert(stacking !== undefined);
            hexLocation.game._appendPlayable(this);
            stacking===CBStacking.BOTTOM ? hexLocation._appendPlayableOnBottom(this) : hexLocation._appendPlayableOnTop(this);
        }

        _deletePlayable(hexLocation) {
            console.assert(hexLocation.game === this.game);
            hexLocation.game._deletePlayable(this);
            hexLocation._deletePlayable(this);
        }

        addToMap(hexLocation, stacking = CBStacking.TOP) {
            console.assert(!this._hexLocation);
            this._hexLocation = hexLocation;
            this._addPlayable(hexLocation, stacking);
            this._setOnGame(hexLocation.map.game);
            this._setLocation(hexLocation.location);
        }

        removeFromMap() {
            console.assert(this._hexLocation);
            this._removePlayable(this._hexLocation);
            this._removeFromGame();
            delete this._hexLocation;
        }

        appendToMap(hexLocation, stacking = CBStacking.TOP) {
            console.assert(!this._hexLocation);
            Memento.register(this);
            this._hexLocation = hexLocation;
            this._appendPlayable(hexLocation, stacking);
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

        set hexLocation(hexLocation) {
            if (this._hexLocation) {
                this.removeFromMap();
            }
            if (hexLocation) {
                this.addToMap(hexLocation, CBStacking.TOP);
            }
        }

        isOnHex() {
            return !!this._hexLocation;
        }

    }

}

export function PlayableMixin(clazz) {

    return class extends clazz {

        _memento() {
            let memento = super._memento();
            memento.action = this._action;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.action) {
                this._action = memento.action;
            }
            else delete this._action;
        }

        reset(player) {
            delete this._action;
            this._updatePlayed();
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
            Mechanisms.fire(this, PlayableMixin.UNSELECTED_EVENT);
        }

        select() {
            this.game.setSelectedPlayable(this);
            this._imageArtifact.select();
            this.refresh();
            Mechanisms.fire(this, PlayableMixin.SELECTED_EVENT);
        }

        get action() {
            return this._action;
        }

        markAsPlayed() {
            Memento.register(this);
            if (!this.action) {
                this.launchAction(new CBAction(this.game, this));
            }
            this.action.markAsFinished();
        }

        _updatePlayed() {
        }

        isPlayed() {
            return this._action && this._action.isPlayed();
        }

        isActivated() {
            return this._action && this._action.isStarted();
        }

        isFinishable() {
            return this._action && this._action.isFinishable();
        }

        onMouseClick(event) {
            if (!this.played) {
                this.play(event);
            }
        }

    }

}
PlayableMixin.getOneByType = function(container, type) {
    for (let playable of container.playables) {
        if (playable instanceof type) return playable;
    }
    return null;
}
PlayableMixin.getAllByType = function(container, type) {
    let result = [];
    for (let playable of container.playables) {
        if (playable instanceof type) result.push(playable);
    }
    return result;
}
PlayableMixin.SELECTED_EVENT = "playable-selected";
PlayableMixin.UNSELECTED_EVENT = "playable-unselected";
PlayableMixin.DESTROYED_EVENT = "playable-destroyed";

export function BelongsToPlayerMixin(clazz) {

    return class extends clazz {

        init(player) {
            if (player === this.player) {
                this._init();
            }
        }

        _init() {}

        destroy() {
            Memento.register(this);
            this.player.losePlayable(this);
            Mechanisms.fire(this, PlayableMixin.DESTROYED_EVENT);
        }

        onMouseClick(event) {
            this.player.changeSelection(this, event);
        }

        isCurrentPlayer() {
            return this.player === this.game.currentPlayer;
        }

        isFinishable() {
            if (!this.isCurrentPlayer || !this.isCurrentPlayer()) return true;
            return this.player.canFinishPlayable(this);
        }

        reset(player) {
            if (this.player === player) {
                super.reset(player);
            }
        }

    }

}
