'use strict'

import {
    after,
    assert, before, describe, it
} from "../../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../../jslib/board/draw.js";
import {
    assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../../jslib/board/mechanisms.js";
import {
    WAction, WStacking
} from "../../../jslib/wargame/game.js";
import {
    DBoard
} from "../../../jslib/board/board.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnPiece,
    clickOnDice,
    executeAllAnimations,
    clickOnResult,
    dummyEvent,
    clickOnMask,
    rollFor, showMask, showInsert, showDice, showPlayedDice, showSuccessResult, showInsertMark, showFailureResult
} from "../interactive-tools.js";
import {
    createTinyGame,
    create2UnitsTinyGame,
    create2PlayersTinyGame,
    create2Players2Units2LeadersTinyGame,
    create2Players4UnitsTinyGame
} from "../game-examples.js";
import {
    CBActionMenu,
    CBDefenderEngagementSequenceElement,
    CBFogIndicator,
    CBNeighborRoutCheckingSequenceElement,
    CBRootNeighborsCohesionSequenceElement,
    CBRoutCheckingSequenceElement,
    CBWeatherIndicator,
    CBWindDirectionIndicator,
    CBWingMoralIndicator,
    CBWingTirednessIndicator
} from "../../../jslib/cblades/interactive/interactive-player.js";
import {
    DIconMenuItem
} from "../../../jslib/board/widget.js";
import {
    Point2D
} from "../../../jslib/board/geometry.js";
import {
    CBCharge, CBCohesion, CBEngagingSequenceElement, CBFinishUnitSequenceElement, CBTiredness
} from "../../../jslib/cblades/unit.js";
import {
    WNextTurnSequenceElement,
    WSequence
} from "../../../jslib/wargame/sequences.js";

describe("Interactive Player", ()=> {

    var appendElement = WSequence.appendElement;

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
        WSequence.awaitedElements = [];
        WSequence.appendElement = function(game, element) {
            let awaited = WSequence.awaitedElements.shift();
            assert(element.toString()).equalsTo(awaited.toString());
        }
        CBActionMenu.menuBuilders = [
            function createTestActionMenuItems(unit, actions) {
                return [
                    new DIconMenuItem("./../images/icons/do-this.png", "./../images/icons/do-this-gray.png",
                        0, 0, () => {
                        return true;
                        }).setActive(true),
                    new DIconMenuItem("./../images/icons/do-that.png", "./../images/icons/do-that-gray.png",
                        1, 1, () => {
                        return false;
                        }).setActive(false)
                ];
            }
        ];
    });

    after(() => {
        CBActionMenu.menuBuilders = [];
        WSequence.appendElement = appendElement;
    });

    function clickOnDoThisAction(game) {
        return clickOnActionMenu(game, 0, 0);
    }

    function showMenu() {
        return [
            "save()",
                "setTransform(1, 0, 0, 1, 70, 70)",
                "shadowColor = #000000", "shadowBlur = 10",
                "strokeStyle = #000000", "lineWidth = 1",
                "strokeRect(-65, -65, 130, 130)",
                "fillStyle = #FFFFFF",
                "fillRect(-65, -65, 130, 130)",
            "restore()"
        ];
    }

    it("Checks that clicking on a unit select the unit and opens the action menu", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnPiece(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 361.6667, 296.8878)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -65, 130, 130)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -65, 130, 130)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(./../images/icons/do-that-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 266.8878)",
                    "drawImage(./../images/icons/do-this.png, -25, -25, 50, 50)",
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
            clickOnPiece(game, unit);
            loadAllImages();
        when:
            resetDirectives(widgetsLayer);
            Mechanisms.fire(game, DBoard.ZOOM_EVENT);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
        when:
            clickOnPiece(game, unit);
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
            assert(game.selectedPlayable).equalsTo(unit1);
        when:
            unit2.onMouseClick({offsetX:0, offsetY:0});  // Not executed ! Player2 is not the current player
        then:
            assert(game.selectedPlayable).equalsTo(unit1);
    });

    it("Checks that a selected unit's started/finished action is finalized when a new unit is selected", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            game.changeSelection(unit1, dummyEvent);
            var action = new WAction(game, unit1);
            unit1.launchAction(action);
            WSequence.awaitedElements.push(
                new CBFinishUnitSequenceElement({unit:unit1, game})
            );
            action.markAsFinished();
        when:
            game.changeSelection(unit2, dummyEvent);
        then:
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a selected unit's action that was never started, is cancelled when a new unit is selected", () => {
        given:
            var {game, unit1, unit2, player} = create2UnitsTinyGame();
            game.changeSelection(unit1, dummyEvent);
            var action = new WAction(game, unit1);
            unit1.launchAction(action);
        when:
            game.changeSelection(unit2, dummyEvent);
        then:
            assert(action.isCancelled()).isTrue();
            assert(unit1.action).isNotDefined();
    });

    it("Checks that a finalized unit action does not block selection/end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            game.changeSelection(unit, dummyEvent);
            unit.launchAction(new WAction(game, unit));
            WSequence.awaitedElements.push(
                new CBFinishUnitSequenceElement({unit, game})
            );
            unit.action.markAsFinished();
            unit.action.finalize();
            var finished = false;
            WSequence.awaitedElements.push(new WNextTurnSequenceElement({game}));
            player.finishTurn(()=>{finished=true;})
        then:
            assert(finished).isTrue();
    });

    it("Checks that activation remove own contact marker ", () => {
        given:
            var {game, map, unit1, player1} = create2PlayersTinyGame();
            WSequence.awaitedElements.push(
                new CBEngagingSequenceElement({game, unit:unit1}).setState({engaging:true})
            );
            unit1.hexLocation = map.getHex(5, 5);
            unit1.setEngaging(true);
        when:
            WSequence.awaitedElements.push(
                new CBEngagingSequenceElement({game, unit:unit1}).setState({engaging:false})
            );
            player1.selectPlayable(unit1, dummyEvent);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    function unit1IsEngagedByUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 4), 0);
        unit2.move(map.getHex(2, 3), 0);
        unit2.rotate(180);
        WSequence.awaitedElements.push(
            new CBEngagingSequenceElement({game:map.game, unit:unit2}).setState({engaging:true})
        );
        unit2.setEngaging(true);
        loadAllImages();
    }

    it("Checks defender engagement check appearance (and cancelling selection)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands", "widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(unit1, dummyEvent)
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
            WSequence.awaitedElements.push(
                new CBEngagingSequenceElement({game, unit:unit2}).setState({
                    engaging:true, tiredness:CBTiredness.NONE, charging:CBCharge.CHARGING
                })
            );
            unit2.setCharging(CBCharge.CHARGING);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(unit1, dummyEvent)
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
            WSequence.awaitedElements.push(
                new CBEngagingSequenceElement({game, unit:leader1}).setState({
                    engaging:false, charging:CBCharge.CHARGING
                })
            );
            leader1.setCharging(CBCharge.CHARGING);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(leader1, dummyEvent)
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
            player1.selectPlayable(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
            WSequence.awaitedElements.push(
                new CBDefenderEngagementSequenceElement({game, unit: unit1, dice: [1, 2]})
                    .setState({played:false, actionType: null, actionMode: null})
            );
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit failed to pass a defender engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit1IsEngagedByUnit2(map, unit1, unit2);
            player1.selectPlayable(unit1, dummyEvent)
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            WSequence.awaitedElements.push(
                new CBDefenderEngagementSequenceElement({game, unit: unit1, dice: [5, 6]})
                    .setState({played:false, actionType: null, actionMode: null, cohesion:CBCohesion.DISRUPTED})
            );
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo(showPlayedDice(5, 6, 549, 426.5));
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo(showFailureResult(449, 386.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

    function routedUnit1IsNearGoodOrderedUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 4), 0);
        unit1.rout();
        unit2.move(map.getHex(2, 3), 0);
        loadAllImages();
    }

    it("Checks appearance (and cancelling selection) of the cohesion test of an unrouted unit near a selected routed unit", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(unit11, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("lose-cohesion", 227, 384, 444, 330));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 199.5, 444, 389));
            assertDirectives(widgetsLayer, showInsertMark( 459, 122));
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 424));
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

    it("Checks that an unrouted unit near a selected routed unit, sucessfully pass the cohesion test", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
            player1.selectPlayable(unit11, dummyEvent)
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game)
            WSequence.awaitedElements.push(
                new CBRootNeighborsCohesionSequenceElement({unit:unit11, game, neighbors:[]}),
                new CBNeighborRoutCheckingSequenceElement({game, unit:unit12, dice:[1, 2], neighbors:[]})
                    .setState({cohesion: CBCohesion.GOOD_ORDER})
            );
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 424));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 384));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit12.isDisrupted()).isFalse();
    });

    it("Checks that an unrouted unit near a selected routed unit, unsucessfully pass the cohesion test", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
            player1.selectPlayable(unit11, dummyEvent)
            loadAllImages();
        when:
            WSequence.awaitedElements.push(
                new CBRootNeighborsCohesionSequenceElement({unit:unit11, game, neighbors:[]}),
                new CBNeighborRoutCheckingSequenceElement({game, unit:unit12, dice:[5, 6], neighbors:[]})
                    .setState({cohesion: CBCohesion.DISRUPTED})
            );
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 424));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 384));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit12.isDisrupted()).isTrue();
    });

    function routedUnit1IsNotNearAnyUnroutedUnit(map, unit1, unit2) {
        unit1.hexLocation = map.getHex(2, 4);
        unit1.rout();
        unit2.hexLocation = null;
        loadAllImages();
    }

    it("Checks that the selection of a routed unit not near any unrouted unit, does not trigger test cohesion", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNotNearAnyUnroutedUnit(map, unit11, unit12);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(unit11, dummyEvent);
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
    });

    it("Checks appearance (and cancelling selection) of the cohesion test of a selected unrouted unit near a routed unit", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.selectPlayable(unit12, dummyEvent)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("lose-cohesion", 227, 384, 444, 330));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 199.5, 444, 389));
            assertDirectives(widgetsLayer, showInsertMark( 459, 122));
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 424));
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

    it("Checks that a selected unrouted unit near a routed unit, sucessfully pass the cohesion test", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
            player1.selectPlayable(unit12, dummyEvent)
            loadAllImages();
        when:
            WSequence.awaitedElements.push(
                new CBRoutCheckingSequenceElement({game, unit:unit12, dice:[1, 2]})
            );
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 424));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 384));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit12.isDisrupted()).isFalse();
    });

    it("Checks that a selected unrouted unit near a routed unit, unsucessfully pass the cohesion test", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
            player1.selectPlayable(unit12, dummyEvent)
            loadAllImages();
        when:
            WSequence.awaitedElements.push(
                new CBRoutCheckingSequenceElement({game, unit:unit12, dice:[5, 6]})
                    .setState({cohesion: CBCohesion.DISRUPTED})
            );
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 424));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 384));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo(showMenu());
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit12.isDisrupted()).isTrue();
    });

    it("Checks cohesion test of a unit near a destroyed unit", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            routedUnit1IsNearGoodOrderedUnit2(map, unit11, unit12);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            player1.losePlayable(unit11)
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("lose-cohesion", 227, 384, 444, 330));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 199.5, 444, 389));
            assertDirectives(widgetsLayer, showInsertMark( 459, 122));
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 424));
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
        when:
            WSequence.awaitedElements.push(
                new CBRootNeighborsCohesionSequenceElement({game, unit:unit11, neighbors:[]}),
                new CBNeighborRoutCheckingSequenceElement({unit:unit12, game, dice:[1, 2], neighbors:[]})
            );
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnMask(game);
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks that the destruction of a unit not near any unrouted unit, does not trigger test cohesion", () => {
        given:
            var {game, map, player1, unit11, unit12} = create2Players4UnitsTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            routedUnit1IsNotNearAnyUnroutedUnit(map, unit11, unit12);
        when:
            player1.losePlayable(unit11);
            loadAllImages();
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks weather indicator appearance", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            let weather = game.arbitrator.getWeather(game);
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
                    "drawImage(./../images/inserts/meteo2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks fog indicator appearance", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            let fog = game.arbitrator.getFog(game);
            var fogIndicator = new CBFogIndicator(fog);
            loadAllImages();
        when:
            fogIndicator.open(game.board, new Point2D(0, 0));
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/inserts/fog1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks wind direction indicator appearance", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            let windDirection = game.arbitrator.getWindDirection(game);
            var windDirectionIndicator = new CBWindDirectionIndicator(windDirection);
            loadAllImages();
        when:
            windDirectionIndicator.open(game.board, new Point2D(0, 0));
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/inserts/wind-direction.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks tiredness indicator appearance", () => {
        given:
            var {game, wing} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            var tirednessIndicator = new CBWingTirednessIndicator(wing);
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
                    "drawImage(./../images/inserts/tiredness11.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 41, 0)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
    });

    it("Checks moral indicator appearance", () => {
        given:
            var {game, wing} = createTinyGame();
            var [widgetsLayer] = getLayers(game.board,"widgets");
            var moralIndicator = new CBWingMoralIndicator(wing);
            loadAllImages();
        when:
            moralIndicator.open(game.board, new Point2D(0, 0));
            resetDirectives(widgetsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/inserts/moral11.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 41, 0)",
                    "drawImage(./../units/banner.png, -25, -60, 50, 120)",
                "restore()"
            ]);
    });

    it("Checks that a selected unit's action is finalized when there is an end of turn", () => {
        given:
            var {game, unit, player} = createTinyGame();
            game.changeSelection(unit, dummyEvent);
            var action = new WAction(game, unit);
            unit.launchAction(action);
        when:

            WSequence.awaitedElements.push(
                new CBFinishUnitSequenceElement({unit, game}),
                new WNextTurnSequenceElement({game})
            );

            action.markAsFinished();
        then:
            assert(game.turnIsFinishable()).isTrue();
        when:
            var finished = false;
            player.finishTurn(()=>{})
        then:
            assert(action.isFinalized()).isTrue();
    });

    it("Checks that a player cannot finish their turn if a unit is not finishable", () => {
        given:
            var {game, unit1, player} = create2UnitsTinyGame();
        then:
            assert(player.canFinishPlayable(unit1)).isFalse();
            assert(game.turnIsFinishable()).isFalse();
    });

});