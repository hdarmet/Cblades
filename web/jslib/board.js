'use strict';

import {
    Matrix2D, Point2D, Area2D, Dimension2D
} from "./geometry.js";
import {
    DAnimation, DAnimator,
    DDraw, DLayer, DStaticLayer
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

    constructor(levelName, position = new Point2D(0, 0), pangle=0) {
        super();
        this._levelName = levelName;
        this._position = position;
        this._pangle = pangle;
        this._alpha = 1;
        this._location = position;
        this._angle = pangle;
    }

    _setElement(element) {
        if (element) {
            this._element = element;
            this.setLocation(this.element.location, this.element.angle);
        }
        else {
            delete this._element;
        }
    }

    _attach(element) {
        Memento.register(this);
        if (element) {
            this._element = element;
            this.move(this.element.location, this.element.angle);
        }
        else {
            delete this._element;
        }
    }

    _memento() {
        let memento = {
            levelName: this._levelName,
            level: this._level,
            element: this._element,
            position:this._position,
            pangle:this._pangle,
            alpha:this._alpha,
            location:this._location,
            angle:this._angle,
            settings:this._settings
        }
        return memento;
    }

    _revert(memento) {
        this._levelName = memento.levelName;
        this._level && this._level.invalidate();
        this._level = memento.level;
        this._level && this._level.invalidate();
        this._element = memento.element;
        this._position = memento.position;
        this._pangle = memento.pangle;
        this._alpha = memento.alpha;
        this._location = memento.location;
        this._angle = memento.angle;
        this._settings = memento.settings;
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

    paint() {
        console.assert(this._level);
        this._level.setTransformSettings(this.transform);
        if (this._settings) {
            this._settings(this._level);
        }
        if (this._alpha<1) {
            this._level.setAlphaSettings(this._alpha);
        }
        this._paint();
    }

    changeLevel(levelName) {
        console.assert(this._level);
        Memento.register(this);
        this._level.hideArtifact(this);
        this._levelName = levelName;this._level = this.board.getLevel(this._levelName);
        this._level.showArtifact(this);
    }

    shift(position) {
        Memento.register(this);
        this.position = position;
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
        this.refresh();
    }

    get position() {
        return this._position;
    }

    set pangle(angle) {
        this._pangle = angle;
        if (this.element) {
            this.setLocation(this.element.location, this.element.angle);
        }
        this.refresh();
    }

    get pangle() {
        return this._pangle;
    }

    set alpha(alpha) {
        this._alpha = alpha;
        this.refresh();
    }

    get alpha() {
        return this._alpha;
    }

    setSettings(settings) {
        if (settings) {
            this._settings = settings;
        }
        else {
            delete this._settings;
        }
        this.refresh();
    }

    changeSettings(settings) {
        Memento.register(this);
        this.setSettings(settings);
    }

    get viewportTransform() {
        let transform = this.transform;
        return transform ? this.level.transform.concat(transform) : this.level.transform;
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
            console.assert(dimension instanceof Dimension2D);
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
            return Area2D.rectBoundingArea(this.transform,
                -this.dimension.w/2, -this.dimension.h/2,
                this.dimension.w, this.dimension.h);
        }

        get viewportBoundingArea() {
            console.assert(this._level);
            return Area2D.rectBoundingArea(this.viewportTransform,
                -this.dimension.w/2, -this.dimension.h/2,
                this.dimension.w, this.dimension.h);
       }

    }
}

/**
 * Base class for all image wrapper artifact
 */
export class DImageAbstractArtifact extends RectArtifact(DArtifact) {

    constructor(dimension, levelName, position, pangle=0) {
        super(dimension, levelName, position, pangle);
    }

    _memento() {
        let memento = super._memento();
        if (this._settings) {
            memento.settings = this._settings;
        }
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento.settings) {
            this._settings = memento.settings;
        }
        else {
            delete this._settings;
        }
    }

    get image() {
        return this._root;
    }

    drawImage() {
        this._level.drawImage(this.image,
            new Point2D(-this.dimension.w/2, -this.dimension.h/2),
            this.dimension);
    }

    _paint() {
        this.drawImage();
    }

}

export class DTextArtifact extends RectArtifact(DArtifact) {

    constructor(level, position, dimension,
                strokeColor, fillColor,
                shadowColor, shadowWidth,
                font, align, text) {
        super(dimension, level, position);
        this._strokeColor = strokeColor;
        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowWidth = shadowWidth;
        this._font = font;
        this._align = align;
        this._text = text;
    }

    _memento() {
        let memento = super._memento();
        memento.text = this._text;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._text = memento.text;
    }

    setText(text) {
        Memento.register(this);
        this._text = text;
        this.refresh();
    }

    _paint() {
        console.assert(this._level);
        this._level.setTextSettings(this._font, this._align);
        this._level.setShadowSettings(this._shadowColor, this._shadowWidth)
        this._level.setStrokeSettings(this._strokeColor, 3);
        this._level.drawText(this._text, new Point2D(0, 0));
        this._level.setFillSettings(this._fillColor);
        this._level.fillText(this._text, new Point2D(0, 0));
    }

}

/**
 * Image wrapper artifact
 */
export class DImageArtifact extends DImageAbstractArtifact {

    constructor(levelName, image, position, dimension, pangle=0) {
        super(dimension, levelName, position, pangle);
        this._root = image;
    }

}

/**
 * Multiple images wrapper artifact
 */
export class DMultiImageArtifact extends DImageAbstractArtifact {

    constructor(levelName, images, position, dimension, pangle=0) {
        super(dimension, levelName, position, pangle);
        console.assert(images.length);
        this._images = images;
        this._root = images[0];
    }

    setImage(index) {
        console.assert(index >= 0 && index < this._images.length);
        this._root = this._images[index];
        this.refresh();
    }

    changeImage(index) {
        Memento.register(this);
        this.setImage(index);
    }

    _memento() {
        let memento = super._memento();
        memento.root = this._root;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._root = memento.root;
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
        this._setArtifactLocation(artifact);
        if (this._board) {
            artifact.setOnBoard(this._board);
        }
        return this;
    }

    removeArtifact(artifact) {
        this._artifacts.splice(this._artifacts.indexOf(artifact), 1);
        artifact._setElement(null);
        if (this._board) {
            artifact.removeFromBoard();
        }
        return this;
    }

    appendArtifact(artifact) {
        Memento.register(this);
        this._artifacts.push(artifact);
        artifact._attach(this);
        this._setArtifactLocation(artifact);
        if (this._board) {
            artifact.show(this._board);
        }
        return this;
    }

    deleteArtifact(artifact) {
        Memento.register(this);
        this._artifacts.splice(this._artifacts.indexOf(artifact), 1);
        artifact._attach(null);
        if (this._board) {
            artifact.hide();
        }
        return this;
    }

    _memento() {
        let memento = {
            artifacts: [...this._artifacts],
            location:this._location,
            angle:this._angle
        }
        if (this._board) {
            memento.board = this._board;
        }
        return memento;
    }

    _revert(memento) {
        this._artifacts = memento.artifacts;
        if (memento.board) {
            this._board = memento.board;
        }
        else {
            delete this._board;
        }
        this._location = memento.location;
        this._angle = memento.angle;
    }

    _setArtifactLocation(artifact) {
        artifact.setLocation(this._location, this._angle);
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

    get boundingArea() {
        let area = this._artifacts[0].boundingArea;
        for (let index=1; index<this._artifacts.length; index++) {
            area = area.add(this._artifacts[index].boundingArea);
        }
        return area;
    }

    get board() {
        return this._board;
    }

    get artifacts() {
        return this._artifacts;
    }

    get location() {
        return this._location;
    }

    get angle() {
        return this._angle;
    }

}

/**
 * A visualization level in a board. Accept artifacts
 */
export class DLevel {

    constructor() {
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

    get artifacts() {
        return this._artifacts;
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
            this.clear();
            for (let artifact of this.visibleArtifacts) {
                this.forArtifact(artifact);
                this.layer.withSettings(() => {
                    artifact.paint();
                });
            }
        }
        delete this._dirty;
    }

    drawImage(image, point, dimension) {
        this.layer.drawImage(image, point.x, point.y, dimension.w, dimension.h);
    }

    setTransformSettings(transform) {
        this.layer.setTransformSettings(transform);
    }

    setStrokeSettings(color, width) {
        this.layer.setStrokeSettings(color, width);
    }

    setFillSettings(color) {
        this.layer.setFillSettings(color);
    }

    setShadowSettings(color, width) {
        this.layer.setShadowSettings(color, width);
    }

    setAlphaSettings(alpha) {
        this.layer.setAlphaSettings(alpha);
    }

    drawRect(anchor, dimension) {
        this.layer.drawRect(anchor, dimension);
    }

    fillRect(anchor, dimension) {
        this.layer.fillRect(anchor, dimension);
    }

    setTextSettings(font, align) {
        this.layer.setTextSettings(font, align);
    }

    drawText(anchor, text) {
        this.layer.drawText(anchor, text);
    }

    fillText(anchor, text) {
        this.layer.fillText(anchor, text);
    }

    get transform() {
        return this.layer.transform;
    }

    get viewportDimension() {
        return this.layer.dimension;
    }
}

/**
 * A visualization level that use only one layer
 */
export class DBasicLevel extends DLevel {

    constructor(layer) {
        super();
        this._layer = layer;
    }

    get layer() {
        return this._layer;
    }

    forArtifact(artifact) {
    }

    clear() {
        this._layer.clear();
    }

    setDraw(draw) {
        draw.addLayer(this.layer);
    }

    get name() {
        return this.layer.name;
    }

    get visibleArea() {
        return this.layer.visibleArea;
    }

    getPoint(viewportPoint) {
        return this.layer.transform.invert().point(viewportPoint);
    }

    getViewportPoint(point) {
        return this.layer.transform.point(point);
    }

    getAllArtifactsOnPoint(viewportPoint) {
        let point = this.getPoint(viewportPoint);
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
        let point = this.getPoint(viewportPoint);
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
        let point = this.getPoint(viewportPoint);
        return artifact.containsPoint(point);
    }

    getOriginalPoint(artifact) {
        return this.getPoint(new Point2D(0, 0));
    }

    getFinalPoint(artifact) {
        return this.getPoint(new Point2D(this.layer.dimension.w, this.layer.dimension.h));
    }
}

/**
 * A visualization level that use only one layer
 */
export class DLayeredLevel extends DLevel {

    constructor(name, select, ...layers) {
        super();
        this._name = name;
        this._layers = layers;
        for (let index=0; index<this._layers.length; index++) {
            this._layers[index].index = index;
        }
        this._select = select;
    }

    get name() {
        return this._name;
    }

    get visibleArea() {
        return this._layers[0].visibleArea;
    }

    get layer() {
        console.assert(this._layer);
        return this._layer;
    }

    get layers() {
        console.assert(this._layers.length);
        return this._layers;
    }

    addLayer(layer) {
        this._draw.insertLayerAfter(layer, this._layers[this._layers.length-1]);
        layer.index = this._layers.length;
        this._layers.push(layer);
    }

    forArtifact(artifact) {
        this._layer = this._select(artifact, this._layers);
    }

    setDraw(draw) {
        this._draw = draw;
        for (let layer of this._layers) {
            this._draw.addLayer(layer);
        }
    }

    clear() {
        for (let layer of this._layers) {
            layer.clear();
        }
    }

    getPoint(viewportPoint, artifact) {
        let layer = this._select(artifact, this._layers);
        return layer.transform.invert().point(viewportPoint);
    }

    getViewportPoint(point, artifact) {
        let layer = this._select(artifact, this._layers);
        return layer.transform.point(point);
    }

    getAllArtifactsOnPoint(viewportPoint) {
        let artifacts = [];
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            let layer = this._select(artifact, this._layers);
            let point = layer.transform.invert().point(viewportPoint);
            if (artifact.containsPoint(point)) {
                artifact.__layer = layer;
                artifacts.push(artifact);
            }
        }
        return artifacts.sort((artifact1, artifact2)=>artifact2.__layer.index-artifact1.__layer.index);
    }

    getArtifactOnPoint(viewportPoint) {
        let artifacts = this.getAllArtifactsOnPoint(viewportPoint);
        return artifacts.length ? artifacts[0] : null;
    }

    isPointOnArtifact(artifact, viewportPoint) {
        console.assert(artifact.level === this);
        let point = this.getPoint(viewportPoint, artifact);
        return artifact.containsPoint(point);
    }

    getOriginalPoint(artifact) {
        return this.getPoint(new Point2D(0, 0), artifact);
    }

    getFinalPoint(artifact) {
        return this.getPoint(new Point2D(this.layer.dimension.w, this.layer.dimension.h), artifact);
    }
}

export class DStackedLevel extends DLayeredLevel {

    constructor(name, selectSlot, selectLayer, createSlot) {
        let select = artifact => {
            let slotIndex = selectSlot(artifact);
            let slot = this.getSlot(slotIndex);
            return selectLayer(artifact, slot);
        }

        let slot = createSlot(0);
        super(name, select, ...slot);
        this._slotSize = slot.length;
        this._createSlot = createSlot;
    }

    _addSlot() {
        let index = this._layers.length/this._slotSize;
        let layers = this._createSlot(index);
        for (let layer of layers) {
            this.addLayer(layer);
        }
    }

    getSlot(index) {
        let first = index*this._slotSize;
        while (first >= this._layers.length) {
            this._addSlot();
        }
        let result = [];
        let last = first + this._slotSize;
        for (let lindex=first; lindex<last; lindex++) {
            result.push(this._layers[lindex]);
        }
        return result;
    }

}

export class DSimpleLevel extends DBasicLevel {

    constructor(name) {
        super(new DLayer(name));
    }

}

export class DStaticLevel extends DBasicLevel {

    constructor(name) {
        super(new DStaticLayer(name));
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
        this._registerLevels(levels);
        this._initMouseClickActions();
        this._initMouseMoveActions();
        this._initKeyDownActions();
        this._requestRepaint();
        DAnimator.setFinalizer(()=>this.paint());
    }

    _registerLevels(levels) {
        this._levels = new Map();
        this._levelsArray = []
        for (let level of levels) {
            level.setDraw(this._draw);
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
                let artifact = this.getArtifactOnPoint(offset);
                if (artifact !== this._mouseOverArtifact) {
                    if (this._mouseOverArtifact) {
                        this._mouseOverArtifact.onMouseLeave && this._mouseOverArtifact.onMouseLeave(event);
                    }
                    this._mouseOverArtifact = artifact;
                    if (this._mouseOverArtifact) {
                        this._mouseOverArtifact.onMouseEnter && this._mouseOverArtifact.onMouseEnter(event);
                    }
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

    repaint() {
        for (let level of this._levels.values()) {
            level.invalidate();
        }
        this.paint();
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

export class DArtifactAnimation extends DAnimation {

    constructor(artifact, startTick) {
        super();
        this._artifact = artifact;
        this.play(startTick+1);
    }

    _draw(count, ticks) {
        if (count===0) {
            if (this._artifact._animation) {
                this._artifact._animation.cancel();
            }
            this._artifact._animation = this;
            this.init && this.init();
        }
        return this.draw(count, ticks);
    }

    _finalize() {
        this.close && this.close();
        delete this._artifact._animation;
    }

}

export class DArtifactRotateAnimation extends DArtifactAnimation {

    constructor(artifact, angle, startTick, duration, clockWise=true) {
         super(artifact, startTick);
         this._angle = angle;
         this._duration = duration;
         this._clockWise = clockWise;
    }

    _factor(count) {
        return this._clockWise ? (count * 20) / this._duration : (this._duration - count * 20)/this._duration;
    }

    init() {
        this._pangle = this._artifact.pangle;
    }

    draw(count, ticks) {
        this._artifact.pangle = this._pangle + this._factor(count)*this._angle;
        return count * 20 >= this._duration ? 0 : 1;
    }

    close() {
        this._artifact.pangle = this._pangle + this._angle;
    }

}

export class DArtifactAlphaAnimation extends DArtifactAnimation {

    constructor(artifact, alpha, startTick, duration) {
        super(artifact, startTick);
        this._alpha = alpha;
        this._duration = duration;
    }

    init() {
        this._initAlpha = this._artifact.alpha;
    }

    _factor(count) {
        return (count * 20) / this._duration;
    }

    draw(count, ticks) {
        this._artifact.alpha = this._initAlpha + (this._alpha - this._initAlpha)*this._factor(count);
        return count * 20 >= this._duration ? 0 : 1;
    }

    close() {
        this._artifact.alpha = this._alpha;
    }

}
