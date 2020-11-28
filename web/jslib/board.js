'use strict';

import {
    Matrix2D, Point2D, Area2D
} from "./geometry.js";
import {
    DDraw, DLayer
} from "./draw.js";
import {
    Mechanisms,
    Memento
} from "./mechanisms.js";

export function LocalisationAware(clazz) {
    return class extends clazz {

        constructor(...args) {
            super(...args);
        }

        get location() {
            return this._location;
        }

        get angle() {
            return this._angle;
        }

        get transform() {
            let translation = this._location.x || this._location.y ? Matrix2D.translate(this.location) : null;
            let rotation = this.angle ? Matrix2D.rotate(this.angle, this.location) : null;
            return translation ? rotation ? translation.concat(rotation) : translation : rotation;
        }

        getLocation(lpoint) {
            let transform = this.transform;
            return transform ? this.transform.point(lpoint) : lpoint;
        }

        getPosition(point) {
            let transform = this.transform;
            return transform ? this.transform.invert().point(point) : point;
        }
    }
}

/**
 * Wrap something that can be shown on a given layer
 */
export class DArtifact extends LocalisationAware(Object) {

    constructor(levelName, position, pangle=0) {
        super();
        this._levelName = levelName;
        this._position = position;
        this._pangle = pangle;
        this._location = position;
        this._angle = pangle;
    }

    _setElement(element) {
        this._element = element;
        this.setLocation(this.element.location, this.element.angle);
    }

    _memento() {
        return {
            level: this._level,
            position:this._position,
            pangle:this._pangle,
            location:this._location,
            angle:this._angle
        }
    }

    _revert(memento) {
        this._level && this._level.invalidate();
        this._level = memento.level;
        this._level && this._level.invalidate();
        this._position = memento.position;
        this._pangle = memento.pangle;
        this._location = memento.location;
        this._angle = memento.angle;
    }

    refresh() {
        this._level && this._level.refreshArtifact(this);
    }

    setLocation(location, angle) {
        let elementRotation = angle ? Matrix2D.rotate(angle, new Point2D(0, 0)) : null;
        let center = elementRotation ? elementRotation.point(this._position) : this._position;
        this._location = new Point2D(location.x+center.x, location.y+center.y);
        this._angle = angle+this._pangle;
        this.refresh();
    }

    setOnBoard(board) {
        console.assert(board);
        console.assert(!this._level);
        this._level = board.getLevel(this._levelName);
        console.assert(this._level);
        this._level.addArtifact(this);
    }

    removeFromBoard() {
        console.assert(this._level);
        this._level.removeArtifact(this);
        delete this._level;
    }

    move(location, angle) {
        Memento.register(this);
        this.setLocation(location, angle);
    }

    show(board) {
        Memento.register(this);
        console.assert(!this._level);
        this._level = board.getLevel(this._levelName);
        this._level.showArtifact(this);
    }

    hide(board) {
        Memento.register(this);
        console.assert(this._level);
        this._level.hideArtifact(this);
        delete this._level;
    }

    containsLocalPoint(lpoint) {
        return this.area.inside(lpoint);
    }

    containsPoint(point) {
        return this.containsLocalPoint(this.getPosition(point));
    }

    get level() {
        return this._level;
    }

    get element() {
        return this._element;
    }

    get board() {
        return this.element.board;
    }

    set position(position) {
        this._position = position;
        if (this.element) {
            this.setLocation(this.element.location, this.element.angle);
        }
    }

    get position() {
        return this._position;
    }

    set pangle(angle) {
        this._pangle = angle;
        if (this.element) {
            this.setLocation(this.element.location, this.element.angle);
        }
    }

    get pangle() {
        return this._pangle;
    }

    get viewportLocation() {
        return this.level.transform.point(this.location);
    }
}

/**
 * Mixin containing methods for Artifact that have a rect shape
 */
export function RectArtifact(clazz) {
    return class extends clazz {

        constructor(dimension, ...args) {
            super(...args);
            this._dimension = dimension;
            this._area = new Area2D(-dimension.w/2, -dimension.h/2, dimension.w/2, dimension.h/2);
        }

        get dimension() {
            return this._dimension;
        }

        get area() {
            return this._area;
        }

        get boundingArea() {
            console.assert(this._level);
            return Area2D.rectBoundingArea(this.transform,
                -this.dimension.w/2, -this.dimension.h/2,
                this.dimension.w, this.dimension.h);
        }

    }
}

/**
 * Image wrapper artifact
 */
export class DImageArtifact extends RectArtifact(DArtifact) {

    constructor(levelName, image, position, dimension, pangle=0) {
        super(dimension, levelName, position, pangle);
        this._root = image;
    }

    setSettings(settings) {
        if (settings) {
            this._settings = settings;
        }
        else {
            delete this._settings;
        }
        this._level && this.refresh();
    }

    paint() {
        console.assert(this._level);
        let transform = this.angle ? Matrix2D.rotate(this.angle, this.location) : null;
        if (transform) {
            this._level.setTransformSettings(transform);
        }
        if (this._settings) {
            this._settings(this._level);
        }
        this._level.drawImage(this._root,
            new Point2D(this.location.x-this.dimension.w/2, this.location.y-this.dimension.h/2),
            this.dimension);
    }

}

/**
 * Gather/combine artifacts that represents a given concept
 */
export class DElement extends LocalisationAware(Object) {

    constructor(...artifacts) {
        super();
        this._artifacts = [...artifacts];
        this._angle = 0;
        this._location = new Point2D(0, 0);
        for (let artifact of this._artifacts) {
            artifact._setElement(this);
        }
    }

    addArtifact(artifact) {
        this._artifacts.push(artifact);
        artifact._setElement(this);
        return this;
    }

    _memento() {
        let memento = {
            location:this._location
        }
        if (this._board) {
            memento.board = this._board;
        }
        return memento;
    }

    _revert(memento) {
        if (memento.board) {
            this._board = memento.board;
        }
        else {
            delete this._board;
        }
        this._location = memento.location;
    }

    _setArtifactsLocation() {
        for (let artifact of this._artifacts) {
            artifact.setLocation(this._location, this._angle);
        }
    }

    setLocation(point) {
        this._location = point;
        this._setArtifactsLocation();
        return this;
    }

    setAngle(angle) {
        this._angle = angle;
        this._setArtifactsLocation();
        return this;
    }

    setOnBoard(board) {
        this._board = board;
        for (let artifact of this._artifacts) {
            artifact.setOnBoard(board);
        }
        return this;
    }

    removeFromBoard() {
        delete this._board;
        for (let artifact of this._artifacts) {
            artifact.removeFromBoard();
        }
        return this;
    }

    _moveArtifacts() {
        for (let artifact of this._artifacts) {
            artifact.move(this._location, this._angle);
        }
    }

    move(point) {
        Memento.register(this);
        this._location = point;
        this._moveArtifacts();
        return this;
    }

    rotate(angle) {
        Memento.register(this);
        this._angle = angle;
        this._moveArtifacts();
        return this;
    }

    show(board) {
        Memento.register(this);
        this._board = board;
        for (let artifact of this._artifacts) {
            artifact.show(board);
        }
        return this;
    }

    hide() {
        Memento.register(this);
        delete this._board;
        for (let artifact of this._artifacts) {
            artifact.hide();
        }
        return this;
    }

    refresh() {
        for (let artifact of this._artifacts) {
            artifact.refresh();
        }
    }

    get board() {
        return this._board;
    }

    get artifacts() {
        return this._artifacts;
    }
}

/**
 * A visualization level in a board. Accept artifacts
 */
export class DLevel {

    constructor(layer) {
        this._layer = layer;
        this._artifacts = new Set();
    }

    _memento() {
        return {
            artifacts:new Set(this._artifacts)
        }
    }

    _revert(memento) {
        this._artifacts = memento.artifacts;
        this._dirty = true;
    }

    addArtifact(artifact) {
        console.assert(!this._artifacts.has(artifact));
        this._artifacts.add(artifact);
        if (this._visibleArtifacts && artifact.boundingArea.intersect(this.visibleArea)) {
            this._visibleArtifacts.add(artifact);
        }
        this._dirty = true;
    }

    removeArtifact(artifact) {
        console.assert(this._artifacts.has(artifact));
        this._artifacts.delete(artifact);
        if (this._visibleArtifacts && this._visibleArtifacts.has(artifact)) {
            this._visibleArtifacts.delete(artifact);
        }
        this._dirty = true;
    }

    showArtifact(artifact) {
        Memento.register(this);
        this.addArtifact(artifact);
    }

    hideArtifact(artifact) {
        Memento.register(this);
        this.removeArtifact(artifact);
    }

    refreshArtifact(artifact) {
        console.assert(this._artifacts.has(artifact));
        if (this._visibleArtifacts) {
            let intersect = artifact.boundingArea.intersect(this.visibleArea);
            let visible = this._visibleArtifacts.has(artifact);
            if (!intersect && visible) {
                this._visibleArtifacts.delete(artifact);
            }
            else if (intersect && !visible) {
                this._visibleArtifacts.add(artifact);
            }
        }
        this._dirty = true;
    }

    invalidate() {
        delete this._visibleArtifacts;
        this._dirty = true;
    }

    get name() {
        return this._layer.name;
    }

    get visibleArea() {
        return this._layer.visibleArea;
    }

    get visibleArtifacts() {
        if (!this._visibleArtifacts) {
            let levelArea = this.visibleArea;
            this._visibleArtifacts = new Set();
            for (let artifact of this._artifacts) {
                if (artifact.boundingArea.intersect(levelArea)) {
                    this._visibleArtifacts.add(artifact);
                }
            }
        }
        return this._visibleArtifacts.values();
    }

    paint() {
        if (this._dirty) {
            this._layer.clear();
            for (let artifact of this.visibleArtifacts) {
                this._layer.withSettings(() => {
                    artifact.paint();
                });
            }
        }
        delete this._dirty;
    }

    drawImage(image, point, dimension) {
        this._layer.drawImage(image, point.x, point.y, dimension.w, dimension.h);
    }

    setTransformSettings(transform) {
        this._layer.setTransformSettings(transform);
    }

    setStrokeSettings(color, width) {
        this._layer.setStrokeSettings(color, width);
    }

    setFillSettings(color) {
        this._layer.setFillSettings(color);
    }

    setShadowSettings(color, width) {
        this._layer.setShadowSettings(color, width);
    }

    drawRect(anchor, dimension) {
        this._layer.drawRect(anchor, dimension);
    }

    fillRect(anchor, dimension) {
        this._layer.fillRect(anchor, dimension);
    }

    getAllArtifactsOnPoint(viewportPoint) {
        let point = this._layer.transform.invert().point(viewportPoint);
        let artifacts = [];
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            if (artifact.containsPoint(point)) {
                artifacts.push(artifact);
            }
        }
        return artifacts;
    }

    getArtifactOnPoint(viewportPoint) {
        let point = this._layer.transform.invert().point(viewportPoint);
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            if (artifact.containsPoint(point))
                return artifact;
        }
        return null;
    }

    isPointOnArtifact(artifact, viewportPoint) {
        console.assert(artifact.level === this);
        let point = this._layer.transform.invert().point(viewportPoint);
        return artifact.containsPoint(point);
    }

    get transform() {
        return this._layer.transform;
    }
}

/**
 * Playing board. Accept elements. Dispatch element's artifacts on its own levels.
 */
export class DBoard {

    constructor(dimension, viewportDimension, ...levels) {
        this._draw = new DDraw(viewportDimension);
        this._dimension = dimension;
        this._location = new Point2D(0, 0);
        this._zoomFactor = this.minZoomFactor;
        this._maxZoomFactor = DBoard.DEFAULT_MAX_ZOOM_FACTOR;
        this._zoomIncrement = DBoard.DEFAULT_ZOOM_INCREMENT;
        this._scrollIncrement = DBoard.DEFAULT_SCROLL_INCREMENT;
        this._borderWidth = DBoard.DEFAULT_BORDER_WIDTH;
        this._focusPoint = new Point2D(this.viewportDimension.w/2, this.viewportDimension.h/2);
        this._createLevels(levels);
        this._initMouseClickActions();
        this._initMouseMoveActions();
        this._initKeyDownActions();
        this._requestRepaint();
    }

    _createLevels(levels) {
        this._levels = new Map();
        this._levelsArray = []
        for (let layerItem of levels) {
            let layer = layerItem instanceof DLayer ? this._draw.addLayer(layerItem) : this._draw.createLayer(layerItem);
            let level = new DLevel(layer);
            this._levels.set(level.name, level);
            this._levelsArray.push(level);
        }
    }

    _initMouseClickActions() {
        this._mouseClickActions = [];
        this._draw.onMouseClick(event => {
            let processed = false;
            for (let action of this._mouseClickActions) {
                if (action(event)) {
                    processed = true;
                }
            }
            if (!processed) {
                let offset = new Point2D(event.offsetX, event.offsetY);
                let artifact = this.getArtifactOnPoint(offset);
                if (artifact && artifact.onMouseClick) {
                    this._focusArtifact = artifact;
                    artifact.onMouseClick(event);
                }
            }
            this.paint();
            Memento.open();
            return processed;
        });
    }

    _initMouseMoveActions() {
        this._mouseMoveActions = [];
        this._draw.onMouseMove(event => {
            let processed = false;
            for (let action of this._mouseMoveActions) {
                if (action(event)) {
                    processed = true;
                }
            }
            if (!processed) {
                let offset = new Point2D(event.offsetX, event.offsetY);
                let artifacts = this.getAllArtifactsOnPoint(offset);

                for (let artifact of artifacts) {
                    if (this._enteredArtifacts && this._enteredArtifacts.has(artifact)) {
                        this._enteredArtifacts.delete(artifact);
                    } else {
                        artifact.onMouseEnter && artifact.onMouseEnter(event);
                    }
                    if (artifact.onMouseMove) {
                        artifact.onMouseMove(event);
                    }
                }
                if (this._enteredArtifacts) {
                    for (let artifact of this._enteredArtifacts) {
                        artifact.onMouseLeave && artifact.onMouseLeave(event);
                    }
                }
                if (artifacts.length) {
                    this._enteredArtifacts = new Set(artifacts);
                }
                else {
                    delete this._enteredArtifacts;
                }
            }
            this.paint();
            return processed;
        });
    }

    _initKeyDownActions() {
        this._keyDownActions = [];
        this._draw.onKeyDown(event => {
            let processed = false;
            for (let action of this._keyDownActions) {
                if (action(event)) {
                    processed = true;
                    break;
                }
            }
            if (!processed) {
                if (this._focusArtifact) {
                    this._focusArtifact.onKeyDown && this._focusArtifact.onKeyDown(event);
                }
            }
            this.paint();
            Memento.open();
            return processed;
        });
    }

    paint() {
        for (let level of this._levels.values()) {
            level.paint();
        }
    }

    getLevel(levelName) {
        return this._levels.get(levelName);
    }

    _requestRepaint() {
        let boardCenter = this.getViewPortPoint(new Point2D(0, 0));
        let matrix =
            Matrix2D.translate(boardCenter).concat(
                Matrix2D.scale(new Point2D(this._zoomFactor, this._zoomFactor), boardCenter)
            );
        this._draw.setTransform(matrix);
        for (let level of this._levels.values()) {
            level.invalidate();
        }
    }

    getBoardPoint(vpoint) {
        let x = (vpoint.x-this.viewportDimension.w/2)/this._zoomFactor+this._location.x;
        let y = (vpoint.y-this.viewportDimension.h/2)/this._zoomFactor+this._location.y;
        return new Point2D(x, y);
    }

    getViewPortPoint(point) {
        let vx = (point.x-this._location.x)*this._zoomFactor + this.viewportDimension.w/2;
        let vy = (point.y-this._location.y)*this._zoomFactor + this.viewportDimension.h/2;
        return new Point2D(vx, vy);
    }

    zoom(vpoint, zoomFactor) {
        let anchor = this.getBoardPoint(vpoint);
        this._zoomFactor = zoomFactor;
        this._location = new Point2D(
            anchor.x-(vpoint.x-this.viewportDimension.w/2)/zoomFactor,
            anchor.y-(vpoint.y-this.viewportDimension.h/2)/zoomFactor);
        this._adjust();
        this._requestRepaint();
        Mechanisms.fire(this, DBoard.ZOOM_EVENT);
    }

    setZoomSettings(zoomIncrement, maxZoomFactor) {
        this._zoomIncrement = zoomIncrement;
        this._maxZoomFactor = maxZoomFactor;
    }

    get zoomIncrement() {
        return this._zoomIncrement;
    }

    get minZoomFactor() {
        return Math.max(this.viewportDimension.w/this.dimension.w, this.viewportDimension.h/this.dimension.h);
    }

    get maxZoomFactor() {
        return this._maxZoomFactor;
    }

    zoomIn(vpoint) {
        this.zoom(vpoint, this.zoomFactor/this.zoomIncrement);
    }

    zoomOut(vpoint) {
        this.zoom(vpoint, this.zoomFactor*this.zoomIncrement);
    }

    center(point) {
        this._location = point;
        this._adjust();
        this._requestRepaint();
    }

    recenter(vpoint) {
        let point = this.getBoardPoint(vpoint);
        this.center(point);
    }

    setScrollSettings(scrollIncrement, borderWidth) {
        this._scrollIncrement = scrollIncrement;
        this._borderWidth = borderWidth;
    }

    isOnLeftBorder(vpoint) {
        return vpoint.x <= this._borderWidth;
    }

    isOnRightBorder(vpoint) {
        return this.viewportDimension.w-vpoint.x <= this._borderWidth;
    }

    isOnTopBorder(vpoint) {
        return vpoint.y <= this._borderWidth;
    }

    isOnBottomBorder(vpoint) {
        return this.viewportDimension.h-vpoint.y <= this._borderWidth;
    }

    _scroll(dpoint) {
        this._location = new Point2D(
            this._location.x + dpoint.x/this.zoomFactor,
            this._location.y + dpoint.y/this.zoomFactor);
        this._adjust();
        this._requestRepaint();
        Mechanisms.fire(this, DBoard.SCROLL_EVENT);
    }

    scrollOnLeft() {
        this._scroll(new Point2D(-this._scrollIncrement, 0));
    }

    scrollOnRight() {
        this._scroll(new Point2D(this._scrollIncrement, 0));
    }

    scrollOnTop() {
        this._scroll(new Point2D(0, -this._scrollIncrement));
    }

    scrollOnBottom() {
        this._scroll(new Point2D(0, this._scrollIncrement));
    }

    _adjust() {
        if (this._zoomFactor<this.minZoomFactor) {
            this._zoomFactor=this.minZoomFactor;
        }
        if (this._zoomFactor>this.maxZoomFactor) {
            this._zoomFactor=this.maxZoomFactor;
        }
        let deltaX = this.viewportDimension.w/2/this._zoomFactor;
        if (deltaX>this._dimension.w/2+this._location.x) {
            this._location = new Point2D(deltaX-this._dimension.w/2, this._location.y);
        }
        if (deltaX>this._dimension.w/2-this._location.x) {
            this._location = new Point2D(this._dimension.w/2-deltaX, this._location.y);
        }
        let deltaY = this.viewportDimension.h/2/this._zoomFactor;
        if (deltaY>this._dimension.h/2+this._location.y) {
            this._location = new Point2D(this._location.x, deltaY-this._dimension.h/2);
        }
        if (deltaY>this._dimension.h/2-this._location.y) {
            this._location = new Point2D(this._location.x, this._dimension.h/2-deltaY);
        }
    }

    get zoomFactor() {
        return this._zoomFactor;
    }

    get location() {
        return this._location;
    }

    get dimension() {
        return this._dimension;
    }

    get viewportDimension() {
        return this._draw.dimension;
    }

    get root() {
        return this._draw.root;
    }

    onMouseClick(func) {
        console.assert(typeof(func)==="function");
        this._mouseClickActions.push(func);
    }

    onMouseMove(func) {
        console.assert(typeof(func)==="function");
        this._mouseMoveActions.push(func);
    }

    onKeyDown(func) {
        console.assert(typeof(func)==="function");
        this._keyDownActions.push(func);
    }

    scrollOnBorders(event) {
        let replay = false;
        let offset = new Point2D(event.offsetX, event.offsetY);
        if (this.isOnLeftBorder(offset)) {
            this.scrollOnLeft();
            replay=true;
        }
        if (this.isOnRightBorder(offset)) {
            this.scrollOnRight();
            replay=true;
        }
        if (this.isOnTopBorder(offset)) {
            this.scrollOnTop();
            replay=true;
        }
        if (this.isOnBottomBorder(offset)) {
            this.scrollOnBottom();
            replay=true;
        }
        return replay;
    }

    scrollOnBordersOnMouseMove() {
        this.onMouseMove(event=> {
            return this.scrollOnBorders(event);
        });
    }

    zoomInOut(event) {
        let offset = new Point2D(event.offsetX, event.offsetY);
        if (event.deltaX+event.deltaY+event.deltaZ>0) {
            this.zoomIn(offset);
        }
        else {
            this.zoomOut(offset);
        }
        this.paint();
    }

    zoomInOutOnMouseWheel() {
        this._draw.onMouseWheel(event=> {
            this.zoomInOut(event);
        });
    }

    scrollOnArrowKeys(event) {
        if (event.key === 'ArrowLeft') {
            this.scrollOnLeft();
            return true;
        }
        if (event.key === 'ArrowRight') {
            this.scrollOnRight();
            return true;
        }
        if (event.key === 'ArrowUp') {
            this.scrollOnTop();
            return true;
        }
        if (event.key === 'ArrowDown') {
            this.scrollOnBottom();
            return true;
        }
        return false;
    }

    scrollOnKeyDown() {
        this.onKeyDown(event => {
           return this.scrollOnArrowKeys(event);
        });
    }

    setFocusPointOnClick(event) {
        this._focusPoint = new Point2D(event.offsetX, event.offsetY);
    }

    zoomOnPageKeys(event) {
        if (event.key === 'PageUp') {
            this.zoomIn(this._focusPoint);
            return true;
        }
        if (event.key === 'PageDown') {
            this.zoomOut(this._focusPoint);
            return true;
        }
        return false;
    }

    zoomOnKeyDown() {
        this.onMouseClick(event => {
            this.setFocusPointOnClick(event);
        });
        this.onKeyDown(event => {
            return this.zoomOnPageKeys(event);
        });
    }

    undoRedoOnCtrlZY(event) {
        if ((event.key === 'z') && event.ctrlKey) {
            Memento.undo();
            return true;
        }
        if ((event.key === 'y') && event.ctrlKey) {
            Memento.redo();
            return true;
        }
        return false;
    }

    undoRedoOnKeyDown() {
        this.onKeyDown(event => {
            return this.undoRedoOnCtrlZY(event);
        });
    }

    getAllArtifactsOnPoint(viewportPoint) {
        let artifacts = [];
        for (let i = this._levelsArray.length-1; i>=0; i--) {
            let artifact = this._levelsArray[i].getAllArtifactsOnPoint(viewportPoint);
            artifacts.push(...artifact);
        }
        return artifacts;
    }

    getArtifactOnPoint(viewportPoint) {
        for (let i = this._levelsArray.length-1; i>=0; i--) {
            let artifact = this._levelsArray[i].getArtifactOnPoint(viewportPoint);
            if (artifact) return artifact;
        }
        return null;
    }

    isPointOnArtifact(artifact, viewportPoint) {
        console.assert(artifact.level);
        return artifact.level.isPointOnArtifact(artifact, viewportPoint);
    }

}
DBoard.DEFAULT_MAX_ZOOM_FACTOR = 10;
DBoard.DEFAULT_ZOOM_INCREMENT = 1.5;
DBoard.DEFAULT_BORDER_WIDTH = 10;
DBoard.DEFAULT_SCROLL_INCREMENT = 10;
DBoard.SCROLL_EVENT = "board-scroll";
DBoard.ZOOM_EVENT = "board-zoom";