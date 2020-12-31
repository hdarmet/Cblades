'use strict';

import {
    Mechanisms, Memento
} from "./mechanisms.js";
import {
    DImage, getDrawPlatform
} from "./draw.js";
import {
    DArtifact,
    RectArtifact,
    DElement,
    DImageArtifact,
    DBoard,
    DArtifactRotateAnimation,
    DMultiImageArtifact,
    DArtifactAnimation,
    DArtifactAlphaAnimation, DTextArtifact
} from "./board.js";
import {
    Area2D,
    Dimension2D, Matrix2D,
    Point2D
} from "./geometry.js";

function adjustOnScreen(level, area, point) {
    let visibleArea = level.visibleArea;
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
        return adjustOnScreen(this._panel.level, area, point);
    }

}
DWidget.ADJUST_MARGIN = 5;

export class DPanel extends RectArtifact(DArtifact) {

    constructor(dimension) {
        super(dimension,"widgets", new Point2D(0, 0));
    }

    _paint() {
        console.assert(this._level);
        this._level.setShadowSettings('#000000', 15);
        this._level.setStrokeSettings('#000000', 1);
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

    constructor(dimension, modal=false) {
        super();
        if (modal) {
            this._mask = new DMaskArtifact("#000000", 0.3);
            this.addArtifact(this._mask);
        }
        this.setPanelSettings(dimension);
    }

    open(board, point) {
        console.assert(!this._board);
        this.show(board);
        this.move(this.adjust(point)); // After set on board because adjust need to know the layer
    }

    isModal() {
        return !!this._mask;
    }

    close() {
        console.assert(this._board);
        this.hide();
    }

}

export class DIconMenuItem extends DImageArtifact {

    constructor(path, pathInactive, col, row, action) {
        super("widget-items", DImage.getImage(path),
            new Point2D(
                DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE/2 + (DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE)*col,
                DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE/2 + (DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE)*row
            ),
            DIconMenuItem.ICON_DIMENSION, 0);
        this._inactive = DImage.getImage(pathInactive);
        this._active = true;
        this._col = col;
        this._row = row;
        this._action = action;
    }

    get image() {
        if (this._active) {
            return super.image;
        }
        else {
            return this._inactive;
        }
    }

    setActive(active) {
        this._active = active;
        return this;
    }

    get col() {
        return this._col;
    }

    get row() {
        return this._row;
    }

    get action() {
        return this._action;
    }

    get active() {
        return this._active;
    }

    onMouseClick(event) {
        if (this._active) {
            if (this.action(event)) {
                this.element.closeMenu();
            }
        }
    }

    onMouseEnter(event) {
        if (this._active) {
            this.setSettings(this.mouseOverSettings);
            this.element.refresh();
        }
    }

    onMouseLeave(event) {
        if (this._active) {
            this.setSettings(null);
            this.element.refresh();
        }
    }

    get mouseOverSettings() {
        return level=>{
            level.setShadowSettings("#FF0000", 10);
        }
    }

}
DIconMenuItem.MARGIN = 10;
DIconMenuItem.ICON_SIZE = 50;
DIconMenuItem.ICON_DIMENSION = new Dimension2D(DIconMenuItem.ICON_SIZE, DIconMenuItem.ICON_SIZE)

export class DIconMenu extends DPopup {

    constructor(modal, ...items) {
        function getDimension(items) {
            let rowMax = 0;
            let colMax = 0;
            for (let item of items) {
                if (colMax<item.col) colMax = item.col;
                if (rowMax<item.row) rowMax = item.row;
            }
            return new Dimension2D(
                (colMax+1)*(DIconMenuItem.ICON_SIZE+DIconMenuItem.MARGIN)+DIconMenuItem.MARGIN,
                (rowMax+1)*(DIconMenuItem.ICON_SIZE+DIconMenuItem.MARGIN)+DIconMenuItem.MARGIN
            );
        }
        super(getDimension(items), modal);
        for (let item of items) {
            this.addArtifact(item);
            let position = item.position;
            item.position = new Point2D(
                position.x - this.dimension.w/2,
                position.y - this.dimension.h/2
            )
        }
    }

    getItem(col, row) {
        for (let artifact of this.artifacts) {
            if (artifact instanceof DIconMenuItem && artifact.col===col && artifact.row===row) {
                return artifact;
            }
        }
        return null;
    }

    closeMenu() {
        this.close();
    }
}

/**
 * Mixin containing methods for Artifact that can be activated in a standard way
 */
export function ActivableArtifact(clazz) {
    return class extends clazz {

        constructor(...args) {
            super(...args);
            this.setSettings(this.settings);
            this._over = false;
            this._active = true;
        }

        get settings() {
            return level => {
                level.setShadowSettings("#00FFFF", 10);
            }
        }

        get overSettings() {
            return level => {
                level.setShadowSettings("#FF0000", 10);
            }
        }

        get inactiveSettings() {
            return level => {
                level.setShadowSettings("#000000", 10);
            }
        }

        onMouseClick(event) {
            if (this._active) {
                this._element.action();
            }
        }

        onMouseEnter(event) {
            this._over = true;
            this._dispatch();
        }

        onMouseLeave(event) {
            this._over = false;
            this._dispatch();
        }

        _isOver() {
            for (let artifact of this.element._artifacts) {
                if (artifact._over) return true;
            }
            return false;
        }

        _dispatch() {
            let over = this._isOver()
            for (let artifact of this.element._artifacts) {
                if (artifact._over !== undefined) {
                    if (!this._active) {
                        artifact.setSettings(artifact.inactiveSettings);
                    }
                    else if (over) {
                        artifact.setSettings(artifact.overSettings);
                    }
                    else {
                        artifact.setSettings(artifact.settings);
                    }
                }
            }
            this.element.refresh();
        }

        set active(active) {
            this._active = active;
            this._dispatch();
        }

    }
}


export class DPushButtonImageArtifact extends ActivableArtifact(DMultiImageArtifact) {

    constructor(image, inactiveImage) {
        super("widget-commands", [image, inactiveImage],
            new Point2D(0, 0),
            DPushButtonImageArtifact.DIMENSION, 0);
    }

    set active(active) {
        super.active = active;
        this.setImage(active?0:1);
    }

}
DPushButtonImageArtifact.DIMENSION = new Dimension2D(50, 50);

export class DPushButton extends DElement {

    constructor(path, inactivePath, position, action) {
        super();
        let image = DImage.getImage(path);
        let inactiveImage = DImage.getImage(inactivePath);
        this._artifact = new DPushButtonImageArtifact(image, inactiveImage);
        this.addArtifact(this._artifact);
        this._position = position;
        this._action = action;
        this._active = true;
    }

    setPosition(position) {
        this._position = position;
        this._adjustLocation();
    }

    setOnBoard(board) {
        super.setOnBoard(board);
        this._adjustLocation();
        return this;
    }

    setTurnAnimation(clockWise) {
        this._animation = ()=>{
            new DArtifactRotateAnimation(this._artifact, 360, 0, 500, clockWise);
        };
        return this;
    }

    action() {
        if (this.active) {
            this._action(() => {
                if (this._animation) {
                    this._animation();
                }
            });
        }
    }

    get trigger() {
        return this._artifact;
    }

    _adjustLocation() {
        if (this._artifact && this._artifact.level) {
            let rightBottomPoint = this._artifact.level.getFinalPoint(this._artifact);
            let x = this._position.x >= 0 ? this._position.x : rightBottomPoint.x + this._position.x;
            let y = this._position.y >= 0 ? this._position.y : rightBottomPoint.y + this._position.y;
            this.setLocation(new Point2D(x, y));
        }
    }

    get active() {
        return this._active;
    }

    set active(active) {
        this._active = active;
        this._artifact.active = active;
    }

}

class DiceArtifact extends ActivableArtifact(DMultiImageArtifact) {

    constructor(images, point) {
        super("widget-items", images, point, new Dimension2D(100, 89), 0);
    }

}

export class DDice extends DElement {

    constructor(points) {
        super();
        for (let point of points) {
            this.addArtifact(new DiceArtifact([
                DImage.getImage("/CBlades/images/dice/d1.png"),
                DImage.getImage("/CBlades/images/dice/d2.png"),
                DImage.getImage("/CBlades/images/dice/d3.png"),
                DImage.getImage("/CBlades/images/dice/d4.png"),
                DImage.getImage("/CBlades/images/dice/d5.png"),
                DImage.getImage("/CBlades/images/dice/d6.png")
            ], point));
        }
        this._active = true;
    }

    open(board, location) {
        this.setLocation(location);
        this.setOnBoard(board);
    }

    close() {
        this.removeFromBoard();
    }

    rollDie() {
        let value = getDrawPlatform().random();
        return Math.floor(value*6)+1;
    }

    action() {
        let animation = null;
        this._result = [];
        for (let artifact of this._artifacts) {
            let value = this.rollDie();
            this._result.push(value);
            animation = new DDiceAnimation(artifact, 0, value);
        }
        animation.setFinalAction(()=>this.finalAction());
    }

    setFinalAction(action) {
        this._finalAction = action;
        return this;
    }

    finalAction() {
        this._finalAction && this._finalAction();
        Memento.clear();
    }

    get result() {
        return this._result;
    }

    get trigger() {
        return this._artifacts;
    }

    get active() {
        return this._active;
    }

    set active(active) {
        this._active = active;
        for (let artifact of this._artifacts) {
            artifact.active = active;
        }
    }
}

export class DDiceAnimation extends DArtifactAnimation {

    constructor(diceArtifact, startTick, value) {
        super(diceArtifact, startTick);
        this._value = value;
        this._duration = 1000;
    }

    init() {
        this._position = this._artifact.position;
    }

    draw(count, ticks) {
        this._artifact.pangle = Math.floor(getDrawPlatform().random()*360);
        this._artifact.setImage(Math.floor(getDrawPlatform().random()*6));
        this._artifact.position = new Point2D(
            this._position.x + Math.floor(getDrawPlatform().random()*30-15),
            this._position.y + Math.floor(getDrawPlatform().random()*50-50)
        );
        return count * 40 >= this._duration ? 0 : 2;
    }

    close() {
        this._artifact.pangle = 0;
        this._artifact.setImage(this._value-1);
        this._artifact.position = this._position;
    }
}

class IndicatorImageArtifact extends DMultiImageArtifact {

    constructor(images, dimension) {
        super("widgets", images, new Point2D(0, 0), dimension, 0);
        this.setSettings(this.settings);
    }

    get settings() {
        return level => {
            level.setShadowSettings("#000000", 10);
        }
    }
}

export class DIndicator extends DElement {

    constructor(paths, dimension) {
        super();
        let images = [];
        for (let path of paths) {
            images.push(DImage.getImage(path));
        }
        this._artifact = new IndicatorImageArtifact(images, dimension);
        this.addArtifact(this._artifact);
    }

    open(board, location) {
        this.setLocation(location);
        this.setOnBoard(board);
    }

    close() {
        if (this._board) {
            this.removeFromBoard();
        }
    }

}

class InsertImageArtifact extends DImageArtifact {

    constructor(image, dimension) {
        super("widgets", image, new Point2D(0, 0), dimension, 0);
        this.setSettings(this.settings);
    }

    get settings() {
        return level => {
            level.setShadowSettings("#000000", 10);
        }
    }
}

export class DInsert extends DElement {

    constructor(path, dimension) {
        super();
        this._artifact = new InsertImageArtifact(DImage.getImage(path), dimension);
        this.addArtifact(this._artifact);
    }

    open(board, location) {
        this.setLocation(location);
        this.setOnBoard(board);
    }

    close() {
        if (this._board) {
            this.removeFromBoard();
        }
    }

}

class ResultImageArtifact extends DMultiImageArtifact {

    constructor(image, dimension) {
        super("widget-commands", [
            DImage.getImage("/CBlades/images/dice/failure.png"),
            DImage.getImage("/CBlades/images/dice/success.png")
        ], new Point2D(0, 0), ResultImageArtifact.DIMENSION, 0);
        this.alpha = 0;
    }

    success() {
        this.setImage(1);
        this._insideSettings = this.successOverSettings;
        this._outsideSettings = this.successSettings;
        this.setSettings(this._outsideSettings);
        return this;
    }

    failure() {
        this.setImage(0);
        this._insideSettings = this.failureOverSettings;
        this._outsideSettings = this.failureSettings;
        this.setSettings(this._outsideSettings);
        return this;
    }

    get failureSettings() {
        return level => {
            level.setShadowSettings("#A00000", 100);
        }
    }

    get failureOverSettings() {
        return level => {
            level.setShadowSettings("#FF0000", 100);
        }
    }

    get successSettings() {
        return level => {
            level.setShadowSettings("#00A000", 100);
        }
    }

    get successOverSettings() {
        return level => {
            level.setShadowSettings("#00FF00", 100);
        }
    }

    onMouseClick() {
        this._element.onMouseClick();
    }

    onMouseEnter(event) {
        this.setSettings(this._insideSettings);
    }

    onMouseLeave(event) {
        this.setSettings(this._outsideSettings);
    }
}
ResultImageArtifact.DIMENSION = new Dimension2D(150, 150);

export class DResult extends DElement {

    constructor() {
        super();
        this._artifact = new ResultImageArtifact();
        this.addArtifact(this._artifact);
    }

    setFinalAction(action) {
        this._finalAction = action;
        return this;
    }

    get trigger() {
        return this._artifact;
    }

    success() {
        this._artifact.success();
        this._success = true;
        this._finished = true;
        return this;
    }

    failure() {
        this._artifact.failure();
        this._success = false;
        this._finished = true;
        return this;
    }

    get finished() {
        return this._finished;
    }

    open(board, location) {
        this.setLocation(location);
        this._targetBoard = board;
    }

    show() {
        if (this._targetBoard) {
            this.setOnBoard(this._targetBoard);
            new DArtifactAlphaAnimation(this._artifact, 1, 0, 500);
        }
    }

    close() {
        delete this._targetBoard;
        if (this._board) {
            this.removeFromBoard();
        }
    }

    onMouseClick() {
        this._finalAction && this._finalAction(this._success);
    }

}

class MessageImageArtifact extends DImageArtifact {

    constructor(image, dimension) {
        super("widget-commands",
            DImage.getImage("/CBlades/images/dice/message.png"),
            new Point2D(0, 0), MessageImageArtifact.DIMENSION, 0);
        this.alpha = 0;
    }

    get settings() {
        return level => {
            level.setShadowSettings("#A0FFFF", 100);
        }
    }

    get overSettings() {
        return level => {
            level.setShadowSettings("#00FFFF", 100);
        }
    }

    onMouseClick() {
        this._element.onMouseClick();
    }

    onMouseEnter(event) {
        this.setSettings(this.overSettings);
    }

    onMouseLeave(event) {
        this.setSettings(this.settings);
    }
}
MessageImageArtifact.DIMENSION = new Dimension2D(150, 150);

export class DMessage extends DElement {

    constructor() {
        super();
        this._artifact = new MessageImageArtifact();
        this.addArtifact(this._artifact);
    }

    setFinalAction(action) {
        this._finalAction = action;
        return this;
    }

    get trigger() {
        return this._artifact;
    }

    open(board, location) {
        this.setLocation(location);
        this._targetBoard = board;
    }

    show(text, ...values) {
        this._values = values;
        this._textArtifact = new DTextArtifact("widget-commands",
            new Point2D(0, 30),
            new Dimension2D(0, 0),
            "#0000FF","#8080FF",
            "#000000", 5,
            "90px serif", "center", text);
        this.addArtifact(this._textArtifact);
        if (this._targetBoard) {
            this.setOnBoard(this._targetBoard);
            new DArtifactAlphaAnimation(this._artifact, 1, 0, 500);
            new DArtifactAlphaAnimation(this._textArtifact, 1, 0, 500);
        }
    }

    close() {
        delete this._targetBoard;
        if (this._board) {
            this.removeFromBoard();
        }
    }

    onMouseClick() {
        this._finalAction && this._finalAction(...this._values);
    }

}

class DMaskArtifact extends DArtifact {

    constructor(color, alpha) {
        super("widgets");
        this._color = color;
        this._alpha = alpha;
    }

    _paint() {
        console.assert(this._level);
        this._level.setAlphaSettings(this._alpha);
        this._level.setFillSettings(this._color);
        this._level.fillRect(new Point2D(0, 0), this._level.viewportDimension);
    }

    get area() {
        return this._level.visibleArea;
    }

    get boundingArea() {
        return this._level.visibleArea;
    }

    get transform() {
        return Matrix2D.IDENTITY;
    }

    onMouseClick(event) {
        this._element.action && this._element.action();
    }

}

export class DMask extends DElement {

    constructor(color, alpha) {
        super();
        this._artifact = new DMaskArtifact(color, alpha);
        this.addArtifact(this._artifact);
    }

    action() {
        this._action && this._action();
    }

    setAction(action) {
        this._action = action;
        return this;
    }

    open(board, location=new Point2D(0, 0)) {
        this.setLocation(location);
        this.setOnBoard(board);
    }

    close() {
        this.removeFromBoard();
    }

}

export class DScene {

    constructor() {
        this._widgets = [];
    }

    addWidget(widget, position) {
        this._widgets.push({widget, position});
        return this;
    }

    get boundingArea() {
        let area = this._widgets[0].widget.boundingArea.translate(this._widgets[0].position);
        for (let index=1; index<this._widgets.length; index++) {
            area = area.add(this._widgets[index].widget.boundingArea.translate(this._widgets[index].position));
        }
        return area;
    }

    open(board, location) {
        let level = board.getLevel("widgets");
        location = adjustOnScreen(level, this.boundingArea, location);
        for (let record of this._widgets) {
            record.widget.open(board, new Point2D(
                location.x + record.position.x,
                location.y + record.position.y
            ))
        }
    }

    close() {
        for (let record of this._widgets) {
            record.widget.close();
        }
    }

}