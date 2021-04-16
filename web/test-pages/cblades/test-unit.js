'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertNoMoreDirectives,
    createEvent,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap, CBHexSideId, CBMoveType
} from "../../jslib/cblades/map.js";
import {
    CBGame, CBAbstractPlayer,
    CBAction, CBPlayable,
    CBCounterImageArtifact, CBCounter
} from "../../jslib/cblades/game.js";
import {
    CBTroop,
    CBWing,
    CBCharacter,
    CBUnitType,
    CBLackOfMunitions,
    CBTiredness,
    CBCohesion,
    CBOrderInstruction,
    CBFormation,
    CarriableMixin,
    OptionArtifactMixin,
    OptionMixin,
    CBMoveProfile,
    CBWeaponProfile,
    CBCharge, CBCommandProfile, CBMoralProfile
} from "../../jslib/cblades/unit.js";
import {
    Dimension2D
} from "../../jslib/geometry.js";

describe("Unit", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    let dummyEvent = {offsetX:0, offsetY:0};

    function paint(game) {
        game._board.paint();
    }

    function repaint(game) {
        game._board.repaint();
    }

    function prepareTinyGame() {
        var game = new CBGame();
        var map = new CBMap("/CBlades/images/maps/map.png");
        game.setMap(map);
        return {game, map};
    }

    class CBTestUnitType extends CBUnitType {
        constructor(...args) {
            super(...args);
            this.setMoveProfile(1, new CBMoveProfile(-1));
            this.setMoveProfile(2, new CBMoveProfile(0));
            this.setWeaponProfile(1, new CBWeaponProfile(-1));
            this.setWeaponProfile(2, new CBWeaponProfile(0));
            this.setCommandProfile(1, new CBCommandProfile(-1));
            this.setCommandProfile(2, new CBCommandProfile(0));
            this.setMoralProfile(1, new CBMoralProfile(-1));
            this.setMoralProfile(2, new CBMoralProfile(0));
        }
    }

    function createTinyGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBTestUnitType("unit", [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        let unit = new CBTroop(unitType, wing);
        game.addUnit(unit, map.getHex(5, 8));
        game.start();
        loadAllImages();
        return {game, player, unit, wing, map};
    }

    function createTinyFormationGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBTestUnitType("unit", [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
            ],
            [
                "/CBlades/images/units/misc/formation4.png", "/CBlades/images/units/misc/formation4b.png",
                "/CBlades/images/units/misc/formation3.png", "/CBlades/images/units/misc/formation3b.png",
                "/CBlades/images/units/misc/formation2.png", "/CBlades/images/units/misc/formation2b.png"
            ]);
        let formation = new CBFormation(unitType, wing);
        formation.angle = 90;
        formation.lossSteps = 4;
        game.addUnit(formation, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
        game.start();
        loadAllImages();
        return {game, player, formation, wing, map};
    }

    function mouseClickOnCounter(game, counter) {
        let counterLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:counterLocation.x, offsetY:counterLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    function create2UnitsTinyGame(start = true) {
        var { game, map } = prepareTinyGame();
        let player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType1 = new CBTestUnitType("unit1", ["/CBlades/images/units/misc/unit1.png"]);
        let unit1 = new CBTroop(unitType1, wing);
        game.addUnit(unit1, map.getHex(5, 8));
        let unitType2 = new CBTestUnitType("unit2", ["/CBlades/images/units/misc/unit2.png"]);
        let unit2 = new CBTroop(unitType2, wing);
        game.addUnit(unit2, map.getHex(5, 7));
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, wing, player};
    }

    class CBTestCarriable extends CarriableMixin(CBPlayable) {

        constructor(unit, paths) {
            super("units", paths, new Dimension2D(142, 142));
            Object.defineProperty(this.artifact, "slot", {
                get: function () {
                    return unit.slot;
                }
            });
            Object.defineProperty(this.artifact, "layer", {
                get: function () {
                    return CBGame.ULAYERS.SPELLS;
                }
            });
        }

    }

    it("Checks that a unit may carry other counters (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            let unitType1 = new CBTestUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            game.addUnit(unit, hexId);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            var playable1 = new CBTestCarriable(unit,["/CBlades/images/units/misc/playable1.png"]);
            unit.addCarried(playable1);
            paint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.angle = 60;
            unit.hexLocation = nextHexId;
            paint(game);
        then:
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 500, 400)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.removeCarried(playable1);
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.addCarried(playable1);
            unit.removeFromMap();
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.addToMap(hexId, CBMoveType.BACKWARD);
            paint(game);
        then:
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks that a unit may carry other counters (undoable)", () => {
        given:
            var { game, map, unit } = createTinyGame();
            let hexId = map.getHex(5, 8);
            unit.move(hexId, CBMoveType.BACKWARD);
            let nextHexId = hexId.getNearHex(0);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            resetDirectives(spellsLayer);
            var playable1 = new CBTestCarriable(unit,["/CBlades/images/units/misc/playable1.png"]);
            unit.carry(playable1);
            paint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.rotate(60);
            unit.move(nextHexId, CBMoveType.BACKWARD);
            paint(game);
        then:
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(spellsLayer);
            unit.drop(playable1);
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            resetDirectives(spellsLayer);
            unit.carry(playable1);
            unit.deleteFromMap();
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(spellsLayer);
            unit.appendToMap(hexId, CBMoveType.BACKWARD);
            paint(game);
        then:
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(spellsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(spellsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/playable1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    class CBTestOptionArtifact extends OptionArtifactMixin(CBCounterImageArtifact) {
         constructor(...args) {
             super(...args);
         }

         get unit() {
             return this.counter.unit;
         }
    }

    class CBTestOption extends OptionMixin(CarriableMixin(CBPlayable)) {

        constructor(unit, paths) {
            super("units", paths, new Dimension2D(142, 142));
            this._unit = unit;
        }

        createArtifact(levelName, images, location, dimension) {
            return new CBTestOptionArtifact(this, levelName, images, location, dimension);
        }

        get unit() {
            return this._unit;
        }
    }

    it("Checks that a unit may have option counters (not undoable)", () => {
        function createOption(unit, path) {
            var option = new CBTestOption(unit,[path]);
            unit.addOption(option);
            return option;
        }

        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            let unitType1 = new CBTestUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "/CBlades/images/units/misc/option0.png");
            var option1 = createOption(unit, "/CBlades/images/units/misc/option1.png");
            var option2 = createOption(unit, "/CBlades/images/units/misc/option2.png");
            paint(game);
            loadAllImages();
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 397.1163, 337.2251)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 387.3412, 327.4499)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(optionsLayer);
            unit.removeOption(option1);
            paint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 397.1163, 337.2251)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks that a unit may have option counters (undoable)", () => {
        function createOption(unit, path) {
            var option = new CBTestOption(unit,[path]);
            unit.appendOption(option);
            return option;
        }

        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            let unitType1 = new CBTestUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "/CBlades/images/units/misc/option0.png");
            var option1 = createOption(unit, "/CBlades/images/units/misc/option1.png");
            var option2 = createOption(unit, "/CBlades/images/units/misc/option2.png");
            paint(game);
            loadAllImages();
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 397.1163, 337.2251)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 387.3412, 327.4499)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(optionsLayer);
            unit.deleteOption(option1);
            paint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 397.1163, 337.2251)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(optionsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 397.1163, 337.2251)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 387.3412, 327.4499)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(optionsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(unit.options).arrayEqualsTo([])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that when a unit is requested to give its counters, it includes all carried ones", () => {

        function createCarried(unit, path) {
            var playable = new CBTestCarriable(unit,[path]);
            unit.addCarried(playable);
            return playable;
        }

        function createOption(unit, path) {
            var option = new CBTestOption(unit,[path]);
            unit.addOption(option);
            return option;
        }

        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            let unitType1 = new CBTestUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
        when:
            var carried = createCarried(unit, "/CBlades/images/units/misc/playable1.png");
            var option = createOption(unit, "/CBlades/images/units/misc/option0.png");
            paint(game);
            loadAllImages();
        then:
            assert(unit.counters).arrayEqualsTo([carried, unit, option])
    });

    it("Checks unit/wing/player structure", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            wing.setRetreatZone(map.getSouthZone());
            let unitType1 = new CBTestUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"],
                ["/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"]);
            var unit = new CBTroop(unitType1, wing);
            game.addUnit(unit, map.getHex(5, 8));
            var formation = new CBFormation(unitType1, wing);
            game.addUnit(formation, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 9)));
            formation.angle = 90;
        then:
            assert(wing.retreatZone).unorderedArrayEqualsTo(map.getSouthZone());
            assert(unit.wing).equalsTo(wing);
            assert(unit.player).equalsTo(player);
            assert(unit.maxStepCount).equalsTo(2);
            assert(formation.maxStepCount).equalsTo(4);
            assert(formation.minStepCount).equalsTo(3);
            assert(player.units).unorderedArrayEqualsTo([unit, formation]);
            assert(unitType1.name).equalsTo("unit1");
            assert(unitType1.getTroopPaths()).arrayEqualsTo([
                "/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"
            ]);
            assert(unitType1.getFormationPaths()).arrayEqualsTo([
                "/CBlades/images/units/misc/formation1.png", "/CBlades/images/units/misc/formation1b.png"
            ]);
            assert(unitType1.getTroopMaxStepCount()).equalsTo(2);
            assert(unitType1.getFormationMaxStepCount()).equalsTo(4);
            assert(unitType1.getFormationMinStepCount()).equalsTo(3);
    });

    it("Checks unit move profile", () => {
        given:
            var { unit } = createTinyGame();
        then:
            assert(unit.moveProfile.getMovementCostOnHex(unit.hexLocation)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
            assert(unit.moveProfile.getMovementCostOnHexSide(unit.hexLocation.toward(60))).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0
            });
            assert(unit.moveProfile.getRotationCost(120)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:0.5
            });
            assert(unit.moveProfile.getFormationRotationCost(180)).objectEqualsTo({
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
    });

    it("Checks unit weapon profile", () => {
        given:
            var { unit } = createTinyGame();
        then:
            assert(unit.weaponProfile.capacity).equalsTo(0);
            assert(unit.weaponProfile.getShockAttackCode()).equalsTo("Bow");
            assert(unit.weaponProfile.getShockDefendCode()).equalsTo("Bow");
            assert(unit.weaponProfile.getFireAttackCode()).isNotDefined();
            assert(unit.weaponProfile.getFireRange()).equalsTo(3);
            assert(unit.weaponProfile.getFireDefendCode()).equalsTo("Bow");
    });

    it("Checks unit command profile", () => {
        given:
            var { unit } = createTinyGame();
        then:
            assert(unit.commandProfile.capacity).equalsTo(0);
            assert(unit.commandProfile.commandLevel).equalsTo(8);
            assert(unit.type.getCommandLevel(1)).equalsTo(7);
            assert(unit.commandLevel).equalsTo(8);
    });

    it("Checks unit moral profile", () => {
        given:
            var { unit } = createTinyGame();
        then:
            assert(unit.moralProfile.capacity).equalsTo(0);
            assert(unit.moralProfile.moral).equalsTo(8);
            assert(unit.type.getMoral(1)).equalsTo(7);
            assert(unit.moral).equalsTo(8);
    });

    it("Checks unit move on the on map", () => {
        given:
            var { game, map, unit } = createTinyGame();
            var hexId = map.getHex(5, 8);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.move(hexId2, {
                type:CBMoveProfile.COST_TYPE.ADD, value:1
            });
        then:
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([]);
        when: // Minimal move...
            unit.move(hexId2, {
                type:CBMoveProfile.COST_TYPE.MINIMAL_MOVE
            });
        then:
            assert(unit.movementPoints).equalsTo(0);
            assert(unit.extendedMovementPoints).equalsTo(0);
    });

    it("Checks unit advance", () => {
        given:
            var { game, map, unit } = createTinyGame();
            var hexId = map.getHex(5, 8);
            unit.markAsEngaging(true);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.advance(hexId2);
        then:
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isInGoodOrder()).isTrue();
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
    });

    it("Checks unit retreat", () => {
        given:
            var { game, map, unit } = createTinyGame();
            var hexId = map.getHex(5, 8);
            unit.markAsEngaging(true);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.retreat(hexId2, CBMoveType.FORWARD);
        then:
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isDisrupted()).isTrue();
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
    });

    it("Checks that when moving a unit, movement points are adjusted", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
        when:
            resetDirectives(unitsLayer, markersLayer);
            unit.move(map.getHex(5, 7), 1);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 7).toString());
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            resetDirectives(unitsLayer, markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 8).toString());
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks unit move from outside the map or out of the map", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            resetDirectives(unitsLayer);
            unit.move(null, 0);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.open();
            resetDirectives(unitsLayer);
            unit.move(map.getHex(5, 7), 0);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 7)");
            assert(unit.isOnBoard()).isTrue();
        when:
            Memento.undo();
            resetDirectives(unitsLayer);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnBoard()).isFalse();
        when:
            Memento.undo();
            resetDirectives(unitsLayer);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 8)");
            assert(unit.isOnBoard()).isTrue();
    });

    it("Checks rotating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
        when:
            resetDirectives(unitsLayer, markersLayer);
            unit.rotate(90, 0.5);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.movementPoints).equalsTo(1.5);
            assert(unit.extendedMovementPoints).equalsTo(2.5);
        when:
            resetDirectives(unitsLayer, markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks adding a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        then:
            assert(unit.isTired()).isFalse();
            assert(unit.isExhausted()).isFalse();
        when:
            resetDirectives(markersLayer);
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
            assert(unit.isTired()).isTrue();
            assert(unit.isExhausted()).isFalse();
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load exhausted.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/exhausted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
            assert(unit.isTired()).isFalse();
            assert(unit.isExhausted()).isTrue();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
    });

    it("Checks removing a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.addOneTirednessLevel();
            unit.addOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/exhausted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.removeOneTirednessLevel();
            paint(game);
            loadAllImages(); // to load tired.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(1);
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/exhausted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.tiredness).equalsTo(2);
    });

    it("Checks adding a lack of munitions level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        then:
            assert(unit.areMunitionsScarce()).isFalse();
            assert(unit.areMunitionsExhausted()).isFalse();
        when:
            resetDirectives(markersLayer);
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load scraceamno.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(1);
            assert(unit.areMunitionsScarce()).isTrue();
            assert(unit.areMunitionsExhausted()).isFalse();
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load lowamno.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
            assert(unit.areMunitionsScarce()).isFalse();
            assert(unit.areMunitionsExhausted()).isTrue();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(1);
    });

    it("Checks removing a lack of munitions level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.addOneLackOfMunitionsLevel();
            unit.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load lowamno.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.replenishMunitions();
            paint(game);
            loadAllImages(); // to load scarceamno.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.lackOfMunitions).equalsTo(0);
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/lowamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.lackOfMunitions).equalsTo(2);
    });

    it("Checks playing a unit", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.launchAction(new CBAction(game, unit));
            unit.markAsBeingPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks giving an order to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.receiveOrder(true);
            paint(game);
            loadAllImages(); // to load ordegiven.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.hasReceivedOrder()).isTrue();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.hasReceivedOrder()).isFalse();
    });

    it("Checks that playing an order replace (hide) 'order given' marker", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.receiveOrder(true);
            paint(game);
        when:
            resetDirectives(markersLayer);
            unit.launchAction(new CBAction(game, unit));
            unit.markAsBeingPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
    });

    it("Checks played marker appearance / disappearance when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2UnitsTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            player.launchUnitAction = function(unit, event) {
                unit.launchAction(new CBAction(game, unit));
            }
        when:
            player.changeSelection(unit1, dummyEvent);
            unit1.action.markAsStarted();
            mouseClickOnCounter(game, unit2);
            loadAllImages(); // to load actiondone.png
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:   // changing turn reset played status
            game.nextTurn();
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks adding cohesion levels to a unit", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        then:
            assert(unit.isInGoodOrder()).isTrue();
            assert(unit.isDisrupted()).isFalse();
            assert(unit.isRouted()).isFalse();
        when:
            resetDirectives(markersLayer);
            unit.disrupt();
            paint(game);
            loadAllImages(); // to load disrupted.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
            assert(unit.isDisrupted()).isTrue();
            assert(unit.isRouted()).isFalse();
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.rout();
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/fleeing.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(2);
            assert(unit.isDisrupted()).isFalse();
            assert(unit.isRouted()).isTrue();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
    });

    it("Checks removing cohesion levels to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.addOneCohesionLevel();
            unit.addOneCohesionLevel();
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/fleeing.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(2);
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.rally();
            paint(game);
            loadAllImages(); // to load disrupted.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
        when:
            Memento.open();
            resetDirectives(markersLayer);
            unit.reorganize();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.cohesion).equalsTo(0);
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(1);
    });

    it("Checks unit destruction", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
            unit.addOneCohesionLevel(); // Disrupt the unit
        then:
            assert(unit.isDestroyed()).isFalse();
        when:
            Memento.open();
            resetDirectives(unitsLayer, markersLayer);
            unit.addOneCohesionLevel(); // Rout the unit
            unit.addOneCohesionLevel(); // Destroy the unit
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isDestroyed()).isTrue();
        when:
            resetDirectives(unitsLayer, markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(unit.isDestroyed()).isFalse();
    });

    it("Checks unit attack feature related methods", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            var hexId = unit.hexLocation.getNearHex(60);
            unit.setAttackLocation(hexId);
        then:
            assert(unit.attackLocation).equalsTo(hexId);
            assert(unit.hasAttacked()).isTrue();
        when:
            Memento.undo();
        then:
            assert(unit.attackLocation).isNotDefined();
            assert(unit.hasAttacked()).isFalse();
        when:
            Memento.redo();
        then:
            assert(unit.attackLocation).equalsTo(hexId);
            assert(unit.hasAttacked()).isTrue();
    });

    it("Checks a troop taking losses", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            resetDirectives(unitsLayer);
            unit.takeALoss();
            paint(game);
            loadAllImages(); // to load back side image
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            Memento.open();
            resetDirectives(unitsLayer);
            unit.takeALoss();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks a formation taking losses", () => {
        given:
            var {game, formation} = createTinyFormationGame();
            game.setArbitrator({
                getTroopsAfterFormationBreak(formation) {
                    function _createUnit(stepCounts) {
                        let unit = new CBTroop(formation.type, formation.wing);
                        unit.angle = formation.angle;
                        unit.fixRemainingLossSteps(stepCounts);
                        return unit;
                    }
                    return { fromHex:[_createUnit.call(this, 2)], toHex:[_createUnit.call(this, 1)] };
                }
            });
            var [unitsLayer, formationsLayer] = getLayers(game.board, "units-0", "formations-0");
        when:
            resetDirectives(unitsLayer, formationsLayer);
            formation.takeALoss();
            repaint(game);
            loadAllImages(); // to load back side image
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 303.7757)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2b.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(game.counters.has(formation)).isTrue();
        when: // formation breaks automatically
            resetDirectives(unitsLayer, formationsLayer);
            formation.takeALoss();
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([]);
            assert(game.counters.has(formation)).isFalse();
            assert(game.counters.size).equalsTo(2);
    });

    it("Checks mark unit as on contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsEngaging(true);
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/contact.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks mark unit as charging", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsCharging(CBCharge.CHARGING);
            paint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isTrue();
        when:
            resetDirectives(markersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks when a unit stop charging, it adds a tiredness level", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            unit.markAsCharging(CBCharge.CHARGING);
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.NONE);
            assert(unit.isCharging()).isTrue();
        when:
            unit.markAsCharging(CBCharge.NONE);
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.TIRED);
            assert(unit.isCharging()).isFalse();
    });

    it("Checks that charge supersedes contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsEngaging(true);
            unit.markAsCharging(CBCharge.CHARGING);
            paint(game);
            loadAllImages(); // to load charge.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isTrue();
        when:
            resetDirectives(markersLayer);
            unit.markAsCharging(false);
            loadAllImages();  // to load contact.png
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/contact.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            resetDirectives(markersLayer);
            unit.markAsEngaging(false);
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks progessive charging process", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            paint(game);
            loadAllImages();
        then:
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.NONE);
        when:
            unit.checkEngagement(false, true);
            paint(game);
            loadAllImages();
        then:
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.BEGIN_CHARGE);
        when:
            unit.checkEngagement(false, true);
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/markers/possible-charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when:
            resetDirectives(markersLayer);
            unit.checkEngagement(false, true);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/markers/possible-charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when:
            resetDirectives(markersLayer);
            unit.checkEngagement(false, false);
            repaint(game);
            loadAllImages();
        then:
            assertNoMoreDirectives(markersLayer, 4);
            assert(unit._charging).equalsTo(CBCharge.NONE);
    });

    it("Checks acknowledgment of requested charge", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.checkEngagement(false, true);
            unit.checkEngagement(false, true); // Here, unit can charge
        when:
            resetDirectives(markersLayer);
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/markers/possible-charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when: // Charge is not requested
            resetDirectives(markersLayer);
            unit.acknowledgeCharge(false);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/markers/possible-charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when: // Charge is requested
            resetDirectives(markersLayer);
            unit._engagingArtifact.onMouseClick();
            unit.acknowledgeCharge(false);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/charge.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(unit._charging).equalsTo(CBCharge.CHARGING);
    });

    it("Checks acknowledgment when charge is not requested at the end of movement", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.checkEngagement(false, true);
            unit.checkEngagement(false, true); // Here, unit can charge
        when: // Charge is not requested
            resetDirectives(markersLayer);
            unit.acknowledgeCharge(true);
            repaint(game);
            loadAllImages();
        then:
            assertNoMoreDirectives(markersLayer, 4);
            assert(unit._charging).equalsTo(CBCharge.NONE);
    });

    it("Checks that when a unit retracts, it also hides markers", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            unit2.move(unit1.hexLocation);
            paint(game);
            var [markersLayer] = getLayers(game.board, "markers-1");
        when:
            resetDirectives(markersLayer);
            unit2.markAsBeingPlayed(true);
            unit2.markAsEngaging(true);
            unit2.addOneCohesionLevel();
            unit2.addOneTirednessLevel();
            unit2.addOneLackOfMunitionsLevel();
            paint(game);
            loadAllImages(); // to load charge.png
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 461.1437, 307.4108)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 391.74, 307.4108)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/contact.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 391.74, 376.8145)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/disrupted.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 391.74, 342.1127)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 376.8145)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            unit1.retractAbove();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                "restore()",
                "save()",
                "restore()",
                "save()",
                "restore()",
                "save()",
                "restore()",
                "save()",
                "restore()"
            ]);
    });

    function createTinyCommandGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBTestUnitType("unit", [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        let unit = new CBTroop(unitType, wing);
        game.addUnit(unit, map.getHex(5, 8));
        let leaderType = new CBTestUnitType("leader", [
            "/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"
        ]);
        let leader = new CBCharacter(leaderType, wing);
        game.addUnit(leader, map.getHex(5, 9));
        game.start();
        loadAllImages();
        return {game, player, unit, leader, wing, map};
    }

    it("Checks leader specificities", () => {
        given:
            var {leader} = createTinyCommandGame();
        then:
            assert(leader.unitNature).isTrue();
            assert(leader.characterNature).isTrue();
    });

    it("Checks leader appearance", () => {
        given:
            var {game, unit, wing, leader} = createTinyCommandGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
            unit.move(null, 0);
        when:
            loadAllImages(); // to load charge.png
            resetDirectives(unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 448.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/leader.png, -60, -60, 120, 120)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            leader.takeCommand();
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 448.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/defend.png, -40, -40, 80, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            wing.changeOrderInstruction(CBOrderInstruction.ATTACK);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 448.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/attack.png, -40, -40, 80, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            leader.dismissCommand();
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that when a character retracts, it also hides order instruction marker", () => {
        given:
            var {game, wing, unit, leader} = createTinyCommandGame();
            wing.setLeader(leader);
            leader.move(unit.hexLocation);
            paint(game);
            var [markersLayer] = getLayers(game.board, "markers-1");
        when:
            resetDirectives(markersLayer);
            wing.changeOrderInstruction(CBOrderInstruction.ATTACK);
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 461.1437, 342.1127)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/attack.png, -40, -40, 80, 80)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer);
            unit.retractAbove();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                "restore()"
            ]);
    });

    it("Checks wing management", () => {
        given:
            var {game, unit, leader, player, wing} = createTinyCommandGame();
            Memento.open();
        when:
            wing.setLeader(leader);
            wing.setOrderInstruction(CBOrderInstruction.ATTACK);
        then:
            assert(wing.player).equalsTo(player);
            assert(wing.leader).equalsTo(leader);
        when: // undoing is worthless with setLeader
            Memento.undo();
        then:
            assert(wing.leader).equalsTo(leader);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
        when:
            wing.dismissLeader();
        then:
            assert(wing.leader).isNotDefined();
        when:
            Memento.open();
            wing.appointLeader(leader);
            wing.changeOrderInstruction(CBOrderInstruction.REGROUP);
        then:
            assert(wing.leader).equalsTo(leader);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
        when:
            Memento.undo();
        then:
            assert(wing.leader).isNotDefined();
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
        when:
            Memento.undo();
        then:
            assert(wing.leader).equalsTo(leader);
            assert(wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
    });

    it("Checks leader command points management", () => {
        given:
            var {game, unit, leader, player, wing} = createTinyCommandGame();
            Memento.open();
        when:
            leader.receiveCommandPoints(10);
        then:
            assert(leader.commandPoints).equalsTo(10);
        when:
            Memento.open();
            leader.receiveCommandPoints(8);
        then:
            assert(leader.commandPoints).equalsTo(8);
        when:
            Memento.undo();
        then:
            assert(leader.commandPoints).equalsTo(10);
        when:
            game._resetCounters(player);
        then:
            assert(leader.commandPoints).equalsTo(0);
    });

    it("Checks wizardry", () => {

        class TestSpell extends CBCounter {
            constructor(wizard) {
                super("units", ["/CBlades/images/magic/red/redspell.png"], new Dimension2D(142, 142));
                this.wizard = wizard;
            }
            _rotate(angle) {}
            appendToMap(hexLocation) {}
            deleteFromMap() {}
        }

        class TestSpellDefinition {
            createSpellCounter(wizard) {
                return new TestSpell(wizard);
            }
        }

        given:
            var {leader} = createTinyCommandGame();
            var spellDefinition = new TestSpellDefinition();
        when:
            leader.choseSpell(spellDefinition);
        then:
            assert(leader.hasChosenSpell()).isTrue();
            var spell = leader.chosenSpell;
            assert(spell).isDefined();
        when:
            Memento.open();
            leader.choseSpell(spellDefinition);
            var spell2 = leader.chosenSpell;
        then:
            assert(spell2).notEqualsTo(spell);
            assert(spell2).isDefined();
        when:
            Memento.open();
            leader.forgetSpell();
        then:
            assert(leader.chosenSpell).isNotDefined();
        when:
            Memento.undo();
        then:
            assert(leader.chosenSpell).equalsTo(spell2);
        when:
            Memento.undo();
        then:
            assert(leader.chosenSpell).equalsTo(spell);
    });

    it("Checks unit cloning", () => {
        given:
            var {game, unit, leader, player, wing} = createTinyCommandGame();
        when:
            unit.movementPoints = 3;
            unit.extendedMovementPoints = 5;
            unit.cohesion = CBCohesion.ROUTED;
            unit.fixLackOfMunitionsLevel(CBLackOfMunitions.SCARCE);
            unit.fixRemainingLossSteps(1);
            unit.fixTirednessLevel(CBTiredness.EXHAUSTED);
            var cloneUnit = unit.clone();
        then:
            assert(cloneUnit).is(CBTroop);
            assert(cloneUnit.type).equalsTo(unit.type);
            assert(cloneUnit.movementPoints).equalsTo(3);
            assert(cloneUnit.extendedMovementPoints).equalsTo(5);
            assert(cloneUnit.cohesion).equalsTo(CBCohesion.ROUTED);
            assert(cloneUnit.lackOfMunitions).equalsTo(CBLackOfMunitions.SCARCE);
            assert(cloneUnit.remainingStepCount).equalsTo(1);
            assert(cloneUnit.tiredness).equalsTo(CBTiredness.EXHAUSTED);
        when:
            leader.movementPoints = 1;
            leader.extendedMovementPoints = 2;
            leader.cohesion = CBCohesion.DISRUPTED;
            leader.fixLackOfMunitionsLevel(CBLackOfMunitions.EXHAUSTED);
            leader.fixRemainingLossSteps(2);
            leader.fixTirednessLevel(CBTiredness.TIRED);
            var cloneLeader = leader.clone();
        then:
            assert(cloneLeader).is(CBCharacter);
            assert(cloneLeader.type).equalsTo(leader.type);
            assert(cloneLeader.movementPoints).equalsTo(1);
            assert(cloneLeader.extendedMovementPoints).equalsTo(2);
            assert(cloneLeader.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(cloneLeader.lackOfMunitions).equalsTo(CBLackOfMunitions.EXHAUSTED);
            assert(cloneLeader.remainingStepCount).equalsTo(2);
            assert(cloneLeader.tiredness).equalsTo(CBTiredness.TIRED);
    });

    function prepareTinyGameWithFormation() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBTestUnitType("unit", [], [
            "/CBlades/images/units/misc/formation.png", "/CBlades/images/units/misc/formationb.png"
        ]);
        let formation = new CBFormation(unitType, wing);
        formation.angle = 150;
        let formationLocation = new CBHexSideId(map.getHex(5, 8), map.getHex(6, 7))
        game.addUnit(formation, formationLocation);
        game.start();
        loadAllImages();
        return { game, map, formation };
    }

    it("Checks formation appearance", () => {
        given:
            var { game, formation } = prepareTinyGameWithFormation();
            var [fmarkersLayer, formationsLayer] = getLayers(game.board, "fmarkers-0", "formations-0");
        then:
            assert(formation.unitNature).isTrue();
            assert(formation.formationNature).isTrue();
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 458.3333, 327.8317)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(fmarkersLayer, formationsLayer);
            formation.disrupt();
            formation.addOneLackOfMunitionsLevel();
            formation.addOneTirednessLevel();
            formation.addOneCohesionLevel();
            formation.receiveOrder(true);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(fmarkersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 440.9824, 297.7791)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 518.4387, 293.1299)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 501.0878, 263.0772)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/fleeing.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 415.5789, 392.5863)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -32, -32, 64, 64)",
                "restore()"
            ]);
    });

    it("Checks formation move", () => {
        given:
            var { game, formation, map } = prepareTinyGameWithFormation();
            var [formationsLayer] = getLayers(game.board, "formations-0");
        when: // set formation location (not undoable)
            resetDirectives(formationsLayer);
            var fHexId1 = map.getHex(5, 8);
            var fHexId2 = map.getHex(6, 7);
            var sHexId1 = map.getHex(7, 8);
            var sHexId2 = map.getHex(8, 7);
            formation.hexLocation = new CBHexSideId(sHexId1, sHexId2);
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 625, 327.8317)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(fHexId1.units).arrayEqualsTo([]);
            assert(fHexId2.units).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([formation]);
        when: // move formation (undoable)
            resetDirectives(formationsLayer);
            var mHexId1 = map.getHex(7, 9);
            var mHexId2 = map.getHex(8, 8);
            formation.move(new CBHexSideId(mHexId1, mHexId2), 0);
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 625, 424.0561)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
            assert(mHexId1.units).arrayEqualsTo([formation]);
            assert(mHexId2.units).arrayEqualsTo([formation]);
        when: // undo formation move
            resetDirectives(formationsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 625, 327.8317)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(fHexId1.units).arrayEqualsTo([]);
            assert(fHexId2.units).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([formation]);
        when:
            resetDirectives(formationsLayer);
            formation.move(null, 0);
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
        when:
            resetDirectives(formationsLayer);
            formation.move(new CBHexSideId(mHexId1, mHexId2), 0);
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 625, 424.0561)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
            assert(mHexId1.units).arrayEqualsTo([formation]);
            assert(mHexId2.units).arrayEqualsTo([formation]);
    });

    it("Checks formation cloning", () => {
        given:
            var {formation} = prepareTinyGameWithFormation();
        when:
            formation.movementPoints = 3;
            formation.fixTirednessLevel(CBTiredness.TIRED);
            var cloneFormation = formation.clone();
        then:
            assert(cloneFormation).is(CBFormation);
            assert(cloneFormation.movementPoints).equalsTo(3);
            assert(cloneFormation.tiredness).equalsTo(CBTiredness.TIRED);
    });

});