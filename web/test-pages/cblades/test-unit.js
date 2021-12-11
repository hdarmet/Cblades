'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertClearDirectives, assertDirectives,
    assertNoMoreDirectives,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap, CBHexSideId
} from "../../jslib/cblades/map.js";
import {
    CBAction, CBPieceImageArtifact, CBPiece, CBStacking
} from "../../jslib/cblades/game.js";
import {
    CBActionActuator,
    CBGame, RetractableActuatorMixin
} from "../../jslib/cblades/playable.js";
import {
    CBHexCounter, CBLevelBuilder
} from "../../jslib/cblades/playable.js";
import {
    CBUnitPlayer,
    CBTroop,
    CBWing,
    CBCharacter,
    CBMunitions,
    CBTiredness,
    CBCohesion,
    CBOrderInstruction,
    CBFormation,
    CarriableMixin,
    OptionArtifactMixin,
    OptionMixin,
    CBMoveProfile,
    CBWeaponProfile,
    CBCharge,
    CBCommandProfile,
    CBMoralProfile,
    CBMagicProfile,
    CBUnitActuatorTrigger,
    CBTroopType,
    CBCharacterType,
    CBUnitType
} from "../../jslib/cblades/unit.js";
import {
    Dimension2D, Point2D
} from "../../jslib/geometry.js";
import {
    clickOnPiece,
    clickOnTrigger, repaint,
    showActiveMarker, showActuatorTrigger, showCharacter,
    showCommandMarker, showFormation,
    showMarker,
    showTroop,
    zoomAndRotate0,
    zoomAndRotate150, zoomAndRotate30,
    zoomAndRotate60,
    zoomAndRotate90
} from "./interactive-tools.js";

describe("Unit", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    let dummyEvent = {offsetX:0, offsetY:0};

    function prepareTinyGame() {
        var game = new CBGame("Test");
        var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        return {game, map};
    }

    class CBTestTroopType extends CBTroopType {
        constructor(...args) {
            super(...args);
            this.setMoveProfile(1, new CBMoveProfile(-1));
            this.setMoveProfile(2, new CBMoveProfile(0));
            this.setWeaponProfile(1, new CBWeaponProfile(-1, 1, 2, 3));
            this.setWeaponProfile(2, new CBWeaponProfile(0,1, 2, 3));
            this.setCommandProfile(1, new CBCommandProfile(-1));
            this.setCommandProfile(2, new CBCommandProfile(0));
            this.setMoralProfile(1, new CBMoralProfile(-1));
            this.setMoralProfile(2, new CBMoralProfile(0));
        }
    }

    class CBTestCharacterType extends CBCharacterType {
        constructor(...args) {
            super(...args);
            this.setMoveProfile(1, new CBMoveProfile(-1));
            this.setMoveProfile(2, new CBMoveProfile(0));
            this.setWeaponProfile(1, new CBWeaponProfile(-1, 1, 2, 3));
            this.setWeaponProfile(2, new CBWeaponProfile(0,1, 2, 3));
            this.setCommandProfile(1, new CBCommandProfile(-1));
            this.setCommandProfile(2, new CBCommandProfile(0));
            this.setMoralProfile(1, new CBMoralProfile(-1));
            this.setMoralProfile(2, new CBMoralProfile(0));
        }
    }

    class CBTestLeaderType extends CBCharacterType {
        constructor(...args) {
            super(...args);
            this.setMoveProfile(1, new CBMoveProfile(-1));
            this.setMoveProfile(2, new CBMoveProfile(0));
            this.setWeaponProfile(1, new CBWeaponProfile(-1, 1, 2, 3));
            this.setWeaponProfile(2, new CBWeaponProfile(0, 1, 2, 3));
            this.setCommandProfile(1, new CBCommandProfile(-1));
            this.setCommandProfile(2, new CBCommandProfile(0));
            this.setMoralProfile(1, new CBMoralProfile(-1));
            this.setMoralProfile(2, new CBMoralProfile(0));
            this.setMagicProfile(1, new CBMagicProfile( "Fire", -1));
            this.setMagicProfile(2, new CBMagicProfile("Fire", 0));
        }
    }

    function createTinyGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBUnitPlayer("player1");
        game.addPlayer(player);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType = new CBTestTroopType("unit", [
            "./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"
        ]);
        let unit = new CBTroop(unitType, wing);
        unit.addToMap(map.getHex(5, 8));
        game.start();
        loadAllImages();
        return {game, player, unit, wing, map};
    }

    function createTinyFormationGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBUnitPlayer("player1");
        game.addPlayer(player);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType = new CBTestTroopType("unit", [
            "./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"
            ],
            [
                "./../images/units/misc/formation4.png", "./../images/units/misc/formation4b.png",
                "./../images/units/misc/formation3.png", "./../images/units/misc/formation3b.png",
                "./../images/units/misc/formation2.png", "./../images/units/misc/formation2b.png"
            ]);
        let formation = new CBFormation(unitType, wing);
        formation.angle = 90;
        formation.lossSteps = 4;
        formation.addToMap(new CBHexSideId(map.getHex(5, 8), map.getHex(5, 7)));
        game.start();
        loadAllImages();
        return {game, player, formation, wing, map};
    }

    function create2UnitsTinyGame(start = true) {
        var { game, map } = prepareTinyGame();
        let player = new CBUnitPlayer("player");
        game.addPlayer(player);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType1 = new CBTestTroopType("unit1", ["./../images/units/misc/unit1.png"]);
        let unit1 = new CBTroop(unitType1, wing);
        unit1.addToMap(map.getHex(5, 8));
        let unitType2 = new CBTestTroopType("unit2", ["./../images/units/misc/unit2.png"]);
        let unit2 = new CBTroop(unitType2, wing);
        unit2.addToMap(map.getHex(5, 7));
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, wing, player};
    }

    class CBTestCarriable extends CarriableMixin(CBHexCounter) {

        constructor(unit, paths) {
            super("units", paths, new Dimension2D(142, 142));
            Object.defineProperty(this.artifact, "slot", {
                get: function () {
                    return unit.slot;
                }
            });
            Object.defineProperty(this.artifact, "layer", {
                get: function () {
                    return CBLevelBuilder.ULAYERS.SPELLS;
                }
            });
        }

    }

    function showPlayable(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
            "restore()"
        ];
    }

    function showOption(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
            "restore()"
        ];
    }

    class CBTestActuatorTrigger extends CBUnitActuatorTrigger {
    }

    class CBTestUnitActuator extends RetractableActuatorMixin(CBActionActuator) {

        constructor(action, unit) {
            super(action);
            let image = DImage.getImage("./../images/actuators/test.png");
            let imageArtifacts = [];
            this.trigger = new CBTestActuatorTrigger(this, unit, "units", image,
                new Point2D(0, 0), new Dimension2D(142, 142));
            this.trigger.position = Point2D.position(action.playable.location, unit.location, 1);
            imageArtifacts.push(this.trigger);
            this.initElement(imageArtifacts);
        }

        get unit() {
            return this.playable;
        }

        onMouseClick(trigger, event) {
            this.unitProcessed = trigger.playable;
        }

    }

    it("Checks unit player", () => {
        given:
            var { game, map } = prepareTinyGame();
            let player1 = new CBUnitPlayer("player1");
            game.addPlayer(player1);
            let player2 = new CBUnitPlayer("player2");
            game.addPlayer(player2);
            let unitType = new CBTestTroopType("unit1", ["./../images/units/misc/unit1.png"]);
            var wing1 = new CBWing(player1, "./../units/banner1.png");
            var wing2 = new CBWing(player1, "./../units/banner2.png");
            var wing3 = new CBWing(player1, "./../units/banner3.png");
            let unit1 = new CBTroop(unitType, wing1);
            unit1.addToMap(map.getHex(5, 8));
            let unit2 = new CBTroop(unitType, wing1);
            unit2.addToMap(map.getHex(6, 8));
        then:
            assert(game.currentPlayer).equalsTo(player1);
            assert(player1.wings).arrayEqualsTo([wing1, wing2, wing3]);
            assert(player1.units).arrayEqualsTo([unit1, unit2]);
        when:
            player1.finishTurn(()=>{});
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

    it("Checks actuators trigger on playable", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
        when:
            var action = new CBAction(game, unit1);
            var actuator = new CBTestUnitActuator(action, unit2);
            game.openActuator(actuator);
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 142, 142, zoomAndRotate0(416.6667, 255.6635)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            clickOnTrigger(game, actuator.trigger);
        then:
            assert(actuator.unitProcessed).equalsTo(unit2);
    });

    it("Checks that a unit may carry other counters (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            let unitType1 = new CBTestTroopType("unit1",
                ["./../images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            var playable1 = new CBTestCarriable(unit,["./../images/units/misc/playable1.png"]);
            unit.addCarried(playable1);
            repaint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.angle = 60;
            unit.hexLocation = nextHexId;
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(500, 400)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.removeCarried(playable1);
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            unit.addCarried(playable1);
            unit.removeFromMap();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            unit.addToMap(hexId, CBStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
    });

    it("Checks that a unit may carry other counters (undoable)", () => {
        given:
            var { game, map, unit } = createTinyGame();
            let hexId = map.getHex(5, 8);
            unit.move(hexId, CBStacking.TOP);
            let nextHexId = hexId.getNearHex(0);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            var playable1 = new CBTestCarriable(unit,["./../images/units/misc/playable1.png"]);
            unit.carry(playable1);
            repaint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.rotate(60);
            unit.move(nextHexId, CBStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 255.6635)));
            assertNoMoreDirectives(spellsLayer);
        when:
            Memento.open();
            unit.drop(playable1);
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            unit.carry(playable1);
            unit.deleteFromMap();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            unit.appendToMap(hexId, CBStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1]);
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 255.6635)));
            assertNoMoreDirectives(spellsLayer);
    });

    class CBTestOptionArtifact extends OptionArtifactMixin(CBPieceImageArtifact) {
         constructor(...args) {
             super(...args);
         }

         get unit() {
             return this.piece.unit;
         }
    }

    class CBTestOption extends OptionMixin(CarriableMixin(CBHexCounter)) {

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

    function createOption(unit, path) {
        var option = new CBTestOption(unit,[path]);
        unit.addOption(option);
        return option;
    }

    function createSpell(unit, path) {
        var option = new CBTestCarriable(unit,[path]);
        unit.addCarried(option);
        return option;
    }

    it("Checks unit general features", () => {
        given:
            var { unit, wing, game } = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
        then:
            assert(unit.artifact.game).equalsTo(game);
        when:
            var otherUnit = unit.type.createUnit(wing, 2);
        then:
            assert(otherUnit.unitNature).isTrue();
            assert(otherUnit.formationNature).isFalse();
            assert(otherUnit.steps).equalsTo(2);
            assert(otherUnit.wing).equalsTo(wing);
        when:
            Memento.open();
            unit.setCohesion(CBCohesion.DISRUPTED);
            repaint(game);
        then:
            assert(unit.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 381.9648, 386.5897)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/markers/disrupted.png, -32, -32, 64, 64)',
                'restore()'
            ]);
        when:
            Memento.undo();
            unit.setCharging(CBCharge.CHARGING);
            repaint(game);
        then:
            assert(unit.cohesion).equalsTo(CBCohesion.GOOD_ORDER);
            assert(unit.isCharging()).isTrue();
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/markers/charge.png, -32, -32, 64, 64)',
                'restore()'
            ]);
        when:
            Memento.undo();
            unit.setEngaging(true);
            repaint(game);
        then:
            assert(unit.isCharging()).isFalse();
            assert(unit.isEngaging()).isTrue();
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 381.9648, 317.186)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/markers/contact.png, -32, -32, 64, 64)',
                'restore()'
            ]);
        when:
            Memento.undo();
            unit.setCohesion(CBCohesion.DESTROYED);
            repaint(game);
        then:
            assert(unit.cohesion).equalsTo(CBCohesion.DESTROYED);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that a unit may have option counters (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            let unitType1 = new CBTestTroopType("unit1",
                ["./../images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "./../images/units/misc/option0.png");
            var option1 = createOption(unit, "./../images/units/misc/option1.png");
            var option2 = createOption(unit, "./../images/units/misc/option2.png");
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            resetDirectives(optionsLayer);
            unit.removeOption(option1);
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(397.1163, 337.2251)));
            assertNoMoreDirectives(optionsLayer);
    });

    it("Checks option features", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            let unitType1 = new CBTestTroopType("unit1",
                ["./../images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
        when:
            var option = createOption(unit, "./../images/units/misc/option.png");
            repaint(game);
        then:
            assert(option.isOption()).isTrue();
            assert(option.owner).equalsTo(unit);
    });

    it("Checks that a unit may have option counters (undoable)", () => {
        function createOption(unit, path) {
            var option = new CBTestOption(unit,[path]);
            unit.appendOption(option);
            return option;
        }

        given:
            var { game, map } = prepareTinyGame();
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            let unitType1 = new CBTestTroopType("unit1",
                ["./../images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "./../images/units/misc/option0.png");
            var option1 = createOption(unit, "./../images/units/misc/option1.png");
            var option2 = createOption(unit, "./../images/units/misc/option2.png");
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2]);
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.open();
            unit.deleteOption(option1);
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(397.1163, 337.2251)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks units types", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            wing.setRetreatZone(map.getSouthZone());
            let troopType = new CBTestTroopType("troop",
                ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"],
                ["./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png"]);
            let characterType = new CBTestCharacterType("character",
                ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"]);
            var unit = new CBTroop(troopType, wing);
            var formation = new CBFormation(troopType, wing);
            var character = new CBCharacter(characterType, wing);
        then:
            assert(troopType.getMaxStepCount()).equalsTo(4);
            assert(troopType.getMaxFiguresCount()).equalsTo(2);
            assert(unit.unitNature).isTrue();
            assert(formation.unitNature).isTrue();
            assert(character.unitNature).isTrue();
            assert(unit.troopNature).isTrue();
            assert(formation.troopNature).isTrue();
            assert(character.troopNature).isNotDefined();
            assert(unit.formationNature).isNotDefined();
            assert(formation.formationNature).isTrue();
            assert(character.formationNature).isNotDefined();
            assert(unit.characterNature).isNotDefined();
            assert(formation.characterNature).isNotDefined();
            assert(character.characterNature).isTrue();
            assert(CBUnitType.getType("troop")).equalsTo(troopType);
            assert(characterType.getMaxFiguresCount()).equalsTo(1);
    });

    it("Checks unit/wing/player structure", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            let unitType1 = new CBTestTroopType("unit1",
                ["./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"],
                ["./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png"]);
            var unit = new CBTroop(unitType1, wing);
            unit.addToMap(map.getHex(5, 8));
            var formation = new CBFormation(unitType1, wing);
            formation.addToMap(new CBHexSideId(map.getHex(5, 8), map.getHex(5, 9)));
            formation.angle = 90;
        then:
            assert(unit.wing).equalsTo(wing);
            assert(unit.player).equalsTo(player);
            assert(unit.maxStepCount).equalsTo(2);
            assert(formation.maxStepCount).equalsTo(4);
            assert(formation.minStepCount).equalsTo(3);
            assert(player.units).unorderedArrayEqualsTo([unit, formation]);
            assert(unitType1.name).equalsTo("unit1");
            assert(unitType1.getTroopPaths()).arrayEqualsTo([
                "./../images/units/misc/unit1.png", "./../images/units/misc/unit1b.png"
            ]);
            assert(unitType1.getFormationPaths()).arrayEqualsTo([
                "./../images/units/misc/formation1.png", "./../images/units/misc/formation1b.png"
            ]);
            assert(unitType1.getFigureStepCount()).equalsTo(2);
            assert(unitType1.getFormationMaxStepCount()).equalsTo(4);
            assert(unitType1.getFormationMinStepCount()).equalsTo(3);
    });

    it("Checks wing features", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBUnitPlayer("player1");
            game.addPlayer(player);
            var wing = new CBWing(player, "./../units/banner.png");
            wing.setRetreatZone(map.getSouthZone());
        then:
            assert(wing.retreatZone).unorderedArrayEqualsTo(map.getSouthZone());
            assert(wing.banner).equalsTo("./../units/banner.png");
        when:
            wing.setMoral(10);
            wing.setTiredness(9);
        then:
            assert(wing.moral).equalsTo(10);
            assert(wing.tiredness).equalsTo(9);
        when:
            Memento.open();
            wing.changeMoral(9);
            wing.changeTiredness(8);
        then:
            assert(wing.moral).equalsTo(9);
            assert(wing.tiredness).equalsTo(8);
        when:
            Memento.undo();
        then:
            assert(wing.moral).equalsTo(10);
            assert(wing.tiredness).equalsTo(9);
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
            assert(unit.moveProfile.getMinimalMoveCost()).equalsTo(1);
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
            assert(unit.weaponProfile.getFireMalusSegmentSize()).equalsTo(1);
            assert(unit.weaponProfile.getAttackBonus()).equalsTo(1);
            assert(unit.weaponProfile.getDefenseBonus()).equalsTo(2);
            assert(unit.weaponProfile.getFireBonus()).equalsTo(3);
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
            assert(unit.moralProfile.autoRally).isFalse();
            assert(unit.type.getMoral(1)).equalsTo(7);
            assert(unit.moral).equalsTo(8);
    });

    it("Checks unit magic profile", () => {
        given:
            var {leader} = createTinyCommandGame();
        then:
            assert(leader.magicProfile.capacity).equalsTo(0);
            assert(leader.magicProfile.art).equalsTo("Fire");
            assert(leader.magicArt).equalsTo("Fire");
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
            assert(unit.nominalMovementPoints).equalsTo(2);
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
            var { map, unit } = createTinyGame();
            var hexId = map.getHex(5, 8);
            unit.setEngaging(true);
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
            unit.setEngaging(true);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.retreat(hexId2, CBStacking.BOTTOM);
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
            unit.move(map.getHex(5, 7), 1);
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 255.6635)));
            assertNoMoreDirectives(unitsLayer);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 7).toString());
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
            assert(unit.hexLocation.toString()).equalsTo(map.getHex(5, 8).toString());
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
    });

    it("Checks unit move from outside the map or out of the map", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            unit.move(null, 0);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnHex()).isFalse();
        when:
            Memento.open();
            unit.move(map.getHex(5, 7), 0);
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 255.6635)));
            assertNoMoreDirectives(unitsLayer);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 7)");
            assert(unit.isOnHex()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(unit.hexLocation).isNotDefined();
            assert(unit.isOnHex()).isFalse();
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
            assert(unit.hexLocation.toString()).equalsTo("Hex(5, 8)");
            assert(unit.isOnHex()).isTrue();
    });

    it("Checks rotating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board, "units-0", "markers-0");
        when:
            unit.rotate(90, 0.5);
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate90(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
            assert(unit.movementPoints).equalsTo(1.5);
            assert(unit.extendedMovementPoints).equalsTo(2.5);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
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
            unit.addOneTirednessLevel();
            repaint(game);
            loadAllImages(); // to load tired.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("tired", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.tiredness).equalsTo(1);
            assert(unit.isTired()).isTrue();
            assert(unit.isExhausted()).isFalse();
        when:
            Memento.open();
            unit.addOneTirednessLevel();
            repaint(game);
            loadAllImages(); // to load exhausted.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("exhausted", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.tiredness).equalsTo(2);
            assert(unit.isTired()).isFalse();
            assert(unit.isExhausted()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("tired", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.tiredness).equalsTo(1);
    });

    it("Checks removing a tiredness level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.addOneTirednessLevel();
            unit.addOneTirednessLevel();
            repaint(game);
            loadAllImages(); // to load tired.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("exhausted", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.tiredness).equalsTo(2);
        when:
            Memento.open();
            unit.removeOneTirednessLevel();
            repaint(game);
            loadAllImages(); // to load tired.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("tired", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.tiredness).equalsTo(1);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("exhausted", zoomAndRotate0(381.9648, 351.8878)));
            assertNoMoreDirectives(markersLayer);
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
            unit.addOneMunitionsLevel();
            repaint(game);
            loadAllImages(); // to load scraceamno.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("scarceamno", zoomAndRotate0(416.6667, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.munitions).equalsTo(1);
            assert(unit.areMunitionsScarce()).isTrue();
            assert(unit.areMunitionsExhausted()).isFalse();
        when:
            Memento.open();
            unit.addOneMunitionsLevel();
            repaint(game);
            loadAllImages(); // to load lowamno.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("lowamno", zoomAndRotate0(416.6667, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.munitions).equalsTo(2);
            assert(unit.areMunitionsScarce()).isFalse();
            assert(unit.areMunitionsExhausted()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("scarceamno", zoomAndRotate0(416.6667, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.munitions).equalsTo(1);
    });

    it("Checks removing a lack of munitions level to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.addOneMunitionsLevel();
            unit.addOneMunitionsLevel();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("lowamno", zoomAndRotate0(416.6667, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.munitions).equalsTo(2);
        when:
            Memento.open();
            unit.replenishMunitions();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.munitions).equalsTo(0);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("lowamno", zoomAndRotate0(416.6667, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.munitions).equalsTo(2);
    });

    it("Checks playing a unit", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.launchAction(new CBAction(game, unit));
            unit.setPlayed();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(451.3685, 317.186)));
            assertNoMoreDirectives(markersLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks giving an order to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.receivesOrder(true);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("ordergiven", zoomAndRotate0(451.3685, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.hasReceivedOrder()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.hasReceivedOrder()).isFalse();
        when:
            unit.receivesOrder(true);
        then:
            assert(unit.hasReceivedOrder()).isTrue();
        when:
            unit.reactivate();
        then:
            assert(unit.hasReceivedOrder()).isFalse();
    });

    it("Checks that playing an order replace (hide) 'order given' marker", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.receivesOrder(true);
            repaint(game);
        when:
            unit.launchAction(new CBAction(game, unit));
            unit.setPlayed();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(451.3685, 317.186)));
            assertNoMoreDirectives(markersLayer);
    });

    it("Checks played marker appearance / disappearance when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2UnitsTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            player.launchPlayableAction = function(unit, event) {
                unit.launchAction(new CBAction(game, unit));
            }
        when:
            player.changeSelection(unit1, dummyEvent);
            unit1.action.markAsStarted();
            clickOnPiece(game, unit2);
            loadAllImages(); // to load actiondone.png
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(451.3685, 317.186)));
            assertNoMoreDirectives(markersLayer);
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
            unit.disrupt();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(1);
            assert(unit.isDisrupted()).isTrue();
            assert(unit.isRouted()).isFalse();
        when:
            Memento.open();
            unit.rout();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("fleeing", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(2);
            assert(unit.isDisrupted()).isFalse();
            assert(unit.isRouted()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(1);
    });

    it("Checks removing cohesion levels to a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.addOneCohesionLevel();
            unit.addOneCohesionLevel();
            repaint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("fleeing", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(2);
        when:
            Memento.open();
            unit.rally();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(1);
        when:
            Memento.open();
            unit.reorganize();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.cohesion).equalsTo(0);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
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
            unit.addOneCohesionLevel(); // Rout the unit
            unit.addOneCohesionLevel(); // Destroy the unit
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isDestroyed()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(381.9648, 386.5897)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(unit.isDestroyed()).isFalse();
    });

    it("Checks a troop taking losses", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            unit.takeALoss();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unitb", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            Memento.open();
            unit.takeALoss();
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unitb", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
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
            assertNoMoreDirectives(unitsLayer, 4);
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation2b", zoomAndRotate90(416.6667, 303.7757)));
            assertNoMoreDirectives(formationsLayer);
            assert(game.playables).contains(formation);
        when: // formation breaks automatically
            formation.takeALoss();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate90(416.6667, 351.8878)));
            assertDirectives(unitsLayer, showTroop("misc/unitb", zoomAndRotate90(416.6667, 255.6635)));
            assertNoMoreDirectives(unitsLayer);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([]);
            assert(game.playables).doesNotContain(formation);
            assert(game.playables.length).equalsTo(2);
    });

    it("Checks mark unit as on contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.setEngaging(true);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("contact", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            Memento.undo();
            repaint(game);
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
            unit.setCharging(CBCharge.CHARGING);
            repaint(game);
            loadAllImages(); // to load fleeing.png
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isTrue();
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
            assert(unit.isEngaging()).isFalse();
            assert(unit.isCharging()).isFalse();
    });

    it("Checks when a unit stop charging, it adds a tiredness level", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            unit.setCharging(CBCharge.CHARGING);
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.NONE);
            assert(unit.isCharging()).isTrue();
        when:
            unit.setCharging(CBCharge.NONE);
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.TIRED);
            assert(unit.isCharging()).isFalse();
    });

    it("Checks that charge supersedes contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            unit.setEngaging(true);
            unit.setCharging(CBCharge.CHARGING);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isTrue();
        when:
            unit.setCharging(false);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("contact", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit.isEngaging()).isTrue();
            assert(unit.isCharging()).isFalse();
        when:
            unit.setEngaging(false);
            repaint(game);
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
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.NONE);
        when:
            unit.checkEngagement(false, true);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.BEGIN_CHARGE);
        when:
            unit.checkEngagement(false, true);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showActiveMarker("possible-charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when:
            unit.checkEngagement(false, true);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showActiveMarker("possible-charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when:
            resetDirectives(markersLayer);
            unit.checkEngagement(false, false);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.NONE);
    });

    it("Checks acknowledgment of requested charge", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.checkEngagement(false, true);
            unit.checkEngagement(false, true); // Here, unit can charge
        when:
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showActiveMarker("possible-charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when: // Charge is not requested
            unit.acknowledgeCharge(false);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showActiveMarker("possible-charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.CAN_CHARGE);
        when: // Charge is requested
            unit._engagingArtifact.onMouseClick();
            unit.acknowledgeCharge(false);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("charge", zoomAndRotate0(381.9648, 317.186)));
            assertNoMoreDirectives(markersLayer);
            assert(unit._charging).equalsTo(CBCharge.CHARGING);
    });

    it("Checks acknowledgment when charge is not requested at the end of movement", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
            unit.checkEngagement(false, true);
            unit.checkEngagement(false, true); // Here, unit can charge
        when: // Charge is not requested
            unit.acknowledgeCharge(true);
            repaint(game);
        then:
            assertNoMoreDirectives(markersLayer, 4);
            assert(unit._charging).equalsTo(CBCharge.NONE);
    });

    it("Checks unit/hexLocation list of units and hexLocation emptiness", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            let unit1Hex = unit1.hexLocation;
            let unit2Hex = unit2.hexLocation;
            unit2.move(unit1.hexLocation);
        when:
            assert(unit2Hex.empty).isTrue();
            assert(unit1Hex.empty).isFalse();
            assert(unit2Hex.units).arrayEqualsTo([]);
            assert(unit1Hex.units).arrayEqualsTo([unit1, unit2]);
            assert(game.units).arrayEqualsTo([unit1, unit2]);
    });

    it("Checks that when a unit retracts, it also hides markers", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            unit2.move(unit1.hexLocation);
            repaint(game);
            var [markersLayer] = getLayers(game.board, "markers-1");
        when:
            resetDirectives(markersLayer);
            unit2.setPlayed(true);
            unit2.setEngaging(true);
            unit2.addOneCohesionLevel();
            unit2.addOneTirednessLevel();
            unit2.addOneMunitionsLevel();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(461.1437, 307.4108)));
            assertDirectives(markersLayer, showMarker("contact", zoomAndRotate0(391.74, 307.4108)));
            assertDirectives(markersLayer, showMarker("disrupted", zoomAndRotate0(391.74, 376.8145)));
            assertDirectives(markersLayer, showMarker("tired", zoomAndRotate0(391.74, 342.1127)));
            assertDirectives(markersLayer, showMarker("scarceamno", zoomAndRotate0(426.4418, 376.8145)));
            assertNoMoreDirectives(markersLayer);
        when:
            unit1.retractAbove();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that when a unit retracts, it also hides options", () => {
        given:
            var {game, unit} = createTinyGame();
            repaint(game);
            var [spellLayer, optionsLayer] = getLayers(game.board, "spells-0", "options-0");
        when:
            var spell = createSpell(unit, "./../images/units/misc/spell.png");
            var option = createOption(unit, "./../images/units/misc/option.png");
            repaint(game);
        then:
            assertClearDirectives(spellLayer);
            assertClearDirectives(optionsLayer);
            assertDirectives(spellLayer, showOption("misc/spell", zoomAndRotate0(416.6667, 351.8878)));
            assertDirectives(optionsLayer, showOption("misc/option", zoomAndRotate0(406.8915, 347.0002)));
            assertNoMoreDirectives(spellLayer, optionsLayer);
        when:
            option.retractAbove();
            repaint(game);
        then:
            assert(getDirectives(spellLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
            ]);
    });

    function createTinyCommandGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBUnitPlayer("player1");
        game.addPlayer(player);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType = new CBTestTroopType("unit", [
            "./../images/units/misc/unit.png", "./../images/units/misc/unitb.png"
        ]);
        let unit = new CBTroop(unitType, wing);
        unit.addToMap(map.getHex(5, 8));
        let leaderType = new CBTestLeaderType("leader", [
            "./../images/units/misc/leader.png", "./../images/units/misc/leaderb.png"
        ]);
        let leader = new CBCharacter(leaderType, wing);
        leader.addToMap(map.getHex(5, 9));
        game.start();
        loadAllImages();
        return {game, player, unit, leader, wing, map};
    }

    it("Checks leader specificities", () => {
        given:
            var {leader, wing} = createTinyCommandGame();
        then:
            assert(leader.unitNature).isTrue();
            assert(leader.characterNature).isTrue();
        when:
            var otherLeader = leader.type.createUnit(wing, 2);
        then:
            assert(otherLeader.unitNature).isTrue();
            assert(otherLeader.characterNature).isTrue();
            assert(otherLeader.steps).equalsTo(2);
            assert(otherLeader.wing).equalsTo(wing);
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
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showCharacter("misc/leader", zoomAndRotate0(416.6667, 448.1122)));
            assertNoMoreDirectives(unitsLayer);
        when:
            leader.takeCommand();
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showCommandMarker("defend", zoomAndRotate0(451.3685, 448.1122)));
            assertNoMoreDirectives(markersLayer);
        when:
            wing.changeOrderInstruction(CBOrderInstruction.ATTACK);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showCommandMarker("attack", zoomAndRotate0(451.3685, 448.1122)));
            assertNoMoreDirectives(markersLayer);
        when:
            leader.dismissCommand();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that when a character retracts, it also hides order instruction marker", () => {
        given:
            var {game, wing, unit, leader} = createTinyCommandGame();
            wing.setLeader(leader);
            leader.move(unit.hexLocation);
            repaint(game);
            var [markersLayer] = getLayers(game.board, "markers-1");
        when:
            wing.changeOrderInstruction(CBOrderInstruction.ATTACK);
            repaint(game);
        then:
            assertClearDirectives(markersLayer);
            assertDirectives(markersLayer, showCommandMarker("attack", zoomAndRotate0(461.1437, 342.1127)));
            assertNoMoreDirectives(markersLayer);
        when:
            unit.retractAbove();
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
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
            game._resetPlayables(player);
        then:
            assert(leader.commandPoints).equalsTo(0);
    });

    it("Checks wizardry", () => {

        class TestSpell extends CBPiece {
            constructor(wizard) {
                super("units", ["./../images/magic/red/redspell.png"], new Dimension2D(142, 142));
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
            unit.setMunitions(CBMunitions.SCARCE);
            unit.fixRemainingLossSteps(1);
            unit.setTiredness(CBTiredness.EXHAUSTED);
            var cloneUnit = unit.clone();
        then:
            assert(cloneUnit).is(CBTroop);
            assert(cloneUnit.type).equalsTo(unit.type);
            assert(cloneUnit.movementPoints).equalsTo(3);
            assert(cloneUnit.extendedMovementPoints).equalsTo(5);
            assert(cloneUnit.cohesion).equalsTo(CBCohesion.ROUTED);
            assert(cloneUnit.munitions).equalsTo(CBMunitions.SCARCE);
            assert(cloneUnit.steps).equalsTo(1);
            assert(cloneUnit.tiredness).equalsTo(CBTiredness.EXHAUSTED);
        when:
            leader.movementPoints = 1;
            leader.extendedMovementPoints = 2;
            leader.cohesion = CBCohesion.DISRUPTED;
            leader.setMunitions(CBMunitions.EXHAUSTED);
            leader.fixRemainingLossSteps(2);
            leader.setTiredness(CBTiredness.TIRED);
            var cloneLeader = leader.clone();
        then:
            assert(cloneLeader).is(CBCharacter);
            assert(cloneLeader.type).equalsTo(leader.type);
            assert(cloneLeader.movementPoints).equalsTo(1);
            assert(cloneLeader.extendedMovementPoints).equalsTo(2);
            assert(cloneLeader.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(cloneLeader.munitions).equalsTo(CBMunitions.EXHAUSTED);
            assert(cloneLeader.steps).equalsTo(2);
            assert(cloneLeader.tiredness).equalsTo(CBTiredness.TIRED);
    });

    function prepareTinyGameWithFormation() {
        var { game, map } = prepareTinyGame();
        var player = new CBUnitPlayer("player1");
        game.addPlayer(player);
        let wing = new CBWing(player, "./../units/banner.png");
        let unitType = new CBTestTroopType("unit", [], [
            "./../images/units/misc/formation.png", "./../images/units/misc/formationb.png"
        ]);
        let formation = new CBFormation(unitType, wing);
        formation.angle = 150;
        let formationLocation = new CBHexSideId(map.getHex(5, 8), map.getHex(6, 7))
        formation.addToMap(formationLocation);
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
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate150(458.3333, 327.8317)));
            assertNoMoreDirectives(formationsLayer);
        when:
            resetDirectives(fmarkersLayer, formationsLayer);
            formation.disrupt();
            formation.addOneMunitionsLevel();
            formation.addOneTirednessLevel();
            formation.addOneCohesionLevel();
            formation.receivesOrder(true);
            repaint(game);
        then:
            assertClearDirectives(fmarkersLayer);
            assertDirectives(fmarkersLayer, showMarker("scarceamno", zoomAndRotate150(440.9824, 297.7791)));
            assertDirectives(fmarkersLayer, showMarker("tired", zoomAndRotate150(518.4387, 293.1299)));
            assertDirectives(fmarkersLayer, showMarker("fleeing", zoomAndRotate150(501.0878, 263.0772)));
            assertDirectives(fmarkersLayer, showMarker("ordergiven", zoomAndRotate150(415.5789, 392.5863)));
            assertNoMoreDirectives(fmarkersLayer);
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
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate150(625, 327.8317)));
            assertNoMoreDirectives(formationsLayer);
            assert(fHexId1.units).arrayEqualsTo([]);
            assert(fHexId2.units).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([formation]);
        when: // move formation (undoable)
            resetDirectives(formationsLayer);
            var mHexId1 = map.getHex(7, 9);
            var mHexId2 = map.getHex(8, 8);
            formation.move(new CBHexSideId(mHexId1, mHexId2), 0);
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate150(625, 424.0561)));
            assertNoMoreDirectives(formationsLayer);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
            assert(mHexId1.units).arrayEqualsTo([formation]);
            assert(mHexId2.units).arrayEqualsTo([formation]);
        when: // undo formation move
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate150(625, 327.8317)));
            assertNoMoreDirectives(formationsLayer);
            assert(fHexId1.units).arrayEqualsTo([]);
            assert(fHexId2.units).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([formation]);
        when:
            formation.move(null, 0);
            repaint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([]);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
        when:
            formation.move(new CBHexSideId(mHexId1, mHexId2), 0);
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate150(625, 424.0561)));
            assertNoMoreDirectives(formationsLayer);
            assert(sHexId1.units).arrayEqualsTo([]);
            assert(sHexId2.units).arrayEqualsTo([]);
            assert(mHexId1.units).arrayEqualsTo([formation]);
            assert(mHexId2.units).arrayEqualsTo([formation]);
    });

    it("Checks formation turning", () => {
        given:
            var { game, formation, map } = prepareTinyGameWithFormation();
            var [formationsLayer] = getLayers(game.board, "formations-0");
            var sHexId1 = map.getHex(7, 8);
            var sHexId2 = map.getHex(7, 9);
            formation.hexLocation = new CBHexSideId(sHexId1, sHexId2);
            formation.angle = 90;
            repaint(game);
        when:
            Memento.open();
            formation.turn(60);
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate30(625, 375.9439)));
            assertNoMoreDirectives(formationsLayer);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([]);
            assert(sHexId2.getNearHex(60).units).arrayEqualsTo([formation]);
            assert(formation.angle).equalsTo(30);
        when: // undo formation move
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate90(583.3333, 400)));
            assertNoMoreDirectives(formationsLayer);
            assert(sHexId1.units).arrayEqualsTo([formation]);
            assert(sHexId2.units).arrayEqualsTo([formation]);
    });

    it("Checks formation cloning", () => {
        given:
            var {formation} = prepareTinyGameWithFormation();
        when:
            formation.movementPoints = 3;
            formation.setTiredness(CBTiredness.TIRED);
            var cloneFormation = formation.clone();
        then:
            assert(cloneFormation).is(CBFormation);
            assert(cloneFormation.movementPoints).equalsTo(3);
            assert(cloneFormation.tiredness).equalsTo(CBTiredness.TIRED);
    });

});