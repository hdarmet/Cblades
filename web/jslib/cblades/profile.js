'use strict'

import {
    CBHex
} from "./map.js";
import {
    CBCommandProfile, CBMoralProfile,
    CBMoveProfile, CBWeaponProfile
} from "./unit.js";

export let CBProfileCapacity = {
    SUPERIOR: 2,
    ADVANTAGED: 1,
    NORMAL: 0,
    DISADVANTAGED: -1,
    INFERIOR: -2
}

export class PedestrianMoveProfile extends CBMoveProfile {

    constructor(capacity) {
        super(capacity);
    }

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case CBHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case CBHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case CBHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case CBHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
        }
    }

    getRotationCost(angle) {
        if (angle<0) angle=-angle;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle<=60 ? 0 : 0.5};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }

    getMinimalMoveCost() {
        return 1;
    }

}

export class AnimalMoveProfile extends CBMoveProfile {

    constructor(capacity) {
        super(capacity);
    }

    get movementPoints() {
        return 3+this.capacity;
    }

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case CBHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case CBHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case CBHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case CBHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
        }
    }

    getRotationCost(angle) {
        if (angle<0) angle=-angle;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle<=60 ? 0 : 0.5};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }

    getMinimalMoveCost() {
        return 1;
    }

}

export class CavalryMoveProfile extends CBMoveProfile {

    constructor(capacity) {
        super(capacity);
    }

    get movementPoints() {
        return 3+this.capacity;
    }

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case CBHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case CBHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case CBHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case CBHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case CBHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
        }
    }

    getRotationCost(angle) {
        if (angle<0) angle=-angle;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle===0 ? 0 : angle<=60 ? 0.5 : 1};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
    }

    getMinimalMoveCost() {
        return 0.5;
    }

}

export class MediumCavalryWeaponProfile extends CBWeaponProfile {

    constructor(capacity) {
        super(capacity);
    }

    getShockAttackCode() {
        return "MCv";
    }

}

export class HeavyCavalryWeaponProfile extends CBWeaponProfile {

    constructor(capacity) {
        super(capacity);
    }

    getShockAttackCode() {
        return "HCv";
    }

}

export class LightInfantryWeaponProfile extends CBWeaponProfile {

    constructor(capacity) {
        super(capacity);
    }

    getShockAttackCode() {
        return "LIf";
    }

    getFireAttackCode() {
        return "LIf";
    }

    getFireRange() {
        return 2;
    }
}

export class LanceWeaponProfile extends CBWeaponProfile {

    constructor(capacity) {
        super(capacity);
    }

    getShockAttackCode() {
        return "Lan";
    }

}

export class CrossbowWeaponProfile extends CBWeaponProfile {

    constructor(capacity) {
        super(capacity);
    }

    getShockAttackCode() {
        return "Arb";
    }

    getFireAttackCode() {
        return "Arb";
    }

    getFireRange() {
        return 5;
    }
}

export class RegularCommandProfile extends CBCommandProfile {

    constructor(capacity) {
        super(capacity);
    }

}

export class IrregularCommandProfile extends CBCommandProfile {

    constructor(capacity) {
        super(capacity);
    }

}

export class ChaoticCommandProfile extends CBCommandProfile {

    constructor(capacity) {
        super(capacity);
    }

}

export class StandardMoralProfile extends CBMoralProfile {

    constructor(capacity) {
        super(capacity);
    }

}

export class EliteMoralProfile extends CBMoralProfile {

    constructor(capacity) {
        super(capacity);
    }

    getAutoRally() {
        return true;
    }

}

export class ExaltedMoralProfile extends CBMoralProfile {

    constructor(capacity) {
        super(capacity);
    }

}
