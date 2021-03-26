'use strict'

import {
    AnimalMoveProfile,
    PedestrianMoveProfile,
    ProfileCapacity
} from "../profile.js";

import {
    CBUnitType
} from "../unit.js";

export let GoblinLeader = new CBUnitType("Goblin Leader",
    [
        "/CBlades/images/units/orcs/character1L.png",
        "/CBlades/images/units/orcs/character1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(ProfileCapacity.INFERIOR)
).setMoveProfile(2, new AnimalMoveProfile(ProfileCapacity.DISADVANTAGED));

export let GoblinWolfRider = new CBUnitType("Goblin Wolf Rider",
    [
        "/CBlades/images/units/orcs/unit1L.png",
        "/CBlades/images/units/orcs/unit1Lb.png"
    ]
).setMoveProfile(1, new AnimalMoveProfile(ProfileCapacity.DISADVANTAGED)
).setMoveProfile(2, new AnimalMoveProfile(ProfileCapacity.DISADVANTAGED));
