'use strict'

import {
    Point2D, Dimension2D, Matrix2D
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DMultiImagesArtifact
} from "../board.js";
import {
    CBMap
} from "./map.js";

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

    constructor(name, path) {
        this._identity = {
            name: name,
            path: path
        };
        this._init();
    }

    _init() {}

    clean() {
        this._init();
    }

    cancel() {
        this._init();
    }

    get identity() {
        return this._identity;
    }

    setIdentity(identity) {
        this._identity = {
            name: identity.name,
            path: identity.path
        }
    }

    get name() {
        return this._identity.name;
    }

    get path() {
        return this._identity.path;
    }

    changeSelection(playable, event) {
        if (this.game.mayChangeSelection(playable)) {
            let lastPlayable = this.game.selectedPlayable;
            if (lastPlayable) {
                lastPlayable.afterActivation(() => {
                    if (lastPlayable !== playable && lastPlayable === this.game.selectedPlayable) {
                        lastPlayable.unselect();
                    }
                    this.selectPlayable(playable, event);
                });
            }
            else {
                this.selectPlayable(playable, event);
            }
        }
    }

    _memento() {
        return {};
    }

    _revert(memento) {
    }

    selectPlayable(playable, event) {
        let currentSelectedPlayable = this.game.selectedPlayable;
        playable._select();
        this.game.closeWidgets();
        if (this.acceptActivation(playable)) {
            if (currentSelectedPlayable !== playable) {
                this.startActivation(playable, () => {
                    this.launchPlayableAction(playable, new Point2D(event.offsetX, event.offsetY));
                });
            } else {
                this.launchPlayableAction(playable, new Point2D(event.offsetX, event.offsetY));
            }
        }
    }

    acceptActivation(playable) {
        return !playable.isActivated();
    }

    get playables() {
        return this.game.playables.filter(playable=>playable.player === this);
    }

    losePlayable(playable) {
        playable.deleteFromMap();
    }

    unselectPlayable(playable) {
        playable._unselect();
    }

    startActivation(playable, action) {
        action();
    }

    launchPlayableAction(playable, point) {
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

    canFinishPlayable(playable) {
        return true;
    }

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

    toSpecs(context) {
        let playerSpecs = {
            id: this._oid,
            version: this._oversion || 0,
            identity: {
                id: this.identity._oid,
                version: this.identity._oversion || 0,
                name: this.identity.name,
                path: this.identity.path
            },
        }
        return playerSpecs;
    }

    static fromSpecs(game, specs, context) {
        let player = context.playerCreator(specs.identity.name, specs.identity.path);
        return player.fromSpecs(game, specs, context);
    }

    fromSpecs(game, specs, context) {
        game.addPlayer(this);
        this._oid = specs.id;
        this._oversion = specs.version;
        this._identity._oid = specs.identity.id;
        this._identity._oversion = specs.identity.version;
        return this;
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

    get status() {
        return this._status;
    }

    set status(status) {
        this._status = status;
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
            this.playable.finish();
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
            this.playable.finish();
            if (this.playable === this.game.focusedPlayable) {
                this.game.setFocusedPlayable(null);
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
    static types = new Map();
    static register(label, actionType) {
        CBAction.types.set(label, actionType);
    }
    static createAction(label, game, unit, mode) {
        return new (CBAction.types.get(label))(game, unit, mode);
    }

}

/**
 * base class of actuators. An actuator is a non-permanent graphical feature that gives the player the opportunity to
 * interact with the game to do something with an item of the game (a unit, a marker, etc...).
 * <p> An actuator contains one (at least) or (generally) more "triggers". A trigger is a subpart of an actuator that
 * can be activated by simply clicking on it. The trigger warns the activator that it is activated, allowing the
 * actuator to react accordingly.
 * <p> At a given time, only ONE actuator may be present on the board.
 */
export class CBActuator {

    constructor() {
        this._closeAllowed = true;
    }

    /**
     * returns the triggers owned by the actuator.
     * @return a list of triggers
     */
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

    open(game) {
        this.element.show(game.board);
    }

    close() {
        this.element.hide();
    }

    canBeClosed() {
        return this._closeAllowed;
    }

    enableClosing(closeAllowed) {
        this._closeAllowed = closeAllowed;
    }

}

export class CBCounterDisplay {

    constructor(game) {
        this._game = game;
        this._init();
        Mechanisms.addListener(this);
    }

    _init() {
        this._counters = [];
        this._vertical = CBCounterDisplay.TOP;
        this._horizontal = CBCounterDisplay.LEFT;
    }

    clean() {
        this._init();
        Mechanisms.removeListener(this);
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

    get counters() {
        return this._counters;
    }

    addCounter(counter) {
        console.assert(this._counters.indexOf(counter)<0);
        this._counters.push(counter);
        this._game._registerPlayable(counter);
        this.setCounterLocations();
        counter._setOnGame(this._game);
    }

    removeCounter(counter) {
        console.assert(this._counters.contains(counter));
        this._counters.remove(counter);
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
        console.assert(this._counters.contains(counter));
        Memento.register(this);
        this._counters.contains(counter);
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

    constructor(id, levels) {
        this._init();
        this._id = id;
        this._levels = levels;
        this._players = [];
        this._counterDisplay = new CBCounterDisplay(this);
        Mechanisms.addListener(this);
    }

    _init() {
        this._actuators = [];
        this._playables = new Set();
        this._commands = new Set();
        this._currentTurn = 0;
    }

    clean() {
        for (let player of this._players) {
            player.cancel();
        }
        for (let playable of this._playables) {
            playable.cancel();
        }
        this.map.clean();
        this._counterDisplay.clean();
        this._init();
    }

    fitWindow() {
        this._board.fitWindow();
    }

    get viewportCenter() {
        return new Point2D(this._board.viewportDimension.w/2, this._board.viewportDimension.h/2);
    }

    _buildBoard(map) {
        this._board = new DBoard(map.dimension, new Dimension2D(1000, 800), ...this._levels);
        this._board.game = this;
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(5, 10);
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
            mask: this._mask
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
        if (memento.mask) {
            this._mask = memento.mask;
        } else {
            delete this._mask;
        }
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

    centerOn(vpoint) {
        this._board.centerOn(vpoint);
    }

    recenter(vpoint) {
        this._board.recenter(vpoint);
        this.closePopup();
    }

    setArbitrator(arbitrator) {
        this._arbitrator = arbitrator;
        this._arbitrator.game = this;
    }

    get id() {
        return this._id;
    }

    get counterDisplay() {
        return this._counterDisplay;
    }

    get map() {
        return this._map;
    }

    get players() {
        return this._players;
    }

    get zoomFactor() {
        return this.board.zoomFactor;
    }

    get currentTurn() {
        return this._currentTurn;
    }

    set currentTurn(currentTurn) {
        this._currentTurn = currentTurn;
    }

    setMap(map) {
        console.assert(!this._map);
        this._map = map;
        this._buildBoard(map);
        map.element.setOnBoard(this._board);
        map.game = this;
        return this;
    }

    changeMap(map) {
        console.assert(this._map);
        this._map.element.removeFromBoard(this._board);
        delete this._map.game;
        this._map = map;
        this._board.dimension = map.dimension;
        map.element.setOnBoard(this._board);
        map.game = this;
    }

    setPlayers(players) {
        this._players = [];
        for (let player of players) {
            this.addPlayer(player);
        }
    }

    addPlayer(player) {
        player.game = this;
        this._players.push(player);
        if (!this._currentPlayer) {
            this._currentPlayer = player;
        }
    }

    getPlayer(name) {
        for (let player of this._players) {
            if (player.name === name) return player;
        }
        return null;
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

    get playables() {
        return [...this._playables];
    }

    getUnit(name) {
        let unit = this._playables.filter(unit=>unit.name === name);
        return unit.length>0 ? unit[0] : null;
    }

    openActuator(actuator) {
        Memento.register(this);
        actuator.game = this;
        actuator.open(this);
        this._actuators.push(actuator);
    }

    enableActuatorsClosing(allowed) {
        for (let actuator of this._actuators) {
            actuator.enableClosing(allowed);
        }
    }

    closeActuators() {
        Memento.register(this);
        let actuators = this._actuators;
        this._actuators = [];
        for (let actuator of actuators) {
            if (actuator.canBeClosed()) {
                actuator.close(this);
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
        this.selectedPlayable = playable;
    }

    setFocusedPlayable(playable) {
        Memento.register(this);
        this.focusedPlayable = playable;
    }

    get selectedPlayable() {
        return this._selectedPlayable;
    }

    get focusedPlayable() {
        return this._focusedPlayable;
    }

    set selectedPlayable(playable) {
        if (playable) {
            this._selectedPlayable = playable;
        }
        else {
            delete this._selectedPlayable;
        }
    }

    set focusedPlayable(playable) {
        if (playable && playable.isOnHex()) {
            this._focusedPlayable = playable;
        }
        else {
            delete this._focusedPlayable;
        }
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

    get arbitrator() {
        return this._arbitrator;
    }

    get mask() {
        return this._mask;
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
        Mechanisms.fire(this, CBAbstractGame.STARTED_EVENT);
        this._board.paint();
        return this;
    }

    _closePopup() {
        if (this._popup) {
            this._popup.close();
            delete this._popup;
        }
    }

    _closeMask() {
        if (this._mask) {
            this._mask.close();
            delete this._mask;
        }
    }

    openPopup(popup, location) {
        Memento.register(this);
        if (this._popup) {
            this._closePopup();
        }
        this._popup = popup;
        this._popup.open(this._board, location);
    }

    closePopup() {
        Memento.register(this);
        this._closePopup();
        this._closeMask();
    }

    openMask(mask) {
        Memento.register(this);
        if (this._mask) {
            this._closeMask();
        }
        this._mask = mask;
        this._mask.open(this._board);
    }

    toSpecs(context) {
        let gameSpecs = {
            id : this.id,
            version: this._oversion || 0,
            currentPlayerIndex : this.players.indexOf(this.currentPlayer),
            currentTurn : this.currentTurn,
            players: []
        };
        gameSpecs.map = this.map.toSpecs(context);
        gameSpecs.locations = [];
        for (let player of this.players) {
            let playerSpecs = player.toSpecs(context);
            gameSpecs.players.push(playerSpecs);
        }
        console.log(JSON.stringify(gameSpecs));
        return gameSpecs;
    }

    fromSpecs(specs, context) {
        console.log(JSON.stringify(specs));
        this.clean();
        context.game = this;
        this._oversion = specs.version || 0;
        this.currentTurn = specs.currentTurn;
        let map = CBMap.fromSpecs(specs.map, context);
        this.changeMap(map);
        context.pieceMap = new Map();
        for (let playerSpecs of specs.players) {
            CBAbstractPlayer.fromSpecs(this, playerSpecs, context);
        }
        this.currentPlayer = this.players[specs.currentPlayerIndex];
    }

    static STARTED_EVENT = "started-event";
    static SETTINGS_EVENT = "settings-event";
    static POPUP_MARGIN = 10;
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
        this._element.setAngle(angle%360);
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

    get alpha() {
        return this._element.alpha;
    }

    set alpha(alpha) {
        this._element.alpha = alpha;
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

    set attrs(attrs) {
        this._attrs = attrs;
    }

    get attrs() {
        return this._attrs ? this._attrs : {};
    }

    getAttr(path, value) {
        let attrs = this.attrs;
        let names = path.split(".");
        for (let index=0; index<names.length; index++) {
            if (!attrs) return null;
            attrs = attrs[names[index]];
        }
        return attrs;
    }
    setAttr(path, value) {
        !this._attrs && (this._attrs={});
        let attrs = this._attrs;
        let names = path.split(".");
        for (let index=0; index<names.length-1; index++) {
            if (!attrs[names[index]]) {
                attrs[names[index]] = {}
            }
            attrs = attrs[names[index]];
        }
        attrs[names[names.length-1]] = value;
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

        cancel() {
            if (this.element.isShown()) {
                this.element.removeFromBoard();
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

        _unselect() {
            console.assert(this.game.selectedPlayable===this);
            this.game.setSelectedPlayable(null);
            this._imageArtifact.unselect && this._imageArtifact.unselect();
            this.element.refresh();
            Mechanisms.fire(this, PlayableMixin.UNSELECTED_EVENT);
        }

        afterActivation(action) {
            action();
            return true;
        }

        select() {
            this._select();
        }

        unselect() {
            this._unselect();
        }

        _select() {
            this.game.setSelectedPlayable(this);
            this._imageArtifact.select && this._imageArtifact.select();
            this.refresh();
            Mechanisms.fire(this, PlayableMixin.SELECTED_EVENT);
        }

        get action() {
            return this._action;
        }

        set action(action) {
            this._action = action;
        }

        setPlayed() {
            Memento.register(this);
            if (!this.action) {
                this.launchAction(new CBAction(this.game, this));
            }
            this.action.markAsFinished();
        }

        set played(played) {
            if (played) {
                if (!this._action) {
                    this._action = new CBAction(this.game, this);
                }
                this._action.status = CBAction.FINISHED;
            }
            else {
                delete this._action;
            }
        }

        reactivate() {
            delete this._action;
            this._updatePlayed && this._updatePlayed();
        }

        reset() {
            this.reactivate()
        }

        isPlayed() {
            return this._action ? this._action.isPlayed() : false;
        }

        isActivated() {
            return this._action ? this._action.isStarted() : false;
        }

        isFinishable() {
            return this._action ? this._action.isFinishable() : false;
        }

        onMouseClick(event) {
            if (!this.played && this.play) {
                this.play(event);
            }
        }

        finish() {
            this._updatePlayed && this._updatePlayed();
            this.attrs = {};
        }

        toReferenceSpecs(context) {
            return this.toSpecs(context);
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
            if (!this.isCurrentPlayer()) return true;
            return this.player.canFinishPlayable(this);
        }

        finish() {
            if (this.isCurrentPlayer()) {
                super.finish && super.finish();
            }
        }

        afterActivation(action) {
            return this.player.afterActivation(this, action);
        }

        select() {
            this.player.selectPlayable(this);
        }

        unselect() {
            this.player.unselectPlayable(this);
        }

    }

}
