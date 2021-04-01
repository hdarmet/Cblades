'use strict'

import {
    Point2D, Dimension2D
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    Memento
} from "../mechanisms.js";
import {
    CBHexSideId, CBMoveType
} from "./map.js";
import {
    CBCounterImageArtifact, CBAbstractUnit, CBGame, RetractableArtifactMixin, UnitImageArtifact
} from "./game.js";

export let CBMovement = {
    NORMAL : "normal",
    EXTENDED : "extended",
    MINIMAL : "minimal"
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
    ROUTED: 2
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

export class CBMoveProfile {

    constructor(capacity = 0) {
        this._capacity = capacity;
    }

    get capacity() {
        return this._capacity;
    }

    get movementPoints() {
        return 2+this.capacity;
    }

    get extendedMovementPoints() {
        return this.movementPoints*1.5;
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

export class CBUnitType {

    constructor(name, troopPaths, formationPaths) {
        this._name = name;
        this._troopPaths = troopPaths;
        this._formationPaths = formationPaths;
        this._maxStepCount = 2;
        this._moveProfiles = [];
    }

    getMoveProfile(steps) {
        return this._moveProfiles[steps];
    }

    setMoveProfile(steps, moveProfile) {
        this._moveProfiles[steps] = moveProfile;
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

    constructor(unit, path, position, dimension= CBMarkerArtifact.MARKER_DIMENSION) {
        super(unit, "units", [DImage.getImage(path)], position, dimension);
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
        this._charging=false;
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
        let marker = new CBMarkerArtifact(this, path, CBUnit.MARKERS_POSITION[positionSlot]);
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, positionSlot) {
        let marker = new CBMarkerArtifact(this, path, CBUnit.MARKERS_POSITION[positionSlot]);
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
            attackLocation: this._attackLocation,
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
        this._attackLocation = memento.attackLocation;
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
            delete this._attackLocation;
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

    receiveOrder(order) {
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

    takeALoss() {
        Memento.register(this);
        this._lossSteps++;
        if (this._lossSteps >= this.maxStepCount) {
            this.deleteFromMap();
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

    move(hexLocation, cost=null, moveType = CBMoveType.BACKWARD) {
        if ((hexLocation || this.hexLocation) && (hexLocation !== this.hexLocation)) {
            if (this.hexLocation && !hexLocation) {
                this.deleteFromMap()
            } else if (!this.hexLocation && hexLocation) {
                this.appendToMap(hexLocation, moveType);
            } else {
                Memento.register(this);
                this._hexLocation._deleteUnit(this);
                this._hexLocation = hexLocation;
                hexLocation._appendUnit(this, moveType);
                this._element.move(hexLocation.location);
                for (let carried of this._carried) {
                    carried._move(hexLocation);
                }
            }
        }
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    setAttackLocation(hexLocation) {
        Memento.register(this);
        this._attackLocation = hexLocation;
    }

    get attackLocation() {
        return this._attackLocation;
    }

    hasAttacked() {
        return !!this._attackLocation;
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

    inGoodOrder() {
        return this._cohesion === CBCohesion.GOOD_ORDER;
    }

    isDisrupted() {
        return this._cohesion === CBCohesion.DISRUPTED;
    }

    isRouted() {
        return this._cohesion === CBCohesion.ROUTED;
    }

    addOneCohesionLevel() {
        Memento.register(this);
        this._updateCohesion(this._cohesion+1);
    }

    disrupt() {
        console.assert(!this.isRouted());
        Memento.register(this);
        this._updateCohesion(CBCohesion.DISRUPTED);
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
            this._charging = charging;
            this._engagingArtifact && this._element.deleteArtifact(this._engagingArtifact);
            delete this._engagingArtifact;
            if (this._charging) {
                this._engagingArtifact = this.createMarkerArtifact("/CBlades/images/markers/charge.png", 1);
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
        return this._charging;
    }

    markAsEngaging(engaging) {
        Memento.register(this);
        this._updateEngagement(engaging, this._charging);
    }

    markAsCharging(charging) {
        Memento.register(this);
        this._updateEngagement(this._engaging, charging);
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

    get hexLocation() {
        return this._hexLocation;
    }

    move(hexSideId, cost=null, moveType = CBMoveType.BACKWARD) {
        console.assert(hexSideId === null || hexSideId instanceof CBHexSideId);
        if (!CBHexSideId.equals(hexSideId, this._hexLocation)) {
            Memento.register(this);
            if (this._hexLocation) {
                this._hexLocation.fromHex.hex.deleteUnit(this);
                this._hexLocation.toHex.hex.deleteUnit(this);
                if (!hexSideId) this._element.hide();
            }
            if (hexSideId && !this._hexLocation) this._element.show(this.game.board);
            this._hexLocation = hexSideId;
            if (this._hexLocation) {
                hexSideId.fromHex.hex.appendUnit(this, moveType);
                hexSideId.toHex.hex.appendUnit(this, moveType);
                this._element.move(hexSideId.location);
            }
            if (cost!=null) {
                this._updateMovementPoints(cost);
            }
        }
    }

    set hexLocation(hexSideId) {
        console.assert(hexSideId === null || hexSideId instanceof CBHexSideId);
        if (this._hexLocation) {
            this._hexLocation.fromHex.hex.removeUnit(this);
            this._hexLocation.toHex.hex.removeUnit(this);
        }
        this._hexLocation = hexSideId;
        if (this._hexLocation) {
            hexSideId.fromHex.hex.addUnit(this);
            hexSideId.toHex.hex.addUnit(this);
            this.location = hexSideId.location;
        }
    }

    setMarkerArtifact(path, positionSlot) {
        let marker = new CBMarkerArtifact(this, path, CBFormation.MARKERS_POSITION[positionSlot]);
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, positionSlot) {
        let marker = new CBMarkerArtifact(this, path, CBFormation.MARKERS_POSITION[positionSlot]);
        this._element.appendArtifact(marker);
        return marker;
    }

    get minStepCount() {
        return this.type.getFormationMinStepCount();
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
        let marker = new CBMarkerArtifact(this, CBCharacter.ORDER_INSTRUCTION_PATHS[orderInstruction],
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