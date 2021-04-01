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

export class CBMapEditorHexTrigger extends CBActuatorMultiImagesTrigger {

    constructor(actuator, hex) {
        let images = [
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-clear.png"),
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-rough.png"),
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-difficult.png"),
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-clear-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-rough-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/outdoor-difficult-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/water.png"),
            DImage.getImage("/CBlades/images/actuators/terran/lava.png"),
            DImage.getImage("/CBlades/images/actuators/terran/impassable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-clear.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-rough.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-difficult.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-clear-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-rough-flammable.png"),
            DImage.getImage("/CBlades/images/actuators/terran/cave-difficult-flammable.png")
        ];
        super(actuator, "actuators", images,  new Point2D(0, 0), new Dimension2D(60, 60));
        this._hex = hex;
        this.position = hex.location;
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

    onMouseClick(trigger, event) {
        Memento.register(this);
        this._type = (this._type+1)%15;
        this._hex.changeType(this._type);
        this.changeImage(this._type);
    }

}

export class CBMapEditorHexSideTrigger extends CBActuatorMultiImagesTrigger {

    constructor(actuator, hexSide) {
        let images = [
            DImage.getImage("/CBlades/images/actuators/terran/normal.png"),
            DImage.getImage("/CBlades/images/actuators/terran/easy.png"),
            DImage.getImage("/CBlades/images/actuators/terran/difficult.png"),
            DImage.getImage("/CBlades/images/actuators/terran/climb.png"),
            DImage.getImage("/CBlades/images/actuators/terran/wall.png")
        ];
        super(actuator, "actuators", images,  new Point2D(0, 0), new Dimension2D(46, 20));
        this._hexSide = hexSide;
        this.position = hexSide.location;
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

    onMouseClick(trigger, event) {
        Memento.register(this);
        this._type = (this._type+1)%5;
        this._hexSide.changeType(this._type);
        this.changeImage(this._type);
    }

}

export class CBMapEditActuator extends CBActuator {

    constructor(map) {
        super();

        let imageArtifacts = [];
        for (let hex of map.hexes) {
            let trigger = new CBMapEditorHexTrigger(this, hex);
            imageArtifacts.push(trigger);
        }
        for (let hexSide of map.hexSides) {
            let trigger = new CBMapEditorHexSideTrigger(this, hexSide);
            imageArtifacts.push(trigger);
        }
        this.initElement(imageArtifacts);
    }

    getTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger.hexLocation.similar(hexLocation));
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
