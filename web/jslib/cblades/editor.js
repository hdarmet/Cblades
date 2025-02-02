'use strict'

import {
    WActuator,
    WAbstractGame, WAbstractPlayer
} from "../wargame/game.js";
import {
    WActuatorMultiImagesTrigger,
    NeighborRawActuatorArtifactMixin,
    NeighborActuatorArtifactMixin,
    NeighborActuatorMixin,
    ActivableArtifactMixin,
    WActuatorImageTrigger,
    GhostArtifactMixin,
    WLevelBuilder,
    RetractableGameMixin, WHexCounter, StandardGameMixin
} from "../wargame/playable.js";
import {
    DImage, getDrawPlatform
} from "../board/draw.js";
import {
    atan2, diffAngle,
    Dimension2D, inside, Point2D, sumAngle
} from "../board/geometry.js";
import {
    Mechanisms,
    Memento
} from "../board/mechanisms.js";
import {
    D2StatesIconMenuItem, DDownNavigation,
    DIconMenu, DIconMenuItem, DCancel,
    DLeftNavigation, DMultiStatePushButton, DNextNavigation, DOk,
    DPopup, DPrevNavigation, DPushButton, DRightNavigation, DUpNavigation
} from "../board/widget.js";
import {
    DBoard, DElement,
    DImageArtifact, DMultiImagesArtifact, DPedestalArtifact, DRectArtifact
} from "../board/board.js";
import {
    GoblinLeader, GoblinSkirmisher, GoblinWolfRider, WizardLeader
} from "./armies/orcs.js";
import {
    RoughneckCrossbowman,
    RoughneckKnight,
    RoughneckLance,
    RoughneckLeader,
    RoughneckSorceressCharacter
} from "./armies/roughnecks.js";
import {
    CBCharge,
    CBCohesion, CBMunitions, CBOrderInstruction, CBTiredness, CBWing
} from "./unit.js";
import {
    BannerListLoader, BoardListLoader,
    BoardLoader, Connector, GameLoader, PlayerIdentityListLoader
} from "./loader.js";
import {
    WMap
} from "../wargame/map.js";
import {
    CBBurningCounter, CBObstacleCounter
} from "./miscellaneous.js";
import {
    CBSpell
} from "./magic.js";

export class CBBoardEditorHexHeightTrigger extends NeighborRawActuatorArtifactMixin(WActuatorMultiImagesTrigger) {
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

export class CBBoardEditorHexTypeTrigger extends NeighborActuatorArtifactMixin(WActuatorMultiImagesTrigger) {

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

export class CBBoardEditorHexSideTypeTrigger extends NeighborRawActuatorArtifactMixin(WActuatorMultiImagesTrigger) {

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

export class CBBoardEditActuator extends NeighborActuatorMixin(WActuator) {

    constructor(map) {
        super();

        let imageArtifacts = [];
        for (let hex of map.hexes) {
            let triggerType = new CBBoardEditorHexTypeTrigger(this, hex);
            imageArtifacts.push(triggerType);
            let triggerHeight = new CBBoardEditorHexHeightTrigger(this, hex);
            imageArtifacts.push(triggerHeight);
        }
        for (let hexSide of map.hexSides) {
            let trigger = new CBBoardEditorHexSideTypeTrigger(this, hexSide);
            imageArtifacts.push(trigger);
        }
        this.initElement(imageArtifacts);
    }

    getHexTypeTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBBoardEditorHexTypeTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

    getHexHeightTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBBoardEditorHexHeightTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

    getHexSideTypeTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBBoardEditorHexSideTypeTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export class CBPiecePlacementTrigger extends GhostArtifactMixin(WActuatorImageTrigger) {

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

export class CBPiecePlacementActuator extends WActuator {

    constructor(map) {
        super();
        this._map = map;
        let artifacts = [];
        for (let hex of map.hexes) {
            let triggerUnit = new CBPiecePlacementTrigger(this, hex);
            artifacts.push(triggerUnit);
        }
        this.initElement(artifacts);
    }

    get map() {
        return this._map;
    }

    get game() {
        return this.map.game;
    }

    getTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger instanceof CBPiecePlacementTrigger &&
            trigger.hexLocation.similar(hexLocation));
    }

}

export class CBUnitCreationActuator extends CBPiecePlacementActuator {

    constructor(map, wing, type, steps) {
        super(map);
        this._wing = wing;
        this._type = type;
        this._steps = steps;
    }

    action(hex, angle) {
        let counter = this._type.createUnit(this.game, this._wing, this._steps);
        counter.appendToMap(hex);
        counter.angle = angle;
    }

}

export class CBPieceMoveActuator extends CBPiecePlacementActuator {

    action(hex, angle) {
        let counter = hex.map.game.selectedPlayable;
        counter.deleteFromMap();
        counter.appendToMap(hex);
        counter.angle = angle;
        hex.map.game.closeActuators();
    }

}

export class CBFormationPlacementTrigger extends GhostArtifactMixin(WActuatorImageTrigger) {

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

export class CBFormationPlacementActuator extends WActuator {

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
        let counter = this._type.createUnit(this.game, this._wing, this._steps);
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

function play() {
    this.game.selectedPlayable = this;
    this.game.currentPlayer.playToken(this, this.viewportLocation);
}
CBBurningCounter.prototype.play = play;
CBObstacleCounter.prototype.play = play;
CBSpell.prototype.play = play;

export class CBTokenCreationActuator extends CBPiecePlacementActuator {

    constructor(map, specs) {
        super(map);
        this._specs = specs;
    }

    action(hex, angle) {
        let context = new Map();
        context.game = this.game;
        let counter = WHexCounter.fromSpecs(this._specs, context);
        counter.appendToMap(hex);
        counter.angle = angle;
    }

}

export class CBBattleArtifact extends DPedestalArtifact {

    constructor(header, position) {
        super(null, "widget-items", position);
        this._header = header;
    }

    get header() {
        return this._header;
    }

    get active() {
        return this._active;
    }

    get path() {
        return this.artifact ? this.artifact.image.path : null;
    }

    setActive(active) {
        this._active = active;
        if (this._active) {
            this.setSettings(level => {
                level.setShadowSettings("#00FFFF", 10);
            });
        }
        else {
            this.setSettings(level => {
                level.setShadowSettings("#000000", 10);
            });
        }
    }

    onMouseEnter(event) {
        if (this._active) {
            this.setSettings(level => {
                level.setShadowSettings("#FF0000", 10);
            });
        }
        return true;
    }

    onMouseLeave(event) {
        if (this._active) {
            this.setSettings(level => {
                level.setShadowSettings("#00FFFF", 10);
            });
        }
        return true;
    }

}

export class CBPlayerArtifact extends CBBattleArtifact {

    setPlayer(player) {
        this.artifact = player ? new DImageArtifact("-",
            DImage.getImage(player.path), new Point2D(0, 0),
            CBPlayerArtifact.DIMENSION) : null;
    }

    onMouseClick(event) {
        if (this._active) {
            this._header.managePlayer();
        }
        return true;
    }

    static DIMENSION = new Dimension2D(60, 60);

}

export class CBWingArtifact extends CBBattleArtifact {

    setWing(wing) {
        this.artifact = wing ? new DImageArtifact("-",
            DImage.getImage(wing.path), new Point2D(0, 0),
            CBWingArtifact.DIMENSION
        ): null;
    }

    onMouseClick(event) {
        if (this.active) {
            this.header.manageWing();
        }
        return true;
    }

    static DIMENSION = new Dimension2D(50, 120);

}

export class CBPartyArtifact extends ActivableArtifactMixin(DImageArtifact) {

    constructor(index, emblem) {
        super("widget-items", DImage.getImage(emblem),
            new Point2D(
                (CBPartyArtifact.DIMENSION.w+10)*(index-2),
                CBUnitsRosterHeader.dimension.h + CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
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

export class CBUnitsRosterHeader extends DElement {

    constructor(parent) {
        super();
        this._parent = parent;
        this._active = true;
        this.addArtifact(new DImageArtifact("widgets", DImage.getImage("./../images/units/misc/unit-wing-back.png"),
            new Point2D(0, CBUnitsRosterHeader.dimension.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBUnitsRosterHeader.dimension)
        );
        this._prevWingButton = new DLeftNavigation(
            new Point2D(-CBUnitsRoster.DIMENSION.w/2+35,
                CBUnitsRosterHeader.dimension.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._wingUpdate(-1);
                this._parent.updateWingSelectionContent();
            }
        );
        this.addArtifact(this._prevWingButton);
        this._playerArtifact = new CBPlayerArtifact(this, new Point2D(
            CBUnitsRosterHeader.PLAYER_MARGIN,
            CBUnitsRosterHeader.dimension.h/2 - CBUnitsRoster.DIMENSION.h/2)
        );
        this.addArtifact(this._playerArtifact);
        this._wingArtifact = new CBWingArtifact(this, new Point2D(
            CBUnitsRosterHeader.WING_MARGIN,
            CBUnitsRosterHeader.dimension.h/2 - CBUnitsRoster.DIMENSION.h/2)
        );
        this.addArtifact(this._wingArtifact);
        this._nextWingButton = new DRightNavigation(
            new Point2D(CBUnitsRoster.DIMENSION.w/2-35,
                CBUnitsRosterHeader.dimension.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._wingUpdate(1);
                this._parent.updateWingSelectionContent();
            }
        );
        this.addArtifact(this._nextWingButton);
        if (this.wings.length>0) {
            this._wingUpdate(0);
        }
    }

    setActive(active) {
        this._active = active;
        if (active) {
            this._prevWingButton.setActive(this._parent.game.wingIndex > 0);
            this._nextWingButton.setActive(this._parent.game.wingIndex < this.wings.length - 1);
            this._wingArtifact.setActive(true);
            this._playerArtifact.setActive(true);
        }
        else {
            this._prevWingButton.setActive(false);
            this._nextWingButton.setActive(false);
            this._wingArtifact.setActive(false);
            this._playerArtifact.setActive(false);
        }
    }

    refreshPlayer() {
        this._playerArtifact.setPlayer(this.player);
        this._wingArtifact.setWing(this.wing);
    }

    refreshWing() {
        this._wingArtifact.setWing(this.wing);
    }

    _wingUpdate(shift) {
        this._parent.shiftWing(shift);
        this.showCurrentWing();
    }

    showCurrentWing() {
        this.setPlayer(this.wing.player);
        this._wingArtifact.setWing(this.wing);
        this._playerArtifact.setPlayer(this.player);
        this.setActive(this._active);
    }

    get prevWingButton() {
        return this._prevWingButton;
    }

    get nextWingButton() {
        return this._nextWingButton;
    }

    get playerArtifact() {
        return this._playerArtifact;
    }

    get wingArtifact() {
        return this._wingArtifact;
    }

    get wing() {
        return this._parent.wing;
    }

    get wings() {
        return this._parent.wings;
    }

    get player() {
        return this._parent.player;
    }

    setPlayer(player) {
        this._parent.setPlayer(player);
    }

    static get dimension() {
        return CBUnitsRosterHeader.WING_HEADER_DIMENSION;
    }

    managePlayer() {
        this._parent.showPlayerSelector();
    }

    manageWing() {
        this._parent.showWingSelector();
    }

    static PLAYER_MARGIN = -80;
    static WING_MARGIN = 80;
    static WING_HEADER_DIMENSION = new Dimension2D(500, 120);
}

export class CBUnitsRosterContent extends DElement {

    constructor(parent) {
        super();
        this._parent = parent;
        if (!this._parent.game.rosterMap) {
            this._parent.game.rosterIndex = 0;
            this._parent.game.rosterStart = 0;
            this._parent.game.rosterMap = new Map();
        }
        this.addArtifact(new DRectArtifact("widgets",
            new Point2D(0, CBUnitsRosterHeader.dimension.h + CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            CBUnitsRosterContent.ROSTER_HEADER_DIMENSION, 1, "#000000", "#C0C0C0")
        );
        this._buildRosterCommands();
        this._buildRosters();
        this._changeRosterContent(this._parent.game.rosterIndex);
    }

    _update() {
        if (this._rosterArtifacts) {
            for (let rosterArtifact of this._rosterArtifacts) {
                this.removeArtifact(rosterArtifact);
            }
        }
        this._rosterArtifacts = [];
        for (let index=this._parent.game.rosterStart; index<CBUnitsRosterContent.rosters.length && index<this._parent.game.rosterStart+5; index++) {
            let roster = CBUnitsRosterContent.rosters[index];
            let rosterArtifact = new CBPartyArtifact(index-this._parent.game.rosterStart, roster.emblem);
            this._rosterArtifacts.push(rosterArtifact);
            this.addArtifact(rosterArtifact);
        }
    }

    _buildRosterCommands() {
        this._leftRoster = new DLeftNavigation(
            new Point2D(-CBUnitsRoster.DIMENSION.w/2+35,
                CBUnitsRosterHeader.dimension.h + CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._parent.game.rosterStart--;
                this._rightRoster.setActive(true);
                if (this._parent.game.rosterStart===0) this._leftRoster.setActive(false);
                this._update();
            }
        );
        this.addArtifact(this._leftRoster);
        this._rightRoster = new DRightNavigation(
            new Point2D(CBUnitsRoster.DIMENSION.w/2-35,
                CBUnitsRosterHeader.dimension.h + CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2 - CBUnitsRoster.DIMENSION.h/2),
            ()=>{
                this._parent.game.rosterStart++;
                this._leftRoster.setActive(true);
                if (this._parent.game.rosterStart===CBUnitsRosterContent.rosters.length-5) this._rightRoster.setActive(false);
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
        let roster = CBUnitsRosterContent.rosters[index];
        this._unitArtifacts = this._parent.game.rosterMap.get(roster);
        if (this._unitArtifacts) {
            for (let unitType of this._unitArtifacts) {
                this.addArtifact(unitType);
            }
        }
        else {
            this.buildRosterContent(roster);
            this._parent.game.rosterMap.set(roster, this._unitArtifacts);
        }
    }

    changeRosterContent(index) {
        this._parent.game.rosterIndex = this._parent.game.rosterStart+index;
        this._changeRosterContent(this._parent.game.rosterIndex);
    }

    buildRosterContent(roster) {
        this._unitArtifacts = [];
        for (let index = 0; index<roster.unitTypes.length; index++) {
            let col = index % 2;
            let row = Math.floor(index / 2);
            let x = col % 2 ? CBUnitsRoster.DIMENSION.w / 4 : -CBUnitsRoster.DIMENSION.w / 4;
            let y = CBUnitsRosterHeader.dimension.h + CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h - CBUnitsRoster.DIMENSION.h / 2 +
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
        this._leftRoster.setActive(this._parent.game.rosterStart>0);
        this._rightRoster.setActive(this._parent.game.rosterStart<CBUnitsRosterContent.rosters.length-5);
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
        this._parent.game.closeActuators();
        this._parent.game.closePopup();
        if (trigger.isFormation()) {
            this._parent.game.openActuator(new CBFormationCreationActuator(
                this._parent.game.map, this._parent.currentWing,
                trigger.type, trigger.steps)
            );
        }
        else {
            this._parent.game.openActuator(new CBUnitCreationActuator(
                this._parent.game.map, this._parent.currentWing,
                trigger.type, trigger.steps)
            );
        }
    }

    static ROSTER_HEADER_DIMENSION = new Dimension2D(500, 80);
}

export class CBRosterSelectorCell extends DPedestalArtifact {

    constructor(parent, col, row, position) {
        super(null, "widget-items", position);
        this._parent = parent;
        this._col = col;
        this._row = row;
    }

    setItem(item, selected, excluded) {
        this._item = item;
        this.artifact = item ?  new DImageArtifact("-",
            DImage.getImage(this._item.path),
            new Point2D(0, 0),
            this._getDimension()
        ): null;
        if (item) {
            this._selected = selected.has(item.name);
            this._excluded = excluded.has(item.name);
        }
        this._setSettings(false);
        return this;
    }

    _setSettings(inside) {
        if (this._item) {
            if (this._excluded) {
                this.setSettings(level => {
                    level.setShadowSettings("#000000", 5);
                });
            } else {
                if (this._selected === inside) {
                    this.setSettings(level => {
                        level.setShadowSettings("#0050FF", 5);
                    });
                } else {
                    this.setSettings(level => {
                        level.setShadowSettings("#FF0000", 20);
                    });
                }
            }
        }
    }

    onMouseEnter(event) {
        this._setSettings(true);
        return true;
    }

    onMouseLeave(event) {
        this._setSettings(false);
        return true;
    }

    get selected() {
        return this._selected;
    }

    get item() {
        return this._item;
    }

    onMouseClick(event) {
        if (!this._excluded) {
            this._selected = !this._selected;
            this._setSettings(false);
            this._parent._changeCellState(this);
        }
        return true;
    }

}

export class CBRosterSelector extends DElement {

    constructor(parent, content, selected, excluded) {
        super();
        this._parent = parent;
        this._firstItemIndex=0;
        this._content = content;
        this.addArtifact(new DRectArtifact("widgets",
            new Point2D(0, CBUnitsRoster.DIMENSION.h/2 - CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2),
            CBUnitsRosterContent.ROSTER_HEADER_DIMENSION, 1, "#000000", "#C0C0C0")
        );
        this._selected = selected;
        this._excluded = excluded;
        this._buildSelectorCommands();
        this._buildSelectionContent();
    }

    _buildSelectorCommands() {
        this._prevSelectorPage = new DLeftNavigation(new Point2D(
            this._getNavigationMarginCount() -CBUnitsRoster.DIMENSION.w/2,
            CBUnitsRoster.DIMENSION.h/2 - CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2
        ), ()=>{
            this._updateContent(-this._getRowCount());
        });
        this.addArtifact(this._prevSelectorPage);
        this._validateButton = new DOk(new Point2D(
            -this._getNavigationMarginCount(),
            CBUnitsRoster.DIMENSION.h/2 - CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2
        ), ()=>{
            this._parent.validateBattleSettings();
        });
        this.addArtifact(this._validateButton);
        this._cancelButton = new DCancel(new Point2D(
            this._getNavigationMarginCount(),
            CBUnitsRoster.DIMENSION.h/2 - CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2
        ), ()=>{
            this._parent.cancelBattleSettings();
        });
        this.addArtifact(this._cancelButton);
        this._nextSelectorPage = new DRightNavigation(new Point2D(
            -this._getNavigationMarginCount() +CBUnitsRoster.DIMENSION.w/2,
            CBUnitsRoster.DIMENSION.h/2 - CBUnitsRosterContent.ROSTER_HEADER_DIMENSION.h/2
        ), ()=>{
            this._updateContent(this._getRowCount());
        });
        this.addArtifact(this._nextSelectorPage);
    }

    _updateContent(shift) {
        this._firstItemIndex+=shift;
        this.changeSelectionContent();
    }

    _buildSelectionContent() {
        this._cells = [];
        for (let col=0; col<this._getColCount(); col++) {
            this._cells[col] = [];
            for (let row=0; row<this._getRowCount(); row++) {
                this._cells[col][row] = this._buildCell(col, row, new Point2D(
                    this._getCellDimension().w*(0.5-this._getColCount()/2+col),
                    this._getCellDimension().h*(0.5-this._getRowCount()/2+row)+this._getHeightShift()
                ));
                this.addArtifact(this._cells[col][row]);
            }
        }
    }

    get validateButton() {
        return this._validateButton;
    }

    get cancelButton() {
        return this._cancelButton;
    }

    get prevSelectorPage() {
        return this._prevSelectorPage;
    }

    get nextSelectorPage() {
        return this._nextSelectorPage;
    }

    getCell(col, row) {
        return this._cells[col][row];
    }

    changeSelectionContent() {
        let selected = this._selected();
        let excluded = this._excluded();
        for (let col=0; col<this._getColCount(); col++) {
            for (let row=0; row<this._getRowCount(); row++) {
                this._cells[col][row].setItem(this._content[
                    this._firstItemIndex+col*this._getRowCount()+row
                ], selected, excluded);
            }
        }
        this._prevSelectorPage.setActive(this._firstItemIndex > 0);
        this._nextSelectorPage.setActive(
            this._firstItemIndex+(this._getColCount()*this._getRowCount()) < this._content.length
        );
        this._validateButton.setActive(this._isValidationPossible());
    }

    _changeCellState(cell) {
        this._parent.activateHeader(false);
        this._validateButton.setActive(this._isValidationPossible());
    }

}

export class CBPlayerSelectorCell extends CBRosterSelectorCell {

    _getDimension() {
        return CBPlayerSelectorCell.DIMENSION;
    }

    static DIMENSION = new Dimension2D(60, 60);

}

export class CBPlayerSelector extends CBRosterSelector {

    constructor(parent, content) {
        super(parent, content,
            ()=>new Set(parent.players.map(player=>player.name)),
            ()=>new Set());
    }

    _buildCell(col, row, position, selected, excluded) {
        return new CBPlayerSelectorCell(this, col, row, position, selected, excluded);
    }

    _getColCount() {
        return CBPlayerSelector.COL_COUNT;
    }

    _getRowCount() {
        return CBPlayerSelector.ROW_COUNT;
    }

    _getNavigationMarginCount() {
        return CBPlayerSelector.NAVIGATION_MARGIN;
    }

    _getHeightShift() {
        return CBPlayerSelector.HEIGHT_SHIFT;
    }

    _getCellDimension() {
        return CBPlayerSelector.CELL_DIMENSION;
    }

    _changeCellState(cell) {
        if (cell.selected) {
            this._parent.addPlayer(cell.item);
            this._parent.showWingSelector(true);
        }
        else {
            this._parent.removePlayer(cell.item);
        }
        super._changeCellState(cell);
    }

    _isValidationPossible() {
        return this._parent.battleSettingsAreValid();
    }

    static COL_COUNT = 6;
    static ROW_COUNT = 6;
    static NAVIGATION_MARGIN = 35;
    static HEIGHT_SHIFT = 20;
    static CELL_DIMENSION = new Dimension2D(80, 75)
}

export class CBWingSelectorCell extends CBRosterSelectorCell {

    _getDimension() {
        return CBWingSelectorCell.DIMENSION;
    }

    static DIMENSION = new Dimension2D(50, 120);

}

export class CBWingSelector extends CBRosterSelector {

    constructor(parent, content) {
        super(parent, content,
            ()=>{
                return parent.player ?
                    new Set(parent.player.wings.map(wing=>wing.name)):
                    new Set();
            },
            ()=>new Set(
                parent.players.filter(
                    player=>player!==parent.player).reduce(
                        (wings, player)=>{
                            wings.push(...player.wings.map(wing=>wing.name));
                            return wings;
                        }, []
                    )
                )
        );
    }

    _buildCell(col, row, position, selected, excluded) {
        return new CBWingSelectorCell(this, col, row, position, selected, excluded);
    }

    _getColCount() {
        return CBWingSelector.COL_COUNT;
    }

    _getRowCount() {
        return CBWingSelector.ROW_COUNT;
    }

    _getNavigationMarginCount() {
        return CBWingSelector.NAVIGATION_MARGIN;
    }

    _getHeightShift() {
        return CBWingSelector.HEIGHT_SHIFT;
    }

    _getCellDimension() {
        return CBWingSelector.CELL_DIMENSION;
    }

    _changeCellState(cell) {
        if (cell.selected) {
            this._parent.addWing(cell.item);
        }
        else {
            this._parent.removeWing(cell.item);
        }
        super._changeCellState(cell);
    }

    _isValidationPossible() {
        return this._parent.playerSettingsAreValid(this._parent.player);
    }

    static COL_COUNT = 6;
    static ROW_COUNT = 4;
    static NAVIGATION_MARGIN = 35;
    static HEIGHT_SHIFT = 20;
    static CELL_DIMENSION = new Dimension2D(80, 120)
}

export class CBUnitsRoster extends DPopup {

    constructor(game, playerIdentities, banners) {
        super(CBUnitsRoster.DIMENSION);
        this._game = game;
        if (!this._game.rosterMap) {
            this._game.wingIndex = 0;
        }
        this._loadBattleSettings(this._game);
        this._wing = this.wings[this.game.wingIndex];
        this._buildHeaderElement();
        this._buildRosterElement();
        this._buildPlayerSelector(playerIdentities);
        this._buildWingSelector(banners);
        if (this.wings.length>0) {
            this._header.showCurrentWing();
        }
        else {
            this.showPlayerSelector();
        }
    }

    shiftWing(shift) {
        if (this.wings.length>0) {
            this._game.wingIndex += shift;
            this._wing = this.wings[this.game.wingIndex];
        }
    }

    updateWingSelectionContent() {
        this._wingSelector.changeSelectionContent();
    }

    get playerSelector() {
        return this._playerSelector;
    }

    get wingSelector() {
        return this._wingSelector;
    }

    get rosterContent() {
        return this._rosterContent;
    }

    get wing() {
        return this._wing;
    }

    get wings() {
        let wings = [];
        for (let player of this._players) {
            wings.push(...player.wings);
        }
        return wings;
    }

    get players() {
        return this._players;
    }

    get game() {
        return this._game;
    }

    get header() {
        return this._header;
    }

    get currentWing() {
        for (let player of this._game.players) {
            for (let wing of player.wings) {
                if (wing.banner.name === this._wing.name) {
                    return wing;
                }
            }
        }
    }

    activateHeader(active) {
        if (active) {
            this.game.wingIndex = this.wings.map(wing => wing.name).indexOf(this._wing.name);
        }
        this._header.setActive(active);
    }

    _validateBattleSettings() {
        let syncWings = (player, playerDesc)=>{
            let wingMap = new Map();
            for (let wing of player.wings) {
                wingMap.set(wing.banner.name, wing);
            }
            let wings = [];
            for (let wingDesc of playerDesc.wings) {
                let wing = wingMap.get(wingDesc.name);
                if (!wing) wing = new CBWing( player,
                    {
                        name: wingDesc.name,
                        path: wingDesc.path
                    }
                );
                wings.push(wing);
            }
            player.setWings(wings);
        }

        let syncPlayers = ()=>{
            let playerMap = new Map();
            for (let player of this._game.players) {
                playerMap.set(player.name, player);
            }
            let players = [];
            for (let playerDesc of this._players) {
                let player = playerMap.get(playerDesc.name);
                if (!player) player = new CBEditorPlayer(playerDesc.name, playerDesc.path);
                syncWings(player, playerDesc);
                players.push(player);
            }
            this._game.setPlayers(players);
        }

        this.activateHeader(true);
        syncPlayers();
        this._showRosterContent();
    }

    _validatePlayerCreation() {
        delete this._playerCreation;
        this.showPlayerSelector();
    }

    validateBattleSettings() {
        if (this._playerCreation) {
            this._validatePlayerCreation();
        }
        else {
            this._validateBattleSettings();
        }
    }

    _cancelBattleSettings() {
        let _retrievePlayer = ()=>{
            for (let player of this._players) {
                if (player.name === this._player.name) {
                    return player;
                }
            }
            return this._players[0];
        }
        let _retrieveWing = ()=>{
            this._game.wingIndex = 0;
            for (let wing of this._player.wings) {
                this._game.wingIndex++;
                if (wing.name === this._wing.name) {
                    return wing;
                }
            }
            this._game.wingIndex = 0;
            return this._player.wings.length>0 ? this._player.wings[0] : null;
        }

        this.activateHeader(true);
        this._loadBattleSettings(this._game);
        this.setPlayer(_retrievePlayer());
        this._wing = _retrieveWing();
        this._header.refreshPlayer();
        this._showRosterContent();
    }

    _cancelPlayerCreation() {
        delete this._playerCreation;
        this._players = this._players.filter(player=>(player !== this._player));
        this._resetBattleArtifacts();
        this.showPlayerSelector();
    }

    cancelBattleSettings() {
        if (this._playerCreation) {
            this._cancelPlayerCreation();
        }
        else {
            this._cancelBattleSettings();
        }
    }

    _loadBattleSettings(game) {
        this._players = [];
        for (let player of game.players) {
            let playerDesc = {
                name:player.name,
                path:player.path
            }
            let wings = player.wings.map(wing=>{
                return {
                    name:wing.banner.name,
                    path:wing.banner.path,
                    player: playerDesc
                }
            });
            playerDesc.wings = wings;
            this._players.push(playerDesc);
        }
    }

    playerSettingsAreValid(player) {
        return player.wings.length>0;
    }

    battleSettingsAreValid() {
        if (this._players.length<2) return false;
        for (let player of this._players) {
            if (!this.playerSettingsAreValid(player)) return false;
        }
        return true;
    }

    addPlayer(item) {
        this._player = {
            ...item,
            wings: []
        }
        this._wing = null;
        this._players.push(this._player);
        this._header.refreshPlayer();
    }

    _resetBattleArtifacts() {
        this._player = this._players.length>0 ? this._players[0] : null;
        this._wing = (this._player && this._player.wings.length>0) ? this._player.wings[0] : null;
        this._header.refreshPlayer();
    }

    removePlayer(item) {
        this._players = this._players.filter(player=>player.name !== item.name);
        if (item.name === this._player.name) {
            this._resetBattleArtifacts();
        }
    }

    addWing(item) {
        this._wing = {
            ...item,
            player: this._player
        }
        this._player.wings.push(this._wing);
        this._header.refreshWing();
    }

    removeWing(item) {
        this._player.wings = this._player.wings.filter(wing=>wing.name !== item.name);
        if (item.name === this._wing.name) {
            this._wing = this._player.wings[0];
            this._header.refreshWing();
        }
    }

    get player() {
        return this._player;
    }

    setPlayer(player) {
        this._player = player;
    }

    _buildHeaderElement() {
        this._header = new CBUnitsRosterHeader(this);
        this.addElement(this._header);
    }

    _buildRosterElement() {
        this._rosterContent = new CBUnitsRosterContent(this);
        this.addElement(this._rosterContent);
    }

    _buildPlayerSelector(playerIdentities) {
        this._playerSelector = new CBPlayerSelector(this, playerIdentities);
        this._backToPlayersSelector = false;
    }

    _buildWingSelector(banners) {
        this._wingSelector = new CBWingSelector(this, banners);
    }

    _showRosterContent() {
        if (!this.hasElement(this._rosterContent)) {
            if (this.hasElement(this._wingSelector)) {
                this.removeElement(this._wingSelector);
            }
            if (this.hasElement(this._playerSelector)) {
                this.removeElement(this._playerSelector);
            }
            this.addElement(this._rosterContent);
        }
    }

    showPlayerSelector() {
        if (!this.hasElement(this._playerSelector)) {
            if (this.hasElement(this._rosterContent)) {
                this.removeElement(this._rosterContent);
            }
            if (this.hasElement(this._wingSelector)) {
                this.removeElement(this._wingSelector);
            }
            this._playerSelector.changeSelectionContent();
            this.addElement(this._playerSelector);
        }
    }

    showWingSelector(playerCreation) {
        if (playerCreation) this._playerCreation = true;
        if (!this.hasElement(this._wingSelector)) {
            if (this.hasElement(this._rosterContent)) {
                this.removeElement(this._rosterContent);
            }
            if (this.hasElement(this._playerSelector)) {
                this.removeElement(this._playerSelector);
            }
            this._wingSelector.changeSelectionContent();
            this.addElement(this._wingSelector);
        }
    }

    static DIMENSION = new Dimension2D(500, 650);
}

export class CBMapCommand extends DImageArtifact {

    constructor(pedestal, path, position, action) {
        super("widget-items", DImage.getImage(path), position, CBMapCommand.DIMENSION);
        this._pedestal = pedestal;
        this._action = action;
        this.setSettings(level => {
            level.setShadowSettings("#00FFFF", 10);
        });
    }

    onMouseEnter(event, fromArtifact) {
        this.setSettings(level => {
            level.setShadowSettings("#FF0000", 10);
        });
        return true;
    }

    onMouseLeave(event, toArtifact) {
        this.setSettings(level => {
            level.setShadowSettings("#00FFFF", 10);
        });
        if (toArtifact !== this._pedestal) {
            this._pedestal.onMouseLeave(event, toArtifact);
        }
        return true;
    }

    onMouseClick(event) {
        this._action(this._pedestal);
        return true;
    }

    static DIMENSION = new Dimension2D(36, 36);

}

export class CBMapCellArtifact extends DPedestalArtifact {

    constructor(mapComposer, col, row, position) {
        super(null, "widget-items", position);
        this._mapComposer = mapComposer;
        this._col = col;
        this._row = row;
        this.colorize("#E0E0E0");
        this.setSettings(level => {
            level.setShadowSettings("#000000", 0);
        });
    }

    colorize(color) {
        this.artifact = new DRectArtifact("widget-items",
            new Point2D(0, 0), CBMapCellArtifact.DIMENSION,
            1,  "#000000", color);
    }

    copyMap(pedestal) {
        this.setMap(pedestal.map);
        this._mapAngle = pedestal._mapAngle
        this.turn(this._mapAngle);
    }

    get map() {
        return this._map;
    }

    isInverted() {
        return !!this._mapAngle;
    }

    setMap(map) {
        this._mapAngle = 0;
        this.turn(0);
        this._map = map;
        this.artifact = new DImageArtifact("-",
            DImage.getImage(map.icon),
            new Point2D(0, 0), CBMapSelectorArtifact.DIMENSION
        );
    }

    turnMap() {
        this._mapAngle = sumAngle(this._mapAngle, 180);
        this.turn(this._mapAngle);
    }

    unsetMap() {
        delete this._mapAngle;
        delete this._map;
        this.turn(0);
        this.unsetCommands();
    }

    onMouseEnter(event, fromArtifact) {
        if (!fromArtifact || (fromArtifact !== this._turnCommand && fromArtifact !== this._deleteCommand)) {
            this._mapComposer.enterCell(this);
            this.setSettings(level => {
                level.setShadowSettings("#FF0000", 10);
            });
        }
        return true;
    }

    onMouseLeave(event, toArtifact) {
        if (toArtifact !== this._turnCommand && toArtifact !== this._deleteCommand) {
            this._mapComposer.leaveCell(this);
            this.setSettings(level => {
                level.setShadowSettings("#000000", 0);
            });
        }
        return true;
    }

    onMouseClick(event) {
        this._mapComposer.setMapOnComposerCell(this);
        return true;
    }

    setCommands() {
        this._turnCommand = new CBMapCommand(this,
            "./../images/edit-actions/flip.png",
            this.position.minus(0, 30),
            pedestal=>pedestal.turnMap());
        this._mapComposer.addArtifact(this._turnCommand);
        this._deleteCommand = new CBMapCommand(this,
            "./../images/edit-actions/remove.png",
            this.position.plus(0, 30),
            pedestal=>{
                pedestal.unsetMap();
                this._mapComposer.updateCommands();
            }
        );
        this._mapComposer.addArtifact(this._deleteCommand);
    }

    get turnCommand() {
        return this._turnCommand;
    }

    get deleteCommand() {
        return this._deleteCommand;
    }

    unsetCommands() {
        if (this._turnCommand) {
            this._mapComposer.removeArtifact(this._turnCommand);
            delete this._turnCommand;
        }
        if (this._deleteCommand) {
            this._mapComposer.removeArtifact(this._deleteCommand);
            delete this._deleteCommand;
        }
    }

    static DIMENSION = new Dimension2D(80, 125);
}

export class CBMapGliderCommand extends DMultiImagesArtifact {

    constructor(mapComposer, path, inactivePath, position, direction) {
        super("widget-items", [DImage.getImage(path), DImage.getImage(inactivePath)], position, CBMapGliderCommand.DIMENSION);
        this._mapComposer = mapComposer;
        this._direction = direction;
        this._active = true;
    }

    setActive(active) {
        this._active = active;
        if (active) {
            this.setSettings(level => {
                level.setShadowSettings("#00FFFF", 5);
            });
            this.setImage(0);
        }
        else {
            this.setSettings(level => {
                level.setShadowSettings("#000000", 5);
            });
            this.setImage(1);
        }
    }

    onMouseEnter(event, fromArtifact) {
        if (this._active) {
            this.setSettings(level => {
                level.setShadowSettings("#FF0000", 10);
            });
        }
        return true;
    }

    onMouseLeave(event, toArtifact) {
        if (this._active) {
            this.setSettings(level => {
                level.setShadowSettings("#00FFFF", 5);
            });
        }
        return true;
    }

    onMouseClick(event) {
        if (this._active) {
            this._mapComposer.translateMap(this._direction);
        }
        return true;
    }

    get direction() {
        return this._direction;
    }

    static DIMENSION = new Dimension2D(36, 36);

}

export class CBMapSelectorArtifact extends DPedestalArtifact {

    constructor(mapComposer, index, location) {
        super(null, "widget-items", location);
        this._mapComposer = mapComposer;
        this._index = index;
        this.setSettings(
            level=>{
                level.setShadowSettings("#000000", 10);
            }
        );
    }

    get index() {
        return this._index;
    }

    setMap(map) {
        this.artifact = new DImageArtifact("-",
            DImage.getImage(map.icon),
            new Point2D(0, 0), CBMapSelectorArtifact.DIMENSION
        );
    }

    onMouseClick(event) {
        this._mapComposer.select(this.index);
        return true;
    }

    select() {
        this._selected = true;
        this.setSettings(level => {
            level.setShadowSettings("#FF0000", 10);
        });
    }

    unselect() {
        delete this._selected;
        this.setSettings(level => {
            level.setShadowSettings("#000000", 10);
        });
    }

    onMouseEnter(event) {
        if (!this._selected) {
            this.setSettings(level => {
                level.setShadowSettings("#00FFFF", 10);
            });
        }
        return true;
    }

    onMouseLeave(event) {
        if (!this._selected) {
            this.setSettings(level => {
                level.setShadowSettings("#000000", 10);
            });
        }
        return true;
    }

    static DIMENSION = new Dimension2D(80, 125);
}

export class CBMapComposer extends DPopup {

    constructor(game, configuration, models) {
        super(new Dimension2D(10, 10), true);
        this._models = models;
        this._firstModel = 0;
        this._game = game;
        this.resize(CBMapComposer.DIMENSION);
        this._buildSelector();
        this._buildComposer();
        this._buildCommands();
        this._init(configuration);
    }

    _buildCommands() {
        this._translateUp = new CBMapGliderCommand(this,
            "./../images/commands/top.png","./../images/commands/top-inactive.png",
            new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
                .plusPoint(CBMapComposer.GLIDER_COMMANDS_MARGIN),
            {col:0, row:-1});
        this.addArtifact(this._translateUp);
        this._translateLeft = new CBMapGliderCommand(this,
            "./../images/commands/prev.png", "./../images/commands/prev-inactive.png",
            new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
                .plusPoint(CBMapComposer.GLIDER_COMMANDS_MARGIN).plus(0, CBMapComposer.GLIDER_COMMANDS_SHIFT),
            {col:-1, row:0});
        this.addArtifact(this._translateLeft);
        this._translateRight = new CBMapGliderCommand(this,
            "./../images/commands/next.png", "./../images/commands/next-inactive.png",
            new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
                .plusPoint(CBMapComposer.GLIDER_COMMANDS_MARGIN).plus(0, CBMapComposer.GLIDER_COMMANDS_SHIFT*2),
            {col:1, row:0});
        this.addArtifact(this._translateRight);
        this._translateDown = new CBMapGliderCommand(this,
            "./../images/commands/bottom.png", "./../images/commands/bottom-inactive.png",
            new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
                .plusPoint(CBMapComposer.GLIDER_COMMANDS_MARGIN).plus(0, CBMapComposer.GLIDER_COMMANDS_SHIFT*3),
            {col:0, row:1});
        this.addArtifact(this._translateDown);
        this._cancel = new DCancel(new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
            .plusPoint(CBMapComposer.OKKO_COMMANDS_MARGIN).minus(0, CBMapComposer.OKKO_COMMANDS_SHIFT),()=>{
            this._game.closePopup();
        });
        this.addArtifact(this._cancel);
        this._ok = new DOk(new Point2D(CBMapComposer.DIMENSION.w/2-CBMapComposer.SELECTOR_WIDTH, 0)
            .plusPoint(CBMapComposer.OKKO_COMMANDS_MARGIN),()=>{
            this._game.replaceMap(this.getMapConfiguration());
        });
        this.addArtifact(this._ok.setActive(false));
    }

    get selectorTop() {
        return this._selectorTop;
    }

    get selectorBottom() {
        return this._selectorBottom;
    }

    get ok() {
        return this._ok;
    }

    get cancel() {
        return this._cancel;
    }

    getMapSelectors(index) {
        return this._mapSelectors[index];
    }

    _buildSelector() {
        let selectorX = CBMapComposer.DIMENSION.w / 2 - CBMapComposer.SELECTOR_WIDTH / 2;
        this._selector = new DRectArtifact("widgets",
            new Point2D(CBMapComposer.DIMENSION.w / 2 - CBMapComposer.SELECTOR_WIDTH / 2, 0),
            new Dimension2D(CBMapComposer.SELECTOR_WIDTH, CBMapComposer.DIMENSION.h), 1, "#000000", "#C0C0C0");
        this.addArtifact(this._selector);
        this._selectorTop = new DUpNavigation(
            new Point2D(selectorX, 35 - CBMapComposer.DIMENSION.h / 2),
            () => {
                this._fillSelectors(this._firstModel - 1);
                this._updateSelection(this._getSelectedSelector());
            }
        );
        this.addArtifact(this._selectorTop);
        this._selectorBottom = new DDownNavigation(
            new Point2D(selectorX, -35 + CBMapComposer.DIMENSION.h / 2),
            () => {
                this._fillSelectors(this._firstModel + 1);
                this._updateSelection(this._getSelectedSelector());
            }
        );
        this.addArtifact(this._selectorBottom);
        this._mapSelectors = [];
        this._mapSelectors.push(new CBMapSelectorArtifact(this, 0, new Point2D(selectorX, -CBMapComposer.MAP_SELECTOR_HEIGHT)));
        this._mapSelectors.push(new CBMapSelectorArtifact(this, 1, new Point2D(selectorX, 0)));
        this._mapSelectors.push(new CBMapSelectorArtifact(this, 2, new Point2D(selectorX, CBMapComposer.MAP_SELECTOR_HEIGHT)));
        for (let mapSelector of this._mapSelectors) {
            this.addArtifact(mapSelector);
        }
        this._fillSelectors(this._firstModel);
    }

    _buildComposer() {
        this._mapComposer = [];
        for (let col=0; col<CBMapComposer.COL_COUNT; col++) {
            this._mapComposer[col] = [];
            for (let row=0; row<CBMapComposer.ROW_COUNT; row++) {
                this._mapComposer[col][row] = new CBMapCellArtifact(this, col, row, new Point2D(
                    (col-CBMapComposer.COL_COUNT/2 + 0.5) * CBMapCellArtifact.DIMENSION.w -CBMapComposer.SELECTOR_WIDTH/2 -CBMapComposer.CELL_COMMANDS_MARGIN,
                    (row-CBMapComposer.ROW_COUNT/2 + 0.5) * CBMapCellArtifact.DIMENSION.h
                ));
                this.addArtifact(this._mapComposer[col][row]);
            }
        }
    }

    getCell(col, row) {
        return this._mapComposer[col][row];
    }

    _init(configuration) {
        for(let board of configuration) {
            this._mapComposer[board.col][board.row].setMap(board);
            if (board.invert) this._mapComposer[board.col][board.row].turnMap();
        }
        this.updateCommands();
    }

    setMapOnComposerCell(pedestal) {
        if (this._selectedIndex !== undefined) {
            pedestal.setMap(this._models[this._selectedIndex]);
            pedestal.setCommands();
        }
        this.updateCommands();
    }

    updateCommands() {
        this.setTranslateCommandsActiveStatus();
        this._ok.setActive(this.colorizeEmptyCell());
    }

    enterCell(artifact) {
        this.removeArtifact(artifact);
        this.addArtifact(artifact);
        if (artifact.map) {
            artifact.setCommands();
        }
    }

    leaveCell(artifact) {
        artifact.unsetCommands();
    }

    _fillSelectors(first) {
        this._firstModel = first < 0 ? 0 : first;
        let maxSelector = first+3;
        if (maxSelector > this._models.length) {
            maxSelector = this._models.length;
            this._firstModel = maxSelector -3;
            if (this._firstModel<0) this._firstModel = 0;
        }
        for (let index=this._firstModel; index<maxSelector; index++) {
            this._mapSelectors[index-this._firstModel].setMap(this._models[index]);
        }
        this._selectorTop.setActive(this._firstModel>0);
        this._selectorBottom.setActive(maxSelector<this._models.length);
    }

    _getSelectedSelector() {
        let index = this._selectedIndex -this._firstModel;
        if (index>=0 && index<=this._mapSelectors.length) {
            return this._mapSelectors[index];
        }
        else return null;
    }

    select(index) {
        this._selectedIndex = this._firstModel + index;
        this._updateSelection(this._getSelectedSelector());
    }

    _updateSelection(selector) {
        if (this._selected !== selector) {
            if (this._selected) {
                this._selected.unselect();
            }
            this._selected = selector;
            if (this._selected) {
                this._selected.select();
            }
        }
    }

    setTranslateCommandsActiveStatus() {
        this._translateUp.setActive(this.isTranslateCommandActive(this._translateUp.direction));
        this._translateLeft.setActive(this.isTranslateCommandActive(this._translateLeft.direction));
        this._translateRight.setActive(this.isTranslateCommandActive(this._translateRight.direction));
        this._translateDown.setActive(this.isTranslateCommandActive(this._translateDown.direction));
    }

    get translateUp() {
        return this._translateUp;
    }

    get translateDown() {
        return this._translateDown;
    }

    get translateLeft() {
        return this._translateLeft;
    }

    get translateRight() {
        return this._translateRight;
    }

    getAreaToFill() {
        let minCol = CBMapComposer.COL_COUNT;
        let maxCol = 0;
        let minRow = CBMapComposer.ROW_COUNT;
        let maxRow = 0;
        for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                if (this._mapComposer[col][row].map) {
                    if (minCol>this._mapComposer[col][row]._col) minCol = this._mapComposer[col][row]._col;
                    if (maxCol<this._mapComposer[col][row]._col) maxCol = this._mapComposer[col][row]._col;
                    if (minRow>this._mapComposer[col][row]._row) minRow = this._mapComposer[col][row]._row;
                    if (maxRow<this._mapComposer[col][row]._row) maxRow = this._mapComposer[col][row]._row;
                }
            }
        }
        if (minCol>maxCol) return null;
        return {minCol, minRow, maxCol, maxRow};
    }

    colorizeEmptyCell() {
        let area = this.getAreaToFill();
        let missing = false;
        for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                if (!this._mapComposer[col][row].map) {
                    if (!area || (col<area.minCol || col>area.maxCol || row<area.minRow || row>area.maxRow)) {
                        this._mapComposer[col][row].colorize("#E0E0E0");
                    }
                    else {
                        this._mapComposer[col][row].colorize("#FFE0E0");
                        missing = true;
                    }
                }
            }
        }
        return area && !missing;
    }

    isTranslateCommandActive(direction) {
        let empty = true;
        for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
            for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
                if (this._mapComposer[col][row].map) empty = false;
            }
        }
        if (direction.col === 1) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                if (this._mapComposer[CBMapComposer.COL_COUNT-1][row].map) return false;
            }
        }
        if (direction.col === -1) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                if (this._mapComposer[0][row].map) return false;
            }
        }
        if (direction.row === 1) {
            for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
                if (this._mapComposer[col][CBMapComposer.ROW_COUNT-1].map) return false;
            }
        }
        if (direction.row === -1) {
            for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
                if (this._mapComposer[col][0].map) return false;
            }
        }
        return !empty;
    }

    translateMap(direction) {
        if (direction.col === 1) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                for (let col = CBMapComposer.COL_COUNT - 1; col > 0; col--) {
                    if (this._mapComposer[col - 1][row].map) {
                        this._mapComposer[col][row].copyMap(this._mapComposer[col - 1][row]);
                    } else this._mapComposer[col][row].unsetMap();
                }
                this._mapComposer[0][row].unsetMap();
            }
        }
        if (direction.col === -1) {
            for (let row = 0; row < CBMapComposer.ROW_COUNT; row++) {
                for (let col = 0; col < CBMapComposer.COL_COUNT - 1; col++) {
                    if (this._mapComposer[col + 1][row].map) {
                        this._mapComposer[col][row].copyMap(this._mapComposer[col + 1][row]);
                    } else this._mapComposer[col][row].unsetMap();
                }
                this._mapComposer[CBMapComposer.COL_COUNT - 1][row].unsetMap();
            }
        }
        if (direction.row === 1) {
            for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
                for (let row = CBMapComposer.ROW_COUNT - 1; row > 0; row--) {
                    if (this._mapComposer[col][row - 1].map) {
                        this._mapComposer[col][row].copyMap(this._mapComposer[col][row - 1]);
                    } else this._mapComposer[col][row].unsetMap();
                }
                this._mapComposer[col][0].unsetMap();
            }
        }
        if (direction.row === -1) {
            for (let col = 0; col < CBMapComposer.COL_COUNT; col++) {
                for (let row = 0; row < CBMapComposer.ROW_COUNT - 1; row++) {
                    if (this._mapComposer[col][row + 1].map) {
                        this._mapComposer[col][row].copyMap(this._mapComposer[col][row + 1]);
                    } else this._mapComposer[col][row].unsetMap();
                }
                this._mapComposer[col][CBMapComposer.ROW_COUNT - 1].unsetMap();
            }
        }
        this.updateCommands();
    }

    getMapConfiguration() {
        let area = this.getAreaToFill();
        let configuration = [];
        for (let col = area.minCol; col<=area.maxCol; col++) {
            for (let row = area.minRow; row<=area.maxRow; row++) {
                let board = {
                    path:this._mapComposer[col][row].map.path,
                    icon:this._mapComposer[col][row].map.icon,
                    col:col-area.minCol, row:row-area.minRow
                };
                if (this._mapComposer[col][row].isInverted()) board.invert = true;
                    configuration.push(board);
            }
        }
        return configuration;
    }

    static DIMENSION = new Dimension2D(850, 550);
    static SELECTOR_WIDTH = 100;
    static MAP_SELECTOR_HEIGHT = 135;
    static GLIDER_COMMANDS_MARGIN = new Point2D(-40, -230);
    static GLIDER_COMMANDS_SHIFT = 50;
    static OKKO_COMMANDS_MARGIN = new Point2D(-40, 240);
    static OKKO_COMMANDS_SHIFT = 60;
    static CELL_COMMANDS_MARGIN = 25;
    static ROW_COUNT = 4;
    static COL_COUNT = 8;

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
                    if (state) unit.reactivate(); else unit.setPlayed();
                    if (!state) unit.receivesOrder(false)
                }
            ).setSecondState(unit.isPlayed());
            let move = new DIconMenuItem("./../images/edit-actions/move.png", "./../images/edit-actions/move-gray.png",
                2, 2, (event, state) => {
                    if (unit.formationNature) {
                        game.openActuator(new CBFormationMoveActuator(game.map));
                    }
                    else {
                        game.openActuator(new CBPieceMoveActuator(game.map));
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

export class CBEditTokenMenu extends DIconMenu {

    constructor(game, token) {
        function createTokenItems(token) {
            let move = new DIconMenuItem("./../images/edit-actions/move.png", "./../images/edit-actions/move-gray.png",
                0, 0, (event, state) => {
                    game.openActuator(new CBPieceMoveActuator(game.map));
                }
            );
            let remove = new DIconMenuItem("./../images/edit-actions/delete.png", "./../images/edit-actions/delete-gray.png",
                0, 1, (event, state) => {
                    token.deleteFromMap();
                }
            );

            return [
                 move, remove
            ];
        }

        let menuItems = [
            ...createTokenItems(token)
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

export class CBTokensCatalog extends DIconMenu {

    constructor(game) {
        function createTokenItems() {
            let startFire = new DIconMenuItem("./../images/edit-actions/start-fire.png", "./../images/edit-actions/start-fire-gray.png",
                0, 0, (event, state) => {
                    game.openActuator(new CBTokenCreationActuator(game.map, {type: "fire", fire:false}));
                }
            );
            let fire = new DIconMenuItem("./../images/edit-actions/fire.png", "./../images/edit-actions/fire-gray.png",
                1, 0, (event, state) => {
                    game.openActuator(new CBTokenCreationActuator(game.map, {type: "fire", fire:true}));
                }
            );
            let lightSmoke = new DIconMenuItem("./../images/edit-actions/light-smoke.png", "./../images/edit-actions/light-smoke-gray.png",
                0, 1, (event, state) => {
                    game.openActuator(new CBTokenCreationActuator(game.map, {type: "smoke", density:false}));
                }
            );
            let heavySmoke = new DIconMenuItem("./../images/edit-actions/heavy-smoke.png", "./../images/edit-actions/heavy-smoke-gray.png",
                1, 1, (event, state) => {
                    game.openActuator(new CBTokenCreationActuator(game.map, {type: "smoke", density:true}));
                }
            );
            let stakes = new DIconMenuItem("./../images/edit-actions/stakes.png", "./../images/edit-actions/stakes-gray.png",
                2, 0, (event, state) => {
                    game.openActuator(new CBTokenCreationActuator(game.map, {type: "stakes"}));
                }
            );
            let remove = new DIconMenuItem("./../images/edit-actions/delete.png", "./../images/edit-actions/delete-gray.png",
                2, 1, (event, state) => {
                    //unit.destroy();
                }
            );
            return [
                startFire, fire, lightSmoke, heavySmoke, stakes, remove
            ];
        }

        let menuItems = [
            ...createTokenItems()
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

export class CBEditorPlayer extends WAbstractPlayer {

    _init() {
        super._init();
        this._wings = [];
    }

    acceptActivation(playable) {
        return true;
    }

    setWings(wings) {
        this._wings = [];
        for (let wing of wings) {
            this.addWing(wing);
        }
    }

    addWing(wing) {
        this._wings.push(wing);
        wing.player = this;
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
            offset.x - popup.dimension.w/2 + WAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + WAbstractGame.POPUP_MARGIN));
    }

    openEditTokenMenu(token, offset) {
        let popup = new CBEditTokenMenu(this.game, token);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + WAbstractGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + WAbstractGame.POPUP_MARGIN));
    }

    launchPlayableAction(playable, point) {
        this.openEditUnitMenu(playable, point);
    }

    playToken(token, point) {
        this.openEditTokenMenu(token, point);
    }

    toSpecs(context) {
        let playerSpecs = super.toSpecs(context);
        playerSpecs.wings = [];
        for (let wing of this.wings) {
            let wingSpecs = wing.toSpecs(context);
            playerSpecs.wings.push(wingSpecs);
        }
        return playerSpecs;
    }

    fromSpecs(game, specs, context) {
        super.fromSpecs(game, specs, context);
        for (let wingSpecs of specs.wings) {
            CBWing.fromSpecs(this, wingSpecs, context);
        }
        return this;
    }

}

export class CBMapEditorGame extends RetractableGameMixin(WAbstractGame) {

    constructor() {
        super(0, new WLevelBuilder().buildLevels());
    }

    _buildBoard(map) {
        super._buildBoard(map);
        this._board.escapeOnKeyDown();
        this._board.delOnKeyDown();
    }

    editBoard() {
        this.closeActuators();
        this.closePopup();
        this.openActuator(new CBBoardEditActuator(this.map));
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
                this.showCommand(this._editBoardCommand);
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
                this.hideCommand(this._editBoardCommand);
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
                new BoardLoader().save(this.map);
                animation();
            }).setTurnAnimation(true);
        this._editBoardCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-board.png", "./../images/commands/field.png"],
            new Point2D(-360, -60), (state, animation)=>{
                this.editBoard();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-420, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
    }

}

export class CBScenarioEditorGame extends StandardGameMixin(RetractableGameMixin(WAbstractGame)) {

    constructor(id) {
        super(id, new WLevelBuilder().buildLevels());
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
            super._processGlobalEvent && super._processGlobalEvent(source, event, value);
        }
    }

    editUnits() {
        this.closeActuators();
        this.closePopup();
        new PlayerIdentityListLoader().load(playerIdentities=> {
            new BannerListLoader().load(banners => {
                this.openPopup(new CBUnitsRoster(this, playerIdentities, banners), this.viewportCenter);
            });
        });
    }

    editTokens() {
        this.closeActuators();
        this.closePopup();
        this.openPopup(new CBTokensCatalog(this), this.viewportCenter);
    }

    editMap() {
        this.closeActuators();
        this.closePopup();
        new BoardListLoader().load(boards=>{
            this.openPopup(new CBMapComposer(this, this.map.mapBoards, boards), this.viewportCenter);
        });
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
                this.showCommand(this._editUnitsCommand);
                this.showCommand(this._editTokensCommand);
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
                this.hideCommand(this._editUnitsCommand);
                this.hideCommand(this._editTokensCommand);
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
                new GameLoader(this, (name, path)=>new CBEditorPlayer(name, path)).save();
                animation();
            }).setTurnAnimation(true);
        this._editUnitsCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-units.png", "./../images/commands/edit-units-inactive.png"],
            new Point2D(-360, -60), (state, animation)=>{
                this.editUnits();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._editTokensCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-tokens.png", "./../images/commands/edit-tokens-inactive.png"],
            new Point2D(-420, -60), (state, animation)=>{
                this.editTokens();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._editMapCommand = new DMultiStatePushButton(
            ["./../images/commands/edit-map.png", "./../images/commands/edit-map-inactive.png"],
            new Point2D(-480, -60), (state, animation)=>{
                this.editMap();
                animation();
            }).setTurnAnimation(true, ()=>{}
        );
        this._fullScreenCommand = new DMultiStatePushButton(
            ["./../images/commands/full-screen-on.png", "./../images/commands/full-screen-off.png"],
            new Point2D(-540, -60), (state, animation)=>{
                if (!state)
                    getDrawPlatform().requestFullscreen();
                else
                    getDrawPlatform().exitFullscreen();
                animation();
            })
            .setTurnAnimation(true, ()=>this._fullScreenCommand.setState(this._fullScreenCommand.state?0:1));
    }

    replaceMap(configuration) {
        this.closePopup();
        let map = new WMap(configuration);
        this.changeMap(map);
    }

}
