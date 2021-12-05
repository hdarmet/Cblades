'use strict'

import {
    CBHex
} from "./map.js";
import {
    sendPost
} from "../draw.js";
import {
    CBCharge, CBCohesion, CBFormation,
    CBMunitions, CBTiredness, CBUnitType,
    CBWing
} from "./unit.js";

export class Connector {

    connect() {
        sendPost("/api/ping-login",
            null,
            (text, status)=>console.log("SUCCESS! "+text+": "+status),
            (text, status)=>console.log("FAILURE! "+text+": "+status)
        );
    }

}

export class BoardLoader {

    constructor(board) {
        this._board = board;
    }

    save() {
        let json = this.toSpecs();
        if (json.id === undefined) {
            sendPost("/api/board/create",
                json,
                (text, status) => {
                    console.log("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => console.log("FAILURE! " + text + ": " + status)
            );
        }
        else {
            sendPost("/api/board/update/"+this._board._oid,
                json,
                (text, status) => {
                    console.log("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => console.log("FAILURE! " + text + ": " + status)
            );
        }
    }

    load() {
        sendPost("/api/board/by-name/"+this._board.name,
            {},
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                console.log(`Board ${this._board.name} loaded : ${status}`)
            },
            (text, status) => console.log(`Unable to load ${this._board.name} : ${status}`)
        );
    }

    toSpecs() {
        let mapSpecs = {
            version: this._board._oversion || 0,
            name: this._board._name,
            path: this._board._path,
            hexes: []
        };
        if (this._board._oid) mapSpecs.id = this._board._oid;
        for (let hexId of this._board.hexes) {
            mapSpecs.hexes.push({
                version: hexId.hex._oversion || 0,
                col: hexId.col,
                row: hexId.row,
                type: this.getHexTypeLabel(hexId.type),
                height: hexId.height,
                side120Type: this.getHexSideTypeLabel(hexId.toward(120).type),
                side180Type: this.getHexSideTypeLabel(hexId.toward(180).type),
                side240Type: this.getHexSideTypeLabel(hexId.toward(240).type)
            });
        }
        return mapSpecs;
    }

    fromSpecs(specs) {
        this._board._oid = specs.id || 0;
        this._board._oversion = specs.version || 0;
        this._board._name = specs.name;
        this._board._path = specs.path;
        if (specs.id) this._board._oid = specs.id;
        for (let hexSpec of specs.hexes) {
            let hexId = this._board.getHex(hexSpec.col, hexSpec.row);
            hexId.hex._oid = hexSpec.id;
            hexId.hex._oversion = hexSpec.version;
            hexId.type = this.getHexType(hexSpec.type);
            hexId.height = hexSpec.height;
            hexId.toward(120).type=this.getHexSideType(hexSpec.side120Type);
            hexId.toward(180).type=this.getHexSideType(hexSpec.side180Type);
            hexId.toward(240).type=this.getHexSideType(hexSpec.side240Type);
        }
    }

    getHexTypeLabel(type) {
        switch(type) {
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR: return "OC";
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH: return "OR";
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT: return "OD";
            case CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE: return "OCF";
            case CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE: return "ORF";
            case CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE: return "ODF";
            case CBHex.HEX_TYPES.WATER: return "WA";
            case CBHex.HEX_TYPES.LAVA: return "LA";
            case CBHex.HEX_TYPES.IMPASSABLE: return "IM";
            case CBHex.HEX_TYPES.CAVE_CLEAR: return "CC";
            case CBHex.HEX_TYPES.CAVE_ROUGH: return "CR";
            case CBHex.HEX_TYPES.CAVE_DIFFICULT: return "CD";
            case CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE: return "CCF";
            case CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE: return "CRF";
            case CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE: return "CDF";
        }
    }

    getHexSideTypeLabel(type) {
        switch(type) {
            case CBHex.HEXSIDE_TYPES.NORMAL: return "N";
            case CBHex.HEXSIDE_TYPES.EASY: return "E";
            case CBHex.HEXSIDE_TYPES.DIFFICULT: return "D";
            case CBHex.HEXSIDE_TYPES.CLIMB: return "C";
            case CBHex.HEXSIDE_TYPES.WALL: return "W";
        }
    }

    getHexType(label) {
        switch(label) {
            case "OC": return CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            case "OR": return CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            case "OD": return CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            case "OCF": return CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
            case "ORF": return CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
            case "ODF": return CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
            case "WA": return CBHex.HEX_TYPES.WATER;
            case "LA": return CBHex.HEX_TYPES.LAVA;
            case "IM": return CBHex.HEX_TYPES.IMPASSABLE;
            case "CC": return CBHex.HEX_TYPES.CAVE_CLEAR;
            case "CR": return CBHex.HEX_TYPES.CAVE_ROUGH;
            case "CD": return CBHex.HEX_TYPES.CAVE_DIFFICULT;
            case "CCF": return CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
            case "CRF": return CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
            case "CDF": return CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
        }
    }

    getHexSideType(label) {
        switch(label) {
            case "N": return CBHex.HEXSIDE_TYPES.NORMAL;
            case "E": return CBHex.HEXSIDE_TYPES.EASY;
            case "D": return CBHex.HEXSIDE_TYPES.DIFFICULT;
            case "C": return CBHex.HEXSIDE_TYPES.CLIMB;
            case "W": return CBHex.HEXSIDE_TYPES.WALL;
        }
    }

}

export class GameLoader {

    constructor(game) {
        this._game = game;
    }

    save() {
        let json = this.toSpecs();
        if (json.id === undefined) {
            sendPost("/api/game/create",
                json,
                (text, status) => {
                    console.log("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => console.log("FAILURE! " + text + ": " + status)
            );
        }
        else {
            sendPost("/api/game/update/"+this._game._oid,
                json,
                (text, status) => {
                    console.log("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => console.log("FAILURE! " + text + ": " + status)
            );
        }
    }

    load() {
        sendPost("/api/game/by-name/"+this._game.name,
            {},
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                console.log(`Game ${this._game.name} loaded : ${status}`)
            },
            (text, status) => console.log(`Unable to load ${this._game.name} : ${status}`)
        );
    }

    toSpecs() {
        let gameSpecs = {
            version: this._game._oversion || 0,
            name: this._game._name,
            players: []
        };
        if (this._game._oid) gameSpecs.id = this._game._oid;
        for (let player of this._game.players) {
            let playerSpecs = {
                version: player._oversion || 0,
                name: player.name,
                wings: [],
                locations: []
            }
            if (player._oid) playerSpecs.id = player._oid;
            let locations = new Set();
            for (let wing of player.wings) {
                let wingSpecs = {
                    version: wing._oversion || 0,
                    banner: wing.banner,
                    units: [],
                    retreatZone: []
                }
                if (wing._oid) wingSpecs.id = wing._oid;
                for (let retreatHex of wing.retreatZone) {
                    let retreatHexSpecs = {
                        version: 0,
                        col: retreatHex.col,
                        row: retreatHex.row
                    }
                    wingSpecs.retreatZone.push(retreatHexSpecs);
                }
                for (let unit of wing.playables) {
                    let position = unit instanceof CBFormation ? unit.hexLocation.fromHex : unit.hexLocation;
                    let positionAngle = unit instanceof CBFormation ? unit.hexLocation.angle : 0;
                    let unitSpecs = {
                        version: unit._oversion || 0,
                        name: unit.name,
                        category: this.getUnitCategoryCode(unit),
                        type: this.getUnitTypeCode(unit),
                        angle: unit.angle,
                        positionCol: position.col,
                        positionRow: position.row,
                        positionAngle: positionAngle,
                        steps: unit.steps,
                        tiredness: this.getUnitTirednessCode(unit),
                        ammunition: this.getUnitAmmunitionCode(unit),
                        cohesion: this.getUnitCohesionCode(unit),
                        charging: unit.isCharging(),
                        contact: unit.isEngaging(),
                        orderGiven: unit.hasReceivedOrder(),
                        played: unit.isPlayed()
                    }
                    if (unit._oid) unitSpecs.id = unit._oid;
                    wingSpecs.units.push(unitSpecs);
                    for (let hexId of unit.hexLocation.hexes) {
                        locations.add(hexId);
                    }
                }
                playerSpecs.wings.push(wingSpecs);
            }
            for (let location of locations) {
                let locationSpecs = {
                    version: 0,
                    col: location.col,
                    row: location.row,
                    units: []
                }
                for (let unit of location.units) {
                    locationSpecs.units.push(unit.name);
                }
                playerSpecs.locations.push(locationSpecs);
            }
            gameSpecs.players.push(playerSpecs);
        }
        console.log(JSON.stringify(gameSpecs));
        return gameSpecs;
    }

    fromSpecs(specs) {
        console.log(JSON.stringify(specs));
        this._game.clean();
        this._game._oid = specs.id || 0;
        this._game._oversion = specs.version || 0;
        this._game._name = specs.name;
        if (specs.id) this._game._oid = specs.id;
        for (let playerSpec of specs.players) {
            let player = this._game.getPlayer(playerSpec.name);
            console.assert(player);
            player._oid = playerSpec.id;
            player._oversion = playerSpec.version;
            player._name = playerSpec.name;
            let unitsMap = new Map();
            for (let wingSpec of playerSpec.wings) {
                let wing = new CBWing(player, wingSpec.banner);
                wing._oid = wingSpec.id;
                wing._oversion = wingSpec.version;
                let retreatZone = [];
                for (let retreatHexSpec of wingSpec.retreatZone) {
                    let hexId = this._game.map.getHex(retreatHexSpec.col, retreatHexSpec.row);
                    retreatZone.push(hexId);
                }
                wing.setRetreatZone(retreatZone);
                for (let unitSpec of wingSpec.units) {
                    let unitType = this.getUnitType(unitSpec.type);
                    let unit = unitType.createUnit(wing, unitSpec.steps);
                    unit._oid = unitSpec.id;
                    unit._oversion = unitSpec.version;
                    unit._name = unitSpec.name;
                    unit._game = this._game;
                    unit.angle = unitSpec.angle;
                    unit.setTiredness(this.getUnitTiredness(unitSpec.tiredness));
                    unit.setMunitions(this.getUnitAmmunition(unitSpec.ammunition));
                    unit.setCohesion(this.getUnitCohesion(unitSpec.cohesion));
                    unit.setCharging(unitSpec.charging?CBCharge.CHARGING:CBCharge.NONE);
                    unit.setEngaging(unitSpec.contact);
                    unit.receivesOrder(unitSpec.orderGiven);
                    if (unitSpec.played) unit.markAsPlayed();
                    unitsMap.set(unit.name, { unit, unitSpec });
                }
            }
            this.showEntities(unitsMap, playerSpec);
        }
    }

    showEntities(unitsMap, playerSpec) {
        let namesToShow = new Set(unitsMap.keys());
        let shown = new Set();
        let dependencies = [];
        for (let locationsSpec of playerSpec.locations) {
            for (let index = 0; index < locationsSpec.units.length - 1; index++) {
                dependencies.push([locationsSpec.units[index], locationsSpec.units[index + 1]]);
            }
        }
        while (namesToShow.size) {
            let excluded = new Set();
            for (let dependency of dependencies) {
                excluded.add(dependency[1]);
            }
            for (let name of namesToShow) {
                if (!excluded.has(name)) {
                    shown.add(name);
                    let unitDef = unitsMap.get(name);
                    let hexLocation = this._game.map.getHex(unitDef.unitSpec.positionCol, unitDef.unitSpec.positionRow);
                    if (unitDef.unit.formationNature) hexLocation = hexLocation.toward(unitDef.unitSpec.positionAngle);
                    unitDef.unit.appendToMap(hexLocation);
                }
            }
            let remainingDependencies = [];
            for (let dependency of dependencies) {
                if (!shown.has(dependency[0])) {
                    remainingDependencies.push(dependency);
                }
            }
            namesToShow = excluded;
            dependencies = remainingDependencies;
        }
    }

    getUnitCategoryCode(unit) {
        if (unit.formationNature) return "F";
        else if (unit.characterNature) return "C"
        else return "T";
    }

    getUnitTypeCode(unit) {
        return unit.type.name;
    }

    getUnitType(code) {
        return CBUnitType.getType(code);
    }

    getUnitTirednessCode(unit) {
        if (unit.isTired()) return "T";
        else if (unit.isExhausted()) return "E";
        else return "F";
    }

    getUnitAmmunitionCode(unit) {
        if (unit.areMunitionsScarce()) return "S";
        else if (unit.areMunitionsExhausted()) return "E";
        else return "P";
    }

    getUnitCohesionCode(unit) {
        if (unit.isDisrupted()) return "D";
        else if (unit.isRouted()) return "R";
        else return "GO";
    }

    getUnitTiredness(code) {
        switch (code) {
            case "F": return CBTiredness.NONE;
            case "T": return CBTiredness.TIRED;
            case "E":  return CBTiredness.EXHAUSTED;
        }
    }

    getUnitAmmunition(code) {
        switch (code) {
            case "P": return CBMunitions.NONE;
            case "S": return CBMunitions.SCARCE;
            case "E":  return CBMunitions.EXHAUSTED;
        }
    }

    getUnitCohesion(code) {
        switch (code) {
            case "GO": return CBCohesion.GOOD_ORDER;
            case "D": return CBCohesion.DISRUPTED;
            case "R":  return CBCohesion.ROUTED;
        }
    }

}