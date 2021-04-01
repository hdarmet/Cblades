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
    GoblinLeader, GoblinWolfRider
} from "../../../jslib/cblades/armies/orcs.js";
import {
    AnimalMoveProfile, CBProfileCapacity
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
                "/CBlades/images/units/orcs/character1L.png",
                "/CBlades/images/units/orcs/character1Lb.png"
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
    });

    it("Checks Goblin Wolfrider", () => {
        given:
            var unit = GoblinWolfRider;
        then:
            assert(unit.getTroopPaths()).arrayEqualsTo([
                "/CBlades/images/units/orcs/unit1L.png",
                "/CBlades/images/units/orcs/unit1Lb.png"
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
    });

});