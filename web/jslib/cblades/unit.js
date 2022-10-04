'use strict'

import {
    Point2D, Dimension2D, diffAngle, sumAngle
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Mechanisms,
    Memento
} from "../mechanisms.js";
import {
    CBPieceImageArtifact, CBStacking, HexLocatableMixin, BelongsToPlayerMixin, PlayableMixin, CBPiece, CBAbstractPlayer
} from "./game.js";
import {
    RetractableArtifactMixin,
    ActivableArtifactMixin,
    RetractablePieceMixin,
    SelectableArtifactMixin,
    CBLevelBuilder,
    CBGame,
    CBPlayableActuatorTrigger, CBBasicPlayer
} from "./playable.js";
import {
    CBHexLocation
} from "./map.js";

export let CBMovement = {
    NORMAL : "normal",
    EXTENDED : "extended",
    MINIMAL : "minimal"
}

export let CBEngageSideMode = {
    NONE: 0,
    FRONT: 1,
    SIDE: 2,
    BACK: 3
}

export let CBCharge = {
    NONE: 0,
    BEGIN_CHARGE: 1,
    CAN_CHARGE: 2,
    CHARGING: 3
}

export let CBTiredness = {
    NONE: 0,
    TIRED: 1,
    EXHAUSTED: 2
}

export let CBMunitions = {
    NONE: 0,
    SCARCE: 1,
    EXHAUSTED: 2
}

export let CBCohesion = {
    GOOD_ORDER: 0,
    DISRUPTED: 1,
    ROUTED: 2,
    DESTROYED: 3
}

export let CBOrderInstruction = {
    ATTACK: 0,
    DEFEND: 1,
    REGROUP: 2,
    RETREAT: 3
}

export class CBUnitPlayer extends CBBasicPlayer {

    _init() {
        super._init();
        this._wings = [];
    }

    addWing(wing) {
        this._wings.push(wing);
        wing.player = this;
    }

    get wings() {
        return this._wings;
    }

    get units() {
        return this.game.playables.filter(playable=>playable.unitNature && playable.player === this);
    }

}

export class CBUnitActuatorTrigger extends CBPlayableActuatorTrigger {

    constructor(actuator, unit, ...args) {
        super(actuator, unit, ...args);
    }

    get unit() {
        return this.playable;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return CBLevelBuilder.ULAYERS.ACTUATORS;
    }

}

export class CBProfile {

    constructor(capacity = 0) {
        this._capacity = capacity;
    }

    get capacity() {
        return this._capacity;
    }
}

export class CBMoveProfile extends CBProfile {

    constructor(capacity = 0) {
        super(capacity);
    }

    get movementPoints() {
        return 2+this.capacity;
    }

    get extendedMovementPoints() {
        return this.movementPoints*1.5;
    }

    getMinimalMoveCost() {
        return 1;
    }

    getMovementCostOnHex(hex) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }

    getMovementCostOnHexSide(hexSide) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
    }

    getRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }
}
CBMoveProfile.COST_TYPE = {
    ADD: 0,
    SET: 1,
    MINIMAL_MOVE : 2,
    IMPASSABLE : 3
};

export class CBWeaponProfile extends CBProfile {

    constructor(capacity=0, attackBonus=0, defenseBonus=0, fireBonus=0) {
        super(capacity);
        this._attackBonus = attackBonus;
        this._defenseBonus = defenseBonus;
        this._fireBonus = fireBonus;
    }

    getShockAttackCode() {
        return "Bow";
    }

    getShockDefendCode() {
        return this.getShockAttackCode();
    }

    getFireAttackCode() {
        return null;
    }

    getFireRange() {
        return 3;
    }

    getFireMalusSegmentSize() {
        return 1;
    }

    getAttackBonus() {
        return this._attackBonus;
    }

    getDefenseBonus() {
        return this._defenseBonus;
    }

    getFireBonus() {
        return this._fireBonus;
    }

    getFireDefendCode() {
        return this.getShockAttackCode();
    }
}

export class CBCommandProfile extends CBProfile {

    constructor(capacity = 0) {
        super(capacity);
    }

    get commandLevel() {
        return 8 + this._capacity;
    }

}

export class CBMoralProfile extends CBProfile {

    constructor(capacity = 0) {
        super(capacity);
    }

    get moral() {
        return 8 + this._capacity;
    }

    getAutoRally() {
        return false;
    }

    get autoRally() {
        return this.getAutoRally();
    }

}

export class CBMagicProfile extends CBProfile {

    constructor(art, capacity = 0) {
        super(capacity);
        this._art = art;
    }

    get art() {
        return this._art;
    }

}

export class CBUnitType {

    constructor(name, troopPaths) {
        this._name = name;
        this._troopPaths = troopPaths;
        this._stepsByFigure = 2;
        this._moveProfiles = [];
        this._weaponProfiles = [];
        this._commandProfiles = [];
        this._moralProfiles = [];
        CBUnitType._catalog.set(name, this);
    }

    getMoveProfile(steps) {
        return this._moveProfiles[steps];
    }

    setMoveProfile(steps, moveProfile) {
        this._moveProfiles[steps] = moveProfile;
        return this;
    }

    getWeaponProfile(steps) {
        return this._weaponProfiles[steps];
    }

    setWeaponProfile(steps, weaponProfile) {
        this._weaponProfiles[steps] = weaponProfile;
        return this;
    }

    getCommandProfile(steps) {
        return this._commandProfiles[steps];
    }

    setCommandProfile(steps, commandProfile) {
        this._commandProfiles[steps] = commandProfile;
        return this;
    }

    getMoralProfile(steps) {
        return this._moralProfiles[steps];
    }

    setMoralProfile(steps, moralProfile) {
        this._moralProfiles[steps] = moralProfile;
        return this;
    }

    get name() {
        return this._name;
    }

    getTroopPaths() {
        return this._troopPaths;
    }

    getMaxStepCount() {
        return this.getMaxFiguresCount() * this.getFigureStepCount();
    }

    getFigureStepCount() {
        return this._stepsByFigure;
    }

    getMovementPoints(steps) {
        return this.getMoveProfile(steps).movementPoints;
    }

    getExtendedMovementPoints(steps) {
        return this.getMoveProfile(steps).extendedMovementPoints;
    }

    getCommandLevel(steps) {
        return this.getCommandProfile(steps).commandLevel;
    }

    getMoral(steps) {
        return this.getMoralProfile(steps).moral;
    }

    static _catalog = new Map();

    static getType(name) {
        return CBUnitType._catalog.get(name);
    }
}

export class CBCharacterType extends CBUnitType {

    constructor(name, troopPaths) {
        super(name, troopPaths);
        this._magicProfiles = [];
    }

    getMagicProfile(steps) {
        return this._magicProfiles[steps];
    }

    setMagicProfile(steps, magicProfile) {
        this._magicProfiles[steps] = magicProfile;
        return this;
    }

    getMaxFiguresCount() {
        return 1;
    }

    createUnit(wing, steps= 2) {
        let unit = new CBCharacter(this, wing);
        unit.steps = steps;
        return unit;
    }

}

export class CBTroopType extends CBUnitType {

    constructor(name, troopPaths, formationPaths = []) {
        super(name, troopPaths);
        this._formationPaths = formationPaths;
    }

    getFormationPaths() {
        return this._formationPaths;
    }

    getFormationMinStepCount() {
        return 3;
    }

    getFormationMaxStepCount() {
        return this._stepsByFigure*this.getMaxFiguresCount();
    }

    getMaxFiguresCount() {
        return (this._formationPaths.length/this._stepsByFigure)+1;
    }

    createUnit(wing, steps = 2) {
        let unit = steps<=this.getFigureStepCount() ? new CBTroop(this, wing) : new CBFormation(this, wing);
        unit.steps = steps;
        return unit;
    }

}

export class CBWing {

    constructor(player, banner) {
        console.assert(banner.name);
        if (player) {
            player.addWing(this);
        }
        this._orderInstruction = CBOrderInstruction.DEFEND;
        this._retreatZone = [];
        this._moral = 11;
        this._tiredness = 11;
        this._banner = banner;
    }

    _memento() {
        let memento = {
            orderInstruction : this._orderInstruction,
            moral : this._moral,
            tiredness : this._tiredness
        }
        this._leader && (memento.leader = this._leader);
        return memento;
    }

    _revert(memento) {
        this._orderInstruction = memento.orderInstruction;
        this._moral = memento.moral;
        this._tiredness = memento.tiredness;
        if (memento.leader) {
            this._leader = memento.leader;
        }
        else {
            delete this._leader;
        }
    }

    get player() {
        return this._player;
    }

    set player(player) {
        this._player = player;
    }

    get leader() {
        return this._leader;
    }

    get banner() {
        return this._banner;
    }

    get retreatZone() {
        return this._retreatZone;
    }

    setRetreatZone(retreatZone) {
        this._retreatZone = retreatZone;
    }

    setLeader(character) {
        this._leader = character;
        this._leader.setOrderInstructionArtifact();
    }

    appointLeader(character) {
        Memento.register(this);
        this.setLeader(character);
    }

    dismissLeader() {
        Memento.register(this);
        let leader = this._leader;
        delete this._leader;
        leader && leader.updateOrderInstructionArtifact();
    }

    get orderInstruction() {
        return this._orderInstruction;
    }

    setOrderInstruction(orderInstruction) {
        console.assert(orderInstruction>=CBOrderInstruction.ATTACK && orderInstruction<=CBOrderInstruction.RETREAT);
        this._orderInstruction = orderInstruction;
        this._leader && this._leader.setOrderInstructionArtifact();
    }

    changeOrderInstruction(orderInstruction) {
        Memento.register(this);
        console.assert(orderInstruction>=CBOrderInstruction.ATTACK && orderInstruction<=CBOrderInstruction.RETREAT);
        this._orderInstruction = orderInstruction;
        this._leader && this._leader.updateOrderInstructionArtifact();
    }

    get moral() {
        return this._moral;
    }

    setMoral(moral) {
        console.assert(moral>=4 || moral<=11);
        this._moral = moral;
        Mechanisms.fire(this, CBWing.MORAL_EVENT, {wing:this, moral});
    }

    changeMoral(moral) {
        Memento.register(this);
        console.assert(moral>=4 || moral<=11);
        this._moral = moral;
        Mechanisms.fire(this, CBWing.MORAL_EVENT, {wing:this, moral});
    }

    get tiredness() {
        return this._tiredness;
    }

    setTiredness(tiredness) {
        console.assert(tiredness>=4 || tiredness<=11);
        this._tiredness = tiredness;
        Mechanisms.fire(this, CBWing.TIREDNESS_EVENT, {wing:this, tiredness});
    }

    changeTiredness(tiredness) {
        Memento.register(this);
        console.assert(tiredness>=4 || tiredness<=11);
        this._tiredness = tiredness;
        Mechanisms.fire(this, CBWing.TIREDNESS_EVENT, {wing:this, tiredness});
    }

    get playables() {
        let playables = [];
        for (let playable of this._player.playables) {
            if (playable.wing === this) playables.push(playable);
        }
        return playables;
    }

    hasUnitName(name) {
        return this.playables.find(unit=>unit.name===name)!==undefined;
    }

    getNextUnitName() {
        let number = 0;
        var unitNames = new Set(this.playables.map(unit=>unit.name));
        while(true) {
            let name = this._banner.name+"-"+number;
            if (unitNames.has(name)) number+=1;
            else return name;
        }
    }

    static MORAL_EVENT = "moral-event";
    static TIREDNESS_EVENT = "tiredness-event";
}

export function OptionArtifactMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        get slot() {
            return this.unit.slot;
        }

        get layer() {
            return this.unit.formationNature ? CBLevelBuilder.ULAYERS.FOPTIONS : CBLevelBuilder.ULAYERS.OPTIONS;
        }

    }

}

export function OptionMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        _memento() {
            let memento = super._memento();
            memento.owner = this._owner;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.owner) {
                this._owner = memento.owner;
            }
            else {
                delete this._owner;
            }
        }

        shift(owner, steps) {
            Memento.register(this);
            this._owner = owner;
            this.artifact.shift(new Point2D(-steps*20, -steps*20+10));
        }

        setPosition(owner, steps) {
            this._owner = owner
            this.artifact.position = new Point2D(-steps*20, -steps*20+10);
        }

        removeAsOption() {
            delete this._owner;
        }

        deleteAsOption() {
            Memento.register(this);
            delete this._owner;
        }

        get owner() {
            return this._owner;
        }

        isOption() {
            return true;
        }

    }

}

export function CarriableMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        _move(hexLocation) {
            Memento.register(this);
            this._deletePlayable(this._hexLocation);
            this._hexLocation = hexLocation;
            this._appendPlayable(hexLocation, CBStacking.TOP);
            this._element.move(hexLocation.location);
        }

        _rotate(angle) {
            Memento.register(this);
            this._element.rotate(angle);
        }

    }

}

export class CBMarkerArtifact extends RetractableArtifactMixin(CBPieceImageArtifact) {

    constructor(unit, images, position, dimension= CBMarkerArtifact.MARKER_DIMENSION) {
        super(unit, "units", images, position, dimension);
    }

    get unit() {
        return this.piece;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return this.unit.formationNature ? CBLevelBuilder.ULAYERS.FMARKERS : CBLevelBuilder.ULAYERS.MARKERS;
    }
}
CBMarkerArtifact.MARKER_DIMENSION = new Dimension2D(64, 64);

export class CBSimpleMarkerArtifact extends CBMarkerArtifact {

    constructor(unit, path, position, dimension = CBMarkerArtifact.MARKER_DIMENSION) {
        super(unit, [DImage.getImage(path)], position, dimension);
    }

}

export class CBActivableMarkerArtifact extends ActivableArtifactMixin(CBMarkerArtifact) {

    constructor(unit, paths, position, action, dimension= CBMarkerArtifact.MARKER_DIMENSION) {
        let images = [];
        for (let path of paths) {
            images.push(DImage.getImage(path));
        }
        super(unit, images, position, dimension);
        this._action = action;
    }

    onMouseClick(event) {
        this._action(this);
        return true;
    }

}

export class UnitImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(CBPieceImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this.piece;
    }

    get game() {
        return this.unit.game;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return CBLevelBuilder.ULAYERS.UNITS;
    }

}

export class CBUnit extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(CBPiece)))) {

    constructor(type, paths, wing, dimension=CBUnit.DIMENSION) {
        super("units", paths, dimension);
        this._carried = [];
        this._options = [];
        this._type = type;
        this._wing = wing;
        this._movementPoints=type.getMovementPoints(2);
        this._extendedMovementPoints=type.getExtendedMovementPoints(2);
        this._tiredness=CBTiredness.NONE;
        this._munitions=CBMunitions.NONE;
        this._cohesion=CBCohesion.GOOD_ORDER;
        this._engaging=false;
        this._charging=CBCharge.NONE;
        this._lossSteps = 0;
        this._orderGiven = false;
        this.artifact.setImage(this._lossSteps);
    }

    createArtifact(levelName, images, position, dimension) {
        return new UnitImageArtifact(this, levelName, images, position, dimension);
    }

    get unitNature() {
        return true;
    }

    get slot() {
        return this.hexLocation.units.indexOf(this);
    }

    copy(unit) {
        unit._movementPoints = this._movementPoints;
        unit._extendedMovementPoints = this._extendedMovementPoints;
        unit.lossSteps = this.lossSteps;
        unit.cohesion = this.cohesion;
        unit.munitions = this.munitions;
        unit.tiredness = this.tiredness;
    }

    _getPieces() {
        let counters = [];
        for (let carried of this._carried) {
            if (!carried.isOption || !carried.isOption()) {
                counters.push(carried);
            }
        }
        counters.push(...super._getPieces());
        counters.push(...this.options);
        return counters;
    }

    removeMarkerArtifact(marker) {
        this._element.removeArtifact(marker);
    }

    deleteMarkerArtifact(marker) {
        this._element.deleteArtifact(marker);
    }

    setMarkerArtifact(path, positionSlot) {
        let marker = new CBSimpleMarkerArtifact(this, path, CBUnit.MARKERS_POSITION[positionSlot]);
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, positionSlot) {
        let marker = new CBSimpleMarkerArtifact(this, path, CBUnit.MARKERS_POSITION[positionSlot]);
        this._element.appendArtifact(marker);
        return marker;
    }

    setActivableMarkerArtifact(paths, action, positionSlot) {
        let marker = new CBActivableMarkerArtifact(this, paths, CBUnit.MARKERS_POSITION[positionSlot], action);
        this._element.addArtifact(marker);
        return marker;
    }

    createActivableMarkerArtifact(paths, action, positionSlot) {
        let marker = new CBActivableMarkerArtifact(this, paths, CBUnit.MARKERS_POSITION[positionSlot], action);
        this._element.appendArtifact(marker);
        return marker;
    }

    _setLocation(location) {
        super._setLocation(location);
        for (let carried of this._carried) {
            carried.location = this.location;
        }
    }

    _setAngle(angle) {
        super._setAngle(angle);
        for (let carried of this._carried) {
            carried.angle = this.angle;
        }
    }

    _memento() {
        return {
            ...super._memento(),
            movementPoints: this._movementPoints,
            extendedMovementPoints: this._extendedMovementPoints,
            tiredness: this._tiredness,
            tirednessArtifact: this._tirednessArtifact,
            munitions: this._munitions,
            munitionsArtifact: this._munitionsArtifact,
            cohesion: this._cohesion,
            cohesionArtifact: this._cohesionArtifact,
            playedArtifact: this._playedArtifact,
            engaging: this._engaging,
            charging: this._charging,
            engagingArtifact: this._engagingArtifact,
            orderGiven: this._orderGiven,
            lossSteps: this._lossSteps,
            carried: [...this._carried],
            options: [...this._options]
        };
    }

    _revert(memento) {
        super._revert(memento);
        this._movementPoints = memento.movementPoints;
        this._extendedMovementPoints = memento.extendedMovementPoints;
        this._tiredness = memento.tiredness;
        this._tirednessArtifact = memento.tirednessArtifact;
        this._munitions = memento.munitions;
        this._munitionsArtifact = memento.munitionsArtifact;
        this._cohesion = memento.cohesion;
        this._cohesionArtifact = memento.cohesionArtifact;
        this._playedArtifact = memento.playedArtifact;
        this._engaging = memento.engaging;
        this._charging = memento.charging;
        this._engagingArtifact = memento.engagingArtifact;
        this._orderGiven = memento.orderGiven;
        this._lossSteps = memento.lossSteps;
        this._carried = memento.carried;
        this._options = memento.options;
    }

    addToMap(hexId, stacking) {
        let nameMustBeDefined = !this._name || this._wing.hasUnitName(this._name);
        super.addToMap(hexId, stacking);
        if (nameMustBeDefined) this._name = this._wing.getNextUnitName();
        for (let carried of this._carried) {
            carried.addToMap(hexId, stacking);
        }
    }

    removeFromMap() {
        super.removeFromMap();
        delete this._name;
        for (let carried of this._carried) {
            carried.removeFromMap();
        }
    }

    appendToMap(hexId, stacking) {
        let nameMustBeDefined = !this._name || this._wing.hasUnitName(this._name);
        super.appendToMap(hexId, stacking);
        if (nameMustBeDefined) this._name = this._wing.getNextUnitName();
        for (let carried of this._carried) {
            carried.appendToMap(hexId, stacking);
        }
    }

    deleteFromMap() {
        super.deleteFromMap();
        delete this._name;
        for (let carried of this._carried) {
            carried.deleteFromMap();
        }
    }

    addCarried(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        this._carried.push(piece);
        piece.angle = this.angle;
        piece.location = this.location;
        if (this.isShown()) piece.addToMap(this.hexLocation);
    }

    removeCarried(piece) {
        this._carried.remove(piece);
        if (this.isShown()) piece.removeFromMap();
    }

    carry(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        Memento.register(this);
        this._carried.push(piece);
        piece._rotate(this.angle);
        if (this.isShown()) {
            piece.appendToMap(this.hexLocation);
        }
    }

    drop(piece) {
        console.assert(this._carried.contains(piece));
        Memento.register(this);
        this._carried.remove(piece);
        if (this.isShown()) {
            piece.deleteFromMap();
        }
    }

    addOption(piece) {
        console.assert(this._options.indexOf(piece)===-1);
        this.addCarried(piece);
        this._options.push(piece);
        piece.setPosition(this, this._options.length);
    }

    removeOption(piece) {
        this.removeCarried(piece);
        let indexPiece = this._options.remove(piece);
        for (let index = indexPiece; index<this._options.length; index++) {
            this._options[index].setPosition(this, index+1);
        }
        piece.removeAsOption();
    }

    appendOption(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        Memento.register(this);
        this.carry(piece);
        this._options.push(piece);
        piece.shift(this, this._options.length);
    }

    deleteOption(piece) {
        console.assert(this._options.contains(piece));
        Memento.register(this);
        this.drop(piece);
        let indexPiece = this._options.remove(piece, 1);
        for (let index = indexPiece; index<this._options.length; index++) {
            this._options[index].shift(this, index+1);
        }
        piece.deleteAsOption();
    }

    unselect() {
        super.unselect();
        if (this.isActivated()) {
            this.setPlayed();
        }
    }

    init() {
        this._movementPoints=this._type.getMovementPoints(this.steps);
        this._extendedMovementPoints=this._type.getExtendedMovementPoints(this.steps);
    }

    get carried() {
        return this._carried;
    }

    get name() {
        return this._name;
    }

    get type() {
        return this._type;
    }

    get wing() {
        return this._wing;
    }

    get player() {
        return this._wing.player;
    }

    get nominalMovementPoints() {
        return this._type.getMovementPoints(this.steps);
    }

    get movementPoints() {
        return this._movementPoints;
    }

    set movementPoints(movementPoints) {
        this._movementPoints = movementPoints;
    }

    get extendedMovementPoints() {
        return this._extendedMovementPoints;
    }

    set extendedMovementPoints(extendedMovementPoints) {
        this._extendedMovementPoints = extendedMovementPoints;
    }

    get options() {
        return this._options;
    }

    receivesOrder(order) {
        console.assert(order===true || order===false);
        Memento.register(this);
        this._orderGiven = order;
        this._updatePlayedArtifact(this.createMarkerArtifact, this.deleteMarkerArtifact);
    }

    hasReceivedOrder() {
        return this._orderGiven;
    }

    reactivate() {
        super.reactivate();
        this._orderGiven = false;
        this._updatePlayedArtifact(this.deleteMarkerArtifact, this.removeMarkerArtifact);
    }

    _updatePlayed() {
        this._updatePlayedArtifact(this.createMarkerArtifact, this.deleteMarkerArtifact);
    }

    _updateMovementPoints(cost) {
        if (cost.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) {
            this._movementPoints = 0;
            this._extendedMovementPoints = 0;
        }
        else {
            this._movementPoints -= cost.value;
            this._extendedMovementPoints -= cost.value;
        }
    }

    get maxStepCount() {
        return this._type.getFigureStepCount();
    }

    get lossSteps() {
        return this._lossSteps;
    }

    get steps() {
        return this.maxStepCount - this.lossSteps;
    }

    set steps(steps) {
        this.lossSteps = this.maxStepCount - steps;
    }

    set lossSteps(lossSteps) {
        this._lossSteps = lossSteps;
        this.artifact.setImage(this._lossSteps);
    }

    destroy() {
        super.destroy();
        this._cohesion = CBCohesion.DESTROYED;
    }

    takeALoss() {
        if (this._lossSteps <= this.maxStepCount) {
            Memento.register(this);
            this._lossSteps++;
            if (this._lossSteps === this.maxStepCount) {
                this.destroy();
            } else {
                this.artifact.changeImage(this._lossSteps);
            }
        }
    }

    fixRemainingLossSteps(stepCount) {
        console.assert(stepCount<=this.maxStepCount);
        Memento.register(this);
        this._lossSteps=this.maxStepCount-stepCount;
        this.artifact.changeImage(this._lossSteps);
    }

    _changeLocation(hexLocation, stacking) {
        Memento.register(this);
        this._hexLocation._deletePlayable(this);
        this._hexLocation = hexLocation;
        stacking===CBStacking.BOTTOM ? hexLocation._appendPlayableOnBottom(this) : hexLocation._appendPlayableOnTop(this);
        this._element.move(hexLocation.location);
        for (let carried of this._carried) {
            carried._move(hexLocation);
        }
    }

    _move(hexLocation, stacking) {
        if ((hexLocation || this.hexLocation) && (hexLocation !== this.hexLocation)) {
            if (this.hexLocation && !hexLocation) {
                this.deleteFromMap()
            } else if (!this.hexLocation && hexLocation) {
                this.appendToMap(hexLocation, stacking);
            } else {
                this._changeLocation(hexLocation, stacking);
            }
        }
    }

    move(hexLocation, cost=null, stacking = CBStacking.TOP) {
        this._move(hexLocation, stacking);
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    retreat(hexLocation, stacking) {
        this._changeLocation(hexLocation, stacking);
        this.addOneCohesionLevel();
        this.setEngaging(false);
    }

    advance(hexLocation) {
        this._changeLocation(hexLocation, CBStacking.BOTTOM);
    }

    _rotate(angle) {
        this._element.rotate(angle);
        for (let carried of this._carried) {
            carried._rotate(angle);
        }
    }

    reorient(angle) {
        Memento.register(this);
        this._rotate(angle);
    }

    rotate(angle, cost=null) {
        this.reorient(angle);
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    _updateTiredness(tiredness) {
        Memento.register(this);
        console.assert(tiredness===CBTiredness.NONE
            || tiredness===CBTiredness.TIRED
            || tiredness===CBTiredness.EXHAUSTED);
        this._tiredness = tiredness;
        this._updateTirednessArtifact(this.createMarkerArtifact, this.deleteMarkerArtifact);
    }

    set tiredness(tiredness) {
        this._tiredness = tiredness;
        this._updateTirednessArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
    }

    get tiredness() {
        return this._tiredness;
    }

    isTired() {
        return this._tiredness === CBTiredness.TIRED;
    }

    isExhausted() {
        return this._tiredness === CBTiredness.EXHAUSTED;
    }

    addOneTirednessLevel() {
        this._updateTiredness(this._tiredness+1);
    }

    removeOneTirednessLevel() {
        this._updateTiredness(this._tiredness-1);
    }

    setTiredness(tirednessLevel) {
        Memento.register(this);
        this._updateTiredness(tirednessLevel);
    }

    _updateMunitions(munitions) {
        Memento.register(this);
        console.assert(munitions===CBMunitions.NONE
            || munitions===CBMunitions.SCARCE
            || munitions===CBMunitions.EXHAUSTED);
        this._munitions = munitions;
        this._updateMunitionsArtifact(this.createMarkerArtifact, this.deleteMarkerArtifact);
    }

    set munitions(munitions) {
        this._munitions = munitions;
        this._updateMunitionsArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
    }

    get munitions() {
        return this._munitions;
    }

    areMunitionsScarce() {
        return this._munitions === CBMunitions.SCARCE;
    }

    areMunitionsExhausted() {
        return this._munitions === CBMunitions.EXHAUSTED;
    }

    addOneMunitionsLevel() {
        this._updateMunitions(this._munitions+1);
    }

    replenishMunitions() {
        this._updateMunitions(0);
    }

    setMunitions(munitions) {
        this._updateMunitions(munitions);
    }

    get commandLevel() {
        return this.commandProfile.commandLevel;
    }

    get moral() {
        return this.moralProfile.moral - (this._cohesion === CBCohesion.GOOD_ORDER?0:1);
    }

    _updateCohesion(cohesion) {
        Memento.register(this);
        console.assert(cohesion===CBCohesion.ROUTED
            || cohesion===CBCohesion.DISRUPTED
            || cohesion===CBCohesion.GOOD_ORDER
            || cohesion===CBCohesion.DESTROYED);
        this._cohesion = cohesion;
        this._updateCohesionArtifact(this.createMarkerArtifact, this.deleteMarkerArtifact);
    }

    set cohesion(cohesion) {
        this._cohesion = cohesion;
        this._updateCohesionArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
    }

    get cohesion() {
        return this._cohesion;
    }

    isInGoodOrder() {
        return this._cohesion === CBCohesion.GOOD_ORDER;
    }

    isDisrupted() {
        return this._cohesion === CBCohesion.DISRUPTED;
    }

    isRouted() {
        return this._cohesion === CBCohesion.ROUTED;
    }

    isDestroyed() {
        return this._cohesion === CBCohesion.DESTROYED;
    }

    addOneCohesionLevel() {
        this.setCohesion(this._cohesion + 1);
    }

    setCohesion(cohesion) {
        Memento.register(this);
        if (cohesion === CBCohesion.DESTROYED) {
            this.destroy();
        }
        else {
            this._updateCohesion(cohesion);
        }
        if (cohesion !== CBCohesion.GOOD_ORDER) {
            this.setCharging(CBCharge.NONE);
        }
    }

    disrupt() {
        console.assert(!this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.DISRUPTED);
    }

    rout() {
        console.assert(!this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.ROUTED);
    }

    reorganize() {
        console.assert(this.isDisrupted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.GOOD_ORDER);
    }

    rally() {
        console.assert(this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.DISRUPTED);
    }

    _updateEngagement(engaged, charging) {
        Memento.register(this);
        if(this._engaging !== engaged || this._charging !== charging) {
            if (this._charging === CBCharge.CHARGING && charging === CBCharge.NONE) {
                this.addOneTirednessLevel();
            }
            this._engaging = engaged;
            this._charging = charging;
            this._updateEngagementArtifact(this.createMarkerArtifact, this.createActivableMarkerArtifact, this.deleteMarkerArtifact);
        }
    }

    isEngaging() {
        return this._engaging;
    }

    get charge() {
        return this._charging;
    }

    isCharging() {
        return this._charging === CBCharge.CHARGING;
    }

    checkEngagement(engaging, mayCharge) {
        Memento.register(this);
        let charging = this._charging;
        if (mayCharge) {
            if (charging === CBCharge.NONE) charging = CBCharge.BEGIN_CHARGE;
            else if (charging === CBCharge.BEGIN_CHARGE) charging = CBCharge.CAN_CHARGE;
        }
        else charging = CBCharge.NONE;
        this._updateEngagement(engaging, charging);
    }

    setEngaging(engaging) {
        this._updateEngagement(engaging, this._charging);
    }

    setCharging(charging) {
        this._updateEngagement(this._engaging, charging);
    }

    acknowledgeCharge(moveEnd = false) {
        if (this._charging === CBCharge.CAN_CHARGE) {
            if (this._engagingArtifact.imageIndex === 1) {
                this.setCharging(CBCharge.CHARGING);
            }
            else if (moveEnd) {
                this.setCharging(CBCharge.NONE);
            }
        }
    }

    _getAllArtifacts() {
        let artifacts = super._getAllArtifacts();
        this._cohesionArtifact && artifacts.push(this._cohesionArtifact);
        this._engagingArtifact && artifacts.push(this._engagingArtifact);
        this._munitionsArtifact && artifacts.push(this._munitionsArtifact);
        this._tirednessArtifact && artifacts.push(this._tirednessArtifact);
        this._playedArtifact && artifacts.push(this._playedArtifact);
        return artifacts;
    }

    get moveProfile() {
        return this._type.getMoveProfile(this.steps);
    }

    get weaponProfile() {
        return this._type.getWeaponProfile(this.steps);
    }

    get commandProfile() {
        return this._type.getCommandProfile(this.steps);
    }

    get moralProfile() {
        return this._type.getMoralProfile(this.steps);
    }

    static DIMENSION = new Dimension2D(142, 142);
    static MARKERS_POSITION = [
        new Point2D(CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
        new Point2D(-CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
        new Point2D(-CBUnit.DIMENSION.w/2, 0),
        new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
        new Point2D(0, CBUnit.DIMENSION.h/2),
        new Point2D(CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
        new Point2D(CBUnit.DIMENSION.w/2, 0)
    ];

    setState(state) {
        this._cohesion = state.cohesion;
        this._tiredness = state.tiredness;
        this._munitions = state.munitions;
        this._charging = state.charging;
        this._engaging = state.engaging;
        this._orderGiven = state.orderGiven;
        this.played = state.played;
        this._updateTirednessArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
        this._updateMunitionsArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
        this._updatePlayedArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
        this._updateEngagementArtifact(this.setMarkerArtifact, this.setActivableMarkerArtifact, this.removeMarkerArtifact);
        this._updateCohesionArtifact(this.setMarkerArtifact, this.removeMarkerArtifact);
    }

    _updateTirednessArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._tirednessArtifact && removeMarkerArtifact.call(this, this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = setMarkerArtifact.call(this, "./../images/markers/tired.png", 2);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = setMarkerArtifact.call(this, "./../images/markers/exhausted.png", 2);
        }
    }

    _updateMunitionsArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._munitionsArtifact && removeMarkerArtifact.call(this, this._munitionsArtifact);
        delete this._munitionsArtifact;
        if (this._munitions === CBMunitions.SCARCE) {
            this._munitionsArtifact = setMarkerArtifact.call(this, "./../images/markers/scarceamno.png", 4);
        }
        else if (this._munitions === CBMunitions.EXHAUSTED) {
            this._munitionsArtifact = setMarkerArtifact.call(this, "./../images/markers/lowamno.png", 4);
        }
    }

    _updatePlayedArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._playedArtifact && removeMarkerArtifact.call(this, this._playedArtifact);
        delete this._playedArtifact;
        if (this.isPlayed()) {
            this._playedArtifact = setMarkerArtifact.call(this, "./../images/markers/actiondone.png", 0);
        }
        else if (this._orderGiven) {
            this._playedArtifact = setMarkerArtifact.call(this, "./../images/markers/ordergiven.png", 0);
        }
    }

    _updateEngagementArtifact(setMarkerArtifact, setActivableMarkerArtifact, removeMarkerArtifact) {
        this._engagingArtifact && removeMarkerArtifact.call(this, this._engagingArtifact);
        delete this._engagingArtifact;
        if (this._charging === CBCharge.CHARGING) {
            this._engagingArtifact = setMarkerArtifact.call(this, "./../images/markers/charge.png", 1);
        }
        else if (this._charging === CBCharge.CAN_CHARGE) {
            this._engagingArtifact = setActivableMarkerArtifact.call(this, [
                "./../images/markers/possible-charge.png", "./../images/markers/charge.png"
            ], marker=>{
                marker.setImage((marker.imageIndex+1)%2);
            }, 1);
        }
        else if (this._engaging) {
            this._engagingArtifact = setMarkerArtifact.call(this, "./../images/markers/contact.png", 1);
        }
    }

    _updateCohesionArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._cohesionArtifact && removeMarkerArtifact.call(this, this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = setMarkerArtifact.call(this, "./../images/markers/disrupted.png", 3);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = setMarkerArtifact.call(this, "./../images/markers/fleeing.png", 3);
        }
    }

}

Object.defineProperty(CBHexLocation.prototype, "units", {
    get: function() {
        return this.playables.filter(playable=>playable.unitNature);
    }
});
Object.defineProperty(CBHexLocation.prototype, "empty", {
    get: function() {
        return this.units.length===0;
    }
});
Object.defineProperty(CBGame.prototype, "units", {
    get: function() {
        let units = [];
        if (this._playables) {
            for (let playable of this._playables) {
                if (playable.unitNature) {
                    units.push(playable);
                }
            }
        }
        return units;
    }
});

export class CBTroop extends CBUnit {

    constructor(type, wing) {
        super(type, type.getTroopPaths(), wing);
    }

    clone() {
        let copy = new CBTroop(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    get troopNature() {
        return true;
    }

}

export class FormationImageArtifact extends UnitImageArtifact {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get layer() {
        return CBLevelBuilder.ULAYERS.FORMATIONS;
    }

}

export class CBFormation extends CBUnit {

    constructor(type, wing) {
        super(type, type.getFormationPaths(), wing, CBFormation.DIMENSION);
    }

    get troopNature() {
        return true;
    }

    createArtifact(levelName, images, position, dimension) {
        return new FormationImageArtifact(this, levelName, images, position, dimension);
    }

    clone() {
        let copy = new CBFormation(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    get maxStepCount() {
        return this._type.getFormationMaxStepCount();
    }

    get formationNature() {
        return true;
    }

    get slot() {
        let slot1 = this.hexLocation.fromHex.units.indexOf(this);
        let slot2 = this.hexLocation.toHex.units.indexOf(this);
        return slot1>slot2 ? slot1 : slot2;
    }

    setMarkerArtifact(path, positionSlot) {
        let marker = new CBSimpleMarkerArtifact(this, path, CBFormation.MARKERS_POSITION[positionSlot]);
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, positionSlot) {
        let marker = new CBSimpleMarkerArtifact(this, path, CBFormation.MARKERS_POSITION[positionSlot]);
        this._element.appendArtifact(marker);
        return marker;
    }

    get minStepCount() {
        return this.type.getFormationMinStepCount();
    }

    getTurnOrientation(angle) {
        let delta = diffAngle(this.angle, angle)*2;
        return sumAngle(this.angle, delta);
    }

    turn(angle, cost=null, stacking = CBStacking.TOP) {
        this.move(this.hexLocation.turnTo(angle), cost, stacking);
        this.reorient(this.getTurnOrientation(angle));
    }

    takeALoss() {
        if (this.steps <= this.minStepCount) {
            let {fromHex, toHex} = this.game.arbitrator.getTroopsAfterFormationBreak(this);
            this.breakFormation(fromHex, toHex)
        }
        else {
            super.takeALoss();
        }
    }

    breakFormation(replacementOnFromHex, replacementOnToHex) {
        let hexLocation = this.hexLocation;
        let game = this.game;
        this.deleteFromMap();
        this.move(null, 0);
        for (let replacement of replacementOnFromHex) {
            replacement.appendToMap(hexLocation.fromHex, CBStacking.TOP);
        }
        for (let replacement of replacementOnToHex) {
            replacement.appendToMap(hexLocation.toHex, CBStacking.TOP);
        }
    }

    static DIMENSION = new Dimension2D(CBUnit.DIMENSION.w*2, CBUnit.DIMENSION.h);
    static MARKERS_POSITION = [
        new Point2D(CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
        new Point2D(-CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
        new Point2D(-CBFormation.DIMENSION.w/2, 0),
        new Point2D(-CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
        new Point2D(0, CBFormation.DIMENSION.h/2),
        new Point2D(CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
        new Point2D(CBFormation.DIMENSION.w/2, 0)];
}

export class CBCharacter extends CBUnit {

    constructor(type, wing) {
        super(type, type.getTroopPaths(), wing, CBCharacter.DIMENSION);
        this._commandPoints = 0;
    }

    clone() {
        let copy = new CBCharacter(this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    get characterNature() {
        return true;
    }

    _memento() {
        let memento = super._memento();
        memento.commandPoints = this._commandPoints;
        memento.orderInstructionArtifact = this._orderInstructionArtifact;
        memento.chosenSpell = this._chosenSpell;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._commandPoints =  memento.commandPoints;
        this._orderInstructionArtifact = memento.orderInstructionArtifact;
        this._chosenSpell = memento.chosenSpell;
    }

    get commandPoints() {
        return this._commandPoints;
    }

    receiveCommandPoints(commandPoints) {
        Memento.register(this);
        this._commandPoints = commandPoints;
    }

    createOrderInstructionArtifact(orderInstruction) {
        let marker = new CBSimpleMarkerArtifact(this, CBCharacter.ORDER_INSTRUCTION_PATHS[orderInstruction],
            CBUnit.MARKERS_POSITION[6], CBCharacter.ORDER_INSTRUCTION_DIMENSION);
        return marker;
    }

    setOrderInstructionArtifact() {
        if (this._wing.leader === this) {
            this._orderInstructionArtifact = this.createOrderInstructionArtifact(this._wing.orderInstruction);
            this._element.addArtifact(this._orderInstructionArtifact);
        }
    }

    updateOrderInstructionArtifact() {
        Memento.register(this);
        this._orderInstructionArtifact && this._element.deleteArtifact(this._orderInstructionArtifact);
        delete this._orderInstructionArtifact;
        if (this._wing.leader === this) {
            this._orderInstructionArtifact = this.createOrderInstructionArtifact(this._wing.orderInstruction);
            this._element.appendArtifact(this._orderInstructionArtifact);
        }
    }

    choseSpell(spellDefinition) {
        Memento.register(this);
        if (this._chosenSpell) this.forgetSpell();
        this._chosenSpell = spellDefinition.createSpellCounter(this);
        this.carry(this._chosenSpell);
    }

    forgetSpell() {
        console.assert(this._chosenSpell);
        Memento.register(this);
        this.drop(this._chosenSpell);
        delete this._chosenSpell;
    }

    get chosenSpell() {
        return this._chosenSpell;
    }

    hasChosenSpell() {
        return !!this.chosenSpell;
    }

    takeCommand() {
        this.wing.appointLeader(this);
    }

    dismissCommand() {
        this.wing.dismissLeader();
    }

    reset() {
        super.reset();
        this._commandPoints = 0;
    }

    get magicProfile() {
        return this.type.getMagicProfile(this.steps);
    }

    get magicArt() {
        return this.magicProfile ? this.magicProfile.art : null;
    }

    _getAllArtifacts() {
        let artifacts = super._getAllArtifacts();
        this._orderInstructionArtifact && artifacts.push(this._orderInstructionArtifact);
        return artifacts;
    }

    static DIMENSION = new Dimension2D(120, 120);
    static ORDER_INSTRUCTION_DIMENSION = new Dimension2D(80, 80);
    static ORDER_INSTRUCTION_PATHS = [
        "./../images/markers/attack.png",
        "./../images/markers/defend.png",
        "./../images/markers/regroup.png",
        "./../images/markers/retreat.png"
    ];
}
