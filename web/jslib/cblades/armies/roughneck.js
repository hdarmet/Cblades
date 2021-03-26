'use strict'

import {
    CavalryMoveProfile,
    PedestrianMoveProfile,
    ProfileCapacity
} from "../profile.js";

import {
    CBUnitType
} from "../unit.js";

export let RoughneckLeader = new CBUnitType("Company Leader",
    [
        "/CBlades/images/units/mercenaries/character1L.png",
        "/CBlades/images/units/mercenaries/character1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(ProfileCapacity.INFERIOR)
).setMoveProfile(2, new CavalryMoveProfile(ProfileCapacity.DISADVANTAGED));

export let RoughneckKnight = new CBUnitType("Company Knight",
    [
        "/CBlades/images/units/mercenaries/unit1L.png",
        "/CBlades/images/units/mercenaries/unit1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(ProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new CavalryMoveProfile(ProfileCapacity.DISADVANTAGED));

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
).setMoveProfile(1, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(2, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(3, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(4, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(5, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(6, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(7, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED)
).setMoveProfile(8, new PedestrianMoveProfile(ProfileCapacity.ADVANTAGED));