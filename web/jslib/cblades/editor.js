'use strict'

import {
    CBActuator,
    CBAbstractGame
} from "./game.js";
import {
    CBActuatorMultiImagesTrigger,
    NeighborRawActuatorArtifactMixin,
    NeighborActuatorArtifactMixin,
    NeighborActuatorMixin,
    ActivableArtifactMixin, CBActuatorImageTrigger, GhostArtifactMixin
} from "./playable.js";
import {
    DImage
} from "../draw.js";
import {
    atan2, diffAngle,
    Dimension2D, inside, Point2D, sumAngle
} from "../geometry.js";
import {
    Memento
} from "../mechanisms.js";
import {
    DLeftNavigation, DNextNavigation,
    DPopup, DPrevNavigation, DRightNavigation
} from "../widget.js";
import {
    DImageArtifact, DPedestalArtifact, DRectArtifact
} from "../board.js";
import {GoblinLeader, GoblinSkirmisher, GoblinWolfRider, WizardLeader} from "./armies/orcs.js";
import {
    RoughneckCrossbowman,
    RoughneckKnight,
    RoughneckLance,
    RoughneckLeader,
    RoughneckSorceressCharacter
} from "./armies/roughnecks.js";

export class CBMapEditorHexHeightTrigger extends NeighborRawActuatorArtifactMixin(CBActuatorMultiImagesTrigger) {

    constructor(actuator, hex) {
        let images = [
            DImage.getImage("./../images/actuators/ground/level-down-5.png"),
            DImage.getImage("./../images/actuators/ground/level-down-4.png"),
            DImage.getImage("./../images/actuators/ground/level-down-3.png"),
            DImage.getImage("./../images/actuators/ground/level-down-2.png"),
            DImage.getImage("./../images/actuators/ground/level-down-1.png"),
            DImage.getImage("./../images/actuators/ground/level-0.png"),
            DImage.getImage("./../images/actuators/ground/level-up-1.png"),
            DImage.getImage("./../images/actuators/ground/level-up-2.png"),
            DImage.getImage("./../images/actuators/ground/level-up-3.png"),
            DImage.getImage("./../images/actuators/ground/level-up-4.png"),
            DImage.getImage("./../images/actuators/ground/level-up-5.png")
        ];
        super(hex, actuator, "actuators", images,  hex.location.plus(40, 0), new Dimension2D(70, 70));
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

    onMouseClick(event) {
        Memento.register(this);
        this._height = event.altKey ? (this._height+15)%11-5 : (this._height+6)%11-5;
        this.hexLocation.changeHeight(this._height);
        this.changeImage(this._height+5);
        return true;
    }

}

export class CBMapEditorHexTypeTrigger extends NeighborActuatorArtifactMixin(CBActuatorMultiImagesTrigger) {

    constructor(actuator, hex) {
        let images = [
            DImage.getImage("./../images/actuators/ground/outdoor-clear.png"),
            DImage.getImage("./../images/actuators/ground/outdoor-rough.png"),
            DImage.getImage("./../images/actuators/ground/outdoor-difficult.png"),
            DImage.getImage("./../images/actuators/ground/outdoor-clear-flammable.png"),
            DImage.getImage("./../images/actuators/ground/outdoor-rough-flammable.png"),
            DImage.getImage("./../images/actuators/ground/outdoor-difficult-flammable.png"),
            DImage.getImage("./../images/actuators/ground/water.png"),
            DImage.getImage("./../images/actuators/ground/lava.png"),
            DImage.getImage("./../images/actuators/ground/impassable.png"),
            DImage.getImage("./../images/actuators/ground/cave-clear.png"),
            DImage.getImage("./../images/actuators/ground/cave-rough.png"),
            DImage.getImage("./../images/actuators/ground/cave-difficult.png"),
            DImage.getImage("./../images/actuators/ground/cave-clear-flammable.png"),
            DImage.getImage("./../images/actuators/ground/cave-rough-flammable.png"),
            DImage.getImage("./../images/actuators/ground/cave-difficult-flammable.png")
        ];
        super(hex, actuator, "actuators", images,  hex.location.minus(40, 0), new Dimension2D(60, 60));
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

    onMouseClick(event) {
        Memento.register(this);
        this._type = event.altKey ? (this._type+14)%15 : (this._type+1)%15;
        this.hexLocation.changeType(this._type);
        this.changeImage(this._type);
        return true;
    }

}

export class CBMapEditorHexSideTypeTrigger extends NeighborRawActuatorArtifactMixin(CBActuatorMultiImagesTrigger) {

    constructor(actuator, hexSide) {
        let images = [
            DImage.getImage("./../images/actuators/ground/normal.png"),
            DImage.getImage("./../images/actuators/ground/easy.png"),
            DImage.getImage("./../images/actuators/ground/difficult.png"),
            DImage.getImage("./../images/actuators/ground/climb.png"),
            DImage.getImage("./../images/actuators/ground/wall.png")
        ];
        super(hexSide, actuator, "actuators", images,  hexSide.location, new Dimension2D(46, 20));
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

    onMouseClick(event) {
        Memento.register(this);
        this._type = event.altKey ? (this._type+4)%5 : (this._type+1)%5;
        this.hexLocation.changeType(this._type);
        this.changeImage(this._type);
        return true;
    }

}

export class CBMapEditActuator extends NeighborActuatorMixin(CBActuator) {

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

export class CBUnitPlacementTrigger extends GhostArtifactMixin(CBActuatorImageTrigger) {

    constructor(actuator, hex) {
        let image= DImage.getImage("./../images/actuators/unit-t.png");
        super(actuator, "actuators", image,  hex.location, new Dimension2D(100, 200));
        this._hexLocation = hex;
        this.pangle = 0;
    }

    containsPoint(point) {
        return inside(point, this._hexLocation.borders);
    }

    mayCaptureEvent(event) {
        return true;
    }

    onMouseMove(event) {
        let offset = this.level.getPoint(new Point2D(event.offsetX, event.offsetY));
        let location = this.location;
        let angle = Math.round(atan2(offset.x-location.x, offset.y-location.y)/30)*30;
        if (angle === 360) angle = 0;
        if (this.pangle !== angle) {
            this.pangle = angle;
        }
        return true;
    }

    onMouseClick(event) {
        Memento.register(this);
        return true;
    }

}

export class CBUnitPlacementActuator extends CBActuator {

    constructor(map) {
        super();

        let artifacts = [];
        for (let hex of map.hexes) {
            let triggerUnit = new CBUnitPlacementTrigger(this, hex);
            artifacts.push(triggerUnit);
        }
        this.initElement(artifacts);
    }

    getTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBUnitPlacementTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export class CBFormationPlacementTrigger extends GhostArtifactMixin(CBActuatorImageTrigger) {

    constructor(actuator, hexSide) {
        let image= DImage.getImage("./../images/actuators/unit-f.png");
        super(actuator, "actuators", image,  hexSide.location, new Dimension2D(200, 200));
        this._hexLocation = hexSide;
        this.pangle = sumAngle(this._hexLocation.angle, 90);
    }

    containsPoint(point) {
        return inside(point, this._hexLocation.borders);
    }

    mayCaptureEvent(event) {
        return true;
    }

    onMouseMove(event) {
        let offset = this.level.getPoint(new Point2D(event.offsetX, event.offsetY));
        let location = this.location;
        let angle = Math.round(atan2(offset.x-location.x, offset.y-location.y));
        if (diffAngle(angle, this._hexLocation.angle)>=0) {
            angle = sumAngle(this._hexLocation.angle, -90);
        }
        else {
            angle = sumAngle(this._hexLocation.angle, 90);
        }
        if (this.pangle !== angle) {
            this.pangle = angle;
        }
        return true;
    }

    onMouseClick(event) {
        Memento.register(this);
        return true;
    }

}

export class CBFormationPlacementActuator extends CBActuator {

    constructor(map) {
        super();
        let artifacts = [];
        for (let hexSide of map.hexSides) {
            let triggerUnit = new CBFormationPlacementTrigger(this, hexSide);
            artifacts.push(triggerUnit);
        }
        this.initElement(artifacts);
    }

    getTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBUnitPlacementTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export class CBPartyArtifact extends ActivableArtifactMixin(DImageArtifact) {

    constructor(index, emblem) {
        super("widgets", DImage.getImage(emblem),
            new Point2D((CBPartyArtifact.DIMENSION.w+10)*(index-2), CBUnitsRoster.HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBPartyArtifact.DIMENSION);
        this._index = index;
    }

    get settings() {
        return level => {
            level.setShadowSettings("#000000", 5);
        }
    }

    onMouseClick(event) {
        this.element.changeRosterContent(this._index);
        return true;
    }

    static DIMENSION = new Dimension2D(60, 60);
}

export class CBUnitTypeArtifact extends ActivableArtifactMixin(DPedestalArtifact) {

    constructor(type, x, y) {
        super(null, "widgets", new Point2D(x, y));
        this._type = type;
        this._step = 1;
        this.artifact = this._buildUnitArtifact(this._type, this._step);
    }

    _buildUnitArtifact(type, index) {
        let troopPathLength = type.getTroopPaths().length;
        if (index<troopPathLength) {
            return new DImageArtifact("-", DImage.getImage(
                    type.getTroopPaths()[troopPathLength-index-1]
                ),
                new Point2D(0, 0),
                new Dimension2D(CBUnitTypeArtifact.DIMENSION.w, CBUnitTypeArtifact.DIMENSION.h));
        }
        else {
            let formationPathLength = type.getFormationPaths().length;
            return new DImageArtifact("-", DImage.getImage(
                    type.getFormationPaths()[formationPathLength-index+troopPathLength-1]
                ),
                new Point2D(0, 0),
                new Dimension2D(CBUnitTypeArtifact.DIMENSION.w * 2, CBUnitTypeArtifact.DIMENSION.h));
        }
    }

    isFormation() {
        return this._step>=this._type.getTroopPaths().length;
    }

    get settings() {
        return level => {
            level.setShadowSettings("#000000", 5);
        }
    }

    get step() {
        return this._step;
    }

    get maxStep() {
        let troopPathLength = this._type.getTroopPaths().length;
        let formationPathLength = this._type.getFormationPaths() ? this._type.getFormationPaths().length : 0;
        return troopPathLength + formationPathLength -1;
    }

    shiftStep(stepShift) {
        this._step += stepShift;
        if (this._step < 0) this._step = 0;
        if (this._step >= this.maxStep) this._step = this.maxStep;
        this.artifact = this._buildUnitArtifact(this._type, this._step);
    }

    onMouseClick(event) {
        console.log("chose");
        this.element.placeUnit(this);
        return true;
    }

    static DIMENSION = new Dimension2D(60, 60);
}

export class CBUnitsRoster extends DPopup {

    constructor(game) {
        super(CBUnitsRoster.DIMENSION);
        this._game = game;
        this.addArtifact(new DRectArtifact("widgets",
            new Point2D(0, CBUnitsRoster.HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBUnitsRoster.HEADER_DIMENSION, 1, "#000000", "#C0C0C0")
        );
        this._buildRosterCommands();
        this._buildRosters();
        this._changeRosterContent(CBUnitsRoster.rosterIndex);
    }

    _update() {
        if (this._rosterArtifacts) {
            for (let rosterArtifact of this._rosterArtifacts) {
                this.removeArtifact(rosterArtifact);
            }
        }
        this._rosterArtifacts = [];
        for (let index=CBUnitsRoster.rosterStart; index<CBUnitsRoster.rosters.length && index<CBUnitsRoster.rosterStart+5; index++) {
            let roster = CBUnitsRoster.rosters[index];
            let rosterArtifact = new CBPartyArtifact(index-CBUnitsRoster.rosterStart, roster.emblem);
            this._rosterArtifacts.push(rosterArtifact);
            this.addArtifact(rosterArtifact);
        }
    }

    _buildRosterCommands() {
        this._leftRoster = new DLeftNavigation(
            new Point2D(-CBUnitsRoster.DIMENSION.w/2+35, CBUnitsRoster.HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                CBUnitsRoster.rosterStart--;
                this._rightRoster.setActive(true);
                if (CBUnitsRoster.rosterStart===0) this._leftRoster.setActive(false);
                this._update();
            }
        );
        this.addArtifact(this._leftRoster);
        this._rightRoster = new DRightNavigation(
            new Point2D(CBUnitsRoster.DIMENSION.w/2-35, CBUnitsRoster.HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                CBUnitsRoster.rosterStart++;
                this._leftRoster.setActive(true);
                if (CBUnitsRoster.rosterStart===CBUnitsRoster.rosters.length-5) this._rightRoster.setActive(false);
                this._update();
            }
        );
        this.addArtifact(this._rightRoster);
    }

    _changeRosterContent(index) {
        if (this._unitArtifacts) {
            for (let unitType of this._unitArtifacts) {
                this.removeArtifact(unitType);
            }
        }
        let roster = CBUnitsRoster.rosters[index];
        this._unitArtifacts = CBUnitsRoster.rosterMap.get(roster);
        if (this._unitArtifacts) {
            for (let unitType of this._unitArtifacts) {
                this.addArtifact(unitType);
            }
        }
        else {
            this.buildRosterContent(roster);
            CBUnitsRoster.rosterMap.set(roster, this._unitArtifacts);
        }
    }

    changeRosterContent(index) {
        CBUnitsRoster.rosterIndex = CBUnitsRoster.rosterStart+index;
        this._changeRosterContent(CBUnitsRoster.rosterIndex);
    }

    buildRosterContent(roster) {
        this._unitArtifacts = [];
        for (let index = 0; index<roster.unitTypes.length; index++) {
            let col = index % 2;
            let row = Math.floor(index / 2);
            let x = col % 2 ? CBUnitsRoster.DIMENSION.w / 4 : -CBUnitsRoster.DIMENSION.w / 4;
            let y = CBUnitsRoster.HEADER_DIMENSION.h - CBUnitsRoster.DIMENSION.h / 2 +
                (CBUnitTypeArtifact.DIMENSION.h + 10) * (row + 0.5) + 20;
            let unitTypeArtifact = this._buildUnitTypeArtifact(roster.unitTypes[index], x, y);
            this._buildUnitTypeEnhancers(x, y, unitTypeArtifact);
        }
    }

    _buildUnitTypeArtifact(unitType, x, y) {
        let unitTypeArtifact = new CBUnitTypeArtifact(unitType, x, y);
        this._unitArtifacts.push(unitTypeArtifact);
        this.addArtifact(unitTypeArtifact);
        return unitTypeArtifact;
    }

    _buildUnitTypeEnhancers(x, y, unitTypeArtifact) {
        let prevEnhancer;
        let nextEnhancer;
        function activateEnhancers() {
            prevEnhancer.setActive(unitTypeArtifact.step > 0) ;
            nextEnhancer.setActive(unitTypeArtifact.step < unitTypeArtifact.maxStep);
        }
        prevEnhancer = new DPrevNavigation(new Point2D(x-CBUnitTypeArtifact.DIMENSION.w*1.5, y),
            ()=>{
                unitTypeArtifact.shiftStep(-1);
                activateEnhancers();
            }
        );
        this._unitArtifacts.push(prevEnhancer);
        this.addArtifact(prevEnhancer);
        nextEnhancer = new DNextNavigation(new Point2D(x+CBUnitTypeArtifact.DIMENSION.w*1.5, y),
            ()=>{
                unitTypeArtifact.shiftStep(1);
                activateEnhancers();
            }
        );
        this._unitArtifacts.push(nextEnhancer);
        this.addArtifact(nextEnhancer);
        activateEnhancers();
    }

    _buildRosters() {
        this._update();
        this._leftRoster.setActive(CBUnitsRoster.rosterStart>0);
        this._rightRoster.setActive(CBUnitsRoster.rosterStart<CBUnitsRoster.rosters.length-5);
    }

    static rosters = [{
        emblem:"./../images/units/orcs/unit1L.png",
        unitTypes: [
            GoblinLeader, WizardLeader, GoblinWolfRider, GoblinSkirmisher
        ]
    }, {
        emblem:"./../images/units/mercenaries/unit1L.png",
        unitTypes: [
            RoughneckLeader, RoughneckSorceressCharacter, RoughneckKnight,
            RoughneckLance, RoughneckCrossbowman
        ]
    }, {
        emblem:"./../images/units/orcs/unit1L.png",
        unitTypes: [
            GoblinWolfRider, GoblinSkirmisher
        ]
    }, {
        emblem:"./../images/units/mercenaries/unit1L.png",
        unitTypes: [
            RoughneckLeader, RoughneckSorceressCharacter, RoughneckKnight
        ]
    }, {
        emblem:"./../images/units/orcs/unit1L.png",
        unitTypes: [
            GoblinLeader, WizardLeader
        ]
    }, {
        emblem:"./../images/units/mercenaries/unit1L.png",
        unitTypes: [
            RoughneckLance, RoughneckCrossbowman
        ]
    }, {
        emblem:"./../images/units/orcs/unit1L.png",
        unitTypes: [
            GoblinLeader, WizardLeader, GoblinWolfRider, GoblinSkirmisher
        ]
    }];

    placeUnit(trigger) {
        this._game.closeActuators();
        this._game.closePopup();
        if (trigger.isFormation()) {
            this._game.openActuator(new CBFormationPlacementActuator(this._game.map));
        }
        else {
            this._game.openActuator(new CBUnitPlacementActuator(this._game.map));
        }
    }

    static rosterIndex = 0;
    static rosterStart = 0;
    static rosterMap = new Map();
    static DIMENSION = new Dimension2D(500, 600);
    static HEADER_DIMENSION = new Dimension2D(500, 80);
}

export function registerEditor() {
    CBAbstractGame.editMap = function (game) {
        game.closeActuators();
        game.closePopup();
        game.openActuator(new CBMapEditActuator(game.map));
    }
    CBAbstractGame.editUnits = function (game) {
        game.closeActuators();
        game.closePopup();
        game.openPopup(new CBUnitsRoster(game), game.viewportCenter);
    }
}

export function unregisterEditor() {
    delete CBAbstractGame.editMap;
}
