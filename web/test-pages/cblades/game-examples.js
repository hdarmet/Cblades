'use strict'

import {
    loadAllImages
} from "../mocks.js";
import {
    CBHexSideId, CBMap, CBMoveMode
} from "../../jslib/cblades/map.js";
import {
    CBGame
} from "../../jslib/cblades/game.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    CBInteractivePlayer
} from "../../jslib/cblades/interactive-player.js";
import {
    CBCharacter,
    CBCommandProfile,
    CBFormation,
    CBMoralProfile,
    CBMoveProfile,
    CBTroop,
    CBUnitType,
    CBWeaponProfile,
    CBWing
} from "../../jslib/cblades/unit.js";

export class FireWeaponProfile extends CBWeaponProfile {
    constructor() {
        super(0);
    }
    getFireAttackCode() {
        return "FBw";
    }
}

export class CBTestUnitType extends CBUnitType {
    constructor(name, troopPaths, formationPaths=[]) {
        super(name, troopPaths, formationPaths);
        for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
            this.setMoveProfile(index, new CBMoveProfile());
            this.setWeaponProfile(index, new CBWeaponProfile());
            this.setCommandProfile(index, new CBCommandProfile());
            this.setMoralProfile(index, new CBMoralProfile());
        }
    }
}

export class CBTestFireUnitType extends CBUnitType {
    constructor(name, troopPaths, formationPaths=[]) {
        super(name, troopPaths, formationPaths);
        for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
            this.setMoveProfile(index, new CBMoveProfile());
            this.setWeaponProfile(index, new FireWeaponProfile());
            this.setCommandProfile(index, new CBCommandProfile());
            this.setMoralProfile(index, new CBMoralProfile());
        }
    }
}

export class CBTestArbitrator extends CBArbitrator {

    constructor() {
        super();
        this._updater = actions=>actions;
    }

    getAllowedActions(unit) {
        return this._updater({
            moveForward: true,
            moveMode: CBMoveMode.NO_CONSTRAINT,
            moveBack: true,
            escape: true,
            confront: true,
            shockAttack: true,
            fireAttack: true,
            shockDuel: true,
            fireDuel: true,
            rest: true,
            reload: true,
            reorganize: true,
            rally: true,
            createFormation: true,
            joinFormation: true,
            leaveFormation: true,
            breakFormation: true,
            takeCommand: true,
            leaveCommand: true,
            changeOrders: true,
            giveSpecificOrders: true,
            prepareSpell: true,
            castSpell: true,
            mergeUnit: true,
            miscAction: true
        });
    }

    updateAllowedActions(updater) {
        this._updater = updater;
    }
}

export function prepareTinyGame() {
    let game = new CBGame();
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    return {game, map};
}

export function createTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let wing = new CBWing(player);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let unitType = new CBTestUnitType("unit", ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex(5, 8));
    game.start();
    loadAllImages();
    return {game, arbitrator, player, wing, map, unit};
}

export function createTinyFormationGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let wing = new CBWing(player);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let unitType = new CBTestUnitType("unit",
        ["/CBlades/images/units/misc/troop.png", "/CBlades/images/units/misc/troopb.png"],
        [
            "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png",
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
            "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"
        ]);
    let formation = new CBFormation(unitType, wing);
    formation.angle = 90;
    game.addUnit(formation, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
    game.start();
    loadAllImages();
    return {game, arbitrator, player, wing, map, formation};
}

export function create2PlayersTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let wing1 = new CBWing(player1);
    wing1.setRetreatZone(map.getWestZone());
    let unitType1 = new CBTestUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    wing2.setRetreatZone(map.getEastZone());
    let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"]);
    let unit2 = new CBTroop(unitType2, wing2);
    game.addUnit(unit2, map.getHex(6, 8));
    game.start();
    loadAllImages();
    return {game, arbitrator, map, unit1, unit2, wing1, wing2, player1, player2};
}

export function create2Players2Units2LeadersTinyGame() {
    let {game, map, unit1, unit2, wing1, wing2, player1, player2} = create2PlayersTinyGame();
    let leader1Type = new CBTestUnitType("leader1",
        ["/CBlades/images/units/misc/character1.png", "/CBlades/images/units/misc/character1b.png"]);
    let leader1 = new CBCharacter(leader1Type, wing1);
    game.addUnit(leader1, unit1.hexLocation);
    let leader2Type = new CBTestUnitType("leader2",
        ["/CBlades/images/units/misc/character2.png", "/CBlades/images/units/misc/character2b.png"]);
    let leader2 = new CBCharacter(leader2Type, wing2);
    game.addUnit(leader2, unit2.hexLocation);
    return {game, map, unit1, unit2, wing1, wing2, leader1, leader2, player1, player2};
}

export function create2PlayersTinyFormationGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let wing1 = new CBWing(player1);
    wing1.setRetreatZone(map.getWestZone());
    let unitType1 = new CBTestUnitType("unit1", [
        "/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"
    ]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    wing2.setRetreatZone(map.getEastZone());
    let unitType2 = new CBTestUnitType("unit2", [
            "/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"
        ],
        [
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"
        ]
    );
    let formation2 = new CBFormation(unitType2, wing2);
    formation2.angle = 90;
    game.addUnit(formation2, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
    game.start();
    loadAllImages();
    return {game, arbitrator, map, unit1, formation2, wing1, wing2, player1, player2};
}

export function create2PlayersTinyFireFormationGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let wing1 = new CBWing(player1);
    wing1.setRetreatZone(map.getWestZone());
    let unitType1 = new CBTestUnitType("unit1", [
        "/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"
    ]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    wing2.setRetreatZone(map.getEastZone());
    let unitType2 = new CBTestFireUnitType("unit2", [
            "/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"
        ],
        [
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"
        ]
    );
    let formation2 = new CBFormation(unitType2, wing2);
    formation2.angle = 90;
    game.addUnit(formation2, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
    game.start();
    loadAllImages();
    return {game, arbitrator, map, unit1, formation2, wing1, wing2, player1, player2};
}

export function create2UnitsTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let wing = new CBWing(player);
    let leaderType = new CBTestUnitType("leader",
        ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    let unitType = new CBTestUnitType("unit",
        [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ],
        [
            "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png",
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
            "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"
        ]);
    let unit1 = new CBTroop(unitType, wing);
    let unit2 = new CBTroop(unitType, wing);
    game.addUnit(leader, map.getHex(6, 9));
    game.addUnit(unit1, map.getHex(5, 8));
    game.addUnit(unit2, map.getHex(8, 7));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing, leader, player};
}

export function create2UnitsAndAFormationTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let wing = new CBWing(player);
    let leaderType = new CBTestUnitType("leader",
        ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    let unitType = new CBTestUnitType("unit",
        [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ],
        [
            "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png",
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
            "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"
        ]);
    let unit1 = new CBTroop(unitType, wing);
    let unit2 = new CBTroop(unitType, wing);
    let formation = new CBFormation(unitType, wing);
    formation.angle = 90;
    game.addUnit(leader, map.getHex(6, 9));
    game.addUnit(unit1, map.getHex(5, 8));
    game.addUnit(unit2, map.getHex(8, 7));
    game.addUnit(formation, new CBHexSideId(map.getHex(6, 6), map.getHex(6, 7)));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing, leader, formation, player};
}

export function createTinyGameWithLeader() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let wing = new CBWing(player);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    let unitType = new CBTestUnitType("unit",
        ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex(5, 8));
    let leaderType = new CBTestUnitType("unit",
        ["/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    game.addUnit(leader, map.getHex(5, 9));
    game.start();
    loadAllImages();
    return {game, arbitrator, player, wing, map, unit, leader};
}

export function create2PlayersTinyGameWithLeader() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    let map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);

    var player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    var wing1 = new CBWing(player1);
    let unitType1 = new CBTestUnitType("unit1",
        ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let leaderType1 = new CBTestUnitType("leader1",
        ["/CBlades/images/units/misc/leader1.png", "/CBlades/images/units/misc/leader1b.png"]);
    let leader1 = new CBCharacter(leaderType1, wing1);
    game.addUnit(leader1, map.getHex(5, 9));

    var player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    var wing2 = new CBWing(player2);
    let unitType2 = new CBTestUnitType("unit2",
        ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"]);
    let unit2 = new CBTroop(unitType2, wing2);
    game.addUnit(unit2, map.getHex(7, 8));
    let leaderType2 = new CBTestUnitType("leader2",
        ["/CBlades/images/units/misc/leader2.png", "/CBlades/images/units/misc/leader2b.png"]);
    let leader2 = new CBCharacter(leaderType2, wing2);
    game.addUnit(leader2, map.getHex(7, 9));

    game.start();
    loadAllImages();
    return {game, arbitrator, map, player1, wing1, unit1, leader1, player2, wing2, unit2, leader2};
}