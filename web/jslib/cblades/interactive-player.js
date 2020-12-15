import {
    Dimension2D, Point2D
} from "../geometry.js";
import {
    DDice, DIconMenu, DIconMenuItem, DIndicator, DInsert, DMask, DPopup, DResult, DScene
} from "../widget.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBAbstractPlayer, CBAction, CBActuator,
    CBGame,
    CBMovement
} from "./game.js";
import {
    DElement, DImageArtifact
} from "../board.js";
import {
    DImage
} from "../draw.js";

export class CBInteractivePlayer extends CBAbstractPlayer {

    constructor() {
        super();
    }

    beforeActivation(unit, action) {
        if (this.game.arbitrator.isUnitEngaged(unit, true)) {
            this.checkDefenderEngagement(unit, unit.viewportLocation, () => {
                this.game.setFocusedUnit(unit);
                super.beforeActivation(unit, action);
            });
        }
        else {
            super.beforeActivation(unit, action);
        }
    }

    launchUnitAction(unit, event) {
        this.openActionMenu(unit,
            new Point2D(event.offsetX, event.offsetY),
            this.game.arbitrator.getAllowedActions(unit));
    }

    afterActivation(unit, action) {
        if (unit && unit.isEngaging() && this.game.arbitrator.isUnitEngaged(unit, false)) {
            unit.action.checkAttackerEngagement(unit.viewportLocation, ()=> {
                super.afterActivation(unit, action);
            });
        }
        else {
            super.afterActivation(unit, action);
        }
    }

    finishTurn(animation) {
        let unit = this.game.selectedUnit;
        this.afterActivation(unit, ()=>{
            super.finishTurn(animation);
        });
    }

    checkDefenderEngagement(unit, point, action) {
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
                let {success} = this._processDefenderEngagementResult(unit, dice.result);
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

    _processDefenderEngagementResult(unit, diceResult) {
        let result = this.game.arbitrator.processDefenderEngagementResult(unit, diceResult);
        if (!result.success) {
            unit.addOneCohesionLevel();
        }
        return result;
    }

    openActionMenu(unit, offset, actions) {
        let popup = new CBActionMenu(unit, actions);
        this.game.openPopup(popup, new Point2D(
            offset.x - popup.dimension.w/2 + CBGame.POPUP_MARGIN,
            offset.y - popup.dimension.h/2 + CBGame.POPUP_MARGIN));
    }

    applyLossesToUnit(unit, losses) {
        unit.launchAction(new InteractiveRetreatAction(this.game, unit, losses));
    }

    restUnit(unit, event) {
        unit.launchAction(new InteractiveRestingAction(this.game, unit, event));
    }

    unitShockAttack(unit, event) {
        unit.launchAction(new InteractiveShockAttackAction(this.game, unit, event));
    }

    startMoveUnit(unit, event) {
        unit.launchAction(new InteractiveMovementAction(this.game, unit, event));
    }

}

export class InteractiveRetreatAction extends CBAction {

    constructor(game, unit, losses) {
        super(game, unit);
        this._losses = losses;
    }

    play() {
        this.game.setFocusedUnit(this.unit);
        this._createRetreatActuator(this.unit);
    }

    _createRetreatActuator() {
        let retreatDirections = this.game.arbitrator.getRetreatZones(this.unit);
        if (retreatDirections.length) {
            let moveActuator = this.createRetreatActuator(retreatDirections);
            this.game.openActuator(moveActuator);
        }
        return retreatDirections.length === 0;
    }

    retreatUnit(hexId, event) {
        this.game.closeActuators();
        this.unit.move(hexId, 0);
        this.markAsFinished();
        this.unit.removeAction();
    }

    createRetreatActuator(directions) {
        return new CBRetreatActuator(this, directions);
    }

}

export class InteractiveRestingAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        let wingTiredness = this.game.arbitrator.getWingTiredness(this.unit);
        let weather = this.game.arbitrator.getWeather();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        mask.setAction(()=>{mask.close(); scene.close();});
        mask.open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
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
                let {success, minorRestingCapacity} = this._processRestResult(this.unit, dice.result);
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
        ).open(this.game.board, new Point2D(this._event.offsetX, this._event.offsetY));
    }

    _processRestResult(unit, diceResult) {
        let result = this.game.arbitrator.processRestResult(this.unit, diceResult);
        if (result.success) {
            this.unit.removeOneTirednessLevel();
        }
        this.markAsFinished();
        //Memento.clear();
        return result;
    }

}

export class InteractiveShockAttackAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createShockAttackActuator(this.unit);
    }

    _createShockAttackActuator() {
        let foesThatMayBeShockAttacked = this.game.arbitrator.getFoesThatMayBeShockAttacked(this.unit);
        this.game.closeActuators();
        if (foesThatMayBeShockAttacked.length) {
            let shockAttackActuator = this.createShockAttackActuator(foesThatMayBeShockAttacked);
            this.game.openActuator(shockAttackActuator);
        }
    }

    shockAttackUnit(foe, supported, event) {
        this.game.closeActuators();
        let result = new DResult();
        let dice = new DDice([new Point2D(30, -30), new Point2D(-30, 30)]);
        let scene = new DScene();
        let mask = new DMask("#000000", 0.3);
        mask.setAction(()=>{mask.close(); scene.close();});
        mask.open(this.game.board, new Point2D(event.offsetX, event.offsetY));
        scene.addWidget(
            new CBCombatResultTableInsert(), new Point2D(0, -CBCombatResultTableInsert.DIMENSION.h/2+10)
        ).addWidget(
            new CBShockAttackInsert(), new Point2D(-160, CBShockAttackInsert.DIMENSION.h/2-40)
        ).addWidget(
            dice.setFinalAction(()=>{
                dice.activate = false;
                let {success} = this._processShockAttackResult(foe, supported, dice.result);
                if (success) {
                    result.success().show();
                    foe.player.applyLossesToUnit(foe, result.lossesForDefender);
                }
                else {
                    result.failure().show();
                }
            }),
            new Point2D(70, 60)
        ).addWidget(
            result.setFinalAction(()=>{
                mask.close();
                scene.close();
            }),
            new Point2D(0, 0)
        ).open(this.game.board, new Point2D(event.offsetX, event.offsetY));
    }

    _processShockAttackResult(foe, supported, diceResult) {
        let result = this.game.arbitrator.processShockAttackResult(this.unit, foe, supported, diceResult);
        if (result.tirednessForAttacker) {
            this.unit.addOneTirednessLevel();
        }
        this.markAsFinished();
        return result;
    }

    createShockAttackActuator(foes) {
        return new CBShockAttackActuator(this, foes);
    }

}

export class InteractiveMovementAction extends CBAction {

    constructor(game, unit, event) {
        super(game, unit);
        this._event = event;
    }

    play() {
        this._createMovementActuators(true);
    }

    checkAttackerEngagement(point, action) {
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
                let {success} = this._processAttackerEngagementResult(dice.result);
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

    _processAttackerEngagementResult(diceResult) {
        let result = this.game.arbitrator.processAttackerEngagementResult(this.unit, diceResult);
        if (!result.success) {
            this.unit.addOneCohesionLevel();
        }
        return result;
    }

    _createMovementActuators(start) {
        let moveDirections = this.game.arbitrator.getAllowedMoves(this.unit, start);
        let orientationDirections = this.game.arbitrator.getAllowedRotations(this.unit, start);
        this.game.closeActuators();
        if (moveDirections.length) {
            let moveActuator = this.createMoveActuator(moveDirections, start);
            this.game.openActuator(moveActuator);
        }
        if (orientationDirections.length) {
            let orientationActuator = this.createOrientationActuator(orientationDirections, start);
            this.game.openActuator(orientationActuator);
        }
        return moveDirections.length === 0 && orientationDirections.length ===0;
    }

    _markUnitActivationAfterMovement(played) {
        if (played) {
            this.markAsFinished();
        }
        else {
            this.markAsStarted();
        }
    }

    _checkContact() {
        this.unit.markAsEngaging(this.game.arbitrator.isUnitOnContact(this.unit));
    }

    rotateUnit(angle) {
        let cost = this.game.arbitrator.getRotationCost(this.unit, angle);
        this._updateTirednessForMovement(cost);
        this.unit.rotate(angle, cost);
        let played = this._createMovementActuators();
        this._checkContact();
        this._markUnitActivationAfterMovement(played);
    }

    moveUnit(hexId) {
        let cost = this.game.arbitrator.getMovementCost(this.unit, hexId);
        this._updateTirednessForMovement(cost);
        this.unit.move(hexId, cost);
        this._createMovementActuators();
        let played = this._createMovementActuators();
        this._checkContact();
        this._markUnitActivationAfterMovement(played);
    }

    _updateTirednessForMovement(cost) {
        if (this.game.arbitrator.doesMovementInflictTiredness(this.unit, cost)) {
            this.unit.addOneTirednessLevel();
        }
    }

    createOrientationActuator(directions, first) {
        return new CBOrientationActuator(this, directions, first);
    }

    createMoveActuator(directions, first) {
        return new CBMoveActuator(this, directions, first);
    }

}

export class CBActionMenu extends DIconMenu {

    constructor(unit, actions) {
        super(false, new DIconMenuItem("/CBlades/images/icons/move.png","/CBlades/images/icons/move-gray.png",
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
                0, 1, event => {
                    unit.player.unitShockAttack(unit, event);
                    return true;
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

export class CBShockAttackActuator extends CBActuator {

    constructor(action, foes) {
        super(action);
        let unsupportedImage = DImage.getImage("/CBlades/images/actuators/unsupported-shock.png");
        let supportedImage = DImage.getImage("/CBlades/images/actuators/supported-shock.png");
        this._imageArtifacts = [];
        for (let foe of foes) {
            let unsupportedShock = new ActuatorImageArtifact(this, "actuators", unsupportedImage,
                new Point2D(0, 0), new Dimension2D(100, 111));
            unsupportedShock.position = Point2D.position(this.unit.location, foe.unit.location, 1);
            unsupportedShock.pangle = 30;
            unsupportedShock._unit = foe.unit;
            unsupportedShock._supported = false;
            this._imageArtifacts.push(unsupportedShock);
            if (foe.supported) {
                let supportedShock = new ActuatorImageArtifact(this, "actuators", supportedImage,
                    new Point2D(0, 0), new Dimension2D(100, 111));
                supportedShock.position = unsupportedShock.position.translate(30, 30);
                unsupportedShock.position = unsupportedShock.position.translate(-30, -30);
                supportedShock.pangle = 30;
                supportedShock._unit = foe.unit;
                supportedShock._supported = true;
                this._imageArtifacts.push(supportedShock);
            }
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getTrigger(unit) {
        for (let artifact of this._element.artifacts) {
            if (artifact._unit === unit) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.shockAttackUnit(trigger._unit, trigger._supported, event);
    }

}

export class CBOrientationActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
        let normalImage = DImage.getImage("/CBlades/images/actuators/toward.png");
        let extendedImage = DImage.getImage("/CBlades/images/actuators/extended-toward.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let image = directions[angle].type === CBMovement.NORMAL ? normalImage : extendedImage;
            let orientation = new ActuatorImageArtifact(this, "actuators", image,
                new Point2D(0, 0), new Dimension2D(60, 80));
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, angle%60?0.87:0.75);
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
        this.action.rotateUnit(trigger.angle);
    }

}

export class CBMoveActuator extends CBActuator {

    constructor(action, directions, first) {
        super(action);
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
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
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
        this.action.moveUnit(this.unit.hexLocation.getNearHex(trigger.angle));
    }

}

export class CBRetreatActuator extends CBActuator {

    constructor(action, directions) {
        super(action);
        let retreatImage = DImage.getImage("/CBlades/images/actuators/retreat-move.png");
        this._imageArtifacts = [];
        for (let angle in directions) {
            let orientation = new ActuatorImageArtifact(this, "actuators", retreatImage,
                new Point2D(0, 0), new Dimension2D(80, 130));
            orientation.pangle = parseInt(angle);
            orientation.position = Point2D.position(this.unit.location, directions[angle].hex.location, 0.9);
            this._imageArtifacts.push(orientation);
        }
        this._element = new DElement(...this._imageArtifacts);
        this._element._actuator = this;
        this._element.setLocation(this.unit.location);
    }

    getTrigger(angle) {
        for (let artifact of this._element.artifacts) {
            if (artifact.pangle === angle) return artifact;
        }
        return null;
    }

    onMouseClick(trigger, event) {
        this.action.retreatUnit(this.unit.hexLocation.getNearHex(trigger.angle), event);
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

export class CBShockAttackInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/shock-attack-insert.png", CBShockAttackInsert.DIMENSION);
    }

}
CBShockAttackInsert.DIMENSION = new Dimension2D(405, 658);

export class CBCombatResultTableInsert extends DInsert {

    constructor() {
        super("/CBlades/images/inserts/combat-result-table-insert.png", CBCombatResultTableInsert.DIMENSION);
    }

}
CBCombatResultTableInsert.DIMENSION = new Dimension2D(804, 174);
