'use strict'

import {
    atan2, Point2D, Dimension2D
} from "../geometry.js";
import {
    DImage,
    DStaticLayer
} from "../draw.js";
import {
    Memento
} from "../mechanisms.js";
import {
    DBoard, DElement, DImageArtifact
} from "../board.js";
import {
    DIconMenu, DIconMenuItem,
    DPopup
} from "../widget.js";

export class CBPlayer {

    constructor() {}

    selectUnit(unit, event) {
        unit.openActionMenu(new Point2D(event.offsetX, event.offsetY));
    }

    _createMovementActuators(unit, first) {
        let moveActuator = unit.createMoveActuator(first);
        this.game.addActuator(moveActuator);
        let orientationActuator = unit.createOrientationActuator(first);
        this.game.addActuator(orientationActuator);
    }

    startMoveUnit(unit, event) {
        this._createMovementActuators(unit, true);
    }

    firstUnitRotation(unit, angle, event) {
        this.game.closeActuators();
        unit.firstRotation(angle);
        this._createMovementActuators(unit, false);
    }

    firstUnitMove(unit, hexId, event) {
        this.game.closeActuators();
        unit.firstMove(hexId);
        this._createMovementActuators(unit, false);
    }

    subsequentUnitRotation(unit, angle, event) {
        this.game.closeActuators();
        unit.subsequentRotation(angle);
        this._createMovementActuators(unit, false);
    }

    subsequentUnitMove(unit, hexId, event) {
        this.game.closeActuators();
        unit.subsequentMove(hexId);
        this._createMovementActuators(unit, false);
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
        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 500),
            "map", "units", "markers", "actuators", new DStaticLayer("widgets"), new DStaticLayer("widget-items"));
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(20, 10);
        this._board.scrollOnBordersOnMouseMove();
        this._board.zoomInOutOnMouseWheel();
        this._board.scrollOnKeyDown()
        this._board.zoomOnKeyDown();
        this._board.undoRedoOnKeyDown();
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

    setMap(map) {
        map.element.setOnBoard(this._board);
        map.game = this;
        return this;
    }

    addPlayer(player) {
        player.game = this;
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

    get root() {
        return this._board.root;
    }

    get actuators() {
        return this._actuators;
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

class UnitImageArtifact extends DImageArtifact {

    constructor(unit, ...args) {
        super(...args);
        this._unit = unit;
    }

    onMouseClick(event) {
        this._unit.onMouseClick(event);
    }
}

export class CBCounter {

    constructor(path, dimension) {
        this._image = DImage.getImage(path);
        this._imageArtifact = new UnitImageArtifact(this,"units", this._image, new Point2D(0, 0), dimension);
        this._imageArtifact.setSettings(this.settings);
        this._element = new DElement(this._imageArtifact);
        this._element._unit = this;
    }

    get angle() {
        return this._element.angle;
    }

    set angle(angle) {
        this._element.setAngle(angle);
    }

    get settings() {
        return level=>{
            level.setShadowSettings("#000000", 15);
        }
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

export class CBUnit extends CBCounter {

    constructor(player, path) {
        super(path, CBUnit.DIMENSION);
        this._player = player;
    }

    get selectedSettings() {
        return level=>{
            level.setShadowSettings("#FF0000", 15);
        }
    }

    unselect() {
        console.assert(CBUnit.selected===this);
        CBUnit.selected = null;
        this._imageArtifact.setSettings(this.settings);
        this.element.refresh();
    }

    select() {
        if (CBUnit.selected) {
            CBUnit.selected.unselect();
        }
        CBUnit.selected = this;
        this._imageArtifact.setSettings(this.selectedSettings);
        this.refresh();
    }

    onMouseClick(event) {
        this.select();
        this.player.selectUnit(this, event);
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

    _memento() {
        return {
            hexLocation: this._hexLocation
        };
    }

    _revert(memento) {
        this._hexLocation = memento.hexLocation;
    }

    firstMove(hexId) {
        Memento.register(this);
        Memento.register(this.game);
        this._hexLocation = hexId;
        this._element.move(hexId.location);
    }

    firstRotation(angle) {
        Memento.register(this);
        Memento.register(this.game);
        this._element.rotate(angle);
    }

    subsequentMove(hexId) {
        this._hexLocation = hexId;
        this._element.setLocation(hexId.location);
    }

    subsequentRotation(angle) {
        this._element.setAngle(angle);
    }

    openActionMenu(offset) {
        let popup = new DIconMenu(
            new DIconMenuItem("/CBlades/images/icons/move.png", 0, 0, event=>{
                this._player.startMoveUnit(this, event);
                return true;
            }),
            new DIconMenuItem("/CBlades/images/icons/move-back.png", 1, 0, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/escape.png", 2, 0, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/to-face.png", 3, 0, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/shock-attack.png", 0, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/fire-attack.png", 1, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/shock-duel.png", 2, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/fire-duel.png", 3, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-rest.png", 0, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-reload.png", 1, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-reorganize.png", 2, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-rally.png", 3, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/create-formation.png", 0, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/join-formation.png", 1, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/leave-formation.png", 2, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/dismiss-formation.png", 3, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/take-command.png", 0, 4, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/leave-command.png", 1, 4, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/change-orders.png", 2, 4, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/give-specific-orders.png", 3, 4, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/select-spell.png", 0, 5, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/cast-spell.png", 1, 5, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-fusion.png", 2, 5, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-many.png", 3, 5, ()=>{})
        );
        this.game.closeActuators();
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }

    createOrientationActuator(first) {
        let directions = [];
        for (let angle = 0; angle < 360; angle += 60) {
            directions[angle] = this.hexLocation.getNearHex(angle);
        }
        for (let angle = 0; angle < 360; angle += 60) {
            directions[angle + 30] = new CBHexSideId(directions[angle], directions[(angle + 60) % 360]);
        }
        delete directions[this.angle];
        return new CBOrientationActuator(this, directions, first);
    }

    createMoveActuator(first) {
        let directions = [];
        let angle = this.angle;
        if (angle%60) {
            directions[(angle-30)%360] = this.hexLocation.getNearHex((angle-30)%360);
            directions[(angle+30)%360] = this.hexLocation.getNearHex((angle+30)%360);
        }
        else {
            directions[(angle+300)%360] = this.hexLocation.getNearHex((angle+300)%360);
            directions[angle] = this.hexLocation.getNearHex(angle);
            directions[(angle+60)%360] = this.hexLocation.getNearHex((angle+60)%360);
        }
        return new CBMoveActuator(this, directions, first);
    }
}
CBUnit.selected = null;
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
        this._image = DImage.getImage("/CBlades/images/actuators/toward.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let orientation = new ActuatorImageArtifact(this, "actuators", this._image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(unit.location, directions[angle].location, angle%60?0.87:0.75);
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
        this._image = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let orientation = new ActuatorImageArtifact(this, "actuators", this._image,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(unit.location, directions[angle].location, 0.9);
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

