'use strict'

import {
    CBActuator,
    CBAbstractGame, CBAbstractPlayer
} from "./game.js";
import {
    CBActuatorMultiImagesTrigger,
    NeighborRawActuatorArtifactMixin,
    NeighborActuatorArtifactMixin,
    NeighborActuatorMixin,
    ActivableArtifactMixin, CBActuatorImageTrigger, GhostArtifactMixin, CBLevelBuilder, RetractableGameMixin
} from "./playable.js";
import {
    DImage, getDrawPlatform, sendPost
} from "../draw.js";
import {
    atan2, diffAngle,
    Dimension2D, inside, Point2D, sumAngle
} from "../geometry.js";
import {
    Mechanisms,
    Memento
} from "../mechanisms.js";
import {
    D2StatesIconMenuItem,
    DIconMenu, DIconMenuItem,
    DLeftNavigation, DMultiStatePushButton, DNextNavigation,
    DPopup, DPrevNavigation, DPushButton, DRightNavigation
} from "../widget.js";
import {
    DBoard,
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
import {
    CBCharge,
    CBCohesion, CBMunitions, CBOrderInstruction, CBTiredness
} from "./unit.js";
import {
    BoardLoader, Connector, GameLoader
} from "./loader.js";

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

    get hexLocation() {
        return this._hexLocation;
    }

    containsPoint(point) {
        return inside(point, this._hexLocation.borders);
    }

    mayCaptureEvent(event) {
        return true;
    }

    onMouseMove(event) {
        if (this.level) {
            let offset = this.level.getPoint(new Point2D(event.offsetX, event.offsetY));
            let location = this.location;
            let angle = Math.round(atan2(offset.x - location.x, offset.y - location.y) / 30) * 30;
            if (this.pangle !== angle) {
                this.pangle = angle;
            }
        }
        return true;
    }

    onMouseClick(event) {
        this.actuator.action(this._hexLocation, this.pangle);
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

export class CBUnitCreationActuator extends CBUnitPlacementActuator {

    constructor(map, wing, type, steps) {
        super(map);
        this._wing = wing;
        this._type = type;
        this._steps = steps;
    }

    action(hex, angle) {
        let counter = this._type.createUnit(this._wing, this._steps);
        counter.appendToMap(hex);
        counter.angle = angle;
    }

}

export class CBUnitMoveActuator extends CBUnitPlacementActuator {

    action(hex, angle) {
        let counter = hex.map.game.selectedPlayable;
        counter.deleteFromMap();
        counter.appendToMap(hex);
        counter.angle = angle;
        hex.map.game.closeActuators();
    }

}

export class CBFormationPlacementTrigger extends GhostArtifactMixin(CBActuatorImageTrigger) {

    constructor(actuator, hexSide) {
        let image= DImage.getImage("./../images/actuators/unit-f.png");
        super(actuator, "actuators", image,  hexSide.location, new Dimension2D(200, 200));
        this._hexLocation = hexSide;
        this.pangle = sumAngle(this._hexLocation.angle, 90);
    }

    get hexLocation() {
        return this._hexLocation;
    }

    containsPoint(point) {
        return inside(point, this._hexLocation.borders);
    }

    mayCaptureEvent(event) {
        return true;
    }

    onMouseMove(event) {
        if (this.level) {
            let offset = this.level.getPoint(new Point2D(event.offsetX, event.offsetY));
            let location = this.location;
            let angle = Math.round(atan2(offset.x - location.x, offset.y - location.y));
            if (diffAngle(angle, this._hexLocation.angle) >= 0) {
                angle = sumAngle(this._hexLocation.angle, -90);
            } else {
                angle = sumAngle(this._hexLocation.angle, 90);
            }
            if (this.pangle !== angle) {
                this.pangle = angle;
            }
        }
        return true;
    }

    onMouseClick(event) {
        this.actuator.action(this._hexLocation, this.pangle);
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
        return this.findTrigger(trigger=>trigger instanceof CBFormationPlacementTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export class CBFormationCreationActuator extends CBFormationPlacementActuator {

    constructor(map, wing, type, steps) {
        super(map);
        this._wing = wing;
        this._type = type;
        this._steps = steps;
    }

    action(hexSide, angle) {
        let counter = this._type.createUnit(this._wing, this._steps);
        counter.appendToMap(hexSide);
        counter.angle = angle;
    }

}

export class CBFormationMoveActuator extends CBFormationPlacementActuator {

    action(hexSide, angle) {
        let counter = hexSide.map.game.selectedPlayable;
        counter.deleteFromMap();
        counter.appendToMap(hexSide);
        counter.angle = angle;
        hexSide.map.game.closeActuators();
    }

}

export class CBWingArtifact extends DPedestalArtifact {

    constructor() {
        super(null, "widget-items", new Point2D(0, CBUnitsRoster.WING_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2));
    }

    setWing(wing) {
        this.artifact = new DImageArtifact("-", DImage.getImage(wing.banner), new Point2D(0, 0), CBWingArtifact.DIMENSION);
    }

    static DIMENSION = new Dimension2D(50, 120);
}

export class CBPartyArtifact extends ActivableArtifactMixin(DImageArtifact) {

    constructor(index, emblem) {
        super("widget-items", DImage.getImage(emblem),
            new Point2D((CBPartyArtifact.DIMENSION.w+10)*(index-2), CBUnitsRoster.WING_HEADER_DIMENSION.h + CBUnitsRoster.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
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
        this._steps = 2;
        this.artifact = this._buildUnitArtifact(this._type, this._steps);
    }

    _buildUnitArtifact(type, index) {
        let troopPathLength = type.getTroopPaths().length;
        if (index<=troopPathLength) {
            return new DImageArtifact("-", DImage.getImage(
                    type.getTroopPaths()[troopPathLength-index]
                ),
                new Point2D(0, 0),
                new Dimension2D(CBUnitTypeArtifact.DIMENSION.w, CBUnitTypeArtifact.DIMENSION.h));
        }
        else {
            let formationPathLength = type.getFormationPaths().length;
            return new DImageArtifact("-", DImage.getImage(
                    type.getFormationPaths()[formationPathLength-index+troopPathLength]
                ),
                new Point2D(0, 0),
                new Dimension2D(CBUnitTypeArtifact.DIMENSION.w * 2, CBUnitTypeArtifact.DIMENSION.h));
        }
    }

    isFormation() {
        return this._steps>this._type.getTroopPaths().length;
    }

    get settings() {
        return level => {
            level.setShadowSettings("#000000", 5);
        }
    }

    get steps() {
        return this._steps;
    }

    get type() {
        return this._type;
    }

    get maxSteps() {
        return this._type.getMaxStepCount();
    }

    shiftSteps(stepShift) {
        this._steps += stepShift;
        if (this._steps <= 1) this._steps = 1;
        if (this._steps >= this.maxSteps) this._steps = this.maxSteps;
        this.artifact = this._buildUnitArtifact(this._type, this._steps);
    }

    onMouseClick(event) {
        this.element.placeUnit(this);
        return true;
    }

    static DIMENSION = new Dimension2D(60, 60);
}

export class CBUnitsRoster extends DPopup {

    constructor(game) {
        super(CBUnitsRoster.DIMENSION);
        this._game = game;
        if (!this._game.rosterMap) {
            this._game.wingIndex = 0;
            this._game.rosterIndex = 0;
            this._game.rosterStart = 0;
            this._game.rosterMap = new Map();
        }
        this.addArtifact(new DImageArtifact("widgets", DImage.getImage("./../images/units/misc/unit-wing-back.png"),
            new Point2D(0, CBUnitsRoster.WING_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBUnitsRoster.WING_HEADER_DIMENSION)
        );
        this.addArtifact(new DRectArtifact("widgets",
            new Point2D(0, CBUnitsRoster.WING_HEADER_DIMENSION.h + CBUnitsRoster.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBUnitsRoster.ROSTER_HEADER_DIMENSION, 1, "#000000", "#C0C0C0")
        );
        this._buildWingArtifacts();
        this._buildRosterCommands();
        this._buildRosters();
        this._changeRosterContent(this._game.rosterIndex);
    }

    get wing() {
        return this._wings[this._game.wingIndex];
    }

    _update() {
        if (this._rosterArtifacts) {
            for (let rosterArtifact of this._rosterArtifacts) {
                this.removeArtifact(rosterArtifact);
            }
        }
        this._rosterArtifacts = [];
        for (let index=this._game.rosterStart; index<CBUnitsRoster.rosters.length && index<this._game.rosterStart+5; index++) {
            let roster = CBUnitsRoster.rosters[index];
            let rosterArtifact = new CBPartyArtifact(index-this._game.rosterStart, roster.emblem);
            this._rosterArtifacts.push(rosterArtifact);
            this.addArtifact(rosterArtifact);
        }
    }

    _wingUpdate() {
        this._wingArtifact.setWing(this.wing);
        this._leftWing.setActive(this._game.wingIndex>0);
        this._rightWing.setActive(this._game.wingIndex<this._wings.length-1);
    }

    _buildWingArtifacts() {
        this._wings = [];
        for (let player of this._game.players) {
            this._wings.push(...player.wings);
        }
        this._leftWing = new DLeftNavigation(
            new Point2D(-CBUnitsRoster.DIMENSION.w/2+35,
                CBUnitsRoster.WING_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._game.wingIndex--;
                this._wingUpdate();
            }
        );
        this.addArtifact(this._leftWing);
        this._wingArtifact = new CBWingArtifact();
        this.addArtifact(this._wingArtifact);
        this._rightWing = new DRightNavigation(
            new Point2D(CBUnitsRoster.DIMENSION.w/2-35,
                CBUnitsRoster.WING_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._game.wingIndex++;
                this._wingUpdate();
            }
        );
        this.addArtifact(this._rightWing);
        this._wingUpdate();
    }

    _buildRosterCommands() {
        this._leftRoster = new DLeftNavigation(
            new Point2D(-CBUnitsRoster.DIMENSION.w/2+35,
                CBUnitsRoster.WING_HEADER_DIMENSION.h + CBUnitsRoster.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._game.rosterStart--;
                this._rightRoster.setActive(true);
                if (this._game.rosterStart===0) this._leftRoster.setActive(false);
                this._update();
            }
        );
        this.addArtifact(this._leftRoster);
        this._rightRoster = new DRightNavigation(
            new Point2D(CBUnitsRoster.DIMENSION.w/2-35,
                CBUnitsRoster.WING_HEADER_DIMENSION.h + CBUnitsRoster.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._game.rosterStart++;
                this._leftRoster.setActive(true);
                if (this._game.rosterStart===CBUnitsRoster.rosters.length-5) this._rightRoster.setActive(false);
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
        this._unitArtifacts = this._game.rosterMap.get(roster);
        if (this._unitArtifacts) {
            for (let unitType of this._unitArtifacts) {
                this.addArtifact(unitType);
            }
        }
        else {
            this.buildRosterContent(roster);
            this._game.rosterMap.set(roster, this._unitArtifacts);
        }
    }

    changeRosterContent(index) {
        this._game.rosterIndex = this._game.rosterStart+index;
        this._changeRosterContent(this._game.rosterIndex);
    }

    buildRosterContent(roster) {
        this._unitArtifacts = [];
        for (let index = 0; index<roster.unitTypes.length; index++) {
            let col = index % 2;
            let row = Math.floor(index / 2);
            let x = col % 2 ? CBUnitsRoster.DIMENSION.w / 4 : -CBUnitsRoster.DIMENSION.w / 4;
            let y = CBUnitsRoster.WING_HEADER_DIMENSION.h + CBUnitsRoster.ROSTER_HEADER_DIMENSION.h - CBUnitsRoster.DIMENSION.h / 2 +
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
            prevEnhancer.setActive(unitTypeArtifact.steps > 1) ;
            nextEnhancer.setActive(unitTypeArtifact.steps < unitTypeArtifact.maxSteps);
        }
        prevEnhancer = new DPrevNavigation(new Point2D(x-CBUnitTypeArtifact.DIMENSION.w*1.5, y),
            ()=>{
                unitTypeArtifact.shiftSteps(-1);
                activateEnhancers();
            }
        );
        this._unitArtifacts.push(prevEnhancer);
        this.addArtifact(prevEnhancer);
        nextEnhancer = new DNextNavigation(new Point2D(x+CBUnitTypeArtifact.DIMENSION.w*1.5, y),
            ()=>{
                unitTypeArtifact.shiftSteps(1);
                activateEnhancers();
            }
        );
        this._unitArtifacts.push(nextEnhancer);
        this.addArtifact(nextEnhancer);
        activateEnhancers();
    }

    _buildRosters() {
        this._update();
        this._leftRoster.setActive(this._game.rosterStart>0);
        this._rightRoster.setActive(this._game.rosterStart<CBUnitsRoster.rosters.length-5);
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
            this._game.openActuator(new CBFormationCreationActuator(this._game.map, this.wing, trigger.type, trigger.steps));
        }
        else {
            this._game.openActuator(new CBUnitCreationActuator(this._game.map, this.wing, trigger.type, trigger.steps));
        }
    }

    static DIMENSION = new Dimension2D(500, 650);
    static WING_HEADER_DIMENSION = new Dimension2D(500, 120);
    static ROSTER_HEADER_DIMENSION = new Dimension2D(500, 80);
}

export class CBEditUnitMenu extends DIconMenu {

    constructor(game, unit) {
        function createUnitStatusItems(unit) {
            let tired = new D2StatesIconMenuItem("./../images/edit-actions/tired.png", "./../images/edit-actions/cancel-tired.png", "./../images/edit-actions/tired-gray.png",
                0, 0, (event, state) => {
                    unit.setTiredness(state ? CBTiredness.NONE : CBTiredness.TIRED);
                }
            ).setSecondState(unit.tiredness === CBTiredness.TIRED);
            let exhausted = new D2StatesIconMenuItem("./../images/edit-actions/exhausted.png", "./../images/edit-actions/cancel-exhausted.png", "./../images/edit-actions/exhausted-gray.png",
                1, 0, (event, state) => {
                    unit.setTiredness(state ? CBTiredness.NONE : CBTiredness.EXHAUSTED);
                }
            ).setSecondState(unit.tiredness === CBTiredness.EXHAUSTED).setActive(!unit.isCharging());
            let disrupted = new D2StatesIconMenuItem("./../images/edit-actions/disrupted.png", "./../images/edit-actions/cancel-disrupted.png", "./../images/edit-actions/disrupted-gray.png",
                2, 0, (event, state) => {
                    unit.setCohesion(state ? CBCohesion.GOOD_ORDER : CBCohesion.DISRUPTED);
                }
            ).setSecondState(unit.cohesion === CBCohesion.DISRUPTED).setActive(!unit.isCharging());
            let routed = new D2StatesIconMenuItem("./../images/edit-actions/routed.png", "./../images/edit-actions/cancel-routed.png", "./../images/edit-actions/routed-gray.png",
                3, 0, (event, state) => {
                    unit.setCohesion(state ? CBCohesion.GOOD_ORDER : CBCohesion.ROUTED);
                }
            ).setSecondState(unit.cohesion === CBCohesion.ROUTED).setActive(!unit.isEngaging() && !unit.isCharging());
            let scarceAmmunition = new D2StatesIconMenuItem("./../images/edit-actions/scarce-ammunition.png", "./../images/edit-actions/cancel-scarce-ammunition.png", "./../images/edit-actions/scarce-ammunition-gray.png",
                0, 1, (event, state) => {
                    unit.setMunitions(state ? CBMunitions.NONE : CBMunitions.SCARCE);
                }
            ).setSecondState(unit.munitions === CBMunitions.SCARCE);
            let noAmmunition = new D2StatesIconMenuItem("./../images/edit-actions/no-ammunition.png", "./../images/edit-actions/cancel-no-ammunition.png", "./../images/edit-actions/no-ammunition-gray.png",
                1, 1, (event, state) => {
                    unit.setMunitions(state ? CBMunitions.NONE : CBMunitions.EXHAUSTED);
                }
            ).setSecondState(unit.munitions === CBMunitions.EXHAUSTED);
            let contact = new D2StatesIconMenuItem("./../images/edit-actions/contact.png", "./../images/edit-actions/cancel-contact.png", "./../images/edit-actions/contact-gray.png",
                2, 1, (event, state) => {
                    unit.setEngaging(!state);
                }
            ).setSecondState(unit.isEngaging()).setActive(unit.cohesion !== CBCohesion.ROUTED);
            let charge = new D2StatesIconMenuItem("./../images/edit-actions/charge.png", "./../images/edit-actions/cancel-charge.png", "./../images/edit-actions/charge-gray.png",
                3, 1, (event, state) => {
                    unit.setCharging(state ? CBCharge.NONE : CBCharge.CHARGING);
                }
            ).setSecondState(unit.isCharging()).setActive(unit.cohesion === CBCohesion.GOOD_ORDER && unit.tiredness !== CBTiredness.EXHAUSTED);
            let orderGiven = new D2StatesIconMenuItem("./../images/edit-actions/order-given.png", "./../images/edit-actions/cancel-order-given.png", "./../images/edit-actions/order-given-gray.png",
                0, 2, (event, state) => {
                    if (!state) unit.reactivate();
                    unit.receivesOrder(!state);
                }
            ).setSecondState(unit.hasReceivedOrder());
            let played = new D2StatesIconMenuItem("./../images/edit-actions/played.png", "./../images/edit-actions/cancel-played.png", "./../images/edit-actions/played-gray.png",
                1, 2, (event, state) => {
                    if (state) unit.reactivate(); else unit.markAsPlayed();
                    if (!state) unit.receivesOrder(false)
                }
            ).setSecondState(unit.isPlayed());
            let move = new DIconMenuItem("./../images/edit-actions/move.png", "./../images/edit-actions/move-gray.png",
                2, 2, (event, state) => {
                    if (unit.formationNature) {
                        game.openActuator(new CBFormationMoveActuator(game.map));
                    }
                    else {
                        game.openActuator(new CBUnitMoveActuator(game.map));
                    }
                }
            );
            let remove = new DIconMenuItem("./../images/edit-actions/delete.png", "./../images/edit-actions/delete-gray.png",
                3, 2, (event, state) => {
                    unit.destroy();
                }
            );
            function orderInstructionIconMenuItem(image, col, order) {
                return new D2StatesIconMenuItem(`./../images/edit-actions/${image}.png`, `./../images/edit-actions/cancel-${image}.png`, `./../images/edit-actions/${image}-gray.png`,
                    col, 3, (event, state) => {
                        if (state) {
                            unit.wing.dismissLeader();
                        }
                        else {
                            unit.wing.changeOrderInstruction(order);
                            unit.wing.dismissLeader();
                            unit.wing.setLeader(unit);
                        }
                    }
                ).setSecondState(unit.wing.leader === unit && unit.wing.orderInstruction === order).setActive(unit.characterNature);
            }
            let attack = orderInstructionIconMenuItem("attack", 0, CBOrderInstruction.ATTACK);
            let defense = orderInstructionIconMenuItem("defend", 1, CBOrderInstruction.DEFEND);
            let regroup = orderInstructionIconMenuItem("regroup", 2, CBOrderInstruction.REGROUP);
            let retreat = orderInstructionIconMenuItem("retreat", 3, CBOrderInstruction.RETREAT);
            return [
                tired, exhausted, disrupted, routed,
                scarceAmmunition, noAmmunition, contact, charge,
                orderGiven, played, move, remove,
                attack, defense, regroup, retreat
            ];
        }

        let menuItems = [
            ...createUnitStatusItems(unit)
        ];
        super(false, ...menuItems);
        this._game = game;
        Mechanisms.addListener(this);
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.ZOOM_EVENT || event===DBoard.SCROLL_EVENT) {
            this._game.closePopup();
        }
    }

    close() {
        super.close();
        Mechanisms.removeListener(this);
    }

    closeMenu() {
        if (this._game.popup === this) {
            this._game.closePopup();
        }
    }

}

export class CBEditorPlayer extends CBAbstractPlayer {

    _init() {
        super._init();
        this._wings = [];
    }

    acceptActivation(playable) {
        return true;
    }

    _registerWing(wing) {
        this._wings.push(wing);
    }

    /*
    _memento() {
        let memento = super._memento();
        memento.wings = [...this._wings];
        return memento;
    }

    _revert(memento) {
        this._wings = memento.wings;
    }
     */

    get wings() {
        return this._wings;
    }

    openEditUnitMenu(unit, offset) {
        let popup = new CBEditUnitMenu(this.game, unit);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBAbstractGame.POPUP_MARGIN));
    }

    launchPlayableAction(playable, event) {
        this.openEditUnitMenu(playable,
            new Point2D(event.offsetX, event.offsetY));
        super.launchPlayableAction(playable, event);
    }

}

export class CBMapEditorGame extends RetractableGameMixin(CBAbstractGame) {

    constructor(name) {
        super(name, new CBLevelBuilder().buildLevels());
    }

    _buildBoard(map) {
        super._buildBoard(map);
        this._board.escapeOnKeyDown();
        this._board.delOnKeyDown();
    }

    editMap() {
        this.closeActuators();
        this.closePopup();
        this.openActuator(new CBMapEditActuator(this.map));
    }

    setMenu() {
        this._showCommand = new DPushButton(
            "./../images/commands/show.png", "./../images/commands/show-inactive.png",
            new Point2D(-60, -60), animation=>{
                this.hideCommand(this._showCommand);
                this.showCommand(this._hideCommand);
                this.showCommand(this._undoCommand);
                this.showCommand(this._redoCommand);
                this.showCommand(this._settingsCommand);
                this.showCommand(this._saveCommand);
                this.showCommand(this._loadCommand);
                this.showCommand(this._editMapCommand);
                this.showCommand(this._fullScreenCommand);
                animation();
            });
        this.showCommand(this._showCommand);
        this._hideCommand = new DPushButton(
            "./../images/commands/hide.png", "./../images/commands/hide-inactive.png",
            new Point2D(-60, -60), animation=>{
                this.showCommand(this._showCommand);
                this.hideCommand(this._hideCommand);
                this.hideCommand(this._undoCommand);
                this.hideCommand(this._redoCommand);
                this.hideCommand(this._settingsCommand);
                this.hideCommand(this._saveCommand);
                this.hideCommand(this._loadCommand);
                this.hideCommand(this._editMapCommand);
                this.hideCommand(this._fullScreenCommand);
                animation();
            });
        this._undoCommand = new DPushButton(
            "./../images/commands/undo.png", "./../images/commands/undo-inactive.png",
            new Point2D(-120, -60), animation=>{
                Memento.undo();
                animation();
            }).setTurnAnimation(false);
        this._redoCommand = new DPushButton(
            "./../images/commands/redo.png", "./../images/commands/redo-inactive.png",
            new Point2D(-180, -60), animation=>{
                Memento.redo();
                animation();
            }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton(
            "./../images/commands/settings.png","./../images/commands/settings-inactive.png",
            new Point2D(-240, -60), animation=>{
                new Connector().connect();
                animation();
            }).setTurnAnimation(true);
        this._saveCommand = new DPushButton(
            "./../images/commands/save.png", "./../images/commands/save-inactive.png",
            new Point2D(-300, -60), animation=>{
                new BoardLoader(this.map).save();
                animation();
            }).setTurnAnimation(true);
        this._loadCommand = new DPushButton(
            "./../images/commands/load.png", "./../images/commands/load-inactive.png",
            new Point2D(-360, -60), animation=>{
                new BoardLoader(this.map).load();
                animation();
            }).setTurnAnimation(true);
        this._editMapCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-map.png", "./../images/commands/field.png"],
            new Point2D(-420, -60), (state, animation)=>{
                this.editMap();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-480, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
    }

}

export class CBScenarioEditorGame extends RetractableGameMixin(CBAbstractGame) {

    constructor(name) {
        super(name, new CBLevelBuilder().buildLevels());
    }

    canSelectPlayable(playable) {
        return true;
    }

    _buildBoard(map) {
        super._buildBoard(map);
        this._board.escapeOnKeyDown();
        this._board.delOnKeyDown();
    }

    _processGlobalEvent(source, event, value) {
        if (event===DBoard.DELETE_EVENT) {
            this.selectedPlayable && this.selectedPlayable.destroy();
        }
        else if (event===DBoard.ESCAPE_EVENT) {
            this.closePopup();
            this.closeActuators();
        }
        else {
            super._processGlobalEvent(source, event, value);
        }
    }

    editUnits() {
        this.closeActuators();
        this.closePopup();
        this.openPopup(new CBUnitsRoster(this), this.viewportCenter);
    }

    setMenu() {
        this._showCommand = new DPushButton(
            "./../images/commands/show.png", "./../images/commands/show-inactive.png",
            new Point2D(-60, -60), animation=>{
                this.hideCommand(this._showCommand);
                this.showCommand(this._hideCommand);
                this.showCommand(this._undoCommand);
                this.showCommand(this._redoCommand);
                this.showCommand(this._settingsCommand);
                this.showCommand(this._saveCommand);
                this.showCommand(this._loadCommand);
                this.showCommand(this._editUnitsCommand);
                this.showCommand(this._fullScreenCommand);
                animation();
            });
        this.showCommand(this._showCommand);
        this._hideCommand = new DPushButton(
            "./../images/commands/hide.png", "./../images/commands/hide-inactive.png",
            new Point2D(-60, -60), animation=>{
                this.showCommand(this._showCommand);
                this.hideCommand(this._hideCommand);
                this.hideCommand(this._undoCommand);
                this.hideCommand(this._redoCommand);
                this.hideCommand(this._settingsCommand);
                this.hideCommand(this._saveCommand);
                this.hideCommand(this._loadCommand);
                this.hideCommand(this._editUnitsCommand);
                this.hideCommand(this._fullScreenCommand);
                animation();
            });
        this._undoCommand = new DPushButton(
            "./../images/commands/undo.png", "./../images/commands/undo-inactive.png",
            new Point2D(-120, -60), animation=>{
                Memento.undo();
                animation();
            }).setTurnAnimation(false);
        this._redoCommand = new DPushButton(
            "./../images/commands/redo.png", "./../images/commands/redo-inactive.png",
            new Point2D(-180, -60), animation=>{
                Memento.redo();
                animation();
            }).setTurnAnimation(true);
        this._settingsCommand = new DPushButton(
            "./../images/commands/settings.png","./../images/commands/settings-inactive.png",
            new Point2D(-240, -60), animation=>{
                new Connector().connect();
                animation();
            }).setTurnAnimation(true);
        this._saveCommand = new DPushButton(
            "./../images/commands/save.png", "./../images/commands/save-inactive.png",
            new Point2D(-300, -60), animation=>{
                new GameLoader(this).save();
                animation();
            }).setTurnAnimation(true);
        this._loadCommand = new DPushButton(
            "./../images/commands/load.png", "./../images/commands/load-inactive.png",
            new Point2D(-360, -60), animation=>{
                new GameLoader(this).load();
                animation();
            }
        ).setTurnAnimation(true);
        this._editUnitsCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-units.png", "./../images/commands/edit-units-inactive.png"],
            new Point2D(-420, -60), (state, animation)=>{
                this.editUnits();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-480, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
    }

}
