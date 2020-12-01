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
    DIconMenu, DIconMenuItem, DPopup, DPushButton
} from "../widget.js";

export let CBMovement = {
    NORMAL : "normal",
    EXTENDED : "extended",
    MINIMAL : "minimal"
}

export class CBArbitrator {

    allowedActions(unit) {
        return {
            moveForward:true,
            moveBack:true,
            escape:true,
            confront:true,
            shockAttack:false,
            fireAttack:false,
            shockDuel:false,
            fireDuel:false,
            rest:true,
            reload:true,
            reorganize:true,
            rally:true,
            createFormation:true,
            joinFormation:true,
            leaveFormation:true,
            breakFormation:true,
            takeCommand:true,
            leaveCommand:true,
            changeOrders:true,
            giveSpecificOrders:true,
            prepareSpell:true,
            castSpell:true,
            mergeUnit:true,
            miscAction:true
        }
    }

    _allowedMove(unit, first) {
        function processAngle(directions, arbitrator, unit, angle, first) {
            let nearHexId = unit.hexLocation.getNearHex(angle);
            let cost = arbitrator.getMovementCost(unit, nearHexId);
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.extendedMovementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED};
            }
            else if (first) {
                directions[angle] = { hex:nearHexId, type:CBMovement.MINIMAL};
            }
        }

        let directions = [];
        let angle = unit.angle;
        if (angle%60) {
            processAngle(directions, this, unit, angle - 30, first);
            processAngle(directions, this, unit, (angle + 30) % 360, first);
        }
        else {
            processAngle(directions, this, unit, (angle + 300) % 360, first);
            processAngle(directions, this, unit, angle, first);
            processAngle(directions, this, unit, (angle + 60) % 360, first);
        }
        return directions;
    }

    allowedFirstMove(unit) {
        return this._allowedMove(unit, true);
    }

    allowedSubsequentMove(unit) {
        return this._allowedMove(unit, false);
    }

    _allowedRotate(unit) {
        function processAngle(directions, arbitrator, unit, angle) {
            let nearHexId = angle%60 ?
                new CBHexSideId(unit.hexLocation.getNearHex(angle-30), unit.hexLocation.getNearHex((angle+30)%360)) :
                unit.hexLocation.getNearHex(angle);
            let cost = arbitrator.getRotationCost(unit, angle);
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.extendedMovementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED};
            }
        }

        let directions = [];
        for (let angle = 0; angle < 360; angle += 30) {
            processAngle(directions, this, unit, angle);
        }
        delete directions[unit.angle];
        return directions;
    }

    allowedFirstRotate(unit) {
        return this._allowedRotate(unit)
    }

    allowedSubsequentRotate(unit) {
        return this._allowedRotate(unit)
    }

    getRotationCost(unit, angle) {
        return 0.5;
    }

    getMovementCost(unit, hexId) {
        return 1;
    }

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

}

export class CBPlayer {

    constructor() {}

    selectUnit(unit, event) {
        unit.openActionMenu(
            new Point2D(event.offsetX, event.offsetY),
            this.game.arbitrator.allowedActions(unit)
        );
    }

    _createFirstMovementActuators(unit) {
        let moveDirections = this.game.arbitrator.allowedFirstMove(unit);
        let moveActuator = unit.createMoveActuator(moveDirections, true);
        this.game.addActuator(moveActuator);
        let orientationDirections = this.game.arbitrator.allowedFirstRotate(unit);
        let orientationActuator = unit.createOrientationActuator(orientationDirections, true);
        this.game.addActuator(orientationActuator);
    }

    _createSubsequentMovementActuators(unit) {
        let moveDirections = this.game.arbitrator.allowedSubsequentMove(unit);
        let moveActuator = unit.createMoveActuator(moveDirections, false);
        this.game.addActuator(moveActuator);
        let orientationDirections = this.game.arbitrator.allowedSubsequentRotate(unit);
        let orientationActuator = unit.createOrientationActuator(orientationDirections, false);
        this.game.addActuator(orientationActuator);
    }

    startMoveUnit(unit, event) {
        this._createFirstMovementActuators(unit);
    }

    firstUnitRotation(unit, angle, event) {
        this.game.closeActuators();
        unit.firstRotation(angle, this.game.arbitrator.getRotationCost(unit, angle));
        this._createSubsequentMovementActuators(unit);
    }

    firstUnitMove(unit, hexId, event) {
        this.game.closeActuators();
        unit.firstMove(hexId, this.game.arbitrator.getMovementCost(unit, hexId));
        this._createSubsequentMovementActuators(unit);
    }

    subsequentUnitRotation(unit, angle, event) {
        this.game.closeActuators();
        unit.subsequentRotation(angle, this.game.arbitrator.getRotationCost(unit, angle));
        this._createSubsequentMovementActuators(unit);
    }

    subsequentUnitMove(unit, hexId, event) {
        this.game.closeActuators();
        unit.subsequentMove(hexId, this.game.arbitrator.getMovementCost(unit, hexId));
        this._createSubsequentMovementActuators(unit);
    }

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
            actuators: [...this._actuators]
        };
    }

    _revert(memento) {
        this.closeActuators();
        for (let actuator of memento.actuators) {
            this.addActuator(actuator);
        }
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

    addActuator(actuator) {
        actuator.game = this;
        actuator.element.setOnBoard(this._board);
        this._actuators.push(actuator);
    }

    closeActuators() {
        for (let actuator of this._actuators) {
            actuator.element.removeFromBoard(this._board);
        }
        this._actuators = [];
    }

    setSelectedUnit(unit) {
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
        });
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
        });
        this._redoCommand = new DPushButton("/CBlades/images/commands/redo.png", new Point2D(-240, -60), ()=>{
            Memento.redo();
        });
        this._settingsCommand = new DPushButton("/CBlades/images/commands/settings.png", new Point2D(-300, -60), ()=>{});
        this._saveCommand = new DPushButton("/CBlades/images/commands/save.png", new Point2D(-360, -60), ()=>{});
        this._loadCommand = new DPushButton("/CBlades/images/commands/load.png", new Point2D(-420, -60), ()=>{});
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
        this.closeActuators();
        this._resetCounters(this._currentPlayer);
        let indexPlayer = this._players.indexOf(this._currentPlayer);
        this._currentPlayer = this._players[(indexPlayer+1)%this._players.length];
        Memento.clear();
    }

    get arbitrator() {
        return this._arbitrator;
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

    createArtifact(path, dimension) {
        this._image = DImage.getImage(path);
        return new CounterImageArtifact(this,"units", this._image, new Point2D(0, 0), dimension);
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

export class CBActionMenu extends DIconMenu {

    constructor(unit, actions) {
        super(new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
            0, 0, event => {
                unit.player.startMoveUnit(unit, event);
                return true;
            }).setActive(actions.moveForward),
            new DIconMenuItem("/CBlades/images/icons/move-back.png", "/CBlades/images/icons/move-back-gray.png",
                1, 0, () => {
                return true;
            }).setActive(actions.moveBack),
            new DIconMenuItem("/CBlades/images/icons/escape.png", "/CBlades/images/icons/escape-gray.png",
                2, 0, () => {
                return true;
            }).setActive(actions.escape),
            new DIconMenuItem("/CBlades/images/icons/to-face.png", "/CBlades/images/icons/to-face-gray.png",
                3, 0, () => {
                return true;
            }).setActive(actions.confront),
            new DIconMenuItem("/CBlades/images/icons/shock-attack.png", "/CBlades/images/icons/shock-attack-gray.png",
                0, 1, () => {
            }).setActive(actions.shockAttack),
            new DIconMenuItem("/CBlades/images/icons/fire-attack.png", "/CBlades/images/icons/fire-attack-gray.png",
                1, 1, () => {
            }).setActive(actions.fireAttack),
            new DIconMenuItem("/CBlades/images/icons/shock-duel.png", "/CBlades/images/icons/shock-duel-gray.png",
                2, 1, () => {
            }).setActive(actions.shockDuel),
            new DIconMenuItem("/CBlades/images/icons/fire-duel.png", "/CBlades/images/icons/fire-duel-gray.png",
                3, 1, () => {
            }).setActive(actions.fireDuel),
            new DIconMenuItem("/CBlades/images/icons/do-rest.png", "/CBlades/images/icons/do-rest-gray.png",
                0, 2, () => {
            }).setActive(actions.rest),
            new DIconMenuItem("/CBlades/images/icons/do-reload.png", "/CBlades/images/icons/do-reload-gray.png",
                1, 2, () => {
            }).setActive(actions.reload),
            new DIconMenuItem("/CBlades/images/icons/do-reorganize.png", "/CBlades/images/icons/do-reorganize-gray.png",
                2, 2, () => {
            }).setActive(actions.reorganize),
            new DIconMenuItem("/CBlades/images/icons/do-rally.png", "/CBlades/images/icons/do-rally-gray.png",
                3, 2, () => {
            }).setActive(actions.rally),
            new DIconMenuItem("/CBlades/images/icons/create-formation.png", "/CBlades/images/icons/create-formation-gray.png",
                0, 3, () => {
            }).setActive(actions.createFormation),
            new DIconMenuItem("/CBlades/images/icons/join-formation.png", "/CBlades/images/icons/join-formation-gray.png",
                1, 3, () => {
            }).setActive(actions.joinFormation),
            new DIconMenuItem("/CBlades/images/icons/leave-formation.png", "/CBlades/images/icons/leave-formation-gray.png",
                2, 3, () => {
            }).setActive(actions.leaveFormation),
            new DIconMenuItem("/CBlades/images/icons/dismiss-formation.png", "/CBlades/images/icons/dismiss-formation-gray.png",
                3, 3, () => {
            }).setActive(actions.breakFormation),
            new DIconMenuItem("/CBlades/images/icons/take-command.png", "/CBlades/images/icons/take-command-gray.png",
                0, 4, () => {
            }).setActive(actions.takeCommand),
            new DIconMenuItem("/CBlades/images/icons/leave-command.png", "/CBlades/images/icons/leave-command-gray.png",
                1, 4, () => {
            }).setActive(actions.leaveCommand),
            new DIconMenuItem("/CBlades/images/icons/change-orders.png", "/CBlades/images/icons/change-orders-gray.png",
                2, 4, () => {
            }).setActive(actions.changeOrders),
            new DIconMenuItem("/CBlades/images/icons/give-specific-orders.png", "/CBlades/images/icons/give-specific-orders-gray.png",
                3, 4, () => {
            }).setActive(actions.giveSpecificOrders),
            new DIconMenuItem("/CBlades/images/icons/select-spell.png", "/CBlades/images/icons/select-spell-gray.png",
                0, 5, () => {
            }).setActive(actions.prepareSpell),
            new DIconMenuItem("/CBlades/images/icons/cast-spell.png", "/CBlades/images/icons/cast-spell-gray.png",
                1, 5, () => {
            }).setActive(actions.castSpell),
            new DIconMenuItem("/CBlades/images/icons/do-fusion.png", "/CBlades/images/icons/do-fusion-gray.png",
                2, 5, () => {
            }).setActive(actions.mergeUnit),
            new DIconMenuItem("/CBlades/images/icons/do-many.png", "/CBlades/images/icons/do-many-gray.png",
                3, 5, () => {
            }).setActive(actions.miscAction)
        );
    }

}

class UnitImageArtifact extends CounterImageArtifact {

    constructor(unit, ...args) {
        super(unit, ...args);
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
        delete this._selected;
        this.setSettings(this.settings);
    }

    select() {
        this._selected = true;
        this.setSettings(this.selectedSettings);
    }

    onMouseEnter(event) {
        if (!this._selected && this.unit.isCurrentPlayer()) {
            this.setSettings(this.overSettings);
        }
    }

    onMouseLeave(event) {
        if (!this._selected && this.unit.isCurrentPlayer()) {
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
    }

    createArtifact(path, dimension) {
        this._image = DImage.getImage(path);
        return new UnitImageArtifact(this,"units", this._image, new Point2D(0, 0), dimension);
    }

    _memento() {
        return {
            hexLocation: this._hexLocation,
            movementPoints: this._movementPoints,
            extendedMovementPoints: this._extendedMovementPoints
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
        this._movementPoints = memento.movementPoints;
        this._extendedMovementPoints = memento.extendedMovementPoints;
    }

    _reset(player) {
        if (player === this._player) {
            this._movementPoints = 2;
            this._extendedMovementPoints = this._movementPoints*1.5;
        }
    }

    unselect() {
        console.assert(this.game.selectedUnit===this);
        this.game.setSelectedUnit(null);
        this._imageArtifact.unselect();
        this.element.refresh();
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
        if (this.isCurrentPlayer()) {
            this.select();
            this.player.selectUnit(this, event);
        }
    }

    isCurrentPlayer() {
        return this.player === this.game.currentPlayer;
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

    _updateMovementPoints(cost) {
        this._movementPoints -= cost;
        this._extendedMovementPoints -= cost;
    }

    firstMove(hexId, cost) {
        Memento.register(this);
        Memento.register(this.game);
        this._hexLocation = hexId;
        this._element.move(hexId.location);
        this._updateMovementPoints(cost);
    }

    firstRotation(angle, cost) {
        Memento.register(this);
        Memento.register(this.game);
        this._element.rotate(angle);
        this._updateMovementPoints(cost);
    }

    subsequentMove(hexId, cost) {
        this._hexLocation = hexId;
        this._element.setLocation(hexId.location);
        this._updateMovementPoints(cost);
    }

    subsequentRotation(angle, cost) {
        this._element.setAngle(angle);
        this._updateMovementPoints(cost);
    }

    openActionMenu(offset, actions) {
        let popup = new CBActionMenu(this, actions);
        this.game.closeActuators();
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }

    createOrientationActuator(directions, first) {
        return new CBOrientationActuator(this, directions, first);
    }

    createMoveActuator(directions, first) {
        return new CBMoveActuator(this, directions, first);
    }
}
CBUnit.WIDTH = 142;
CBUnit.HEIGHT = 142;
CBUnit.DIMENSION = new Dimension2D(CBUnit.WIDTH, CBUnit.HEIGHT);
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}

class ActuatorImageArtifact extends DImageArtifact {

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

    constructor(unit) {
        this._unit = unit;
    }

    get unit() {
        return this._unit;
    }
}

export class CBOrientationActuator extends CBActuator {

    constructor(unit, directions, first) {
        super(unit);
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage : extendedImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(unit.location, directions[angle].hex.location, angle%60?0.87:0.75);
            orientation.pangle = parseInt(angle);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    get element() {
        return this._element;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                if (this._first) {
                    this.unit.player.firstUnitRotation(this.unit, artifact.angle, event);
                }
                else {
                    this.unit.player.subsequentUnitRotation(this.unit, artifact.angle, event);
                }
            }
        }
    }

}

export class CBMoveActuator extends CBActuator {

    constructor(unit, directions, first) {
        super(unit);
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage :
                        directions[angle].type === CBMovement.EXTENDED ? extendedImage : minimalImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(unit.location, directions[angle].hex.location, 0.9);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    get element() {
        return this._element;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                if (this._first) {
                    this.unit.player.firstUnitMove(this.unit, this.unit.hexLocation.getNearHex(artifact.angle), event);
                }
                else {
                    this.unit.player.subsequentUnitMove(this.unit, this.unit.hexLocation.getNearHex(artifact.angle), event);
                }
            }
        }
    }

}

