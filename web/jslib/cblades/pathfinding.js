'use strict'

import {
    atan2, sumAngle, diffAngle, invertAngle, isAngleBetween
} from "../geometry.js";
import {
    AVLTree
} from "../mechanisms.js";
import {
    CBHexId, CBHexSideId,
    distanceFromHexLocationToHexLocation
} from "./map.js";

export class CBAbstractPathFinding {

    constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
        this._search = this._createSearchTree();
        //this._processed = new Map();
        this._costMove = costMove;
        this._costRotate = costRotate;
        this._start = start;
        this._startAngle = startAngle;
        this._maxCost = maxCost;
        this._minimalCost = minimalCost;
        this._arrivals = arrivals;
        this._arrivalsSet = this._getArrivalsSet();
    }

    _createSearchTree() {
        return new AVLTree((rec1, rec2)=> {
            let result = rec1.distance + rec1.cost - rec2.distance - rec2.cost;
            if (result) return result;
            result = rec1.distance - rec2.distance;
            if (result) return result;
            result = rec1.cost - rec2.cost;
            if (result) return result;
            result = rec1.hexLocation.location.x - rec2.hexLocation.location.x;
            if (result) return result;
            return rec1.hexLocation.location.y - rec2.hexLocation.location.y;
        });
    }

    _getArrivalsSet() {
        if (this._arrivals.length===0) return new Set();
        if (this._arrivals[0] instanceof CBHexId) return new Set(this._arrivals)
        return getHexesFromHexSides(this._arrivals);
    }

    _distanceFromHexLocationToZone(start, arrivals) {
        let min = distanceFromHexLocationToHexLocation(start, arrivals[0]);
        for (let index=1; index<arrivals.length; index++) {
            let distance = distanceFromHexLocationToHexLocation(start, arrivals[index]);
            if (distance<min) min=distance;
        }
        return min;
    }

    _printRecords() {
        for (let record of this._records.values()) {
            console.log(record.hexLocation.toString()+" => "+record.cost+" ("+record.distance+")");
        }
    }

    _isAccessible(hex) {
        return hex.onMap || this._arrivalsSet.has(hex) || this._start.hasHex(hex);
    }

    getRecord(hexLocation) {
        return this._records.get(hexLocation.location.toString());
    }

    getStartRecord() {
        return this.getRecord(this._start);
    }

}

function forwardMixin(clazz) {

    return class extends clazz {

        _registerRecord(hexLocation, angle, cost, angleRange, previous) {
            let record = this._records.get(hexLocation.location.toString());
            if (record) {
                if (record.cost>cost) {
                    this._search.delete(record);
                    record.cost = cost;
                    record.angle = angle;
                    record.previous = previous;
                    record.steps = previous?previous.steps+1:0;
                    record.angleRange = angleRange;
                    this._search.insert(record);
                }
            }
            else {
                let distance = this._distanceFromHexLocationToZone(hexLocation, this._arrivals) * this._minimalCost;
                if (this._maxCost<0 || cost + distance <= this._maxCost) {
                    let record = {hexLocation: hexLocation, cost, angle, distance, previous, steps: previous?previous.steps+1:0, angleRange};
                    this._records.set(hexLocation.location.toString(), record);
                    this._search.insert(record);
                }
            }
        }

        computePath() {
            let _startTime = new Date().getTime();
            this._records = new Map();
            this._registerRecord(this._start, this._startAngle,0, null);
            let count = 0;
            while (this._search.size) {
                count++;
                let record = this._search.shift();
                //console.log(record.hexLocation.toString()+" => c:"+record.cost+" d:"+record.distance);
                //this._processed.set(record.hexLocation.location.toString(), record);
                if (this._stopPredicate(record)) break;
                let options = this.collectOptions(record.hexLocation, record.angle);
                for (let option of options) {
                    let angleRange = this._getAngleRange(option.angle, record);
                    let angle = angleRange && record.angle!==null ? record.angle : option.angle;
                    let cost = this.getCost(record, record.hexLocation, record.angle, option.hexLocation, angle, angleRange);
                    if (cost !== null) {
                        if (angleRange === null) angleRange = this._getAngleRange(option.angle, null);
                        this._registerRecord(option.hexLocation, angle, record.cost + cost, angleRange, record);
                    }
                }
            }
            let time = new Date().getTime() - _startTime;
            console.log("Time elapsed for computeBackward: "+time+", records registered: "+count+".");
        }

    }

}

function backwardMixin(clazz) {

    return class extends clazz {

        _registerRecord(hexLocation, angle, cost, angleRange, previous) {
            let record = this._records.get(hexLocation.location.toString());
            if (record) {
                if (record.cost>cost) {
                    this._search.delete(record);
                    record.cost = cost;
                    record.angle = angle;
                    record.previous = previous;
                    record.steps = previous?previous.steps+1:0;
                    record.angleRange = angleRange;
                    this._search.insert(record);
                }
            }
            else {
                let distance = distanceFromHexLocationToHexLocation(hexLocation, this._start) * this._minimalCost;
                if (this._maxCost<0 || cost + distance <= this._maxCost) {
                    record = {hexLocation: hexLocation, cost, angle, distance, angleRange, steps:previous?previous.steps+1:0, previous};
                    this._records.set(hexLocation.location.toString(), record);
                    this._search.insert(record);
                }
            }
        }

        computePath() {
            let _startTime = new Date().getTime();
            this._records = new Map();
            this._registerArrivals();
            let target = new Set(this._start.hexes);
            let count = 0;
            while (this._search.size) {
                count++;
                let record = this._search.shift();
                //this._processed.set(record.hexLocation.location.toString(), record);
                if (this._stopPredicate(record)) break
                let options = this.collectOptions(record.hexLocation, record.angle);
                for (let option of options) {
                    let optionAngle = invertAngle(option.angle);
                    let angleRange = this._getAngleRange(optionAngle, record);
                    let angle = angleRange && record.angle!==null ? record.angle : optionAngle;
                    let cost = this.getCost(record, option.hexLocation, angle, record.hexLocation, record.angle);
                    if (cost !== null) {
                        this._registerRecord(option.hexLocation, angle, record.cost + cost, angleRange, record);
                    }
                }
            }
            let time = new Date().getTime() - _startTime;
            console.log("Time elapsed for computeBackward: "+time+", records registered: "+count+".");
        }

    }
}

function hexPathFindingMixin(clazz) {

    return class extends clazz {

        constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
            super(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
        }

        get hexNature() {
            return true;
        }

        _registerArrivals() {
            for (let hexLocation of this._arrivals) {
                this._registerRecord(hexLocation, null, 0, null);
            }
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

        _getAngleRange(angle, previous) {
            if (angle === null) {
                return previous ? previous.angleRange : null;
            }
            else {
                let minAngle = angle % 60 ? sumAngle(angle, -30) : sumAngle(angle, -60);
                let maxAngle = angle % 60 ? sumAngle(angle, 30) : sumAngle(angle, 60);
                let range = [minAngle, maxAngle];
                if (previous && previous.angleRange) {
                    minAngle = isAngleBetween(minAngle, previous.angleRange) ? minAngle :
                        isAngleBetween(previous.angleRange[0], range) ? previous.angleRange[0] : null;
                    if (minAngle === null) return null;
                    maxAngle = isAngleBetween(maxAngle, previous.angleRange) ? maxAngle :
                        isAngleBetween(previous.angleRange[1], range) ? previous.angleRange[1] : null;
                    if (maxAngle === null) return null;
                }
                return [minAngle, maxAngle];
            }
        }

    }
}

function hexSidePathFindingMixin(clazz) {

    return class extends clazz {

        constructor(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost = -1) {
            super(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
        }

        get hexSideNature() {
            return true;
        }

        _registerArrivals() {
            function getRecordAngle(start, hexSide) {
                let diff = start.location.minusPoint(hexSide.location);
                let hangle = Math.round(atan2(diff.x, diff.y) / 30) * 30;
                let rangle = sumAngle(hexSide.angle, 90);
                let dangle = diffAngle(hangle, rangle);
                return (dangle < -90 || dangle > 90) ? rangle : invertAngle(rangle);
            }

            let arrivals = getHexSidesFromHexes(this._arrivals);
            for (let hexSide of arrivals) {
                this._registerRecord(hexSide, getRecordAngle(this._start, hexSide), 0, null);
            }
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

        _getAngleRange(angle, previous) {
            return null;
        }

    }

}

export function stringifyHexLocations(hexLocations) {
    if (!hexLocations) return null;
    let result = new Set();
    for (let hexLocation of hexLocations) {
        result.add(hexLocation.location.toString());
    }
    return result;
}

function collectHexOptions(hexId) {
    let hexes = [];
    for (let angle of [0, 60, 120, 180, 240, 300]) {
        hexes.push({hexLocation: hexId.getNearHex(angle), angle});
    }
    return hexes;
}

function collectHexSideOptions(hexSide, angle) {
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

export function collectHexLocationOptions(hexLocation, angle) {
    return hexLocation instanceof CBHexId ?
        collectHexOptions(hexLocation) :
        collectHexSideOptions(hexLocation, angle);
}

function getHexesFromHexSides(hexSides) {
    let hexes = new Set();
    for (let arrival of hexSides) {
        for (let hexId of arrival.hexes) {
            hexes.add(hexId);
        }
    }
    return hexes;
}

function getHexSidesFromHexes(hexes) {
    let hexSet = new Set(hexes);
    let hexSides = new Set();
    for (let hex of hexSet) {
        for (let sangle of [0, 60, 120, 180, 240, 300]) {
            let angle = parseInt(sangle);
            let hexSide = hex.toward(angle);
            if (hexSet.has(hexSide.toHex)) {
                let key = hexSide;
                if (!hexSides.has(key)) {
                    hexSides.add(key);
                }
            }
        }
    }
    return hexSides;
}

function stopWhenTargetVicinityIsCompleted(pathFinding) {
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
        new GetGoodNextMoveHexPathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost) :
        new GetGoodNextMoveHexSidePathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
    stopWhenTargetVicinityIsCompleted(pathFinding);
    pathFinding.computePath();
    //pathFinding._printRecords();
    let goodMoves = [];
    let startRecord = pathFinding.getStartRecord();
    if (!startRecord) return [];
    let cost = costGetter(startRecord);
    for (let option of pathFinding.collectOptions(startRecord.hexLocation, startRecord.angle)) {
        let record = pathFinding.getRecord(option.hexLocation);
        let firstMovementCost = pathFinding.getCost(record, start, withAngle ? startAngle:null, option.hexLocation, option.angle);
        if (firstMovementCost!==null && record && costGetter(record)+firstMovementCost<=cost) {
            goodMoves.push(option.hexLocation);
        }
    }
    return goodMoves;
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
        new GetPathCostHexPathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost) :
        new GetPathCostHexSidePathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
    stopWhenTargetVicinityIsCompleted(pathFinding);
    pathFinding.computePath();
    //pathFinding._printRecords();
    let startRecord = pathFinding.getStartRecord();
    return startRecord ? costGetter(startRecord) : null;
}

function stopWhenArrivalAreaIsCovered(pathFinding, arrivals) {
    let allArrivals = [];
    for (let arrival of arrivals) {
        allArrivals.push(...arrival.hexes);
        allArrivals.push(...arrival.nearHexes.keys());
    }
    let locationsToReach = stringifyHexLocations(pathFinding.hexNature ?
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
        new GetArrivalAreaCostsHexPathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost) :
        new GetArrivalAreaCostsHexSidePathFinding(start, startAngle, arrivals, costMove, costRotate, minimalCost, maxCost);
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

class GetPathCostToRangeHexPathFinding extends hexPathFindingMixin(backwardMixin(CBAbstractPathFinding)) {
    constructor(range, ...args) {
        super(...args);
        this._range = range;
    }

    getCost(record, from, fromAngle, to, toAngle) {
        if (record.steps<this._range) {
            if (!record.previous || record.previous.steps<=this._range) return 0;
            return super.getCost(record, from, fromAngle, from, toAngle);
        }
        return super.getCost(record, from, fromAngle, to, toAngle);
    }
}
class GetPathCostToRangeHexSidePathFinding extends hexSidePathFindingMixin(backwardMixin(CBAbstractPathFinding)) {
    constructor(range, ...args) {
        super(...args);
        this._range = range;
    }

    getCost(record, from, fromAngle, to, toAngle) {
        if (record.steps<this._range) {
            if (!record.previous || record.previous.steps<this._range) return 0;
            return super.getCost(record, from, fromAngle, from, toAngle);
        }
        return super.getCost(record, from, fromAngle, to, toAngle);
    }
}

export function getInRangeMoves({
     start, startAngle, arrivals,
     costMove, costRotate,
     minimalCost,
     range,
     costGetter = record=>record.cost,
     maxCost
 }) {
    let pathFinding = (start instanceof CBHexId) ?
        new GetPathCostToRangeHexPathFinding(range, start, startAngle, arrivals, costMove, costRotate, minimalCost, -1) :
        new GetPathCostToRangeHexSidePathFinding(range, start, startAngle, arrivals, costMove, costRotate, minimalCost, -1);
    stopWhenTargetVicinityIsCompleted(pathFinding);
    pathFinding.computePath();
    //pathFinding._printRecords();
    let allowedMoves = [];
    let startRecord = pathFinding.getStartRecord();
    if (!startRecord) return [];
    let cost = costGetter(startRecord);
    for (let option of pathFinding.collectOptions(startRecord.hexLocation, startRecord.angle)) {
        let record = pathFinding.getRecord(option.hexLocation);
        let firstMovementCost = pathFinding.getCost(record, start, startAngle, option.hexLocation, option.angle);
        if (firstMovementCost!==null && record && costGetter(record)+firstMovementCost<=maxCost) {
            allowedMoves.push(option.hexLocation);
        }
    }
    return allowedMoves;
}



/*
function getHexesFormHexLocations(hexLocations) {
    if (hexLocations.length===0) return new Set();
    if (hexLocations[0] instanceof CBHexId) return new Set(hexLocations);
    return getHexesFromHexSides(hexLocations);
}

function getHexSidesFormHexLocations(hexLocations) {
    if (hexLocations.length===0) return new Set();
    if (hexLocations[0] instanceof CBHexSideId) return new Set(hexLocations);
    return getHexSidesFromHexes(hexLocations);
}

function stopWhenFound(pathFinding) {
    pathFinding._stopPredicate = record => {
        if  (record.distance === 0) {
            return true;
        }
        else {
            return false;
        }
    }
}
 */
/*
setStopPredicateToTargetAdjacentProcessing() {
    this._stopPredicate = this._stopWhenOriginAdjacentLocationsAreAllProcessed;
    return this;
}
*/

/*
_stopWhenOriginAdjacentLocationsAreAllProcessed(record) {
    if (!this._locationsToReach) {
        this._locationsToReach = new Set();
        for (let option of this.collectOptions(this._start, this._startAngle)) {
            this._locationsToReach.add(option.hexLocation.location.toString());
        }
    }
    else if (this._locationsToReach.size === 0) {
        return true;
    }
    this._locationsToReach.delete(record.hexLocation.location.toString());
    return false;
}
*/

/*
_computeForwardForAListOfTargets(targets) {
    this._start = targets.pop();
    this._computeBackward();
    while(targets.length) {
        targets = targets.filter(hexLocation => !this._processed.has(hexLocation.location.toString()));
        this._shiftOrigin(targets.pop());
    }
}
 */

/*
_shiftOrigin(hexLocation) {
    this._start = hexLocation;
    let search = this._createSearchTree();
    for (let record of this._search.forInsertList) {
        record.distance = distanceFromHexLocationToHexLocation(record.hexLocation, this._start) * this._minimalCost;
        search.insert(record);
    }
    this._search = search;
}
 */

/*
_computeBackwardForAListOfTargets(targets) {
    this._start = targets.pop();
    this._computeBackward();
    while(targets.length) {
        targets = targets.filter(hexLocation => !this._processed.has(hexLocation.location.toString()));
        this._shiftOrigin(targets.pop());
    }
}
*/

/*
getBadNextMoves(withAngle = false) {
    this._computeBackward();
    //this._printRecords();
    let goodMoves = [];
    let startRecord = this._records.get(this._start.location.toString());
    if (!startRecord) return [];
    let cost = startRecord.cost;
    for (let option of this.collectOptions(startRecord.hexLocation, startRecord.angle)) {
        let record = this._records.get(option.hexLocation.location.toString());
        let firstMovementCost = this.getCost(record, this._start, withAngle ? this._startAngle:null, option.hexLocation, option.angle);
        if (firstMovementCost===null || !record || record.cost>cost) {
            goodMoves.push(option.hexLocation);
        }
    }
    return goodMoves;
}
*/