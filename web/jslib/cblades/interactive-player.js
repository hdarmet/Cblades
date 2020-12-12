import {
    diffAngle,
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DResult, DScene
} from "../widget.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBAbstractArbitrator, CBAbstractPlayer, CBActuator,
    CBGame,
    CBHexSideId,
    CBMovement, CBTiredness,
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
        function processAngle(direction, arbitrator, unit, first) {
            let cost = arbitrator.getMovementCost(unit, direction.hexId);
            if (unit.movementPoints>=cost) {
                direction.type = CBMovement.NORMAL;
                return true;
            }
            else if (unit.tiredness<CBTiredness.EXHAUSTED) {
                if (unit.extendedMovementPoints >= cost) {
                    direction.type = CBMovement.EXTENDED;
                    return true;
                } else if (first) {
                    direction.type = CBMovement.MINIMAL;
                    return true;
                }
            }
            return false;
        }

        let directions = this._getUnitForwardZone(unit);
        let result = [];
        for (let angle in directions) {
            let direction = directions[angle];
            if (processAngle(direction, this, unit, first)) {
                result[angle] = direction;
            }
        }
        return result;
    }

    allowedMove(unit, first) {
        return this._allowedMove(unit, first);
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

    allowedRotate(unit, first) {
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

    processEngagementResult(unit, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    getWeather() {
        return CBWeather.CLEAR;
    }

    getWingTiredness(unit) {
        return 10;
    }

    _isHexOnForwardZone(unit, hexId) {
        let unitAngle = unit.angle;
        let hexAngle = unit.hexLocation.isNearHex(hexId);
        let diff = diffAngle(hexAngle, unitAngle);
        return diff>=-60 && diff<=60;
    }

    _getUnitForwardZone(unit) {
        let directions = [];
        let angle = unit.angle;
        if (angle%60) {
            directions[angle-30]={hex:unit.hexLocation.getNearHex(angle -30)};
            directions[(angle + 30) % 360]={hex:unit.hexLocation.getNearHex((angle + 30) % 360)};
        }
        else {
            directions[(angle + 300) % 360]={hex:unit.hexLocation.getNearHex((angle + 300) % 360)};
            directions[angle]={hex:unit.hexLocation.getNearHex(angle)};
            directions[(angle + 60) % 360]={hex:unit.hexLocation.getNearHex((angle + 60) % 360)};
        }
        return directions;
    }

    _arePlayersFoes(player1, player2) {
        return player1 !== player2;
    }

    _areUnitsFoes(unit1, unit2) {
        return this._arePlayersFoes(unit1.player, unit2.player);
    }

    isUnitOnContact(unit) {
        let directions = this._getUnitForwardZone(unit);
        for (let angle in directions) {
            let direction = directions[angle];
            let nearUnits = direction.hex.map.getUnitsOnHex(direction.hex);
            if (nearUnits.length) {
                if (this._areUnitsFoes(nearUnits[length], unit)) {
                    return true;
                }
            }
        }
        return false;
    }

    isAUnitEngageAnotherUnit(unit1, unit2, engagingMarker=false) {
        if (engagingMarker && !unit1.isEngaging() && !unit1.isCharging()) return false;
        if (!this._areUnitsFoes(unit1, unit2)) return false;
        return this._isHexOnForwardZone(unit1, unit2.hexLocation);
    }

    isUnitEngaged(unit, engagingMarker=false) {
        for (let angle=0; angle<=300; angle+=60) {
            let hexId = unit.hexLocation.getNearHex(angle);
            let nearUnits = hexId.map.getUnitsOnHex(hexId);
            for (let nearUnit of nearUnits) {
                if (this.isAUnitEngageAnotherUnit(nearUnit, unit, engagingMarker)) {
                    return true;
                }
            }
        }
        return false;
    }

}

export class CBInteractivePlayer extends CBAbstractPlayer {

    constructor() {
        super();
    }

    _markUnitAsBeingActivated(unit) {
        if (unit.isEngaging()) {
            unit.markAsEngaging(false);
        }
        unit.markAsBeingActivated();
    }

    _selectUnit(unit, event) {
        unit.select();
        if (!unit.hasBeenActivated() && this.game.arbitrator.isUnitEngaged(unit, true)) {
            this._checkDefenderEngagement(unit, unit.viewportLocation, ()=>{
                this.openActionMenu(unit,
                    new Point2D(event.offsetX, event.offsetY),
                    this.game.arbitrator.allowedActions(unit),
                    true
                );
                this._markUnitAsBeingActivated(unit);
            });
        }
        else {
            this.openActionMenu(unit,
                new Point2D(event.offsetX, event.offsetY),
                this.game.arbitrator.allowedActions(unit),
                false
            );
        }
    }

    finishTurn(animation) {
        this._checkLastSelectedUnitEngagement(()=>{
            super.finishTurn(animation);
        });
    }

    _checkLastSelectedUnitEngagement(action) {
        let lastUnit = this.game.selectedUnit;
        if (lastUnit && lastUnit.isCurrentPlayer() &&
            lastUnit.isEngaging() && this.game.arbitrator.isUnitEngaged(lastUnit, false)) {
            this._checkAttackerEngagement(lastUnit, lastUnit.viewportLocation, ()=> {
                action();
                return true;
            });
        }
        else {
            action();
            return true;
        }
    }

    selectUnit(unit, event) {
        if (unit.isCurrentPlayer() && !unit.hasBeenActivated()) {
            this._checkLastSelectedUnitEngagement(()=>{
                this._selectUnit(unit, event);
            });
        }
    }

    _checkAttackerEngagement(unit, point, action) {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        mask.setAction(()=>{mask.close(); scene.close();});
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBCheckAttackerEngagementInsert(), new Point2D(-CBCheckAttackerEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.activate = false;
                let {success} = this._processEngagementResult(unit, dice.result);
                if (success) {
                    result.success().show();
                }
                else {
                    result.failure().show();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(()=>{
                mask.close();
                scene.close();
                action();
            }),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _checkDefenderEngagement(unit, point, action) {
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        mask.setAction(()=>{mask.close(); scene.close();});
        mask.open(this.game.board, point);
        scene.addWidget(
            new CBCheckDefenderEngagementInsert(), new Point2D(-CBCheckDefenderEngagementInsert.DIMENSION.w/2, 0)
        ).addWidget(
            new CBMoralInsert(), new Point2D(CBMoralInsert.DIMENSION.w/2-10, -CBMoralInsert.DIMENSION.h/2+10)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.activate = false;
                let {success} = this._processEngagementResult(unit, dice.result);
                if (success) {
                    result.success().show();
                }
                else {
                    result.failure().show();
                }
            }),
            new Point2D(70, 70)
        ).addWidget(
            result.setFinalAction(()=>{
                mask.close();
                scene.close();
                action();
            }),
            new Point2D(0, 0)
        ).open(this.game.board, point);

    }

    _processEngagementResult(unit, diceResult) {
        let result = this.game.arbitrator.processEngagementResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        Memento.clear();
        return result;
    }

    _createMovementActuators(unit, start) {
        let moveDirections = this.game.arbitrator.allowedMove(unit, start);
        let orientationDirections = this.game.arbitrator.allowedRotate(unit, start);
        this.game.closeActuators();
        if (moveDirections.length) {
            let moveActuator = this.createMoveActuator(unit, moveDirections, start);
            this.game.openActuator(moveActuator);
        }
        if (orientationDirections.length) {
            let orientationActuator = this.createOrientationActuator(unit, orientationDirections, start);
            this.game.openActuator(orientationActuator);
        }
        return moveDirections.length === 0 && orientationDirections.length ===0;
    }

    startMoveUnit(unit, event) {
        this._createMovementActuators(unit, true);
    }

    _markUnitActivationAfterMovement(unit, played) {
        if (played) {
            unit.markAsBeingPlayed();
        }
        else {
            unit.markAsBeingActivated();
        }
    }

    _checkContact(unit) {
        unit.markAsEngaging(this.game.arbitrator.isUnitOnContact(unit));
    }

    rotateUnit(unit, angle, event) {
        let cost = this.game.arbitrator.getRotationCost(unit, angle);
        this._updateTirednessForMovement(unit, cost);
        unit.rotate(angle, cost);
        let played = this._createMovementActuators(unit);
        this._checkContact(unit);
        this._markUnitActivationAfterMovement(unit, played);
    }

    moveUnit(unit, hexId, event) {
        let cost = this.game.arbitrator.getMovementCost(unit, hexId);
        this._updateTirednessForMovement(unit, cost);
        unit.move(hexId, cost);
        this._createMovementActuators(unit);
        let played = this._createMovementActuators(unit);
        this._checkContact(unit);
        this._markUnitActivationAfterMovement(unit, played);
    }

    _updateTirednessForMovement(unit, cost) {
        if (this.game.arbitrator.doesMovementInflictTiredness(unit, cost)) {
            unit.addOneTirednessLevel();
        }
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
                let {success, minorRestingCapacity} = this._processRestResult(unit, dice.result);
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

    _processRestResult(unit, diceResult) {
        let result = this.game.arbitrator.processRestResult(unit, diceResult);
        if (result.success) {
            unit.removeOneTirednessLevel();
        }
        unit.markAsBeingPlayed();
        Memento.clear();
        return result;
    }

    openActionMenu(unit, offset, actions, modal= false) {
        let popup = new CBActionMenu(unit, actions, modal);
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

    constructor(unit, actions, modal) {
        super(modal, new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
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

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                this.unit.player.rotateUnit(this.unit, artifact.angle, event);
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

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        for (let artifact of this._element.artifacts) {
            if (artifact === trigger) {
                this.unit.player.moveUnit(this.unit, this.unit.hexLocation.getNearHex(artifact.angle), event);
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

export class CBCheckAttackerEngagementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-attacker-engagement-insert.png", CBCheckAttackerEngagementInsert.DIMENSION);
    }

}
CBCheckAttackerEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBCheckDefenderEngagementInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/check-defender-engagement-insert.png", CBCheckDefenderEngagementInsert.DIMENSION);
    }

}
CBCheckDefenderEngagementInsert.DIMENSION = new Dimension2D(444, 763);

export class CBMoralInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/moral-insert.png", CBMoralInsert.DIMENSION);
    }

}
CBMoralInsert.DIMENSION = new Dimension2D(444, 389);
