'use strict'

import {
    ArcaneMagicProfile, FireMagicProfile
} from "../profile.js";

export class CBWizardryTeacher {

    isAllowedToChoseSpell(unit) {
        return !!unit.magicProfile;
    }

    isAllowedToCastSpell(unit) {
        return !!unit.magicProfile && unit.hasChosenSpell();
    }

    getAllowedSpells(unit) {
        let art = unit.magicArt;
        if  (art) {
            if (art === ArcaneMagicProfile.ART) return CBWizardryTeacher.arcaneSpells;
            if (art === FireMagicProfile.ART) return CBWizardryTeacher.fireSpells;
        }
    }

    processCastSpellResult(leader, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success };
    }

    getFoesThatMayBeTargetedBySpell(wizard) {
        let foes = [];
        let foesSet = new Set();
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            let units = zone.hex.units;
            if (units.length) {
                for (let unit of units) {
                    if (!foesSet.has(unit) && this.areUnitsFoes(wizard, unit)) {
                        foesSet.add(unit);
                        foes.push(unit);
                    }
                }
            }
        }
        return foes;
    }

    getFriendsThatMayBeTargetedBySpell(wizard) {
        let friends = [];
        let friendsSet = new Set();
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            let units = zone.hex.units;
            if (units.length) {
                for (let unit of units) {
                    if (!friendsSet.has(unit) && this.areUnitsFriends(wizard, unit)) {
                        friendsSet.add(unit);
                        friends.push(unit);
                    }
                }
            }
        }
        return friends;
    }

    getHexesThatMayBeTargetedBySpell(wizard) {
        let hexes = [];
        let area = this.get360Area(wizard.hexLocation, 6);
        for (let zone of area) {
            hexes.push(zone.hex);
        }
        return hexes;
    }

    resolveFireball(spellLevel, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success, losses:success?1:0 };
    }

    resolveMagicArrow(spellLevel, diceResult) {
        let success = diceResult[0]+diceResult[1]<=8;
        return { success, losses:success?1:0 };
    }

    static arcaneSpells = [
        "arcanePentacle1",
        "arcanePentacle2",
        "arcanePentacle3",
        "arcaneCircle1",
        "arcaneCircle2",
        "arcaneCircle3",
        "magicArrow1",
        "magicArrow2",
        "magicArrow3",
        "arcaneSword1",
        "arcaneSword2",
        "arcaneSword3",
        "arcaneShield1",
        "arcaneShield2",
        "arcaneShield3",
        "protectionFromMagic1",
        "protectionFromMagic2",
        "protectionFromMagic3"
    ];

    static fireSpells = [
        "firePentacle1",
        "firePentacle2",
        "firePentacle3",
        "fireCircle1",
        "fireCircle2",
        "fireCircle3",
        "fireball1",
        "fireball2",
        "fireball3",
        "fireSword1",
        "fireSword2",
        "fireSword3",
        "blaze1",
        "blaze2",
        "blaze3",
        "rainFire1",
        "rainFire2",
        "rainFire3"
    ];

}