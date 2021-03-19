'use strict'

import {
    after,
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBFireAttackActuator, CBFormationRetreatActuator,
    CBRetreatActuator,
    CBShockAttackActuator,
    registerInteractiveCombat,
    unregisterInteractiveCombat
} from "../../jslib/cblades/interactive-combat.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnCounter,
    clickOnTrigger,
    clickOnDice,
    executeAllAnimations,
    clickOnResult,
    dummyEvent,
    clickOnMask,
    rollFor
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2PlayersTinyGame, create2PlayersTinyFormationGame
} from "./game-examples.js";
import {
    CBHexSideId
} from "../../jslib/cblades/map.js";

describe("Interactive Combat", ()=> {

    before(() => {
        registerInteractiveCombat();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveCombat();
    });

    function unit1IsEngagedByUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 4), 0);
        unit2.move(map.getHex(2, 3), 0);
        unit2.rotate(180);
        unit2.markAsEngaging(true);
        loadAllImages();
    }

    it("Checks that the unit menu contains menu items for combat", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 301.6667, 296.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -65, 250, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -65, 250, 130)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/shock-duel-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/fire-duel-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/shock-attack-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/fire-attack-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks when a unit failed to pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([ // Action menu opened in modal mode
                "save()",
                    "setTransform(1, 0, 0, 1, 130, 70)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -65, 250, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -65, 250, 130)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

    function clickOnShockAttackAction(game) {
        return clickOnActionMenu(game, 0, 1);
    }

    function getShockAttackActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBShockAttackActuator) return actuator;
        }
        return null;
    }

    function getRetreatActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBRetreatActuator) return actuator;
        }
        return null;
    }

    it("Checks shock attack action actuator appearance when support is possible", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 397.1163, 236.1131)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 436.217, 275.2138)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/supported-shock.png, -60, -66.5, 120, 133)",
                "restore()"
            ]);
        when:
            var shockAttackActuator = getShockAttackActuator(game);
        then:
            assert(shockAttackActuator.getTrigger(unit2, true)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, true)).isNotDefined();
            assert(shockAttackActuator.getTrigger(unit2, false)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, false)).isNotDefined();
    });

    it("Checks shock attack action actuator appearance when support is not possible", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
            unit1.move(map.getHex(5, 8));
            unit1.addOneTirednessLevel();
            unit1.addOneTirednessLevel();
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6667, 255.6635)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var shockAttackActuator = getShockAttackActuator(game);
        then:
            assert(shockAttackActuator.getTrigger(unit2, true)).isNotDefined();
            assert(shockAttackActuator.getTrigger(unit2, false)).isDefined();
    });

    it("Checks shock resolution appearance (and cancelling shock attack action)", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
            let shockAttackActuator = getShockAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 100)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, 0, 0, 804, 174, -402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 100)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 466)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/shock-attack-insert.png, 0, 0, 524, 658, -262, -329, 524, 658)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 466)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-262, -329, 524, 658)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully shock attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 177)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(unit2);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/blood.png, -52, -72, 104, 144)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 169.0616)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 491.6667, 212.3625)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, -0.4233, 0.4233, 0.2444, 341.6667, 212.3625)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(120)).isNotDefined();
    });

    it("Checks when a unit fails to shock attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 177)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit retreat", () => {
        given:
            var { game, map, player1, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getTrigger(0));
            loadAllImages();
            resetDirectives(actuatorsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 416.6667, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that a formation may shock attack twice", () => {
        given:
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).getHexSide(60), 0);
            unit1.move(map.getHex(5, 7));
            unit1.angle = 180;
            clickOnCounter(game, formation2);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit1, true));
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 177)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(formation2.hasBeenActivated()).isTrue();
            assert(formation2.hasBeenPlayed()).isFalse();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 397.1163, 236.1131)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 436.217, 275.2138)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/supported-shock.png, -60, -66.5, 120, 133)",
                "restore()"
            ]);
    });

    function getFormationRetreatActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFormationRetreatActuator) return actuator;
        }
        return null;
    }

    it("Checks when a unit successfully shock attack a formation", () => {
        given:
            var { game, map, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            formation2.move(new CBHexSideId(map.getHex(5, 7), map.getHex(6, 7)));
            formation2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(formation2, true));
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 177)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(formation2);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 458.3333, 279.7196)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/blood.png, -62.5, -86.5, 125, 173)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 169.0616)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 575, 260.4747)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getFormationRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(120)).isNotDefined();
    });

    it("Checks when a formation retreat", () => {
        given:
            var { game, map, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, formationLayer] = getLayers(game.board,
                "actuators", "formations-0"
            );
            unit1.move(map.getHex(5, 8));
            formation2.move(new CBHexSideId(map.getHex(5, 7), map.getHex(6, 7)));
            formation2.angle = 210;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(formation2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getFormationRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getTrigger(0, false));
            loadAllImages();
            resetDirectives(actuatorsLayer, formationLayer);
            repaint(game);
        then:
            assert(getDirectives(formationLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, -0.2444, 0.2444, -0.4233, 458.3333, 183.4952)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(formation2.angle).equalsTo(210);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a formation rotate in place of retreating", () => {
        given:
            var { game, map, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, formationLayer] = getLayers(game.board,
                "actuators", "formations-0"
            );
            unit1.move(map.getHex(5, 8));
            formation2.move(new CBHexSideId(map.getHex(6, 7), map.getHex(7, 8)));
            formation2.angle = 210;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(formation2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getFormationRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getTrigger(60, true));
            loadAllImages();
            resetDirectives(actuatorsLayer, formationLayer);
            repaint(game);
        then:
            assert(getDirectives(formationLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 583.3333, 303.7757)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(formation2.angle).equalsTo(270);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit takes a loss", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getLossTrigger());
            loadAllImages();
            resetDirectives(actuatorsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2b.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([

            ]);
    });

    it("Checks when a formation takes a loss", () => {
        given:
            var { game, map, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, formationLayer] = getLayers(game.board,
                "actuators", "formations-0"
            );
            unit1.move(map.getHex(5, 8));
            formation2.move(new CBHexSideId(map.getHex(5, 7), map.getHex(6, 7)));
            formation2.angle = 210;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(formation2, true));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getFormationRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getLossTrigger());
            loadAllImages();
            resetDirectives(actuatorsLayer, formationLayer);
            repaint(game);
        then:
            assert(getDirectives(formationLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, -0.2444, 0.2444, -0.4233, 458.3333, 279.7196)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2b.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    function clickOnFireAttackAction(game) {
        return clickOnActionMenu(game, 1, 1);
    }

    function getFireAttackActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFireAttackActuator) return actuator;
        }
        return null;
    }

    it("Checks fire attack action actuator appearance", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
            unit1.move(map.getHex(5, 8));
            unit1.addOneTirednessLevel();
            unit1.addOneTirednessLevel();
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/fire.png, -70, -77.5, 140, 155)",
                "restore()"
            ]);
        when:
            var fireAttackActuator = getFireAttackActuator(game);
        then:
            assert(fireAttackActuator.getTrigger(unit1)).isNotDefined();
            assert(fireAttackActuator.getTrigger(unit2)).isDefined();
    });

    it("Checks fire resolution appearance (and cancelling fire attack action)", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
            let fireAttackActuator = getFireAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 92)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, 0, 0, 804, 174, -402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 92)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 458)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/fire-attack-insert.png, 0, 0, 524, 658, -262, -329, 524, 658)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 458)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-262, -329, 524, 658)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 654)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 174)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 199)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 259)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 752)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully fire attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 654)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 174)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 199)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 259)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 752)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 169)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).equalsTo(unit2);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/blood.png, -52, -72, 104, 144)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 72.8372)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 491.6667, 116.1382)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(-0.2444, 0.4233, -0.4233, -0.2444, 491.6667, 202.7401)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(-0.2444, -0.4233, 0.4233, -0.2444, 341.6667, 202.7401)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()",
                "save()",
                    "setTransform(0.2444, -0.4233, 0.4233, 0.2444, 341.6667, 116.1382)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
                "restore()"
            ]);
        when:
            var retreatActuator = getRetreatActuator(game);
        then:
            assert(retreatActuator.getTrigger(0)).isDefined();
            assert(retreatActuator.getTrigger(150)).isNotDefined();
    });

    it("Checks when a unit fails to fire attack", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators", "widgets", "widget-commands","widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 662)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 182)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 207)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 267)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 760)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 177)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when double on dice lower firer ammunitions", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [markersLayer] = getLayers(game.board,"markers-0");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
        when:
            rollFor(5,5);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(markersLayer);
            repaint(game);
        then:
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/scarceamno.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 317.186)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
    });

    it("Checks that a formation may fire attack twice", () => {
        given:
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).getHexSide(60), 0);
            unit1.move(map.getHex(5, 6));
            unit1.angle = 180;
            clickOnCounter(game, formation2);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit1));
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 654)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 167, 174)",
                    "drawImage(/CBlades/images/inserts/ok.png, -12.5, -12.5, 25, 25)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 617, 199)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 259)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 267, 752)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/down.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 517, 169)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(formation2.hasBeenActivated()).isTrue();
            assert(formation2.hasBeenPlayed()).isFalse();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/fire.png, -70, -77.5, 140, 155)",
                "restore()"
            ]);
    });

});