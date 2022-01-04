'use strict'

import {
    CBHex, CBHexSideId, CBMap
} from "./map.js";
import {
    sendPost
} from "../draw.js";
import {
    CBCharge, CBCohesion, CBFormation,
    CBMunitions, CBTiredness, CBUnit, CBUnitType,
    CBWing
} from "./unit.js";
import {
    CBStacking
} from "./game.js";
import {
    CBMoveSequenceElement, CBNextTurnSequenceElement,
    CBReorientSequenceElement,
    CBRotateSequenceElement,
    CBSequence,
    CBStateSequenceElement, CBTurnSequenceElement
} from "./sequences.js";

let consoleLog = console.log;
//let consoleLog = ()=>{};

export class Connector {

    connect() {
        sendPost("/api/ping-login",
            null,
            (text, status)=>consoleLog("SUCCESS! "+text+": "+status),
            (text, status)=>consoleLog("FAILURE! "+text+": "+status)
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
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
        else {
            sendPost("/api/board/update/"+this._board._oid,
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
    }

    load() {
        sendPost("/api/board/by-name/"+this._board.name,
            {},
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                consoleLog(`Board ${this._board.name} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._board.name} : ${status}`)
        );
    }

    toSpecs() {
        let mapSpecs = {
            version: this._board._oversion || 0,
            name: this._board._name,
            path: this._board._path,
            icon: this._board._icon,
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
        this._board._icon = specs.icon;
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

    constructor(game, playerCreator) {
        this._game = game;
        this._playerCreator = playerCreator;
    }

    save() {
        let json = this.toSpecs();
        if (json.id === undefined) {
            sendPost("/api/game/create",
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        } else {
            sendPost("/api/game/update/" + this._game._oid,
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
    }

    load() {
        sendPost("/api/game/by-name/" + this._game.name,
            {},
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                consoleLog(`Game ${this._game.name} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._game.name} : ${status}`)
        );
    }

    toSpecs() {
        let gameSpecs = {
            version: this._game._oversion || 0,
            name: this._game._name,
            players: []
        };
        if (this._game._oid) gameSpecs.id = this._game._oid;
        let mapCompositionSpecs = {
            version: this._game.map._oversion || 0,
            boards: []
        }
        if (this._game.map._oid) mapCompositionSpecs.id = this._game.map._oid;
        gameSpecs.map = mapCompositionSpecs;
        for (let board of this._game.map.mapBoards) {
            let boardSpec = {
                version: board._oversion || 0,
                col: board.col,
                row: board.row,
                path: board.path,
                invert: !!board.invert
            };
            if (board._oid) boardSpec.id = board._oid;
            mapCompositionSpecs.boards.push(boardSpec);
        }
        for (let player of this._game.players) {
            let playerSpecs = {
                version: player._oversion || 0,
                identity: {
                    name: player.identity.name,
                    path: player.identity.path
                },
                wings: [],
                locations: []
            }
            if (player._oid) playerSpecs.id = player._oid;
            let locations = new Set();
            for (let wing of player.wings) {
                let wingSpecs = {
                    version: wing._oversion || 0,
                    banner: {
                        name: wing.banner.name,
                        path: wing.banner.path
                    },
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
        consoleLog(JSON.stringify(gameSpecs));
        return gameSpecs;
    }

    fromSpecs(specs) {
        consoleLog(JSON.stringify(specs));
        this._game.clean();
        this._game._oid = specs.id || 0;
        this._game._oversion = specs.version || 0;
        this._game._name = specs.name;
        if (specs.id) this._game._oid = specs.id;
        let configuration = [];
        for (let boardSpec of specs.map.boards) {
            let board = {
                _oid: boardSpec.id,
                col: boardSpec.col,
                row: boardSpec.row,
                path: boardSpec.path,
            }
            if (boardSpec.invert) board.invert = true;
            configuration.push(board);
        }
        this._game.changeMap(new CBMap(configuration));
        for (let playerSpec of specs.players) {
            let player = this._game.getPlayer(playerSpec.identity.name);
            if (!player) {
                player = this._playerCreator(playerSpec.identity.name, playerSpec.identity.path);
                this._game.addPlayer(player);
            }
            else {
                player.setIdentity(playerSpec.identity);
            }
            player._oid = playerSpec.id;
            player._oversion = playerSpec.version;
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
                    unit.setState({
                        tiredness: this.getUnitTiredness(unitSpec.tiredness),
                        munitions: this.getUnitAmmunition(unitSpec.ammunition),
                        cohesion: this.getUnitCohesion(unitSpec.cohesion),
                        charging: unitSpec.charging ? CBCharge.CHARGING : CBCharge.NONE,
                        engaging: unitSpec.contact,
                        orderGiven: unitSpec.orderGiven,
                        played: unitSpec.played
                    });
                    unitsMap.set(unit.name, {unit, unitSpec});
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
            case "F":
                return CBTiredness.NONE;
            case "T":
                return CBTiredness.TIRED;
            case "E":
                return CBTiredness.EXHAUSTED;
        }
    }

    getUnitAmmunition(code) {
        switch (code) {
            case "P":
                return CBMunitions.NONE;
            case "S":
                return CBMunitions.SCARCE;
            case "E":
                return CBMunitions.EXHAUSTED;
        }
    }

    getUnitCohesion(code) {
        switch (code) {
            case "GO":
                return CBCohesion.GOOD_ORDER;
            case "D":
                return CBCohesion.DISRUPTED;
            case "R":
                return CBCohesion.ROUTED;
        }
    }
}

export class SequenceLoader {

    constructor() {
    }

    save(game, sequence) {
        let json = this.toSpecs(game, sequence.commit());
        sendPost("/api/sequence/create",
            json,
            (text, status) => {
                consoleLog("SUCCESS! " + text + ": " + status);
                sequence.acknowledge();
            },
            (text, status) => consoleLog("FAILURE! " + text + ": " + status)
        );
    }

    load(game, action) {
        sendPost("/api/sequence/by-game/"+game.name+"/"+CBSequence.getCount(game),
            {},
            (text, status) => {
                let json = JSON.parse(text);
                action(this.fromSpecs(json, game));
                consoleLog(`Sequence of ${game.name} loaded : ${status}`)
            },
            (text, status) => {
                action();
                consoleLog(`Unable to load sequence for game: ${game.name} : ${status}`);
            }
        );
    }

    toSpecs(game, sequence) {
        let sequenceSpecs = {
            version: sequence._oversion || 0,
            game: sequence._game.name,
            count: sequence._validatedCount,
            elements: []
        };
        for (let element of sequence.validated) {
            let elementSpecs = {
                version: element._oversion || 0,
                type: element.type,
            }
            if ("|State|Move|Rotate|Reorient|Turn|".indexOf("|"+element.type+"|")>=0) {
                elementSpecs.unit = element.unit.name;
                elementSpecs.cohesion = this.getCohesionCode(element.cohesion);
                elementSpecs.tiredness = this.getTirednessCode(element.tiredness);
                elementSpecs.ammunition = this.getMunitionsCode(element.munitions);
                elementSpecs.charging = this.getChargingCode(element.charging);
                elementSpecs.engaging = element.engaging;
                elementSpecs.orderGiven = element.orderGiven;
                elementSpecs.played = element.played;
            }
            if ("|Move|Turn|".indexOf("|"+element.type+"|")>=0) {
                if (element.hexLocation instanceof CBHexSideId) {
                    elementSpecs.hexCol = element.hexLocation.fromHex.col;
                    elementSpecs.hexRow = element.hexLocation.fromHex.row;
                    elementSpecs.hexAngle = element.hexLocation.angle;
                }
                else {
                    elementSpecs.hexCol = element.hexLocation.col;
                    elementSpecs.hexRow = element.hexLocation.row;
                }
                elementSpecs.stacking = this.getStackingCode(element.stacking);
            }
            if ("Rotate|Reorient|Turn".indexOf(element.type)>=0) {
                elementSpecs.angle = element.angle;
            }
            sequenceSpecs.elements.push(elementSpecs);
        }
        consoleLog(JSON.stringify(sequenceSpecs));
        return sequenceSpecs;
    }

    fromSpecs(specs, game) {
        consoleLog(JSON.stringify(specs));
        let sequence = new CBSequence(game, specs.count+1);
        let units = new Map();
        for (let playable of game.playables) {
            if (playable instanceof CBUnit) {
                units.set(playable.name, playable);
            }
        }
        for (let elementSpec of specs.elements) {
            let unit;
            if (elementSpec.unit) {
                unit = units.get(elementSpec.unit);
            }
            let hexLocation;
            if (elementSpec.hexCol!==undefined) {
                hexLocation = game.map.getHex(elementSpec.hexCol, elementSpec.hexRow);
                if (elementSpec.hexAngle!==undefined) hexLocation = hexLocation.toward(elementSpec.hexAngle);
            }
            let stacking;
            if (elementSpec.stacking!==undefined) {
                stacking = this.getStacking(elementSpec.stacking)
            }
            let element;
            let angle = elementSpec.angle;
            switch (elementSpec.type) {
                case "State": element = new CBStateSequenceElement(unit); break;
                case "Move": element = new CBMoveSequenceElement(unit, hexLocation, stacking); break;
                case "Rotate": element = new CBRotateSequenceElement(unit, angle); break;
                case "Reorient": element = new CBReorientSequenceElement(unit, angle); break;
                case "Turn": element = new CBTurnSequenceElement(unit, angle, hexLocation, stacking); break;
                case "NextTurn": element = new CBNextTurnSequenceElement(game); break;
            }
            if (elementSpec.tiredness!==undefined) {
                element.tiredness = this.getTiredness(elementSpec.tiredness);
            }
            if (elementSpec.cohesion!==undefined) {
                element.cohesion = this.getCohesion(elementSpec.cohesion);
            }
            if (elementSpec.ammunition!==undefined) {
                element.munitions = this.getMunitions(elementSpec.ammunition);
            }
            if (elementSpec.charging!==undefined) {
                element.charging = this.getCharging(elementSpec.charging);
            }
            if (elementSpec.engaging!==undefined) {
                element.engaging = elementSpec.engaging;
            }
            if (elementSpec.orderGiven!==undefined) {
                element.orderGiven = elementSpec.orderGiven;
            }
            if (elementSpec.played!==undefined) {
                element.played = elementSpec.played;
            }
            sequence.addElement(element);
        }
        return sequence;
    }

    getTirednessCode(tiredness) {
        if (tiredness===CBTiredness.TIRED) return "T";
        else if (tiredness===CBTiredness.EXHAUSTED) return "E";
        else return "F";
    }

    getMunitionsCode(munitions) {
        if (munitions===CBMunitions.SCARCE) return "S";
        else if (munitions===CBMunitions.EXHAUSTED) return "E";
        else return "P";
    }

    getCohesionCode(cohesion) {
        if (cohesion===CBCohesion.DISRUPTED) return "D";
        else if (cohesion===CBCohesion.ROUTED) return "R";
        else if (cohesion===CBCohesion.DESTROYED) return "X";
        else return "GO";
    }

    getChargingCode(charging) {
        if (charging===CBCharge.CHARGING) return "C";
        else if (charging===CBCharge.BEGIN_CHARGE) return "BC";
        else if (charging===CBCharge.CAN_CHARGE) return "CC";
        else return "N";
    }

    getStackingCode(stacking) {
        if (stacking===CBStacking.TOP) return "T";
        else return "B";
    }

    getTiredness(code) {
        switch (code) {
            case "F":
                return CBTiredness.NONE;
            case "T":
                return CBTiredness.TIRED;
            case "E":
                return CBTiredness.EXHAUSTED;
        }
    }

    getMunitions(code) {
        switch (code) {
            case "P":
                return CBMunitions.NONE;
            case "S":
                return CBMunitions.SCARCE;
            case "E":
                return CBMunitions.EXHAUSTED;
        }
    }

    getCohesion(code) {
        switch (code) {
            case "GO":
                return CBCohesion.GOOD_ORDER;
            case "D":
                return CBCohesion.DISRUPTED;
            case "R":
                return CBCohesion.ROUTED;
            case "X":
                return CBCohesion.DESTROYED;
        }
    }

    getCharging(code) {
        switch (code) {
            case "BC":
                return CBCharge.BEGIN_CHARGE;
            case "CC":
                return CBCharge.CAN_CHARGE;
            case "C":
                return CBCharge.CHARGING;
            case "N":
                return CBCharge.NONE;
        }
    }

    getStacking(code) {
        switch (code) {
            case "T":
                return CBStacking.TOP;
            case "B":
                return CBStacking.BOTTOM;
        }
    }

}

export class PlayerIdentityListLoader {

    constructor() {
    }

    load(action) {
        sendPost("/api/player-identity/all",
            {},
            (text, status) => {
                let json = JSON.parse(text);
                action(this.fromSpecs(json));
                consoleLog(`Player identities loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load player identities`)
        );
    }

    fromSpecs(specs) {
        let playerIdentities = [];
        for (let playerIdentitySpec of specs) {
            playerIdentities.push({
                name: playerIdentitySpec.name,
                path: playerIdentitySpec.path
            });
        }
        return playerIdentities;
    }

}

export class BannerListLoader {

    constructor() {
    }

    load(action) {
        sendPost("/api/banner/all",
            {},
            (text, status) => {
                let json = JSON.parse(text);
                action(this.fromSpecs(json));
                consoleLog(`Banners loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load banners`)
        );
    }

    fromSpecs(specs) {
        let banners = [];
        for (let bannerSpec of specs) {
            banners.push({
                name: bannerSpec.name,
                path: bannerSpec.path
            });
        }
        return banners;
    }

}

export class BoardListLoader {

    constructor() {
    }

    load(action) {
        sendPost("/api/board/all",
            {},
            (text, status) => {
                let json = JSON.parse(text);
                action(this.fromSpecs(json));
                consoleLog(`Boards loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load boards`)
        );
    }

    fromSpecs(specs) {
        let boards = [];
        for (let boardSpec of specs) {
            boards.push({
                name: boardSpec.name,
                path: boardSpec.path,
                icon: boardSpec.icon
            });
        }
        return boards;
    }

}
