'use strict'

import {
    loadAllImages
} from "../mocks.js";
import {
    CBGame, CBHexSideId, CBMap
} from "../../jslib/cblades/game.js";
import {
    CBArbitrator
} from "../../jslib/cblades/arbitrator.js";
import {
    CBInteractivePlayer
} from "../../jslib/cblades/interactive-player.js";
import {
    CBCharacter, CBFormation, CBTroop, CBUnitType, CBWing
} from "../../jslib/cblades/unit.js";

export function prepareTinyGame() {
    var game = new CBGame();
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    return {game, map};
}

export function createTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var wing = new CBWing(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let unitType = new CBUnitType("unit", ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex( 5, 8));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, wing, map, unit };
}

export function createTinyFormationGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var wing = new CBWing(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let unitType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/troop.png", "/CBlades/images/units/misc/troopb.png"],
        [
            "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png",
            "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png",
            "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"
        ]);
    let formation = new CBFormation(unitType, wing);
    formation.angle = 90;
    game.addUnit(formation, new CBHexSideId(map.getHex( 5, 8), map.getHex( 5, 7)));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, wing, map, formation };
}

export function create2PlayersTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    let map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing1 = new CBWing(player1);
    let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"]);
    let unit2 = new CBTroop(unitType2, wing2);
    game.addUnit(unit2, map.getHex(6, 8));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing1, wing2, player1, player2};
}

export function create2PlayersTinyFormationGame() {
    let game = new CBGame();
    let arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    let map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing1 = new CBWing(player1);
    let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    let unitType2 = new CBUnitType("unit2",
        ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"],
        ["/CBlades/)images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"]);
    let formation2 = new CBFormation(unitType2, wing2);
    formation2.angle = 90;
    game.addUnit(formation2, new CBHexSideId(map.getHex(6, 8), map.getHex(6, 7)));
    game.start();
    loadAllImages();
    return {game, map, unit1, formation2, wing1, wing2, player1, player2};
}

export function create2UnitsTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing = new CBWing(player);
    let leaderType = new CBUnitType("leader",
        ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    let unitType = new CBUnitType("unit",
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
    game.addUnit(unit2, map.getHex( 8, 7));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing, leader, player};
}

export function create2UnitsAndAFormationTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing = new CBWing(player);
    let leaderType = new CBUnitType("leader",
        ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    let unitType = new CBUnitType("unit",
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
    game.addUnit(unit2, map.getHex( 8, 7));
    game.addUnit(formation, new CBHexSideId(map.getHex( 6, 6), map.getHex( 6, 7)));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing, leader, formation, player};
}

export function createTinyGameWithLeader() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var wing = new CBWing(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let unitType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex( 5, 8));
    let leaderType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    game.addUnit(leader, map.getHex( 5, 9));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, wing, map, unit, leader };
}
