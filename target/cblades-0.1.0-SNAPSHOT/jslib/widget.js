'use strict';

import {
    Mechanisms,
    Memento
} from "./mechanisms.js";
import {
    DImage, getDrawPlatform, measureText, targetPlatform
} from "./draw.js";
import {
    DArtifact,
    AreaArtifact,
    DElement,
    DImageArtifact,
    DBoard,
    DArtifactRotateAnimation,
    DMultiImagesArtifact,
    DArtifactAnimation,
    DArtifactAlphaAnimation,
    DTextArtifact,
    DRectArtifact,
    DComposedImageArtifact,
    RectArtifact,
    TextArtifact,
    DComposedElement
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

export class DWidget extends DComposedElement {

    constructor() {
        super();
    }

    setPanelSettings(dimension) {
        this._dimension = dimension;
        this._panel = new DPanel(dimension);
        this.addArtifact(this._panel);
        return this;
    }

    resize(dimension) {
        this._dimension = dimension;
        this._panel.dimension = this._dimension;
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

    adjustArtifact(artifact, point) {
        let area = Area2D.rectBoundingArea( this._panel.transform,
            -artifact.dimension.w/2, -artifact.dimension.h/2,
            artifact.dimension.w, artifact.dimension.h);
        return adjustOnScreen(this._panel.level, area, point);
    }

    adjust(point) {
        let area = Area2D.rectBoundingArea( this._panel.transform,
            -this.dimension.w/2, -this.dimension.h/2,
            this.dimension.w, this.dimension.h);
        return adjustOnScreen(this._panel.level, area, point);
    }

}
DWidget.ADJUST_MARGIN = 5;

export class DPanel extends AreaArtifact(DArtifact) {

    constructor(dimension) {
        super(dimension,"widgets", new Point2D(0, 0));
    }

    _paint() {
        console.assert(this._level);
        this._level.setShadowSettings('#000000', 10);
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

export class DTooltip extends TextArtifact(RectArtifact(AreaArtifact(DArtifact))) {

    constructor(message, widget, position) {
        let measure = measureText(message, DTooltip.FONT);
        let width = measure.width+DTooltip.MARGIN*2;
        let height = DTooltip.HEIGHT+DTooltip.MARGIN*2;
        super(
            new Dimension2D(width, height),
            "widget-commands", new Point2D(0, 0), 0);
        this.position = widget.adjustArtifact(this, position);
        this._setRectSettings(1, "#000000", "#FFFFE4");
        this._setTextSettings(
            null, "#000000", 0,
            null, 0,
            DTooltip.FONT, "center", "middle", message
        );
    }

    _paint() {
        this._paintRect();
        this._paintText();
    }

    onMouseLeave(event) {
        this.element.closeTooltip(this);
    }

}
DTooltip.DELAY = 500;
DTooltip.HEIGHT = 20;
DTooltip.FONT = "15px serif";
DTooltip.MARGIN = 5;

export class DIconMenuItem extends DImageArtifact {

    constructor(path, pathInactive, col, row, action, tooltipMessage = null) {
        super("widget-items", DImage.getImage(path),
            new Point2D(
                DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE/2 + (DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE)*col,
                DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE/2 + (DIconMenuItem.MARGIN+DIconMenuItem.ICON_SIZE)*row
            ),
            DIconMenuItem.ICON_DIMENSION, 0);
        this._inactive = pathInactive ? DImage.getImage(pathInactive) : super.image;
        this._active = true;
        this._col = col;
        this._row = row;
        this._action = action;
        this._tooltipMessage = tooltipMessage;
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
            this.element.closeMenu();
            this.action(event);
        }
        return true;
    }

    onMouseEnter(event) {
        this._startMouseOn = getDrawPlatform().getTime();
        if (this._active) {
            this.setSettings(this.mouseOverSettings);
            this.element.refresh();
        }
        return true;
    }

    onMouseLeave(event) {
        delete this._startMouseOn;
        if (this._active) {
            this.setSettings(null);
            this.element.refresh();
        }
        return true;
    }

    get mouseOverSettings() {
        return level=>{
            level.setShadowSettings("#FF0000", 10);
        }
    }

    onMouseMove(event) {
        if (this._tooltipMessage && this._startMouseOn) {
            let time = getDrawPlatform().getTime();
            if (time - this._startMouseOn >= DTooltip.DELAY) {
                delete this._startMouseOn;
                this.element.openTooltip(this._tooltipMessage, this._level.getPoint(new Point2D(event.offsetX, event.offsetY)));
            }
        }
        return true;
    }

    static MARGIN = 10;
    static ICON_SIZE = 50;
    static ICON_DIMENSION = new Dimension2D(DIconMenuItem.ICON_SIZE, DIconMenuItem.ICON_SIZE)
}

export class D2StatesIconMenuItem extends DIconMenuItem {

    constructor(path, secondPath, pathInactive, col, row, action, tooltipMessage = null) {
        super(path, pathInactive, col, row, action, tooltipMessage);
        this._secondImage = DImage.getImage(secondPath);
        this._secondState = false;
    }

    get image() {
        if (this._active && this._secondState) {
            return this._secondImage;
        }
        else {
            return super.image;
        }
    }

    setSecondState(state) {
        this._secondState = state;
        return this;
    }

    get action() {
        return event=>this._action(event, this._secondState);
    }

    get secondState() {
        return this._secondState;
    }

    onMouseClick(event) {
        if (this._active) {
            this.element.closeMenu();
            this.action(event);
        }
        return true;
    }

}

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

    _memento() {
        let memento = super._memento();
        memento.tooltip = this._tooltip;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._tooltip = memento.tooltip;
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

    closeTooltip(tooltip) {
        Memento.register(this);
        console.assert(tooltip===this._tooltip);
        this.deleteArtifact(this._tooltip);
        delete this._tooltip;
    }

    openTooltip(tooltipMessage, position) {
        Memento.register(this);
        if (this._tooltip) this.closeTooltip(this._tooltip);
        this._tooltip = new DTooltip(tooltipMessage, this, position.minusPoint(this.location));
        this.appendArtifact(this._tooltip);
    }

}

/**
 * Mixin containing methods for Artifact that can be activated in a standard way
 */
export function ActivableArtifactMixin(clazz) {

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
            return true;
        }

        onMouseEnter(event) {
            this._over = true;
            this._dispatch();
            return true;
        }

        onMouseLeave(event) {
            this._over = false;
            this._dispatch();
            return true;
        }

        _isOver() {
            if (this.element) {
                for (let artifact of this.element._artifacts) {
                    if (artifact._over) return true;
                }
            }
            return false;
        }

        _dispatch() {
            if (!this.active) {
                this.setSettings(this.inactiveSettings);
            } else if (this._over) {
                this.setSettings(this.overSettings);
            } else {
                this.setSettings(this.settings);
            }
        }

        get active() {
            return this._active;
        }

        setActive(active) {
            this._active = active;
            this._dispatch();
        }

        set active(active) {
            this.setActive(active);
        }

    }
}

export function CoupledActivableArtifactMixin(clazz) {

    return class extends ActivableArtifactMixin(clazz) {

        _dispatch() {
            if (this.element) {
                let over = this._isOver()
                for (let artifact of this.element._artifacts) {
                    if (artifact._over !== undefined) {
                        if (!this.active) {
                            artifact.setSettings(artifact.inactiveSettings);
                        } else if (over) {
                            artifact.setSettings(artifact.overSettings);
                        } else {
                            artifact.setSettings(artifact.settings);
                        }
                    }
                }
                this.element.refresh();
            }
        }

    }

}

export class DPushButtonImageArtifact extends ActivableArtifactMixin(DMultiImagesArtifact) {

    constructor(images) {
        super("widget-commands", images,
            new Point2D(0, 0),
            DPushButtonImageArtifact.DIMENSION, 0);
    }

}

DPushButtonImageArtifact.DIMENSION = new Dimension2D(50, 50);

export class DAbstractPushButton extends DElement {

    constructor(images, position) {
        super();
        this._artifact = new DPushButtonImageArtifact(images);
        this.addArtifact(this._artifact);
        this._position = position;
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

    get animation() {
        return this._animation;
    }

    setTurnAnimation(clockWise, finalAction) {
        this._animation = ()=>{
            let animation = new DArtifactRotateAnimation(this._artifact, 360, 0, 500, clockWise);
            animation.setFinalAction(()=>finalAction && finalAction())
        };
        return this;
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

}

export class DPushButton extends DAbstractPushButton {

    constructor(path, inactivePath, position, action) {
        super([DImage.getImage(path), DImage.getImage(inactivePath)], position);
        this._action = action;
        this._active = true;
    }

    action() {
        if (this.active) {
            this._action(() => {
                if (this.animation) {
                    this.animation();
                }
            });
        }
    }

    get active() {
        return this._active;
    }

    set active(active) {
        this._active = active;
        this.trigger.active = active;
        this.trigger.changeImage(active?0:1);
    }

}

export class DMultiStatePushButton extends DAbstractPushButton {

    constructor(paths, position, action) {
        function getImages(paths) {
            let images=[];
            for (let path of paths) {
                images.push(DImage.getImage(path));
            }
            return images;
        }
        super(getImages(paths), position);
        this._action = action;
        this._state = 0;
    }

    action() {
        this._action(this._state, () => {
            if (this.animation) {
                this.animation();
            }
        });
    }

    get state() {
        return this._state;
    }

    setState(state) {
        console.assert(state<this.trigger.images.length);
        this._state = state;
        this.trigger.changeImage(state);
        return this;
    }

}

class DiceArtifact extends CoupledActivableArtifactMixin(DMultiImagesArtifact) {

    constructor(images, width, height, point) {
        super("widget-items", images, point, new Dimension2D(width, height), 0);
    }

}

export class DDice extends DElement {

    constructor(points, images, firstFace, step, width, height) {
        super();
        for (let point of points) {
            this.addArtifact(new DiceArtifact(images, width, height, point));
        }
        this._active = true;
        this._faceCount = images.length;
        this._firstFace = firstFace;
        this._step = step;
    }

    open(board, location) {
        this.show(board);
        this.move(location);
    }

    close() {
        this.hide();
    }

    rollDie() {
        let value = getDrawPlatform().random();
        /*
        let keyValue = prompt("Dice value:");
        if (keyValue) {
            return parseInt(keyValue);
        }
        */
        return (Math.floor(value*this._faceCount));
    }

    getValue(face) {
        return (face+this._firstFace)*this._step;
    }

    getFace(value) {
        return (value/this._step) - this._firstFace;
    }

    action() {
        let animation = null;
        this._result = [];
        for (let artifact of this._artifacts) {
            let face = this.rollDie();
            let value = this.getValue(face);
            this._result.push(value);
            animation = new DDiceAnimation(artifact, 0, face);
        }
        animation.setFinalAction(()=>this.finalAction());
    }

    cheat(dice) {
        this.active = false;
        let animation = null;
        this._result = [];
        let index = 0;
        for (let artifact of this._artifacts) {
            this._result.push(dice[index]);
            animation = new DDiceAnimation(artifact, 0, this.getFace(dice[index++]));
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

    set result(result) {
        this._result = result;
        for (let index=0; index<this._artifacts.length; index++) {
            this._artifacts[index].setImage(result[index]-1);
        }
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

export class DDice6 extends DDice {

    constructor(points) {
        super(points,[
                DImage.getImage("./../images/dice/d6c-1.png"),
                DImage.getImage("./../images/dice/d6c-2.png"),
                DImage.getImage("./../images/dice/d6c-3.png"),
                DImage.getImage("./../images/dice/d6c-4.png"),
                DImage.getImage("./../images/dice/d6c-5.png"),
                DImage.getImage("./../images/dice/d6c-6.png")
            ], 1, 1, 100, 96);
    }

}

export class DDice20 extends DDice {

    constructor(points) {
        super(points,[
            DImage.getImage("./../images/dice/d20-1.png"),
            DImage.getImage("./../images/dice/d20-2.png"),
            DImage.getImage("./../images/dice/d20-3.png"),
            DImage.getImage("./../images/dice/d20-4.png"),
            DImage.getImage("./../images/dice/d20-5.png"),
            DImage.getImage("./../images/dice/d20-6.png"),
            DImage.getImage("./../images/dice/d20-7.png"),
            DImage.getImage("./../images/dice/d20-8.png"),
            DImage.getImage("./../images/dice/d20-9.png"),
            DImage.getImage("./../images/dice/d20-10.png"),
            DImage.getImage("./../images/dice/d20-11.png"),
            DImage.getImage("./../images/dice/d20-12.png"),
            DImage.getImage("./../images/dice/d20-13.png"),
            DImage.getImage("./../images/dice/d20-14.png"),
            DImage.getImage("./../images/dice/d20-15.png"),
            DImage.getImage("./../images/dice/d20-16.png"),
            DImage.getImage("./../images/dice/d20-17.png"),
            DImage.getImage("./../images/dice/d20-18.png"),
            DImage.getImage("./../images/dice/d20-19.png"),
            DImage.getImage("./../images/dice/d20-20.png")
        ], 1, 1, 100, 96);
    }

}

export class DDice10 extends DDice {

    constructor(points) {
        super(points,[
            DImage.getImage("./../images/dice/d10-0.png"),
            DImage.getImage("./../images/dice/d10-1.png"),
            DImage.getImage("./../images/dice/d10-2.png"),
            DImage.getImage("./../images/dice/d10-3.png"),
            DImage.getImage("./../images/dice/d10-4.png"),
            DImage.getImage("./../images/dice/d10-5.png"),
            DImage.getImage("./../images/dice/d10-6.png"),
            DImage.getImage("./../images/dice/d10-7.png"),
            DImage.getImage("./../images/dice/d10-8.png"),
            DImage.getImage("./../images/dice/d10-9.png")
        ], 0, 1, 100, 96);
    }

}

export class DDice10x10 extends DDice {

    constructor(points) {
        super(points,[
            DImage.getImage("./../images/dice/d10-00.png"),
            DImage.getImage("./../images/dice/d10-10.png"),
            DImage.getImage("./../images/dice/d10-20.png"),
            DImage.getImage("./../images/dice/d10-30.png"),
            DImage.getImage("./../images/dice/d10-40.png"),
            DImage.getImage("./../images/dice/d10-50.png"),
            DImage.getImage("./../images/dice/d10-60.png"),
            DImage.getImage("./../images/dice/d10-70.png"),
            DImage.getImage("./../images/dice/d10-80.png"),
            DImage.getImage("./../images/dice/d10-90.png")
        ], 0, 10, 100, 96);
    }

}

export class DDiceAnimation extends DArtifactAnimation {

    constructor(diceArtifact, startTick, value) {
        super(diceArtifact, startTick);
        this._value = value;
        this._duration = 1000;
    }

    _init() {
        this._position = this._artifact.position;
    }

    _draw(count, ticks) {
        this._artifact.pangle = Math.floor(getDrawPlatform().random()*360);
        this._artifact.setImage(Math.floor(getDrawPlatform().random()*this._artifact.imageCount));
        this._artifact.position = new Point2D(
            this._position.x + Math.floor(getDrawPlatform().random()*30-15),
            this._position.y + Math.floor(getDrawPlatform().random()*50-50)
        );
        return count * 40 >= this._duration ? 0 : 2;
    }

    close() {
        this._artifact.pangle = 0;
        this._artifact.setImage(this._value);
        this._artifact.position = this._position;
    }
}

class IndicatorImageArtifact extends DMultiImagesArtifact {

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
        this._images = [];
        for (let path of paths) {
            this._images.push(DImage.getImage(path));
        }
        this._artifact = new IndicatorImageArtifact(this._images, dimension);
        this.addArtifact(this._artifact);
    }

    get images() {
        return this._images;
    }

    get artifact() {
        return this._artifact;
    }

    open(board, location) {
        this.show(board);
        this.move(location);
    }

    close() {
        if (this._board) {
            this.hide();
        }
    }

}

export class DMultiImagesIndicator extends DIndicator {

    constructor(paths, dimension, state=0) {
        super(paths, dimension);
        this._oldArtifact = new IndicatorImageArtifact(this.images, dimension);
        this.addArtifact(this._oldArtifact);
        this._oldArtifact.alpha = 0;
        this._artifact.setImage(state);
    }

    get state() {
        return this.artifact.imageIndex;
    }

    changeState(state) {
        this._oldArtifact.setImage(this._artifact.imageIndex);
        this._oldArtifact.alpha = 1;
        this._artifact.changeImage(state);
        new DArtifactAlphaAnimation(this._oldArtifact, 0, 0, 1000);
    }

}

export class DRotatableIndicator extends DIndicator {

    constructor(paths, dimension, angle=0) {
        super(paths, dimension);
        this.artifact.pangle = angle;
    }

    get state() {
        return this.artifact.pangle;
    }

    changeState(newAngle) {
        let angle = newAngle-this.artifact.pangle;
        if (angle>180) angle -= 360;
        if (angle<-180) angle += 360;
        new DArtifactRotateAnimation(this._artifact, angle, 0, 1000);
    }

}

class InsertImageArtifact extends DComposedImageArtifact {

    constructor(image, dimension) {
        super("widgets", new Point2D(0, 0), dimension);
        this.setSettings(this.settings);
        this._image = image;
    }

    addFrame(area) {
        this.addComposition(this._image, area, area);
    }

    onMouseClick(event) {
        //console.log(this.getPoint(Point2D.getEventPoint(event)).plusDim(this.dimension.half));
        return true;
    }

}

export class DCommand extends ActivableArtifactMixin(DMultiImagesArtifact) {

    constructor(image, inactiveImage, position, dimension, action) {
        super("widgets", [image, inactiveImage], position, dimension);
        this._action = action;
    }

    onMouseClick(event) {
        if (this.active) this._action.call(this.element);
        return true;
    }

    setActive(active) {
        super.setActive(active);
        this.setImage(active ? 0 : 1);
        return this;
    }

}

export class DLeftNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/left.png");
        let inactiveImage = DImage.getImage("./../images/commands/left-inactive.png");
        super(image, inactiveImage, position, DLeftNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DRightNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/right.png");
        let inactiveImage = DImage.getImage("./../images/commands/right-inactive.png");
        super(image, inactiveImage, position, DRightNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DUpNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/up.png");
        let inactiveImage = DImage.getImage("./../images/commands/up-inactive.png");
        super(image, inactiveImage, position, DUpNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DDownNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/down.png");
        let inactiveImage = DImage.getImage("./../images/commands/down-inactive.png");
        super(image, inactiveImage, position, DDownNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DPrevNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/prev.png");
        let inactiveImage = DImage.getImage("./../images/commands/prev-inactive.png");
        super(image, inactiveImage, position, DPrevNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(36, 36);
}

export class DNextNavigation extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/next.png");
        let inactiveImage = DImage.getImage("./../images/commands/next-inactive.png");
        super(image, inactiveImage, position, DNextNavigation.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(36, 36);
}

export class DOk extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/ok.png");
        let inactiveImage = DImage.getImage("./../images/commands/ok-inactive.png");
        super(image, inactiveImage, position, DOk.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DCancel extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/ko.png");
        let inactiveImage = DImage.getImage("./../images/commands/ko-inactive.png");
        super(image, inactiveImage, position, DCancel.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(50, 50);
}

export class DPlus extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/plus.png");
        let inactiveImage = DImage.getImage("./../images/commands/plus-inactive.png");
        super(image, inactiveImage, position, DPlus.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(25, 25);
}

export class DMinus extends DCommand {

    constructor(position, action) {
        let image = DImage.getImage("./../images/commands/minus.png");
        let inactiveImage = DImage.getImage("./../images/commands/minus-inactive.png");
        super(image, inactiveImage, position, DMinus.DIMENSION, action);
    }

    static DIMENSION = new Dimension2D(25, 25);
}

export class DInsertFrame {

    constructor(insert, index, area, pageArea) {
        this._insert = insert;
        this._index = index;
        this._area = area;
        this._pageArea = pageArea;
    }

    get area() {
        return this._area;
    }

    setNavigation(left, right, next, previous) {
        this._leftButtonManaged = left;
        this._rightButtonManaged = right;
        this._nextButtonManaged = next;
        this._previousButtonManaged = previous;
        return this;
    }

    _manageNavigation() {

        function _manageButton(isButtonVisible, buttonName, createButton) {
            if (isButtonVisible) {
                if (!this._insert[buttonName]) {
                    this._insert[buttonName] = createButton();
                }
                if (this._insert.hasArtifact(this._insert[buttonName])) {
                    this._insert.removeArtifact(this._insert[buttonName]);
                }
                this._insert.addArtifact(this._insert[buttonName]);
            }
            else {
                if (this._insert.hasArtifact(this._insert[buttonName])) {
                    this._insert.removeArtifact(this._insert[buttonName]);
                    delete this._insert[buttonName];
                }
            }
        }

        function _manageLeftButton(composition) {
            _manageButton.call(this,
                composition.sourceArea.left>this._pageArea.left, "_leftButton",
                ()=>{
                    let position = new Point2D(
                        this._area.left+DLeftNavigation.DIMENSION.w/2+10-this._insert.dimension.w/2,
                        this._area.y-this._insert.dimension.h/2);
                    return new DLeftNavigation(position, this._insert.leftPage);
                }
            );
        }

        function _manageRightButton(composition) {
            _manageButton.call(this,
                composition.sourceArea.right<this._pageArea.right, "_rightButton",
                ()=>{
                    let position = new Point2D(
                        this._area.right-this._insert.dimension.w/2-DRightNavigation.DIMENSION.w/2-10,
                        this._area.y-this._insert.dimension.h/2);
                    return new DRightNavigation(position, this._insert.rightPage);
                }
            );
        }

        function _managePreviousButton() {
            _manageButton.call(this,
                composition.sourceArea.top>this._pageArea.top, "_upButton",
                ()=>{
                    let position = new Point2D(
                        this._area.x-this._insert.dimension.w/2,
                        this._area.top+DUpNavigation.DIMENSION.w/2+10-this._insert.dimension.h/2);
                    return new DUpNavigation(position, this._insert.previousPage);
                }
            );
        }

        function _manageNextButton() {
            _manageButton.call(this,
                composition.sourceArea.bottom<this._pageArea.bottom, "_downButton",
                ()=>{
                    let position = new Point2D(
                        this._area.x-this._insert.dimension.w/2,
                        this._area.bottom-DDownNavigation.DIMENSION.w/2-10-this._insert.dimension.h/2);
                    return new DDownNavigation(position, this._insert.nextPage);
                }
            );
        }

        let composition = this._insert.artifact.getComposition(this._index);
        if (this._leftButtonManaged) {
            _manageLeftButton.call(this, composition);
        }
        if (this._rightButtonManaged) {
            _manageRightButton.call(this, composition);
        }
        if (this._nextButtonManaged) {
            _manageNextButton.call(this, composition);
        }
        if (this._previousButtonManaged) {
            _managePreviousButton.call(this, composition);
        }
    }

    moveTo(origin) {
        let composition = this._insert.artifact.getComposition(this._index);
        let {x, y} = origin;
        if (x+composition.destArea.w>this._pageArea.right) {
            x = this._pageArea.right - composition.destArea.w;
        }
        else if (x<this._pageArea.left) {
            x = this._pageArea.left;
        }
        if (y+composition.destArea.h>this._pageArea.bottom) {
            y = this._pageArea.bottom - composition.destArea.h;
        }
        else if (y<this._pageArea.top) {
            y = this._pageArea.top;
        }
        this._insert.artifact.setComposition(this._index, composition.image,
            composition.destArea,
            Area2D.create(new Point2D(x, y), composition.sourceArea.dimension)
        );
        this._moveMarks();
        this._manageNavigation();
    }

    focusOn(focus) {
        this.moveTo(focus.minusDim(this._area.dimension.half));
    }

    _rightPage() {
        let composition = this._insert.artifact.getComposition(this._index);
        let position = composition.sourceArea.left + DAbstractInsert.PAGE_WIDTH;
        this.moveTo(new Point2D(position, composition.sourceArea.top));
    }

    _leftPage() {
        let composition = this._insert.artifact.getComposition(this._index);
        let position = composition.sourceArea.left - DAbstractInsert.PAGE_WIDTH;
        this.moveTo(new Point2D(position, composition.sourceArea.top));
    }

    _nextPage() {
        let composition = this._insert.artifact.getComposition(this._index);
        let position = composition.sourceArea.top + DAbstractInsert.PAGE_HEIGHT;
        this.moveTo(new Point2D(composition.sourceArea.left, position));
    }

    _previousPage() {
        let composition = this._insert.artifact.getComposition(this._index);
        let position = composition.sourceArea.top - DAbstractInsert.PAGE_HEIGHT;
        this.moveTo(new Point2D(composition.sourceArea.left, position));
    }

    _moveMarks() {
        for (let mark of this._insert._marks) {
            this._manageVisibility(mark);
        }
    }

    _getMarkPosition(markLocation) {
        let composition = this._insert.artifact.getComposition(this._index);
        return markLocation.minusPoint(composition.sourceArea.origin).plusPoint(this.area.origin).minusDim(this._insert.dimension.half);
    }

    _manageVisibility(mark) {

        function isVisible(mark) {
            let composition = this._insert.artifact.getComposition(this._index);
            return composition.sourceArea.contains(
                Area2D.create(mark.location.minusDim(DAbstractInsert.OK_DIMENSION.half), DAbstractInsert.OK_DIMENSION)
            );
        }

        mark.artifact.position = this._getMarkPosition(mark.location);
        if (this._pageArea.inside(mark.location)) {
            if (this._insert.hasArtifact(mark.artifact) && (!isVisible.call(this, mark))) {
                this._insert.removeArtifact(mark.artifact);
            }
            else if (!this._insert.hasArtifact(mark.artifact) && (isVisible.call(this, mark))) {
                this._insert.addArtifact(mark.artifact);
            }
        }

    }

}

class InsertBorder extends DRectArtifact {

    constructor(dimension) {
        super("widgets", new Point2D(0, 0),  dimension,1, "#000000");
        this.setSettings(level => level.setShadowSettings("#000000", 10))
    }

}

export class DAbstractInsert extends DElement {

    constructor(path, dimension, pageDimension=dimension) {
        super();
        this._pageDimension = pageDimension;
        this._artifact = new InsertImageArtifact(DImage.getImage(path), dimension);
        this.addArtifact(new InsertBorder(dimension));
        this.addArtifact(this._artifact);

        this._marks = [];
        this._frames = [];
    }

    addFrame(frame) {
        this._frames.push(frame);
        this._artifact.addFrame(frame.area);
        frame._manageNavigation();
    }

    setMark(location) {
        let okImage = DImage.getImage("./../images/inserts/ok.png");
        let mark = {
            location,
            artifact:new DImageArtifact(
                "widgets", okImage,
                new Point2D(0, 0), DAbstractInsert.OK_DIMENSION),
        };
        this._marks.push(mark);
        for (let frame of this._frames) {
            frame._manageVisibility(mark);
        }
    }

    get dimension() {
        return this.artifact.dimension;
    }

    get artifact() {
        return this._artifact;
    }

    open(board, location) {
        this.show(board);
        this.move(location);
    }

    close() {
        if (this._board) {
            this.hide();
        }
    }

    leftPage() {
        for (let frame of this._frames) {
            frame._leftPage();
        }
    }

    rightPage() {
        for (let frame of this._frames) {
            frame._rightPage();
        }
    }

    nextPage() {
        for (let frame of this._frames) {
            frame._nextPage();
        }
    }

    previousPage() {
        for (let frame of this._frames) {
            frame._previousPage();
        }
    }

}
DAbstractInsert.OK_DIMENSION = new Dimension2D(25, 25);
DAbstractInsert.PAGE_WIDTH = 100;
DAbstractInsert.PAGE_HEIGHT = 100;

export class DInsert extends DAbstractInsert {

    constructor(path, dimension, pageDimension = dimension) {
        super(path, dimension, pageDimension);
        this._frame = new DInsertFrame(this, 0,
            Area2D.create(new Point2D(0, 0), dimension),
            Area2D.create(new Point2D(0, 0), pageDimension)
        ).setNavigation(true, true, true, true);
        this.addFrame(this._frame);
    }

    focusOn(focus) {
        this._frame.focusOn(focus);
    }

    get leftButton() {
        return this._leftButton;
    }

    get rightButton() {
        return this._rightButton;
    }

    get upButton() {
        return this._upButton;
    }

    get downButton() {
        return this._downButton;
    }

}

class ResultImageArtifact extends DMultiImagesArtifact {

    constructor(image, dimension) {
        super("widget-commands", [
            DImage.getImage("./../images/dice/failure.png"),
            DImage.getImage("./../images/dice/success.png")
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

    onMouseClick(event) {
        this._element.onMouseClick();
        return true;
    }

    onMouseEnter(event) {
        this.setSettings(this._insideSettings);
        return true;
    }

    onMouseLeave(event) {
        this.setSettings(this._outsideSettings);
        return true;
    }
}
ResultImageArtifact.DIMENSION = new Dimension2D(150, 150);

export class DResult extends DElement {

    constructor() {
        super();
        this._artifact = new ResultImageArtifact();
        this.addArtifact(this._artifact);
        this._active = true;
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
        this.move(location);
        this._targetBoard = board;
    }

    appear() {
        if (this._targetBoard) {
            this.show(this._targetBoard);
            new DArtifactAlphaAnimation(this._artifact, 1, 0, 500);
        }
    }

    close() {
        delete this._targetBoard;
        if (this._board) {
            this.hide();
        }
        Memento.clear();
    }

    get active() {
        return this._active;
    }

    set active(active) {
        this._active = active;
    }

    onMouseClick() {
        if (this.active) {
            this._finalAction && this._finalAction(this._success);
            return true;
        }
    }

}

/**
 * A widget that shows a "progress" indicator in a scene. The progress is
 */
class SwipeImageArtifact extends DMultiImagesArtifact {

    constructor(image, dimension) {
        super("widget-commands", [
            DImage.getImage("./../images/dice/swipe-up.png"),
            DImage.getImage("./../images/dice/no-swipe.png"),
            DImage.getImage("./../images/dice/swipe-down.png")
        ], new Point2D(0, 0), SwipeImageArtifact.DIMENSION, 0);
        this.alpha = 0;
    }

    swipeUp() {
        this.setImage(0);
        this._insideSettings = this.swipeUpOverSettings;
        this._outsideSettings = this.swipeUpSettings;
        this.setSettings(this._outsideSettings);
        return this;
    }

    swipeDown() {
        this.setImage(2);
        this._insideSettings = this.swipeDownOverSettings;
        this._outsideSettings = this.swipeDownSettings;
        this.setSettings(this._outsideSettings);
        return this;
    }

    noSwipe() {
        this.setImage(1);
        this._insideSettings = this.noSwipeOverSettings;
        this._outsideSettings = this.noSwipeSettings;
        this.setSettings(this._outsideSettings);
        return this;
    }

    get swipeUpSettings() {
        return level => {
            level.setShadowSettings("#00A000", 100);
        }
    }

    get swipeUpOverSettings() {
        return level => {
            level.setShadowSettings("#00FF00", 100);
        }
    }

    get noSwipeSettings() {
        return level => {
            level.setShadowSettings("#00A000", 100);
        }
    }

    get noSwipeOverSettings() {
        return level => {
            level.setShadowSettings("#00FF00", 100);
        }
    }

    get swipeDownSettings() {
        return level => {
            level.setShadowSettings("#00A000", 100);
        }
    }

    get swipeDownOverSettings() {
        return level => {
            level.setShadowSettings("#00FF00", 100);
        }
    }

    onMouseClick(event) {
        this._element.onMouseClick();
        return true;
    }

    onMouseEnter(event) {
        this.setSettings(this._insideSettings);
        return true;
    }

    onMouseLeave(event) {
        this.setSettings(this._outsideSettings);
        return true;
    }

}
SwipeImageArtifact.DIMENSION = new Dimension2D(150, 150);

export class DSwipe extends DElement {

    constructor() {
        super();
        this._artifact = new SwipeImageArtifact();
        this.addArtifact(this._artifact);
    }

    setFinalAction(action) {
        this._finalAction = action;
        return this;
    }

    get trigger() {
        return this._artifact;
    }

    swipeUp() {
        this._artifact.swipeUp();
        this._swipe = DSwipe.SWIPE_UP;
        this._finished = true;
        return this;
    }

    noSwipe() {
        this._artifact.noSwipe();
        this._swipe = DSwipe.NO_SWIPE;
        this._finished = true;
        return this;
    }

    swipeDown() {
        this._artifact.swipeDown();
        this._swipe = DSwipe.SWIPE_DOWN;
        this._finished = true;
        return this;
    }

    get finished() {
        return this._finished;
    }

    open(board, location) {
        this.move(location);
        this._targetBoard = board;
    }

    appear() {
        if (this._targetBoard) {
            this.show(this._targetBoard);
            new DArtifactAlphaAnimation(this._artifact, 1, 0, 500);
        }
    }

    close() {
        delete this._targetBoard;
        if (this._board) {
            this.hide();
        }
        Memento.clear();
    }

    onMouseClick() {
        this._finalAction && this._finalAction(this._swipe);
        return true;
    }

    static SWIPE_UP = 0;
    static NO_SWIPE = 1;
    static SWIPE_DOWN = 2;
}

class MessageImageArtifact extends DImageArtifact {

    constructor() {
        super("widget-commands",
            DImage.getImage("./../images/dice/message.png"),
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
        return true;
    }

    onMouseEnter(event) {
        this.setSettings(this.overSettings);
        return true;
    }

    onMouseLeave(event) {
        this.setSettings(this.settings);
        return true;
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
        this.move(location);
        this._targetBoard = board;
    }

    appear(text, ...values) {
        this._values = values;
        this._textArtifact = new DTextArtifact("widget-commands",
            new Point2D(0, 10),
            new Dimension2D(0, 0),
            "#0000FF","#8080FF", 3,
            "#000000", 5,
            "90px serif", "center", "middle", text);
        this.addArtifact(this._textArtifact);
        if (this._targetBoard) {
            this.show(this._targetBoard);
            new DArtifactAlphaAnimation(this._artifact, 1, 0, 500);
            new DArtifactAlphaAnimation(this._textArtifact, 1, 0, 500);
        }
    }

    close() {
        delete this._targetBoard;
        if (this._board) {
            this.hide();
        }
    }

    onMouseClick() {
        this._finalAction && this._finalAction(...this._values);
        return true;
    }

}

class DMaskArtifact extends DArtifact {

    constructor(color = "#000000", alpha = 0.3) {
        super("widgets");
        this._color = color;
        this._alpha = alpha;
    }

    _paint() {
        console.assert(this._level);
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

    mayCaptureEvent(event) {
        return true;
    }

    onMouseClick(event) {
        let alpha = !!this._element.alpha;
        this._element.action && this._element.action();
        return alpha;
    }

    onMouseMove(event) {
        return !!this._element.alpha;
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
        this.show(board);
        this.move(location);
    }

    close() {
        this.hide();
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
