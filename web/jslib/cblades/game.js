'use strict'

import {
    Point2D, Dimension2D, Matrix2D
} from "../geometry.js";
import {
    DImage, DTranslateLayer
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
    CBMap, CBMoveType
} from "./map.js";

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

export function CBActivableMixin(clazz) {

    return class extends clazz {

        constructor(...args) {
            super(...args);
            this.setSettings(this.settings);
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

        onMouseEnter(event) {
            this.setSettings(this.overSettings);
            this.element.refresh();
            return true;
        }

        onMouseLeave(event) {
            this.setSettings(this.settings);
            this.element.refresh();
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

    setVisibility(level) {}

}
CBActuator.FULL_VISIBILITY = 2;
CBActuator.VISIBILITY = {};

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

export class CBGame {

    constructor() {

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

        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 800),
            new DSimpleLevel("map"),
            new DStackedLevel("terran", getHexArtifactSlot, getHexArtifactLayer, createHexArtifactSlot),
            new DStackedLevel("units", getUnitArtifactSlot, getUnitArtifactLayer, createUnitArtifactSlot),
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
        this._visibility = 2;
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

    get map() {
        return this._map;
    }

    setMap(map) {
        this._map = map;
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

    _addUnit(unit) {
        console.assert(!this._counters.has(unit));
        this._counters.add(unit)
    }

    _removeUnit(unit) {
        console.assert(this._counters.has(unit));
        this._counters.delete(unit);
    }

    _appendUnit(unit) {
        console.assert(!this._counters.has(unit));
        Memento.register(this);
        this._counters.add(unit)
    }

    _deleteUnit(unit) {
        console.assert(this._counters.has(unit));
        Memento.register(this);
        this._counters.delete(unit);
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

    closeActuators() {
        Memento.register(this);
        for (let actuator of this._actuators) {
            actuator.hide(this);
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

    get visibility() {
        return this._visibility;
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
            this._editorCommand.setOnBoard(this._board);
            this._insertLevelCommand.setOnBoard(this._board);
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
            this._editorCommand.removeFromBoard();
            this._insertLevelCommand.removeFromBoard();
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
        this._editorCommand = new DMultiStatePushButton(
            ["/CBlades/images/commands/editor.png", "/CBlades/images/commands/field.png"],
            new Point2D(-480, -60), (state, animation)=>{
                if (!state) CBGame.edit(this); else this.closeActuators();
                animation();
        }).setTurnAnimation(true, ()=>this._editorCommand.setState(this._editorCommand.state?0:1));
        this._insertLevelCommand = new DMultiStatePushButton(
            ["/CBlades/images/commands/insert0.png", "/CBlades/images/commands/insert1.png", "/CBlades/images/commands/insert2.png"],
            new Point2D(-540, -60), (state, animation)=>{
                this._visibility = (state+1)%3;
                Mechanisms.fire(this, CBActuator.VISIBILITY, this._visibility);
                Mechanisms.fire(this, WidgetLevelMixin.VISIBILITY, this._visibility>=1);
                animation();
            })
            .setState(this._visibility)
            .setTurnAnimation(true, ()=>this._insertLevelCommand.setState(this._visibility));
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
CBGame.POPUP_MARGIN = 10;
CBGame.PROGRESSION = "progression";
CBGame.ULAYERS = {
    SPELLS: 0,
    FORMATIONS: 1,
    FMARKERS: 2,
    FOPTIONS: 3,
    UNITS: 4,
    MARKERS: 5,
    OPTIONS: 6,
    ACTUATORS: 7
}
CBGame.edit = function(game) {};

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

    createArtifact(levelName, images, location, dimension) {
        return new CBCounterImageArtifact(this, levelName, images, location, dimension);
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

    _show(game) {
        this._element.show(game.board);
    }

    _hide() {
        this._element.hide();
    }

    _setOnGame(game) {
        this._element.setOnBoard(game.board);
    }

    _removeFromGame() {
        this._element.removeFromBoard();
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
        hexLocation._addPlayable(this);
    }

    _removePlayable(hexLocation) {
        hexLocation._removePlayable(this);
    }

    _appendPlayable(hexLocation) {
        hexLocation._appendPlayable(this);
    }

    _deletePlayable(hexLocation) {
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

    createArtifact(levelName, images, location, dimension) {
        return new UnitImageArtifact(this, levelName, images, location, dimension);
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
        hexId.game._addUnit(this);
        this._hexLocation = hexId;
        hexId._addUnit(this, moveType);
        this._setOnGame(hexId.map.game);
        this._setLocation(hexId.location);
    }

    removeFromMap() {
        console.assert(this._hexLocation);
        this.game._removeUnit(this);
        this._hexLocation._removeUnit(this);
        this._removeFromGame();
        delete this._hexLocation;
    }

    appendToMap(hexLocation, moveType) {
        console.assert(!this._hexLocation);
        Memento.register(this);
        hexLocation.game._appendUnit(this);
        this._hexLocation = hexLocation;
        hexLocation._appendUnit(this, moveType);
        this._show(hexLocation.map.game);
        this._element.move(hexLocation.location);
    }

    deleteFromMap() {
        console.assert(this._hexLocation);
        Memento.register(this);
        this.game._deleteUnit(this);
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
}