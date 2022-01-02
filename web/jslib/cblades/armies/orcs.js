'use strict'

import {
    AnimalMoveProfile,
    PedestrianMoveProfile,
    CBProfileCapacity,
    HordeWeaponProfile,
    MediumCavalryWeaponProfile,
    LightInfantryWeaponProfile,
    IrregularCommandProfile,
    ExaltedMoralProfile,
    EliteMoralProfile,
    CavalryMoveProfile,
    FireMagicProfile
} from "../profile.js";

import {
    CBTroopType, CBCharacterType
} from "../unit.js";

export let GoblinBanner0 = {
    name: "orc-banner-0",
    path: "./../images/units/orcs/banners/banner0.png"
};
export let GoblinBanner1 = {
    name: "orc-banner-1",
    path: "./../images/units/orcs/banners/banner1.png"
};
export let GoblinBanner2 = {
    name: "orc-banner-2",
    path: "./../images/units/orcs/banners/banner2.png"
};

export let GoblinLeader = new CBCharacterType("Goblin Leader",
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

export let WizardLeader = new CBCharacterType("Wizard Leader",
    [
        "./../images/units/orcs/character2C.png",
        "./../images/units/orcs/character2Cb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.ADVANTAGED)

).setWeaponProfile(1, new HordeWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new HordeWeaponProfile(CBProfileCapacity.DISADVANTAGED)

).setCommandProfile(1, new IrregularCommandProfile(CBProfileCapacity.NORMAL)
).setCommandProfile(2, new IrregularCommandProfile(CBProfileCapacity.ADVANTAGED)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)

).setMagicProfile(1, new FireMagicProfile(CBProfileCapacity.NORMAL)
).setMagicProfile(2, new FireMagicProfile(CBProfileCapacity.ADVANTAGED));

export let GoblinWolfRider = new CBTroopType("Goblin Wolf Rider",
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

export let GoblinSkirmisher = new CBTroopType("Goblin Skirmisher",
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
