
import {
    DImage, getDrawPlatform, setDrawPlatform
} from "../../jslib/draw.js";
import {
    CBGame
} from "../../jslib/cblades/playable.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    CBBoard, CBHex, CBMap,
} from "../../jslib/cblades/map.js";
import {
    BoardLoader, GameLoader
} from "../../jslib/cblades/loader.js";
import {
    CBCharge,
    CBCohesion,
    CBCommandProfile, CBMoralProfile,
    CBMoveProfile, CBMunitions, CBTiredness,
    CBTroop, CBTroopType,
    CBUnitPlayer, CBWeaponProfile, CBWing
} from "../../jslib/cblades/unit.js";

describe("Loader", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Create board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            board.getHex(0, 0).height = -4;
            board.getHex(0, 1).height = -3;
            board.getHex(0, 2).height = -2;
            board.getHex(0, 3).height = -1;
            board.getHex(0, 4).height = 0;
            board.getHex(0, 5).height = 1;
            board.getHex(0, 6).height = 2;
            board.getHex(0, 7).height = 3;
            board.getHex(0, 8).height = 4;
            board.getHex(0, 0).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
            board.getHex(0, 1).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
            board.getHex(0, 2).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
            board.getHex(0, 3).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
            board.getHex(0, 4).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
            board.getHex(0, 5).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
            board.getHex(0, 6).type = CBHex.HEX_TYPES.WATER;
            board.getHex(0, 7).type = CBHex.HEX_TYPES.LAVA;
            board.getHex(0, 8).type = CBHex.HEX_TYPES.IMPASSABLE;
            board.getHex(0, 9).type = CBHex.HEX_TYPES.CAVE_CLEAR;
            board.getHex(0, 10).type = CBHex.HEX_TYPES.CAVE_ROUGH;
            board.getHex(0, 11).type = CBHex.HEX_TYPES.CAVE_DIFFICULT;
            board.getHex(0, 12).type = CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
            board.getHex(0, 13).type = CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
            board.getHex(0, 14).type = CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;
            board.getHex(0, 0).toward(120).type = CBHex.HEXSIDE_TYPES.NORMAL;
            board.getHex(0, 0).toward(180).type = CBHex.HEXSIDE_TYPES.EASY;
            board.getHex(0, 0).toward(240).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
            board.getHex(0, 1).toward(120).type = CBHex.HEXSIDE_TYPES.CLIMB;
            board.getHex(0, 1).toward(180).type = CBHex.HEXSIDE_TYPES.WALL;
            new BoardLoader(board).save();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/create");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
            let requestContent = getDrawPlatform().getRequest().requestContent;
            assert(requestContent).objectEqualsTo({
                version: 0, name: 'board', path: './../images/maps/map.png'
            });
            assert(requestContent.hexes[0]).objectEqualsTo({
                version: 0, col: 0, row: 0, height: -4, side120Type: "N", side180Type: "E", side240Type: "D", type: "OC"
            });
            assert(requestContent.hexes[1]).objectEqualsTo({
                version: 0, col: 0, row: 1, height: -3, side120Type: "C", side180Type: "W", side240Type: "N", type: "OR"
            });
            assert(requestContent.hexes[2]).objectEqualsTo({
                version: 0, col: 0, row: 2, height: -2, side120Type: "N", side180Type: "N", side240Type: "N", type: "OD"
            });
            assert(requestContent.hexes[3]).objectEqualsTo({
                version: 0, col: 0, row: 3, height: -1, side120Type: "N", side180Type: "N", side240Type: "N", type: "OCF"
            });
            assert(requestContent.hexes[4]).objectEqualsTo({
                version: 0, col: 0, row: 4, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "ORF"
            });
            assert(requestContent.hexes[5]).objectEqualsTo({
                version: 0, col: 0, row: 5, height: 1, side120Type: "N", side180Type: "N", side240Type: "N", type: "ODF"
            });
            assert(requestContent.hexes[6]).objectEqualsTo({
                version: 0, col: 0, row: 6, height: 2, side120Type: "N", side180Type: "N", side240Type: "N", type: "WA"
            });
            assert(requestContent.hexes[7]).objectEqualsTo({
                version: 0, col: 0, row: 7, height: 3, side120Type: "N", side180Type: "N", side240Type: "N", type: "LA"
            });
            assert(requestContent.hexes[8]).objectEqualsTo({
                version: 0, col: 0, row: 8, height: 4, side120Type: "N", side180Type: "N", side240Type: "N", type: "IM"
            });
            assert(requestContent.hexes[9]).objectEqualsTo({
                version: 0, col: 0, row: 9, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CC"
            });
            assert(requestContent.hexes[10]).objectEqualsTo({
                version: 0, col: 0, row: 10, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CR"
            });
            assert(requestContent.hexes[11]).objectEqualsTo({
                version: 0, col: 0, row: 11, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CD"
            });
            assert(requestContent.hexes[12]).objectEqualsTo({
                version: 0, col: 0, row: 12, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CCF"
            });
            assert(requestContent.hexes[13]).objectEqualsTo({
                version: 0, col: 0, row: 13, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CRF"
            });
            assert(requestContent.hexes[14]).objectEqualsTo({
                version: 0, col: 0, row: 14, height: 0, side120Type: "N", side180Type: "N", side240Type: "N", type: "CDF"
            });
        when:
            requestContent.id = 101;
            requestContent.version = 1;
            requestContent.hexes[0].id = 102;
            requestContent.hexes[0].version = 1;
            getDrawPlatform().requestSucceeds(JSON.stringify(requestContent), 200);
        then:
            assert(board._oid).equalsTo(101);
            assert(board._oversion).equalsTo(1);
            assert(board._hexes[0][0]._oid).equalsTo(102);
            assert(board._hexes[0][0]._oversion).equalsTo(1);
    });

    it("Fail to create board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            new BoardLoader(board).save();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/create");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
        when:
            getDrawPlatform().requestFails("Test Error", 500);
        then:
            assert(board._oid).isNotDefined();
            assert(board._oversion).isNotDefined();
    });

    it("Update board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            board._oid = 101;
            board._oversion = 1;
            new BoardLoader(board).save();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/update/101");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
            let requestContent = getDrawPlatform().getRequest().requestContent;
            assert(requestContent).objectEqualsTo({
                id: 101, version: 1, name: 'board', path: './../images/maps/map.png'
            });
        when:
            requestContent.id = 101;
            requestContent.version = 2;
            requestContent.hexes[0].id = 102;
            requestContent.hexes[0].version = 1;
            getDrawPlatform().requestSucceeds(JSON.stringify(requestContent), 200);
        then:
            assert(board._oid).equalsTo(101);
            assert(board._oversion).equalsTo(2);
            assert(board._hexes[0][0]._oid).equalsTo(102);
            assert(board._hexes[0][0]._oversion).equalsTo(1);
    });

    it("Update board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            board._oid = 101;
            board._oversion = 1;
            new BoardLoader(board).save();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/update/101");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
        when:
            getDrawPlatform().requestFails("Test Error", 500);
        then:
            assert(board._oid).equalsTo(101);
            assert(board._oversion).equalsTo(1);
    });

    it("Load board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            board._oid = 101;
            board._oversion = 1;
            new BoardLoader(board).load();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/by-name/board");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
        when:
            var requestContent =  {
                id: 100, version: 1, name: 'board', path: './../images/maps/map.png',
                hexes: [
                    {
                        id: 101, version: 1, col: 0, row: 0, height: -4, side120Type: "N", side180Type: "E", side240Type: "D", type: "OC"
                    }, {
                        id: 102, version: 2, col: 0, row: 1, height: -3, side120Type: "C", side180Type: "W", side240Type: "N", type: "OR"
                    }
                ]
            }
            getDrawPlatform().requestSucceeds(JSON.stringify(requestContent), 200);
        then:
            assert(board._oid).equalsTo(100);
            assert(board._oversion).equalsTo(1);
            assert(board._hexes[0][0]._oid).equalsTo(101);
            assert(board._hexes[0][0]._oversion).equalsTo(1);
    });

    it("Fails to load board", () => {
        given:
            var game = new CBGame("Test");
            var board = new CBBoard("board", "./../images/maps/map.png");
            game.setMap(board);
            game.start();
        when:
            new BoardLoader(board).load();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/by-name/board");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
        when:
            getDrawPlatform().requestFails("Test Error", 404);
        then:
            assert(board._oid).isNotDefined();
            assert(board._oversion).isNotDefined();
    });

    class CBTestTroopType extends CBTroopType {
        constructor(...args) {
            super(...args);
            this.setMoveProfile(1, new CBMoveProfile(-1));
            this.setMoveProfile(2, new CBMoveProfile(0));
            this.setWeaponProfile(1, new CBWeaponProfile(-1, 1, 2, 3));
            this.setWeaponProfile(2, new CBWeaponProfile(0,1, 2, 3));
            this.setCommandProfile(1, new CBCommandProfile(0));
            this.setCommandProfile(2, new CBCommandProfile(0));
            this.setMoralProfile(1, new CBMoralProfile(-1));
            this.setMoralProfile(2, new CBMoralProfile(0));
        }
    }

    it("Create game", () => {
        given:
            var game = new CBGame("Test");
            var map = new CBMap([{path: "./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var player = new CBUnitPlayer("Hector");
            game.addPlayer(player);
            var wing = new CBWing(player, "/red/redbanner.png");
            wing.setRetreatZone([
                map.getHex(0, 0),
                map.getHex(0, 1)
            ]);
            let unitType = new CBTestTroopType("unit", [
                "./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"
            ]);
            var troop1 = new CBTroop(unitType, wing);
            troop1.addToMap(map.getHex(0, 0));
            game.start();
        when:
            new GameLoader(game).save();
        then:
            console.log(getDrawPlatform().getRequest());
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/create");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
            let requestContent = getDrawPlatform().getRequest().requestContent;
            assert(requestContent).objectEqualsTo({
                version:0, name:"Test",
                players:[
                {
                    version:0, name:"Hector",
                    wings:[
                    {
                        version:0, banner:"/red/redbanner.png",
                        units:[{
                            version:0, name:"/red/redbanner.png-0", category:"T", type:"unit",
                            angle:0, positionCol:0, positionRow:0, positionAngle:0, steps:2,
                            tiredness:"F", ammunition:"P", cohesion:"GO", charging:false,
                            contact:false, orderGiven:false, played:false
                        }],
                        retreatZone:[
                            {version:0, col:0, row:0},
                            {version:0, col:0, row:1}
                        ]
                    }],
                    locations:[
                        {version:0,col:0,row:0,units:["/red/redbanner.png-0"]}
                    ]
                }]
            });
         when:
            requestContent.id = 101;
            requestContent.version = 1;
            requestContent.players[0].id = 102;
            requestContent.players[0].version = 1;
            requestContent.players[0].wings[0].id = 103;
            requestContent.players[0].wings[0].version = 1;
            requestContent.players[0].wings[0].units[0].id = 104;
            requestContent.players[0].wings[0].units[0].version = 1;
            getDrawPlatform().requestSucceeds(JSON.stringify(requestContent), 200);
        then:
            assert(game._oid).equalsTo(101);
            assert(game._oversion).equalsTo(1);
            assert(game.players[0]._oid).equalsTo(102);
            assert(game.players[0]._oversion).equalsTo(1);
            assert(game.players[0].wings[0]._oid).equalsTo(103);
            assert(game.players[0].wings[0]._oversion).equalsTo(1);
            assert(game.playables[0]._oid).equalsTo(104);
            assert(game.playables[0]._oversion).equalsTo(1);
    });

    it("Create game", () => {
        given:
            var game = new CBGame("Test");
            var map = new CBMap([{path: "./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var player = new CBUnitPlayer("Hector");
            game.addPlayer(player);
            var wing = new CBWing(player, "/red/redbanner.png");
            wing.setRetreatZone([
                map.getHex(0, 0),
                map.getHex(0, 1)
            ]);
            let unitType = new CBTestTroopType("unit", [
                "./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"
            ]);
            var troop1 = new CBTroop(unitType, wing);
            troop1.addToMap(map.getHex(0, 0));
            troop1.markAsPlayed();
            var troop2 = new CBTroop(unitType, wing);
            troop2.addToMap(map.getHex(0, 1));
            troop2.setTiredness(CBTiredness.TIRED);
            troop2.setCohesion(CBCohesion.DISRUPTED);
            troop2.setMunitions(CBMunitions.SCARCE);
            troop2.setCharging(CBCharge.CHARGING);
            troop2.receivesOrder(true);
            var troop3 = new CBTroop(unitType, wing);
            troop3.addToMap(map.getHex(0, 1));
            troop3.setTiredness(CBTiredness.EXHAUSTED);
            troop3.setCohesion(CBCohesion.ROUTED);
            troop3.setMunitions(CBMunitions.EXHAUSTED);
            troop3.setEngaging(true);
            game.start();
        when:
            new GameLoader(game).save();
        then:
            var requestContent = getDrawPlatform().getRequest().requestContent;
            assert(requestContent.players[0].wings[0]).objectEqualsTo(  {
                units:[{
                    version:0, name:"/red/redbanner.png-0", category:"T", type:"unit",
                    angle:0, positionCol:0, positionRow:0, positionAngle:0, steps:2,
                    tiredness:"F", ammunition:"P", cohesion:"GO", charging:false,
                    contact:false, orderGiven:false, played:true
                }, {
                    version:0, name:"/red/redbanner.png-1", category:"T", type:"unit",
                    angle:0, positionCol:0, positionRow:1, positionAngle:0, steps:2,
                    tiredness:"T", ammunition:"S", cohesion:"D", charging:true,
                    contact:false, orderGiven:true, played:false
                }, {
                    version:0, name:"/red/redbanner.png-2", category:"T", type:"unit",
                    angle:0, positionCol:0, positionRow:1, positionAngle:0, steps:2,
                    tiredness:"E", ammunition:"E", cohesion:"R", charging:false,
                    contact:true, orderGiven:false, played:false
                }],
                retreatZone:[
                    {version:0, col:0, row:0},
                    {version:0, col:0, row:1}
                ]
            });
            assert(requestContent.players[0]).objectEqualsTo({
                locations:[
                    {version:0,col:0,row:0,units:["/red/redbanner.png-0"]},
                    {version:0,col:0,row:1,units:["/red/redbanner.png-1", "/red/redbanner.png-2"]}
                ]
            });
    });

    it("Fail to create game", () => {
        given:
            var game = new CBGame("Test");
            var map = new CBMap([{path: "./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
        when:
            new GameLoader(game).save();
        then:
            console.log(getDrawPlatform().getRequest());
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/create");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
        when:
            getDrawPlatform().requestFails("Test Error", 500);
        then:
            assert(game._oid).isNotDefined();
            assert(game._oversion).isNotDefined();
    });

    it("Upadte game", () => {
        given:
            var game = new CBGame("Test");
            game._oid = 101;
            game._oversion = 1;
            var map = new CBMap([{path: "./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
        when:
            new GameLoader(game).save();
        then:
            console.log(getDrawPlatform().getRequest());
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/update/101");
            assert(getDrawPlatform().getRequest().method).equalsTo("POST");
            let requestContent = getDrawPlatform().getRequest().requestContent;
            assert(requestContent).objectEqualsTo({
                id:101, version:1, name:"Test",
            });
        when:
            requestContent.version = 2;
            getDrawPlatform().requestSucceeds(JSON.stringify(requestContent), 200);
        then:
            assert(game._oid).equalsTo(101);
            assert(game._oversion).equalsTo(2);
    });


});