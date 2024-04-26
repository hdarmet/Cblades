'use strict'

import {
    WHex
} from "../wargame/map.js";
import {
    CBCommandProfile, CBMagicProfile, CBMoralProfile,
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

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case WHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case WHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case WHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case WHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
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

    get movementPoints() {
        return 3+this.capacity;
    }

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case WHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
            case WHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:2};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case WHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case WHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case WHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
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
        return 0.5;
    }

}

export class CavalryMoveProfile extends CBMoveProfile {

    get movementPoints() {
        return 3+this.capacity;
    }

    getMovementCostOnHex(hex) {
        switch (hex.type) {
            case WHex.HEX_TYPES.OUTDOOR_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case WHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:0.5};
            case WHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case WHex.HEX_TYPES.WATER : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.LAVA : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.IMPASSABLE : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEX_TYPES.CAVE_CLEAR : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case WHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case WHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
            case WHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
        }
    }

    getMovementCostOnHexSide(hexSide) {
        switch (hexSide.type) {
            case WHex.HEXSIDE_TYPES.NORMAL : return {type:CBMoveProfile.COST_TYPE.ADD, value:0};
            case WHex.HEXSIDE_TYPES.EASY : return {type:CBMoveProfile.COST_TYPE.SET, value:0.5};
            case WHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE};
            case WHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case WHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
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

    getShockAttackCode() {
        return "MCv";
    }

}

export class HeavyCavalryWeaponProfile extends CBWeaponProfile {

    getShockAttackCode() {
        return "HCv";
    }

}

export class HordeWeaponProfile extends CBWeaponProfile {

    getShockAttackCode() {
        return "Hrd";
    }

}

export class LightInfantryWeaponProfile extends CBWeaponProfile {

    getShockAttackCode() {
        return "LIf";
    }

    getFireAttackCode() {
        return "LIf";
    }

    getFireRange() {
        return 2;
    }

    getFireMalusSegmentSize() {
        return 2;
    }
}

export class LanceWeaponProfile extends CBWeaponProfile {

    getShockAttackCode() {
        return "Lan";
    }

}

export class CrossbowWeaponProfile extends CBWeaponProfile {

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

}

export class IrregularCommandProfile extends CBCommandProfile {

}

export class ChaoticCommandProfile extends CBCommandProfile {

}

export class StandardMoralProfile extends CBMoralProfile {

}

export class EliteMoralProfile extends CBMoralProfile {

    getAutoRally() {
        return true;
    }

}

export class ExaltedMoralProfile extends CBMoralProfile {

}

export class ArcaneMagicProfile extends CBMagicProfile {

    constructor(capacity) {
        super(ArcaneMagicProfile.ART, capacity);
    }

    static ART = "arcane";
}

export class FireMagicProfile extends CBMagicProfile {

    constructor(capacity) {
        super(FireMagicProfile.ART, capacity);
    }

    static ART = "fire";
}
