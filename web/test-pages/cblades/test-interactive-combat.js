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
    assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBAdvanceActuator,
    CBFireAttackActuator, CBFireHelpActuator, CBFormationRetreatActuator,
    CBRetreatActuator,
    CBShockAttackActuator, CBShockHelpActuator,
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
    rollFor,
    showMask,
    showInsert,
    showSuccessResult,
    showPlayedDice,
    showFailureResult,
    zoomAndRotate300,
    zoomAndRotate30,
    showDice,
    showInsertCommand,
    showMarker,
    zoomAndRotate0,
    zoomAndRotate60,
    zoomAndRotate120,
    zoomAndRotate240,
    showTroop,
    zoomAndRotate180,
    showSelectedTroop,
    zoomAndRotate210,
    showFormation,
    zoomAndRotate270,
    showMenuPanel,
    showMenuItem,
    showMultiInsert,
    showInsertMark
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2PlayersTinyGame,
    create2PlayersTinyFormationGame,
    create2Players2Units2LeadersTinyGame,
    create2PlayersFireTinyGame
} from "./game-examples.js";
import {
    CBHexSideId
} from "../../jslib/cblades/map.js";
import {
    CBCharge
} from "../../jslib/cblades/unit.js";

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

    function showUnsupportedShock([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/unsupported-shock.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }

    function showSupportedShock([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/supported-shock.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }

    function showUnsupportedShockAdvantage(advantage, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/unsupported-shock-advantage.png, -27.5, -27.5, 55, 55)",
                "shadowColor = #000000", "shadowBlur = 0",
                "font = bold 30px serif", "textAlign = center", "fillStyle = #AD5A2D",
                `fillText(${advantage}, 0, 10)`,
            "restore()"
        ];
    }

    function showSupportedShockAdvantage(advantage, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/supported-shock-advantage.png, -27.5, -27.5, 55, 55)",
                "shadowColor = #000000", "shadowBlur = 0",
                "font = bold 30px serif", "textAlign = center", "fillStyle = #9D2F12",
            `fillText(${advantage}, 0, 10)`,
            "restore()"
        ];
    }

    function showFire([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/fire.png, -50, -77.5, 100, 155)",
            "restore()"
        ];
    }

    function showFireAdvantage(advantage, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            "drawImage(/CBlades/images/actuators/fire-advantage.png, -27.5, -27.5, 55, 55)",
            "shadowColor = #000000", "shadowBlur = 0",
            "font = bold 30px serif", "textAlign = center", "fillStyle = #A1124F",
            `fillText(${advantage}, 0, 10)`,
            "restore()"
        ];
    }

    function showLossTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/blood.png, -62.5, -86.5, 125, 173)",
            "restore()",
        ];
    }

    function showRetreatTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/retreat-move.png, -40, -65, 80, 130)",
            "restore()",
        ];
    }

    function showAdvanceTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/advance-move.png, -40, -65, 80, 130)",
            "restore()",
        ];
    }

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
            var [unitsLayer, widgetsLayer, itemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, itemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(4, 2, 301.6667, 296.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(2, 1, "icons/shock-duel", 4, 2, 301.6667, 296.8878));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "icons/fire-duel", 4, 2, 301.6667, 296.8878));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "icons/shock-attack", 4, 2, 301.6667, 296.8878));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "icons/fire-attack", 4, 2, 301.6667, 296.8878));
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
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 386.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 426.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(4, 2, 130, 70));
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
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showUnsupportedShock(zoomAndRotate30(397.1163, 236.1131)));
            assertDirectives(actuatorsLayer, showSupportedShock(zoomAndRotate30(436.217, 275.2138)));
            assertDirectives(actuatorsLayer, showUnsupportedShockAdvantage(0, zoomAndRotate0(380.0098, 219.0066)));
            assertDirectives(actuatorsLayer, showSupportedShockAdvantage(4, zoomAndRotate0(453.3236, 292.3204)));
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([]);
        when:
            var shockAttackActuator = getShockAttackActuator(game);
        then:
            assert(shockAttackActuator.getTrigger(unit2, true)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, true)).isNotDefined();
            assert(shockAttackActuator.getTrigger(unit2, false)).isDefined();
            assert(shockAttackActuator.getTrigger(unit1, false)).isNotDefined();
        when:
            var shockHelpActuator = getShockHelpActuator(game);
        then:
            assert(shockHelpActuator.getTrigger(unit2, true)).isDefined();
            assert(shockHelpActuator.getTrigger(unit1, true)).isNotDefined();
            assert(shockHelpActuator.getTrigger(unit2, false)).isDefined();
            assert(shockHelpActuator.getTrigger(unit1, false)).isNotDefined();
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
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showUnsupportedShock(zoomAndRotate30(416.6667, 255.6635)));
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
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 100, 804, 174));
            assertDirectives(widgetsLayer, showInsert("shock-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 627, 207));
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            resetDirectives(actuatorsLayer, widgetsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 100, 804, 174));
            assertDirectives(widgetsLayer, showInsert("shock-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(527, 177));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 627, 207));
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, commandsLayer, widgetsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.hasBeenPlayed()).isFalse();
            assert(game.focusedUnit).equalsTo(unit2);
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showLossTrigger(zoomAndRotate0(416.6667, 255.6635)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate0(416.6667, 169.0616)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate60(491.6667, 212.3625)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate300(341.6667, 212.3625)));
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
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 100, 804, 174));
            assertDirectives(widgetsLayer, showInsert("shock-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(527, 177));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 627, 207));
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit retreat (and the attacker does not advance)", () => {
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
            rollFor(2, 3);
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
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 351.8878)));
            assertDirectives(unitsLayer, showTroop("misc/unit2", zoomAndRotate180(416.6667, 159.4391)));
            assertNoMoreDirectives(actuatorsLayer, 4);
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    it("Checks a charging unit automatic advance", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit1.markAsCharging(CBCharge.CHARGING);
            unit2.move(map.getHex(5, 7));
            unit2.angle = 180;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit2, true));
            rollFor(2, 3);
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
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 255.6635)));
            assertDirectives(unitsLayer, showTroop("misc/unit2", zoomAndRotate180(416.6667, 159.4391)));
            assertNoMoreDirectives(actuatorsLayer, 4);
            assert(unit1.hasBeenPlayed()).isTrue();
    });

    function getShockHelpActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBShockHelpActuator) return actuator;
        }
        return null;
    }

    it("Checks combat rules showing", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, actuatorsLayer] = getLayers(game.board, "widgets", "actuators-0");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showUnsupportedShock(zoomAndRotate30(397.1163, 236.1131)));
            assertDirectives(actuatorsLayer, showSupportedShock(zoomAndRotate30(436.217, 275.2138)));
            assertDirectives(actuatorsLayer, showUnsupportedShockAdvantage(0, zoomAndRotate0(380.0098, 219.0066)));
            assertDirectives(actuatorsLayer, showSupportedShockAdvantage(4, zoomAndRotate0(453.3236, 292.3204)));
        when:
            var shockHelpActuator = getShockHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, shockHelpActuator.getTrigger(unit2, true));
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("shock-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            assertDirectives(widgetsLayer, showInsertMark(75, 385));
            assertDirectives(widgetsLayer, showInsertMark(290, 385));
            assertDirectives(widgetsLayer, showInsertMark(20, 700));
            assertDirectives(widgetsLayer, showMultiInsert("weapon-table", 757, 427, 500, 500, [
                {xs:0, ys:179.75, xd:-250, yd:-250, w:86, h:500},
                {xs:272.5294, ys:179.75, xd:-164, yd:-250, w:414, h:500}
            ]));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks that a formation may shock attack twice", () => {
        given:
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).toward(60), 0);
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
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(527, 177));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 627, 207));
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(formation2.hasBeenActivated()).isTrue();
            assert(formation2.hasBeenPlayed()).isFalse();
            assert(game.focusedUnit).isNotDefined();
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showUnsupportedShock(zoomAndRotate30(397.1163, 236.1131)));
            assertDirectives(actuatorsLayer, showSupportedShock(zoomAndRotate30(436.217, 275.2138)));
    });

    it("Checks that a formation finishes attack action if there is no more unit to shock attack", () => {
        given:
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).toward(60), 0);
            unit1.move(map.getHex(5, 7));
            unit1.angle = 180;
            clickOnCounter(game, formation2);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(unit1, true));
            loadAllImages();
        when:
            rollFor(1, 1);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            let retreatActuator = getRetreatActuator(game);
            resetDirectives(actuatorsLayer)
            clickOnTrigger(game, retreatActuator.getTrigger(0)); // troop retreats !
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            assert(formation2.hasBeenActivated()).isTrue();
            assert(formation2.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
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
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(527, 177));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 627, 207));
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(game.focusedUnit).equalsTo(formation2);
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showLossTrigger(zoomAndRotate0(458.3333, 279.7196)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate0(416.6667, 169.0616)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate60(575, 260.4747)));
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
            rollFor(2, 3);
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
            skipDirectives(formationLayer, 4);
            assertDirectives(formationLayer, showFormation("misc/formation2", zoomAndRotate210(458.3333, 183.4952)));
            assert(formation2.angle).equalsTo(210);
            assertNoMoreDirectives(actuatorsLayer, 4);
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
            rollFor(2, 3);
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
            skipDirectives(formationLayer, 4);
            assertDirectives(formationLayer, showFormation("misc/formation2", zoomAndRotate270(583.3333, 303.7757)));
            assert(formation2.angle).equalsTo(270);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
    });

    function getAdvanceActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBAdvanceActuator) return actuator;
        }
        return null;
    }

    it("Checks when a charging unit wins against a formation that retreat may advance using the advance actuator", () => {
        given:
            var { game, map, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, unitsLayer] = getLayers(game.board,
                "actuators", "units-0"
            );
            unit1.move(map.getHex(5, 8));
            unit1.markAsCharging(CBCharge.CHARGING);
            formation2.move(new CBHexSideId(map.getHex(5, 7), map.getHex(6, 7)));
            formation2.angle = 210;
            clickOnCounter(game, unit1);
            clickOnShockAttackAction(game);
            let shockAttackActuator = getShockAttackActuator(game);
            clickOnTrigger(game, shockAttackActuator.getTrigger(formation2, true));
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
        when:
            var retreatActuator = getFormationRetreatActuator(game);
            clickOnTrigger(game, retreatActuator.getTrigger(0, false));
            loadAllImages();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showAdvanceTrigger(zoomAndRotate0(416.6667, 265.2859)));
            assertDirectives(actuatorsLayer, showAdvanceTrigger(zoomAndRotate60(491.6667, 308.5869)));
            assertNoMoreDirectives(actuatorsLayer);
        when:
            resetDirectives(actuatorsLayer, unitsLayer);
            var advanceActuator = getAdvanceActuator(game);
            clickOnTrigger(game, advanceActuator.getTrigger(0));
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 255.6635)));
            assertNoMoreDirectives(unitsLayer);
            assertNoMoreDirectives(actuatorsLayer, 4);
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
            rollFor(2,3);
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
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 351.8878)));
            assertDirectives(unitsLayer, showTroop("misc/unit2b", zoomAndRotate180(416.6667, 255.6635)));
            assertNoMoreDirectives(actuatorsLayer, 4);
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
            rollFor(2,3);
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
            skipDirectives(formationLayer, 4);
            assertDirectives(formationLayer, showFormation("misc/formation2b", zoomAndRotate210(458.3333, 279.7196)));
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
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFire(zoomAndRotate30(416.6667, 159.4391)));
            assertDirectives(actuatorsLayer, showFireAdvantage(1, zoomAndRotate0(436.217, 178.9895)));
        when:
            var fireAttackActuator = getFireAttackActuator(game);
        then:
            assert(fireAttackActuator.getTrigger(unit1)).isNotDefined();
            assert(fireAttackActuator.getTrigger(unit2)).isDefined();
    });

    it("Checks fire resolution appearance (and cancelling fire attack action)", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
            let fireAttackActuator = getFireAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit2));
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 92, 804, 174));
            assertDirectives(widgetsLayer, showInsert("fire-attack", 277, 458, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 752));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 627, 199));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
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
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 627, 199));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(527, 169));
        when:
            clickOnResult(game);
            loadAllImages();
            resetDirectives(actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(game.focusedUnit).equalsTo(unit2);
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showLossTrigger(zoomAndRotate0(416.6667, 159.4391)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate0(416.6667, 72.8372)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate60(491.6667, 116.1382)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate120(491.6667, 202.7401)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate240(341.6667, 202.7401)));
            assertDirectives(actuatorsLayer, showRetreatTrigger(zoomAndRotate300(341.6667, 116.1382)));
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
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 627, 207));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(527, 177));
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
            skipDirectives(markersLayer, 4);
            assertDirectives(markersLayer, showMarker("scarceamno", zoomAndRotate0(416.6667, 386.5897)));
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(451.3685, 317.186)));
    });

    function getFireHelpActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFireHelpActuator) return actuator;
        }
        return null;
    }

    it("Checks combat rules showing", () => {
        given:
            var { game, map, unit1, unit2 } = create2PlayersFireTinyGame();
            var [widgetsLayer, actuatorsLayer] = getLayers(game.board, "widgets", "actuators-0");
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            clickOnCounter(game, unit1);
            clickOnFireAttackAction(game);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFire(zoomAndRotate30(416.6667, 159.4391)));
            assertDirectives(actuatorsLayer, showFireAdvantage(5, zoomAndRotate0(436.217, 178.9895)));
        when:
            var fireHelpActuator = getFireHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, fireHelpActuator.getTrigger(unit2));
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("fire-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            assertDirectives(widgetsLayer, showInsertMark(75, 355));
            assertDirectives(widgetsLayer, showInsertMark(290, 355));
            assertDirectives(widgetsLayer, showInsertMark(20, 590));
            assertDirectives(widgetsLayer, showMultiInsert("weapon-table", 757, 427, 500, 500, [
                {xs:0, ys:237.05, xd:-250, yd:-250, w:86, h:500},
                {xs:272.5294, ys:237.05, xd:-164, yd:-250, w:414, h:500}
            ]));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks that a formation may fire attack twice", () => {
        given:
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).toward(60), 0);
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
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 627, 199));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(527, 169));
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
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFire(zoomAndRotate30(416.6667, 159.4391)));
    });

    it("Checks that a formation finishes attack action if there is no more unit to shock attack", () => {
            var { game, map, unit1, formation2, player2 } = create2PlayersTinyFormationGame();
            var [actuatorsLayer, widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-commands","widget-items"
            );
            game.currentPlayer = player2;
            formation2.angle = 330;
            formation2.move(map.getHex(5, 8).toward(60), 0);
            unit1.move(map.getHex(5, 6));
            unit1.takeALoss();
            unit1.angle = 180;
            clickOnCounter(game, formation2);
            clickOnFireAttackAction(game);
            let fireAttackActuator = getFireAttackActuator(game);
            clickOnTrigger(game, fireAttackActuator.getTrigger(unit1));
            loadAllImages();
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            let retreatActuator = getRetreatActuator(game);
            resetDirectives(actuatorsLayer)
            clickOnTrigger(game, retreatActuator.getLossTrigger()); // troop destryed !
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            assert(formation2.hasBeenActivated()).isTrue();
            assert(formation2.hasBeenPlayed()).isTrue();
            assert(game.focusedUnit).isNotDefined();
    });

    function clickOnShockDuelAction(game) {
        return clickOnActionMenu(game, 2, 1);
    }

    it("Checks shock duel appearance (and cancelling shock attack action)", () => {
        given:
            var { game, map, unit1, unit2, leader1, leader2 } = create2Players2Units2LeadersTinyGame();
            var [actuatorsLayer, widgetsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 7));
            leader1.move(unit1.hexLocation);
            leader2.move(unit2.hexLocation);
            clickOnCounter(game, leader1);
            clickOnShockDuelAction(game);
            loadAllImages();
            let shockAttackActuator = getShockAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, itemsLayer);
            clickOnTrigger(game, shockAttackActuator.getTrigger(leader2, true));
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 100, 804, 174));
            assertDirectives(widgetsLayer, showInsert("shock-attack", 277, 466, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 760));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 627, 207));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
    });

    function clickOnFireDuelAction(game) {
        return clickOnActionMenu(game, 3, 1);
    }

    it("Checks fire duel resolution appearance (and cancelling fire attack action)", () => {
        given:
            var { game, map, unit1, unit2, leader1, leader2 } = create2Players2Units2LeadersTinyGame();
            var [actuatorsLayer, widgetsLayer, itemsLayer] = getLayers(game.board,
                "actuators-0", "widgets", "widget-items"
            );
            unit1.move(map.getHex(5, 8));
            unit2.move(map.getHex(5, 6));
            leader1.move(unit1.hexLocation);
            leader2.move(unit2.hexLocation);
            clickOnCounter(game, leader1);
            clickOnFireDuelAction(game);
            loadAllImages();
            let fireAttackActuator = getFireAttackActuator(game);
        when:
            resetDirectives(actuatorsLayer, widgetsLayer, itemsLayer);
            clickOnTrigger(game, fireAttackActuator.getTrigger(leader2));
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 527, 92, 804, 174));
            assertDirectives(widgetsLayer, showInsert("fire-attack", 277, 458, 544, 658));
            assertDirectives(widgetsLayer, showInsertCommand("down", 277, 752));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 627, 199));
         when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
    });

});