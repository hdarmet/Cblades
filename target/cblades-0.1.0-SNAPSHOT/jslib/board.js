'use strict';

import {
    Matrix2D, Point2D, Area2D, Dimension2D
} from "./geometry.js";
import {
    ADELAY,
    DAnimation, DAnimator,
    DDraw, DLayer, DStaticLayer
} from "./draw.js";
import {
    Mechanisms,
    Memento
} from "./mechanisms.js";

/**
 * Mixin for classes whose instances deals with location and orientation on the board. DElements and their contained
 * DArtifacts are localization aware.
 * @param clazz
 * @returns {{new(...[*]): {readonly angle: *, getPosition(*=): *, readonly transform: *|null, getLocation(*=): *, readonly location: *}, prototype: {readonly angle: *, getPosition(*=): *, readonly transform: *|null, getLocation(*=): *, readonly location: *}}}
 * @constructor
 */
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
 * Base class that can be shown on a board level
 */
export class DArtifact extends LocalisationAware(Object) {

    /**
     * initializes the artifact
     * @param levelName name of the level on which the artifact is going to put on
     * @param position position on the board (in board content coordinate) of the "anchor" (generally the center) of
     * the artifact
     * @param pangle angle of the artifact
     */
    constructor(levelName, position = new Point2D(0, 0), pangle=0) {
        super();
        this._levelName = levelName;
        this._position = position;
        this._pangle = pangle;
        this._alpha = 1;
        this._location = position;
        this._angle = pangle;
    }

    /**
     * sets a reference to the element the artifact belongs to. This operation CANNOT be undoed.
     * @param element owner of the artifact
     * @private
     */
    _setElement(element) {
        if (element) {
            this._element = element;
            this.setLocation(this.element.location, this.element.angle);
        }
        else {
            delete this._element;
        }
    }

    /**
     * sets a reference to the element the artifact belongs to. This operation CAN be undoed.
     * @param element owner of the artifact
     * @private
     */
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

    /**
     * builds a record containing the base
     * @return a record containing the base
     * @private
     */
    _memento() {
        let memento = {
            levelName: this._levelName,
            level: this._level,
            element: this._element,
            position:this._position,
            pangle:this._pangle,
            alpha:this._alpha,
            location:this._location,
            angle:this._angle
        }
        if (this._settings) {
            memento.settings = this._settings;
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
        if (memento.settings) {
            this._settings = memento.settings;
        }
        else {
            delete this._settings;
        }
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
        if (this.alpha<1) {
            this._level.setAlphaSettings(this.alpha);
        }
        this._paint();
    }

    setLevel(levelName) {
        if (this._level) {
            this._level.removeArtifact(this);
        }
        this._levelName = levelName;
        if (this.board) {
            this._level = this.board.getLevel(this._levelName);
            this._level.addArtifact(this);
        }
    }

    changeLevel(levelName) {
        Memento.register(this);
        if (this._level) {
            this._level.hideArtifact(this);
        }
        this._levelName = levelName;
        if (this.board) {
            this._level = this.board.getLevel(this._levelName);
            this._level.showArtifact(this);
        }
    }

    shift(position) {
        Memento.register(this);
        this.position = position;
    }

    turn(angle) {
        Memento.register(this);
        this.pangle = angle;
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

    mayCaptureEvent(event) {
        return this.alpha>0 && this.level.getPixel(this, new Point2D(event.offsetX, event.offsetY))[3]>127
    }

    isShown() {
        return !!this._level;
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
        return (this.element?this.element.alpha:1)*this._alpha;
    }

    setSettings(settings) {
        if (settings) {
            this._settings = settings;
        }
        else {
            delete this._settings;
        }
        this.refresh();
        return this;
    }

    changeSettings(settings) {
        Memento.register(this);
        this.setSettings(settings);
    }

    getPoint(viewportPoint) {
        return this.viewportTransform.invert().point(viewportPoint);
    }

    getViewportPoint(point) {
        return this.viewportTransform.point(point);
    }

    get viewportTransform() {
        this.level.forArtifact(this);
        let transform = this.transform;
        return transform ? transform.concat(this.level.transform) : this.level.transform;
    }

    get viewportLocation() {
        this.level.forArtifact(this);
        return this.level.transform.point(this.location);
    }

    onMouseClick(event) {
        return false;
    }

    onMouseEnter(event) {
        return false;
    }

    onMouseLeave(event) {
        return false;
    }
}

export class DPedestalArtifact extends DArtifact {

    constructor(artifact, levelName, position = new Point2D(0, 0), pangle=0) {
        super(levelName, position, pangle);
        this._artifact = artifact;
    }

    _memento() {
        let memento = super._memento();
        memento.artifact = this._artifact;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._artifact = memento.artifact;
    }

    _paint() {
        this._artifact._level = this._level;
        this._artifact._element = this._element;
        this._artifact._paint();
    }

    get artifact() {
        return this._artifact;
    }

    set artifact(artifact) {
        this._artifact = artifact;
        this.refresh();
    }

    changeArtifact(artifact) {
        Memento.register(this);
        this._artifact = artifact;
        this.refresh();
    }

    get boundingArea() {
        return this.artifact ? this.artifact.boundingArea : null;
    }

    get area() {
        return this.artifact ? this.artifact.area : null;
    }
}

/**
 * Mixin containing methods for Artifact that have a rect shape
 */
export function AreaArtifact(clazz) {
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

        set dimension(dimension) {
            this._dimension = dimension;
            this.refresh();
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

export function RectArtifact(clazz) {

    return class extends clazz {

        _setRectSettings(strokeWidth, strokeColor, fillColor) {
            this._rectStrokeWidth = strokeWidth;
            this._rectStrokeColor = strokeColor;
            this._rectFillColor = fillColor;
        }

        get strokeWidth() {
            return this._rectStrokeWidth;
        }

        get strokeColor() {
            return this._rectStrokeColor;
        }

        get fillColor() {
            return this._rectFillColor;
        }

        drawRect() {
            this._level.setStrokeSettings(this.strokeColor, this.strokeWidth);
            this._level.drawRect(
                new Point2D(-this.dimension.w/2, -this.dimension.h/2),
                this.dimension);
        }

        fillRect() {
            this._level.setFillSettings(this.fillColor);
            this._level.fillRect(
                new Point2D(-this.dimension.w/2, -this.dimension.h/2),
                this.dimension);
        }

        _paintRect() {
            if (this.fillColor) this.fillRect();
            if (this.strokeColor) this.drawRect();
        }

    }

}
/**
 * Base class for all simple rectangular artifact
 */
export class DRectArtifact extends RectArtifact(AreaArtifact(DArtifact)) {

    constructor(levelName, position, dimension, strokeWidth, strokeColor, fillColor, pangle=0) {
        super(dimension, levelName, position, pangle);
        this._setRectSettings(strokeWidth, strokeColor, fillColor);
    }

    _paint() {
        this._paintRect();
    }

}

export function TextArtifact(clazz) {

    return class extends clazz {

        _setTextSettings(strokeColor, fillColor, strokeWidth, shadowColor, shadowWidth, font, align, baseline, text) {
            this._textStrokeColor = strokeColor;
            this._textFillColor = fillColor;
            this._textStrokeWidth = strokeWidth;
            this._textShadowColor = shadowColor;
            this._textShadowWidth = shadowWidth;
            this._textFont = font;
            this._textAlign = align;
            this._textBaseline = baseline;
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

        _paintText() {
            console.assert(this._level);
            this._level.setTextSettings(this._textFont, this._textAlign, this._textBaseline);
            this._level.setShadowSettings(this._textShadowColor, this._textShadowWidth);
            this._level.setStrokeSettings(this._textStrokeColor, this._textStrokeWidth);
            this._level.drawText(this._text, new Point2D(0, 0));
            this._level.setFillSettings(this._textFillColor);
            this._level.fillText(this._text, new Point2D(0, 0));
        }

    }

}

export class DTextArtifact extends TextArtifact(AreaArtifact(DArtifact)) {

    constructor(level, position, dimension,
                strokeColor, fillColor, strokeWidth,
                shadowColor, shadowWidth,
                font, align, baseline, text) {
        super(dimension, level, position);
        this._setTextSettings(strokeColor, fillColor, strokeWidth, shadowColor, shadowWidth, font, align, baseline, text);
    }

    _paint() {
        this._paintText();
    }

}

/**
 * Base class for all image wrapper artifact
 */
export class DImageAbstractArtifact extends AreaArtifact(DArtifact) {

    constructor(dimension, levelName, position, sPosition = null, sDimension=null) {
        super(dimension, levelName, position, 0);
        this._sourcePosition = sPosition;
        this._sourceDimension = sDimension;
    }

    get image() {
        return this._root;
    }

    get sourcePosition() {
        return this._sourcePosition;
    }

    set sourcePosition(position) {
        this._sourcePosition = position;
        this.refresh();
    }

    get sourceDimension() {
        return this._sourceDimension;
    }

    set sourceDimension(dimension) {
        this._sourceDimension = dimension;
        this.refresh();
    }

    drawImage() {
        console.assert(!this._sourcePosition === !this._sourceDimension);
        if (this._sourceDimension) {
            this._level.drawImage(this.image,
                this.sourcePosition, this.sourceDimension,
                new Point2D(-this.dimension.w / 2, -this.dimension.h / 2),
                this.dimension);
        }
        else {
            this._level.drawImage(this.image,
                new Point2D(-this.dimension.w / 2, -this.dimension.h / 2),
                this.dimension);
        }
    }

    _paint() {
        this.drawImage();
    }

}

/**
 * Image wrapper artifact
 */
export class DImageArtifact extends DImageAbstractArtifact {

    constructor(levelName, image, position, dimension, imageDimension=null, imagePosition=null) {
        super(dimension, levelName, position, imageDimension, imagePosition);
        this._root = image;
    }

}

/**
 * Multiple images wrapper artifact
 */
export class DMultiImagesArtifact extends DImageAbstractArtifact {

    constructor(levelName, images, position, dimension, imageDimension=null, imagePosition=null) {
        super(dimension, levelName, position, imageDimension, imagePosition);
        console.assert(images.length);
        this._images = images;
        this._root = images[0];
        this._index = 0;
    }

    get images() {
        return this._images;
    }

    get imageIndex() {
        return this._index;
    }

    setImage(index) {
        console.assert(index >= 0 && index < this._images.length);
        this._index = index;
        this._root = this._images[index];
        this.refresh();
    }

    changeImage(index) {
        Memento.register(this);
        this.setImage(index);
    }

    _memento() {
        let memento = super._memento();
        memento.index = this._index;
        memento.root = this._root;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._index = memento.index;
        this._root = memento.root;
    }

}

/**
 * Class of artifacts that are composed of several images (or parts of)
 */
export class DComposedImageArtifact extends AreaArtifact(DArtifact) {

    constructor(levelName, position, dimension) {
        super(dimension, levelName, position, 0);
        this._compositions = [];
    }

    addComposition(image, destArea, sourceArea) {
        console.assert(destArea instanceof Area2D && sourceArea instanceof Area2D);
        this._compositions.push({image, destArea, sourceArea});
        this.refresh();
        return this;
    }

    appendComposition(image, destArea, sourceArea) {
        Memento.register(this);
        return this.addComposition(image, destArea, sourceArea);
    }

    setComposition(index, image, destArea, sourceArea) {
        console.assert(index<this._compositions.length);
        console.assert(destArea instanceof Area2D && sourceArea instanceof Area2D);
        this._compositions[index] = {image, destArea, sourceArea};
        this.refresh();
        return this;
    }

    changeComposition(index, image, destArea, sourceArea) {
        Memento.register(this);
        return this.setComposition(index, image, destArea, sourceArea);
    }

    getComposition(index) {
        if (index<this._compositions.length) {
            return {...this._compositions[index]};
        }
        else return null;
    }

    removeComposition(index) {
        console.assert(index<this._compositions.length);
        this._compositions.splice(index, 1);
        this.refresh();
        return this;
    }

    deleteComposition(index) {
        Memento.register(this);
        return this.removeComposition(index);
    }

    _memento() {
        let memento = super._memento();
        memento.compositions = [];
        for (let index=0; index<this._compositions.length; index++) {
            memento.compositions.push({...this._compositions[index]});
        }
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._compositions = memento.compositions;
    }

    getImage(index) {
        return this._compositions[index].image;
    }

    getSourceArea(index) {
        return this._compositions[index].sourceArea;
    }

    getDestArea(index) {
        return this._compositions[index].destArea;
    }

    drawImage(index) {
        let srcArea = this.getSourceArea(index);
        let destArea = this.getDestArea(index);
        this._level.drawImage(this._compositions[index].image,
            srcArea.origin, srcArea.dimension,
            destArea.origin.minusDim(this.dimension.half), destArea.dimension);
    }

    _paint() {
        for (let index=0; index<this._compositions.length; index++) {
            this.drawImage(index);
        }
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
        this._alpha = 1;
        this._location = new Point2D(0, 0);
        for (let artifact of this._artifacts) {
            artifact._setElement(this);
        }
    }

    hasArtifact(artifact) {
        return this._artifacts.indexOf(artifact)>=0;
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
        console.assert(this._artifacts.indexOf(artifact)>=0);
        this._artifacts.remove(artifact);
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
        console.assert(this._artifacts.contains(artifact));
        Memento.register(this);
        this._artifacts.remove(artifact);
        artifact._attach(null);
        if (this._board) {
            artifact.hide(this._board);
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

    isShown() {
        return !!this.board;
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

    get alpha() {
        return this._alpha;
    }

    _setAlpha(alpha) {
        this._alpha = alpha;
        this.refresh();
    }

    set alpha(alpha) {
        this._setAlpha(alpha);
    }
}

export class DComposedElement extends DElement {

    constructor(...args) {
        super(...args);
        this._elements = [];
    }

    _memento() {
        let memento = super._memento();
        memento.elements = [...this._elements];
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._elements = memento.elements;
    }

    hasElement(element) {
        return this._elements.indexOf(element)>=0;
    }

    addElement(element) {
        console.assert(!this.hasElement(element));
        this._elements.push(element);
        element.setLocation(this.location);
        element.setAngle(this.angle);
        if (this.board) {
            element.setOnBoard(this.board);
        }
    }

    removeElement(element) {
        console.assert(this.hasElement(element));
        this._elements.remove(element);
        element.setLocation(new Point2D(0, 0));
        element.setAngle(0);
        if (this.board) {
            element.removeFromBoard(this.board);
        }
    }

    appendElement(element) {
        Memento.register(this);
        console.assert(!this.hasElement(element));
        this._elements.push(element);
        element.move(this.location);
        element.rotate(this.angle);
        if (this.board) {
            element.show(this.board);
        }
    }

    deleteElement(element) {
        Memento.register(this);
        console.assert(this.hasElement(element));
        this._elements.remove(element);
        Memento.register(element);
        element.move(new Point2D(0, 0));
        element.rotate(0);
        if (this.board) {
            element.hide(this.board);
        }
    }

    setAngle(angle) {
        super.setAngle(angle);
        for (let element of this.elements) {
            element.setAngle(angle);
        }
        return this;
    }

    setLocation(point) {
        super.setLocation(point);
        for (let element of this.elements) {
            element.setLocation(point);
        }
        return this;
    }

    get elements() {
        return this._elements;
    }

    setOnBoard(board) {
        super.setOnBoard(board);
        for (let element of this.elements) {
            element.setOnBoard(board);
        }
        return this;
    }

    removeFromBoard() {
        super.removeFromBoard();
        for (let element of this.elements) {
            element.removeFromBoard();
        }
        return this;
    }

    move(point) {
        super.move(point);
        for (let element of this.elements) {
            element.move(point);
        }
        return this;
    }

    rotate(angle) {
        super.rotate(angle);
        for (let element of this.elements) {
            element.rotate(angle);
        }
        return this;
    }

    show(board) {
        super.show(board);
        for (let element of this.elements) {
            element.show(board);
        }
        return this;
    }

    hide() {
        super.hide();
        for (let element of this.elements) {
            element.hide();
        }
        return this;
    }

    get boundingArea() {
        let area = super.boundingArea;
        for (let index=0; index<this.elements.length; index++) {
            area = area.add(this.elements[index].boundingArea);
        }
        return area;
    }

    _setAlpha(alpha) {
        super._setAlpha(alpha);
        for (let element of this.elements) {
            element._setAlpha(alpha);
        }
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

    /**
     * registers an artifact on the level. This registration CANNOT be undoed
     * @param artifact artifact to register. This artifact MUST NOT BE registered prior of this call
     */
    addArtifact(artifact) {
        console.assert(!this._artifacts.has(artifact));
        this._artifacts.add(artifact);
        if (this._visibleArtifacts && artifact.boundingArea &&
            artifact.boundingArea.intersect(this.visibleArea)) {
            this._visibleArtifacts.add(artifact);
        }
        this._dirty = true;
    }

    /**
     * unregisters an artifact on the level. This registration CANNOT be undoed
     * @param artifact artifact to unregister. This artifact MUST BE registered prior of this call
     */
    removeArtifact(artifact) {
        console.assert(this._artifacts.has(artifact));
        this._artifacts.delete(artifact);
        if (this._visibleArtifacts && this._visibleArtifacts.has(artifact)) {
            this._visibleArtifacts.delete(artifact);
        }
        this._dirty = true;
    }

    /**
     * registers an artifact on the level. This registration CAN be undoed
     * @param artifact artifact to register. This artifact MUST NOT BE registered prior of this call
     */
    showArtifact(artifact) {
        Memento.register(this);
        this.addArtifact(artifact);
    }

    /**
     * unregisters an artifact on the level. This registration CAN be undoed
     * @param artifact artifact to unregister. This artifact MUST BE registered prior of this call
     */
    hideArtifact(artifact) {
        Memento.register(this);
        this.removeArtifact(artifact);
    }

    /**
     * invalidates the level if the artifact given as a parameter intersects the visible part of this level
     * @param artifact artifact to check
     */
    refreshArtifact(artifact) {
        console.assert(this._artifacts.has(artifact));
        if (this._visibleArtifacts) {
            let intersect = artifact.boundingArea && artifact.boundingArea.intersect(this.visibleArea);
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

    /**
     * forces the invalidation of the level.
     */
    invalidate() {
        delete this._visibleArtifacts;
        this._dirty = true;
    }

    /**
     * gets all the artifacts registered on the level
     * @return list of artifacts
     */
    get artifacts() {
        return this._artifacts;
    }

    /**
     * gets all the artifacts registered on the level and intersects with the visible part of this level
     * @return list of visible artifacts
     */
    get visibleArtifacts() {
        if (!this._visibleArtifacts) {
            let levelArea = this.visibleArea;
            this._visibleArtifacts = new Set();
            for (let artifact of this._artifacts) {
                let boundingArea = artifact.boundingArea;
                if (boundingArea && boundingArea.intersect(levelArea)) {
                    this._visibleArtifacts.add(artifact);
                }
            }
        }
        return this._visibleArtifacts.values();
    }

    /**
     * paints the level if it is not validated
     */
    paint() {
        if (this._dirty) {
            this.clear();
            for (let artifact of this.visibleArtifacts) {
                if (artifact.alpha>=0.01) {
                    this.forArtifact(artifact);
                    this.layer.withSettings(() => {
                        artifact.paint();
                    });
                }
            }
            delete this._dirty;
        }
    }

    /**
     * gets the pixel
     * @param artifact
     * @param point
     * @return {*}
     */
    getPixel(artifact, point) {
        this.forArtifact(artifact);
        return this.layer.getPixel(point);
    }

    drawImage(image, spoint, sdimension, dpoint, ddimension) {
        console.assert(!dpoint === !ddimension);
        if (!dpoint) {
            this.layer.drawImage(image, spoint.x, spoint.y, sdimension.w, sdimension.h);
        }
        else {
            this.layer.drawImage(image, spoint.x, spoint.y, sdimension.w, sdimension.h, dpoint.x, dpoint.y, ddimension.w, ddimension.h);
        }
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

    setTextSettings(font, align, baseline) {
        this.layer.setTextSettings(font, align, baseline);
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

    getAllArtifactsOnPoint(viewportPoint, predicate) {
        let artifacts = [];
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            if ((!predicate || predicate(artifact)) && this.isPointOnArtifact(artifact, viewportPoint)) {
                artifacts.push(artifact);
            }
        }
        return artifacts;
    }

    getArtifactOnPoint(viewportPoint, predicate) {
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            if ((!predicate || predicate(artifact)) && this.isPointOnArtifact(artifact, viewportPoint)) {
                return artifact;
            }
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
        artifact.__layer = this._layer;
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

    getAllArtifactsOnPoint(viewportPoint, predicate) {
        let artifacts = [];
        let visibleArtifacts = [...this.visibleArtifacts];
        for (let i = visibleArtifacts.length-1; i>=0; i--) {
            let artifact = visibleArtifacts[i];
            if ((!predicate || predicate(artifact)) && this.isPointOnArtifact(artifact, viewportPoint)) {
                artifacts.push(artifact);
            }
        }
        return artifacts.sort((artifact1, artifact2)=>artifact2.__layer.index-artifact1.__layer.index);
    }

    getArtifactOnPoint(viewportPoint, predicate) {
        let artifacts = this.getAllArtifactsOnPoint(viewportPoint, predicate);
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

    setTransform(transform) {
        this.layer.setTransform(transform);
    }

}

export class DScrollBoardAnimation extends DAnimation {

    constructor(board, targetLocation, duration=200) {
        super();
        this._board = board;
        if (this._board._scrollAnimation) this._board._scrollAnimation.cancel();
        this._board._scrollAnimation = this;
        this._currentCenter = this._board.location;
        this._targetLocation = targetLocation;
        this._duration = duration;
        this.play(1);
    }

    _draw(count, ticks) {
        let factor = this._factor(count);
        let location = new Point2D(
            (1-factor)*this._currentCenter.x + factor*this._targetLocation.x,
            (1-factor)*this._currentCenter.y + factor*this._targetLocation.y
        );
        this._board.center(location);
        return count * ADELAY >= this._duration ? 0 : 1;
    }

    _factor(count) {
        return (count * ADELAY)/this._duration;
    }

    _finalize() {
        delete this._board._scrollAnimation;
    }

}

/**
 * Playing board. Wraps (and hide) a DDraw Viewport and define its content. Essentially a Board shows "Elements" on
 * "Levels". A level is a wrapper of a DDraw's layer. Its is invisible by itself and contains the Elements. Elements
 * are used to group Artifacts. The Artifacts are the visible objects on the screen.
 */
export class DBoard {

    /**
     * Create a board.
     * @param dimension dimension of the displayable content of the board (which can exceeds largely the visible part
     * of the board).
     * @param viewportDimension dimension of the displayed content of the board (ie. the visible part of the board).
     * @param levels levels where the artifacts are displayed.
     */
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
        Mechanisms.addListener(this);
    }

    /**
     * Request the Navigator to enter the full screen mode.
     */
    fitWindow() {
        this._draw.fitWindow();
    }

    /**
     * gets the dimension (the displayABLE part) of the board content.
     */
    get dimension() {
        return this._dimension;
    }

    /**
     * sets the dimension (the displayABLE part) of the board content.
     * @param dimension
     */
    set dimension(dimension) {
        this._dimension = dimension;
        this._resize();
    }

    /**
     * processing by the board of global event. Boards only process resize events (received when user resize manually
     * the size of the navigator's page.
     * @param source source of the event (not used here)
     * @param event event type (only DDraw.RESIZE_EVENT are processed)
     * @param value event data (not used here)
     */
    _processGlobalEvent(source, event, value) {
        if (event === DDraw.RESIZE_EVENT) {
            this._resize();
        }
    }

    /**
     * Adjust Board internals when navigator's page is resized.
     * @private
     */
    _resize() {
        this._adjust();
        this._requestRepaint();
        Mechanisms.fire(this, DBoard.RESIZE_EVENT);
        this.paint();
    }

    /**
     * registers a list of levels inside the internals of the Board.
     * @param levels levels to register
     * @private
     */
    _registerLevels(levels) {
        this._levels = new Map();
        this._levelsArray = []
        for (let level of levels) {
            level.setDraw(this._draw);
            this._levels.set(level.name, level);
            this._levelsArray.push(level);
        }
    }

    /**
     * sets mouse click events processing. Essentially this method sets an event listener that receive mouse click events,
     * looks for the artefact the event points to, and passes it the received mouse event. Not that the artifact has to
     * acknowledge the event to let the board considering that the event is proceeded. If not, the board looks for the
     * next artifact just "below" and repeats the operation on it.
     * <br> Note that a mouse click automatically opens a Memento transaction, so it can be later un-doed.
     * @private
     */
    _initMouseClickActions() {
        this._mouseClickActions = [];
        this._draw.onMouseClick(event => {
            let processed = false;
            for (let action of this._mouseClickActions) {
                if (action(event)) {
                    processed = true;
                }
            }
            let ignored = new Set();
            while (!processed) {
                let offset = new Point2D(event.offsetX, event.offsetY);
                let artifact = event.artifact!==undefined ? event.artifact : this.getArtifactOnPoint(offset,
                    artifact => artifact.mayCaptureEvent(event) && (!ignored || !ignored.has(artifact))
                );
                if (!artifact) {
                    processed = true;
                } else {
                    ignored.add(artifact);
                    if (artifact.onMouseClick) {
                        this._focusArtifact = artifact;
                        processed = artifact.onMouseClick(event);
                        console.assert(processed !== undefined);
                    }
                }
            }
            this.paint();
            Memento.open();
            return processed;
        });
    }

    /**
     * sets mouse move events processing. Essentially this method sets an event listener that receive mouse move events,
     * looks for the artefact the event points to, and passes it the mouse event. Not that the artifact has to
     * acknowledge the event to let the board considering that the event is proceeded. If not, the board looks for the
     * next artifact just "below" and repeats the operation on it.
     * <br> Note that this method generates internal mouseEnter ans mouseLeaves calls on artifacts to simulate the
     * behavior of mouseEnter and mouseLeave DOM events, on artifacts (which are NOT DOM objects !)
     * <br> Note that a mouse move does NOT open a Memento transaction.
     * @private
     */
    _initMouseMoveActions() {
        this._mouseMoveActions = [];
        this._draw.onMouseMove(event => {
            let processed = false;
            for (let action of this._mouseMoveActions) {
                if (action(event)) {
                    processed = true;
                }
            }
            let ignored = new Set();
            while (!processed) {
                let offset = new Point2D(event.offsetX, event.offsetY);
                let artifact = event.artifact!==undefined ? event.artifact : this.getArtifactOnPoint(offset,
                    artifact => artifact.mayCaptureEvent(event) && (!ignored || !ignored.has(artifact))
                );
                if (artifact) ignored.add(artifact);
                if (artifact !== this._mouseOverArtifact) {
                    if (this._mouseOverArtifact) {
                        this._mouseOverArtifact.onMouseLeave && this._mouseOverArtifact.onMouseLeave(event, artifact);
                    }
                    if (artifact) {
                        artifact.onMouseEnter && artifact.onMouseEnter(event, this._mouseOverArtifact);
                    }
                    this._mouseOverArtifact = artifact;
                }
                if (this._mouseOverArtifact && this._mouseOverArtifact.onMouseMove) {
                    processed = this._mouseOverArtifact.onMouseMove(event);
                    console.assert(processed !== undefined);
                }
                else processed = true;
                if (!artifact) processed = true;
            }
            this.paint();
            return processed;
        });
    }

    /**
     * sets key events processing. Essentially this method sets an event listener that receive key down events,
     * and passes the key events to the "focused" artifact. The focused artifact is the last one which had processed a
     * mouse click event.
     * <br> Note that a key down event automatically opens a Memento transaction, so it can be later un-doed.
     * @private
     */
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

    /**
     * paints the board content. Notes that only the invalidated levels of the board is repainted. If none of them are
     * invalidated, this method does nothing. Generally a level if invalidated when an artifact is added to it or
     * removed from it or is modified inside it.
     */
    paint() {
        //let t = Date.now();
        for (let level of this._levels.values()) {
            level.paint();
        }
        //console.log(Date.now() - t);
    }

    /**
     * forces a complete repaint operation: all levels are invalidated and a paint operation is executed
     */
    repaint() {
        this._adjust();
        this._requestRepaint();
        this.paint();
    }

    /**
     * gets a board level by its name
     * @param levelName name that identifies the level to retrieve
     * @return the corresponding level if exists. null otherwise
     */
    getLevel(levelName) {
        return this._levels.get(levelName);
    }

    /**
     * requests the board to redraw completely its content. Note that this method does not make the painting. This will
     * be done during the next painting operation.
     * @private
     */
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

    /**
     * translate a point from viewport coordinates to board content coordinates
     * @param vpoint viewport point
     * @return board content point
     */
    getBoardPoint(vpoint) {
        let x = (vpoint.x-this.viewportDimension.w/2)/this._zoomFactor+this._location.x;
        let y = (vpoint.y-this.viewportDimension.h/2)/this._zoomFactor+this._location.y;
        return new Point2D(x, y);
    }

    /**
     * translate a point from board point coordinates to viewport coordinates
     * @param point board content point
     * @return viewport point
     */
    getViewPortPoint(point) {
        let vx = (point.x-this._location.x)*this._zoomFactor + this.viewportDimension.w/2;
        let vy = (point.y-this._location.y)*this._zoomFactor + this.viewportDimension.h/2;
        return new Point2D(vx, vy);
    }

    /**
     * executes a zoom operation
     * @param vpoint central point (in viewport coordinate) of the zoom operation
     * @param zoomFactor zoom factor: >0, >1 means zoom in, <1 means zoom out
     */
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

    /**
     * sets the zoom parameters
     * @param zoomIncrement zoom increment (applied each time a zoom in/zoom out operation)
     * @param maxZoomFactor maximum value for the zoom factor (ie. tha max "zoom in" factor)
     */
    setZoomSettings(zoomIncrement, maxZoomFactor) {
        this._zoomIncrement = zoomIncrement;
        this._maxZoomFactor = maxZoomFactor;
    }

    /**
     * gets the zoom increment (applied each time a zoom in/zoom out operation)
     * @return {number}
     */
    get zoomIncrement() {
        return this._zoomIncrement;
    }

    /**
     * gets the minimum value for the zoom factor (ie. tha max "zoom out" factor). This value is reached when the board
     * content is entirely visible (the lesser of the values on x or y axis).
     * @return minimum possible value of the zoom factor
     */
    get minZoomFactor() {
        return Math.max(this.viewportDimension.w/this.dimension.w, this.viewportDimension.h/this.dimension.h);
    }

    /**
     * gets the maximum value for the zoom factor (ie. tha max "zoom in" factor).
     * @return minimum possible value of the zoom factor
     */
    get maxZoomFactor() {
        return this._maxZoomFactor;
    }

    /**
     * executes a zoom in operation
     * @param vpoint central point (in viewport coordinate) of the zoom operation
     */
    zoomIn(vpoint) {
        this.zoom(vpoint, this.zoomFactor/this.zoomIncrement);
    }

    /**
     * executes a zoom out operation
     * @param vpoint central point (in viewport coordinate) of the zoom operation
     */
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

    centerOn(vpoint) {
        let point = this.getBoardPoint(vpoint);
        new DScrollBoardAnimation(this, point);
    }

    setScrollSettings(scrollIncrement, borderWidth) {
        this._scrollIncrement = scrollIncrement;
        this._borderWidth = borderWidth;
    }

    /**
     * indicates if a viewport point is "near" the left border of the board viewport. This method is used to triggers
     * automatically a scroll to the left when the mouse is positioned near the left side of the board. "Near" means
     * inside a small margin (defaulted to 10 points) from the board side.
     * @param vpoint viewport point
     * @return true if the point is near the left side of the board.
     */
    isOnLeftBorder(vpoint) {
        return vpoint.x <= this._borderWidth;
    }

    /**
     * indicates if a viewport point is "near" the right border of the board viewport. This method is used to triggers
     * automatically a scroll to the right when the mouse is positioned near the right side of the board. "Near" means
     * inside a small margin (defaulted to 10 points) from the board side.
     * @param vpoint viewport point
     * @return true if the point is near the right side of the board.
     */
    isOnRightBorder(vpoint) {
        return this.viewportDimension.w-vpoint.x <= this._borderWidth;
    }

    /**
     * indicates if a viewport point is "near" the top border of the board viewport. This method is used to triggers
     * automatically a scroll to the top when the mouse is positioned near the top side of the board. "Near" means
     * inside a small margin (defaulted to 10 points) from the board side.
     * @param vpoint viewport point
     * @return true if the point is near the top side of the board.
     */
    isOnTopBorder(vpoint) {
        return vpoint.y <= this._borderWidth;
    }

    /**
     * indicates if a viewport point is "near" the bottom border of the board viewport. This method is used to triggers
     * automatically a scroll to the bottom when the mouse is positioned near the bottom side of the board. "Near" means
     * inside a small margin (defaulted to 10 points) from the board side.
     * @param vpoint viewport point
     * @return true if the point is near the bottom side of the board.
     */
    isOnBottomBorder(vpoint) {
        return this.viewportDimension.h-vpoint.y <= this._borderWidth;
    }

    /**
     * execute a scroll.
     * @param dpoint displacement (given in viewport coordinate) of the scroll
     * @private
     */
    _scroll(dpoint) {
        this._location = new Point2D(
            this._location.x + dpoint.x/this.zoomFactor,
            this._location.y + dpoint.y/this.zoomFactor);
        this._adjust();
        this._requestRepaint();
        Mechanisms.fire(this, DBoard.SCROLL_EVENT);
    }

    /**
     * scrolls the table to the left, one scroll increment.
     */
    scrollOnLeft() {
        this._scroll(new Point2D(-this._scrollIncrement, 0));
    }

    /**
     * scrolls the table to the right, one scroll increment.
     */
    scrollOnRight() {
        this._scroll(new Point2D(this._scrollIncrement, 0));
    }

    /**
     * scrolls the table to the top, one scroll increment.
     */
    scrollOnTop() {
        this._scroll(new Point2D(0, -this._scrollIncrement));
    }

    /**
     * scrolls the table to the bottom, one scroll increment.
     */
    scrollOnBottom() {
        this._scroll(new Point2D(0, this._scrollIncrement));
    }

    /**
     * adjust current board content zoom factor and position to ensure that the "visible" window of the board does not
     * exceed the board content.
     * @private
     */
    _adjust() {
        if (this._zoomFactor<this.minZoomFactor) {
            this._zoomFactor=this.minZoomFactor;
        }
        if (this._zoomFactor>this.maxZoomFactor) {
            this._zoomFactor=this.maxZoomFactor;
        }
        let deltaX = this.viewportDimension.w/2/this._zoomFactor;
        if (deltaX>=this._dimension.w/2+this._location.x) {
            this._location = new Point2D(deltaX-this._dimension.w/2, this._location.y);
            Mechanisms.fire(this, DBoard.BORDER_EVENT, DBoard.BORDER.LEFT);
            this._onLeft = true;
        }
        else {
            delete this._onLeft;
        }
        if (deltaX>=this._dimension.w/2-this._location.x) {
            this._location = new Point2D(this._dimension.w/2-deltaX, this._location.y);
            Mechanisms.fire(this, DBoard.BORDER_EVENT, DBoard.BORDER.RIGHT);
            this._onRight = true;
        }
        else {
            delete this._onRight;
        }
        let deltaY = this.viewportDimension.h/2/this._zoomFactor;
        if (deltaY>=this._dimension.h/2+this._location.y) {
            this._location = new Point2D(this._location.x, deltaY-this._dimension.h/2);
            Mechanisms.fire(this, DBoard.BORDER_EVENT, DBoard.BORDER.TOP);
            this._onTop = true;
        }
        else {
            delete this._onTop;
        }
        if (deltaY>=this._dimension.h/2-this._location.y) {
            this._location = new Point2D(this._location.x, this._dimension.h/2-deltaY);
            Mechanisms.fire(this, DBoard.BORDER_EVENT, DBoard.BORDER.BOTTOM);
            this._onBottom = true;
        }
        else {
            delete this._onBottom;
        }
    }

    /**
     * indicates if the viewport window has reached the left side of the board content.
     * @return true if the left border of the board content is visible. False otherwise
     */
    get onLeft() {
        return !!this._onLeft;
    }

    /**
     * indicates if the viewport window has reached the right side of the board content.
     * @return true if the right border of the board content is visible. False otherwise
     */
    get onRight() {
        return !!this._onRight;
    }

    /**
     * indicates if the viewport window has reached the top side of the board content.
     * @return true if the top border of the board content is visible. False otherwise
     */
    get onTop() {
        return !!this._onTop;
    }

    /**
     * indicates if the viewport window has reached the bottom side of the board content.
     * @return true if the bottom border of the board content is visible. False otherwise
     */
    get onBottom() {
        return !!this._onBottom;
    }

    /**
     * gets the zoom factor
     * @return the zoom factor
     */
    get zoomFactor() {
        return this._zoomFactor;
    }

    get location() {
        return this._location;
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

    delOnKeyDown() {
        this.onKeyDown(event => {
            if (event.key === 'Backspace' || event.key === 'Delete') {
                Mechanisms.fire(this, DBoard.DELETE_EVENT);
                return true;
            }
            return false;
        });
    }

    escapeOnKeyDown() {
        this.onKeyDown(event => {
            if (event.key === 'Escape') {
                Mechanisms.fire(this, DBoard.ESCAPE_EVENT);
                return true;
            }
            return false;
        });
    }

    getAllArtifactsOnPoint(viewportPoint, predicate) {
        let artifacts = [];
        for (let i = this._levelsArray.length-1; i>=0; i--) {
            let artifact = this._levelsArray[i].getAllArtifactsOnPoint(viewportPoint, predicate);
            artifacts.push(...artifact);
        }
        return artifacts;
    }

    getArtifactOnPoint(viewportPoint, predicate) {
        for (let i = this._levelsArray.length-1; i>=0; i--) {
            let artifact = this._levelsArray[i].getArtifactOnPoint(viewportPoint, predicate);
            if (artifact) return artifact;
        }
        return null;
    }

    isPointOnArtifact(artifact, viewportPoint) {
        console.assert(artifact.level);
        return artifact.level.isPointOnArtifact(artifact, viewportPoint);
    }

    static DEFAULT_MAX_ZOOM_FACTOR = 10;
    static DEFAULT_ZOOM_INCREMENT = 1.5;
    static DEFAULT_BORDER_WIDTH = 10;
    static DEFAULT_SCROLL_INCREMENT = 80;
    static SCROLL_EVENT = "board-scroll";
    static ZOOM_EVENT = "board-zoom";
    static RESIZE_EVENT = "board-resize";
    static BORDER_EVENT = "board-border";
    static DELETE_EVENT = "board-delete";
    static ESCAPE_EVENT = "board-escape";
    static BORDER = {
        LEFT: 0,
        RIGHT: 1,
        TOP: 2,
        BOTTOM: 3
    };
}

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
        return this._clockWise ? (count * ADELAY) / this._duration : (this._duration - count * ADELAY)/this._duration;
    }

    init() {
        this._pangle = this._artifact.pangle;
    }

    draw(count, ticks) {
        this._artifact.pangle = this._pangle + this._factor(count)*this._angle;
        return count * ADELAY >= this._duration ? 0 : 1;
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
        return (count * ADELAY) / this._duration;
    }

    draw(count, ticks) {
        this._artifact.alpha = this._initAlpha + (this._alpha - this._initAlpha)*this._factor(count);
        return count * ADELAY >= this._duration ? 0 : 1;
    }

    close() {
        this._artifact.alpha = this._alpha;
    }

}
