'use strict'

import {
    atan2, sumAngle, diffAngle, invertAngle
} from "../geometry.js";
import {
    AVLTree
} from "../mechanisms.js";
import {
    CBHexId, CBHexSideId, distanceFromHexToHex
} from "./map.js";

function key(hexLocation, angle) {
    return hexLocation.location.toString()+"-"+angle;
}

export class CBAbstractPathFinding {

    constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
        this._search = this._createSearchTree();
        this._processed = new Map();
        this._costMove = costMove;
        this._costRotate = costRotate;
        this._start = start;
        this._startAngle = startAngle;
        this._maxCost = maxCost;
        this._minimalCost = minimalCost;
        this._arrivals = arrivals;
        this._accessibleHexes = this._getAccessibleHexes();
        this._records = new Map();
    }

    _createSearchTree() {
        return new AVLTree((rec1, rec2)=> {
            let result = rec1.distance + rec1.cost - rec2.distance - rec2.cost;
            if (result) return result;
            result = rec1.distance - rec2.distance;
            if (result) return result;
            result = rec1.angle - rec2.angle;
            if (result) return result;
            result = rec1.hexLocation.location.x - rec2.hexLocation.location.x;
            if (result) return result;
            return rec1.hexLocation.location.y - rec2.hexLocation.location.y;
        });
    }

    _registerArrivals() {
        for (let arrival of this._arrivals) {
            this._registerRecord(arrival.hexLocation, arrival.angle, 0, null);
        }
    }

    _registerProcessed(record) {
        let key = record.hexLocation.location.toString();
        let oldRecord = this._processed.get(key);
        if (!oldRecord  || oldRecord.cost>record.cost) {
            this._processed.set(key, record);
        }
    }

    get start() {
        return this._start;
    }

    getProcessedRecord(hexLocation) {
        let key = hexLocation.location.toString();
        return this._processed.get(key);
    }

    _getAccessibleHexes() {
        console.assert(this._arrivals.length>0);
        let result = new Set();
        for (let arrival of this._arrivals) {
            if (arrival.hexLocation instanceof CBHexId) {
                result.add(arrival.hexLocation);
            }
            else {
                result.add(arrival.hexLocation.fromHex);
                result.add(arrival.hexLocation.toHex);
            }
        }
        return result;
    }

    _distanceFromHexLocationToZone(start, arrivals) {
        let min = this._distanceBetweenLocations(start, arrivals[0].hexLocation);
        for (let index=1; index<arrivals.length; index++) {
            let distance = this._distanceBetweenLocations(start, arrivals[index].hexLocation);
            if (distance<min) min=distance;
        }
        return min;
    }

    /*
    _printRecords() {
        for (let record of this._records.values()) {
            console.log(key(record.hexLocation, record.angle)+" => "+record.cost+" ("+record.distance+")");
        }
    }

    _printPath(hexLocation, angle) {
        let record = this._records.get(key(hexLocation, angle));
        while (record) {
            console.log(record.hexLocation.toString()+" => "+record.cost+" ("+record.distance+")");
            record = record.previous;
        }
    }
     */

    _isAccessible(hex) {
        return hex.onMap || this._accessibleHexes.has(hex) || this._start.hasHex(hex);
    }

    _registerRecord(hexLocation, angle, cost, previous) {
        let record = this._records.get(key(hexLocation, angle));
        if (record) {
            if (record.cost>cost) {
                this._search.delete(record);
                record.cost = cost;
                record.angle = angle;
                record.previous = previous;
                record.steps = previous?previous.steps+1:0;
                this._search.insert(record);
            }
        }
        else {
            let distance = this._computeDistance(hexLocation, angle);
            if (this._maxCost<0 || cost + distance <= this._maxCost) {
                record = {hexLocation: hexLocation, cost, angle, distance, steps:previous?previous.steps+1:0, previous};
                this._records.set(key(hexLocation, angle), record);
                this._search.insert(record);
            }
        }
    }

    getRecord(hexLocation, angle) {
        return this._records.get(key(hexLocation, angle));
    }

    getStartRecord() {
        return this.getRecord(this._start, this._startAngle);
    }

}

export function forwardMixin(clazz) {

    return class extends clazz {

        _computeDistance(hexLocation, angle) {
            return this._distanceFromHexLocationToZone(hexLocation, this._arrivals) * this._minimalCost;
        }

        computePath() {
            let _startTime = new Date().getTime();
            this._registerRecord(this._start, this._startAngle,0, null);
            let count = 0;
            while (this._search.size) {
                count++;
                let record = this._search.shift();
                //console.log(record.hexLocation.toString()+" => c:"+record.cost+" d:"+record.distance);
                this._registerProcessed(record);
                if (this._stopPredicate(record)) break;
                let options = this.collectOptions(record.hexLocation, record.angle);
                for (let option of options) {
                    let cost = this.getCost(record, record.hexLocation, record.angle, option.hexLocation, option.angle);
                    if (cost !== null) {
                        this._registerRecord(option.hexLocation, option.angle, record.cost + cost, record);
                    }
                }
            }
            let time = new Date().getTime() - _startTime;
            //console.log("Time elapsed for computeBackward: "+time+", records registered: "+count+".");
        }

    }

}

export function backwardMixin(clazz) {

    return class extends clazz {

        _computeDistance(hexLocation, angle) {
            return this._distanceBetweenLocations(hexLocation, this._start) * this._minimalCost;
        }

       computePath() {
            let _startTime = new Date().getTime();
            this._registerArrivals();
            let target = new Set(this._start.hexes);
            let count = 0;
            while (this._search.size) {
                count++;
                let record = this._search.shift();
                //console.log(record.hexLocation.toString()+" => c:"+record.cost+" d:"+record.distance+" a:"+record.angle);
                this._registerProcessed(record);
                if (this._stopPredicate(record)) break
                let options = this.collectOptions(record.hexLocation, record.angle);
                for (let option of options) {
                    let optionAngle = invertAngle(option.angle);
                    if (option.hexLocation.similar(this._start)) {
                        optionAngle = this._startAngle;
                    }
                    let cost = this.getCost(record, option.hexLocation, optionAngle, record.hexLocation, record.angle);
                    if (cost !== null) {
                        this._registerRecord(option.hexLocation, optionAngle, record.cost + cost, record);
                    }
                }
            }
            let time = new Date().getTime() - _startTime;
            //console.log("Time elapsed for computeBackward: "+time+", records registered: "+count+".");
        }

    }
}

export function hexPathFindingMixin(clazz) {

    return class extends clazz {

        constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
            super(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
        }

        _distanceBetweenLocations(hexId1, hexId2) {
            return distanceFromHexToHex(hexId1, hexId2);
        }

        getCost(record, from, fromAngle, to, toAngle) {
            let moveCost = from!==to ? this._costMove(from, to) : 0;
            if (moveCost === null) return null;
            let rotateCost = fromAngle !== null && toAngle !== null && fromAngle!==toAngle ? this._costRotate(from, fromAngle, toAngle) : 0;
            if (rotateCost === null) return null;
            return rotateCost + moveCost;
        }

        collectOptions(hexLocation, angle) {
            return collectHexOptions(hexLocation).filter(
                option=>this._isAccessible(option.hexLocation)
            );
        }

    }
}

export function hexSidePathFindingMixin(clazz) {

    return class extends clazz {

        constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
            super(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
        }

        _distanceBetweenLocations(hexSideId1, hexSideId2) {
            let d11 = distanceFromHexToHex(hexSideId1.fromHex, hexSideId2.fromHex);
            let d12 = distanceFromHexToHex(hexSideId1.toHex, hexSideId2.toHex);
            let d1 = d11>d12 ? d11:d12;
            let d21 = distanceFromHexToHex(hexSideId1.fromHex, hexSideId2.toHex);
            let d22 = distanceFromHexToHex(hexSideId1.toHex, hexSideId2.fromHex);
            let d2 = d21>d22 ? d21:d22;
            return d1>d2 ? d2:d1;
        }

        getCost(record, from, fromAngle, to, toAngle) {
            let cost = 0;
            if (!from.similar(to)) {
                if (from.angle !== to.angle) to = new CBHexSideId(to.toHex, to.fromHex);
                let fcost = from.hasHex(to.fromHex) ? -1 : this._costMove(from.fromHex, to.fromHex);
                let tcost = from.hasHex(to.toHex) ? -1 : this._costMove(from.toHex, to.toHex);
                if (fcost === null || tcost === null) return null;
                cost = fcost > tcost ? fcost : tcost;
            }
            if (fromAngle !== null && toAngle !== null) {
                let dangle = diffAngle(fromAngle, toAngle);
                if (dangle < -90 || dangle > 90) {
                    cost += this._costRotate(from, fromAngle, toAngle);
                }
            }
            return cost;
        }

        collectOptions(hexLocation, angle) {
            return collectHexSideOptions(hexLocation, angle).filter(
                option=>this._isAccessible(option.hexLocation.fromHex) && this._isAccessible(option.hexLocation.toHex)
            );
        }

    }

}

export function getHexSidesFromHexes(hexes) {
    let hexSet = new Set(hexes);
    let hexSides = [];
    let hexSideSet = new Set();
    for (let hex of hexSet) {
        for (let sangle of [0, 60, 120, 180, 240, 300]) {
            let angle = parseInt(sangle);
            let hexSide = hex.toward(angle);
            if (hexSet.has(hexSide.toHex)) {
                let key = hexSide.location.toString();
                if (!hexSideSet.has(key)) {
                    hexSideSet.add(key);
                    hexSides.push(hexSide);
                }
            }
        }
    }
    return hexSides;
}

export function createArrivalsFromHexes(start, hexes) {
    let result = [];
    for (let hex of hexes) {
        let diff = start.location.minusPoint(hex.location);
        let angle = Math.round(atan2(diff.x, diff.y) / 30) * 30;
        result.push({hexLocation:hex, angle})
    }
    return result;
}

export function createArrivalsFromHexSides(start, hexSides) {
    let result = [];
    for (let hexSide of hexSides) {
        let diff = start.location.minusPoint(hexSide.location);
        let hangle = Math.round(atan2(diff.x, diff.y) / 30) * 30;
        let rangle = sumAngle(hexSide.angle, 90);
        let dangle = diffAngle(hangle, rangle);
        result.push({hexLocation:hexSide, angle:(dangle < -90 || dangle > 90) ? rangle : invertAngle(rangle)})
    }
    return result;
}

export function createArrivalsHexSidesFromHexes(start, hexes) {
    return createArrivalsFromHexSides(start,[...getHexSidesFromHexes(hexes)]);
}

export function stringifyHexLocations(hexLocations) {
    if (!hexLocations) return null;
    let result = new Set();
    for (let hexLocation of hexLocations) {
        result.add(hexLocation.location.toString());
    }
    return result;
}

export function collectHexOptions(hexId) {
    let hexes = [];
    for (let angle of [0, 60, 120, 180, 240, 300]) {
        hexes.push({hexLocation: hexId.getNearHex(angle), angle:sumAngle(angle, -60)});
        hexes.push({hexLocation: hexId.getNearHex(angle), angle:sumAngle(angle, -30)});
        hexes.push({hexLocation: hexId.getNearHex(angle), angle});
        hexes.push({hexLocation: hexId.getNearHex(angle), angle:sumAngle(angle, 30)});
        hexes.push({hexLocation: hexId.getNearHex(angle), angle:sumAngle(angle, 60)});
    }
    return hexes;
}

export function collectHexSideOptions(hexSide, angle) {
    function pushOption(options, hexSide, angle) {
        options.push({hexLocation: hexSide, angle});
    }
    if (angle === null || angle === undefined) {
        angle = sumAngle(hexSide.angle, 90);
    }
    let rangle = invertAngle(angle);
    let options = [];
    pushOption.call(this, options, hexSide.moveTo(sumAngle(angle, 30)), angle);
    pushOption.call(this, options, hexSide.turnTo(sumAngle(angle, 30)), sumAngle(angle, 60));
    pushOption.call(this, options, hexSide.turnTo(sumAngle(angle, -30)), sumAngle(angle, -60));
    pushOption.call(this, options, hexSide.moveTo(sumAngle(angle, -30)), angle);
    pushOption.call(this, options, hexSide.moveTo(sumAngle(rangle, 30)), rangle);
    pushOption.call(this, options, hexSide.turnTo(sumAngle(rangle, 30)), sumAngle(rangle, 60));
    pushOption.call(this, options, hexSide.turnTo(sumAngle(rangle, -30)), sumAngle(rangle, -60));
    pushOption.call(this, options, hexSide.moveTo(sumAngle(rangle, -30)), rangle);
    return options;
}

export function getHexSidesExtendingHexes(hexes) {
    let hexSet = new Set(hexes);
    let hexSides = [];
    let hexSideSet = new Set();
    for (let hex of hexSet) {
        for (let sangle of [0, 60, 120, 180, 240, 300]) {
            let angle = parseInt(sangle);
            let hexSide = hex.toward(angle);
            let key = hexSide.location.toString();
            if (!hexSideSet.has(key)) {
                hexSideSet.add(key);
                hexSides.push(hexSide);
            }
        }
    }
    return hexSides;
}

export function stopWhenTargetVicinityIsCompleted(pathFinding) {
    let reachCost = null;
    pathFinding._stopPredicate = record => {
        if (reachCost !== null && record.cost + record.distance > reachCost) return true;
        if (record.distance === 0) {
            reachCost = record.cost;
        }
        return false;
    }
}

class GetGoodNextMoveHexPathFinding extends hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}
class GetGoodNextMoveHexSidePathFinding extends hexSidePathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}
export function getGoodNextMoves({
     start, startAngle, arrivals,
     costMove, costRotate,
     minimalCost,
     costGetter = record=>record.cost,
     maxCost = -1,
     withAngle = false
 }) {
    let pathFinding = (start instanceof CBHexId) ?
        new GetGoodNextMoveHexPathFinding(
            start, startAngle,
            createArrivalsFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost) :
        new GetGoodNextMoveHexSidePathFinding(start, startAngle,
            createArrivalsHexSidesFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost);
    stopWhenTargetVicinityIsCompleted(pathFinding);
    pathFinding.computePath();
    //pathFinding._printRecords();
    let goodMoves = new Set();
    let startRecord = pathFinding.getStartRecord();
    if (!startRecord) return [];
    let cost = costGetter(startRecord);
    for (let option of pathFinding.collectOptions(startRecord.hexLocation, startRecord.angle)) {
        let record = pathFinding.getProcessedRecord(option.hexLocation);
        let firstMovementCost = pathFinding.getCost(record, start, withAngle ? startAngle:null, option.hexLocation, option.angle);
        if (firstMovementCost!==null && record && costGetter(record)+firstMovementCost<=cost) {
            goodMoves.add(option.hexLocation);
        }
    }
    return [...goodMoves];
}

class GetPathCostHexPathFinding extends hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}
class GetPathCostHexSidePathFinding extends hexSidePathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}
export function getPathCost({
    start, startAngle, arrivals,
    costMove, costRotate,
    minimalCost,
    costGetter = record=>record.cost,
    maxCost = -1
}) {
    let pathFinding = (start instanceof CBHexId) ?
        new GetPathCostHexPathFinding(
            start, startAngle,
            createArrivalsFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost) :
        new GetPathCostHexSidePathFinding(start, startAngle,
            createArrivalsHexSidesFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost);
    stopWhenTargetVicinityIsCompleted(pathFinding);
    pathFinding.computePath();
    //pathFinding._printRecords();
    let startRecord = pathFinding.getStartRecord();
    return startRecord ? costGetter(startRecord) : null;
}

export function stopWhenArrivalAreaIsCovered(pathFinding, arrivals) {
    let allArrivals = [];
    for (let arrival of arrivals) {
        allArrivals.push(...arrival.hexes);
        allArrivals.push(...arrival.nearHexes.keys());
    }
    let locationsToReach = stringifyHexLocations(pathFinding.start instanceof CBHexId ?
        new Set(allArrivals) :
        getHexSidesFromHexes(allArrivals)
    );
    let arrivalArea = [];
    pathFinding._stopPredicate = record => {
        if (locationsToReach.size === 0) {
            return true;
        }
        if (locationsToReach.delete(record.hexLocation.location.toString())) {
            arrivalArea.push(record);
        }
        return false;
    }
    return arrivalArea;
}

export function stopWhenStartNeighborhoodIsCovered(pathFinding) {
    let locationsToReach = stringifyHexLocations(pathFinding.start instanceof CBHexId ?
        new Set(pathFinding._start.nearHexes.keys()) :
        getHexSidesFromHexes(pathFinding._start.nearHexes.keys())
    );
    let neighborhood = [];
    pathFinding._stopPredicate = record => {
        if (locationsToReach.size === 0) {
            return true;
        }
        if (locationsToReach.delete(record.hexLocation.location.toString())) {
            neighborhood.push(record);
        }
        return false;
    }
    return neighborhood;
}

class GetArrivalAreaCostsHexPathFinding extends hexPathFindingMixin(forwardMixin(CBAbstractPathFinding)) {}
class GetArrivalAreaCostsHexSidePathFinding extends hexSidePathFindingMixin(forwardMixin(CBAbstractPathFinding)) {}
export function getArrivalAreaCosts({
    start, startAngle, arrivals,
    costMove, costRotate,
    minimalCost,
    costGetter = record=>record.cost,
    maxCost = -1
}) {
    function getCostToReach(result, arrivals) {
        let minCost = -1;
        for (let arrival of arrivals) {
            let cost = result.get(arrival);
            if (cost !== null && (minCost < 0 || minCost > cost)) {
                minCost = cost;
            }
        }
        return minCost;
    }

    let pathFinding = (start instanceof CBHexId) ?
        new GetArrivalAreaCostsHexPathFinding(start, startAngle,
            createArrivalsFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost) :
        new GetArrivalAreaCostsHexSidePathFinding(start, startAngle,
            createArrivalsHexSidesFromHexes(start, arrivals),
            costMove, costRotate, minimalCost, maxCost);
    let locations = stopWhenArrivalAreaIsCovered(pathFinding, arrivals);
    pathFinding.computePath();
    let result = new Map();
    for (let record of locations) {
        for (let hexId of record.hexLocation.hexes) {
            let cost = result.get(hexId);
            if (cost === undefined || cost>costGetter(record)) {
                result.set(hexId, costGetter(record));
            }
        }
    }
    return {cost:getCostToReach(result, arrivals), hexes:result};
}

class GetPathCostToRangeHexPathFinding extends hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}
class GetPathCostToRangeHexSidePathFinding extends hexSidePathFindingMixin(backwardMixin(CBAbstractPathFinding)) {}

export function getInRangeMoves({
     start, startAngle, arrivals,
     costMove, costRotate,
     minimalCost,
     range,
     costGetter = record=>record.cost,
     maxCost
 }) {
    let finder = new CBDistanceFinder(start, arrivals, maxCost, range);
    let pathFinding = (start instanceof CBHexId) ?
        new GetPathCostToRangeHexPathFinding(
            start, startAngle,
            finder.findHexes(),
            costMove, costRotate, minimalCost, maxCost) :
        new GetPathCostToRangeHexSidePathFinding(
            start, startAngle,
            finder.findHexSides(),
            costMove, costRotate, minimalCost, maxCost);
    stopWhenStartNeighborhoodIsCovered(pathFinding)
    pathFinding.computePath();
    //pathFinding._printRecords();
    let allowedMoves = [];
    let startRecord = pathFinding.getStartRecord();
    for (let option of pathFinding.collectOptions(startRecord.hexLocation, startRecord.angle)) {
        let record = pathFinding.getProcessedRecord(option.hexLocation);
        if (record) {
            let firstMovementCost = pathFinding.getCost(record, start, startAngle, option.hexLocation, option.angle);
            if (firstMovementCost !== null && costGetter(record) + firstMovementCost <= maxCost) {
                allowedMoves.push(option.hexLocation);
            }
        }
    }
    return allowedMoves;
}

export class CBLineOfSight {

    constructor(startHex, targetHex) {
        this._path = this._buildPath(startHex, targetHex);
    }

    _buildPath(startHex, targetHex) {
        let angle = atan2(targetHex.location.x-startHex.location.x, targetHex.location.y-startHex.location.y);
        if (angle%60 === 0) {
            return this._buildStraitPath(angle, startHex, targetHex);
        }
        else if (angle%30 === 0) {
            return this._buildSidePath(angle, startHex, targetHex);
        }
        else {
            return this._buildNormalPath(angle, startHex, targetHex);
        }
    }

    _buildStraitPath(angle, startHex, targetHex) {
        let path = [[startHex]];
        while (startHex !== targetHex) {
            startHex = startHex.getNearHex(angle);
            path.push([startHex]);
        }
        return path;
    }

    _buildNormalPath(angle, startHex, targetHex) {
        let path = [[startHex]];
        let diffAngle = 0;
        while (startHex !== targetHex) {
            let nextAngle = atan2(targetHex.location.x-startHex.location.x, targetHex.location.y-startHex.location.y);
            let minAngle = Math.floor(nextAngle/60)*60;
            let maxAngle = Math.ceil(nextAngle/60)*60;
            let chosenAngle;
            if (Math.abs(diffAngle+minAngle-angle)>=Math.abs(diffAngle+maxAngle-angle)) {
                diffAngle +=maxAngle-angle;
                chosenAngle = maxAngle;
            }
            else {
                diffAngle +=minAngle-angle;
                chosenAngle = minAngle;
            }
            if (chosenAngle===360) chosenAngle = 0;
            startHex = startHex.getNearHex(chosenAngle);
            path.push([startHex]);
        }
        return path;
    }

    _buildSidePath(angle, startHex, targetHex) {
        let path = [[startHex]];
        while (startHex !== targetHex) {
            let nextAngle = Math.round(angle/60)*60;
            let hex1 = startHex.getNearHex(Math.floor(angle/60)*60);
            let hex2 = startHex.getNearHex(sumAngle(angle, 30));
            path.push([hex1, hex2]);
            startHex = hex1.getNearHex(sumAngle(angle, 30));
            path.push([startHex]);
        }
        return path;
    }

    getPath() {
        return this._path;
    }
}

export class CBDistanceFinder {

    constructor(start, arrivals, distanceFromStart, distanceFromArrival) {
        this._start = start;
        this._arrivals = arrivals;
        this._distanceFromStart = distanceFromStart;
        this._distanceFromArrival = distanceFromArrival;
    }

    _createSearchTree() {
        return new AVLTree((rec1, rec2)=> {
            let result = rec1.startDistance + rec1.arrivalDistance - rec2.startDistance - rec2.arrivalDistance;
            if (result) return result;
            result = rec1.arrivalDistance - rec2.arrivalDistance;
            if (result) return result;
            result = rec1.hex.col - rec2.hex.col;
            if (result) return result;
            return rec1.hex.row - rec2.hex.row;
        });
    }

    _registerRecord(hex, startHex, arrivalHex) {
        let record = this._records.get(hex);
        if (!record) {
            let startDistance = distanceFromHexToHex(hex, startHex);
            if (startDistance<=this._distanceFromStart) {
                let arrivalDistance = distanceFromHexToHex(hex, arrivalHex);
                if (startDistance + arrivalDistance <= this._distanceFromStart + this._distanceFromArrival) {
                    record = {hex, startDistance, arrivalDistance, arrivalHex};
                    this._records.set(hex, record);
                    this._search.insert(record);
                    if (arrivalDistance <= this._distanceFromArrival) {
                        this._result.set(hex, record);
                    }
                }
            }
        }
    }

    _findHexesForACouple(startHex, arrivalHex) {
        this._search = this._createSearchTree();
        this._records = new Map();
        this._result = new Map();
        let startTime = new Date().getTime();
        this._registerRecord(startHex, startHex, arrivalHex);
        let count = 0;
        while (this._search.size) {
            count++;
            let record = this._search.shift();
            for (let angle=0; angle<=300; angle+=60) {
                let hex = record.hex.getNearHex(angle);
                this._registerRecord(hex, startHex, arrivalHex);
            }
        }
        let time = new Date().getTime() - startTime;
        //console.log("Time to resolve: "+time);
        return this._result;
    }

    getAngles(startHex, arrivalHex) {
        let startLocation = startHex.location;
        let arrivalLocation = arrivalHex.location;
        let angleMin = (Math.floor(atan2(arrivalLocation.x-startLocation.x, arrivalLocation.y-startLocation.y)/60)*60)%360;
        let angleMax = (Math.ceil(atan2(arrivalLocation.x-startLocation.x, arrivalLocation.y-startLocation.y)/60)*60)%360;
        return angleMin===angleMax ?
            new Set([
                sumAngle(angleMin, -60), sumAngle(angleMin, -30),
                angleMin,
                sumAngle(angleMin, 30),sumAngle(angleMin, 60)]) :
            new Set([angleMin, sumAngle(angleMin, 30), angleMax]);
    }

    _findHexes() {
        let allRecords = new Map();
        for (let startHex of this._start.hexes) {
            for (let arrival of this._arrivals) {
                for (let arrivalHex of arrival.hexes) {
                    if (distanceFromHexToHex(startHex, arrivalHex)<=this._distanceFromStart+this._distanceFromArrival) {
                        let records = this._findHexesForACouple(startHex, arrivalHex);
                        for (let record of records.values()) {
                            let angles = this.getAngles(record.hex, record.arrivalHex);
                            if (angles !==null) {
                                let currentRecord = allRecords.get(record.hex);
                                if (currentRecord) {
                                    for (let angle of angles) {
                                        currentRecord.angles.add(angle);
                                    }
                                }
                                else {
                                    currentRecord = {hex:record.hex, angles};
                                    allRecords.set(record.hex, currentRecord);
                                }
                            }
                        }
                    }
                }
            }
        }
        return allRecords;
    }

    findHexes() {
        let result = [];
        let allRecords = this._findHexes();
        for (let record of allRecords.values()) {
            for (let angle of record.angles) {
                result.push({hexLocation: record.hex, angle});
            }
        }
        return result;
    }

    findHexSides() {
        function findForAHex(result, record, angle) {
            let nearHex = record.hex.getNearHex(sumAngle(angle, 90));
            let nearRecord = allRecords.get(nearHex);
            if (nearRecord && nearRecord.angles.has(angle)) {
                let hexSide = new CBHexSideId(record.hex, nearRecord.hex);
                result.push({hexLocation:hexSide, angle});
            }
        }

        let result = [];
        let allRecords = this._findHexes();
        for (let record of allRecords.values()) {
            for (let angle of record.angles) {
                if ((angle % 60) === 30)
                findForAHex(result, record, angle);
            }
        }
        return result;
    }

}