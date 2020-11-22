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
    DPopup
} from "../widget.js";

export class CBGame {

    constructor() {
        this._board = new DBoard(new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT), new Dimension2D(1000, 500),
            "map", "units", "markers", new DStaticLayer("widgets"));
        this._board.setZoomSettings(1.5, 1);
        this._board.setScrollSettings(20, 10);
        this._board.scrollOnBordersOnMouseMove();
        this._board.zoomInOutOnMouseWheel();
        this._board.scrollOnKeyDown()
        this._board.zoomOnKeyDown();
        this._board.undoRedoOnKeyDown();
        this.setMouseClick();
        DPopup.activate();
    }

    setMouseClick() {
        this._board.onMouseClick(event=>{
            let offset = new Point2D(event.offsetX, event.offsetY);
            let artifact = this._board.getArtifactOnPoint(offset);
            return this._recenter(artifact, offset) ||
                this._selectUnit(artifact, offset);
        });
    }

    _openMenu(offset) {
        let popup = new DPopup();
        popup.open(this._board, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }

    _recenter(artifact, offset) {
        if (artifact && CBMap.fromArtifact(artifact)) {
            this._board.recenter(offset);
            DPopup.close();
            return true;
        }
        return false;
    }

    _selectUnit(artifact, offset) {
        if (artifact && CBUnit.fromArtifact(artifact)) {
            CBUnit.fromArtifact(artifact).select();
            this._openMenu(offset);
            return true;
        }
        return false;
    }

    setMap(map) {
        map.element.setOnBoard(this._board);
        return this;
    }

    addCounter(counter, hexLocation) {
        if (!this._counters) {
            this._counters = new Set();
        }
        this._counters.add(counter);
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

export class CBMap {

    constructor(path) {
        let image = DImage.getImage(path);
        this._imageArtifact = new DImageArtifact("map", image, new Point2D(0, 0), CBMap.DIMENSION);
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

}
CBMap.fromArtifact = function(artifact) {
    return artifact.element._map;
}
CBMap.WIDTH = 2046;
CBMap.HEIGHT = 3150;
CBMap.DIMENSION = new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT);
CBMap.COL_COUNT = 12;
CBMap.ROW_COUNT = 16;

export class CBCounter {

    constructor(path, dimension) {
        this._image = DImage.getImage(path);
        this._image.setSettings(this.settings);
        this._imageArtifact = new DImageArtifact("units", this._image, new Point2D(0, 0), dimension);
        this._element = new DElement(this._imageArtifact);
        this._element._unit = this;
    }

    get settings() {
        return (platform, context)=>{
            platform.setShadowColor(context, "#000000");
            platform.setShadowBlur(context, 15);
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

}

export class CBUnit extends CBCounter {

    constructor(path) {
        super(path, CBUnit.DIMENSION);
    }

    get selectedSettings() {
        return (platform, context)=>{
            platform.setShadowColor(context, "#FF0000");
            platform.setShadowBlur(context, 15);
        }
    }

    unselect() {
        console.assert(CBUnit.selected===this);
        CBUnit.selected = null;
        this._image.setSettings(this.settings);
        this.element.refresh();
    }

    select() {
        if (CBUnit.selected) {
            CBUnit.selected.unselect();
        }
        CBUnit.selected = this;
        this._image.setSettings(this.selectedSettings);
        this.refresh();
    }
}
CBUnit.selected = null;
CBUnit.WIDTH = 142;
CBUnit.HEIGHT = 142;
CBUnit.DIMENSION = new Dimension2D(CBUnit.WIDTH, CBUnit.HEIGHT);
CBUnit.fromArtifact = function(artifact) {
    return artifact.element._unit;
}