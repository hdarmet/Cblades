'use strict'

import {
    CBActuator, CBActuatorMultiImagesTrigger,
    CBGame
} from "./game.js";
import {
    DImage
} from "../draw.js";
import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    Memento
} from "../mechanisms.js";

export class CBMapEditorHexHeightTrigger extends CBActuatorMultiImagesTrigger {

    constructor(actuator, hex) {
        let images = [
            DImage.getImage("/CBlades/images/actuators/ground/level-down-5.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-down-4.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-down-3.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-down-2.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-down-1.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-0.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-up-1.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-up-2.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-up-3.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-up-4.png"),
            DImage.getImage("/CBlades/images/actuators/ground/level-up-5.png")
        ];
        super(actuator, "actuators", images,  hex.location.plus(40, 0), new Dimension2D(70, 70));
        this._hex = hex;
        this._height = hex.height;
        this.setImage(this._height+5);
    }

    _memento() {
        let memento = super._memento();
        memento.height = this._height
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._height = memento.height;
    }

    get hexLocation() {
        return this._hex;
    }

    onMouseClick(event) {
        Memento.register(this);
        this._height = event.altKey ? (this._height+15)%11-5 : (this._height+6)%11-5;
        this._hex.changeHeight(this._height);
        this.changeImage(this._height+5);
        return true;
    }

}

export class CBMapEditorHexTypeTrigger extends CBActuatorMultiImagesTrigger {

    constructor(actuator, hex) {
        let images = [
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-clear.png"),
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-rough.png"),
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-difficult.png"),
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-clear-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-rough-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/outdoor-difficult-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/water.png"),
            DImage.getImage("/CBlades/images/actuators/ground/lava.png"),
            DImage.getImage("/CBlades/images/actuators/ground/impassable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-clear.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-rough.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-difficult.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-clear-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-rough-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/ground/cave-difficult-flammable.png")
        ];
        super(actuator, "actuators", images,  hex.location.minus(40, 0), new Dimension2D(60, 60));
        this._hex = hex;
        this._type = hex.type;
        this.setImage(this._type);
    }

    _memento() {
        let memento = super._memento();
        memento.type = this._type
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._type = memento.type;
    }

    get hexLocation() {
        return this._hex;
    }

    onMouseClick(event) {
        Memento.register(this);
        this._type = event.altKey ? (this._type+14)%15 : (this._type+1)%15;
        this._hex.changeType(this._type);
        this.changeImage(this._type);
        return true;
    }

}

export class CBMapEditorHexSideTypeTrigger extends CBActuatorMultiImagesTrigger {

    constructor(actuator, hexSide) {
        let images = [
            DImage.getImage("/CBlades/images/actuators/ground/normal.png"),
            DImage.getImage("/CBlades/images/actuators/ground/easy.png"),
            DImage.getImage("/CBlades/images/actuators/ground/difficult.png"),
            DImage.getImage("/CBlades/images/actuators/ground/climb.png"),
            DImage.getImage("/CBlades/images/actuators/ground/wall.png")
        ];
        super(actuator, "actuators", images,  hexSide.location, new Dimension2D(46, 20));
        this._hexSide = hexSide;
        this.pangle = hexSide.angle;
        this._type = hexSide.type;
        this.setImage(this._type);
    }

    _memento() {
        let memento = super._memento();
        memento.type = this._type
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._type = memento.type;
    }

    get hexLocation() {
        return this._hexSide;
    }

    onMouseClick(event) {
        Memento.register(this);
        this._type = event.altKey ? (this._type+4)%5 : (this._type+1)%5;
        this._hexSide.changeType(this._type);
        this.changeImage(this._type);
        return true;
    }

}

export class CBMapEditActuator extends CBActuator {

    constructor(map) {
        super();

        let imageArtifacts = [];
        for (let hex of map.hexes) {
            let triggerType = new CBMapEditorHexTypeTrigger(this, hex);
            imageArtifacts.push(triggerType);
            let triggerHeight = new CBMapEditorHexHeightTrigger(this, hex);
            imageArtifacts.push(triggerHeight);
        }
        for (let hexSide of map.hexSides) {
            let trigger = new CBMapEditorHexSideTypeTrigger(this, hexSide);
            imageArtifacts.push(trigger);
        }
        this.initElement(imageArtifacts);
    }

    getHexTypeTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBMapEditorHexTypeTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

    getHexHeightTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBMapEditorHexHeightTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

    getHexSideTypeTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBMapEditorHexSideTypeTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export function registerEditor() {
    CBGame.edit = function (game) {
        game.closeActuators();
        game.openActuator(new CBMapEditActuator(game.map));
    }
}

export function unregisterEditor() {
    delete CBGame.edit;
}
