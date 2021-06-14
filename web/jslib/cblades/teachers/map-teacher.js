'use strict'

import {
    CBMoveProfile,
    CBWeather
} from "../unit.js";
import {
    diffAngle, moyAngle, sumAngle
} from "../../geometry.js";
import {
    CBHex,
    CBHexSideId
} from "../map.js";

export class CBMapTeacher {

    getWeather() {
        return CBWeather.CLEAR;
    }

    getHexesFromZones(zones) {
        let hexes = new Set();
        for (let sangle in zones) {
            let angle = parseInt(sangle);
            hexes.add(zones[angle].hex);
        }
        return hexes;
    }

    get360Area(hex, range) {
        function processHex(areaMap, hex, distance) {
            if (hex && (!areaMap.has(hex) || areaMap.get(hex)>distance)) {
                areaMap.set(hex, distance);
                if (distance < range) {
                    for (let angle=0; angle<360; angle+=60) {
                        processHex(areaMap, hex.getNearHex(angle), distance + 1);
                    }
                }
            }
        }
        let areaMap = new Map();
        processHex(areaMap, hex, 0);
        let result = [];
        for (let entry of areaMap.entries()) {
            result.push({hex:entry[0], distance:entry[1]});
        }
        return result;
    }

    isHexInForwardZone(unit, unitHexId, targetHexId) {
        let attackerAngle = unit.angle;
        let hexAngle = unitHexId.isNearHex(targetHexId);
        if (hexAngle === false) return false;
        let diff = diffAngle(hexAngle, attackerAngle);
        return diff >= -60 && diff <= 60 ? hexAngle : false;
    }

    getForwardZone(hexId, angle) {
        let zones = new Map();
        if (angle%60) {
            let langle = sumAngle(angle, -30);
            zones.set(hexId.getNearHex(langle), langle);
            langle = sumAngle(angle, 30);
            zones.set(hexId.getNearHex(langle), langle);
        }
        else {
            let langle = sumAngle(angle, -60);
            zones.set(hexId.getNearHex(langle), langle);
            zones.set(hexId.getNearHex(angle), angle);
            langle = sumAngle(angle, 60);
            zones.set(hexId.getNearHex(langle), langle);
        }
        return zones;
    }

    isHexInBackwardZone(unit, unitHexId, targetHexId) {
        let attackerAngle = unit.angle;
        let hexAngle = unitHexId.isNearHex(targetHexId);
        if (hexAngle === false) return false;
        let diff = diffAngle(hexAngle, attackerAngle);
        return diff<=-120 || diff>=120 ? hexAngle : false;
    }

    getBackwardZone(hexId, angle) {
        let zones = new Map();
        if (angle%60) {
            let langle = sumAngle(angle, 150);
            zones.set(hexId.getNearHex(langle), langle);
            langle = sumAngle(angle, 210);
            zones.set(hexId.getNearHex(langle), langle);
        }
        else {
            let langle = sumAngle(angle, 120);
            zones.set(hexId.getNearHex(langle), langle);
            langle = sumAngle(angle, 180);
            zones.set(hexId.getNearHex(langle), langle);
            langle = sumAngle(angle, 240);
            zones.set(hexId.getNearHex(langle), langle);
        }
        return zones;
    }

    getForwardArea(border, angle) {
        let hexes = new Set();
        for (let hexId of border) {
            let zones = this.getForwardZone(hexId, angle);
            for (let zone of zones) {
                hexes.add(zone[0]);
            }
        }
        return hexes;
    }

    _getUnitForwardAreaFromBorder(unit, border, range) {
        let hexes = new Set();
        for (let index=0; index<range; index++) {
            border = this.getForwardArea(border, unit.angle);
            for (let hexId of border) {
                hexes.add(hexId);
            }
        }
        return [...hexes];
    }

    getUnitForwardAreaFromHex(unit, hex, range) {
        let border = [hex];
        return this._getUnitForwardAreaFromBorder(unit, border, range);
    }

    getUnitForwardArea(unit, range) {
        let border = (unit.formationNature) ? [unit.hexLocation.fromHex, unit.hexLocation.toHex] : [unit.hexLocation];
        return this._getUnitForwardAreaFromBorder(unit, border, range);
    }

    getRotationCost(unit, angle, hex=unit.hexLocation, orientation=unit.angle) {
        return unit.moveProfile.getRotationCost(diffAngle(orientation, angle));
    }

    _mergeCosts(cost1, cost2) {
        if (cost1.type === CBMoveProfile.COST_TYPE.SET) return cost1;
        if (cost1.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return cost1;
        if (cost2.type === CBMoveProfile.COST_TYPE.IMPASSABLE) return cost2;
        if (cost1.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) return cost1;
        if (cost2.type === CBMoveProfile.COST_TYPE.MINIMAL_MOVE) return cost2;
        return {type:CBMoveProfile.COST_TYPE.ADD, value:cost1.value+cost2.value};
    }

    getMovementCost(unit, angle, hex=unit.hexLocation, orientation=unit.angle) {
        let targetHex = hex.getNearHex(angle);
        return this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(hex.to(targetHex)),
            unit.moveProfile.getMovementCostOnHex(targetHex)
        );
    }

    getFormationRotationCost(unit, angle, orientation=unit.angle) {
        return unit.moveProfile.getFormationRotationCost(diffAngle(orientation, angle));
    }

    getFormationMovementCost(unit, angle, hexSide=unit.hexLocation) {
        let fromHexTarget = hexSide.fromHex.getNearHex(angle);
        let fromHexCost = this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(hexSide.fromHex.to(fromHexTarget)),
            unit.moveProfile.getMovementCostOnHex(fromHexTarget)
        );
        let toHexTarget = hexSide.toHex.getNearHex(angle);
        let toHexCost = this._mergeCosts(
            unit.moveProfile.getMovementCostOnHex(toHexTarget),
            unit.moveProfile.getMovementCostOnHexSide(hexSide.toHex.to(toHexTarget))
        );
        return fromHexCost.type>toHexCost.type ? fromHexCost : toHexCost;
    }

    getFormationTurnCost(unit, angle, hexSide=unit.hexLocation) {
        let turnMove = hexSide.turnMove(angle);
        return this._mergeCosts(
            unit.moveProfile.getMovementCostOnHexSide(turnMove),
            unit.moveProfile.getMovementCostOnHex(turnMove.toHex)
        );
    }

    canCross(unit, fromHex, toHex) {
        let cost = unit.moveProfile.getMovementCostOnHexSide(fromHex.to(toHex));
        return cost && cost.type !== CBMoveProfile.COST_TYPE.IMPASSABLE;
    }

    _filterUnitZone(unit, fromHex, mapZone) {
        let result = new Map();
        for (let zone of mapZone) {
            if (this.canCross(unit, fromHex, zone[0])) {
                result.set(zone[0], zone[1])
            }
        }
        return result;
    }

    _formatUnitZone(mapZone) {
        let zones = {};
        for (let zone of mapZone) {
            zones[zone[1]] = {hex: zone[0]};
        }
        return zones;
    }

    _mergeUnitZone(mapZoneDest, mapZoneSrc, forbiddenHexes) {
        let forbidden = new Set(forbiddenHexes);
        for (let zone of mapZoneSrc) {
            let current = mapZoneDest.get(zone[0]);
            if (current !== undefined) {
                mapZoneDest.set(zone[0], moyAngle(current, zone[1]));
            }
            else {
                mapZoneDest.set(zone[0], zone[1]);
            }
        }
        for (let hex of forbiddenHexes) {
            mapZoneDest.delete(hex);
        }
        return mapZoneDest;
    }

    getPotentialForwardZone(unit, hexLocation, angle) {
        if (hexLocation instanceof CBHexSideId) {
            let zone1 = this._filterUnitZone(unit, hexLocation.fromHex, this.getForwardZone(hexLocation.fromHex, angle));
            let zone2 = this._filterUnitZone(unit, hexLocation.toHex, this.getForwardZone(hexLocation.toHex, angle));
            return this._formatUnitZone(this._mergeUnitZone(zone1, zone2, [hexLocation.fromHex, hexLocation.toHex]));
        }
        else {
            return this._formatUnitZone(this._filterUnitZone(unit, hexLocation, this.getForwardZone(hexLocation, angle)));
        }
    }

    getUnitForwardZone(unit) {
        return this.getPotentialForwardZone(unit, unit.hexLocation, unit.angle);
    }

    getPotentialBackwardZone(unit, hexLocation, angle) {
        if (hexLocation instanceof CBHexSideId) {
            let zone1 = this._filterUnitZone(unit, hexLocation.fromHex, this.getBackwardZone(hexLocation.fromHex, angle));
            let zone2 = this._filterUnitZone(unit, hexLocation.toHex, this.getBackwardZone(hexLocation.toHex, angle));
            return this._formatUnitZone(this._mergeUnitZone(zone1, zone2, [hexLocation.fromHex, hexLocation.toHex]));
        }
        else {
            return this._formatUnitZone(this._filterUnitZone(unit, hexLocation, this.getBackwardZone(hexLocation, angle)));
        }
    }

    getUnitBackwardZone(unit) {
        return this.getPotentialBackwardZone(unit, unit.hexLocation, unit.angle);
    }

    getAdjacentHexes(unit, hexLocation) {
        let hexes = new Map();
        for (let fromHexId of hexLocation.hexes) {
            let nearHexes = fromHexId.nearHexes;
            for (let [toHexId, angle] of nearHexes) {
                if (!hexLocation.hasHex(toHexId) && this.canCross(unit, fromHexId, toHexId)) {
                    let pangle = hexes.get(toHexId);
                    hexes.set(toHexId, pangle!==undefined ? moyAngle(pangle, angle) : angle);
                }
            }
        }
        return hexes;
    }

    getUnitAdjacentZone(unit) {
        return this._formatUnitZone(this.getAdjacentHexes(unit, unit.hexLocation));
    }

    isClearGround(hexId) {
        return hexId.type === CBHex.HEX_TYPES.OUTDOOR_CLEAR ||
            hexId.type === CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE ||
            hexId.type === CBHex.HEX_TYPES.CAVE_CLEAR ||
            hexId.type === CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
    }

    isClearHexSide(hexSideId) {
        return hexSideId.type === CBHex.HEXSIDE_TYPES.NORMAL ||
            hexSideId.type === CBHex.HEXSIDE_TYPES.EASY;
    }

    isRoughGround(hexId) {
        return hexId.type === CBHex.HEX_TYPES.OUTDOOR_ROUGH ||
            hexId.type === CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE ||
            hexId.type === CBHex.HEX_TYPES.CAVE_ROUGH ||
            hexId.type === CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
    }

    isDifficultGround(hexId) {
        return hexId.type === CBHex.HEX_TYPES.OUTDOOR_DIFFICULT ||
            hexId.type === CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE ||
            hexId.type === CBHex.HEX_TYPES.CAVE_DIFFICULT ||
            hexId.type === CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
    }

    isDifficultHexSide(hexSideId) {
        return hexSideId.type === CBHex.HEXSIDE_TYPES.DIFFICULT;
    }

    isImpassableHexSide(hexSideId) {
        return hexSideId.type === CBHex.HEXSIDE_TYPES.CLIMB ||
            hexSideId.type === CBHex.HEXSIDE_TYPES.WALL;
    }
}
