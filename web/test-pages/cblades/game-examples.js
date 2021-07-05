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

export function createBaseGame() {
    let game = new CBGame();
    let arbitrator = new CBTestArbitrator();
    game.setArbitrator(arbitrator);
    var map = new CBMap([{path: "/CBlades/images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    game.start();
    return {game, arbitrator, map};
}

export function create1PlayerBaseGame() {
    let baseGame = createBaseGame();
    let {game, map} = baseGame;
    let player = new CBInteractivePlayer();
    game.addPlayer(player);
    let wing = new CBWing(player);
    wing.setRetreatZone(map.getWestZone());
    return {
        ...baseGame,
        player,
        wing
    };
}

export function create2PlayersBaseGame() {
    let baseGame = createBaseGame();
    let {game, map} = baseGame;
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    let wing1 = new CBWing(player1);
    wing1.setRetreatZone(map.getWestZone());
    let wing2 = new CBWing(player2);
    wing2.setRetreatZone(map.getEastZone());
    return {
        ...baseGame,
        player1,
        player2,
        wing1,
        wing2
    };
}

export function createUnitType(clazz, name, number, maxFigurines) {
    let formationsImages = [];
    for (let figurine=1; figurine<maxFigurines; figurine++) {
        formationsImages.push(`/CBlades/images/units/misc/formation${figurine}${number}.png`, `/CBlades/images/units/misc/formation${figurine}${number}b.png`);
    }
    return new clazz(name,
        [`/CBlades/images/units/misc/${name}${number}.png`, `/CBlades/images/units/misc/${name}${number}b.png`],
        formationsImages
    );
}

export function setWeaponBonuses(unitType, step, attackBonus, defenseBonus, fireBonus) {
    unitType.getWeaponProfile(step)._attackBonus = attackBonus;
    unitType.getWeaponProfile(step)._defenseBonus = defenseBonus;
    unitType.getWeaponProfile(step)._fireBonus = fireBonus;
}

export function createTroop(game, map, unitType, wing, angle, x, y) {
    let troop = new CBTroop(unitType, wing);
    troop.angle = angle;
    game.addUnit(troop, map.getHex(x, y));
    return troop;
}

export function createFormation(game, map, unitType, wing, angle, x1, y1, x2, y2) {
    let formation = new CBFormation(unitType, wing);
    formation.angle = angle;
    game.addUnit(formation, new CBHexSideId(map.getHex(x1, y1), map.getHex(x2, y2)));
    return formation;
}

export function createCharacter(game, map, unitType, wing, angle, x, y) {
    let leader = new CBCharacter(unitType, wing);
    leader.angle = angle;
    game.addUnit(leader, map.getHex(x, y));
    return leader;
}

export class FireWeaponProfile extends CBWeaponProfile {
    constructor(...args) {
        super(...args);
    }
    getFireAttackCode() {
        return "FBw";
    }
}

export class LanceWeaponProfile extends CBWeaponProfile {
    constructor(...args) {
        super(...args);
    }
    getShockAttackCode() {
        return "Lan";
    }
}

export class LightInfantryWeaponProfile extends CBWeaponProfile {
    constructor(...args) {
        super(...args);
    }
    getShockAttackCode() {
        return "LIf";
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
            miscActions: true
        });
    }

    updateAllowedActions(updater) {
        this._updater = updater;
    }
}

export class CBTestUnitType extends CBUnitType {
    constructor(name, troopPaths, formationPaths=[]) {
        super(name, troopPaths, formationPaths);
        for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
            this.setMoveProfile(index, new CBMoveProfile());
            this.setWeaponProfile(index, new LanceWeaponProfile(1));
            this.setCommandProfile(index, new CBCommandProfile());
            this.setMoralProfile(index, new CBMoralProfile());
        }
    }
}

export class CBTestOtherUnitType extends CBUnitType {
    constructor(name, troopPaths, formationPaths=[]) {
        super(name, troopPaths, formationPaths);
        for (let index=1; index<=troopPaths.length+formationPaths.length; index++) {
            this.setMoveProfile(index, new CBMoveProfile());
            this.setWeaponProfile(index, new LightInfantryWeaponProfile(2));
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
            this.setWeaponProfile(index, new FireWeaponProfile(0));
            this.setCommandProfile(index, new CBCommandProfile());
            this.setMoralProfile(index, new CBMoralProfile());
        }
    }
}

export function createTinyGame() {
    let tinyGame = create1PlayerBaseGame();
    let {game, map, wing} = tinyGame;
    let unitType = createUnitType(CBTestUnitType,"unit", 1, 1);
    let unit = createTroop(game, map, unitType, wing, 0, 5, 8);
    loadAllImages();
    return {
        ...tinyGame,
        unitType, unit
    };
}

export function createTinyFormationGame() {
    let tinyGame = create1PlayerBaseGame();
    let {game, map, wing} = tinyGame;
    let unitType = createUnitType(CBTestUnitType,"unit", 1, 4);
    let formation = createFormation(game, map, unitType, wing, 90, 5, 8, 5, 7);
    loadAllImages();
    return {
        ...tinyGame,
        unitType, formation
    };
}

export function create2PlayersTinyGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestUnitType,"unit", 1, 1);
    let unit1 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unitType2 = createUnitType(CBTestOtherUnitType,"unit", 2, 1);
    let unit2 = createTroop(game, map, unitType2, wing2, 0, 6, 8);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit1,
        unitType2, unit2
    };
}

export function create2Players4UnitsTinyGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestUnitType,"unit", 1, 1);
    let unit11 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unit12 = createTroop(game, map, unitType1, wing1, 0, 5, 9);
    let unitType2 = createUnitType(CBTestUnitType,"unit", 2, 1);
    let unit21 = createTroop(game, map, unitType2, wing2, 0, 6, 8);
    let unit22 = createTroop(game, map, unitType2, wing2, 0, 6, 9);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit11, unit12,
        unitType2, unit21, unit22
    };
}

export function create2Players4UnitsFireTinyGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestFireUnitType,"unit", 1, 1);
    let unit11 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unit12 = createTroop(game, map, unitType1, wing1, 0, 5, 9);
    let unitType2 = createUnitType(CBTestFireUnitType,"unit", 2, 1);
    let unit21 = createTroop(game, map, unitType2, wing2, 0, 6, 8);
    let unit22 = createTroop(game, map, unitType2, wing2, 0, 6, 9);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit11, unit12,
        unitType2, unit21, unit22
    };
}

export function create2PlayersFireTinyGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestFireUnitType,"unit", 1, 1);
    let unit1 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unitType2 = createUnitType(CBTestFireUnitType,"unit", 2, 1);
    let unit2 = createTroop(game, map, unitType2, wing2, 0, 6, 8);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit1,
        unitType2, unit2
    };
}

export function create2Players2Units2LeadersTinyGame() {
    let tinyGame = create2PlayersTinyGame();
    let {game, map, wing1, wing2} = tinyGame;
    let leaderType1 = createUnitType(CBTestUnitType, "leader", 1, 1);
    let leader1 = createCharacter(game, map, leaderType1, wing1, 0, 5, 8);
    let leaderType2 = createUnitType(CBTestFireUnitType,"leader", 2, 1);
    let leader2 = createCharacter(game, map, leaderType2, wing2, 0, 6, 8);
    return {
        ...tinyGame,
        leaderType1, leader1,
        leaderType2, leader2
    };
}

export function create2PlayersTinyFormationGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestUnitType,"unit", 1, 1);
    let unit1 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unitType2 = createUnitType(CBTestUnitType,"unit", 2, 4);
    let formation2 = createFormation(game, map, unitType2, wing2, 90, 6, 8, 6, 7);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit1,
        unitType2, formation2
    };
}

export function create2PlayersTinyFireFormationGame() {
    let tinyGame = create2PlayersBaseGame();
    let {game, map, wing1, wing2} = tinyGame;
    let unitType1 = createUnitType(CBTestFireUnitType,"unit", 1, 1);
    let unit1 = createTroop(game, map, unitType1, wing1, 0, 5, 8);
    let unitType2 = createUnitType(CBTestFireUnitType,"unit", 2, 4);
    let formation2 = createFormation(game, map, unitType2, wing2, 90, 6, 8, 6, 7);
    loadAllImages();
    return {
        ...tinyGame,
        unitType1, unit1,
        unitType2, formation2
    };
}

export function create2UnitsTinyGame() {
    let tinyGame = create1PlayerBaseGame();
    let {game, map, wing} = tinyGame;
    let unitType = createUnitType(CBTestUnitType,"unit", 1, 4);
    let unit1 = createTroop(game, map, unitType, wing, 0, 5, 8);
    let unit2 = createTroop(game, map, unitType, wing, 0, 8, 7);
    let leaderType = createUnitType(CBTestUnitType, "leader", 1, 1);
    let leader = createCharacter(game, map, leaderType, wing, 0, 6, 9);
    loadAllImages();
    return {
        ...tinyGame,
        unitType, unit1, unit2,
        leaderType, leader
    };
}

export function create2UnitsAndAFormationTinyGame() {
    let tinyGame = create2UnitsTinyGame();
    let {game, map, wing, unitType} = tinyGame;
    let formation = createFormation(game, map, unitType, wing, 90, 6, 6, 6, 7);
    loadAllImages();
    return {
        ...tinyGame,
        formation
    };
}

export function createTinyGameWithLeader() {
    let tinyGame = createTinyGame();
    let {game, map, wing} = tinyGame;
    let leaderType = createUnitType(CBTestUnitType, "leader", 1, 1);
    let leader = createCharacter(game, map, leaderType, wing, 0, 5, 9);
    loadAllImages();
    return {
        ...tinyGame,
        leaderType, leader
    };
}
