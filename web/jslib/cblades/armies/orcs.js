'use strict'

import {
    AnimalMoveProfile, PedestrianMoveProfile,
    CBProfileCapacity,
    MediumCavalryWeaponProfile, LightInfantryWeaponProfile, IrregularCommandProfile, ExaltedMoralProfile
} from "../profile.js";

import {
    CBUnitType
} from "../unit.js";

export let GoblinLeader = new CBUnitType("Goblin Leader",
    [
        "./../images/units/orcs/character1L.png",
        "./../images/units/orcs/character1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(CBProfileCapacity.INFERIOR)
).setMoveProfile(2, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)

).setWeaponProfile(1, new MediumCavalryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new MediumCavalryWeaponProfile(CBProfileCapacity.DISADVANTAGED)

).setCommandProfile(1, new IrregularCommandProfile(CBProfileCapacity.NORMAL)
).setCommandProfile(2, new IrregularCommandProfile(CBProfileCapacity.ADVANTAGED)

).setMoralProfile(1, new ExaltedMoralProfile(CBProfileCapacity.DISADVANTAGED)
).setMoralProfile(2, new ExaltedMoralProfile(CBProfileCapacity.NORMAL));

export let GoblinWolfRider = new CBUnitType("Goblin Wolf Rider",
    [
        "./../images/units/orcs/unit1L.png",
        "./../images/units/orcs/unit1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new AnimalMoveProfile(CBProfileCapacity.DISADVANTAGED)

).setWeaponProfile(1, new MediumCavalryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new MediumCavalryWeaponProfile(CBProfileCapacity.DISADVANTAGED)

).setCommandProfile(1, new IrregularCommandProfile(CBProfileCapacity.DISADVANTAGED)
).setCommandProfile(2, new IrregularCommandProfile(CBProfileCapacity.INFERIOR)

).setMoralProfile(1, new ExaltedMoralProfile(CBProfileCapacity.DISADVANTAGED)
).setMoralProfile(2, new ExaltedMoralProfile(CBProfileCapacity.NORMAL));

export let GoblinSkirmisher = new CBUnitType("Goblin Skirmisher",
    [
        "./../images/units/orcs/unit2L.png",
        "./../images/units/orcs/unit2Lb.png"
    ]
).setMoveProfile(1, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(2, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)

).setWeaponProfile(1, new LightInfantryWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new LightInfantryWeaponProfile(CBProfileCapacity.INFERIOR)

).setCommandProfile(1, new IrregularCommandProfile(CBProfileCapacity.DISADVANTAGED)
).setCommandProfile(2, new IrregularCommandProfile(CBProfileCapacity.INFERIOR)

).setMoralProfile(1, new ExaltedMoralProfile(CBProfileCapacity.DISADVANTAGED)
).setMoralProfile(2, new ExaltedMoralProfile(CBProfileCapacity.NORMAL));
