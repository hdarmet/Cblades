'use strict';

import {
    Mechanisms
} from "./mechanisms.js";
import {
    DArtifact, RectArtifact,
    DElement
} from "./board.js";
import {
    Area2D,
    Dimension2D,
    Point2D
} from "./geometry.js";

export class DWidget extends DElement {

    constructor() {
        super();
    }

    setPanelSettings(dimension) {
        this._dimension = dimension;
        this._panel = new DPanel(dimension);
        this.addArtifact(this._panel);
        return this;
    }

    setOnBoard(board) {
        console.assert(this._panel);
        return super.setOnBoard(board);
    }

    removeFromBoard(board) {
        console.assert(this._panel);
        return super.removeFromBoard(board);
    }

    get dimension() {
        return this._dimension;
    }

    adjust(point) {
        let area = Area2D.rectBoundingArea( this._panel.transform,
            -this.dimension.w/2, -this.dimension.h/2,
            this.dimension.w, this.dimension.h);
        let visibleArea = this._panel.level.visibleArea;
        let dx =0;
        let dy =0;
        if (area.left+point.x<visibleArea.left+DWidget.ADJUST_MARGIN) {
            dx += visibleArea.left+DWidget.ADJUST_MARGIN-area.left-point.x;
        }
        if (area.right+point.x>visibleArea.right-DWidget.ADJUST_MARGIN) {
            dx += visibleArea.right-DWidget.ADJUST_MARGIN-area.right-point.x;
        }
        if (area.top+point.y<visibleArea.top+DWidget.ADJUST_MARGIN) {
            dy += visibleArea.top+DWidget.ADJUST_MARGIN-area.top-point.y;
        }
        if (area.bottom+point.y>visibleArea.bottom-DWidget.ADJUST_MARGIN) {
            dy += visibleArea.bottom-DWidget.ADJUST_MARGIN-area.bottom-point.y;
        }
        let x = point.x + dx;
        let y = point.y + dy;
        return new Point2D(x, y);
    }

}
DWidget.ADJUST_MARGIN = 5;

export class DPanel extends RectArtifact(DArtifact) {

    constructor(dimension) {
        super(dimension,"widgets", new Point2D(0, 0));
    }

    paint() {
        console.assert(this._level);
        this._level.setShadowSettings('#000000', 15);
        this._level.setStrokeSettings('#000000', 1);
        this._level.setTransformSettings(this.transform);
        this._level.drawRect(
            new Point2D(-this.dimension.w/2, -this.dimension.h/2),
            this.dimension);
        this._level.setFillSettings('#FFFFFF');
        this._level.fillRect(
            new Point2D(-this.dimension.w/2, -this.dimension.h/2),
            this.dimension);
    }

}

export class DPopup extends DWidget {

    constructor() {
        super();
        this.setPanelSettings(new Dimension2D(100, 150));
    }

    open(board, point) {
        if (DPopup._instance!==this) {
            DPopup.close();
            this.setOnBoard(board);
            this.setLocation(this.adjust(point)); // After set on board because adjust need to know the layer
            DPopup._instance = this;
        }
    }

    close() {
        this.removeFromBoard();
        DPopup._instance = null;
    }
}
DPopup.close = function() {
    if (DPopup._instance) {
        DPopup._instance.close();
    }
};
DPopup._instance = null;
DPopup.activate = function() {
    DPopup._cleaner = {
        _processGlobalEvent(source, event, value) {
            DPopup.close();
        }
    };
    Mechanisms.addListener(DPopup._cleaner);
};