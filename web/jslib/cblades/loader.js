'use strict'

import {
    CBBoard,
    CBHex, CBMap
} from "./map.js";
import {
    sendGet,
    sendPost
} from "../draw.js";
import {
    CBOrderInstruction, CBUnit,
    CBWing
} from "./unit.js";
import {
    CBSequence
} from "./sequences.js";
import {
    CBHexCounter
} from "./playable.js";

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
                CBSequence.setCount(this._game, json.sequenceCount);
                this.fromSpecs(json);
                loaded();
                consoleLog(`Game ${this._game.id} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._game._oid} : ${status}`)
        );
    }

    toSpecs() {
        function toWingSpecs(wing, context) {
            let wingSpecs = {
                id: wing._oid,
                version: wing._oversion || 0,
                leader: wing.leader ? wing.leader.name : undefined,
                moral: wing.moral,
                tiredness: wing.tiredness,
                banner: {
                    id: wing.banner._oid,
                    version: wing.banner._oversion,
                    name: wing.banner.name,
                    path: wing.banner.path
                },
                units: [],
                retreatZone: [],
                orderInstruction: this.getOrderInstructionCode(wing)
            }
            for (let retreatHex of wing.retreatZone) {
                let retreatHexSpecs = {
                    id: retreatHex.hex._oid,
                    version: retreatHex.hex._oversion,
                    col: retreatHex.col,
                    row: retreatHex.row
                }
                wingSpecs.retreatZone.push(retreatHexSpecs);
            }
            for (let unit of wing.playables) {
                let unitSpecs = unit.toSpecs(context);
                wingSpecs.units.push(unitSpecs);
            }
            return wingSpecs;
        }

        function toPlayerSpecs(player, context) {
            let playerSpecs = {
                id: player._oid,
                version: player._oversion || 0,
                identity: {
                    id: player.identity._oid,
                    version: player.identity._oversion || 0,
                    name: player.identity.name,
                    path: player.identity.path
                },
                wings: []
            }
            for (let wing of player.wings) {
                let wingSpecs = toWingSpecs.call(this, wing, context);
                playerSpecs.wings.push(wingSpecs);
            }
            return playerSpecs;
        }

        let context = new Map();
        let gameSpecs = {
            id : this._game.id,
            version: this._game._oversion || 0,
            currentPlayerIndex : this._game.players.indexOf(this._game.currentPlayer),
            currentTurn : this._game.currentTurn,
            players: []
        };
        gameSpecs.map = this._game.map.toSpecs(context);
        for (let player of this._game.players) {
            let playerSpecs = toPlayerSpecs.call(this, player, context);
            gameSpecs.players.push(playerSpecs);
        }
        gameSpecs.locations = [];
        for (let hexId of this._game.map.hexes) {
            if (hexId.playables.length>0) {
                let locationSpecs = {
                    id: hexId.hex._oid,
                    version: hexId.hex._oversion || 0,
                    col: hexId.col,
                    row: hexId.row,
                    pieces: []
                }
                for (let playable of hexId.playables) {
                    if (playable instanceof CBUnit) {
                        locationSpecs.pieces.push({
                            id: playable._oid,
                            version: playable._oversion || 0,
                            name:playable.name
                        });
                    }
                    else {
                        locationSpecs.pieces.push(playable.toSpecs());
                    }
                }
                gameSpecs.locations.push(locationSpecs);
            }
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
        let map = new CBMap(configuration);
        map._oid = specs.map.id;
        map._oversion = specs.map.version;
        this._game.changeMap(map);
        let context = new Map();
        let unitsMap = new Map();
        for (let playerSpec of specs.players) {
            let player = this._game.getPlayer(playerSpec.identity.name);
            if (!player) {
                player = this._playerCreator(playerSpec.identity.name, playerSpec.identity.path);
                this._game.addPlayer(player);
            } else {
                player.setIdentity(playerSpec.identity);
            }
            player._oid = playerSpec.id;
            player._oversion = playerSpec.version;
            player._identity._oid = playerSpec.identity.id;
            player._identity._oversion = playerSpec.identity.version;
            for (let wingSpec of playerSpec.wings) {
                let wing = new CBWing(player, {
                    _oid: wingSpec.banner.id,
                    _oversion: wingSpec.banner.version,
                    name: wingSpec.banner.name,
                    path: wingSpec.banner.path
                });
                wing._oid = wingSpec.id;
                wing._oversion = wingSpec.version;
                wing.setMoral(wingSpec.moral);
                wing.setTiredness(wingSpec.tiredness);
                let retreatZone = [];
                for (let retreatHexSpec of wingSpec.retreatZone) {
                    let hexId = this._game.map.getHex(retreatHexSpec.col, retreatHexSpec.row);
                    retreatZone.push(hexId);
                }
                wing.setRetreatZone(retreatZone);
                let leader = null;
                for (let unitSpecs of wingSpec.units) {
                    let unit = CBUnit.fromSpecs(wing, unitSpecs);
                    unitsMap.set(unit.name, {piece:unit, specs:unitSpecs});
                    if (unit.name === wingSpec.leader) {
                        leader = unit;
                    }
                    context.set(unit.name, unit);
                }
                leader && wing.setLeader(leader);
                wing.setOrderInstruction(this.getOrderInstruction(wingSpec.orderInstruction))
            }
        }
        this.showEntities(unitsMap, specs);
        this._game.currentPlayer = this._game.players[specs.currentPlayerIndex];

        for (let playerSpec of specs.players) {
            for (let wingSpec of playerSpec.wings) {
                for (let unitSpec of wingSpec.units) {
                    if (unitSpec.attributes) {
                        let unit = unitsMap.get(unitSpec.name).piece;
                        CBSequence.launch(unit, unitSpec.attributes.sequenceElement, unitSpec.attributes, context);
                    }
                }
            }
        }

    }

    showEntities(piecesMap, specs) {
        let tokenCount = 0;
        let namesToShow = new Set(piecesMap.keys());
        for (let locationsSpec of specs.locations) {
            for (let index = 0; index < locationsSpec.pieces.length; index++) {
                let hexLocation = this._game.map.getHex(locationsSpec.col, locationsSpec.row);
                hexLocation.hex._oid = locationsSpec.id;
                hexLocation.hex._oversion = locationsSpec.version;
                if (!locationsSpec.pieces[index].name) {
                    locationsSpec.pieces[index].name = "t"+tokenCount++;
                    let piece = CBHexCounter.fromSpecs(locationsSpec.pieces[index], piecesMap);
                    piecesMap.set(locationsSpec.pieces[index].name, {
                        specs: locationsSpec.pieces[index],
                        piece, hexLocation
                    })
                }
                else {
                    let pieceDef = piecesMap.get(locationsSpec.pieces[index].name);
                    if (pieceDef.piece.formationNature) {
                        hexLocation = hexLocation.toward(pieceDef.specs.positionAngle);
                    }
                    pieceDef.hexLocation = hexLocation;
                }
                namesToShow.add(locationsSpec.pieces[index].name);
            }
        }
        let shown = new Set();
        let dependencies = [];
        for (let locationsSpec of specs.locations) {
            for (let index = 0; index < locationsSpec.pieces.length - 1; index++) {
                dependencies.push([locationsSpec.pieces[index].name, locationsSpec.pieces[index + 1].name]);
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
                    let pieceDef = piecesMap.get(name);
                    pieceDef.piece.appendToMap(pieceDef.hexLocation);
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

    getOrderInstructionCode(wing) {
        switch (wing.orderInstruction) {
            case CBOrderInstruction.ATTACK: return "A";
            case CBOrderInstruction.DEFEND: return "D";
            case CBOrderInstruction.REGROUP: return "G";
            case CBOrderInstruction.RETREAT: return "R";
        }
    }

    getOrderInstruction(code) {
        switch (code) {
            case "A": return CBOrderInstruction.ATTACK;
            case "D": return CBOrderInstruction.DEFEND;
            case "G": return CBOrderInstruction.REGROUP;
            case "R": return CBOrderInstruction.RETREAT;
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
        let context = {game: sequence._game};
        for (let element of sequence.validated) {
            let elementSpecs = {};
            element.toSpecs(elementSpecs, context);
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
            let context = {game};
            for (let elementSpec of specs.elements) {
                let element = CBSequence.createElement(elementSpec.id, elementSpec.type);
                element.fromSpecs(elementSpec, context);
                sequence.addElement(element);
            }
            sequences.push(sequence);
        }
        return sequences;
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
