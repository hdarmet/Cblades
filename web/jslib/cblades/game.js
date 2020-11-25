'use strict'

import {
    Point2D, Dimension2D
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

export class CBGame {

    constructor() {
        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 500),
            "map", "units", "markers", new DStaticLayer("widgets"), new DStaticLayer("widget-items"));
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(20, 10);
        this._board.scrollOnBordersOnMouseMove();
        this._board.zoomInOutOnMouseWheel();
        this._board.scrollOnKeyDown()
        this._board.zoomOnKeyDown();
        this._board.undoRedoOnKeyDown();
        DPopup.activate();
    }

    _openMenu(offset) {
        let popup = new DIconMenu(
            new DIconMenuItem("/CBlades/images/icons/move.png", 0, 0, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/move-back.png", 0, 1, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/escape.png", 0, 2, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/to-face.png", 0, 3, ()=>{return true;}),
            new DIconMenuItem("/CBlades/images/icons/shock-attack.png", 1, 0, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/fire-attack.png", 1, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/shock-duel.png", 1, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/fire-duel.png", 1, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-rest.png", 2, 0, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-reload.png", 2, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-reorganize.png", 2, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-rally.png", 2, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/create-formation.png", 3, 0, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/join-formation.png", 3, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/leave-formation.png", 3, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/dismiss-formation.png", 3, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/take-command.png", 4, 0, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/leave-command.png", 4, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/change-orders.png", 4, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/give-specific-orders.png", 4, 3, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/select-spell.png", 5, 0, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/cast-spell.png", 5, 1, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-fusion.png", 5, 2, ()=>{}),
            new DIconMenuItem("/CBlades/images/icons/do-many.png", 5, 3, ()=>{})
        );
        popup.open(this._board, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
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

    addCounter(counter, hexLocation) {
        if (!this._counters) {
            this._counters = new Set();
        }
        this._counters.add(counter);
        counter.game = this;
        counter.setLocation(hexLocation.location);
        counter.element.setOnBoard(this._board);
    }

    get root() {
        return this._board.root;
    }

    start() {
        Memento.activate();
        this._board.paint();
        return this;
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

    get position() {
        return this.map.findPosition(this);
    }

    get location() {
        return this.map.getLocation(this.position);
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

    get settings() {
        return level=>{
            level.setShadowSettings("#000000", 15);
        }
    }

    setLocation(location) {
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

    constructor(path) {
        super(path, CBUnit.DIMENSION);
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
        this.game._openMenu(new Point2D(event.offsetX, event.offsetY));
    }
}
CBUnit.selected = null;
CBUnit.WIDTH = 142;
CBUnit.HEIGHT = 142;
CBUnit.DIMENSION = new Dimension2D(CBUnit.WIDTH, CBUnit.HEIGHT);
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}