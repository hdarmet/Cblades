'use strict'

import {
    CavalryMoveProfile,
    PedestrianMoveProfile,
    CBProfileCapacity,
    HeavyCavalryWeaponProfile,
    LanceWeaponProfile,
    CrossbowWeaponProfile,
    EliteMoralProfile,
    RegularCommandProfile, HordeWeaponProfile, IrregularCommandProfile, ArcaneMagicProfile
} from "../profile.js";

import {
    CBTroopType, CBCharacterType
} from "../unit.js";

export let RoughneckBanner0 = "./../images/units/mercenaries/banners/banner0.png";
export let RoughneckBanner1 = "./../images/units/mercenaries/banners/banner1.png";
export let RoughneckBanner2 = "./../images/units/mercenaries/banners/banner2.png";

export let RoughneckLeader = new CBCharacterType("Company Leader",
    [
        "./../images/units/mercenaries/character1L.png",
        "./../images/units/mercenaries/character1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.INFERIOR)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)

).setWeaponProfile(1, new HeavyCavalryWeaponProfile(CBProfileCapacity.ADVANTAGED, 0, 1, 0)
).setWeaponProfile(2, new HeavyCavalryWeaponProfile(CBProfileCapacity.SUPERIOR, 1, 1, 0)

).setCommandProfile(1, new RegularCommandProfile(CBProfileCapacity.DISADVANTAGED)
).setCommandProfile(2, new RegularCommandProfile(CBProfileCapacity.NORMAL)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED));

export let RoughneckSorceressCharacter = new CBCharacterType("Sorceress Character",
    [
        "./../images/units/mercenaries/character2L.png",
        "./../images/units/mercenaries/character2Lb.png"
    ]
).setMoveProfile(1, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(2, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)

).setWeaponProfile(1, new HordeWeaponProfile(CBProfileCapacity.INFERIOR)
).setWeaponProfile(2, new HordeWeaponProfile(CBProfileCapacity.DISADVANTAGED)

).setCommandProfile(1, new RegularCommandProfile(CBProfileCapacity.INFERIOR)
).setCommandProfile(2, new RegularCommandProfile(CBProfileCapacity.DISADVANTAGED)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)

).setMagicProfile(1, new ArcaneMagicProfile(CBProfileCapacity.NORMAL)
).setMagicProfile(2, new ArcaneMagicProfile(CBProfileCapacity.ADVANTAGED));

export let RoughneckKnight = new CBTroopType("Company Knight",
    [
        "./../images/units/mercenaries/unit1L.png",
        "./../images/units/mercenaries/unit1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)

).setWeaponProfile(1, new HeavyCavalryWeaponProfile(CBProfileCapacity.NORMAL)
).setWeaponProfile(2, new HeavyCavalryWeaponProfile(CBProfileCapacity.ADVANTAGED)

).setCommandProfile(1, new RegularCommandProfile(CBProfileCapacity.DISADVANTAGED)
).setCommandProfile(2, new RegularCommandProfile(CBProfileCapacity.INFERIOR)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED));

export let RoughneckLance = new CBTroopType("Company Lancet",
    [
        "./../images/units/mercenaries/unit2L1.png",
        "./../images/units/mercenaries/unit2L1b.png"
    ],
    [
        "./../images/units/mercenaries/unit2L4.png",
        "./../images/units/mercenaries/unit2L4b.png",
        "./../images/units/mercenaries/unit2L3.png",
        "./../images/units/mercenaries/unit2L3b.png",
        "./../images/units/mercenaries/unit2L2.png",
        "./../images/units/mercenaries/unit2L2b.png"
    ]
).setMoveProfile(1, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(2, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(3, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(4, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(5, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(6, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(7, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)
).setMoveProfile(8, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED)

).setWeaponProfile(1, new LanceWeaponProfile(CBProfileCapacity.NORMAL)
).setWeaponProfile(2, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(3, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 1, 1, 0)
).setWeaponProfile(4, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 1, 1, 0)
).setWeaponProfile(5, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 2, 2, 0)
).setWeaponProfile(6, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 2, 2, 0)
).setWeaponProfile(7, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 2, 3, 0)
).setWeaponProfile(8, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED, 2, 3, 0)

).setCommandProfile(1, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(2, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(3, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(4, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(5, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(6, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(7, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(8, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(3, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(4, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(5, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(6, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(7, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(8, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED));

export let RoughneckCrossbowman = new CBTroopType("Company Crossbowman",
    [
        "./../images/units/mercenaries/unit3L1.png",
        "./../images/units/mercenaries/unit3L1b.png"
    ],
    [
        "./../images/units/mercenaries/unit3L2.png",
        "./../images/units/mercenaries/unit3L2b.png"
    ]
).setMoveProfile(1, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(2, new PedestrianMoveProfile(CBProfileCapacity.NORMAL)
).setMoveProfile(3, new PedestrianMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(4, new PedestrianMoveProfile(CBProfileCapacity.DISADVANTAGED)

).setWeaponProfile(1, new CrossbowWeaponProfile(CBProfileCapacity.NORMAL)
).setWeaponProfile(2, new CrossbowWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(3, new CrossbowWeaponProfile(CBProfileCapacity.ADVANTAGED, 0, 1, 1)
).setWeaponProfile(4, new CrossbowWeaponProfile(CBProfileCapacity.ADVANTAGED, 0, 1, 1)

).setCommandProfile(1, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(2, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(3, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)
).setCommandProfile(4, new RegularCommandProfile(CBProfileCapacity.ADVANTAGED)

).setMoralProfile(1, new EliteMoralProfile(CBProfileCapacity.NORMAL)
).setMoralProfile(2, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(3, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED)
).setMoralProfile(4, new EliteMoralProfile(CBProfileCapacity.ADVANTAGED));
