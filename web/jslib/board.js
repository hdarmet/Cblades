'use strict';

import {
    Matrix2D, Point2D
} from "./geometry.js";
import {
    DDraw
} from "./draw.js";
import {
    Memento
} from "./mechanisms.js";


/**
 * Wrap something that can be shown on a given layer
 */
export class DArtifact {

    constructor(levelName, px, py) {
        this._levelName = levelName;
        this._px = px;
        this._py = py;
        this._x = px;
        this._y = py;
    }

    _memento() {
        return {
            level: this._level,
            px:this._px, py:this._py,
            x:this._x, y:this._y
        }
    }

    _revert(memento) {
        this._level && this._level.markDirty();
        this._level = memento.level;
        this._level && this._level.markDirty();
        this._px = memento.px;
        this._py = memento.py;
        this._x = memento.x;
        this._y = memento.y;
    }

    setLocation(x, y) {
        this._x = x+this.px;
        this._y = y+this.py;
        this._level && this._level.refreshArtifact(this);
    }

    setOnBoard(board) {
        console.assert(!this._level);
        this._level = board.getLevel(this._levelName);
        this._level.addArtifact(this);
    }

    removeFromBoard() {
        console.assert(this._level);
        this._level.removeArtifact(this);
        delete this._level;
    }

    move(x, y) {
        Memento.register(this);
        this.setLocation(x, y);
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

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get px() {
        return this._px;
    }

    get py() {
        return this._py;
    }
}

/**
 * Image wrapper artifact
 */
export class DImageArtifact extends DArtifact {

    constructor(levelName, image, px, py, w, h) {
        super(levelName, px, py);
        this._root = image;
        this._width = w;
        this._height = h;
    }

    paint() {
        console.assert(this._level);
        this._level.drawImage(this._root, this.x-this.width/2, this.y-this.height/2, this.width, this.height);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }
}

/**
 * Gather/combine artifacts that represents a given concept
 */
export class DElement {

    constructor(...artifacts) {
        this._artifacts = [...artifacts];
    }

    _memento() {
        return {
            x:this._x, y:this._y
        }
    }

    _revert(memento) {
        this._x = memento.x;
        this._y = memento.y;
    }

    setLocation(x, y) {
        this._x = x;
        this._y = y;
        for (let artifact of this._artifacts) {
            artifact.setLocation(x, y);
        }
    }

    setOnBoard(board) {
        for (let artifact of this._artifacts) {
            artifact.setOnBoard(board);
        }
    }

    removeFromBoard() {
        for (let artifact of this._artifacts) {
            artifact.removeFromBoard();
        }
    }

    move(x, y) {
        Memento.register(this);
        this._x = x;
        this._y = y;
        for (let artifact of this._artifacts) {
            artifact.move(x, y);
        }
    }

    show(board) {
        for (let artifact of this._artifacts) {
            artifact.show(board);
        }
    }

    hide() {
        for (let artifact of this._artifacts) {
            artifact.hide();
        }
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

    markDirty() {
        this._dirty = true;
    }

    addArtifact(artifact) {
        console.assert(!this._artifacts.has(artifact));
        this._artifacts.add(artifact);
        this._dirty = true;
    }

    removeArtifact(artifact) {
        console.assert(this._artifacts.has(artifact));
        this._artifacts.delete(artifact);
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
        this._dirty = true;
    }

    paint() {
        if (this._dirty) {
            this._layer.clear();
            for (let artifact of this._artifacts) {
                artifact.paint();
            }
        }
        delete this._dirty;
    }

    drawImage(image, x, y, w, h) {
        this._layer.drawImage(image, x, y, w, h);
    }
}

/**
 * Playing board. Accept elements. Dispatch element's artifacts on its own levels.
 */
export class DBoard {

    constructor(width, height, viewPortWidth, viewPortHeight, ...levels) {
        this._draw = new DDraw(viewPortWidth, viewPortHeight);
        this._width = width;
        this._height = height;
        this._x = 0;
        this._y = 0;
        this._zoomFactor = this.minZoomFactor;
        this._maxZoomFactor = DBoard.DEFAULT_MAX_ZOOM_FACTOR;
        this._zoomIncrement = DBoard.DEFAULT_ZOOM_INCREMENT;
        this._scrollIncrement = DBoard.DEFAULT_SCROLL_INCREMENT;
        this._borderWidth = DBoard.DEFAULT_BORDER_WIDTH;
        this._levels = new Map();
        for (let levelName of levels) {
            this._levels.set(levelName, new DLevel(this._draw.createLayer(levelName)));
        }
        this._requestRepaint();
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
        let boardCenter = this._viewPortXY(0, 0);
        let matrix =
            Matrix2D.translate(boardCenter).concat(
                Matrix2D.scale(new Point2D(this._zoomFactor, this._zoomFactor), boardCenter)
            );
        this._draw.setTransform(matrix);
        for (let level of this._levels.values()) {
            level.markDirty();
        }
    }

    _boardXY(vx, vy) {
        let x = (vx-this.viewPortWidth/2)/this._zoomFactor+this._x;
        let y = (vy-this.viewPortHeight/2)/this._zoomFactor+this._y;
        return new Point2D(x, y);
    }

    _viewPortXY(x, y) {
        let vx = (x-this._x)*this._zoomFactor + this.viewPortWidth/2;
        let vy = (y-this._y)*this._zoomFactor + this.viewPortHeight/2;
        return new Point2D(vx, vy);
    }

    zoom(vx, vy, zoomFactor) {
        let anchor = this._boardXY(vx, vy);
        this._zoomFactor = zoomFactor;
        this._x = anchor.x-(vx-this.viewPortWidth/2)/zoomFactor;
        this._y = anchor.y-(vy-this.viewPortHeight/2)/zoomFactor;
        this._adjust();
        this._requestRepaint();
    }

    setZoomSettings(zoomIncrement, maxZoomFactor) {
        this._zoomIncrement = zoomIncrement;
        this._maxZoomFactor = maxZoomFactor;
    }

    get zoomIncrement() {
        return this._zoomIncrement;
    }

    get minZoomFactor() {
        return Math.max(this.viewPortWidth/this.width, this.viewPortHeight/this.height);
    }

    get maxZoomFactor() {
        return this._maxZoomFactor;
    }

    zoomIn(vx, vy) {
        this.zoom(vx, vy, this.zoomFactor/this.zoomIncrement);
    }

    zoomOut(vx, vy) {
        this.zoom(vx,vy, this.zoomFactor*this.zoomIncrement);
    }

    center(x, y) {
        this._x = x;
        this._y = y;
        this._adjust();
        this._requestRepaint();
    }

    recenter(vx, vy) {
        let point = this._boardXY(vx, vy);
        this.center(point.x, point.y);
    }

    setScrollSettings(scrollIncrement, borderWidth) {
        this._scrollIncrement = scrollIncrement;
        this._borderWidth = borderWidth;
    }

    isOnLeftBorder(vx, vy) {
        return vx <= this._borderWidth;
    }

    isOnRightBorder(vx, vy) {
        return this.viewPortWidth-vx <= this._borderWidth;
    }

    isOnTopBorder(vx, vy) {
        return vy <= this._borderWidth;
    }

    isOnBottomBorder(vx, vy) {
        return this.viewPortHeight-vy <= this._borderWidth;
    }

    _scroll(dx, dy) {
        this._x += dx/this.zoomFactor;
        this._y += dy/this.zoomFactor;
        this._adjust();
        this._requestRepaint();
    }

    scrollOnLeft() {
        this._scroll(-this._scrollIncrement, 0);
    }

    scrollOnRight() {
        this._scroll(this._scrollIncrement, 0);
    }

    scrollOnTop() {
        this._scroll(0, -this._scrollIncrement);
    }

    scrollOnBottom() {
        this._scroll(0, this._scrollIncrement);
    }

    _adjust() {
        let repaint = false;
        if (this._zoomFactor<this.minZoomFactor) {
            this._zoomFactor=this.minZoomFactor;
            repaint = true;
        }
        if (this._zoomFactor>this.maxZoomFactor) {
            this._zoomFactor=this.maxZoomFactor;
            repaint = true;
        }
        let deltaX = this.viewPortWidth/2/this._zoomFactor;
        if (deltaX>this.width/2+this.x) {
            this._x = deltaX-this.width/2;
            repaint = true;
        }
        if (deltaX>this.width/2-this.x) {
            this._x = this.width/2-deltaX;
            repaint = true;
        }
        let deltaY = this.viewPortHeight/2/this._zoomFactor;
        if (deltaY>this.height/2+this.y) {
            this._y = deltaY-this.height/2;
            repaint = true;
        }
        if (deltaY>this.height/2-this.y) {
            this._y = this.height/2-deltaY;
            repaint = true;
        }
        return repaint;
    }

    get zoomFactor() {
        return this._zoomFactor;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get viewPortWidth() {
        return this._draw.width;
    }

    get viewPortHeight() {
        return this._draw.height;
    }

    get root() {
        return this._draw.root;
    }

}
DBoard.DEFAULT_MAX_ZOOM_FACTOR = 10;
DBoard.DEFAULT_ZOOM_INCREMENT = 1.5;
DBoard.DEFAULT_BORDER_WIDTH = 10;
DBoard.DEFAULT_SCROLL_INCREMENT = 10;