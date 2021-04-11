

import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    CBGame
} from "../../jslib/cblades/game.js";
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
    CBHex,
    CBMap
} from "../../jslib/cblades/map.js";
import {
    CBMoveProfile
} from "../../jslib/cblades/unit.js";
import {
    AnimalMoveProfile,
    CavalryMoveProfile,
    HeavyCavalryWeaponProfile, LanceWeaponProfile,
    LightInfantryWeaponProfile,
    MediumCavalryWeaponProfile,
    PedestrianMoveProfile
} from "../../jslib/cblades/profile.js";

describe("Profile", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    function setTerran(map) {
        map.getHex(1, 1).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR;
        map.getHex(1, 2).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH;
        map.getHex(1, 3).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT;
        map.getHex(1, 4).type = CBHex.HEX_TYPES.OUTDOOR_CLEAR_FLAMMABLE;
        map.getHex(1, 5).type = CBHex.HEX_TYPES.OUTDOOR_ROUGH_FLAMMABLE;
        map.getHex(2, 1).type = CBHex.HEX_TYPES.OUTDOOR_DIFFICULT_FLAMMABLE;
        map.getHex(2, 2).type = CBHex.HEX_TYPES.WATER;
        map.getHex(2, 3).type = CBHex.HEX_TYPES.LAVA;
        map.getHex(2, 4).type = CBHex.HEX_TYPES.IMPASSABLE;
        map.getHex(2, 5).type = CBHex.HEX_TYPES.CAVE_CLEAR;
        map.getHex(3, 1).type = CBHex.HEX_TYPES.CAVE_ROUGH;
        map.getHex(3, 2).type = CBHex.HEX_TYPES.CAVE_DIFFICULT;
        map.getHex(3, 3).type = CBHex.HEX_TYPES.CAVE_CLEAR_FLAMMABLE;
        map.getHex(3, 4).type = CBHex.HEX_TYPES.CAVE_ROUGH_FLAMMABLE;
        map.getHex(3, 5).type = CBHex.HEX_TYPES.CAVE_DIFFICULT_FLAMMABLE;

        map.getHex(6, 6).toward(0).type = CBHex.HEXSIDE_TYPES.NORMAL;
        map.getHex(6, 6).toward(60).type = CBHex.HEXSIDE_TYPES.EASY;
        map.getHex(6, 6).toward(120).type = CBHex.HEXSIDE_TYPES.DIFFICULT;
        map.getHex(6, 6).toward(180).type = CBHex.HEXSIDE_TYPES.CLIMB;
        map.getHex(6, 6).toward(240).type = CBHex.HEXSIDE_TYPES.WALL;
    }

    it("Checks Pedestrian Profile", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            setTerran(map);
        when:
            var profile = new PedestrianMoveProfile(2);
        then:
            assert(profile.movementPoints).equalsTo(4);
            assert(profile.extendedMovementPoints).equalsTo(6);
            assert(profile.getMovementCostOnHex(map.getHex(1, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );

            assert(profile.getMovementCostOnHex(map.getHex(2, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );

            assert(profile.getMovementCostOnHex(map.getHex(3, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );

            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(0))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(60))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.SET, value:0.5}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(120))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0.5}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(180))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(240))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );

            assert(profile.getRotationCost(60)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0
            });
            assert(profile.getRotationCost(90)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0.5
            });
            assert(profile.getFormationRotationCost(180)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
    });

    it("Checks Animal Profile", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            setTerran(map);
        when:
            var profile = new AnimalMoveProfile(2);
        then:
            assert(profile.movementPoints).equalsTo(5);
            assert(profile.extendedMovementPoints).equalsTo(7.5);
            assert(profile.getMovementCostOnHex(map.getHex(1, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );

            assert(profile.getMovementCostOnHex(map.getHex(2, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );

            assert(profile.getMovementCostOnHex(map.getHex(3, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:2}
            );

            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(0))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(60))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.SET, value:0.5}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(120))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0.5}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(180))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(240))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );

            assert(profile.getRotationCost(60)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0
            });
            assert(profile.getRotationCost(90)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0.5
            });
            assert(profile.getFormationRotationCost(180)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
    });

    it("Checks cavalry Profile", () => {
        given:
            var game = new CBGame();
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            setTerran(map);
        when:
            var profile = new CavalryMoveProfile(2);
        then:
            assert(profile.movementPoints).equalsTo(5);
            assert(profile.extendedMovementPoints).equalsTo(7.5);
            assert(profile.getMovementCostOnHex(map.getHex(1, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(1, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );

            assert(profile.getMovementCostOnHex(map.getHex(2, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(2, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );

            assert(profile.getMovementCostOnHex(map.getHex(3, 1))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 2))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 3))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 4))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:1.5}
            );
            assert(profile.getMovementCostOnHex(map.getHex(3, 5))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE}
            );

            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(0))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.ADD, value:0}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(60))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.SET, value:0.5}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(120))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(180))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );
            assert(profile.getMovementCostOnHexSide(map.getHex(6, 6).toward(240))).objectEqualsTo(
                {type:CBMoveProfile.COST_TYPE.IMPASSABLE}
            );

            assert(profile.getRotationCost(60)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0.5
            });
            assert(profile.getRotationCost(90)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
            assert(profile.getFormationRotationCost(180)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1.5
            });
    });

    it("Checks Heavy Cavalry Weapon Profile", () => {
        given:
            var profile = new HeavyCavalryWeaponProfile(2);
        then:
            assert(profile.getShockAttackCode()).equalsTo("HCv");
            assert(profile.getShockDefendCode()).equalsTo("HCv");
            assert(profile.getFireAttackCode()).isNotDefined();
            assert(profile.getFireDefendCode()).equalsTo("HCv");
    });

    it("Checks Medium Cavalry Weapon Profile", () => {
        given:
            var profile = new MediumCavalryWeaponProfile(2);
        then:
            assert(profile.getShockAttackCode()).equalsTo("MCv");
            assert(profile.getShockDefendCode()).equalsTo("MCv");
            assert(profile.getFireAttackCode()).isNotDefined();
            assert(profile.getFireDefendCode()).equalsTo("MCv");
    });

    it("Checks Lance Weapon Profile", () => {
        given:
            var profile = new LanceWeaponProfile(2);
        then:
            assert(profile.getShockAttackCode()).equalsTo("Lan");
            assert(profile.getShockDefendCode()).equalsTo("Lan");
            assert(profile.getFireAttackCode()).isNotDefined();
            assert(profile.getFireDefendCode()).equalsTo("Lan");
    });

    it("Checks Light Infantry Weapon Profile", () => {
        given:
            var profile = new LightInfantryWeaponProfile(2);
        then:
            assert(profile.getShockAttackCode()).equalsTo("LIf");
            assert(profile.getShockDefendCode()).equalsTo("LIf");
            assert(profile.getFireAttackCode()).equalsTo("LIf");
            assert(profile.getFireDefendCode()).equalsTo("LIf");
            assert(profile.getFireRange()).equalsTo(2);
    });


});