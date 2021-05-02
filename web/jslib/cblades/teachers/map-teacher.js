'use strict'

import {
    CBWeather
} from "../unit.js";
import {
    diffAngle, moyAngle
} from "../../geometry.js";
import {
    CBHexId, CBHexSideId
} from "../map.js";

export class CBMapTeacher {

    getWeather() {
        return CBWeather.CLEAR;
    }

    formatMapZone(mapZone) {
        let zones = {};
        for (let zone of mapZone) {
            zones[zone[1]] = {hex:zone[0]};
        }
        return zones;
    }

    mergeMapZone(mapZoneDest, mapZoneSrc, forbiddenHexes) {
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

    getUnitAdjacentZone(unit) {
        return this.formatMapZone(unit.hexLocation.nearHexes);
    }

    getForwardZone(hexId, angle) {
        let zones = new Map();
        if (angle%60) {
            zones.set(hexId.getNearHex(angle -30), angle-30);
            zones.set(hexId.getNearHex((angle + 30) % 360), (angle + 30) % 360);
        }
        else {
            zones.set(hexId.getNearHex((angle + 300) % 360), (angle + 300) % 360);
            zones.set(hexId.getNearHex(angle), angle);
            zones.set(hexId.getNearHex((angle + 60) % 360), (angle + 60) % 360);
        }
        return zones;
    }

    getPotentialForwardZone(hexLocation, angle) {
        if (hexLocation instanceof CBHexSideId) {
            let zone1 = this.getForwardZone(hexLocation.fromHex, angle);
            let zone2 = this.getForwardZone(hexLocation.toHex, angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [hexLocation.fromHex, hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getForwardZone(hexLocation, angle));
        }
    }

    getUnitForwardZone(unit) {
        return this.getPotentialForwardZone(unit.hexLocation, unit.angle);
    }

    isHexInForwardZone(unit, unitHexId, targetHexId) {
        let attackerAngle = unit.angle;
        let hexAngle = unitHexId.isNearHex(targetHexId);
        if (hexAngle === false) return false;
        let diff = diffAngle(hexAngle, attackerAngle);
        return diff >= -60 && diff <= 60 ? hexAngle : false;
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
            zones.set(hexId.getNearHex((angle + 150) % 360), (angle + 150) % 360);
            zones.set(hexId.getNearHex((angle + 210) % 360), (angle + 210) % 360);
        }
        else {
            zones.set(hexId.getNearHex((angle + 120) % 360), (angle + 120) % 360);
            zones.set(hexId.getNearHex((angle + 180) % 360), (angle + 180) % 360);
            zones.set(hexId.getNearHex((angle + 240) % 360), (angle + 240) % 360);
        }
        return zones;
    }

    getUnitBackwardZone(unit) {
        if (unit.formationNature) {
            let zone1 = this.getBackwardZone(unit.hexLocation.fromHex, unit.angle);
            let zone2 = this.getBackwardZone(unit.hexLocation.toHex, unit.angle);
            return this.formatMapZone(this.mergeMapZone(zone1, zone2, [unit.hexLocation.fromHex, unit.hexLocation.toHex]));
        }
        else {
            return this.formatMapZone(this.getBackwardZone(unit.hexLocation, unit.angle));
        }
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

}
