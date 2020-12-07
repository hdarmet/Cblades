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
    DDice,
    DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DPopup, DPushButton, DResult, DScene
} from "../widget.js";

export let CBMovement = {
    NORMAL : "normal",
    EXTENDED : "extended",
    MINIMAL : "minimal"
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

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
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
            actuators: [...this._actuators]
        };
    }

    _revert(memento) {
        this._selectedUnit = memento.selectedUnit;
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
        counter.game = this;
        counter.hexLocation = hexLocation;
        counter.element.setOnBoard(this._board);
    }

    openActuator(actuator) {
        Memento.register(this);
        actuator.game = this;
        actuator.element.show(this._board);
        this._actuators.push(actuator);
    }

    removeActuators() {
        for (let actuator of this._actuators) {
            actuator.element.removeFromBoard(this._board);
        }
        this._actuators = [];
    }

    closeActuators() {
        Memento.register(this);
        for (let actuator of this._actuators) {
            actuator.element.hide(this._board);
        }
        this._actuators = [];
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

    get selectedUnit() {
        return this._selectedUnit;
    }

    setMenu() {
        this._endOfTurnCommand = new DPushButton("/CBlades/images/commands/turn.png", new Point2D(-60, -60), ()=>{
            this.nextTurn();
        }).setTurnAnimation(true);
        this._endOfTurnCommand.setOnBoard(this._board);
        this._showCommand = new DPushButton("/CBlades/images/commands/show.png", new Point2D(-120, -60), ()=>{
            this._showCommand.removeFromBoard();
            this._hideCommand.setOnBoard(this._board);
            this._undoCommand.setOnBoard(this._board);
            this._redoCommand.setOnBoard(this._board);
            this._settingsCommand.setOnBoard(this._board);
            this._saveCommand.setOnBoard(this._board);
            this._loadCommand.setOnBoard(this._board);
        });
        this._showCommand.setOnBoard(this._board);
        this._hideCommand = new DPushButton("/CBlades/images/commands/hide.png", new Point2D(-120, -60), ()=>{
            this._showCommand.setOnBoard(this._board);
            this._hideCommand.removeFromBoard();
            this._undoCommand.removeFromBoard();
            this._redoCommand.removeFromBoard();
            this._settingsCommand.removeFromBoard();
            this._saveCommand.removeFromBoard();
            this._loadCommand.removeFromBoard();
        });
        this._undoCommand = new DPushButton("/CBlades/images/commands/undo.png", new Point2D(-180, -60), ()=>{
            Memento.undo();
        }).setTurnAnimation(false);
        this._redoCommand = new DPushButton("/CBlades/images/commands/redo.png", new Point2D(-240, -60), ()=>{
            Memento.redo();
        }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton("/CBlades/images/commands/settings.png", new Point2D(-300, -60), ()=>{});
        this._saveCommand = new DPushButton("/CBlades/images/commands/save.png", new Point2D(-360, -60), ()=>{});
        this._loadCommand = new DPushButton("/CBlades/images/commands/load.png", new Point2D(-420, -60), ()=>{});
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

    nextTurn() {
        this.removeActuators();
        this._resetCounters(this._currentPlayer);
        let indexPlayer = this._players.indexOf(this._currentPlayer);
        this._currentPlayer = this._players[(indexPlayer+1)%this._players.length];
        Memento.clear();
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

    similar(hexId) {
        return this.location.equalsTo(hexId.location);
    }

    getNearHex(angle) {
        return this._map.findNearHex(this, angle);
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
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        return atan2(loc2.x-loc1.x, loc2.y-loc1.y);
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
    }

    findPosition(hexId) {
        let x = CBMap.WIDTH/CBMap.COL_COUNT * hexId.col-CBMap.WIDTH/2;
        let y = CBMap.HEIGHT/CBMap.ROW_COUNT * hexId.row-CBMap.HEIGHT/2;
        if (hexId.col%2) y-= CBMap.HEIGHT/CBMap.ROW_COUNT/2;
        return new Point2D(x, y);
    }

    findNearHex(hexId, angle) {
        if (angle === 0) {
            return new CBHexId(this, hexId.col, hexId.row-1);
        }
        else if (angle === 60) {
            return hexId.col%2 ?
                new CBHexId(this, hexId.col+1, hexId.row-1) :
                new CBHexId(this, hexId.col+1, hexId.row);
        }
        else if (angle === 120) {
            return hexId.col%2 ?
                new CBHexId(this, hexId.col+1, hexId.row) :
                new CBHexId(this, hexId.col+1, hexId.row+1);
        }
        else if (angle === 180) {
            return new CBHexId(this, hexId.col, hexId.row+1);
        }
        else if (angle === 240) {
            return hexId.col%2 ?
                new CBHexId(this, hexId.col-1, hexId.row) :
                new CBHexId(this, hexId.col-1, hexId.row+1);
        }
        else if (angle === 300) {
            return hexId.col%2 ?
                new CBHexId(this, hexId.col-1, hexId.row-1) :
                new CBHexId(this, hexId.col-1, hexId.row);
        }
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
        super(...args);
        this.setSettings(this.settings);
        this._counter = counter;
    }

    onMouseClick(event) {
        this._counter.onMouseClick(event);
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

    _memento() {
        return {
            ...super._memento(),
            selected: this._selected
        }
    }

    _revert(memento) {
        super._revert(memento);
        this._selected = memento.selected;
    }

    get unit() {
        return this._counter;
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
        delete this._selected;
        this.changeSettings(this.settings);
    }

    select() {
        Memento.register(this);
        this._selected = true;
        this.changeSettings(this.selectedSettings);
    }

    onMouseEnter(event) {
        if (!this._selected && this.unit.isCurrentPlayer() && !this.unit.hasBeenPlayed()) {
            this.setSettings(this.overSettings);
        }
    }

    onMouseLeave(event) {
        if (!this._selected && this.unit.isCurrentPlayer() && !this.unit.hasBeenPlayed()) {
            this.setSettings(this.settings);
        }
    }

}

export class CBUnit extends CBCounter {

    constructor(player, path) {
        super(path, CBUnit.DIMENSION);
        this._player = player;
        this._movementPoints = 2;
        this._extendedMovementPoints = this._movementPoints*1.5;
        this._tiredness=0;
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
            activated: this._activated,
            played: this._played,
            playedArtifact: this._playedArtifact
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
        this._movementPoints = memento.movementPoints;
        this._extendedMovementPoints = memento.extendedMovementPoints;
        this._tiredness = memento.tiredness;
        this._tirednessArtifact = memento.tirednessArtifact;
        this._activated = memento.activated;
        this._played = memento.played;
        this._playedArtifact = memento.playedArtifact;
    }

    _reset(player) {
        if (player === this._player) {
            this._movementPoints = 2;
            this._extendedMovementPoints = this._movementPoints*1.5;
            this._updatePlayed(false, false);
        }
    }

    markAsBeingActivated() {
        this._updatePlayed(true, false);
    }

    markAsBeingPlayed() {
        this._updatePlayed(true, true);
    }

    unselect() {
        console.assert(this.game.selectedUnit===this);
        this.game.setSelectedUnit(null);
        this._imageArtifact.unselect();
        this.element.refresh();
        if (this._activated) {
            this.markAsBeingPlayed();
        }
    }

    select() {
        if (this.game.selectedUnit) {
            this.game.selectedUnit.unselect();
        }
        this.game.setSelectedUnit(this);
        this._imageArtifact.select();
        this.refresh();
    }

    onMouseClick(event) {
        if (this.isCurrentPlayer() && !this.hasBeenActivated()) {
            this.select();
            this.player.selectUnit(this, event);
        }
    }

    isCurrentPlayer() {
        return this.player === this.game.currentPlayer;
    }

    hasBeenPlayed() {
        return this._played;
    }

    hasBeenActivated() {
        return this._activated;
    }

    get player() {
        return this._player;
    }

    get hexLocation() {
        return this._hexLocation;
    }

    set hexLocation(hexId) {
        this._hexLocation = hexId;
        this.location = hexId.location;
    }

    get movementPoints() {
        return this._movementPoints;
    }

    set movementPoints(movementPoints) {
        this._movementPoints = movementPoints;
    }

    get extendedMovementPoints() {
        return this._extendedMovementPoints;
    }

    set extendedMovementPoints(extendedMovementPoints) {
        this._extendedMovementPoints = extendedMovementPoints;
    }

    get tiredness() {
        return this._tiredness;
    }

    _updatePlayed(activated, played) {
        this._activated = activated;
        if (!this._played!==!played) {
            this._played = played;
            this._playedArtifact && this._element.deleteArtifact(this._playedArtifact);
            delete this._playedArtifact;
            if (this._played) {
                this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/actiondone.png", 0);
            }
        }
    }

    _updateTiredness(tiredness) {
        console.assert(tiredness===0 || tiredness===1 || tiredness===2);
        this._tiredness = tiredness;
        this._tirednessArtifact && this._element.deleteArtifact(this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === 1) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/tired.png", 2);
        }
        else if (this._tiredness === 2) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/exhausted.png", 2);
        }
    }

    _updateMovementPoints(cost) {
        this._movementPoints -= cost;
        this._extendedMovementPoints -= cost;
    }

    firstMove(hexId, cost) {
        Memento.register(this);
        this._hexLocation = hexId;
        this._element.move(hexId.location);
        this._updateMovementPoints(cost);
    }

    firstRotation(angle, cost) {
        Memento.register(this);
        this._element.rotate(angle);
        this._updateMovementPoints(cost);
    }

    subsequentMove(hexId, cost) {
        Memento.register(this);
        this._hexLocation = hexId;
        this._element.move(hexId.location);
        this._updateMovementPoints(cost);
    }

    subsequentRotation(angle, cost) {
        Memento.register(this);
        this._element.rotate(angle);
        this._updateMovementPoints(cost);
    }

    addOneTirednessLevel() {
        this._updateTiredness(this._tiredness+1);
    }

    removeOneTirednessLevel() {
        this._updateTiredness(this._tiredness-1);
    }
}
CBUnit.DIMENSION = new Dimension2D(142, 142);
CBUnit.MARKER_DIMENSION = new Dimension2D(64, 64);
CBUnit.MARKERS_POSITION = [
    new Point2D(CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2-CBUnit.MARKER_DIMENSION.h*2),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2-CBUnit.MARKER_DIMENSION.h),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2+CBUnit.MARKER_DIMENSION.w, CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2+CBUnit.MARKER_DIMENSION.w*2, CBUnit.DIMENSION.h/2)
];
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}
