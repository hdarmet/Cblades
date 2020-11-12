'use strict';

import {
    DDraw, DImage
} from "./draw.js";

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

    setLocation(x, y) {
        this._x = x+this.px;
        this._y = y+this.py;
        if (this._level) {
            this._level.refreshArtifact(this);
        }
    }

    show(board) {
        console.assert(!this._level);
        this._level = board.getLevel(this._levelName);
        this._level.addArtifact(this);
    }

    hide() {
        console.assert(this._level);
        this._level.removeArtifact(this);
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

    setLocation(x, y) {
        this._x = x;
        this._y = y;
        for (let artifact of this._artifacts) {
            artifact.setLocation(x, y);
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

    constructor(width, height, ...levels) {
        this._draw = new DDraw(width, height);
        this._levels = new Map();
        for (let levelName of levels) {
            this._levels.set(levelName, new DLevel(this._draw.createLayer(levelName)));
        }
    }

    paint() {
        for (let level of this._levels.values()) {
            level.paint();
        }
    }

    getLevel(levelName) {
        return this._levels.get(levelName);
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