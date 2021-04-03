'use strict'

import {
    AnimalMoveProfile,
    CBProfileCapacity, MediumCavalryWeaponProfile
} from "../profile.js";

import {
    CBUnitType
} from "../unit.js";

export let GoblinLeader = new CBUnitType("Goblin Leader",
    [
        "/CBlades/images/units/orcs/character1L.png",
        "/CBlades/images/units/orcs/character1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(CBProfileCapacity.INFERIOR)
).setMoveProfile(2, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setWeaponProfile(1, new MediumCavalryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new MediumCavalryWeaponProfile(CBProfileCapacity.DISADVANTAGED));

export let GoblinWolfRider = new CBUnitType("Goblin Wolf Rider",
    [
        "/CBlades/images/units/orcs/unit1L.png",
        "/CBlades/images/units/orcs/unit1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setWeaponProfile(1, new MediumCavalryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new MediumCavalryWeaponProfile(CBProfileCapacity.DISADVANTAGED));
