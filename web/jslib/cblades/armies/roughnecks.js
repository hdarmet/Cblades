'use strict'

import {
    CavalryMoveProfile,
    PedestrianMoveProfile,
    CBProfileCapacity
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
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED));

export let RoughneckKnight = new CBUnitType("Company Knight",
    [
        "/CBlades/images/units/mercenaries/unit1L.png",
        "/CBlades/images/units/mercenaries/unit1Lb.png"
    ]
).setMoveProfile(1, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new CavalryMoveProfile(CBProfileCapacity.DISADVANTAGED));

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
).setMoveProfile(8, new PedestrianMoveProfile(CBProfileCapacity.ADVANTAGED));