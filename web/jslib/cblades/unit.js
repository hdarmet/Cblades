'use strict'

import {
    Point2D, Dimension2D
} from "../board/geometry.js";
import {
    Mechanisms,
    Memento
} from "../board/mechanisms.js";
import {
    WStacking,
    WAction
} from "../wargame/game.js";
import {
    WGame
} from "../wargame/playable.js";
import {
    WHexLocation
} from "../wargame/map.js";
import {
    WSequence, WSequenceElement
} from "../wargame/sequences.js";
import {
    WUnit, WUnitAnimation, WUnitPlayer,
    getUnitFromContext, WWing, WSimpleMarkerArtifact, TwoHexesUnit
} from "../wargame/wunit.js";

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

export class CBUnitPlayer extends WUnitPlayer {

    _fromWingSpec(wingSpecs, context) {
        return CBWing.fromSpecs(this, wingSpecs, context);
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

    createUnit(game, wing, steps= 2) {
        let unit = new CBCharacter(game, this, wing);
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

    createUnit(game, wing, steps = 2) {
        let unit = steps<=this.getFigureStepCount() ? new CBTroop(game, this, wing) : new CBFormation(game, this, wing);
        unit.steps = steps;
        return unit;
    }

}

export class CBWing extends WWing {

    constructor(player, banner) {
        super(player);
        this._orderInstruction = CBOrderInstruction.DEFEND;
        this._retreatZone = [];
        this._moral = 11;
        this._tiredness = 11;
        this._banner = banner;
    }

    hasUnitByName(name) {
        return this.playables.find(unit=>unit.name===name)!==undefined;
    }

    getNextUnitByName() {
        let number = 0;
        var unitNames = new Set(this.playables.map(unit=>unit.name));
        while(true) {
            let name = this._banner.name+"-"+number;
            if (unitNames.has(name)) number+=1;
            else return name;
        }
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
        if (character !== this._leader) {
            if (this._leader) {
                this._leader.unsetOrderInstructionArtifact();
            }
            if (character) {
                character.setOrderInstructionArtifact();
            }
            this._leader = character;
        }
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

    getOrderInstructionCode() {
        switch (this.orderInstruction) {
            case CBOrderInstruction.ATTACK: return "A";
            case CBOrderInstruction.DEFEND: return "D";
            case CBOrderInstruction.REGROUP: return "G";
            case CBOrderInstruction.RETREAT: return "R";
        }
    }

    static getOrderInstruction(code) {
        switch (code) {
            case "A": return CBOrderInstruction.ATTACK;
            case "D": return CBOrderInstruction.DEFEND;
            case "G": return CBOrderInstruction.REGROUP;
            case "R": return CBOrderInstruction.RETREAT;
        }
    }

    toSpecs(context) {
        let wingSpecs = {
            ...super.toSpecs(context),
            leader: this.leader ? this.leader.name : undefined,
            moral: this.moral,
            tiredness: this.tiredness,
            banner: {
                id: this.banner._oid,
                version: this.banner._oversion,
                name: this.banner.name,
                path: this.banner.path
            },
            retreatZone: [],
            orderInstruction: this.getOrderInstructionCode()
        }
        for (let retreatHex of this.retreatZone) {
            let retreatHexSpecs = {
                id: retreatHex.hex._oid,
                version: retreatHex.hex._oversion,
                col: retreatHex.col,
                row: retreatHex.row
            }
            wingSpecs.retreatZone.push(retreatHexSpecs);
        }
        return wingSpecs;
    }

    fromSpecs(specs, context) {
        this._oid = specs.id;
        this._oversion = specs.version;
        this.setMoral(specs.moral);
        this.setTiredness(specs.tiredness);
        let retreatZone = [];
        for (let retreatHexSpec of specs.retreatZone) {
            let hexId = this.player.game.map.getHex(retreatHexSpec.col, retreatHexSpec.row);
            retreatZone.push(hexId);
        }
        this.setRetreatZone(retreatZone);
        let leader = null;
        for (let unitSpecs of specs.units) {
            let unit = CBUnit.fromSpecs(this, unitSpecs, context);
            context.pieceMap.set(unit.name, unit);
            if (unit.name === specs.leader) {
                leader = unit;
            }
        }
        leader && this.setLeader(leader);
        this.setOrderInstruction(CBWing.getOrderInstruction(specs.orderInstruction));
    }

    static fromSpecs(player, specs, context) {
        let wing = new CBWing(
            player, {
                _oid: specs.banner.id,
                _oversion: specs.banner.version,
                name: specs.banner.name,
                path: specs.banner.path
            }
        );
        wing.fromSpecs(specs, context);
        return wing;
    }

    static MORAL_EVENT = "moral-event";
    static TIREDNESS_EVENT = "tiredness-event";
}

export class CBUnit extends WUnit {

    constructor(game, type, paths, wing, dimension=CBUnit.DIMENSION) {
        super(game, paths, wing, dimension);
        this._type = type;
        this._movementPoints=type.getMovementPoints(2);
        this._extendedMovementPoints=type.getExtendedMovementPoints(2);
        this._tiredness=CBTiredness.NONE;
        this._munitions=CBMunitions.NONE;
        this._cohesion=CBCohesion.GOOD_ORDER;
        this._engaging=false;
        this._charging=CBCharge.NONE;
        this._orderGiven = false;
    }

    get type() {
        return this._type;
    }

    get maxStepCount() {
        return this._type.getFigureStepCount();
    }

    getAttackHex(type) {
        return !type ? null : type==="F" ? this.hexLocation : null;
    }

    getAttackHexType(hex) {
        return hex===this.hexLocation ? "F" : null;
    }

    copy(unit) {
        super.copy(unit);
        unit._extendedMovementPoints = this._extendedMovementPoints;
        unit.cohesion = this.cohesion;
        unit.munitions = this.munitions;
        unit.tiredness = this.tiredness;
    }

    addToMap(hexId, stacking) {
        let nameMustBeDefined = !this._name || this._wing.hasUnitByName(this._name);
        super.addToMap(hexId, stacking);
        if (nameMustBeDefined) {
            this.name = this._wing.getNextUnitByName();
        }
    }

    appendToMap(hexLocation, stacking) {
        let nameMustBeDefined = !this._name || this._wing.hasUnitByName(this._name);
        super.appendToMap(hexLocation, stacking);
        if (nameMustBeDefined) {
            this._name = this._wing.getNextUnitByName();
        }
    }

    _memento() {
        return {
            ...super._memento(),
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
            orderGiven: this._orderGiven
        };
    }

    _revert(memento) {
        super._revert(memento);
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
    }

    setState(state) {
        super.setState(state);
        this._extendedMovementPoints = state.extendedMovementPoints;
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

    destroy() {
        super.destroy();
        this._cohesion = CBCohesion.DESTROYED;
    }

    finish() {
        super.finish();
        WSequence.appendElement(this.game, new CBFinishUnitSequenceElement({game: this.game, unit: this}));
    }

    _unselect() {
        super._unselect();
        if (this.isActivated()) {
            this.setPlayed();
        }
    }

    _init() {
        super._init();
        if (this._movementPoints === undefined) this._movementPoints = this._type.getMovementPoints(this.steps);
        if (this._orderGiven === undefined) this._orderGiven = false;
        if (this._extendedMovementPoints === undefined) this._extendedMovementPoints = this._type.getExtendedMovementPoints(this.steps);
    }

    get nominalMovementPoints() {
        return this._type.getMovementPoints(this.steps);
    }

    get extendedMovementPoints() {
        return this._extendedMovementPoints;
    }

    set extendedMovementPoints(extendedMovementPoints) {
        this._extendedMovementPoints = extendedMovementPoints;
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
        this._orderGiven = false;
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

    move(hexLocation, cost=null, stacking = WStacking.TOP) {
        this.displace(hexLocation, stacking);
        if (cost!=null) {
            this._updateMovementPoints(cost);
        }
    }

    retreat(hexLocation, stacking, adjustCohesion=true) {
        this._displace(hexLocation, stacking);
        if (adjustCohesion) {
            this.addOneCohesionLevel();
        }
        this.setEngaging(false);
    }

    advance(hexLocation) {
        this._displace(hexLocation, WStacking.BOTTOM);
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
            this._engaging =engaged;
            this._charging = charging;
            WSequence.appendElement(this.game, new CBEngagingSequenceElement({game: this.game, unit: this}));
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

    /*
    setAction(actionSpec) {
        if (actionSpec.actionType) {
            let action = WAction.createAction(actionSpec.actionType, this.game, this, actionSpec.actionMode);
            this.launchAction(action);
            action.status = WAction.STARTED;
            this._game.selectedPlayable = this;
        }
        else if (actionSpec.routNeighbors) {
            this.game.currentPlayer.routNeighborsChecking(this, actionSpec.neighbors);
        }
        else if (actionSpec.focused) {
            this._game.selectedPlayable = this;
            this._game.focusedPlayable = this;
        }
    }
     */

    _updateTirednessArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._tirednessArtifact && removeMarkerArtifact.call(this, this._tirednessArtifact);
        delete this._tirednessArtifact;
        if (this._tiredness === CBTiredness.TIRED) {
            this._tirednessArtifact = setMarkerArtifact.call(this, "./../images/markers/tired.png", 3);
        }
        else if (this._tiredness === CBTiredness.EXHAUSTED) {
            this._tirednessArtifact = setMarkerArtifact.call(this, "./../images/markers/exhausted.png", 3);
        }
    }

    _updateMunitionsArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._munitionsArtifact && removeMarkerArtifact.call(this, this._munitionsArtifact);
        delete this._munitionsArtifact;
        if (this._munitions === CBMunitions.SCARCE) {
            this._munitionsArtifact = setMarkerArtifact.call(this, "./../images/markers/scarceamno.png", 5);
        }
        else if (this._munitions === CBMunitions.EXHAUSTED) {
            this._munitionsArtifact = setMarkerArtifact.call(this, "./../images/markers/lowamno.png", 5);
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
            this._engagingArtifact = setMarkerArtifact.call(this, "./../images/markers/charge.png", 2);
        }
        else if (this._charging === CBCharge.CAN_CHARGE) {
            this._engagingArtifact = setActivableMarkerArtifact.call(this, [
                "./../images/markers/possible-charge.png", "./../images/markers/charge.png"
            ], marker=>{
                marker.setImage((marker.imageIndex+1)%2);
            }, 2);
        }
        else if (this._engaging) {
            this._engagingArtifact = setMarkerArtifact.call(this, "./../images/markers/contact.png", 2);
        }
    }

    _updateCohesionArtifact(setMarkerArtifact, removeMarkerArtifact) {
        this._cohesionArtifact && removeMarkerArtifact.call(this, this._cohesionArtifact);
        delete this._cohesionArtifact;
        if (this._cohesion === CBCohesion.DISRUPTED) {
            this._cohesionArtifact = setMarkerArtifact.call(this, "./../images/markers/disrupted.png", 4);
        }
        else if (this._cohesion === CBCohesion.ROUTED) {
            this._cohesionArtifact = setMarkerArtifact.call(this, "./../images/markers/fleeing.png", 4);
        }
    }

    getTirednessCode() {
        if (this.isTired()) return "T";
        else if (this.isExhausted()) return "E";
        else return "F";
    }

    getAmmunitionCode() {
        if (this.areMunitionsScarce()) return "S";
        else if (this.areMunitionsExhausted()) return "E";
        else return "P";
    }

    getCohesionCode(unit) {
        if (this.isDisrupted()) return "D";
        else if (this.isRouted()) return "R";
        else return "GO";
    }

    toReferenceSpecs(context) {
        return {
            name:this.name
        }
    }

    static fromSpecs(wing, unitSpec, context) {
        let unitType = CBUnitType.getType(unitSpec.type);
        let unit = unitType.createUnit(context.game, wing, unitSpec.steps);

        unit.fromSpecs(unitSpec, context);
        return unit;
    }

    toSpecs(context) {
        let unitSpec = {
            ... super.toSpecs(context),
            name: this.name,
            category: this.getUnitCategoryCode(),
            type: this.type.name,
            angle: this.angle,
            steps: this.steps,
            tiredness: this.getTirednessCode(),
            ammunition: this.getAmmunitionCode(),
            cohesion: this.getCohesionCode(),
            charging: this.isCharging(),
            contact: this.isEngaging(),
            orderGiven: this.hasReceivedOrder(),
            played: this.isPlayed()
        }
        context.set(this, unitSpec);
        return unitSpec;
    }

    fromSpecs(specs, context) {
        super.fromSpecs(specs, context);
        this._name = specs.name;
        this._game = this.wing.player.game;
        this.angle = specs.angle;
        this.setState({
            steps: specs.steps,
            tiredness: CBUnit.getUnitTiredness(specs.tiredness),
            munitions: CBUnit.getUnitAmmunition(specs.ammunition),
            cohesion: CBUnit.getUnitCohesion(specs.cohesion),
            charging: specs.charging ? CBCharge.CHARGING : CBCharge.NONE,
            engaging: specs.engaging||false,
            orderGiven: specs.orderGiven||false,
            //attrs: specs.attributes,
            played: specs.played||false
        });
    }

    static getUnitTiredness(code) {
        switch (code) {
            case "F": return CBTiredness.NONE;
            case "T": return CBTiredness.TIRED;
            case "E": return CBTiredness.EXHAUSTED;
        }
    }

    static getUnitAmmunition(code) {
        switch (code) {
            case "P": return CBMunitions.NONE;
            case "S": return CBMunitions.SCARCE;
            case "E": return CBMunitions.EXHAUSTED;
        }
    }

    static getUnitCohesion(code) {
        switch (code) {
            case "GO": return CBCohesion.GOOD_ORDER;
            case "D": return CBCohesion.DISRUPTED;
            case "R": return CBCohesion.ROUTED;
        }
    }
}

export class CBTroop extends CBUnit {

    constructor(game, type, wing) {
        super(game, type, type.getTroopPaths(), wing);
    }

    clone() {
        let copy = new CBTroop(this.game, this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    get troopNature() {
        return true;
    }

    get allowedAttackCount() {
        return 1;
    }

    getUnitCategoryCode(unit) {
        return "T";
    }

}

export class CBFormation extends TwoHexesUnit(CBUnit) {

    constructor(game, type, wing) {
        super(game, type, type.getFormationPaths(), wing, CBFormation.DIMENSION);
    }

    get troopNature() {
        return true;
    }

    clone() {
        let copy = new CBFormation(this.game, this.type, this.wing);
        this.copy(copy);
        return copy;
    }

    turn(angle, cost = null, stacking = WStacking.TOP) {
        this.move(this.hexLocation.turnTo(angle), cost, stacking);
        this.reorient(this.getTurnOrientation(angle));
    }

    get allowedAttackCount() {
        return 2;
    }

    get maxStepCount() {
        return this._type.getFormationMaxStepCount();
    }

    get formationNature() {
        return true;
    }

    getAttackHex(type) {
        return !type ? null : type==="F" ? this.hexLocation.fromHex : this.hexLocation.toHex;
    }

    getAttackHexType(hex) {
        return hex===this.hexLocation.toHex ? "T" : hex===this.hexLocation.fromHex ? "F" : null;
    }

    get minStepCount() {
        return this.type.getFormationMinStepCount();
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
            replacement.appendToMap(hexLocation.fromHex, WStacking.TOP);
        }
        for (let replacement of replacementOnToHex) {
            replacement.appendToMap(hexLocation.toHex, WStacking.TOP);
        }
    }

    getUnitCategoryCode(unit) {
        return "F";
    }

    static DIMENSION = new Dimension2D(CBUnit.DIMENSION.w*2, CBUnit.DIMENSION.h);
}

export class CBCharacter extends CBUnit {

    constructor(game, type, wing) {
        super(game, type, type.getTroopPaths(), wing, CBCharacter.DIMENSION);
        this._commandPoints = 0;
    }

    clone() {
        let copy = new CBCharacter(this.game, this.type, this.wing);
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

    get dimensionForMarkers() {
        return CBUnit.DIMENSION;
    }

    get commandPoints() {
        return this._commandPoints;
    }

    receiveCommandPoints(commandPoints) {
        Memento.register(this);
        this._commandPoints = commandPoints;
    }

    createOrderInstructionArtifact(orderInstruction) {
        let marker = new WSimpleMarkerArtifact(this, CBCharacter.ORDER_INSTRUCTION_PATHS[orderInstruction],
            this.getMarkerPosition(7), CBCharacter.ORDER_INSTRUCTION_DIMENSION);
        return marker;
    }

    setOrderInstructionArtifact() {
        this.unsetOrderInstructionArtifact();
        this._orderInstructionArtifact = this.createOrderInstructionArtifact(this._wing.orderInstruction);
        this._element.addArtifact(this._orderInstructionArtifact);
    }

    unsetOrderInstructionArtifact() {
        if (this._orderInstructionArtifact) {
            this._element.removeArtifact(this._orderInstructionArtifact);
            delete this._orderInstructionArtifact;
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

    getUnitCategoryCode(unit) {
        return "C";
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

export class CBStateSequenceElement extends WSequenceElement {

    constructor({id, unit, game, type="state"}) {
        super({id, type, game});
        unit&&this.setUnit(unit);
    }

    setUnit(unit) {
        this.unit = unit;
        this.steps = unit.isOnHex() ? unit.steps : 0;
        this.cohesion = unit.cohesion;
        this.tiredness = unit.tiredness;
        this.munitions = unit.munitions;
        this.charging = unit.charge;
        this.engaging = unit.isEngaging();
        this.orderGiven = unit.hasReceivedOrder();
        this.movementPoints = unit.movementPoints;
        this.extendedMovementPoints = unit.extendedMovementPoints;
        this._setUnitAction(unit);
        this.played = unit.isPlayed();
    }

    _setUnitAction(unit) {
        if (unit.action && !unit.action.isFinished()) {
            this.actionType = unit.action.constructor.name;
            this.actionMode = unit.action.mode;
        }
    }

    setState(state) {
        Object.assign(this, state);
        return this;
    }

    _toString() {
        let result = super._toString();
        if (this.unit !== undefined) result+=", Unit: "+this.unit.name;
        if (this.steps !== undefined) result+=", steps: "+this.unit.steps;
        if (this.cohesion !== undefined) result+=", Cohesion: "+this.cohesion;
        if (this.tiredness !== undefined) result+=", Tiredness: "+this.tiredness;
        if (this.munitions !== undefined) result+=", Munitions: "+this.munitions;
        if (this.charging !== undefined) result+=", Charging: "+this.charging;
        if (this.engaging !== undefined) result+=", Engaging: "+this.engaging;
        if (this.orderGiven !== undefined) result+=", OrderGiven: "+this.orderGiven;
        if (this.movementPoints !== undefined) result+=", MovementPoints: "+this.movementPoints;
        if (this.extendedMovementPoints !== undefined) result+=", ExtendedMovementPoints: "+this.extendedMovementPoints;
        if (this.actionType !== undefined && this.actionType !== null) result+=", ActionType: "+this.actionType;
        if (this.actionMode !== undefined && this.actionMode !== null) result+=", ActionMode: "+this.actionMode;
        if (this.played !== undefined) result+=", Played: "+this.played;
        return result;
    }

    apply(startTick) {
        return new WUnitAnimation({unit:this.unit, startTick, duration:this.delay, state:this});
    }

    get delay() { return 0; }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.unit = this.unit.name;
        spec.steps = this.unit.steps;
        spec.cohesion = this.getCohesionCode(this.cohesion);
        spec.tiredness = this.getTirednessCode(this.tiredness);
        spec.ammunition = this.getMunitionsCode(this.munitions);
        spec.charging = this.getChargingCode(this.charging);
        spec.engaging = this.engaging;
        spec.orderGiven = this.orderGiven;
        spec.movementPoints = this.movementPoints;
        spec.extendedMovementPoints = this.extendedMovementPoints;
        spec.actionType = this.actionType;
        spec.actionMode = this.actionMode;
        spec.played = this.played;
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        Object.assign(this, spec);
        this.unit = getUnitFromContext(context, spec.unit);
        //this.setUnit(unit);
        if (spec.tiredness !== undefined) this.tiredness = this.getTiredness(spec.tiredness);
        if (spec.cohesion !== undefined) this.cohesion = this.getCohesion(spec.cohesion);
        if (spec.ammunition !== undefined) this.munitions = this.getMunitions(spec.ammunition);
        if (spec.charging !== undefined) this.charging = this.getCharging(spec.charging);
    }

    getTirednessCode(tiredness) {
        if (tiredness===CBTiredness.TIRED) return "T";
        else if (tiredness===CBTiredness.EXHAUSTED) return "E";
        else return "F";
    }

    getMunitionsCode(munitions) {
        if (munitions===CBMunitions.SCARCE) return "S";
        else if (munitions===CBMunitions.EXHAUSTED) return "E";
        else return "P";
    }

    getCohesionCode(cohesion) {
        if (cohesion===CBCohesion.DISRUPTED) return "D";
        else if (cohesion===CBCohesion.ROUTED) return "R";
        else if (cohesion===CBCohesion.DESTROYED) return "X";
        else return "GO";
    }

    getChargingCode(charging) {
        if (charging===CBCharge.CHARGING) return "C";
        else if (charging===CBCharge.BEGIN_CHARGE) return "BC";
        else if (charging===CBCharge.CAN_CHARGE) return "CC";
        else return "N";
    }

    getTiredness(code) {
        switch (code) {
            case "F": return CBTiredness.NONE;
            case "T": return CBTiredness.TIRED;
            case "E": return CBTiredness.EXHAUSTED;
        }
    }

    getMunitions(code) {
        switch (code) {
            case "P": return CBMunitions.NONE;
            case "S": return CBMunitions.SCARCE;
            case "E": return CBMunitions.EXHAUSTED;
        }
    }

    getCohesion(code) {
        switch (code) {
            case "GO": return CBCohesion.GOOD_ORDER;
            case "D": return CBCohesion.DISRUPTED;
            case "R": return CBCohesion.ROUTED;
            case "X": return CBCohesion.DESTROYED;
        }
    }

    getCharging(code) {
        switch (code) {
            case "BC": return CBCharge.BEGIN_CHARGE;
            case "CC": return CBCharge.CAN_CHARGE;
            case "C": return CBCharge.CHARGING;
            case "N": return CBCharge.NONE;
        }
    }

}
WSequence.register("state", CBStateSequenceElement);

export class CBFinishUnitSequenceElement extends CBStateSequenceElement {

    constructor({id, unit, game}) {
        super({id, type:"finish-unit", unit, game});
    }

    _setUnitAction(unit) {
    }

    setUnit(unit) {
        super.setUnit(unit);
        this.played = true;
    }

}
WSequence.register("state", CBFinishUnitSequenceElement);

export class CBEngagingSequenceElement extends CBStateSequenceElement {

    constructor({id, game, unit}) {
        super({id, type: "engaging", game, unit});
    }

}
WSequence.register("engaging", CBEngagingSequenceElement);

