'use strict'

import {
    CBBoard,
    CBHex, CBHexSideId, CBMap
} from "./map.js";
import {
    sendGet,
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
    CBAttackerEngagementSequenceElement,
    CBConfrontSequenceElement, CBCrossingSequenceElement,
    CBDefenderEngagementSequenceElement,
    CBDisengagementSequenceElement,
    CBLoseCohesionSequenceElement,
    CBMoveSequenceElement,
    CBNextTurnSequenceElement,
    CBRallySequenceElement,
    CBRefillSequenceElement,
    CBReorganizeSequenceElement,
    CBReorientSequenceElement,
    CBRestSequenceElement,
    CBRotateSequenceElement,
    CBSequence, CBStateSequenceElement,
    CBTurnSequenceElement
} from "./sequences.js";

//let consoleLog = console.log;
let consoleLog = ()=>{};

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

    constructor() {
    }

    save(board) {
        let json = this.toSpecs(board);
        if (json.id === undefined) {
            sendPost("/api/board/create",
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(board, JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
        else {
            sendPost("/api/board/update-hexes/"+board._oid,
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(board, JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
    }

    load(id, success) {
        sendGet("/api/board/find/"+id,
            (text, status) => {
                let json = JSON.parse(text);
                let board = new CBBoard(json.name, json.path, json.icon);
                this.fromSpecs(board, json);
                success(board);
                consoleLog(`Board ${board.name} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${id} : ${status}`)
        );
    }

    toSpecs(board) {
        let mapSpecs = {
            version: board._oversion || 0,
            name: board._name,
            path: board._path,
            icon: board._icon,
            hexes: []
        };
        if (board._oid) mapSpecs.id = board._oid;
        for (let hexId of board.hexes) {
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

    fromSpecs(board, specs) {
        board._oid = specs.id || 0;
        board._oversion = specs.version || 0;
        board._name = specs.name;
        board._path = specs.path;
        board._icon = specs.icon;
        if (specs.id) board._oid = specs.id;
        for (let hexSpec of specs.hexes) {
            let hexId = board.getHex(hexSpec.col, hexSpec.row);
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
            sendPost("/api/game/update/" + this._game.id,
                json,
                (text, status) => {
                    consoleLog("SUCCESS! " + text + ": " + status);
                    this.fromSpecs(JSON.parse(text));
                },
                (text, status) => consoleLog("FAILURE! " + text + ": " + status)
            );
        }
    }

    loadForEdition(id, loaded=()=>{}) {
        sendGet("/api/game/find/" + id,
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                loaded();
                consoleLog(`Game ${this._game.id} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._game._oid} : ${status}`)
        );
    }

    loadForPlay(id, actives, loaded=()=>{}) {
        sendPost("/api/game/play/load/" + id,
            actives,
            (text, status) => {
                let json = JSON.parse(text);
                this.fromSpecs(json);
                CBSequence.setCount(this._game, json.sequenceCount);
                loaded();
                consoleLog(`Game ${this._game.id} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._game._oid} : ${status}`)
        );
    }

    toSpecs() {
        let gameSpecs = {
            id : this._game.id,
            version: this._game._oversion || 0,
            currentPlayerIndex : this._game.players.indexOf(this._game.currentPlayer),
            currentTurn : this._game.currentTurn,
            players: []
        };
        let mapCompositionSpecs = {
            id : this._game.map._oid,
            version: this._game.map._oversion || 0,
            boards: []
        }
        gameSpecs.map = mapCompositionSpecs;
        for (let board of this._game.map.mapBoards) {
            let boardSpec = {
                id : board._oid,
                version: board._oversion || 0,
                col: board.col,
                row: board.row,
                path: board.path,
                icon: board.icon,
                invert: !!board.invert
            };
            mapCompositionSpecs.boards.push(boardSpec);
        }
        for (let player of this._game.players) {
            let playerSpecs = {
                id : player._oid,
                version: player._oversion || 0,
                identity: {
                    id: player.identity._oid,
                    version: player.identity._oversion || 0,
                    name: player.identity.name,
                    path: player.identity.path
                },
                wings: [],
                locations: []
            }
            let locations = new Set();
            for (let wing of player.wings) {
                let wingSpecs = {
                    id : wing._oid,
                    version: wing._oversion || 0,
                    banner: {
                        id: wing.banner._oid,
                        version: wing.banner._oversion,
                        name: wing.banner.name,
                        path: wing.banner.path
                    },
                    units: [],
                    retreatZone: []
                }
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
                        id : unit._oid,
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
        this._game._oversion = specs.version || 0;
        this._game.currentTurn = specs.currentTurn;
        let configuration = [];
        if (specs.map.boards) {
            for (let boardSpec of specs.map.boards) {
                let board = {
                    _oid: boardSpec.id,
                    _oversion: boardSpec.version,
                    col: boardSpec.col,
                    row: boardSpec.row,
                    path: boardSpec.path,
                    icon: boardSpec.icon
                }
                if (boardSpec.invert) board.invert = true;
                configuration.push(board);
            }
        }
        let map = new CBMap(configuration);
        map._oid = specs.map.id;
        map._oversion = specs.map.version;
        this._game.changeMap(map);
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
            player._identity._oid = playerSpec.identity.id;
            player._identity._oversion = playerSpec.identity.version;
            let unitsMap = new Map();
            for (let wingSpec of playerSpec.wings) {
                let wing = new CBWing(player, {
                    _oid: wingSpec.banner.id,
                    _oversion: wingSpec.banner.version,
                    name: wingSpec.banner.name,
                    path: wingSpec.banner.path
                });
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
                        steps: unitSpec.steps,
                        tiredness: this.getUnitTiredness(unitSpec.tiredness),
                        munitions: this.getUnitAmmunition(unitSpec.ammunition),
                        cohesion: this.getUnitCohesion(unitSpec.cohesion),
                        charging: unitSpec.charging ? CBCharge.CHARGING : CBCharge.NONE,
                        engaging: unitSpec.engaging,
                        orderGiven: unitSpec.orderGiven,
                        played: unitSpec.played
                    });
                    unitsMap.set(unit.name, {unit, unitSpec});
                }
            }
            this.showEntities(unitsMap, playerSpec);
        }
        this._game.currentPlayer = this._game.players[specs.currentPlayerIndex];
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
        sendPost("/api/sequence/by-game/"+game.id+"/"+CBSequence.getCount(game),
            {},
            (text, status) => {
                let json = JSON.parse(text);
                action(this.fromSpecs(json, game));
                consoleLog(`Sequence of ${game.id} loaded : ${status}`)
            },
            (text, status) => {
                action();
                consoleLog(`Unable to load sequence for game: ${game.id} : ${status}`);
            }
        );
    }

    toSpecs(game, sequence) {
        let sequenceSpecs = {
            version: sequence._oversion || 0,
            game: sequence._game.id,
            count: sequence._validatedCount,
            elements: []
        };
        for (let element of sequence.validated) {
            let elementSpecs = {
                version: element._oversion || 0,
                type: element.type,
            }
            if (("|State|Rest|Refill|Rally|Reorganize|LossConsistency" +
                "|Confront|Crossing|AttackerEngagement|DefenderEngagement" +
                "|Disengagement|Move|Rotate|Reorient|Turn|")
                .indexOf("|"+element.type+"|")>=0) {
                elementSpecs.unit = element.unit.name;
                elementSpecs.steps = element.unit.steps;
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
            if ("|Rotate|Reorient|Turn|".indexOf("|"+element.type+"|")>=0) {
                elementSpecs.angle = element.angle;
            }
            if (("|Rest|Refill|Rally|Reorganize|LossConsistency|Confront" +
                "|Crossing|AttackerEngagement|DefenderEngagement|Disengagement|")
                .indexOf("|"+element.type+"|")>=0) {
                elementSpecs.dice1 = element.dice[0];
                elementSpecs.dice2 = element.dice[1];
            }
            sequenceSpecs.elements.push(elementSpecs);
        }
        consoleLog(JSON.stringify(sequenceSpecs));
        return sequenceSpecs;
    }

    fromSpecs(specList, game) {
        consoleLog(JSON.stringify(specList));
        let sequences = [];
        for (let specs of specList) {
            let sequence = new CBSequence(game, specs.count);
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
                if (elementSpec.hexCol !== undefined) {
                    hexLocation = game.map.getHex(elementSpec.hexCol, elementSpec.hexRow);
                    //if (elementSpec.hexAngle!==undefined) hexLocation = hexLocation.toward(elementSpec.hexAngle);
                }
                let stacking;
                if (elementSpec.stacking !== undefined) {
                    stacking = this.getStacking(elementSpec.stacking)
                }
                let element;
                let angle = elementSpec.angle;
                switch (elementSpec.type) {
                    case "State":
                        element = new CBStateSequenceElement(unit, hexLocation, stacking);
                        break;
                    case "Move":
                        element = new CBMoveSequenceElement(unit, hexLocation, stacking);
                        break;
                    case "Rotate":
                        element = new CBRotateSequenceElement(unit, angle);
                        break;
                    case "Reorient":
                        element = new CBReorientSequenceElement(unit, angle);
                        break;
                    case "Turn":
                        element = new CBTurnSequenceElement(unit, angle, hexLocation, stacking);
                        break;
                    case "Rest":
                        element = new CBRestSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Refill":
                        element = new CBRefillSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Rally":
                        element = new CBRallySequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Reorganize":
                        element = new CBReorganizeSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "LossConsistency":
                        element = new CBLoseCohesionSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Confront":
                        element = new CBConfrontSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Crossing":
                        element = new CBCrossingSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "AttackerEngagement":
                        element = new CBAttackerEngagementSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "DefenderEngagement":
                        element = new CBDefenderEngagementSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "Disengagement":
                        element = new CBDisengagementSequenceElement(game, unit, [elementSpec.dice1, elementSpec.dice2]);
                        break;
                    case "NextTurn":
                        element = new CBNextTurnSequenceElement(game);
                        break;
                }
                if (elementSpec.steps !== undefined) {
                    element.steps = elementSpec.steps;
                }
                if (elementSpec.tiredness !== undefined) {
                    element.tiredness = this.getTiredness(elementSpec.tiredness);
                }
                if (elementSpec.cohesion !== undefined) {
                    element.cohesion = this.getCohesion(elementSpec.cohesion);
                }
                if (elementSpec.ammunition !== undefined) {
                    element.munitions = this.getMunitions(elementSpec.ammunition);
                }
                if (elementSpec.charging !== undefined) {
                    element.charging = this.getCharging(elementSpec.charging);
                }
                if (elementSpec.engaging !== undefined) {
                    element.engaging = elementSpec.engaging;
                }
                if (elementSpec.orderGiven !== undefined) {
                    element.orderGiven = elementSpec.orderGiven;
                }
                if (elementSpec.played !== undefined) {
                    element.played = elementSpec.played;
                }
                sequence.addElement(element);
            }
            sequences.push(sequence);
        }
        return sequences;
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
        sendGet("/api/player-identity/live",
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
        sendGet("/api/banner/live",
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
        sendGet("/api/board/live",
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
