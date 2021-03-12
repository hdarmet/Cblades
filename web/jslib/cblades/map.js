'use strict'

import {
    atan2, Point2D, Dimension2D, moyAngle, sumAngle, diffAngle
} from "../geometry.js";
import {
    DImage
} from "../draw.js";
import {
    AVLTree,
    Memento
} from "../mechanisms.js";
import {
    DElement, DImageArtifact
} from "../board.js";


export let CBMoveType = {
    FORWARD: 0,
    BACKWARD: 1
}

export class CBHexId {

    constructor(map, col, row) {
        this._map = map;
        this._col = col;
        this._row = row;
    }

    get map() {
        return this._map;
    }

    get game() {
        return this.map.game;
    }

    get col() {
        return this._col;
    }

    get row() {
        return this._row;
    }

    get location() {
        let position = this.map.findPosition(this);
        return this.map.getLocation(position);
    }

    get hex() {
        return this._map._hex(this._col, this._row);
    }

    similar(hexId) {
        return this.location.equalsTo(hexId.location);
    }

    isNearHex(hexId) {
        return this._map.isNearHex(this, hexId);
    }

    getNearHex(angle) {
        return this._map.findNearHex(this, angle);
    }

    getNearHexSide(angle) {
        let hex1 = this._map.findNearHex(this, sumAngle(angle, 30));
        let hex2 = this._map.findNearHex(this, sumAngle(angle, -30));
        return new CBHexSideId(hex1, hex2);
    }

    getAngle(hexId) {
        let loc1 = this.location;
        let loc2 = hexId.location;
        return atan2(loc2.x-loc1.x, loc2.y-loc1.y);
    }

    _addUnit(unit) {
        this.hex.addUnit(unit);
    }

    _removeUnit(unit) {
        this.hex.removeUnit(unit);
    }

    _appendUnit(unit, moveType) {
        this.hex.appendUnit(unit, moveType);
    }

    _deleteUnit(unit) {
        this.hex.deleteUnit(unit);
    }

    get units() {
        return this.hex.units;
    }

    _addPlayable(playable) {
        this.hex.addPlayable(playable);
    }

    _removePlayable(playable) {
        this.hex.removePlayable(playable);
    }

    _appendPlayable(playable) {
        this.hex.appendPlayable(playable);
    }

    _deletePlayable(playable) {
        this.hex.deletePlayable(playable);
    }

    get playables() {
        return this.hex.playables;
    }

    get allCounters() {
        let counters = [...this.playables];
        for (let unit of this.units) {
            counters.push(...unit.counters);
        }
        return counters;
    }

    // TODO : add map ref
    toString() {
        return "Hex("+this._col+", "+this._row+")";
    }

    hasHex(hexId) {
        return this === hexId;
    }

    getHexSide(angle) {
        return new CBHexSideId(this, this.getNearHex(angle));
    }

}

export class CBHexSideId {

    constructor(hexId1, hexId2) {
        this._fromHex = hexId1;
        this._toHex = hexId2;
    }

    static equals(hexSide1, hexSide2) {
        if (!hexSide1 && hexSide2 || hexSide1 && !hexSide2) return false;
        if (!hexSide1) return true;
        return hexSide1.fromHex === hexSide2.fromHex && hexSide1.toHex === hexSide2.toHex;
    }

    get fromHex() {
        return this._fromHex;
    }

    get toHex() {
        return this._toHex;
    }

    get location() {
        let loc1 = this._fromHex.location;
        let loc2 = this._toHex.location;
        return new Point2D((loc1.x+loc2.x)/2, (loc1.y+loc2.y)/2);
    }

    get angle() {
        return this._fromHex.getAngle(this._toHex);
    }

    get map() {
        return this._fromHex.map;
    }

    get game() {
        return this.map.game;
    }

    getFaceHex(angle) {
        return this.map.findFaceHex(this, angle);
    }

    getOtherHex(hexId) {
        console.assert(hexId===this._fromHex || hexId === this._toHex);
        return hexId===this._fromHex ? this._toHex :this._fromHex;
    }

    similar(hexSideId) {
        return this.location.equalsTo(hexSideId.location);
    }

    isNearHex(hexId) {
        let angle1 = this.map.isNearHex(this.fromHex, hexId);
        let angle2 = this.map.isNearHex(this.toHex, hexId);
        if (angle1===false && angle2===false) return false;
        if (angle1===false) return angle2;
        if (angle2===false) return angle1;
        return moyAngle(angle1, angle2);
    }

    hasHex(hexId) {
        return this._fromHex === hexId || this._toHex === hexId;
    }

    _addUnit(unit) {
        this.toHex._addUnit(unit);
        this.fromHex._addUnit(unit);
    }

    _removeUnit(unit) {
        this.toHex._removeUnit(unit);
        this.fromHex._removeUnit(unit);
    }

    _appendUnit(unit) {
        this.toHex._appendUnit(unit);
        this.fromHex._appendUnit(unit);
    }

    _deleteUnit(unit) {
        this.toHex._deleteUnit(unit);
        this.fromHex._deleteUnit(unit);
    }

    get units() {
        return [...new Set([...this.toHex.units, ...this.fromHex.units])];
    }

    _addPlayable(playable) {
        this.toHex._addPlayable(playable);
        this.fromHex._addPlayable(playable);
    }

    _removePlayable(playable) {
        this.toHex._removePlayable(playable);
        this.fromHex._removePlayable(playable);
    }

    _appendPlayable(playable) {
        this.toHex._appendPlayable(playable);
        this.fromHex._appendPlayable(playable);
    }

    _deletePlayable(playable) {
        this.toHex._deletePlayable(playable);
        this.fromHex._deletePlayable(playable);
    }

    turnTo(hex, angle) {
        let pivot = this.getOtherHex(hex);
        let newHex = hex.getNearHex(angle);
        return new CBHexSideId(pivot, newHex);
    }

    toString() {
        return `Hexside(${this.fromHex}, ${this.toHex})`;
    }

    get playables() {
        return [...new Set([...this.toHex.playables, ...this.fromHex.playables])];
    }

}

export class CBHexVertexId {

    constructor(hexId1, hexId2, hexId3) {
        this._hexId1 = hexId1;
        this._hexId2 = hexId2;
        this._hexId3 = hexId3;
    }

    get fromHex() {
        return this._hexId1;
    }

    get toHexSide() {
        return new CBHexSideId(this._hexId2, this._hexId3);
    }

    get location() {
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        let loc3 = this._hexId3.location;
        return new Point2D((loc1.x+loc2.x+loc3.x)/3, (loc1.y+loc2.y+loc3.y)/3);
    }

    get angle() {
        let loc1 = this._hexId1.location;
        let loc2 = this._hexId2.location;
        let loc3 = this._hexId3.location;
        return atan2((loc2.x+loc3.x)/2-loc1.x, (loc2.y+loc3.y)/2-loc1.y);
    }

    similar(hexVertexId) {
        return this.location.equalsTo(hexVertexId.location);
    }
}

class CBHex {

    constructor(map, col, row) {
        this._id = new CBHexId(map, col, row);
        this._playables = [];
        this._units = [];
    }

    get id() {
        return this._id;
    }

    _memento() {
        return {
            units: [...this._units],
            playables: [...this._playables]
        }
    }

    _revert(memento) {
        this._units = memento.units;
        this._playables = memento.playables;
    }

    addPlayable(playable) {
        console.assert((playable.playableNature) && (this._playables.indexOf(playable)<0));
        this._playables.push(playable);
    }

    removePlayable(playable) {
        console.assert((playable.playableNature) && (this._playables.indexOf(playable)>=0));
        this._playables.splice(this._playables.indexOf(playable), 1);
    }

    appendPlayable(playable) {
        console.assert((playable.playableNature) && (this._playables.indexOf(playable)<0));
        Memento.register(this);
        this._playables.push(playable);
        let index = this._playables.length-1;
        if (!playable.spellNature) {
            while(index>0 && this._playables[index-1].spellNature) {
                this._playables[index] = this._playables[index-1];
                this._playables[index-1] = playable;
                index--;
            }
        }
        if (playable.featureNature) {
            while(index>0 && !this._playables[index-1].featureNature) {
                this._playables[index] = this._playables[index-1];
                this._playables[index-1] = playable;
                index--;
            }
        }
    }

    deletePlayable(playable) {
        console.assert((playable.playableNature) && (this._playables.indexOf(playable)>=0));
        Memento.register(this);
        this._playables.splice(this._playables.indexOf(playable), 1);
    }

    get playables() {
        return this._playables;
    }

    addUnit(unit) {
        console.assert((unit.unitNature) && (this._units.indexOf(unit)<0));
        this._units.push(unit);
    }

    removeUnit(unit) {
        console.assert((unit.unitNature) && (this._units.indexOf(unit)>=0));
        this._units.splice(this._units.indexOf(unit), 1);
    }

    appendUnit(unit, moveType) {
        console.assert((unit.unitNature) && (this._units.indexOf(unit)<0));
        Memento.register(this);
        if (moveType === CBMoveType.BACKWARD) {
            this._units.push(unit);
        }
        else {
            this._units.unshift(unit);
        }
        this._units.sort((unit1, unit2)=>{
            if (unit1.characterNature) {
                return unit2.characterNature ? 0 : 1;
            }
            else {
                return unit2.characterNature ? -1 : 0;
            }
        });
    }

    deleteUnit(unit) {
        console.assert((unit.unitNature) && (this._units.indexOf(unit)>=0));
        Memento.register(this);
        this._units.splice(this._units.indexOf(unit), 1);
    }

    get units() {
        return this._units;
    }
}

class MapImageArtifact extends DImageArtifact {

    constructor(map, ...args) {
        super(...args);
        this._map = map;
    }

    onMouseClick(event) {
        this._map.onMouseClick(event);
    }
}

export class CBMap {

    constructor(path) {
        let image = DImage.getImage(path);
        this._imageArtifact = new MapImageArtifact(this, "map", image, new Point2D(0, 0), CBMap.DIMENSION);
        this._element = new DElement(this._imageArtifact);
        this._element._map = this;
        this._hexes = [];
    }

    findPosition(hexId) {
        let x = CBMap.WIDTH/CBMap.COL_COUNT * hexId.col-CBMap.WIDTH/2;
        let y = CBMap.HEIGHT/CBMap.ROW_COUNT * hexId.row-CBMap.HEIGHT/2;
        if (hexId.col%2) y-= CBMap.HEIGHT/CBMap.ROW_COUNT/2;
        return new Point2D(x, y);
    }

    _hex(col, row) {
        let column = this._hexes[col];
        if (!column) {
            column = [];
            this._hexes[col] = column;
        }
        let hexSpec = column[row];
        if (!hexSpec) {
            hexSpec = new CBHex(this, col, row);
            column[row] = hexSpec;
        }
        return hexSpec;
    }

    getHex(col, row) {
        return this._hex(col, row).id;
    }

    _isNear(c1, r1, c2, r2) {
        if (c1 === c2) {
            if (r1 === r2+1) {
                return 0;
            }
            if (r1 === r2-1) {
                return 180;
            }
            return false;
        }
        if (c1%2) {
            if (c1 === c2-1) {
                if (r1 === r2+1) {
                    return 60;
                }
                if (r1 === r2) {
                    return 120;
                }
                return false;
            }
            else if (c1 === c2 + 1) {
                if (r1 === r2) {
                    return 240;
                }
                if (r1 === r2+1) {
                    return 300;
                }
                return false;
            }
            return false
        }
        else {
            if (c1 === c2-1) {
                if (r1 === r2) {
                    return 60;
                }
                if (r1 === r2-1) {
                    return 120;
                }
                return false;
            }
            else if (c1 === c2 + 1) {
                if (r1 === r2-1) {
                    return 240;
                }
                if (r1 === r2) {
                    return 300;
                }
                return false;
            }
            return false
        }

    }

    isNearHex(hexId1, hexId2) {
        return this._isNear(hexId1.col, hexId1.row, hexId2.col, hexId2.row);
    }

    _findNearCol(c, r, angle) {
        if (angle === 0 || angle === 180) {
            return c;
        }
        else if (angle === 60 || angle === 120) {
            return c+1;
        }
        else {
            return c-1;
        }
    }

    _findNearRow(c, r, angle) {
        if (angle === 0) {
            return r-1;
        }
        else if (angle === 60 || angle === 300) {
            return c%2 ? r-1 : r;
        }
        else if (angle === 120 || angle === 240) {
            return c%2 ? r : r+1;
        }
        else if (angle === 180) {
            return r+1;
        }
    }

    findNearHex(hexId, angle) {
        return this._hex(
            this._findNearCol(hexId.col, hexId.row, angle),
            this._findNearRow(hexId.col, hexId.row, angle)
        ).id;
    }

    _findFaceCol(c1, r1, c2, r2, angle) {
        if (angle === 30 || angle === 150) {
            return c1>c2 ? c1 : c2;
        }
        else if (angle === 90) {
            return c1+1;
        }
        else if (angle === 210 || angle === 330) {
            return c1<c2 ? c1 : c2;
        }
        else if (angle === 270) {
            return c1-1;
        }
    }

    _findFaceRow(c1, r1, c2, r2, angle) {
        if (angle === 30 || angle === 330) {
            return r1===r2 ? r1-1 : r1<r2 ? r1 : r2;
        }
        else if (angle === 90 || angle === 270) {
            return c1%2 ? (r1<r2 ? r1 : r2) : (r1>r2 ? r1 : r2);
        }
        else if (angle === 150 || angle === 210) {
            return r1===r2 ? r1+1 : r1>r2 ? r1 : r2;
        }
    }

    findFaceHex(hexSideId, angle) {
        return this._hex(
            this._findFaceCol(hexSideId.fromHex.col, hexSideId.fromHex.row, hexSideId.toHex.col, hexSideId.toHex.row, angle),
            this._findFaceRow(hexSideId.fromHex.col, hexSideId.fromHex.row, hexSideId.toHex.col, hexSideId.toHex.row, angle)
        ).id;
    }

    getUnitsOnHex(hexId) {
        console.assert(hexId.map===this);
        return this._hex(hexId.col, hexId.row).units;
    }

    getPlayablesOnHex(hexId) {
        console.assert(hexId.map===this);
        return this._hex(hexId.col, hexId.row).playables;
    }

    getLocation(point) {
        return this._element.getLocation(point);
    }

    get element() {
        return this._element;
    }

    set game(game) {
        this._game = game;
    }

    get game() {
        return this._game;
    }

    getNorthZone() {
        let zone = [];
        let col = 0;
        let row = 0;
        let inc = -1;
        while (col<=CBMap.COL_COUNT) {
            zone.push(this.getHex(col, row));
            col++; row+=inc;
            inc = -inc;
        }
        return zone;
    }

    getSouthZone() {
        let zone = [];
        let col = 0;
        let row = CBMap.ROW_COUNT;
        let inc = 1;
        while (col<=CBMap.COL_COUNT) {
            zone.push(this.getHex(col, row));
            col++; row+=inc;
            inc = -inc;
        }
        return zone;
    }

    getWestZone() {
        let zone = [];
        let row = 0;
        while (row<=CBMap.ROW_COUNT) {
            zone.push(this.getHex(0, row));
            row++;
        }
        return zone;
    }

    getEastZone() {
        let zone = [];
        let row = 0;
        while (row<=CBMap.ROW_COUNT) {
            zone.push(this.getHex(CBMap.COL_COUNT, row));
            row++;
        }
        return zone;
    }

    onMouseClick(event) {
        this.game.recenter(new Point2D(event.offsetX, event.offsetY));
    }

}
CBMap.WIDTH = 2046;
CBMap.HEIGHT = 3150;
CBMap.DIMENSION = new Dimension2D(CBMap.WIDTH, CBMap.HEIGHT);
CBMap.COL_COUNT = 12;
CBMap.ROW_COUNT = 16;

export class CBPathFinding {

    constructor(start, startAngle, arrivals, costMove, costRotate) {
        this._search = new AVLTree((rec1, rec2)=> {
            let result = rec1.distance + rec1.cost - rec2.distance - rec2.cost;
            if (result) return result;
            result = rec1.hex.col - rec2.hex.col;
            if (result) return result;
            return rec1.hex.row - rec2.hex.row;
        });
        this._start = start;
        this._startAngle = startAngle;
        this._map = this._start.map;
        this._arrivals = arrivals;
        this._arrivalsSet = new Set(arrivals);
        this._costForward = function(fromAngle, from, to) {
            let toAngle = from.getAngle(to);
            return costRotate(from, fromAngle, toAngle) + costMove(from, to);
        }
        this._costBackward = function(from, to, toAngle) {
            let fromAngle = from.getAngle(to);
            return costMove(from, to) + (toAngle!==null ? costRotate(to, fromAngle, toAngle) : 0);
        }
    }

    _distanceFromHexToHex(start, arrival) {
        let dcol = arrival.col-start.col;
        if (dcol<0) dcol=-dcol;
        let drow = arrival.row-start.row;
        if (drow<0) drow=-drow;
        if (arrival.col%2) drow-=0,5;
        if (start.col%2) drow+=0,5;
        drow -= dcol/2;
        if (drow<0) drow=0;
        return dcol+drow;
    }

    _distanceFromHexToZone(start, arrivals) {
        let min = this._distanceFromHexToHex(start, arrivals[0]);
        for (let index=1; index<arrivals.length; index++) {
            let distance = this._distanceFromHexToHex(start, arrivals[index]);
            if (distance<min) min=distance;
        }
        return min;
    }

    _registerForward(hex, angle, cost) {
        let record = this._records.get(hex);
        if (record) {
            if (record.cost>cost) {
                this._search.delete(record);
                record.cost = cost;
                record.angle = angle;
                this._search.insert(record);
            }
        }
        else {
            let record = {hex, cost, angle, distance: this._distanceFromHexToZone(hex, this._arrivals) / 2};
            this._records.set(hex, record);
            this._search.insert(record);
        }
    }

    _computeForward() {
        this._records = new Map();
        this._registerForward(this._start, this._startAngle, 0);
        let maxDistance = Number.MAX_VALUE;
        while (this._search.size) {
            let record = this._search.shift();
            if (this._arrivalsSet.has(record.hex)) return;
            for (let angle of [0, 60, 120, 180, 240, 300]) {
                let hex = record.hex.getNearHex(angle);
                this._registerForward(hex, record.hex.getAngle(hex), record.cost + this._costForward(record.angle, record.hex, hex));
            }
        }
    }

    _registerBackward(hex, angle, cost) {
        let record = this._records.get(hex);
        if (record) {
            if (record.cost>cost) {
                this._search.delete(record);
                record.cost = cost;
                record.angle = angle;
                this._search.insert(record);
            }
        }
        else {
            let record = {hex, cost, angle, distance: this._distanceFromHexToHex(hex, this._start) / 2};
            this._records.set(hex, record);
            this._search.insert(record);
        }
    }

    _computeBackward() {
        this._records = new Map();
        for (let hex of this._arrivals) {
            this._registerBackward(hex, null, 0);
        }
        let maxDistance = Number.MAX_VALUE;
        while (this._search.size) {
            let record = this._search.shift();
            if (this._start === record.hex) return;
            for (let angle of [0, 60, 120, 180, 240, 300]) {
                let hex = record.hex.getNearHex(angle);
                this._registerBackward(hex, hex.getAngle(record.hex), record.cost + this._costBackward(hex, record.hex, record.angle));
            }
        }
    }

    getRecord(hex) {
        return this._records.get(hex);
    }

    getGoodNextMoves() {
        this._computeBackward();
        let goodMoves = [];
        let cost = this._records.get(this._start).cost;
        for (let angle of [0, 60, 120, 180, 240, 300]) {
            let hex = this._start.getNearHex(angle);
            let record = this._records.get(hex);
            if (record && record.cost<cost) {
                goodMoves.push(hex);
            }
        }
        return goodMoves;
    }

}
