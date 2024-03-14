'use strict'

import {
    DImage, setDrawPlatform
} from "../../../jslib/board/draw.js";

import {
    Mechanisms, Memento
} from "../../../jslib/board/mechanisms.js";
import {
    assert,
    before, describe, it
} from "../../../jstest/jtest.js";
import {
    mockPlatform
} from "../../board/mocks.js";
import {
    GoblinLeader, GoblinSkirmisher, GoblinWolfRider, WizardLeader
} from "../../../jslib/cblades/armies/orcs.js";
import {
    AnimalMoveProfile, CavalryMoveProfile,
    CBProfileCapacity, EliteMoralProfile, ExaltedMoralProfile, FireMagicProfile, HordeWeaponProfile,
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
            assert(unit.getFormationPaths).isNotDefined();
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
        when:
            profile = unit.getMagicProfile(1);
        then:
            assert(profile).isNotDefined();
        when:
            profile = unit.getMagicProfile(2);
        then:
            assert(profile).isNotDefined();
    });

    it("Checks Fire Wizard Leader", () => {
        given:
            var unit = WizardLeader;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/character2C.png",
                "./../images/units/orcs/character2Cb.png"
            ]);
            assert(unit.getFormationPaths).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(HordeWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(HordeWeaponProfile);
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
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMoralProfile(2);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMagicProfile(1);
        then:
            assert(profile).is(FireMagicProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMagicProfile(2);
        then:
            assert(profile).is(FireMagicProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
    });

    it("Checks Goblin Wolfrider", () => {
        given:
            var unit = GoblinWolfRider;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/unit1L.png",
                "./../images/units/orcs/unit1Lb.png"
            ]);
            assert(unit.getFormationPaths()).arrayEqualsTo([]);
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

    });

    it("Checks Goblin Skirmisher", () => {
        given:
            var unit = GoblinSkirmisher;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/orcs/unit2L.png",
                "./../images/units/orcs/unit2Lb.png"
            ]);
            assert(unit.getFormationPaths()).arrayEqualsTo([]);
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