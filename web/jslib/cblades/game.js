'use strict'

import {
    atan2, Point2D, Dimension2D, Matrix2D, moyAngle
} from "../geometry.js";
import {
    DImage, DTranslateLayer
} from "../draw.js";
import {
    Mechanisms,
    Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DImageArtifact, DSimpleLevel, DLayeredLevel, DStaticLevel, DMultiImageArtifact, DStackedLevel
} from "../board.js";
import {
    DPushButton
} from "../widget.js";

export let CBMoveType = {
    FORWARD: 0,
    BACKWARD: 1
}
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

export let CBLackOfMunitions = {
    NONE: 0,
    SCARCE: 1,
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

export let CBOrderInstruction = {
    ATTACK: 0,
    DEFEND: 1,
    REGROUP: 2,
    RETREAT: 3
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
        this.game.closePopup();
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

    get units() {
        return this.game.getPlayerUnits(this);
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

    /*
    launchUnitAction(unit, event) {
       // launch action process here
    }
     */

    afterActivation(unit, action) {
        action();
    }

    changeOrderInstruction(unit, orderInstruction, event) {
        unit.wing.changeOrderInstruction(orderInstruction);
    }

    finishTurn(animation) {
        this.game.nextTurn(animation);
    }

    canFinishUnit(unit) {
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
        return this._status >= CBAction.FINISHED;
    }

    isFinalized() {
        return this._status === CBAction.FINALIZED;
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
            Mechanisms.fire(this, CBAction.PROGRESSION, CBAction.STARTED);
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
            Mechanisms.fire(this, CBAction.PROGRESSION, CBAction.FINISHED);
        }
    }

    finalize(action) {
        if (this._status < CBAction.FINALIZED) {
            Memento.register(this);
            this._status = CBAction.FINALIZED;
            action && action();
            if (this.unit.isCurrentPlayer()) {
                this.unit.updatePlayed();
            }
            Mechanisms.fire(this, CBAction.PROGRESSION, CBAction.FINALIZED);
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
CBAction.FINALIZED = 3;
CBAction.PROGRESSION = "progression";

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

        function createSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(slotIndex*15, -slotIndex*15));
            return [
                new DTranslateLayer("formations-"+slotIndex, delta),
                new DTranslateLayer("units-"+slotIndex, delta),
                new DTranslateLayer("markers-"+slotIndex, delta)
            ]
        }

        function getUnitArtifactSlot(artifact) {
            let counter = artifact.counter;
            if (counter instanceof CBUnit) {
                return counter.slot;
            }
            else return 0;
        }

        function getUnitArtifactLayer(artifact, [formationsLayer, unitsLayer, markersLayer]) {
            if (!(artifact instanceof UnitImageArtifact)) return markersLayer;
            let unit = artifact.counter;
            return unit instanceof CBFormation ? formationsLayer : unitsLayer;
        }

        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 800),
            new DSimpleLevel("map"),
            new DStackedLevel("units", getUnitArtifactSlot, getUnitArtifactLayer, createSlot),
            new DSimpleLevel("actuators"),
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
        this._players = [];
        this._actuators = [];
    }

    _memento() {
        return {
            selectedUnit: this._selectedUnit,
            focusedUnit: this._focusedUnit,
            actuators: [...this._actuators],
            popup: this._popup
        };
    }

    _revert(memento) {
        this._selectedUnit = memento.selectedUnit;
        this._focusedUnit = memento.focusedUnit;
        this._actuators = memento.actuators;
        if (memento.popup) {
            this._popup = memento.popup;
        }
        else {
            delete this._popup;
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

    addCounter(counter, location) {
        if (!this._counters) {
            this._counters = new Set();
        }
        this._counters.add(counter)
        counter.location = location;
        counter.game = this;
        counter.element.setOnBoard(this._board);
    }

    addUnit(unit, hexLocation) {
        if (!this._counters) {
            this._counters = new Set();
        }
        this._counters.add(unit);
        unit.hexLocation = hexLocation;
        unit.element.setOnBoard(this._board);
    }

    getPlayerUnits(player) {
        let units = [];
        if (this._counters) {
            for (let counter of this._counters) {
                if (counter instanceof CBUnit && counter.player === player) {
                    units.push(counter);
                }
            }
        }
        return units;
    }

    turnIsFinishable() {
        if (!this.canUnselectUnit()) return false;
        if (this._counters) {
            for (let counter of this._counters) {
                if (counter.isFinishable && !counter.isFinishable()) return false;
            }
        }
        return true;
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
        return !this.focusedUnit && (
            !this.selectedUnit ||
            !this.selectedUnit.hasBeenActivated() ||
            this.selectedUnit.action.isFinished() ||
            this.selectedUnit.action.isFinishable());
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

    _createEndOfTurnCommand() {
        this._endOfTurnCommand = new DPushButton(
            "/CBlades/images/commands/turn.png", "/CBlades/images/commands/turn-inactive.png",
            new Point2D(-60, -60), animation=>{
            this.currentPlayer.finishTurn(animation);
        }).setTurnAnimation(true);
        this._endOfTurnCommand._processGlobalEvent = (source, event)=>{
            if (source instanceof CBAction || source===this) {
                this._endOfTurnCommand.active = this.turnIsFinishable();
            }
        }
        Mechanisms.addListener(this._endOfTurnCommand);
    }

    setMenu() {
        this._createEndOfTurnCommand();
        this._endOfTurnCommand.setOnBoard(this._board);
        this._showCommand = new DPushButton(
            "/CBlades/images/commands/show.png", "/CBlades/images/commands/show-inactive.png",
            new Point2D(-120, -60), animation=>{
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
        this._hideCommand = new DPushButton(
            "/CBlades/images/commands/hide.png", "/CBlades/images/commands/hide-inactive.png",
            new Point2D(-120, -60), animation=>{
            this._showCommand.setOnBoard(this._board);
            this._hideCommand.removeFromBoard();
            this._undoCommand.removeFromBoard();
            this._redoCommand.removeFromBoard();
            this._settingsCommand.removeFromBoard();
            this._saveCommand.removeFromBoard();
            this._loadCommand.removeFromBoard();
            animation();
        });
        this._undoCommand = new DPushButton(
            "/CBlades/images/commands/undo.png", "/CBlades/images/commands/undo-inactive.png",
            new Point2D(-180, -60), animation=>{
            Memento.undo();
            animation();
        }).setTurnAnimation(false);
        this._redoCommand = new DPushButton(
            "/CBlades/images/commands/redo.png", "/CBlades/images/commands/redo-inactive.png",
            new Point2D(-240, -60), animation=>{
            Memento.redo();
            animation();
        }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton(
            "/CBlades/images/commands/settings.png","/CBlades/images/commands/settings-inactive.png",
            new Point2D(-300, -60), animation=>{});
        this._saveCommand = new DPushButton(
            "/CBlades/images/commands/save.png", "/CBlades/images/commands/save-inactive.png",
            new Point2D(-360, -60), animation=>{});
        this._loadCommand = new DPushButton(
            "/CBlades/images/commands/load.png", "/CBlades/images/commands/load-inactive.png",
            new Point2D(-420, -60), animation=>{});
        this._settingsCommand.active = false;
        this._saveCommand.active = false;
        this._loadCommand.active = false;
    }

    _resetCounters(player) {
        this.closePopup();
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
            Mechanisms.fire(this, CBGame.PROGRESSION);
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
}
CBGame.POPUP_MARGIN = 10;
CBGame.PROGRESSION = "started";
CBGame.PROGRESSION = "progression";

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

    static equals(hexSide1, hexSide2) {
        if (!hexSide1 && hexSide2 || hexSide1 && !hexSide2) return false;
        if (!hexSide1) return true;
        return hexSide1.fromHex === hexSide2.fromHex && hexSide1.toHex === hexSide2.toHex;
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

    get map() {
        return this._hexId1.map;
    }

    getFaceHex(angle) {
        return this.map.findFaceHex(this, angle);
    }

    getOtherHex(hexId) {
        console.assert(hexId===this._hexId1 || hexId === this._hexId2);
        return hexId===this._hexId1 ? this._hexId2 :this._hexId1;
    }

    similar(hexSideId) {
        return this.location.equalsTo(hexSideId.location);
    }

    isNearHex(hexId) {
        let angle1 = this.map.isNearHex(this.fromHex, hexId);
        let angle2 = this.map.isNearHex(this.toHex, hexId);
        if (angle1===false && angle2===false) return false;
        if (angle1===false) return angle2;
        if (angle2===false) return angle1;
        return moyAngle(angle1, angle2);
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
        console.assert(unit instanceof CBUnit);
        this._units.push(unit);
    }

    removeUnit(unit) {
        console.assert(unit instanceof CBUnit);
        this._units.splice(this._units.indexOf(unit), 1);
    }

    appendUnit(unit, moveType) {
        Memento.register(this);
        if (moveType === CBMoveType.BACKWARD) {
            this._units.push(unit);
        }
        else {
            this._units.unshift(unit);
        }
        this._units.sort((unit1, unit2)=>{
            if (unit1 instanceof CBCharacter) {
                return unit2 instanceof CBCharacter ? 0 : 1;
            }
            else {
                return unit2 instanceof CBCharacter ? -1 : 0;
            }
        });
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

    _isNear(c1, r1, c2, r2) {
        if (c1 === c2) {
            if (r1 === r2+1) {
                return 0;
            }
            if (r1 === r2-1) {
                return 180;
            }
            return false;
        }
        if (c1%2) {
            if (c1 === c2-1) {
                if (r1 === r2+1) {
                    return 60;
                }
                if (r1 === r2) {
                    return 120;
                }
                return false;
            }
            else if (c1 === c2 + 1) {
                if (r1 === r2) {
                    return 240;
                }
                if (r1 === r2+1) {
                    return 300;
                }
                return false;
            }
            return false
        }
        else {
            if (c1 === c2-1) {
                if (r1 === r2) {
                    return 60;
                }
                if (r1 === r2-1) {
                    return 120;
                }
                return false;
            }
            else if (c1 === c2 + 1) {
                if (r1 === r2-1) {
                    return 240;
                }
                if (r1 === r2) {
                    return 300;
                }
                return false;
            }
            return false
        }

    }

    isNearHex(hexId1, hexId2) {
        return this._isNear(hexId1.col, hexId1.row, hexId2.col, hexId2.row);
    }

    _findNearCol(c, r, angle) {
        if (angle === 0 || angle === 180) {
            return c;
        }
        else if (angle === 60 || angle === 120) {
            return c+1;
        }
        else {
            return c-1;
        }
    }

    _findNearRow(c, r, angle) {
        if (angle === 0) {
            return r-1;
        }
        else if (angle === 60 || angle === 300) {
            return c%2 ? r-1 : r;
        }
        else if (angle === 120 || angle === 240) {
            return c%2 ? r : r+1;
        }
        else if (angle === 180) {
            return r+1;
        }
    }

    findNearHex(hexId, angle) {
        return this._hex(
            this._findNearCol(hexId.col, hexId.row, angle),
            this._findNearRow(hexId.col, hexId.row, angle)
        ).id;
    }

    _findFaceCol(c1, r1, c2, r2, angle) {
        if (angle === 30 || angle === 150) {
            return c1>c2 ? c1 : c2;
        }
        else if (angle === 90) {
            return c1+1;
        }
        else if (angle === 210 || angle === 330) {
            return c1<c2 ? c1 : c2;
        }
        else if (angle === 270) {
            return c1-1;
        }
    }

    _findFaceRow(c1, r1, c2, r2, angle) {
        if (angle === 30 || angle === 330) {
            return r1===r2 ? r1-1 : r1<r2 ? r1 : r2;
        }
        else if (angle === 90 || angle === 270) {
            return c1%2 ? (r1<r2 ? r1 : r2) : (r1>r2 ? r1 : r2);
        }
        else if (angle === 150 || angle === 210) {
            return r1===r2 ? r1+1 : r1>r2 ? r1 : r2;
        }
        else if (angle === 270) {
            return c1-1;
        }
    }

    findFaceHex(hexSideId, angle) {
        return this._hex(
            this._findFaceCol(hexSideId.fromHex.col, hexSideId.fromHex.row, hexSideId.toHex.col, hexSideId.toHex.row, angle),
            this._findFaceRow(hexSideId.fromHex.col, hexSideId.fromHex.row, hexSideId.toHex.col, hexSideId.toHex.row, angle)
        ).id;
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

class CounterImageArtifact extends DMultiImageArtifact {

    constructor(counter, ...args) {
        super(...args); // levelName, image, position, dimension, pangle=0
        this.setSettings(this.settings);
        this._counter = counter;
    }

    onMouseClick(event) {
        this._counter.onMouseClick && this._counter.onMouseClick(event);
    }

    get counter() {
        return this._counter;
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

    createArtifact(paths, dimension) {
        this._images = [];
        for (let path of paths) {
            this._images.push(DImage.getImage(path));
        }
        return new CounterImageArtifact(this, "units", this._images, new Point2D(0, 0), dimension);
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

    constructor(type, wing, dimension=CBUnit.DIMENSION) {
        super(type.paths, dimension);
        this._type = type;
        this._wing = wing;
        this._movementPoints=2;
        this._extendedMovementPoints=this._movementPoints*1.5;
        this._tiredness=0;
        this._lackOfMunitions=0;
        this._cohesion=0;
        this._engaging=false;
        this._charging=false;
        this._lossSteps = 0;
        this._orderGiven = false;
        this.artifact.setImage(this._lossSteps);
    }

    copy(unit) {
        unit._movementPoints = this._movementPoints;
        unit._extendedMovementPoints = this._extendedMovementPoints;
        unit.lossSteps = this.lossSteps;
        unit.cohesion = this.cohesion;
        unit.lackOfMunitions = this.lackOfMunitions;
        unit.tiredness = this.tiredness;
    }

    createArtifact(paths, dimension) {
        this._images = [];
        for (let path of paths) {
            this._images.push(DImage.getImage(path));
        }
        return new UnitImageArtifact(this,"units", this._images, new Point2D(0, 0), dimension);
    }

    setMarkerArtifact(path, slot) {
        let marker = new CounterImageArtifact(this,"units", [DImage.getImage(path)],
            CBUnit.MARKERS_POSITION[slot], CBUnit.MARKER_DIMENSION);
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, slot) {
        let marker = new CounterImageArtifact(this,"units", [DImage.getImage(path)],
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
            lackOfMunitions: this._lackOfMunitions,
            lackOfMunitionsArtifact: this._lackOfMunitionsArtifact,
            cohesion: this._cohesion,
            cohesionArtifact: this._cohesionArtifact,
            playedArtifact: this._playedArtifact,
            engaging: this._engaging,
            charging: this._charging,
            engagingArtifact: this._engagingArtifact,
            action: this._action,
            orderGiven: this._orderGiven,
            lossSteps: this._lossSteps
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
        this._movementPoints = memento.movementPoints;
        this._extendedMovementPoints = memento.extendedMovementPoints;
        this._tiredness = memento.tiredness;
        this._tirednessArtifact = memento.tirednessArtifact;
        this._lackOfMunitions = memento.lackOfMunitions;
        this._lackOfMunitionsArtifact = memento.lackOfMunitionsArtifact;
        this._cohesion = memento.cohesion;
        this._cohesionArtifact = memento.cohesionArtifact;
        this._playedArtifact = memento.playedArtifact;
        this._engaging = memento.engaging;
        this._charging = memento.charging;
        this._engagingArtifact = memento.engagingArtifact;
        this._action = memento.action;
        this._orderGiven = memento.orderGiven;
        this._lossSteps = memento.lossSteps;
    }

    get slot() {
        return this.hexLocation.units.indexOf(this);
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
        if (player === this.player) {
            this._movementPoints = 2;
            this._extendedMovementPoints = this._movementPoints*1.5;
            this._orderGiven = false;
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

    isFinishable() {
        if (!this.isCurrentPlayer()) return true;
        return this.player.canFinishUnit(this);
    }

    get type() {
        return this._type;
    }

    get game() {
        return this.player.game;
    }

    get wing() {
        return this._wing;
    }

    get player() {
        return this._wing.player;
    }

    get hexLocation() {
        return this._hexLocation;
    }

    set hexLocation(hexId) {
        if (this._hexLocation) {
            hexId.hex.removeUnit(this);
        }
        this._hexLocation = hexId;
        if (this._hexLocation) {
            hexId.hex.addUnit(this);
            this.location = hexId.location;
        }
    }

    get movementPoints() {
        return this._movementPoints;
    }

    set movementPoints(movementPoints) {
        this._movementPoints = movementPoints;
    }

    markAsBeingPlayed() {
        if (!this.action) {
            this.launchAction(new CBAction(this.game, this));
        }
        this.action.markAsFinished();
    }

    isOnBoard() {
        return !!this._hexLocation;
    }

    receiveOrder(order) {
        Memento.register(this);
        this._orderGiven = order;
        this._updatePlayed();
    }

    hasReceivedOrder() {
        return this._orderGiven;
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
        this._playedArtifact && this._element.deleteArtifact(this._playedArtifact);
        delete this._playedArtifact;
        if (this.hasBeenPlayed()) {
            this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/actiondone.png", 0);
        }
        else if (this._orderGiven) {
            this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/ordergiven.png", 0);
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

    addToMap(hexId, moveType) {
        hexId.hex.appendUnit(this, moveType);
        this._element.show(hexId.map.game.board);
        this._element.move(hexId.location);
    }

    removeFromMap() {
        this._hexLocation.hex.deleteUnit(this);
        this._element.hide(this._hexLocation.map.game.board);
        delete this._hexLocation;
    }

    get maxStepCount() {
        return this._type.maxStepCount;
    }

    get lossSteps() {
        return this._lossSteps;
    }

    get remainingStepCount() {
        return this.maxStepCount - this.lossSteps;
    }

    set lossSteps(lossSteps) {
        this._lossSteps = lossSteps;
        this.artifact.setImage(this._lossSteps);
    }

    takeALoss() {
        Memento.register(this);
        this._lossSteps++;
        if (this._lossSteps >= this.maxStepCount) {
            this.removeFromMap();
        }
        else {
            this.artifact.changeImage(this._lossSteps);
        }
    }

    fixRemainingLossSteps(stepCount) {
        console.assert(stepCount<=this.maxStepCount);
        Memento.register(this);
        this._lossSteps=this.maxStepCount-stepCount;
        this.artifact.changeImage(this._lossSteps);
    }

    move(hexId, cost=0, moveType = CBMoveType.BACKWARD) {
        if (hexId !== this.hexLocation) {
            Memento.register(this);
            if (this._hexLocation) {
                this._hexLocation.hex.deleteUnit(this);
                if (!hexId) this._element.hide();
            }
            if (hexId && !this._hexLocation) this._element.show(this.game.board);
            this._hexLocation = hexId;
            if (this._hexLocation) {
                hexId.hex.appendUnit(this, moveType);
                this._element.move(hexId.location);
            }
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

    set tiredness(tiredness) {
        this._tiredness = tiredness;
        this._tirednessArtifact && this._element.removeArtifact(this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = this.setMarkerArtifact("/CBlades/images/markers/tired.png", 2);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = this.setMarkerArtifact("/CBlades/images/markers/exhausted.png", 2);
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

    fixTirednessLevel(tirednessLevel) {
        Memento.register(this);
        this._updateTiredness(tirednessLevel);
    }

    _updateLackOfMunitions(lackOfMunitions) {
        console.assert(lackOfMunitions===CBLackOfMunitions.NONE
            || lackOfMunitions===CBLackOfMunitions.SCARCE
            || lackOfMunitions===CBLackOfMunitions.EXHAUSTED);
        this._lackOfMunitions = lackOfMunitions;
        this._lackOfMunitionsArtifact && this._element.deleteArtifact(this._lackOfMunitionsArtifact);
        delete this._lackOfMunitionsArtifact;
        if (this._lackOfMunitions === CBLackOfMunitions.SCARCE) {
            this._lackOfMunitionsArtifact = this.createMarkerArtifact("/CBlades/images/markers/scarceamno.png", 4);
        }
        else if (this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED) {
            this._lackOfMunitionsArtifact = this.createMarkerArtifact("/CBlades/images/markers/lowamno.png", 4);
        }
    }

    set lackOfMunitions(lackOfMunitions) {
        this._lackOfMunitions = lackOfMunitions;
        this._lackOfMunitionsArtifact && this._element.removeArtifact(this._lackOfMunitionsArtifact);
        delete this._lackOfMunitionsArtifact;
        if (this._lackOfMunitions === CBLackOfMunitions.SCARCE) {
            this._lackOfMunitionsArtifact = this.setMarkerArtifact("/CBlades/images/markers/scarceamno.png", 4);
        }
        else if (this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED) {
            this._lackOfMunitionsArtifact = this.setMarkerArtifact("/CBlades/images/markers/lowamno.png", 4);
        }
    }

    get lackOfMunitions() {
        return this._lackOfMunitions;
    }

    areMunitionsScarce() {
        return this._lackOfMunitions === CBLackOfMunitions.SCARCE;
    }

    areMunitionsExhausted() {
        return this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED;
    }

    addOneLackOfMunitionsLevel() {
        Memento.register(this);
        this._updateLackOfMunitions(this._lackOfMunitions+1);
    }

    replenishMunitions() {
        Memento.register(this);
        this._updateLackOfMunitions(0);
    }

    fixLackOfMunitionsLevel(lackOfMunitionsLevel) {
        Memento.register(this);
        this._updateLackOfMunitions(lackOfMunitionsLevel);
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

    set cohesion(cohesion) {
        this._cohesion = cohesion;
        this._cohesionArtifact && this._element.removeArtifact(this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = this.setMarkerArtifact("/CBlades/images/markers/disrupted.png", 3);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = this.setMarkerArtifact("/CBlades/images/markers/fleeing.png", 3);
        }
    }

    get cohesion() {
        return this._cohesion;
    }

    inGoodOrder() {
        return this._cohesion === CBCohesion.GOOD_ORDER;
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
CBUnit.MARKER_DIMENSION = new Dimension2D(64, 64);
CBUnit.DIMENSION = new Dimension2D(142, 142);
CBUnit.MARKERS_POSITION = [
    new Point2D(CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, 0),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(0, CBUnit.DIMENSION.h/2),
    new Point2D(CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(CBUnit.DIMENSION.w/2, 0)];
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}

export class CBUnitType {

    constructor(name, pathes) {
        this._name = name;
        this._pathes = pathes;
        this._maxStepCount = 2;
    }

    get name() {
        return this._name;
    }

    get paths() {
        return this._pathes;
    }

    get maxStepCount() {
        return this._maxStepCount;
    }

}

export class CBWing {

    constructor(player) {
        this._player = player;
        this._orderInstruction = CBOrderInstruction.DEFEND;
    }

    _memento() {
        let memento = {
            orderInstruction : this._orderInstruction
        }
        this._leader && (memento.leader = this._leader);
        return memento;
    }

    _revert(memento) {
        this._orderInstruction = memento.orderInstruction;
        if (memento.leader) {
            this._leader = memento.leader
        }
        else {
            delete this._leader;
        }
    }

    get player() {
        return this._player;
    }

    get leader() {
        return this._leader;
    }

    setLeader(character) {
        this._leader = character;
        this._leader.setOrderInstructionArtifact();
    }

    appointLeader(character) {
        Memento.register(this);
        this.setLeader(character);
    }

    dismissLeader() {
        Memento.register(this);
        let leader = this._leader;
        delete this._leader;
        leader && leader.updateOrderInstructionArtifact();
    }

    get orderInstruction() {
        return this._orderInstruction;
    }

    setOrderInstruction(orderInstruction) {
        console.assert(orderInstruction>=CBOrderInstruction.ATTACK && orderInstruction<=CBOrderInstruction.RETREAT);
        this._orderInstruction = orderInstruction;
        this._leader && this._leader.setOrderInstructionArtifact();
    }

    changeOrderInstruction(orderInstruction) {
        Memento.register(this);
        console.assert(orderInstruction>=CBOrderInstruction.ATTACK && orderInstruction<=CBOrderInstruction.RETREAT);
        this._orderInstruction = orderInstruction;
        this._leader && this._leader.updateOrderInstructionArtifact();
    }

}

export class CBTroop extends CBUnit {

    constructor(type, wing) {
        super(type, wing);
    }

    clone() {
        let copy = new CBTroop(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

}

export class CBFormation extends CBUnit {

    constructor(type, wing) {
        super(type, wing, CBFormation.DIMENSION);
    }

    clone() {
        let copy = new CBFormation(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    get slot() {
        let slot1 = this.hexLocation.fromHex.units.indexOf(this);
        let slot2 = this.hexLocation.toHex.units.indexOf(this);
        return slot1>slot2 ? slot1 : slot2;
    }

    get hexLocation() {
        return this._hexLocation;
    }

    move(hexSideId, cost=0, moveType = CBMoveType.BACKWARD) {
        console.assert(hexSideId === null || hexSideId instanceof CBHexSideId);
        if (!CBHexSideId.equals(hexSideId, this._hexLocation)) {
            Memento.register(this);
            if (this._hexLocation) {
                this._hexLocation.fromHex.hex.deleteUnit(this);
                this._hexLocation.toHex.hex.deleteUnit(this);
                if (!hexSideId) this._element.hide();
            }
            if (hexSideId && !this._hexLocation) this._element.show(this.game.board);
            this._hexLocation = hexSideId;
            if (this._hexLocation) {
                hexSideId.fromHex.hex.appendUnit(this, moveType);
                hexSideId.toHex.hex.appendUnit(this, moveType);
                this._element.move(hexSideId.location);
            }
            this._updateMovementPoints(cost);
        }
    }

    set hexLocation(hexSideId) {
        console.assert(hexSideId === null || hexSideId instanceof CBHexSideId);
        if (this._hexLocation) {
            this._hexLocation.fromHex.hex.removeUnit(this);
            this._hexLocation.toHex.hex.removeUnit(this);
        }
        this._hexLocation = hexSideId;
        if (this._hexLocation) {
            hexSideId.fromHex.hex.addUnit(this);
            hexSideId.toHex.hex.addUnit(this);
            this.location = hexSideId.location;
        }
    }

    createMarkerArtifact(path, slot) {
        let marker = new CounterImageArtifact(this,"units", [DImage.getImage(path)],
            CBFormation.MARKERS_POSITION[slot], CBFormation.MARKER_DIMENSION);
        this._element.appendArtifact(marker);
        return marker;
    }

}
CBFormation.DIMENSION = new Dimension2D(CBUnit.DIMENSION.w*2, CBUnit.DIMENSION.h);
CBFormation.MARKERS_POSITION = [
    new Point2D(CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
    new Point2D(-CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
    new Point2D(-CBFormation.DIMENSION.w/2, 0),
    new Point2D(-CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
    new Point2D(0, CBFormation.DIMENSION.h/2),
    new Point2D(CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
    new Point2D(CBFormation.DIMENSION.w/2, 0)];

export class CBCharacter extends CBUnit {

    constructor(type, wing) {
        super(type, wing, CBCharacter.DIMENSION);
        this._commandPoints = 0;
    }

    clone() {
        let copy = new CBCharacter(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    _memento() {
        let memento = super._memento();
        memento.commandPoints = this._commandPoints;
        memento.orderInstructionArtifact = this._orderInstructionArtifact;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._commandPoints =  memento.commandPoints;
        this._orderInstructionArtifact = memento.orderInstructionArtifact;
    }

    get commandPoints() {
        return this._commandPoints;
    }

    receiveCommandPoints(commandPoints) {
        Memento.register(this);
        this._commandPoints = commandPoints;
    }

    createOrderInstructionArtifact(orderInstruction) {
        let marker = new CounterImageArtifact(this,"units",
            [DImage.getImage(CBCharacter.ORDER_INSTRUCTION_PATHS[orderInstruction])],
            CBUnit.MARKERS_POSITION[6], CBCharacter.ORDER_INSTRUCTION_DIMENSION);
        return marker;
    }

    setOrderInstructionArtifact() {
        if (this._wing.leader === this) {
            this._orderInstructionArtifact = this.createOrderInstructionArtifact(this._wing.orderInstruction);
            this._element.addArtifact(this._orderInstructionArtifact);
        }
    }

    updateOrderInstructionArtifact() {
        Memento.register(this);
        this._orderInstructionArtifact && this._element.deleteArtifact(this._orderInstructionArtifact);
        delete this._orderInstructionArtifact;
        if (this._wing.leader === this) {
            this._orderInstructionArtifact = this.createOrderInstructionArtifact(this._wing.orderInstruction);
            this._element.appendArtifact(this._orderInstructionArtifact);
        }
    }

    takeCommand() {
        this.wing.appointLeader(this);
    }

    dismissCommand() {
        this.wing.dismissLeader();
    }

    _reset(player) {
        super._reset(player);
        if (player === this.player) {
            this._commandPoints = 0;
        }
    }
}
CBCharacter.DIMENSION = new Dimension2D(120, 120);
CBCharacter.ORDER_INSTRUCTION_DIMENSION = new Dimension2D(80, 80);
CBCharacter.ORDER_INSTRUCTION_PATHS = [
    "/CBlades/images/markers/attack.png",
    "/CBlades/images/markers/defend.png",
    "/CBlades/images/markers/regroup.png",
    "/CBlades/images/markers/retreat.png"
];