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
    assertDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBAction
} from "../../jslib/cblades/game.js";
import {
    DBoard
} from "../../jslib/board.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnCounter,
    clickOnDice,
    executeAllAnimations,
    clickOnResult,
    dummyEvent,
    clickOnMask,
    rollFor, showMask, showInsert, showDice, showPlayedDice, showSuccessResult, showMarker, showInsertMark
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame,
    create2PlayersTinyGame, create2Players4UnitsTinyGame, create2Players2Units2LeadersTinyGame
} from "./game-examples.js";
import {
    CBActionMenu, CBWeatherIndicator, CBWingTirednessIndicator
} from "../../jslib/cblades/interactive-player.js";
import {
    DIconMenuItem
} from "../../jslib/widget.js";
import {
    Point2D
} from "../../jslib/geometry.js";
import {
    CBCharge
} from "../../jslib/cblades/unit.js";

describe("Interactive Player", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
        CBActionMenu.menuBuilders = [
            function createTestActionMenuItems(unit, actions) {
                return [
                    new DIconMenuItem("/CBlades/images/icons/do-this.png", "/CBlades/images/icons/do-this-gray.png",
                        0, 0, () => {
                        return true;
                        }).setActive(true),
                    new DIconMenuItem("/CBlades/images/icons/do-that.png", "/CBlades/images/icons/do-that-gray.png",
                        1, 1, () => {
                        return false;
                        }).setActive(false)
                ];
            }
        ];
    });

    after(() => {
        CBActionMenu.menuBuilders = [];
    });

    function clickOnDoThisAction(game) {
        return clickOnActionMenu(game, 0, 0);
    }

    it("Checks that clicking on a unit select the unit and opens the action menu", () => {
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
                    "setTransform(1, 0, 0, 1, 361.6667, 296.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/do-that-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 266.8878)",
                    "drawImage(/CBlades/images/icons/do-this.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnDoThisAction(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that global events close action menu", () => {
        given:
            var {game, unit} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            Mechanisms.fire(game, DBoard.ZOOM_EVENT);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
        when:
            clickOnCounter(game, unit);
            resetDirectives(widgetsLayer);
            Mechanisms.fire(game, DBoard.SCROLL_EVENT);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that a unit cannot be selected if it not belongs to the current player", () => {
        given:
            var {game, unit1, player1, unit2} = create2PlayersTinyGame();
            unit1.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            unit2.onMouseClick({offsetX:0, offsetY:0});
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit2.onMouseClick({offsetX:0, offsetY:0});  // Not executed ! Player2 is not the current player
        then:
            assert(game.selectedUnit).equalsTo(unit1);
    });

    it("Checks that a selected unit's action is finalized when there is an end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            player.changeSelection(unit, dummyEvent);
            var action = new CBAction(game, unit);
            unit.launchAction(action);
            action.markAsFinished();
        then:
            assert(game.turnIsFinishable()).isTrue();
        when:
            var finished = false;
            player.finishTurn(()=>{})
        then:
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a selected unit's started/finished action is finalized when a new unit is selected", () => {
        given:
            var {game, unit1, unit2, player} = create2UnitsTinyGame();
            player.changeSelection(unit1, dummyEvent);
            var action = new CBAction(game, unit1);
            unit1.launchAction(action);
            action.markAsFinished();
        when:
            player.changeSelection(unit2, dummyEvent);
        then:
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a selected unit's action that was never started, is cancelled when a new unit is selected", () => {
        given:
            var {game, unit1, unit2, player} = create2UnitsTinyGame();
            player.changeSelection(unit1, dummyEvent);
            var action = new CBAction(game, unit1);
            unit1.launchAction(action);
        when:
            player.changeSelection(unit2, dummyEvent);
        then:
            assert(action.isCancelled()).isTrue();
            assert(unit1.action).isNotDefined();
    });

    it("Checks that a finalized unit action does not block selection/end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            player.changeSelection(unit, dummyEvent);
            unit.launchAction(new CBAction(game, unit));
            unit.action.markAsFinished();
            unit.action.finalize();
            var finished = false;
            player.finishTurn(()=>{finished=true;})
        then:
            assert(finished).isTrue();
    });

    it("Checks that a player cannot finish their turn if a unit is not finishable", () => {
        given:
            var {game, unit1, player} = create2UnitsTinyGame();
            var finished = false;
        then:
            assert(player.canFinishUnit(unit1)).isFalse();
            assert(game.turnIsFinishable()).isFalse();
    });

    it("Checks that activation remove own contact marker ", () => {
        given:
            var {game, map, player1, unit1} = create2PlayersTinyGame();
            unit1.hexLocation = map.getHex(5, 5);
            unit1.markAsEngaging(true);
        when:
            player1.selectUnit(unit1, dummyEvent);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    function unit1IsEngagedByUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 4), 0);
        unit2.move(map.getHex(2, 3), 0);
        unit2.rotate(180);
        unit2.markAsEngaging(true);
        loadAllImages();
    }

    it("Checks defender engagement check appearance (and cancelling selection)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-defender-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 426.5));
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks marks on defender engagement insert (first case)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1.disrupt();
            unit1.angle = 90;
            unit1IsEngagedByUnit2(map, unit1, unit2);
            unit2.markAsCharging(CBCharge.CHARGING);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-defender-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsertMark( 20, 510));
            assertDirectives(widgetsLayer, showInsertMark( 20, 528));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            assertDirectives(widgetsLayer, showInsertMark( 459, 124.5)); // Mark for base moral level
            assertDirectives(widgetsLayer, showInsertMark(459, 232.5)); // Mark for disruption
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 426.5));
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks marks on defender engagement insert (second case)", () => {
        given:
            var {game, map, player1, leader1, leader2} = create2Players2Units2LeadersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, leader1, leader2);
            leader1.angle = 180;
            leader1.markAsCharging(CBCharge.CHARGING);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectUnit(leader1, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-defender-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsertMark( 20, 425));
            assertDirectives(widgetsLayer, showInsertMark( 20, 442));
            assertDirectives(widgetsLayer, showInsertMark( 20, 460));
            assertDirectives(widgetsLayer, showInsertMark( 20, 546));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            assertDirectives(widgetsLayer, showInsertMark( 459, 124.5)); // Mark for base moral level
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 426.5));
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectUnit(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 426.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 386.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 70, 70)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isFalse();
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
                    "setTransform(1, 0, 0, 1, 70, 70)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

    it("Checks weather indicator appearance", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            let weather = game.arbitrator.getWeather();
            var weatherIndicator = new CBWeatherIndicator(weather);
            loadAllImages();
        when:
            weatherIndicator.open(game.board, new Point2D(0, 0));
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/meteo2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks tiredness indicator appearance", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            var tirednessIndicator = new CBWingTirednessIndicator(8);
            loadAllImages();
        when:
            tirednessIndicator.open(game.board, new Point2D(0, 0));
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/tiredness8.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

});