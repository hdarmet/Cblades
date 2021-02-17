'use strict'

import {
    atan2, Point2D, Dimension2D, Matrix2D, moyAngle, sumAngle
} from "../geometry.js";
import {
    DImage, DTranslateLayer
} from "../draw.js";
import {
    Mechanisms, Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DImageArtifact, DSimpleLevel, DStaticLevel, DMultiImageArtifact, DStackedLevel
} from "../board.js";
import {
    DPushButton
} from "../widget.js";

export let CBMoveType = {
    FORWARD: 0,
    BACKWARD: 1
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
        if (!unit.hasBeenActivated()) {
            this.game.closeWidgets();
            if (this.game.selectedUnit !== unit) {
                this.beforeActivation(unit, () => {
                    unit.select();
                    this.launchUnitAction(unit, event);
                });
            } else {
                this.launchUnitAction(unit, event);
            }
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

    cancel(action) {
        console.assert(this._status === CBAction.INITIATED);
        Memento.register(this);
        this._status = CBAction.CANCELLED;
        this._game.closeWidgets();
        this.unit.removeAction();
        action && action();
        Mechanisms.fire(this, CBAction.PROGRESSION, CBAction.CANCELLED);
    }

    finalize(action) {
        console.assert(this._status >= CBAction.STARTED);
        if (this._status < CBAction.FINALIZED) {
            Memento.register(this);
            this._status = CBAction.FINALIZED;
            this._game.closeWidgets();
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
CBAction.CANCELLED = -1;
CBAction.PROGRESSION = "progression";

export class CBActuatorImageArtifact extends DImageArtifact {

    constructor(actuator, ...args) {
        super(...args);
        this._actuator = actuator;
        this.setSettings(this.settings);
    }

    get settings() {
        return level=>{
            level.setShadowSettings("#00FFFF", 10);
        }
    }

    get overSettings() {
        return level=>{
            level.setShadowSettings("#FF0000", 10);
        }
    }

    onMouseClick(event) {
        this._actuator.onMouseClick(this, event);
    }

    onMouseEnter(event) {
        this.setSettings(this.overSettings);
        this.element.refresh();
    }

    onMouseLeave(event) {
        this.setSettings(this.settings);
        this.element.refresh();
    }

}

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

    initElement(imageArtifacts, position = this.unit.location) {
        this._imageArtifacts = imageArtifacts;
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(position);
    }

    findTrigger(predicate) {
        for (let artifact of this._element.artifacts) {
            if (predicate(artifact)) return artifact;
        }
        return null;
    }

    get element() {
        return this._element;
    }
}

export class CBGame {

    constructor() {

        function createSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(slotIndex*20, -slotIndex*20));
            let formationDelta = Matrix2D.translate(new Point2D(slotIndex*20-10, -slotIndex*20+10));
            return [
                new DTranslateLayer("spells-"+slotIndex, delta),
                new DTranslateLayer("formations-"+slotIndex, slotIndex?formationDelta:delta),
                new DTranslateLayer("units-"+slotIndex, delta),
                new DTranslateLayer("options-"+slotIndex, delta),
                new DTranslateLayer("markers-"+slotIndex, delta)
            ]
        }

        function getUnitArtifactSlot(artifact) {
            let counter = artifact.counter;
            if (counter.isUnit) {
                return counter.slot;
            }
            else if (counter.isSpell) {
                return counter.unit.slot;
            }
            else return 0;
        }

        function getUnitArtifactLayer(artifact, [spellsLayer, formationsLayer, unitsLayer, optionsLayer, markersLayer]) {
            if (artifact.option) return optionsLayer;
            if (artifact.spell) return spellsLayer;
            if (!artifact.unit) return markersLayer;
            return artifact.unit.isFormation ? formationsLayer : unitsLayer;
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
        this._counters = new Set();
    }

    _memento() {
        return {
            selectedUnit: this._selectedUnit,
            focusedUnit: this._focusedUnit,
            actuators: [...this._actuators],
            counters: new Set(this._counters),
            popup: this._popup
        };
    }

    _revert(memento) {
        this._selectedUnit = memento.selectedUnit;
        this._focusedUnit = memento.focusedUnit;
        this._actuators = memento.actuators;
        this._counters = memento.counters;
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
        this._counters.add(counter)
        counter.location = location;
        counter.game = this;
        counter.element.setOnBoard(this._board);
    }

    addUnit(unit, hexLocation) {
        this._counters.add(unit);
        if (hexLocation) {
            unit.hexLocation = hexLocation;
            unit.element.setOnBoard(this._board);
        }
    }

    appendUnit(unit) {
        console.assert(!this._counters.has(unit));
        Memento.register(this);
        this._counters.add(unit)
    }

    deleteUnit(unit) {
        console.assert(this._counters.has(unit));
        Memento.register(this);
        this._counters.delete(unit);
    }

    getPlayerUnits(player) {
        let units = [];
        if (this._counters) {
            for (let counter of this._counters) {
                if (counter.isUnit && counter.player === player) {
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

    closeWidgets() {
        this.closeActuators();
        this.closePopup();
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
                counter.reset && counter.reset(player);
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

    get counters() {
        return this._counters;
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

    getNearHexSide(angle) {
        let hex1 = this._map.findNearHex(this, sumAngle(angle, 30));
        let hex2 = this._map.findNearHex(this, sumAngle(angle, -30));
        return new CBHexSideId(hex1, hex2);
    }

    getAngle(hexId) {
        let loc1 = this.location;
        let loc2 = hexId.location;
        return atan2(loc2.x-loc1.x, loc2.y-loc1.y);
    }

    get units() {
        return this._map.getUnitsOnHex(this);
    }

    get counters() {
        let counters = [];
        for (let unit of this.units) {
            counters.push(...unit.counters);
        }
        return counters;
    }

    // TODO : add map ref
    toString() {
        return "Hex("+this._col+", "+this._row+")";
    }

    hasHex(hexId) {
        return this === hexId;
    }

    getHexSide(angle) {
        return new CBHexSideId(this, this.getNearHex(angle));
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

    hasHex(hexId) {
        return this._hexId1 === hexId || this._hexId2 === hexId;
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
        console.assert(unit.isUnit);
        this._units.push(unit);
    }

    removeUnit(unit) {
        console.assert(unit.isUnit);
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
            if (unit1.isCharacter) {
                return unit2.isCharacter ? 0 : 1;
            }
            else {
                return unit2.isCharacter ? -1 : 0;
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

export class CBCounterImageArtifact extends DMultiImageArtifact {

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

    onMouseEnter(event) {
    }

    onMouseLeave(event) {
    }

    appear() {
        this.alpha = 1;
    }

    retract() {
        this.alpha = 0;
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
            if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
                this.setSettings(this.overSettings);
            }
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
                this.setSettings(this.settings);
            }
        }
    }
}

export function RetractableMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        onMouseEnter(event) {
            function retract(hexId) {
                let counters = hexId.counters;
                let first = counters.indexOf(this.counter);
                for (let index=first+1; index<counters.length; index++) {
                    counters[index].retract();
                }
            }
            super.onMouseEnter(event);
            if (this.counter.hexLocation instanceof CBHexId) {
                retract.call(this, this.counter.hexLocation);
            }
            else if (this.counter.hexLocation instanceof CBHexSideId) {
                retract.call(this, this.counter.hexLocation.fromHex);
                retract.call(this, this.counter.hexLocation.toHex);
            }
        }

        onMouseLeave(event) {
            function appear(hexId) {
                let counters = hexId.counters;
                let first = counters.indexOf(this.counter);
                for (let index=first+1; index<counters.length; index++) {
                    counters[index].appear();
                }
            }
            super.onMouseLeave(event);
            if (this.counter.hexLocation instanceof CBHexId) {
                appear.call(this, this.counter.hexLocation);
            }
            else if (this.counter.hexLocation instanceof CBHexSideId) {
                appear.call(this, this.counter.hexLocation.fromHex);
                appear.call(this, this.counter.hexLocation.toHex);
            }
        }

    }
}

export class CBCounter {

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

    createArtifact(levelName, images, location, dimension) {
        return new CBCounterImageArtifact(this, levelName, images, location, dimension);
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

    isShown() {
        return !!this._element.board;
    }

    show(game) {
        this._element.show(game.board);
    }

    hide() {
        this._element.hide();
    }

    appear() {
        this._imageArtifact.appear();
    }

    retract() {
        this._imageArtifact.retract();
    }
}

class UnitImageArtifact extends RetractableMixin(SelectableMixin(CBCounterImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this._counter;
    }

    get game() {
        return this.unit.game;
    }

}

export class CBAbstractUnit extends CBCounter {

    constructor(paths, dimension) {
        super("units", paths, dimension);
    }

    createArtifact(levelName, images, location, dimension) {
        return new UnitImageArtifact(this, levelName, images, location, dimension);
    }

    _memento() {
        return {
            hexLocation: this._hexLocation,
            action: this._action
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
        this._action = memento.action;
    }

    get isUnit() {
        return true;
    }

    get slot() {
        return this.hexLocation.units.indexOf(this);
    }

    reset(player) {
        if (player === this.player) {
            delete this._action;
        }
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

    unselect() {
        console.assert(this.game.selectedUnit===this);
        this.game.setSelectedUnit(null);
        this._imageArtifact.unselect();
        this.element.refresh();
    }

    select() {
        this.game.setSelectedUnit(this);
        this._imageArtifact.select();
        this.refresh();
    }

    get hexLocation() {
        return this._hexLocation;
    }

    set hexLocation(hexId) {
        if (this._hexLocation) {
            this._hexLocation.hex.removeUnit(this);
        }
        this._hexLocation = hexId;
        if (this._hexLocation) {
            hexId.hex.addUnit(this);
            this.location = hexId.location;
        }
    }

    _getCounters() {
        return [
            this
        ];
    }

    get counters() {
        return this._getCounters();
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

    get game() {
        return this.player.game;
    }

    isOnBoard() {
        return !!this._hexLocation;
    }

    get action() {
        return this._action;
    }

    addToMap(hexId, moveType) {
        console.assert(!this._hexLocation);
        Memento.register(this);
        this._hexLocation = hexId;
        hexId.hex.appendUnit(this, moveType);
        this.show(hexId.map.game);
        this._element.move(hexId.location);
    }

    removeFromMap() {
        console.assert(this._hexLocation);
        Memento.register(this);
        this._hexLocation.hex.deleteUnit(this);
        this._element.hide();
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

}