'use strict'

import {
    atan2, Point2D, Dimension2D
} from "../geometry.js";
import {
    DImage, DStaticLayer
} from "../draw.js";
import {
    Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DImageArtifact
} from "../board.js";
import {
    DPopup, DPushButton
} from "../widget.js";

export let CBMovement = {
    NORMAL : "normal",
    EXTENDED : "extended",
    MINIMAL : "minimal"
}

export let CBTiredness = {
    NONE: 0,
    TIRED: 1,
    EXHAUSTED: 2
}

export let CBCohesion = {
    GOOD_ORDER: 0,
    DISRUPTED: 1,
    ROUTED: 2
}

export let CBWeather = {
    HOT : 1,
    CLEAR : 2,
    CLOUDY : 3,
    OVERCAST : 4,
    RAIN : 5,
    STORM : 6
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

    changeSelection(unit, event) {
        if (this.game.mayChangeSelection(unit)) {
            let lastUnit = this.game.selectedUnit;
            if (lastUnit) {
                lastUnit.player.afterActivation(lastUnit, () => {
                    lastUnit !== unit && lastUnit.player.unselectUnit(lastUnit, event);
                    this.selectUnit(unit, event);
                });
            }
            else {
                this.selectUnit(unit, event);
            }
        }
    }

    selectUnit(unit, event) {
        this.game.closeActuators();
        DPopup.close();
        if (unit.isEngaging()) {
            unit.markAsEngaging(false);
        }
        if (this.game.selectedUnit!==unit) {
            this.beforeActivation(unit, ()=>{
                unit.select();
                this.launchUnitAction(unit, event);
            });
        }
        else {
            this.launchUnitAction(unit, event);
        }
    }

    unselectUnit(unit) {
        if (unit.action) {
            unit.action.markAsFinished();
        }
        unit.unselect();
    }

    beforeActivation(unit, action) {
        action();
    }

    launchUnitAction(unit, event) {
        unit.launchAction(new CBAction(this.game, unit));
    }

    afterActivation(unit, action) {
        action();
    }

    finishTurn(animation) {
        this.game.nextTurn(animation);
    }

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

}

export class CBAction {

    constructor(game, unit) {
        this._unit = unit;
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
        return this._status === CBAction.STARTED;
    }

    isFinished() {
        return this._status === CBAction.FINISHED;
    }

    isFinishable() {
        return true;
    }

    markAsStarted() {
        console.assert(this._status <= CBAction.STARTED);
        if (this._status === CBAction.INITIATED) {
            Memento.register(this);
            this._status = CBAction.STARTED;
            if (this.unit.isCurrentPlayer()) {
                this.unit.updatePlayed();
            }
            this.game.setFocusedUnit(null);
        }
    }

    markAsFinished() {
        if (this._status < CBAction.FINISHED) {
            Memento.register(this);
            this._status = CBAction.FINISHED;
            if (this.unit.isCurrentPlayer()) {
                this.unit.updatePlayed();
            }
            this.game.setFocusedUnit(null);
        }
    }

    play() {}

    get unit() {
        return this._unit;
    }

    get game() {
        return this._game;
    }
}
CBAction.INITIATED = 0;
CBAction.STARTED = 1;
CBAction.FINISHED = 2;

export class CBActuator {

    constructor(action) {
        this._action = action;
    }

    get action() {
        return this._action;
    }

    get unit() {
        return this.action.unit;
    }

    get element() {
        return this._element;
    }
}

export class CBGame {

    constructor() {
        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 800),
            "map", "units", "markers", "actuators",
            new DStaticLayer("widgets"),
            new DStaticLayer("widget-items"),
            new DStaticLayer("widget-commands"));
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(20, 10);
        this._board.scrollOnBordersOnMouseMove();
        this._board.zoomInOutOnMouseWheel();
        this._board.scrollOnKeyDown()
        this._board.zoomOnKeyDown();
        this._board.undoRedoOnKeyDown();
        this._players = [];
        this._actuators = [];
        DPopup.activate();
    }

    _memento() {
        return {
            selectedUnit: this._selectedUnit,
            focusedUnit: this._focusedUnit,
            actuators: [...this._actuators]
        };
    }

    _revert(memento) {
        this._selectedUnit = memento.selectedUnit;
        this._focusedUnit = memento.focusedUnit;
        this._actuators = memento.actuators;
    }

    recenter(vpoint) {
        this._board.recenter(vpoint);
        DPopup.close();
    }

    setArbitrator(arbitrator) {
        this._arbitrator = arbitrator;
        this._arbitrator.game = this;
    }

    setMap(map) {
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

    addCounter(counter, hexLocation) {
        if (!this._counters) {
            this._counters = new Set();
        }
        this._counters.add(counter);
        counter.hexLocation = hexLocation;
        counter.element.setOnBoard(this._board);
    }

    openActuator(actuator) {
        Memento.register(this);
        actuator.game = this;
        actuator.element.show(this._board);
        this._actuators.push(actuator);
    }

    closeActuators() {
        Memento.register(this);
        for (let actuator of this._actuators) {
            actuator.element.hide(this._board);
        }
        this._actuators = [];
    }

    removeActuators() {
        for (let actuator of this._actuators) {
            actuator.element.removeFromBoard(this._board);
        }
        this._actuators = [];
    }

    mayChangeSelection(unit) {
        if (!this.canSelectUnit(unit)) return false;
        return !this.selectedUnit || this.selectedUnit===unit || this.canUnselectUnit();
    }

    canUnselectUnit() {
        return !this.focusedUnit && (!this.selectedUnit.hasBeenActivated() || this.selectedUnit.action.isFinishable());
    }

    canSelectUnit(unit) {
        return (!this.focusedUnit || this.focusedUnit===unit) && unit.isCurrentPlayer() && !unit.hasBeenActivated();
    }

    setSelectedUnit(unit) {
        Memento.register(this);
        if (unit) {
            this._selectedUnit = unit;
        }
        else {
            delete this._selectedUnit;
        }
    }

    setFocusedUnit(unit) {
        Memento.register(this);
        if (unit) {
            this._focusedUnit = unit;
        }
        else {
            delete this._focusedUnit;
        }
    }

    get selectedUnit() {
        return this._selectedUnit;
    }

    get focusedUnit() {
        return this._focusedUnit;
    }

    setMenu() {
        this._endOfTurnCommand = new DPushButton("/CBlades/images/commands/turn.png", new Point2D(-60, -60), animation=>{
            this.currentPlayer.finishTurn(animation);
        }).setTurnAnimation(true);
        this._endOfTurnCommand.setOnBoard(this._board);
        this._showCommand = new DPushButton("/CBlades/images/commands/show.png", new Point2D(-120, -60), animation=>{
            this._showCommand.removeFromBoard();
            this._hideCommand.setOnBoard(this._board);
            this._undoCommand.setOnBoard(this._board);
            this._redoCommand.setOnBoard(this._board);
            this._settingsCommand.setOnBoard(this._board);
            this._saveCommand.setOnBoard(this._board);
            this._loadCommand.setOnBoard(this._board);
            animation();
        });
        this._showCommand.setOnBoard(this._board);
        this._hideCommand = new DPushButton("/CBlades/images/commands/hide.png", new Point2D(-120, -60), animation=>{
            this._showCommand.setOnBoard(this._board);
            this._hideCommand.removeFromBoard();
            this._undoCommand.removeFromBoard();
            this._redoCommand.removeFromBoard();
            this._settingsCommand.removeFromBoard();
            this._saveCommand.removeFromBoard();
            this._loadCommand.removeFromBoard();
            animation();
        });
        this._undoCommand = new DPushButton("/CBlades/images/commands/undo.png", new Point2D(-180, -60), animation=>{
            Memento.undo();
            animation();
        }).setTurnAnimation(false);
        this._redoCommand = new DPushButton("/CBlades/images/commands/redo.png", new Point2D(-240, -60), animation=>{
            Memento.redo();
            animation();
        }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton("/CBlades/images/commands/settings.png", new Point2D(-300, -60), animation=>{});
        this._saveCommand = new DPushButton("/CBlades/images/commands/save.png", new Point2D(-360, -60), animation=>{});
        this._loadCommand = new DPushButton("/CBlades/images/commands/load.png", new Point2D(-420, -60), animation=>{});
        this._settingsCommand.activate = false;
        this._saveCommand.activate = false;
        this._loadCommand.activate = false;
    }

    _resetCounters(player) {
        DPopup.close();
        if (this._selectedUnit) {
            this._selectedUnit.unselect();
        }
        if (this._counters) {
            for (let counter of this._counters) {
                counter._reset && counter._reset(player);
            }
        }
    }

    nextTurn(animation) {
        if (!this.selectedUnit || this.canUnselectUnit()) {
            this.removeActuators();
            this._resetCounters(this._currentPlayer);
            let indexPlayer = this._players.indexOf(this._currentPlayer);
            this._currentPlayer = this._players[(indexPlayer + 1) % this._players.length];
            animation && animation();
            Memento.clear();
        }
    }

    get arbitrator() {
        return this._arbitrator;
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

    start() {
        Memento.activate();
        this._board.paint();
        return this;
    }

    openPopup(popup, location) {
        popup.open(this._board, location);
    }
}
CBGame.POPUP_MARGIN = 10;

export class CBHexId {

    constructor(map, col, row) {
        this._map = map;
        this._col = col;
        this._row = row;
    }

    get map() {
        return this._map;
    }

    get col() {
        return this._col;
    }

    get row() {
        return this._row;
    }

    get location() {
        let position = this.map.findPosition(this);
        return this.map.getLocation(position);
    }

    get hex() {
        return this._map._hex(this._col, this._row);
    }

    similar(hexId) {
        return this.location.equalsTo(hexId.location);
    }

    isNearHex(hexId) {
        return this._map.isNearHex(this, hexId);
    }

    getNearHex(angle) {
        return this._map.findNearHex(this, angle);
    }

    getAngle(hexId) {
        let loc1 = this.location;
        let loc2 = hexId.location;
        return atan2(loc2.x-loc1.x, loc2.y-loc1.y);
    }

    get units() {
        return this._map.getUnitsOnHex(this);
    }

    // TODO : add map ref
    toString() {
        return "Hex("+this._col+", "+this._row+")";
    }
}

export class CBHexSideId {

    constructor(hexId1, hexId2) {
        this._hexId1 = hexId1;
        this._hexId2 = hexId2;
    }

    get fromHex() {
        return this._hexId1;
    }

    get toHex() {
        return this._hexId2;
    }

    get location() {
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        return new Point2D((loc1.x+loc2.x)/2, (loc1.y+loc2.y)/2);
    }

    get angle() {
        return this._hexId1.getAngle(this._hexId2);
    }

    similar(hexSideId) {
        return this.location.equalsTo(hexSideId.location);
    }
}

export class CBHexVertexId {

    constructor(hexId1, hexId2, hexId3) {
        this._hexId1 = hexId1;
        this._hexId2 = hexId2;
        this._hexId3 = hexId3;
    }

    get fromHex() {
        return this._hexId1;
    }

    get toHexSide() {
        return new CBHexSideId(this._hexId2, this._hexId3);
    }

    get location() {
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        let loc3 = this._hexId3.location;
        return new Point2D((loc1.x+loc2.x+loc3.x)/3, (loc1.y+loc2.y+loc3.y)/3);
    }

    get angle() {
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        let loc3 = this._hexId3.location;
        return atan2((loc2.x+loc3.x)/2-loc1.x, (loc2.y+loc3.y)/2-loc1.y);
    }

    similar(hexVertexId) {
        return this.location.equalsTo(hexVertexId.location);
    }
}

class CBHex {

    constructor(map, col, row) {
        this._id = new CBHexId(map, col, row);
        this._units = [];
    }

    get id() {
        return this._id;
    }

    _memento() {
        return {
            units: [...this._units]
        }
    }

    _revert(memento) {
        this._units = memento.units;
    }

    addUnit(unit) {
        this._units.push(unit);
    }

    appendUnit(unit) {
        Memento.register(this);
        this._units.push(unit);
    }

    deleteUnit(unit) {
        Memento.register(this);
        this._units.splice(this._units.indexOf(unit), 1);
    }

    get units() {
        return this._units;
    }
}

class MapImageArtifact extends DImageArtifact {

    constructor(map, ...args) {
        super(...args);
        this._map = map;
    }

    onMouseClick(event) {
        this._map.onMouseClick(event);
    }
}

export class CBMap {

    constructor(path) {
        let image = DImage.getImage(path);
        this._imageArtifact = new MapImageArtifact(this, "map", image, new Point2D(0, 0), CBMap.DIMENSION);
        this._element = new DElement(this._imageArtifact);
        this._element._map = this;
        this._hexes = [];
    }

    findPosition(hexId) {
        let x = CBMap.WIDTH/CBMap.COL_COUNT * hexId.col-CBMap.WIDTH/2;
        let y = CBMap.HEIGHT/CBMap.ROW_COUNT * hexId.row-CBMap.HEIGHT/2;
        if (hexId.col%2) y-= CBMap.HEIGHT/CBMap.ROW_COUNT/2;
        return new Point2D(x, y);
    }

    _hex(col, row) {
        let column = this._hexes[col];
        if (!column) {
            column = [];
            this._hexes[col] = column;
        }
        let hexSpec = column[row];
        if (!hexSpec) {
            hexSpec = new CBHex(this, col, row);
            column[row] = hexSpec;
        }
        return hexSpec;
    }

    getHex(col, row) {
        return this._hex(col, row).id;
    }

    isNearHex(hexId1, hexId2) {
        if (hexId1.col === hexId2.col) {
            if (hexId1.row === hexId2.row+1) {
                return 0;
            }
            if (hexId1.row === hexId2.row-1) {
                return 180;
            }
            return false;
        }
        if (hexId1.col%2) {
            if (hexId1.col === hexId2.col-1) {
                if (hexId1.row === hexId2.row+1) {
                    return 60;
                }
                if (hexId1.row === hexId2.row) {
                    return 120;
                }
                return false;
            }
            else if (hexId1.col === hexId2.col + 1) {
                if (hexId1.row === hexId2.row) {
                    return 240;
                }
                if (hexId1.row === hexId2.row+1) {
                    return 300;
                }
                return false;
            }
            return false
        }
        else {
            if (hexId1.col === hexId2.col-1) {
                if (hexId1.row === hexId2.row) {
                    return 60;
                }
                if (hexId1.row === hexId2.row-1) {
                    return 120;
                }
                return false;
            }
            else if (hexId1.col === hexId2.col + 1) {
                if (hexId1.row === hexId2.row-1) {
                    return 240;
                }
                if (hexId1.row === hexId2.row) {
                    return 300;
                }
                return false;
            }
            return false
        }
    }

    findNearHex(hexId, angle) {
        if (angle === 0) {
            return this._hex(hexId.col, hexId.row-1).id;
        }
        else if (angle === 60) {
            return hexId.col%2 ?
                this._hex(hexId.col+1, hexId.row-1).id :
                this._hex(hexId.col+1, hexId.row).id;
        }
        else if (angle === 120) {
            return hexId.col%2 ?
                this._hex(hexId.col+1, hexId.row).id :
                this._hex(hexId.col+1, hexId.row+1).id;
        }
        else if (angle === 180) {
            return this._hex(hexId.col, hexId.row+1).id;
        }
        else if (angle === 240) {
            return hexId.col%2 ?
                this._hex(hexId.col-1, hexId.row).id :
                this._hex(hexId.col-1, hexId.row+1).id;
        }
        else if (angle === 300) {
            return hexId.col%2 ?
                this._hex(hexId.col-1, hexId.row-1).id :
                this._hex(hexId.col-1, hexId.row).id;
        }
    }

    getUnitsOnHex(hexId) {
        console.assert(hexId.map===this);
        return this._hex(hexId.col, hexId.row).units;
    }

    getLocation(point) {
        return this._element.getLocation(point);
    }

    get element() {
        return this._element;
    }

    set game(game) {
        this._game = game;
    }

    get game() {
        return this._game;
    }

    onMouseClick(event) {
        this.game.recenter(new Point2D(event.offsetX, event.offsetY));
    }
}
CBMap.fromArtifact = function(artifact) {
    return artifact.element._map;
}
CBMap.WIDTH = 2046;
CBMap.HEIGHT = 3150;
CBMap.DIMENSION = new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT);
CBMap.COL_COUNT = 12;
CBMap.ROW_COUNT = 16;

class CounterImageArtifact extends DImageArtifact {

    constructor(counter, ...args) {
        super(...args); // levelName, image, position, dimension, pangle=0
        this.setSettings(this.settings);
        this._counter = counter;
    }

    onMouseClick(event) {
        this._counter.onMouseClick && this._counter.onMouseClick(event);
    }

    get settings() {
        return level=>{
            level.setShadowSettings("#000000", 15);
        }
    }
}

export class CBCounter {

    constructor(...args) {
        this._imageArtifact = this.createArtifact(...args);
        this._element = new DElement(this._imageArtifact);
        this._element._unit = this;
    }

    createArtifact(path, dimension) {
        this._image = DImage.getImage(path);
        return new CounterImageArtifact(this, "units", this._image, new Point2D(0, 0), dimension);
    }

    get artifact() {
        return this._imageArtifact;
    }

    get angle() {
        return this._element.angle;
    }

    set angle(angle) {
        this._element.setAngle(angle);
    }

    get location() {
        return this._element.location;
    }

    get viewportLocation() {
        return this.artifact.viewportLocation;
    }

    set location(location) {
        this._element.setLocation(location);
    }

    get element() {
        return this._element;
    }

    refresh() {
        this._element.refresh();
    }

    set game(game) {
        this._game = game;
    }

    get game() {
        return this._game;
    }
}

class UnitImageArtifact extends CounterImageArtifact {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this._counter;
    }

    get game() {
        return this.unit.game;
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
        if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
            this.setSettings(this.overSettings);
        }
    }

    onMouseLeave(event) {
        if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
            this.setSettings(this.settings);
        }
    }

}

export class CBUnit extends CBCounter {

    constructor(player, path) {
        super(path, CBUnit.DIMENSION);
        this._player = player;
        this._movementPoints=2;
        this._extendedMovementPoints=this._movementPoints*1.5;
        this._tiredness=0;
        this._cohesion=0;
        this._engaging=false;
        this._charging=false;
    }

    createArtifact(path, dimension) {
        this._image = DImage.getImage(path);
        return new UnitImageArtifact(this,"units", this._image, new Point2D(0, 0), dimension);
    }

    createMarkerArtifact(path, slot) {
        let image = DImage.getImage(path);
        let marker = new CounterImageArtifact(this,"markers", image,
            CBUnit.MARKERS_POSITION[slot], CBUnit.MARKER_DIMENSION);
        this._element.appendArtifact(marker);
        return marker;
    }

    _memento() {
        return {
            hexLocation: this._hexLocation,
            movementPoints: this._movementPoints,
            extendedMovementPoints: this._extendedMovementPoints,
            tiredness: this._tiredness,
            tirednessArtifact: this._tirednessArtifact,
            cohesion: this._cohesion,
            cohesionArtifact: this._cohesionArtifact,
            playedArtifact: this._playedArtifact,
            engaging: this._engaging,
            charging: this._charging,
            engagingArtifact: this._engagingArtifact,
            action: this._action
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
        this._movementPoints = memento.movementPoints;
        this._extendedMovementPoints = memento.extendedMovementPoints;
        this._tiredness = memento.tiredness;
        this._tirednessArtifact = memento.tirednessArtifact;
        this._cohesion = memento.cohesion;
        this._cohesionArtifact = memento.cohesionArtifact;
        this._playedArtifact = memento.playedArtifact;
        this._engaging = memento.engaging;
        this._charging = memento.charging;
        this._engagingArtifact = memento.engagingArtifact;
        this._action = memento.action;
    }

    launchAction(action) {
        Memento.register(this);
        this._action = action;
        action.play();
    }

    removeAction() {
        Memento.register(this);
        delete this._action;
    }

    _reset(player) {
        if (player === this._player) {
            this._movementPoints = 2;
            this._extendedMovementPoints = this._movementPoints*1.5;
            delete this._action;
            this._updatePlayed();
        }
    }

    unselect() {
        console.assert(this.game.selectedUnit===this);
        if (this.hasBeenActivated()) {
            this.markAsBeingPlayed();
        }
        this.game.setSelectedUnit(null);
        this._imageArtifact.unselect();
        this.element.refresh();
    }

    select() {
        this.game.setSelectedUnit(this);
        this._imageArtifact.select();
        this.refresh();
    }

    onMouseClick(event) {
        this.player.changeSelection(this, event);
    }

    isCurrentPlayer() {
        return this.player === this.game.currentPlayer;
    }

    get game() {
        return this._player.game;
    }

    get action() {
        return this._action;
    }

    get player() {
        return this._player;
    }

    get hexLocation() {
        return this._hexLocation;
    }

    set hexLocation(hexId) {
        this._hexLocation = hexId;
        hexId.hex.addUnit(this);
        this.location = hexId.location;
    }

    get movementPoints() {
        return this._movementPoints;
    }

    set movementPoints(movementPoints) {
        this._movementPoints = movementPoints;
    }

    markAsBeingPlayed() {
        console.assert(this.action);
        this.action.markAsFinished();
    }

    hasBeenPlayed() {
        return this._action && this._action.isFinished();
    }

    hasBeenActivated() {
        return this._action && (this._action.isStarted() || this._action.isFinished());
    }

    updatePlayed() {
        Memento.register(this);
        this._updatePlayed();
    }

    _updatePlayed() {
        if (!this._playedArtifact !== !this.hasBeenPlayed()) {
            this._playedArtifact && this._element.deleteArtifact(this._playedArtifact);
            delete this._playedArtifact;
            if (this.hasBeenPlayed()) {
                this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/actiondone.png", 0);
            }
        }
    }

    get action() {
        return this._action;
    }

    get extendedMovementPoints() {
        return this._extendedMovementPoints;
    }

    set extendedMovementPoints(extendedMovementPoints) {
        this._extendedMovementPoints = extendedMovementPoints;
    }

    _updateMovementPoints(cost) {
        this._movementPoints -= cost;
        this._extendedMovementPoints -= cost;
    }

    move(hexId, cost) {
        if (hexId !== this._hexLocation) {
            Memento.register(this);
            this._hexLocation && this._hexLocation.hex.deleteUnit(this);
            hexId && hexId.hex.appendUnit(this);
            if (!this._hexLocation) {
                if (hexId) {
                    this._element.show(hexId.map.game.board);
                    this._element.move(hexId.location);
                }
            }
            else {
                if (hexId) {
                    this._element.move(hexId.location);
                }
                else {
                    this._element.hide(this._hexLocation.map.game.board);
                }
            }
            this._hexLocation = hexId;
            this._updateMovementPoints(cost);
        }
    }

    rotate(angle, cost) {
        Memento.register(this);
        this._element.rotate(angle);
        this._updateMovementPoints(cost);
    }

    _updateTiredness(tiredness) {
        console.assert(tiredness===CBTiredness.NONE
            || tiredness===CBTiredness.TIRED
            || tiredness===CBTiredness.EXHAUSTED);
        this._tiredness = tiredness;
        this._tirednessArtifact && this._element.deleteArtifact(this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/tired.png", 2);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/exhausted.png", 2);
        }
    }

    get tiredness() {
        return this._tiredness;
    }

    isTired() {
        return this._tiredness === CBTiredness.TIRED;
    }

    isExhausted() {
        return this._tiredness === CBTiredness.EXHAUSTED;
    }

    addOneTirednessLevel() {
        Memento.register(this);
        this._updateTiredness(this._tiredness+1);
    }

    removeOneTirednessLevel() {
        Memento.register(this);
        this._updateTiredness(this._tiredness-1);
    }

    _updateCohesion(cohesion) {
        console.assert(cohesion===0 || cohesion===1 || cohesion===2);
        this._cohesion = cohesion;
        this._cohesionArtifact && this._element.deleteArtifact(this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = this.createMarkerArtifact("/CBlades/images/markers/disrupted.png", 3);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = this.createMarkerArtifact("/CBlades/images/markers/fleeing.png", 3);
        }
    }

    get cohesion() {
        return this._cohesion;
    }

    isDisrupted() {
        return this._cohesion === CBCohesion.DISRUPTED;
    }

    isRouted() {
        return this._cohesion === CBCohesion.ROUTED;
    }

    addOneCohesionLevel() {
        Memento.register(this);
        this._updateCohesion(this._cohesion+1);
    }

    disrupt() {
        console.assert(!this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.DISRUPTED);
    }

    reorganize() {
        console.assert(this.isDisrupted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.GOOD_ORDER);
    }

    rally() {
        console.assert(this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.DISRUPTED);
    }

    _updateEngagement(engaged, charging) {
        if(this._engaging !== engaged || this._charging !== charging) {
            this._engaging = engaged;
            this._charging = charging;
            this._engagingArtifact && this._element.deleteArtifact(this._engagingArtifact);
            delete this._engagingArtifact;
            if (this._charging) {
                this._engagingArtifact = this.createMarkerArtifact("/CBlades/images/markers/charge.png", 1);
            }
            else if (this._engaging) {
                this._engagingArtifact = this.createMarkerArtifact("/CBlades/images/markers/contact.png", 1);
            }
        }
    }

    isEngaging() {
        return this._engaging;
    }

    isCharging() {
        return this._charging;
    }

    markAsEngaging(engaging) {
        Memento.register(this);
        this._updateEngagement(engaging, this._charging);
    }

    markAsCharging(charging) {
        Memento.register(this);
        this._updateEngagement(this._engaging, charging);
    }

}
CBUnit.DIMENSION = new Dimension2D(142, 142);
CBUnit.MARKER_DIMENSION = new Dimension2D(64, 64);
CBUnit.MARKERS_POSITION = [
    new Point2D(CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, 0),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(0, CBUnit.DIMENSION.h/2),
    new Point2D(CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2)];
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}
