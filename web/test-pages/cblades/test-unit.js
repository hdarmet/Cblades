'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBGame,
    CBMap,
    CBAbstractPlayer,
    CBAction, CBHexSideId
} from "../../jslib/cblades/game.js";
import {
    CBTroop,
    CBWing,
    CBCharacter,
    CBUnitType,
    CBLackOfMunitions,
    CBTiredness,
    CBCohesion,
    CBOrderInstruction, CBFormation
} from "../../jslib/cblades/unit.js";

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

    function createTinyGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBUnitType("unit", [
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
        let unitType = new CBUnitType("unit", [
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
        let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png"]);
        let unit1 = new CBTroop(unitType1, wing);
        game.addUnit(unit1, map.getHex(5, 8));
        let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png"]);
        let unit2 = new CBTroop(unitType2, wing);
        game.addUnit(unit2, map.getHex(5, 7));
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, wing, player};
    }

    it("Checks unit/wing/player structure", () => {
        given:
            var { game, map } = prepareTinyGame();
        when:
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
            let unitType1 = new CBUnitType("unit1",
                ["/CBlades/images/units/misc/unit1.png"],
                ["/CBlades/images/units/misc/formation1.png"]);
            var unit = new CBTroop(unitType1, wing);
            game.addUnit(unit, map.getHex(5, 8));
            var formation = new CBFormation(unitType1, wing);
            game.addUnit(formation, new CBHexSideId(map.getHex(5, 8), map.getHex(5, 9)));
            formation.angle = 90;
        then:
            assert(unit.wing).equalsTo(wing);
            assert(unit.player).equalsTo(player);
            assert(unit.maxStepCount).equalsTo(2);
            assert(formation.maxStepCount).equalsTo(8);
            assert(formation.minStepCount).equalsTo(3);
            assert(player.units).unorderedArrayEqualsTo([unit, formation]);
            assert(unitType1.name).equalsTo("unit1");
            assert(unitType1.getTroopPaths()).arrayEqualsTo(["/CBlades/images/units/misc/unit1.png"]);
            assert(unitType1.getFormationPaths()).arrayEqualsTo(["/CBlades/images/units/misc/formation1.png"]);
            assert(unitType1.getTroopMaxStepCount()).equalsTo(2);
            assert(unitType1.getFormationMaxStepCount()).equalsTo(8);
            assert(unitType1.getFormationMinStepCount()).equalsTo(3);
    });

    it("Checks unit move on the on map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var wing = new CBWing(player);
        when:
            var unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png"]);
            var unit = new CBTroop(unitType1, wing);
            var hexId = map.getHex(5, 8);
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
        when:
            var hexId2 = map.getHex(6, 8);
            unit.move(hexId2, 1);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([unit]);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([]);
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
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        then:
            assert(unit.inGoodOrder()).isTrue();
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
            unit.markAsCharging(true);
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

    it("Checks that charge supersedes contact", () => {
        given:
            var {game, unit, map} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsEngaging(true);
            unit.markAsCharging(true);
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

    function createTinyCommandGame() {
        var { game, map } = prepareTinyGame();
        var player = new CBAbstractPlayer();
        game.addPlayer(player);
        let wing = new CBWing(player);
        let unitType = new CBUnitType("unit", [
            "/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"
        ]);
        let unit = new CBTroop(unitType, wing);
        game.addUnit(unit, map.getHex(5, 8));
        let leaderType = new CBUnitType("leader", [
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
            assert(leader.isUnit).isTrue();
            assert(leader.isCharacter).isTrue();
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
        let unitType = new CBUnitType("unit", [], [
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
            var [markersLayer, formationsLayer] = getLayers(game.board, "markers-0", "formations-0");
        then:
            assert(formation.isUnit).isTrue();
            assert(formation.isFormation).isTrue();
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 458.3333, 327.8317)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation.png, -142, -71, 284, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(markersLayer, formationsLayer);
            formation.disrupt();
            formation.addOneLackOfMunitionsLevel();
            formation.addOneTirednessLevel();
            formation.addOneCohesionLevel();
            formation.receiveOrder(true);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
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
            var cloneFormation = formation.clone();
        then:
            assert(cloneFormation).is(CBFormation);
            assert(cloneFormation.movementPoints).equalsTo(3);
    });

});