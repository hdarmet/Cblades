'use strict'

import {
    AnimalMoveProfile, PedestrianMoveProfile,
    CBProfileCapacity,
    MediumCavalryWeaponProfile, LightInfantryWeaponProfile
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

export let GoblinSkirmisher = new CBUnitType("Goblin Skirmisher",
    [
        "/CBlades/images/units/orcs/unit2L.png",
        "/CBlades/images/units/orcs/unit2Lb.png"
    ]
).setMoveProfile(1, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(2, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setWeaponProfile(1, new LightInfantryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new LightInfantryWeaponProfile(CBProfileCapacity.INFERIOR));
