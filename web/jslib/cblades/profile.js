'use strict'

import {
    CBHex
} from "./map.js";
import {
    CBMoveProfile
} from "./unit.js";

export let ProfileCapacity = {
    SUPERIOR: 2,
    ADVANTAGED: 1,
    NORMAL: 0,
    DISADVANTAGED: -1,
    INFERIOR: -2
}

export class PedestrianMoveProfile {

    constructor(capacity) {
        this._capacity = capacity;
    }

    get movementPoints() {
        return 2+this._capacity;
    }

    get extendedMovementPoints() {
        return 3+this._capacity*1.5;
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
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle <=60 ? 0 : 0.5};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }
}

export class AnimalMoveProfile {

    constructor(capacity) {
        this._capacity = capacity;
    }

    get movementPoints() {
        return 3+this._capacity;
    }

    get extendedMovementPoints() {
        return 4.5+this._capacity*1.5;
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
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle <=60 ? 0 : 0.5};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
    }
}

export class CavalryMoveProfile {

    constructor(capacity) {
        this._capacity = capacity;
    }

    get movementPoints() {
        return 3+this._capacity;
    }

    get extendedMovementPoints() {
        return 4.5+this._capacity*1.5;
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
            case CBHex.HEXSIDE_TYPES.DIFFICULT : return {type:CBMoveProfile.COST_TYPE.ADD, value:1};
            case CBHex.HEXSIDE_TYPES.CLIMB : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
            case CBHex.HEXSIDE_TYPES.WALL : return {type:CBMoveProfile.COST_TYPE.IMPASSABLE};
        }
    }

    getRotationCost(angle) {
        if (angle<0) angle=-angle;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:angle <=60 ? 0.5 : 1};
    }

    getFormationRotationCost(angle) {
        return {type:CBMoveProfile.COST_TYPE.ADD, value:1.5};
    }
}
