'use strict'

import {
    CBBoard,
    CBHex
} from "./map.js";
import {
    sendGet,
    sendPost
} from "../draw.js";
import {
    CBSequence
} from "./sequences.js";
import {
    Mechanisms
} from "../mechanisms.js";
import {
    CBGame
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
                Mechanisms.fire(this._game, CBGame.LOADED_EVENT);
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
                Mechanisms.fire(this._game, CBGame.LOADED_EVENT);
                loaded();
                consoleLog(`Game ${this._game.id} loaded : ${status}`)
            },
            (text, status) => consoleLog(`Unable to load ${this._game._oid} : ${status}`)
        );
    }

    toSpecs() {
        let context = new Map();
        return this._game.toSpecs(context);
    }

    fromSpecs(specs) {
        consoleLog(JSON.stringify(specs));
        let context = new Map();
        context.playerCreator = this._playerCreator;
        this._game.fromSpecs(specs, context);
        for (let seqSpec of specs.sequenceElements) {
            this.launch(seqSpec, context);
        }
    }

    launch(specs, context) {
        (CBSequence.getLauncher(specs.type))(specs, context);
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
        return sequence.toSpecs(game);
    }

    fromSpecs(specList, game) {
        let sequences = [];
        for (let specs of specList) {
            let sequence = new CBSequence(game, specs.count);
            let context = new Map();
            context.game = game;
            sequence.fromSpecs(specs, context);
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
