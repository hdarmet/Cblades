import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBAbstractArbitrator, CBAbstractPlayer,
    CBGame,
    CBHexSideId,
    CBMovement,
    CBWeather
} from "./game.js";
import {
    DElement, DImageArtifact
} from "../board.js";
import {
    DImage
} from "../draw.js";

export class CBArbitrator extends CBAbstractArbitrator{

    allowedActions(unit) {
        return {
            moveForward:true,
            moveBack:true,
            escape:true,
            confront:true,
            shockAttack:false,
            fireAttack:false,
            shockDuel:false,
            fireDuel:false,
            rest:this.isAllowedToRest(unit),
            reload:true,
            reorganize:true,
            rally:true,
            createFormation:true,
            joinFormation:true,
            leaveFormation:true,
            breakFormation:true,
            takeCommand:true,
            leaveCommand:true,
            changeOrders:true,
            giveSpecificOrders:true,
            prepareSpell:true,
            castSpell:true,
            mergeUnit:true,
            miscAction:true
        }
    }

    _allowedMove(unit, first) {
        function processAngle(directions, arbitrator, unit, angle, first) {
            let nearHexId = unit.hexLocation.getNearHex(angle);
            let cost = arbitrator.getMovementCost(unit, nearHexId);
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.tiredness<2) {
                if (unit.extendedMovementPoints >= cost) {
                    directions[angle] = {hex: nearHexId, type: CBMovement.EXTENDED};
                } else if (first) {
                    directions[angle] = {hex: nearHexId, type: CBMovement.MINIMAL};
                }
            }
        }

        let directions = [];
        let angle = unit.angle;
        if (angle%60) {
            processAngle(directions, this, unit, angle - 30, first);
            processAngle(directions, this, unit, (angle + 30) % 360, first);
        }
        else {
            processAngle(directions, this, unit, (angle + 300) % 360, first);
            processAngle(directions, this, unit, angle, first);
            processAngle(directions, this, unit, (angle + 60) % 360, first);
        }
        return directions;
    }

    allowedFirstMove(unit) {
        return this._allowedMove(unit, true);
    }

    allowedSubsequentMove(unit) {
        return this._allowedMove(unit, false);
    }

    _allowedRotate(unit) {
        function processAngle(directions, arbitrator, unit, angle) {
            let nearHexId = angle%60 ?
                new CBHexSideId(unit.hexLocation.getNearHex(angle-30), unit.hexLocation.getNearHex((angle+30)%360)) :
                unit.hexLocation.getNearHex(angle);
            let cost = arbitrator.getRotationCost(unit, angle);
            if (unit.movementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.NORMAL};
            }
            else if (unit.tiredness<2 && unit.extendedMovementPoints>=cost) {
                directions[angle] = { hex:nearHexId, type:CBMovement.EXTENDED};
            }
        }

        let directions = [];
        for (let angle = 0; angle < 360; angle += 30) {
            processAngle(directions, this, unit, angle);
        }
        delete directions[unit.angle];
        return directions;
    }

    allowedFirstRotate(unit) {
        return this._allowedRotate(unit)
    }

    allowedSubsequentRotate(unit) {
        return this._allowedRotate(unit)
    }

    getRotationCost(unit, angle) {
        return 0.5;
    }

    getMovementCost(unit, hexId) {
        return 1;
    }

    doesMovementInflictTiredness(unit, cost) {
        return unit.movementPoints>=0 && cost>unit.movementPoints;
    }

    isAllowedToRest(unit) {
        return unit.tiredness > 0;
    }

    processRestResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=10;
        let minorRestingCapacity = diceResult[0]===diceResult[1];
        return { success, minorRestingCapacity };
    }

    getWeather() {
        return CBWeather.CLEAR;
    }

    getWingTiredness(unit) {
        return 10;
    }

    get game() {
        return this._game;
    }

    set game(game) {
        this._game = game;
    }

}

export class CBInteractivePlayer extends CBAbstractPlayer {

    constructor() {
        super();
    }

    selectUnit(unit, event) {
        if (!unit.hasBeenActivated()) {
            this.openActionMenu(unit,
                new Point2D(event.offsetX, event.offsetY),
                this.game.arbitrator.allowedActions(unit)
            );
        }
    }

    _createFirstMovementActuators(unit) {
        this.game.closeActuators();
        let moveDirections = this.game.arbitrator.allowedFirstMove(unit);
        let moveActuator = this.createMoveActuator(unit, moveDirections, true);
        this.game.openActuator(moveActuator);
        let orientationDirections = this.game.arbitrator.allowedFirstRotate(unit);
        let orientationActuator = this.createOrientationActuator(unit, orientationDirections, true);
        this.game.openActuator(orientationActuator);
    }

    _createSubsequentMovementActuators(unit) {
        this.game.closeActuators();
        let moveDirections = this.game.arbitrator.allowedSubsequentMove(unit);
        let moveActuator = this.createMoveActuator(unit, moveDirections, false);
        this.game.openActuator(moveActuator);
        let orientationDirections = this.game.arbitrator.allowedSubsequentRotate(unit);
        let orientationActuator = this.createOrientationActuator(unit, orientationDirections, false);
        this.game.openActuator(orientationActuator);
        if (moveDirections.length===0 && orientationDirections.length===0) {
            unit.markAsBeingPlayed();
        }
        else {
            unit.markAsBeingActivated();
        }
    }

    startMoveUnit(unit, event) {
        this._createFirstMovementActuators(unit);
    }

    _updateTirednessForMovement(unit, cost) {
        if (this.game.arbitrator.doesMovementInflictTiredness(unit, cost)) {
            unit.addOneTirednessLevel();
        }
    }

    firstUnitRotation(unit, angle, event) {
        let cost = this.game.arbitrator.getRotationCost(unit, angle);
        this._updateTirednessForMovement(unit, cost);
        unit.firstRotation(angle, cost);
        this._createSubsequentMovementActuators(unit);
    }

    firstUnitMove(unit, hexId, event) {
        let cost = this.game.arbitrator.getMovementCost(unit, hexId);
        this._updateTirednessForMovement(unit, cost);
        unit.firstMove(hexId, cost);
        this._createSubsequentMovementActuators(unit);
    }

    subsequentUnitRotation(unit, angle, event) {
        let cost = this.game.arbitrator.getRotationCost(unit, angle);
        this._updateTirednessForMovement(unit, cost);
        unit.subsequentRotation(angle, cost);
        this._createSubsequentMovementActuators(unit);
    }

    subsequentUnitMove(unit, hexId, event) {
        let cost = this.game.arbitrator.getMovementCost(unit, hexId);
        this._updateTirednessForMovement(unit, cost);
        unit.subsequentMove(hexId, cost);
        this._createSubsequentMovementActuators(unit);
    }

    restUnit(unit, event) {
        let wingTiredness = this.game.arbitrator.getWingTiredness(unit);
        let weather = this.game.arbitrator.getWeather();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        mask.setAction(()=>{mask.close(); scene.close();});
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBRestInsert(), new Point2D(0, -CBRestInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBCheckRestInsert(), new Point2D(-20, CBCheckRestInsert.DIMENSION.h/2)
        ).addWidget(
            new CBWingTirednessIndicator(wingTiredness),
            new Point2D(-CBRestInsert.DIMENSION.w/2-CBWingTirednessIndicator.DIMENSION.w/2-10, 0)
        ).addWidget(
            new CBWeatherIndicator(weather),
            new Point2D(CBRestInsert.DIMENSION.w/2+CBWeatherIndicator.DIMENSION.w/2-30, 200)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.activate = false;
                let {success, minorRestingCapacity} = this.processRestResult(unit, dice.result);
                if (success) {
                    result.success().show();
                }
                else {
                    result.failure().show();
                }
            }),
            new Point2D(CBRestInsert.DIMENSION.w/2+40, 0)
        ).addWidget(
            result.setFinalAction(()=>{
                mask.close();
                scene.close();
            }),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    processRestResult(unit, diceResult) {
        let result = this.game.arbitrator.processRestResult(unit, diceResult);
        if (result.success) {
            unit.removeOneTirednessLevel();
        }
        unit.markAsBeingPlayed();
        Memento.clear();
        return result;
    }

    openActionMenu(unit, offset, actions) {
        let popup = new CBActionMenu(unit, actions);
        this.game.closeActuators();
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }

    createOrientationActuator(unit, directions, first) {
        return new CBOrientationActuator(unit, directions, first);
    }

    createMoveActuator(unit, directions, first) {
        return new CBMoveActuator(unit, directions, first);
    }

}

export class CBActionMenu extends DIconMenu {

    constructor(unit, actions) {
        super(new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
            0, 0, event => {
                unit.player.startMoveUnit(unit, event);
                return true;
            }).setActive(actions.moveForward),
            new DIconMenuItem("/CBlades/images/icons/move-back.png", "/CBlades/images/icons/move-back-gray.png",
                1, 0, () => {
                    return true;
                }).setActive(actions.moveBack),
            new DIconMenuItem("/CBlades/images/icons/escape.png", "/CBlades/images/icons/escape-gray.png",
                2, 0, () => {
                    return true;
                }).setActive(actions.escape),
            new DIconMenuItem("/CBlades/images/icons/to-face.png", "/CBlades/images/icons/to-face-gray.png",
                3, 0, () => {
                    return true;
                }).setActive(actions.confront),
            new DIconMenuItem("/CBlades/images/icons/shock-attack.png", "/CBlades/images/icons/shock-attack-gray.png",
                0, 1, () => {
                }).setActive(actions.shockAttack),
            new DIconMenuItem("/CBlades/images/icons/fire-attack.png", "/CBlades/images/icons/fire-attack-gray.png",
                1, 1, () => {
                }).setActive(actions.fireAttack),
            new DIconMenuItem("/CBlades/images/icons/shock-duel.png", "/CBlades/images/icons/shock-duel-gray.png",
                2, 1, () => {
                }).setActive(actions.shockDuel),
            new DIconMenuItem("/CBlades/images/icons/fire-duel.png", "/CBlades/images/icons/fire-duel-gray.png",
                3, 1, () => {
                }).setActive(actions.fireDuel),
            new DIconMenuItem("/CBlades/images/icons/do-rest.png", "/CBlades/images/icons/do-rest-gray.png",
                0, 2, event => {
                    unit.player.restUnit(unit, event);
                    return true;
                }).setActive(actions.rest),
            new DIconMenuItem("/CBlades/images/icons/do-reload.png", "/CBlades/images/icons/do-reload-gray.png",
                1, 2, () => {
                }).setActive(actions.reload),
            new DIconMenuItem("/CBlades/images/icons/do-reorganize.png", "/CBlades/images/icons/do-reorganize-gray.png",
                2, 2, () => {
                }).setActive(actions.reorganize),
            new DIconMenuItem("/CBlades/images/icons/do-rally.png", "/CBlades/images/icons/do-rally-gray.png",
                3, 2, () => {
                }).setActive(actions.rally),
            new DIconMenuItem("/CBlades/images/icons/create-formation.png", "/CBlades/images/icons/create-formation-gray.png",
                0, 3, () => {
                }).setActive(actions.createFormation),
            new DIconMenuItem("/CBlades/images/icons/join-formation.png", "/CBlades/images/icons/join-formation-gray.png",
                1, 3, () => {
                }).setActive(actions.joinFormation),
            new DIconMenuItem("/CBlades/images/icons/leave-formation.png", "/CBlades/images/icons/leave-formation-gray.png",
                2, 3, () => {
                }).setActive(actions.leaveFormation),
            new DIconMenuItem("/CBlades/images/icons/dismiss-formation.png", "/CBlades/images/icons/dismiss-formation-gray.png",
                3, 3, () => {
                }).setActive(actions.breakFormation),
            new DIconMenuItem("/CBlades/images/icons/take-command.png", "/CBlades/images/icons/take-command-gray.png",
                0, 4, () => {
                }).setActive(actions.takeCommand),
            new DIconMenuItem("/CBlades/images/icons/leave-command.png", "/CBlades/images/icons/leave-command-gray.png",
                1, 4, () => {
                }).setActive(actions.leaveCommand),
            new DIconMenuItem("/CBlades/images/icons/change-orders.png", "/CBlades/images/icons/change-orders-gray.png",
                2, 4, () => {
                }).setActive(actions.changeOrders),
            new DIconMenuItem("/CBlades/images/icons/give-specific-orders.png", "/CBlades/images/icons/give-specific-orders-gray.png",
                3, 4, () => {
                }).setActive(actions.giveSpecificOrders),
            new DIconMenuItem("/CBlades/images/icons/select-spell.png", "/CBlades/images/icons/select-spell-gray.png",
                0, 5, () => {
                }).setActive(actions.prepareSpell),
            new DIconMenuItem("/CBlades/images/icons/cast-spell.png", "/CBlades/images/icons/cast-spell-gray.png",
                1, 5, () => {
                }).setActive(actions.castSpell),
            new DIconMenuItem("/CBlades/images/icons/do-fusion.png", "/CBlades/images/icons/do-fusion-gray.png",
                2, 5, () => {
                }).setActive(actions.mergeUnit),
            new DIconMenuItem("/CBlades/images/icons/do-many.png", "/CBlades/images/icons/do-many-gray.png",
                3, 5, () => {
                }).setActive(actions.miscAction)
        );
    }

}


class ActuatorImageArtifact extends DImageArtifact {

    constructor(actuator, ...args) {
        super(...args);
        this._actuator = actuator;
        this.setSettings(this.settings);
    }

    get settings() {
        return level=>{
            level.setShadowSettings("#00FFFF", 10);
        }
    }

    get overSettings() {
        return level=>{
            level.setShadowSettings("#FF0000", 10);
        }
    }

    onMouseClick(event) {
        this._actuator.onMouseClick(this, event);
    }

    onMouseEnter(event) {
        this.setSettings(this.overSettings);
        this.element.refresh();
    }

    onMouseLeave(event) {
        this.setSettings(this.settings);
        this.element.refresh();
    }

}

export class CBActuator {

    constructor(unit) {
        this._unit = unit;
    }

    get unit() {
        return this._unit;
    }
}

export class CBOrientationActuator extends CBActuator {

    constructor(unit, directions, first) {
        super(unit);
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage : extendedImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(unit.location, directions[angle].hex.location, angle%60?0.87:0.75);
            orientation.pangle = parseInt(angle);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    get element() {
        return this._element;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                if (this._first) {
                    this.unit.player.firstUnitRotation(this.unit, artifact.angle, event);
                }
                else {
                    this.unit.player.subsequentUnitRotation(this.unit, artifact.angle, event);
                }
            }
        }
    }

}

export class CBMoveActuator extends CBActuator {

    constructor(unit, directions, first) {
        super(unit);
        let normalImage = DImage.getImage("/CBlades/images/actuators/standard-move.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-move.png");
        let minimalImage = DImage.getImage("/CBlades/images/actuators/minimal-move.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage :
                directions[angle].type === CBMovement.EXTENDED ? extendedImage : minimalImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(unit.location, directions[angle].hex.location, 0.9);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
        this._first = first;
    }

    get element() {
        return this._element;
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                if (this._first) {
                    this.unit.player.firstUnitMove(this.unit, this.unit.hexLocation.getNearHex(artifact.angle), event);
                }
                else {
                    this.unit.player.subsequentUnitMove(this.unit, this.unit.hexLocation.getNearHex(artifact.angle), event);
                }
            }
        }
    }

}

export class CBWingTirednessIndicator extends DIndicator {

    constructor(tiredness) {
        function getPaths(tiredness) {
            let paths = [];
            paths.push(`/CBlades/images/inserts/tiredness${tiredness}.png`);
            if (tiredness>4) {
                paths.push(`/CBlades/images/inserts/tiredness${tiredness-1}.png`);
            }
            return paths;
        }

        super(getPaths(tiredness), CBWingTirednessIndicator.DIMENSION);
    }

}
CBWingTirednessIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBWeatherIndicator extends DIndicator {

    constructor(weather) {
        function getPaths(weather) {
            let paths = [];
            paths.push(`/CBlades/images/inserts/meteo${weather}.png`);
            if (weather>1) {
                paths.push(`/CBlades/images/inserts/meteo${weather-1}.png`);
            }
            if (weather<6) {
                paths.push(`/CBlades/images/inserts/meteo${weather+1}.png`);
            }
            return paths;
        }

        super(getPaths(weather), CBWingTirednessIndicator.DIMENSION);
    }

}
CBWeatherIndicator.DIMENSION = new Dimension2D(142, 142);

export class CBRestInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/rest-insert.png", CBRestInsert.DIMENSION);
    }

}
CBRestInsert.DIMENSION = new Dimension2D(444, 195);

export class CBCheckRestInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-rest-insert.png", CBCheckRestInsert.DIMENSION);
    }

}
CBCheckRestInsert.DIMENSION = new Dimension2D(444, 451);

