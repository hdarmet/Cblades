'use strict'

import {
    atan2, Point2D, Dimension2D, moyAngle, sumAngle
} from "../board/geometry.js";
import {
    DImage
} from "../board/draw.js";
import {
    Memento
} from "../board/mechanisms.js";
import {
    DElement, DImageArtifact
} from "../board/board.js";

export function distanceFromHexToHex(start, arrival) {
    let dcol = arrival.col-start.col;
    if (dcol<0) dcol=-dcol;
    let drow = arrival.row-start.row;
    if (arrival.col%2) drow-=0.5;
    if (start.col%2) drow+=0.5;
    if (drow<0) drow=-drow;
    drow -= dcol/2;
    if (drow<0) drow=0;
    return dcol+drow;
}

export function distanceFromHexLocationToHexLocation(start, arrival) {
    let result = -1;
    for (let startHex of start.hexes) {
        let hexResult = Number.MAX_VALUE;
        for (let arrivalHex of arrival.hexes) {
            let distance = distanceFromHexToHex(startHex, arrivalHex);
            if (hexResult > distance) hexResult = distance;
        }
        if (result < hexResult) result = hexResult;
    }
    return result;
}

export class WHexLocation {

    get game() {
        return this.map.game;
    }

    similar(hexLocation) {
        return this.location.equalsTo(hexLocation.location);
    }

    hasPlayable(playable) {
        return this.playables.contains(playable);
    }

    getAngle(hexLocation) {
        let loc1 = this.location;
        let loc2 = hexLocation.location;
        return atan2(loc2.x-loc1.x, loc2.y-loc1.y);
    }

    static fromSpecs(map, spec) {
        return WHexId.fromSpecs(map, spec) || WHexSideId.fromSpecs(map, spec) || WHexVertexId.fromSpecs(map, spec);
    }

    static toSpecs(hexLocation) {
        return hexLocation.toSpecs();
    }
}

export class WHexId extends WHexLocation{

    constructor(map, col, row) {
        super();
        this._map = map;
        this._col = col;
        this._row = row;
    }

    equalsTo(hex) {
        if (!hex) return false;
        return this === hex || (this._col === hex.col && this._row === hex.row);
    }

    get map() {
        return this._map;
    }

    get onMap() {
        return this._map.onMap(this);
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

    get borders() {
        if (!this._borders) {
            let [p1, p2, p3, p4, p5, p6] = this.map.findHexBorders(this);
            this._borders = [
                this.map.getLocation(p1), this.map.getLocation(p2), this.map.getLocation(p3),
                this.map.getLocation(p4), this.map.getLocation(p5), this.map.getLocation(p6)
            ];
        }
        return this._borders;
    }

    get hex() {
        return this._map._hex(this._col, this._row);
    }

    get hexes() {
        return [this];
    }

    get type() {
        return this.hex.type;
    }

    set type(type) {
        this.hex.type = type;
    }

    changeType(type) {
        this.hex.changeType(type);
    }

    get height() {
        return this.hex.height;
    }

    set height(height) {
        this.hex.height = height;
    }

    changeHeight(height) {
        this.hex.changeHeight(height);
    }

    isNearHex(hexId) {
        return this._map.isNearHex(this, hexId);
    }

    get nearHexes() {
        let hexes = new Map();
        for (let angle=0; angle<=300; angle+=60) {
            hexes.set(this.getNearHex(angle), angle);
        }
        return hexes;
    }

    getNearHex(angle) {
        return this._map.findNearHex(this, angle);
    }

    getNearHexSide(angle) {
        let hex1 = this._map.findNearHex(this, sumAngle(angle, 30));
        let hex2 = this._map.findNearHex(this, sumAngle(angle, -30));
        return new WHexSideId(hex1, hex2);
    }

    getNearHexVertex(angle) {
        let hex1 = this._map.findNearHex(this, sumAngle(angle, 30));
        let hex2 = this._map.findNearHex(this, sumAngle(angle, -30));
        return new WHexVertexId(this, hex1, hex2);
    }

    _pushPlayable(playable) {
        this.hex._pushPlayable(playable);
    }

    _unshiftPlayable(playable) {
        this.hex._unshiftPlayable(playable);
    }

    _removePlayable(playable) {
        this.hex._removePlayable(playable);
    }

    _appendPlayableOnTop(playable) {
        this.hex._appendPlayableOnTop(playable);
    }

    _appendPlayableOnBottom(playable) {
        this.hex._appendPlayableOnBottom(playable);
    }

    _deletePlayable(playable) {
        this.hex._deletePlayable(playable);
    }

    get playables() {
        return this.hex.playables;
    }

    // TODO : add map ref
    toString() {
        return "Hex("+this._col+", "+this._row+")";
    }

    hasHex(hexId) {
        return this === hexId;
    }

    toward(angle) {
        if (!(angle%60)) {
            return new WHexSideId(
                this,
                this.getNearHex(angle)
            );
        }
        else {
            return new WHexVertexId(
                this,
                this.getNearHex(sumAngle(angle, -30)),
                this.getNearHex(sumAngle(angle, 30))
            );
        }
    }

    to(hex) {
        return new WHexSideId(this, hex);
    }

    toSpecs() {
        return { col: this.col, row: this.row };
    }

    static fromSpecs(map, spec) {
        return spec.col===undefined || spec.angle!==undefined ? null : map.getHex(spec.col, spec.row);
    }
}

export class WHexSideId extends WHexLocation {

    constructor(hexId1, hexId2) {
        super();
        console.assert(hexId1.isNearHex(hexId2)!==false);
        this._fromHex = hexId1;
        this._toHex = hexId2;
    }

    static equals(hexSide1, hexSide2) {
        if (!hexSide1 && hexSide2 || hexSide1 && !hexSide2) return false;
        if (!hexSide1) return true;
        return hexSide1.fromHex === hexSide2.fromHex && hexSide1.toHex === hexSide2.toHex;
    }

    equalsTo(hexSide) {
        if (!hexSide) return false;
        return this === hexSide || (this.fromHex.equalsTo(hexSide.fromHex) && this.toHex.equalsTo(hexSide.toHex));
    }

    get col() {
        return (this._fromHex.col + this._toHex.col)/2;
    }

    get row() {
        return (this._fromHex.row + this._toHex.row)/2;
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

    get onMap() {
        return this._fromHex.onMap && this._toHex.onMap;
    }

    get hexes() {
        return [this._fromHex, this._toHex];
    }

    get type() {
        return this.fromHex.hex.getSideType(this.angle);
    }

    set type(type) {
        this.fromHex.hex.setSideType(this.angle, type);
    }

    get nearHexes() {
        let hexes = new Map();
        for (let angle=0; angle<=300; angle+=60) {
            let hex = this.fromHex.getNearHex(angle)
            if (hex!==this.toHex) {
                let pangle = hexes.get(hex);
                hexes.set(hex, pangle!== undefined ? moyAngle(pangle, angle):angle);
            }
            hex = this.toHex.getNearHex(angle);
            if (hex!==this.fromHex) {
                let pangle = hexes.get(hex);
                hexes.set(hex, pangle!== undefined ? moyAngle(pangle, angle):angle);
            }
        }
        return hexes;
    }

    get borders() {
        if (!this._fromHex._sideBorders) {
            this._fromHex._sideBorders = [];
        }
        let angle = this.angle/60;
        if (!this._fromHex._sideBorders[angle]) {
            let [p1, p2, p3, p4] = this.map.findHexSideBorders(this);
            this._fromHex._sideBorders[angle] = [
                this.map.getLocation(p1), this.map.getLocation(p2), this.map.getLocation(p3), this.map.getLocation(p4)
            ];
        }
        return this._fromHex._sideBorders[angle];
    }

    changeType(type) {
        this.fromHex.hex.changeSideType(this.angle, type);
    }

    getFaceHex(angle) {
        return this.map.findFaceHex(this, angle);
    }

    getOtherHex(hexId) {
        console.assert(hexId===this._fromHex || hexId === this._toHex);
        return hexId===this._fromHex ? this._toHex :this._fromHex;
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

    _pushPlayable(playable) {
        this.toHex._pushPlayable(playable);
        this.fromHex._pushPlayable(playable);
    }

    _unshiftPlayable(playable) {
        this.toHex._unshiftPlayable(playable);
        this.fromHex._unshiftPlayable(playable);
    }

    _removePlayable(playable) {
        this.toHex._removePlayable(playable);
        this.fromHex._removePlayable(playable);
    }

    _appendPlayableOnTop(playable) {
        this.toHex._appendPlayableOnTop(playable);
        this.fromHex._appendPlayableOnTop(playable);
    }

    _appendPlayableOnBottom(playable) {
        this.toHex._appendPlayableOnBottom(playable);
        this.fromHex._appendPlayableOnBottom(playable);
    }

    _deletePlayable(playable) {
        this.toHex._deletePlayable(playable);
        this.fromHex._deletePlayable(playable);
    }

    get playables() {
        return [...new Set([...this.toHex.playables, ...this.fromHex.playables])];
    }

    moveTo(angle) {
        return new WHexSideId(this.fromHex.getNearHex(angle), this.toHex.getNearHex(angle));
    }

    turnTo(angle) {
        let hsAngle = this.angle;
        let fhAngle1 = sumAngle(hsAngle, 60);
        let fhAngle2 = sumAngle(hsAngle, -60);
        let pivot = (angle===fhAngle1 || angle===fhAngle2) ? this._toHex : this._fromHex;
        let hex = (angle===fhAngle1 || angle===fhAngle2) ? this._fromHex : this._toHex;
        let newHex = hex.getNearHex(angle);
        return new WHexSideId(pivot, newHex);
    }

    turnMove(angle) {
        let hsAngle = this.angle;
        let fhAngle1 = sumAngle(hsAngle, 60);
        let fhAngle2 = sumAngle(hsAngle, -60);
        let hex = (angle===fhAngle1 || angle===fhAngle2) ? this._fromHex : this._toHex;
        let newHex = hex.getNearHex(angle);
        return new WHexSideId(hex, newHex);
    }

    toString() {
        return `Hexside(${this.fromHex}, ${this.toHex})`;
    }

    toSpecs() {
        let spec = this.fromHex.toSpecs();
        spec.angle = this.angle;
        return spec;
    }

    static fromSpecs(map, spec) {
        return (spec.angle===undefined || spec.angle%60) ? null : map.getHex(spec.col, spec.row).toward(spec.angle);
    }
}

export class WHexVertexId extends WHexLocation {

    constructor(hexId1, hexId2, hexId3) {
        super();
        this._hexId1 = hexId1;
        this._hexId2 = hexId2;
        this._hexId3 = hexId3;
    }

    get map() {
        return this._hexId1.map;
    }

    get onMap() {
        return this._hexId1.onMap && this._hexId2.onMap && this._hexId3.onMap;
    }

    equalsTo(hexVertex) {
        if (!hexVertex) return false;
        return this === hexVertex || (this.fromHex.equalsTo(hexVertex.fromHex) && this.toHexSide.equalsTo(hexVertex.toHexSide));
    }

    get firstHex() {
        return this._hexId1;
    }

    get secondHex() {
        return this._hexId2;
    }

    get thirdHex() {
        return this._hexId3;
    }

    get fromHex() {
        return this._hexId1;
    }

    get toHexSide() {
        return new WHexSideId(this._hexId2, this._hexId3);
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

    get hexes() {
        return [this._hexId1, this._hexId2, this._hexId3];
    }

    get nearHexes() {
        let hexes = new Map();
        for (let angle=0; angle<=300; angle+=60) {
            let hex = this._hexId1.getNearHex(angle)
            if (hex!==this._hexId2 && hex!==this._hexId3) {
                let pangle = hexes.get(hex);
                hexes.set(hex, pangle!== undefined ? moyAngle(pangle, angle):angle);
            }
            hex = this._hexId2.getNearHex(angle)
            if (hex!==this._hexId1 && hex!==this._hexId3) {
                let pangle = hexes.get(hex);
                hexes.set(hex, pangle!== undefined ? moyAngle(pangle, angle):angle);
            }
            hex = this._hexId3.getNearHex(angle)
            if (hex!==this._hexId1 && hex!==this._hexId2) {
                let pangle = hexes.get(hex);
                hexes.set(hex, pangle!== undefined ? moyAngle(pangle, angle):angle);
            }
        }
        return hexes;
    }

    _pushPlayable(playable) {
        this.toHexSide._pushPlayable(playable);
        this.fromHex._pushPlayable(playable);
    }

    _unshiftPlayable(playable) {
        this.toHexSide._unshiftPlayable(playable);
        this.fromHex._unshiftPlayable(playable);
    }

    _removePlayable(playable) {
        this.toHexSide._removePlayable(playable);
        this.fromHex._removePlayable(playable);
    }

    _appendPlayableOnTop(playable) {
        this.toHexSide._appendPlayableOnTop(playable);
        this.fromHex._appendPlayableOnTop(playable);
    }

    _appendPlayableOnBottom(playable) {
        this.toHexSide._appendPlayableOnBottom(playable);
        this.fromHex._appendPlayableOnBottom(playable);
    }

    _deletePlayable(playable) {
        this.toHexSide._deletePlayable(playable);
        this.fromHex._deletePlayable(playable);
    }

    get playables() {
        return [...new Set([...this.toHexSide.playables, ...this.fromHex.playables])];
    }

    toSpecs() {
        return {
            col: this.firstHex.col,
            row: this.firstHex.row,
            angle: this.angle
        };
    }

    static fromSpecs(map, spec) {
        return (spec.angle===undefined || (spec.angle%60)!==30) ? null :
            map.getHex(spec.col, spec.row).toward(spec.angle);
    }
}

export class WHex {

    constructor(map, col, row) {
        console.assert(!isNaN(col+row));
        this._id = new WHexId(map, col, row);
        this._playables = [];
        this._hexType = {
            type: WHex.HEX_TYPES.OUTDOOR_CLEAR,
            height: 0,
            side120 : WHex.HEXSIDE_TYPES.NORMAL,
            side180 : WHex.HEXSIDE_TYPES.NORMAL,
            side240 : WHex.HEXSIDE_TYPES.NORMAL
        };

    }

    clean() {
        this._playables = [];
    }

    get id() {
        return this._id;
    }

    _memento() {
        return {
            playables: [...this._playables],
            type: this._hexType.type,
            height: this._hexType.height,
            side120 : this._hexType.side120,
            side180 : this._hexType.side180,
            side240 : this._hexType.side240
        }
    }

    _revert(memento) {
        this._playables = memento.playables;
        this._hexType.type = memento.type;
        this._hexType.height = memento.height;
        this._hexType.side120 = memento.side120;
        this._hexType.side180 = memento.side180;
        this._hexType.side240 = memento.side240;
    }

    get type() {
        return this._hexType.type;
    }

    set type(type) {
        this._hexType.type = type;
    }

    changeType(type) {
        Memento.register(this);
        this._hexType.type = type;
    }

    get height() {
        return this._hexType.height;
    }

    set height(height) {
        this._hexType.height = height;
    }

    changeHeight(height) {
        Memento.register(this);
        this._hexType.height = height;
    }

    getSideType(angle) {
        switch (angle) {
            case 0: return this._id.map._nearHex(this._id, 0).getSideType(180);
            case 60: return this._id.map._nearHex(this._id, 60).getSideType(240);
            case 120: return this._hexType.side120;
            case 180: return this._hexType.side180;
            case 240: return this._hexType.side240;
            case 300: return this._id.map._nearHex(this._id, 300).getSideType(120);
        }
    }

    setSideType(angle, type) {
        switch (angle) {
            case 0: this._id.map._nearHex(this._id, 0).setSideType(180, type); return;
            case 60: this._id.map._nearHex(this._id, 60).setSideType(240, type); return;
            case 120: this._hexType.side120 = type; return;
            case 180: this._hexType.side180 = type; return;
            case 240: this._hexType.side240 = type; return;
            case 300: this._id.map._nearHex(this._id, 300).setSideType(120, type); return;
        }
    }

    changeSideType(angle, type) {
        Memento.register(this);
        switch (angle) {
            case 0: this._id.map._nearHex(this._id, 0).changeSideType(180, type); return;
            case 60: this._id.map._nearHex(this._id, 60).changeSideType(240, type); return;
            case 120: Memento.register(this); this._hexType.side120 = type; return;
            case 180: Memento.register(this); this._hexType.side180 = type; return;
            case 240: Memento.register(this); this._hexType.side240 = type; return;
            case 300: this._id.map._nearHex(this._id, 300).changeSideType(120, type); return;
        }
    }

    static comparePlayable(playable1, playable2) {
        if (playable1.counterNature && playable2.unitNature) return -1;
        if (playable1.unitNature && playable2.counterNature) return 1;
        if (playable1.counterNature) {
            if (playable1.featureNature && !playable2.featureNature) return -1;
            if (!playable1.featureNature && playable2.featureNature) return 1;
            if (playable1.spellNature && !playable2.spellNature) return 1;
            if (!playable1.spellNature && playable2.spellNature) return -1;
            return 0;
        }
        else {
            if (playable1.characterNature && !playable2.characterNature) return 1;
            if (!playable1.characterNature && playable2.characterNature) return -1;
            return 0;
        }
    }

    _pushPlayable(playable) {
        console.assert(this._playables.indexOf(playable)<0);
        this._playables.push(playable);
        this._playables.sort(WHex.comparePlayable);
    }

    _unshiftPlayable(playable) {
        console.assert(this._playables.indexOf(playable)<0);
        this._playables.unshift(playable);
        this._playables.sort(WHex.comparePlayable);
    }

    _removePlayable(playable) {
        console.assert(this._playables.contains(playable));
        this._playables.remove(playable);
    }

    _appendPlayableOnTop(playable) {
        Memento.register(this);
        this._pushPlayable(playable);
    }

    _appendPlayableOnBottom(playable) {
        Memento.register(this);
        this._unshiftPlayable(playable);
    }

    _deletePlayable(playable) {
        Memento.register(this);
        this._removePlayable(playable);
    }

    get playables() {
        return this._playables;
    }

}
WHex.HEX_TYPES = {
    OUTDOOR_CLEAR : 0,
    OUTDOOR_ROUGH : 1,
    OUTDOOR_DIFFICULT : 2,
    OUTDOOR_CLEAR_FLAMMABLE : 3,
    OUTDOOR_ROUGH_FLAMMABLE : 4,
    OUTDOOR_DIFFICULT_FLAMMABLE : 5,
    WATER : 6,
    LAVA : 7,
    IMPASSABLE : 8,
    CAVE_CLEAR : 9,
    CAVE_ROUGH : 10,
    CAVE_DIFFICULT : 11,
    CAVE_CLEAR_FLAMMABLE : 12,
    CAVE_ROUGH_FLAMMABLE : 13,
    CAVE_DIFFICULT_FLAMMABLE : 14,
};
WHex.HEXSIDE_TYPES = {
    NORMAL : 0,
    EASY : 1,
    DIFFICULT : 2,
    CLIMB : 3,
    WALL : 4
};

export class WMapImageArtifact extends DImageArtifact {

    constructor(map, ...args) {
        super(...args);
        this._map = map;
    }

    onMouseClick(event) {
        this._map.onMouseClick(event);
        return true;
    }
}

export class WAbstractMap {

    constructor(boardCols, boardRows, imageSpecs) {
        this._boardCols = boardCols;
        this._boardRows = boardRows;
        let imageArtifacts = [];
        for (let imageSpec of imageSpecs) {
            let imageArtifact = new WMapImageArtifact(this, "map",
                imageSpec.image,
                imageSpec.location,
                WAbstractMap.DIMENSION);
            imageArtifact.pangle = imageSpec.angle;
            imageArtifacts.push(imageArtifact);
        }
        this._element = new DElement(...imageArtifacts);
        this._element._map = this;
        this._hexes = [];
    }

    clean() {
        for (let hexRow of this._hexes) {
            if (hexRow) {
                for (let hex of hexRow) {
                    if (hex) hex.clean();
                }
            }
        }
    }

    get width() {
        return WAbstractMap.WIDTH*this._boardCols;
    }

    get height() {
        return WAbstractMap.HEIGHT*this._boardRows;
    }

    get dimension() {
        return new Dimension2D(this.width, this.height);
    }

    get colCount() {
        return WAbstractMap.COL_COUNT*this._boardCols;
    }

    get rowCount() {
        return WAbstractMap.ROW_COUNT*this._boardRows;
    }

    findPosition(hexId) {
        let x = this.width/this.colCount * hexId.col-this.width/2;
        let y = this.height/this.rowCount * hexId.row-this.height/2;
        if (hexId.col%2) y-= this.height/this.rowCount/2;
        return new Point2D(x, y);
    }

    findHexBorders(hexId) {
        let dw = this.width/this.colCount;
        let dy = this.height/this.rowCount;
        let x = dw * hexId.col-this.width/2;
        let y = dy * hexId.row-this.height/2;
        if (hexId.col%2) y-= this.height/this.rowCount/2;
        return [
            new Point2D(x - dw/3, y-dy/2),
            new Point2D(x + dw/3, y-dy/2),
            new Point2D(x + dw*2/3, y),
            new Point2D(x + dw/3, y+dy/2),
            new Point2D(x - dw/3, y+dy/2),
            new Point2D(x - dw*2/3, y)
        ];
    }

    findHexSideBorders(hexSideId) {
        let fromPoint = this.findPosition(hexSideId.fromHex);
        let toPoint = this.findPosition(hexSideId.toHex);
        let fromBorder = this.findHexBorders(hexSideId.fromHex);
        let angleIndex = Math.round(sumAngle(hexSideId.angle, -30)/60);
        return [
            fromPoint,
            fromBorder[angleIndex],
            toPoint,
            fromBorder[(angleIndex+1)%6]
        ];
    }

    onMap(hexId) {
        let position = this.findPosition(hexId);
        return position.x>=-this.width/2-1 && position.y>=-this.height/2-1 && position.x<=this.width/2+1 && position.y<=this.height/2+1;
    }

    get hexes() {
        let hexes = [];
        for (let col=0; col<=this.colCount; col++) {
            for (let row=0; row<=this.rowCount; row++) {
                let hex = this.getHex(col, row);
                if (this.onMap(hex)) {
                    hexes.push(hex);
                }
            }
        }
        return hexes;
    }

    get hexSides() {
        let hexSides = [];
        let hexes = this.hexes;
        let hexSet = new Set(hexes);
        for (let hex of hexes) {
            let nextHex = hex.getNearHex(120);
            if (this.onMap(nextHex)) {
                hexSides.push(new WHexSideId(hex, nextHex));
            }
            nextHex = hex.getNearHex(180);
            if (this.onMap(nextHex)) {
                hexSides.push(new WHexSideId(hex, nextHex));
            }
            nextHex = hex.getNearHex(240);
            if (this.onMap(nextHex)) {
                hexSides.push(new WHexSideId(hex, nextHex));
            }
        }
        return hexSides;
    }

    _hex(col, row) {
        let column = this._hexes[col];
        if (!column) {
            column = [];
            this._hexes[col] = column;
        }
        let hexSpec = column[row];
        if (!hexSpec) {
            hexSpec = new WHex(this, col, row);
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

    _nearHex(hexId, angle) {
        return this._hex(
            this._findNearCol(hexId.col, hexId.row, angle),
            this._findNearRow(hexId.col, hexId.row, angle)
        );
    }

    findNearHex(hexId, angle) {
        return this._nearHex(hexId, angle).id;
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

    getLocation(point) {
        return this._element.getLocation(point);
    }

    get element() {
        return this._element;
    }

    get artifact() {
        return this.element.artifacts[0];
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
        let inc = +1;
        let row = -1;
        while (col<=this.colCount) {
            zone.push(this.getHex(col, row));
            col++;
            row+=inc;
            inc = -inc;
        }
        zone.angle = 0;
        return zone;
    }

    getSouthZone() {
        let zone = [];
        let col = 0;
        let row = this.rowCount+1;
        while (col<=this.colCount) {
            zone.push(this.getHex(col, row));
            col++;
        }
        zone.angle = 180;
        return zone;
    }

    getWestZone() {
        let zone = [];
        let row = 0;
        while (row<this.rowCount) {
            zone.push(this.getHex(-1, row));
            row++;
        }
        zone.angle = 270;
        return zone;
    }

    getEastZone() {
        let zone = [];
        let row = 0;
        while (row<this.rowCount) {
            zone.push(this.getHex(this.colCount+1, row));
            row++;
        }
        zone.angle = 90;
        return zone;
    }

    onMouseClick(event) {
        this.game.recenter(new Point2D(event.offsetX, event.offsetY));
    }

    static WIDTH = 2046;
    static HEIGHT = 3150;
    static DIMENSION = new Dimension2D(WAbstractMap.WIDTH, WAbstractMap.HEIGHT);
    static COL_COUNT = 12;
    static ROW_COUNT = 16;
}

export class WBoard extends WAbstractMap {

    constructor(name, path, icon) {
        super(1, 1, [{
            image: DImage.getImage(path),
            location: new Point2D(0, 0),
            angle:0
        }]);
        this._name = name;
        this._path = path;
        this._icon = icon;
    }

    get name() {
        return this._name;
    }

    get path() {
        return this._path;
    }

    get icon() {
        return this._icon;
    }

}

export class WMap extends WAbstractMap {

    constructor(mapBoards) {
        let imageSpecs = [];
        let boardCols = 1;
        let boardRows = 1;
        for (let mapBoard of mapBoards) {
            if (mapBoard.col>=boardCols) boardCols=mapBoard.col+1;
            if (mapBoard.row>=boardRows) boardRows=mapBoard.row+1;
        }
        for (let mapBoard of mapBoards) {
            imageSpecs.push({
                image: DImage.getImage(mapBoard.path),
                location: new Point2D(
                    (mapBoard.col-(boardCols-1)/2)*WAbstractMap.WIDTH,
                    (mapBoard.row-(boardRows-1)/2)*WAbstractMap.HEIGHT
                ),
                angle : mapBoard.invert ? 180 : 0
            });
        }
        super(boardCols, boardRows, imageSpecs);
        this._mapBoards = mapBoards;
    }

    get mapBoards() {
        return this._mapBoards;
    }

    toSpecs(context) {
        let mapSpecs = {
            id: this._oid,
            version: this._oversion || 0,
            boards: []
        }
        for (let board of this.mapBoards) {
            let boardSpec = {
                id: board._oid,
                version: board._oversion || 0,
                col: board.col,
                row: board.row,
                path: board.path,
                icon: board.icon,
                invert: !!board.invert
            };
            mapSpecs.boards.push(boardSpec);
        }
        context.set(this, mapSpecs)
        return mapSpecs;
    }

    static fromSpecs(specs, context) {
        let configuration = [];
        if (specs.boards) {
            for (let boardSpec of specs.boards) {
                let board = {
                    _oid: boardSpec.id,
                    _oversion: boardSpec.version ,
                    col: boardSpec.col,
                    row: boardSpec.row,
                    path: boardSpec.path,
                    icon: boardSpec.icon
                }
                if (boardSpec.invert) board.invert = true;
                configuration.push(board);
            }
        }
        let map = new WMap(configuration);
        map._oid = specs.id;
        map._oversion = specs.version;
        context.map = map;
        return map;
    }

}

