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
    CavalryMoveProfile,
    CBProfileCapacity, EliteMoralProfile, ArcaneMagicProfile,
    HeavyCavalryWeaponProfile, HordeWeaponProfile,
    LanceWeaponProfile,
    PedestrianMoveProfile, RegularCommandProfile
} from "../../../jslib/cblades/profile.js";
import {
    RoughneckKnight, RoughneckLance, RoughneckLeader, RoughneckSorceressCharacter
} from "../../../jslib/cblades/armies/roughnecks.js";

describe("Roughnecks Army", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks Roughneck Leader", () => {
        given:
            var unit = RoughneckLeader;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/mercenaries/character1L.png",
                "./../images/units/mercenaries/character1Lb.png"
            ]);
            assert(unit.getFormationPaths).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(HeavyCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(HeavyCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.SUPERIOR);
        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
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
            assert(profile).isNotDefined();
        when:
            profile = unit.getMagicProfile(2);
        then:
            assert(profile).isNotDefined();
    });

    it("Checks Sorceress Leader", () => {
        given:
            var unit = RoughneckSorceressCharacter;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/mercenaries/character2L.png",
                "./../images/units/mercenaries/character2Lb.png"
            ]);
            assert(unit.getFormationPaths).isNotDefined();
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(PedestrianMoveProfile);
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
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
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
            assert(profile).is(ArcaneMagicProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getMagicProfile(2);
        then:
            assert(profile).is(ArcaneMagicProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
    });

    it("Checks Roughneck knights", () => {
        given:
            var unit = RoughneckKnight;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/mercenaries/unit1L.png",
                "./../images/units/mercenaries/unit1Lb.png"
            ]);
            assert(unit.getFormationPaths()).arrayEqualsTo([]);
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(CavalryMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(HeavyCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(HeavyCavalryWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);

        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.DISADVANTAGED);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.INFERIOR);
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
    });

    it("Checks Roughneck Lances", () => {
        given:
            var unit = RoughneckLance;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "./../images/units/mercenaries/unit2L1.png",
                "./../images/units/mercenaries/unit2L1b.png"
            ]);
            assert(unit.getFormationPaths()).arrayEqualsTo([
                "./../images/units/mercenaries/unit2L4.png",
                "./../images/units/mercenaries/unit2L4b.png",
                "./../images/units/mercenaries/unit2L3.png",
                "./../images/units/mercenaries/unit2L3b.png",
                "./../images/units/mercenaries/unit2L2.png",
                "./../images/units/mercenaries/unit2L2b.png"
            ]);
        when:
            var profile = unit.getMoveProfile(1);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(2);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(3);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(4);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(5);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(6);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(7);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoveProfile(8);
        then:
            assert(profile).is(PedestrianMoveProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(1);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.NORMAL);
        when:
            profile = unit.getWeaponProfile(2);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(3);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(4);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(5);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(6);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(7);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getWeaponProfile(8);
        then:
            assert(profile).is(LanceWeaponProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(1);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(2);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(3);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(4);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(5);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(6);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(7);
        then:
            assert(profile).is(RegularCommandProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getCommandProfile(8);
        then:
            assert(profile).is(RegularCommandProfile);
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
            profile = unit.getMoralProfile(3);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(4);
        then:
            assert(profile).is(EliteMoralProfile);
        assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(5);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(6);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(7);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
        when:
            profile = unit.getMoralProfile(8);
        then:
            assert(profile).is(EliteMoralProfile);
            assert(profile.capacity).equalsTo(CBProfileCapacity.ADVANTAGED);
    });

});