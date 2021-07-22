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
    CBMoveType
} from "./map.js";

export let CBWeather = {
    HOT : 0,
    CLEAR : 1,
    CLOUDY : 2,
    OVERCAST : 3,
    RAIN : 4,
    STORM : 5
}

export let CBFog = {
    NO_FOG: 0,
    MIST : 1,
    DENSE_MIST : 2,
    FOG : 3,
    DENSE_FOG : 4
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
                    if (lastUnit !== unit && lastUnit === this.game.selectedUnit) {
                        lastUnit.player.unselectUnit(lastUnit, event);
                    }
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
                this.startActivation(unit, () => {
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

    loseUnit(unit) {
        unit.deleteFromMap();
    }

    unselectUnit(unit) {
        if (unit.action) {
            unit.action.markAsFinished();
        }
        unit.unselect();
    }

    startActivation(unit, action) {
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
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.STARTED);
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
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINISHED);
        }
    }

    cancel(action) {
        console.assert(this._status === CBAction.INITIATED);
        Memento.register(this);
        this._status = CBAction.CANCELLED;
        this._game.closeWidgets();
        this.unit.removeAction();
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
            if (this.unit.isCurrentPlayer()) {
                this.unit.updatePlayed();
            }
            Mechanisms.fire(this, CBAction.PROGRESSION_EVENT, CBAction.FINALIZED);
        }
    }

    play() {}

    get unit() {
        return this._unit;
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

        _register(memento) {
            super._register(memento);
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
        if (event===CBActuator.VISIBILITY) {
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
    static VISIBILITY = {};
}

export class CBActionActuator extends CBActuator {

    constructor(action) {
        super();
        this._action = action;
    }

    get action() {
        return this._action;
    }

    get unit() {
        return this.action.unit;
    }

    initElement(triggers, position = this.unit.location) {
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
            if (event === WidgetLevelMixin.VISIBILITY) {
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
WidgetLevelMixin.VISIBILITY = {};
WidgetLevelMixin.VISIBILITY_LEVEL = 2;

export class CBMask extends WidgetLevelMixin(DMask) {

    constructor(...args) {
        super(...args);
    }

}

export function Displayable(clazz) {

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

        onMouseClick(event) {
            if (!this.played) {
                this.play(event);
            }
        }

        isFinishable() {
            return this.played;
        }

        markAsPlayed() {
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
                    this.setHorizontal(CBCounterDisplay.RIGHT);
                    break;
                case DBoard.BORDER.RIGHT:
                    this.setHorizontal(CBCounterDisplay.LEFT);
                    break;
                case DBoard.BORDER.TOP:
                    this.setVertical(CBCounterDisplay.BOTTOM);
                    break;
                case DBoard.BORDER.BOTTOM:
                    this.setVertical(CBCounterDisplay.TOP);
                    break;
            }
        }
    }

    addCounter(counter) {
        console.assert(this._counters.indexOf(counter)<0);
        this._counters.push(counter);
        this._game._addCounter(counter);
        this.setCounterLocations();
        counter._setOnGame(this._game);
    }

    removeCounter(counter) {
        let counterIndex = this._counters.indexOf(counter);
        console.assert(counterIndex>=0);
        this._counters.splice(counterIndex, 1);
        this._game._removeCounter(counter);
        this.setCounterLocations();
        counter._removeFromGame();
    }

    appendCounter(counter) {
        console.assert(this._counters.indexOf(counter)<0);
        Memento.register(this);
        this._counters.push(counter);
        this._game._appendCounter(counter);
        this.adjustCounterLocations();
        counter._show(this._game);
    }

    deleteCounter(counter) {
        let counterIndex = this._counters.indexOf(counter);
        console.assert(counterIndex>=0);
        Memento.register(this);
        this._counters.splice(counterIndex, 1);
        this._game._deleteCounter(counter);
        this.removeCounter(counter);
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
                leftBottomPoint.x -CBCounterDisplay.MARGIN * index -CBCounterDisplay.YMARGIN ;
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
        this._counters = new Set();
        this._visibility = 2;
        this._commands = new Set();
        this._counterDisplay = new CBCounterDisplay(this);
        this._settings = {
            _weather: CBWeather.CLEAR,
            _fog: CBFog.MIST
        }
        Mechanisms.addListener(this);
    }

    fitWindow() {
        this._board.fitWindow();
    }

    get weather() {
        return this._settings._weather;
    }

    set weather(weather) {
        this._settings._weather = weather;
    }

    changeWeather(weather) {
        Memento.register(this);
        this._settings._weather = weather;
        Mechanisms.fire(this, CBGame.SETTINGS_EVENT, {weather});
    }

    get fog() {
        return this._settings._fog;
    }

    set fog(fog) {
        this._settings._fog = fog;
    }

    changeFog(fog) {
        Memento.register(this);
        this._settings._fog = fog;
        Mechanisms.fire(this, CBGame.SETTINGS_EVENT, {fog});
    }

    _buildBoard(map) {

        function createHexArtifactSlot(slotIndex) {
            let delta = Matrix2D.translate(new Point2D(-slotIndex*20, -slotIndex*20+20));
            return [
                new DTranslateLayer("hex-"+slotIndex, delta)
            ]
        }

        function getHexArtifactSlot(artifact) {
            let counter = artifact.counter;
            return counter.hexLocation ? counter.hexLocation.playables.indexOf(counter) : 0;
        }

        function getHexArtifactLayer(artifact, [hexLayer]) {
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
            new DStackedLevel("ground", getHexArtifactSlot, getHexArtifactLayer, createHexArtifactSlot),
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
            selectedUnit: this._selectedUnit,
            focusedUnit: this._focusedUnit,
            actuators: [...this._actuators],
            counters: new Set(this._counters),
            popup: this._popup,
            setting: {
                _weather: this._settings._weather,
                _fog: this._settings._fog
            }
        };
    }

    _revert(memento) {
        this._selectedUnit = memento.selectedUnit;
        this._focusedUnit = memento.focusedUnit;
        this._actuators = memento.actuators;
        this._counters = memento.counters;
        if (memento.popup) {
            this._popup = memento.popup;
        } else {
            delete this._popup;
        }
        this._settings = memento.settings;
    }


    _processGlobalEvent(source, event, value) {
        if (event===DBoard.RESIZE_EVENT) {
            this._refresfCommands();
        }
        else if (event===CBAbstractUnit.DESTROYED_EVENT) {
            if (this.focusedUnit === source) {
                this.setFocusedUnit(null);
            }
            if (this.selectedUnit === source) {
                this.setSelectedUnit(null);
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

    addCounter(counter) {
        this._counters.add(counter)
        counter._setOnGame(this);
    }

    addUnit(unit, hexLocation) {
        unit.addToMap(hexLocation, CBMoveType.BACKWARD);
    }

    removeUnit(unit) {
        unit.removeFromMap();
    }

    appendUnit(unit, hexLocation) {
        unit.appendToMap(hexLocation, CBMoveType.BACKWARD);
    }

    deleteUnit(unit) {
        unit.deleteFromMap();
    }

    _addCounter(unit) {
        console.assert(!this._counters.has(unit));
        this._counters.add(unit)
    }

    _removeCounter(unit) {
        console.assert(this._counters.has(unit));
        this._counters.delete(unit);
    }

    _appendCounter(unit) {
        console.assert(!this._counters.has(unit));
        Memento.register(this);
        this._counters.add(unit)
    }

    _deleteCounter(unit) {
        console.assert(this._counters.has(unit));
        Memento.register(this);
        this._counters.delete(unit);
    }

    get units() {
        let units = [];
        if (this._counters) {
            for (let counter of this._counters) {
                if (counter.unitNature) {
                    units.push(counter);
                }
            }
        }
        return units;
    }

    getPlayerUnits(player) {
        let units = [];
        if (this._counters) {
            for (let counter of this._counters) {
                if (counter.unitNature && counter.player === player) {
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
        if (unit && unit.isOnBoard()) {
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
                Mechanisms.fire(this, CBActuator.VISIBILITY, this._visibility);
                Mechanisms.fire(this, WidgetLevelMixin.VISIBILITY, this._visibility>=1);
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

    _initCounters(player) {
        if (this._counters) {
            for (let counter of this._counters) {
                counter.init && counter.init(player);
            }
        }
    }

    nextTurn(animation) {
        if (!this.selectedUnit || this.canUnselectUnit()) {
            this.closeActuators();
            this._resetCounters(this._currentPlayer);
            let indexPlayer = this._players.indexOf(this._currentPlayer);
            this._currentPlayer = this._players[(indexPlayer + 1) % this._players.length];
            this._initCounters(this._currentPlayer);
            animation && animation();
            Memento.clear();
            Mechanisms.fire(this, CBGame.TURN_EVENT);
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

export class CBCounterImageArtifact extends DMultiImagesArtifact {

    constructor(counter, ...args) {
        super(...args); // levelName, image, position, dimension, pangle=0
        this.setSettings(this.settings);
        this._counter = counter;
    }

    onMouseClick(event) {
        this._counter.onMouseClick && this._counter.onMouseClick(event);
        return true;
    }

    get counter() {
        return this._counter;
    }

    get game() {
        return this.counter.game;
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
            if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
                this.setSettings(this.overSettings);
            }
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            if (this.game.selectedUnit!==this.unit && this.game.canSelectUnit(this.unit)) {
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
            this.counter.retractAbove();
            return true;
        }

        onMouseLeave(event) {
            super.onMouseLeave(event);
            this.counter.appearAbove();
            return true;
        }

    }
}

export function RetractableCounterMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        retractAbove(event) {
            function retract(hexId, artifacts) {
                let counters = hexId.allCounters;
                let first = counters.indexOf(this);
                for (let index=first+1; index<counters.length; index++) {
                    counters[index].collectArtifactsToRetract(artifacts);
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

    createArtifact(levelName, images, position, dimension) {
        return new CBCounterImageArtifact(this, levelName, images, position, dimension);
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

export class CBPlayable extends CBCounter {

    constructor(levelName, paths, dimension) {
        super(levelName, paths, dimension);
    }

    get playableNature() {
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
        hexLocation.game._addCounter(this);
        hexLocation._addPlayable(this);
    }

    _removePlayable(hexLocation) {
        console.assert(hexLocation.game === this.game);
        hexLocation.game._removeCounter(this);
        hexLocation._removePlayable(this);
    }

    _appendPlayable(hexLocation) {
        hexLocation.game._appendCounter(this);
        hexLocation._appendPlayable(this);
    }

    _deletePlayable(hexLocation) {
        console.assert(hexLocation.game === this.game);
        hexLocation.game._deleteCounter(this);
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

export class UnitImageArtifact extends RetractableArtifactMixin(SelectableMixin(CBCounterImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this._counter;
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

export class CBAbstractUnit extends RetractableCounterMixin(CBCounter) {

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

    set hexLocation(hexLocation) {
        if (this._hexLocation) {
            this.removeFromMap();
        }
        if (hexLocation) {
            this.addToMap(hexLocation, CBMoveType.BACKWARD);
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

    isOnBoard() {
        return !!this._hexLocation;
    }

    get action() {
        return this._action;
    }

    addToMap(hexLocation, moveType) {
        console.assert(!this._hexLocation);
        hexLocation.game._addCounter(this);
        this._hexLocation = hexLocation;
        hexLocation._addUnit(this, moveType);
        this._setOnGame(hexLocation.map.game);
        this._setLocation(hexLocation.location);
    }

    removeFromMap() {
        console.assert(this._hexLocation);
        this.game._removeCounter(this);
        this._hexLocation._removeUnit(this);
        this._removeFromGame();
        delete this._hexLocation;
    }

    appendToMap(hexLocation, moveType) {
        console.assert(!this._hexLocation);
        Memento.register(this);
        hexLocation.game._appendCounter(this);
        this._hexLocation = hexLocation;
        hexLocation._appendUnit(this, moveType);
        this._show(hexLocation.map.game);
        this._element.move(hexLocation.location);
    }

    deleteFromMap() {
        console.assert(this._hexLocation);
        Memento.register(this);
        this.game._deleteCounter(this);
        this._hexLocation._deleteUnit(this);
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

    static DESTROYED_EVENT = "unit-destroyed";
}
