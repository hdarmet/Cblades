'use strict'

import {
    Point2D, Dimension2D, diffAngle, sumAngle
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBMoveType
} from "./map.js";
import {
    CBCounterImageArtifact, CBAbstractUnit, CBGame, RetractableArtifactMixin, UnitImageArtifact, CBActivableMixin
} from "./game.js";

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

export let CBLackOfMunitions = {
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

export let CBWeather = {
    HOT : 1,
    CLEAR : 2,
    CLOUDY : 3,
    OVERCAST : 4,
    RAIN : 5,
    STORM : 6
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

export class CBUnitType {

    constructor(name, troopPaths, formationPaths) {
        this._name = name;
        this._troopPaths = troopPaths;
        this._formationPaths = formationPaths;
        this._maxStepCount = 2;
        this._moveProfiles = [];
        this._weaponProfiles = [];
        this._commandProfiles = [];
        this._moralProfiles = [];
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

    getFormationPaths() {
        return this._formationPaths;
    }

    getTroopMaxStepCount() {
        return this._maxStepCount;
    }

    getFormationMinStepCount() {
        return 3;
    }

    getFormationMaxStepCount() {
        return this._maxStepCount*this.getMaxFiguresCount();
    }

    getMaxFiguresCount() {
        return (this._formationPaths.length/this._maxStepCount)+1;
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
}

export class CBWing {

    constructor(player) {
        this._player = player;
        this._orderInstruction = CBOrderInstruction.DEFEND;
        this._retreatZone = [];
    }

    _memento() {
        let memento = {
            orderInstruction : this._orderInstruction
        }
        this._leader && (memento.leader = this._leader);
        return memento;
    }

    _revert(memento) {
        this._orderInstruction = memento.orderInstruction;
        if (memento.leader) {
            this._leader = memento.leader
        }
        else {
            delete this._leader;
        }
    }

    get player() {
        return this._player;
    }

    get leader() {
        return this._leader;
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
            return this.unit.formationNature ? CBGame.ULAYERS.FOPTIONS : CBGame.ULAYERS.OPTIONS;
        }

    }

}

export function OptionMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        shift(steps) {
            this.artifact.shift(new Point2D(-steps*20, -steps*20+10));
        }

        setPosition(steps) {
            this.artifact.position = new Point2D(-steps*20, -steps*20+10);
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
            this._appendPlayable(hexLocation);
            this._element.move(hexLocation.location);
        }

        _rotate(angle) {
            Memento.register(this);
            this._element.rotate(angle);
        }

    }

}

export class CBMarkerArtifact extends RetractableArtifactMixin(CBCounterImageArtifact) {

    constructor(unit, images, position, dimension= CBMarkerArtifact.MARKER_DIMENSION) {
        super(unit, "units", images, position, dimension);
    }

    get unit() {
        return this.counter;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return this.unit.formationNature ? CBGame.ULAYERS.FMARKERS : CBGame.ULAYERS.MARKERS;
    }
}
CBMarkerArtifact.MARKER_DIMENSION = new Dimension2D(64, 64);

export class CBSimpleMarkerArtifact extends CBMarkerArtifact {

    constructor(unit, path, position, dimension = CBMarkerArtifact.MARKER_DIMENSION) {
        super(unit, [DImage.getImage(path)], position, dimension);
    }

}

export class CBActivableMarkerArtifact extends CBActivableMixin(CBMarkerArtifact) {

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

export class CBUnit extends CBAbstractUnit {

    constructor(type, paths, wing, dimension=CBUnit.DIMENSION) {
        super(paths, dimension);
        this._carried = [];
        this._options = [];
        this._type = type;
        this._wing = wing;
        this._movementPoints=type.getMovementPoints(2);
        this._extendedMovementPoints=type.getExtendedMovementPoints(2);
        this._tiredness=0;
        this._lackOfMunitions=0;
        this._cohesion=0;
        this._engaging=false;
        this._charging=CBCharge.NONE;
        this._lossSteps = 0;
        this._orderGiven = false;
        this.artifact.setImage(this._lossSteps);
    }

    copy(unit) {
        unit._movementPoints = this._movementPoints;
        unit._extendedMovementPoints = this._extendedMovementPoints;
        unit.lossSteps = this.lossSteps;
        unit.cohesion = this.cohesion;
        unit.lackOfMunitions = this.lackOfMunitions;
        unit.tiredness = this.tiredness;
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
            lackOfMunitions: this._lackOfMunitions,
            lackOfMunitionsArtifact: this._lackOfMunitionsArtifact,
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
        this._lackOfMunitions = memento.lackOfMunitions;
        this._lackOfMunitionsArtifact = memento.lackOfMunitionsArtifact;
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

    addToMap(hexId, moveType) {
        super.addToMap(hexId, moveType);
        for (let carried of this._carried) {
            carried.addToMap(hexId, moveType);
        }
    }

    removeFromMap() {
        super.removeFromMap();
        for (let carried of this._carried) {
            carried.removeFromMap();
        }
    }

    appendToMap(hexId, moveType) {
        super.appendToMap(hexId, moveType);
        for (let carried of this._carried) {
            carried.appendToMap(hexId, moveType);
        }
    }

    deleteFromMap() {
        super.deleteFromMap();
        for (let carried of this._carried) {
            carried.deleteFromMap();
        }
    }

    addCarried(counter) {
        console.assert(this._carried.indexOf(counter)===-1);
        this._carried.push(counter);
        counter.angle = this.angle;
        counter.location = this.location;
        if (this.isShown()) counter.addToMap(this.hexLocation);
    }

    removeCarried(counter) {
        let indexCounter = this._carried.indexOf(counter);
        this._carried.splice(indexCounter, 1);
        if (this.isShown()) counter.removeFromMap();
    }

    carry(counter) {
        console.assert(this._carried.indexOf(counter)===-1);
        Memento.register(this);
        this._carried.push(counter);
        counter._rotate(this.angle);
        if (this.isShown()) {
            counter.appendToMap(this.hexLocation);
        }
    }

    drop(counter) {
        let indexCounter = this._carried.indexOf(counter);
        console.assert(indexCounter>=0);
        Memento.register(this);
        this._carried.splice(indexCounter, 1);
        if (this.isShown()) {
            counter.deleteFromMap();
        }
    }

    addOption(counter) {
        console.assert(this._options.indexOf(counter)===-1);
        this.addCarried(counter);
        this._options.push(counter);
        counter.setPosition(this._options.length);
    }

    removeOption(counter) {
        let indexCounter = this._options.indexOf(counter);
        this.removeCarried(counter);
        this._options.splice(indexCounter, 1);
        for (let index = indexCounter; index<this._options.length; index++) {
            this._options[index].setPosition(index+1);
        }
    }

    appendOption(counter) {
        console.assert(this._carried.indexOf(counter)===-1);
        Memento.register(this);
        this.carry(counter);
        this._options.push(counter);
        counter.shift(this._options.length);
    }

    deleteOption(counter) {
        let indexCounter = this._options.indexOf(counter);
        console.assert(indexCounter>=0);
        Memento.register(this);
        this.drop(counter);
        this._options.splice(indexCounter, 1);
        for (let index = indexCounter; index<this._options.length; index++) {
            this._options[index].shift(index+1);
        }
    }

    unselect() {
        super.unselect();
        if (this.hasBeenActivated()) {
            this.markAsBeingPlayed();
        }
    }

    init(player) {
        super.init(player);
        if (player === this.player) {
            this._movementPoints=this._type.getMovementPoints(this.remainingStepCount);
            this._extendedMovementPoints=this._type.getExtendedMovementPoints(this.remainingStepCount);
        }
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            this._orderGiven = false;
            this._updatePlayed();
        }
    }

    get carried() {
        return this._carried;
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

    _getCounters() {
        let counters = [];
        for (let carried of this._carried) {
            if (!carried.isOption || !carried.isOption()) {
                counters.push(carried);
            }
        }
        counters.push(...super._getCounters());
        counters.push(...this.options);
        return counters;
    }

    receivesOrder(order) {
        Memento.register(this);
        this._orderGiven = order;
        this._updatePlayed();
    }

    hasReceivedOrder() {
        return this._orderGiven;
    }

    updatePlayed() {
        Memento.register(this);
        this._updatePlayed();
    }

    _updatePlayed() {
        this._playedArtifact && this._element.deleteArtifact(this._playedArtifact);
        delete this._playedArtifact;
        if (this.hasBeenPlayed()) {
            this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/actiondone.png", 0);
        }
        else if (this._orderGiven) {
            this._playedArtifact = this.createMarkerArtifact("/CBlades/images/markers/ordergiven.png", 0);
        }
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
        return this._type.getTroopMaxStepCount();
    }

    get lossSteps() {
        return this._lossSteps;
    }

    get remainingStepCount() {
        return this.maxStepCount - this.lossSteps;
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
        Memento.register(this);
        this._lossSteps++;
        if (this._lossSteps >= this.maxStepCount) {
            this.destroy();
        }
        else {
            this.artifact.changeImage(this._lossSteps);
        }
    }

    fixRemainingLossSteps(stepCount) {
        console.assert(stepCount<=this.maxStepCount);
        Memento.register(this);
        this._lossSteps=this.maxStepCount-stepCount;
        this.artifact.changeImage(this._lossSteps);
    }

    _changeLocation(hexLocation, moveType) {
        Memento.register(this);
        this._hexLocation._deleteUnit(this);
        this._hexLocation = hexLocation;
        hexLocation._appendUnit(this, moveType);
        this._element.move(hexLocation.location);
        for (let carried of this._carried) {
            carried._move(hexLocation);
        }
    }

    move(hexLocation, cost=null, moveType = CBMoveType.BACKWARD) {
        if ((hexLocation || this.hexLocation) && (hexLocation !== this.hexLocation)) {
            if (this.hexLocation && !hexLocation) {
                this.deleteFromMap()
            } else if (!this.hexLocation && hexLocation) {
                this.appendToMap(hexLocation, moveType);
            } else {
                this._changeLocation(hexLocation, moveType);
            }
        }
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    retreat(hexLocation, moveType) {
        this._changeLocation(hexLocation, moveType);
        this.addOneCohesionLevel();
        this.markAsEngaging(false);
    }

    advance(hexLocation) {
        this._changeLocation(hexLocation, CBMoveType.FORWARD);
    }

    reorient(angle) {
        Memento.register(this);
        this._element.rotate(angle);
        for (let carried of this._carried) {
            carried._rotate(angle);
        }
    }

    rotate(angle, cost=null) {
        this.reorient(angle);
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    _updateTiredness(tiredness) {
        console.assert(tiredness===CBTiredness.NONE
            || tiredness===CBTiredness.TIRED
            || tiredness===CBTiredness.EXHAUSTED);
        this._tiredness = tiredness;
        this._tirednessArtifact && this._element.deleteArtifact(this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/tired.png", 2);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = this.createMarkerArtifact("/CBlades/images/markers/exhausted.png", 2);
        }
    }

    set tiredness(tiredness) {
        this._tiredness = tiredness;
        this._tirednessArtifact && this._element.removeArtifact(this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = this.setMarkerArtifact("/CBlades/images/markers/tired.png", 2);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = this.setMarkerArtifact("/CBlades/images/markers/exhausted.png", 2);
        }
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
        Memento.register(this);
        this._updateTiredness(this._tiredness+1);
    }

    removeOneTirednessLevel() {
        Memento.register(this);
        this._updateTiredness(this._tiredness-1);
    }

    fixTirednessLevel(tirednessLevel) {
        Memento.register(this);
        this._updateTiredness(tirednessLevel);
    }

    _updateLackOfMunitions(lackOfMunitions) {
        console.assert(lackOfMunitions===CBLackOfMunitions.NONE
            || lackOfMunitions===CBLackOfMunitions.SCARCE
            || lackOfMunitions===CBLackOfMunitions.EXHAUSTED);
        this._lackOfMunitions = lackOfMunitions;
        this._lackOfMunitionsArtifact && this._element.deleteArtifact(this._lackOfMunitionsArtifact);
        delete this._lackOfMunitionsArtifact;
        if (this._lackOfMunitions === CBLackOfMunitions.SCARCE) {
            this._lackOfMunitionsArtifact = this.createMarkerArtifact("/CBlades/images/markers/scarceamno.png", 4);
        }
        else if (this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED) {
            this._lackOfMunitionsArtifact = this.createMarkerArtifact("/CBlades/images/markers/lowamno.png", 4);
        }
    }

    set lackOfMunitions(lackOfMunitions) {
        this._lackOfMunitions = lackOfMunitions;
        this._lackOfMunitionsArtifact && this._element.removeArtifact(this._lackOfMunitionsArtifact);
        delete this._lackOfMunitionsArtifact;
        if (this._lackOfMunitions === CBLackOfMunitions.SCARCE) {
            this._lackOfMunitionsArtifact = this.setMarkerArtifact("/CBlades/images/markers/scarceamno.png", 4);
        }
        else if (this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED) {
            this._lackOfMunitionsArtifact = this.setMarkerArtifact("/CBlades/images/markers/lowamno.png", 4);
        }
    }

    get lackOfMunitions() {
        return this._lackOfMunitions;
    }

    areMunitionsScarce() {
        return this._lackOfMunitions === CBLackOfMunitions.SCARCE;
    }

    areMunitionsExhausted() {
        return this._lackOfMunitions === CBLackOfMunitions.EXHAUSTED;
    }

    addOneLackOfMunitionsLevel() {
        Memento.register(this);
        this._updateLackOfMunitions(this._lackOfMunitions+1);
    }

    replenishMunitions() {
        Memento.register(this);
        this._updateLackOfMunitions(0);
    }

    fixLackOfMunitionsLevel(lackOfMunitionsLevel) {
        Memento.register(this);
        this._updateLackOfMunitions(lackOfMunitionsLevel);
    }

    get commandLevel() {
        return this.commandProfile.commandLevel;
    }

    get moral() {
        return this.moralProfile.moral - (this._cohesion === CBCohesion.GOOD_ORDER?0:1);
    }

    _updateCohesion(cohesion) {
        console.assert(cohesion===0 || cohesion===1 || cohesion===2);
        this._cohesion = cohesion;
        this._cohesionArtifact && this._element.deleteArtifact(this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = this.createMarkerArtifact("/CBlades/images/markers/disrupted.png", 3);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = this.createMarkerArtifact("/CBlades/images/markers/fleeing.png", 3);
        }
    }

    set cohesion(cohesion) {
        this._cohesion = cohesion;
        this._cohesionArtifact && this._element.removeArtifact(this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = this.setMarkerArtifact("/CBlades/images/markers/disrupted.png", 3);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = this.setMarkerArtifact("/CBlades/images/markers/fleeing.png", 3);
        }
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
        Memento.register(this);
        if (this._cohesion == CBCohesion.ROUTED) {
            this.destroy();
        }
        else {
            this._updateCohesion(this._cohesion + 1);
            this.markAsCharging(CBCharge.NONE);
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
        if(this._engaging !== engaged || this._charging !== charging) {
            this._engaging = engaged;
            if (this._charging === CBCharge.CHARGING && charging === CBCharge.NONE) {
                this.addOneTirednessLevel();
            }
            this._charging = charging;
            this._engagingArtifact && this._element.deleteArtifact(this._engagingArtifact);
            delete this._engagingArtifact;
            if (this._charging === CBCharge.CHARGING) {
                this._engagingArtifact = this.createMarkerArtifact("/CBlades/images/markers/charge.png", 1);
            }
            else if (this._charging === CBCharge.CAN_CHARGE) {
                this._engagingArtifact = this.createActivableMarkerArtifact([
                    "/CBlades/images/markers/possible-charge.png", "/CBlades/images/markers/charge.png"
                ], marker=>{
                    marker.setImage((marker.imageIndex+1)%2);
                }, 1);
            }
            else if (this._engaging) {
                this._engagingArtifact = this.createMarkerArtifact("/CBlades/images/markers/contact.png", 1);
            }
        }
    }

    isEngaging() {
        return this._engaging;
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

    markAsEngaging(engaging) {
        Memento.register(this);
        this._updateEngagement(engaging, this._charging);
    }

    markAsCharging(charging) {
        Memento.register(this);
        this._updateEngagement(this._engaging, charging);
    }

    acknowledgeCharge(moveEnd = false) {
        if (this._charging === CBCharge.CAN_CHARGE) {
            if (this._engagingArtifact.imageIndex === 1) {
                this.markAsCharging(CBCharge.CHARGING);
            }
            else if (moveEnd) {
                this.markAsCharging(CBCharge.NONE);
            }
        }
    }

    collectArtifactsToRetract(artifacts) {
        super.collectArtifactsToRetract(artifacts);
        this._cohesionArtifact && artifacts.push(this._cohesionArtifact);
        this._engagingArtifact && artifacts.push(this._engagingArtifact);
        this._lackOfMunitionsArtifact && artifacts.push(this._lackOfMunitionsArtifact);
        this._tirednessArtifact && artifacts.push(this._tirednessArtifact);
        this._playedArtifact && artifacts.push(this._playedArtifact);
    }

    get moveProfile() {
        return this._type.getMoveProfile(this.remainingStepCount);
    }

    get weaponProfile() {
        return this._type.getWeaponProfile(this.remainingStepCount);
    }

    get commandProfile() {
        return this._type.getCommandProfile(this.remainingStepCount);
    }

    get moralProfile() {
        return this._type.getMoralProfile(this.remainingStepCount);
    }

}
CBUnit.DIMENSION = new Dimension2D(142, 142);
CBUnit.MARKERS_POSITION = [
    new Point2D(CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, -CBUnit.DIMENSION.h/2),
    new Point2D(-CBUnit.DIMENSION.w/2, 0),
    new Point2D(-CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(0, CBUnit.DIMENSION.h/2),
    new Point2D(CBUnit.DIMENSION.w/2, CBUnit.DIMENSION.h/2),
    new Point2D(CBUnit.DIMENSION.w/2, 0)];

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
        return CBGame.ULAYERS.FORMATIONS;
    }

}

export class CBFormation extends CBUnit {

    constructor(type, wing) {
        super(type, type.getFormationPaths(), wing, CBFormation.DIMENSION);
    }

    get troopNature() {
        return true;
    }

    createArtifact(levelName, images, location, dimension) {
        return new FormationImageArtifact(this, levelName, images, location, dimension);
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


    turn(angle, cost=null, moveType = CBMoveType.BACKWARD) {
        this.move(this.hexLocation.turnTo(angle), cost, moveType);
        this.reorient(this.getTurnOrientation(angle));
    }

    takeALoss() {
        if (this.remainingStepCount <= this.minStepCount) {
            let {fromHex, toHex} = this.game.arbitrator.getTroopsAfterFormationBreak(this);
            this.breakFormation(fromHex, toHex)
        }
        else {
            super.takeALoss();
        }
    }

    breakFormation(replacementOnFromHex, replacementOnToHex) {
        let hexLocation = this.hexLocation;
        this.game.deleteUnit(this);
        this.move(null, 0);
        for (let replacement of replacementOnFromHex) {
            this.game.appendUnit(replacement, hexLocation.fromHex);
        }
        for (let replacement of replacementOnToHex) {
            this.game.appendUnit(replacement, hexLocation.toHex);
        }
    }

}
CBFormation.DIMENSION = new Dimension2D(CBUnit.DIMENSION.w*2, CBUnit.DIMENSION.h);
CBFormation.MARKERS_POSITION = [
    new Point2D(CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
    new Point2D(-CBFormation.DIMENSION.w/2, -CBFormation.DIMENSION.h/2),
    new Point2D(-CBFormation.DIMENSION.w/2, 0),
    new Point2D(-CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
    new Point2D(0, CBFormation.DIMENSION.h/2),
    new Point2D(CBFormation.DIMENSION.w/2, CBFormation.DIMENSION.h/2),
    new Point2D(CBFormation.DIMENSION.w/2, 0)];

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

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            this._commandPoints = 0;
        }
    }

    collectArtifactsToRetract(artifacts) {
        super.collectArtifactsToRetract(artifacts);
        this._orderInstructionArtifact && artifacts.push(this._orderInstructionArtifact);
    }
}
CBCharacter.DIMENSION = new Dimension2D(120, 120);
CBCharacter.ORDER_INSTRUCTION_DIMENSION = new Dimension2D(80, 80);
CBCharacter.ORDER_INSTRUCTION_PATHS = [
    "/CBlades/images/markers/attack.png",
    "/CBlades/images/markers/defend.png",
    "/CBlades/images/markers/regroup.png",
    "/CBlades/images/markers/retreat.png"
];