'use strict'

import {
    DImage, setDrawPlatform
} from "../../../jslib/draw.js";

import {
    Mechanisms, Memento
} from "../../../jslib/mechanisms.js";
import {
    assert,
    before, describe, it
} from "../../../jstest/jtest.js";
import {
    mockPlatform
} from "../../mocks.js";
import {
    GoblinLeader, GoblinSkirmisher, GoblinWolfRider
} from "../../../jslib/cblades/armies/orcs.js";
import {
    AnimalMoveProfile,
    CBProfileCapacity, ExaltedMoralProfile,
    IrregularCommandProfile,
    LightInfantryWeaponProfile,
    MediumCavalryWeaponProfile,
    PedestrianMoveProfile
} from "../../../jslib/cblades/profile.js";

describe("Orcs Army", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks Goblin Leader", () => {
        given:
            var unit = GoblinLeader;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/character1L.png",
                "./../images/units/orcs/character1Lb.png"
            ]);
            assert(unit.getFormationPaths()).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(AnimalMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(AnimalMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(MediumCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(MediumCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(1);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getMoralProfile(2);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
    });

    it("Checks Goblin Wolfrider", () => {
        given:
            var unit = GoblinWolfRider;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/unit1L.png",
                "./../images/units/orcs/unit1Lb.png"
            ]);
            assert(unit.getFormationPaths()).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(AnimalMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(AnimalMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(MediumCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(MediumCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getMoralProfile(1);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getMoralProfile(2);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
    });

    it("Checks Goblin Skirmisher", () => {
        given:
            var unit = GoblinSkirmisher;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/unit2L.png",
                "./../images/units/orcs/unit2Lb.png"
            ]);
            assert(unit.getFormationPaths()).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(LightInfantryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(LightInfantryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(IrregularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getMoralProfile(1);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getMoralProfile(2);
        then:
            assert(profile).is(ExaltedMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
    });
});