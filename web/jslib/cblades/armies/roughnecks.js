'use strict'

import {
    CavalryMoveProfile,
    PedestrianMoveProfile,
    CBProfileCapacity,
    HeavyCavalryWeaponProfile,
    LanceWeaponProfile
} from "../profile.js";

import {
    CBUnitType
} from "../unit.js";

export let RoughneckLeader = new CBUnitType("Company Leader",
    [
        "/CBlades/images/units/mercenaries/character1L.png",
        "/CBlades/images/units/mercenaries/character1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.INFERIOR)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setWeaponProfile(1, new HeavyCavalryWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(2, new HeavyCavalryWeaponProfile(CBProfileCapacity.SUPERIOR));

export let RoughneckKnight = new CBUnitType("Company Knight",
    [
        "/CBlades/images/units/mercenaries/unit1L.png",
        "/CBlades/images/units/mercenaries/unit1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setWeaponProfile(1, new HeavyCavalryWeaponProfile(CBProfileCapacity.NORMAL)
).setWeaponProfile(2, new HeavyCavalryWeaponProfile(CBProfileCapacity.ADVANTAGED));

export let RoughneckLance = new CBUnitType("Company Lancet",
    [
        "/CBlades/images/units/mercenaries/unit2L1.png",
        "/CBlades/images/units/mercenaries/unit2L1b.png"
    ],
    [
        "/CBlades/images/units/mercenaries/unit2L4.png",
        "/CBlades/images/units/mercenaries/unit2L4b.png",
        "/CBlades/images/units/mercenaries/unit2L3.png",
        "/CBlades/images/units/mercenaries/unit2L3b.png",
        "/CBlades/images/units/mercenaries/unit2L2.png",
        "/CBlades/images/units/mercenaries/unit2L2b.png"
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
).setWeaponProfile(3, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(4, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(5, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(6, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(7, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED)
).setWeaponProfile(8, new LanceWeaponProfile(CBProfileCapacity.ADVANTAGED));