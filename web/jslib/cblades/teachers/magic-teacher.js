'use strict'

export class CBWizardryTeacher {

    isAllowedToChoseSpell(unit) {
        return !!unit.characterNature;
    }

    isAllowedToCastSpell(unit) {
        return !!unit.characterNature && unit.hasChosenSpell();
    }

    getAllowedSpells(unit) {
        return [
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
        ]
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

}