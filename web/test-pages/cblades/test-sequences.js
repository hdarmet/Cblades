'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    create1Player1Unit1FormationTinyGame,
    create1Player2UnitsTinyGame, createBaseGame,
    createTinyGame
} from "./game-examples.js";
import {
    CBStacking
} from "../../jslib/cblades/game.js";
import {
    CBMoveSequenceElement,
    CBNextTurnSequenceElement,
    CBReorientSequenceElement,
    CBRotateSequenceElement,
    CBSequence,
    CBStateSequenceElement,
    CBTurnSequenceElement
} from "../../jslib/cblades/sequences.js";
import {
    CBCharge, CBCohesion, CBMunitions, CBTiredness
} from "../../jslib/cblades/unit.js";
import {
    executeAllAnimations
} from "./interactive-tools.js";
import {
    CBGame
} from "../../jslib/cblades/playable.js";
import {
    CBInteractivePlayer
} from "../../jslib/cblades/interactive/interactive-player.js";

describe("Sequences", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks sequence overall behavior", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            var element1 = new CBStateSequenceElement(unit);
            var element2 = new CBStateSequenceElement(unit);
            CBSequence.addElement(game, element1);
            CBSequence.addElement(game, element2);
            CBSequence.getSequence(game).commit();
        then:
            assert(CBSequence.getSequence(game).validated).arrayEqualsTo([
                element1, element2
            ]);
            assert(CBSequence.getCount(game)).equalsTo(1);
            assert(CBSequence.getValidatedCount(game)).equalsTo(0);
        when:
            CBSequence.getSequence(game).acknowledge();
        then:
            assert(CBSequence.getSequence(game).validated).isNotDefined();
            assert(CBSequence.getValidatedCount(game)).isNotDefined();
    });

    it("Checks sequence undo/redo behavior", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            var element1 = new CBStateSequenceElement(unit);
            var element2 = new CBStateSequenceElement(unit);
            CBSequence.addElement(game, element1);
            Memento.open()
            CBSequence.appendElement(game, element2);
        then:
            assert(CBSequence.getSequence(game).elements).arrayEqualsTo([
                element1, element2
            ]);
        when:
            Memento.undo();
        then:
            assert(CBSequence.getSequence(game).elements).arrayEqualsTo([
                element1
            ]);
        when:
            Memento.redo();
        then:
            assert(CBSequence.getSequence(game).elements).arrayEqualsTo([
                element1, element2
            ]);
    });

    it("Checks replay behavior", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            var element1 = new CBStateSequenceElement(unit).setState({ cohesion:CBCohesion.DISRUPTED });
            var element2 = new CBStateSequenceElement(unit).setState({ cohesion:CBCohesion.GOOD_ORDER, tiredness:CBTiredness.TIRED });
            CBSequence.addElement(game, element1);
            CBSequence.addElement(game, element2);
            var finishReplay = false;
            CBSequence.getSequence(game).replay(()=>{ finishReplay = true; });
            executeAllAnimations();
        then:
            assert(unit.cohesion).equalsTo(CBCohesion.GOOD_ORDER);
            assert(unit.tiredness).equalsTo(CBTiredness.TIRED);
            assert(finishReplay).isTrue();
    });

    it("Checks that a replay animations cancel any running animation on the targeted unit", () => {
        given:
            var {game, unit} = createTinyGame();
            var cancelled = false;
            unit._animation = {
                cancel: function () {
                    cancelled = true;
                }
            }
        when:
            var element1 = new CBStateSequenceElement(unit).setState({ cohesion:CBCohesion.DISRUPTED });
            CBSequence.addElement(game, element1);
            CBSequence.getSequence(game).replay();
            executeAllAnimations();
        then:
            assert(cancelled).isTrue();
    });

    it("Checks unit state segment elements", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            CBSequence.appendElement(game, new CBStateSequenceElement(unit));
            CBSequence.appendElement(game, new CBStateSequenceElement(unit).setState({
                cohesion: CBCohesion.DISRUPTED,
                tiredness: CBTiredness.TIRED,
                munitions: CBMunitions.EXHAUSTED,
                charging: CBCharge.CAN_CHARGE,
                engaging: true,
                orderGiven: true,
                played: true
            }));
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element).objectEqualsTo({
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false
            });
            element = CBSequence.getElements(game)[1];
            assert(element.equalsTo({
                type: "State",
                unit: unit,
                cohesion: CBCohesion.DISRUPTED,
                tiredness: CBTiredness.TIRED,
                munitions: CBMunitions.EXHAUSTED,
                charging: CBCharge.CAN_CHARGE,
                engaging: true,
                orderGiven: true,
                played: true
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: State, Unit: banner-0, Cohesion: 1, Tiredness: 1, Munitions: 2," +
                " Charging: 2, Engaging: true, OrderGiven: true, Played: true }"
            );
            assert(element.delay).equalsTo(0);
            assert(element.getUnit()).equalsTo(unit);
        when:
            var animation = element.apply(0);
            executeAllAnimations();
        then:
            assert(unit.cohesion).equalsTo(CBCohesion.DISRUPTED);
            assert(unit.tiredness).equalsTo(CBTiredness.TIRED);
            assert(unit.munitions).equalsTo(CBMunitions.EXHAUSTED);
            assert(unit.charge).equalsTo(CBCharge.CAN_CHARGE);
            assert(unit.isEngaging()).isTrue();
            assert(unit.hasReceivedOrder()).isTrue();
            assert(unit.isPlayed()).isTrue();
    });

    it("Checks unit state segment equalsTo method", () => {
        given:
            var {unit11, unit12} = create1Player2UnitsTinyGame();
        when:
            var element = new CBStateSequenceElement(unit11);
            var model = {
                type: "State",
                unit: unit11,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, unit:unit12})).isFalse();
            assert(element.equalsTo({...model, cohesion:CBCohesion.DISRUPTED})).isFalse();
            assert(element.equalsTo({...model, tiredness:CBTiredness.TIRED})).isFalse();
            assert(element.equalsTo({...model, munitions:CBMunitions.SCARCE})).isFalse();
            assert(element.equalsTo({...model, charging:CBCharge.CAN_CHARGE})).isFalse();
            assert(element.equalsTo({...model, engaging:true})).isFalse();
            assert(element.equalsTo({...model, orderGiven:true})).isFalse();
            assert(element.equalsTo({...model, played:true})).isFalse();
    });

    it("Checks unit movement segment elements", () => {
        given:
            var {game, unit11, unit12} = create1Player2UnitsTinyGame();
        when:
            var targetLocation = unit12.hexLocation.getNearHex(0);
            unit12.hexLocation = targetLocation;
            CBSequence.appendElement(game, new CBMoveSequenceElement(unit11, targetLocation, CBStacking.BOTTOM));
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element.equalsTo({
                type: "Move",
                unit: unit11,
                hexLocation: targetLocation,
                stacking: CBStacking.BOTTOM
            })).isFalse();
            assert(element.equalsTo({
                type: "Move",
                unit: unit11,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false,
                hexLocation: targetLocation,
                stacking: CBStacking.BOTTOM
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: Move, Unit: banner1-0, Cohesion: 0, Tiredness: 0, Munitions: 0," +
                " Charging: 0, Engaging: false, OrderGiven: false, Played: false," +
                " HexLocation: point(0, -196.875), Stacking: 0 }"
            );
            assert(element.delay).equalsTo(500);
        when:
            element.apply(0);
            executeAllAnimations();
        then:
            assert(unit11.hexLocation).equalsTo(targetLocation);
            assert(targetLocation.units).arrayEqualsTo([unit11, unit12]);
    });

    it("Checks unit move segment equalsTo method", () => {
        given:
            var {unit11, unit12} = create1Player2UnitsTinyGame();
        when:
            var targetLocation = unit12.hexLocation.getNearHex(0);
            unit12.hexLocation = targetLocation;
            var element = new CBMoveSequenceElement(unit11, targetLocation, CBStacking.BOTTOM);
            var model = {
                type: "Move",
                unit: unit11,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false,
                hexLocation: targetLocation,
                stacking: CBStacking.BOTTOM
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, hexLocation:unit11.hexLocation})).isFalse();
            assert(element.equalsTo({...model, stacking:CBStacking.TOP})).isFalse();
    });

    it("Checks unit rotation segment elements", () => {
        given:
            var {game, unit11} = create1Player2UnitsTinyGame();
        when:
            CBSequence.appendElement(game, new CBRotateSequenceElement(unit11, 60));
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element.equalsTo({
                type: "Rotate",
                unit: unit11,
                angle: 60
            })).isFalse();
            assert(element.equalsTo({
                type: "Rotate",
                unit: unit11,
                angle: 60,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: Rotate, Unit: banner1-0, Cohesion: 0, Tiredness: 0, Munitions: 0," +
                " Charging: 0, Engaging: false, OrderGiven: false, Played: false," +
                " Angle: 60 }"
            );
            assert(element.delay).equalsTo(500);
        when:
            element.apply(0);
            executeAllAnimations();
        then:
            assert(unit11.angle).equalsTo(60);
    });

    it("Checks unit rotation segment equalsTo method", () => {
        given:
            var {unit11, unit12} = create1Player2UnitsTinyGame();
        when:
            var element = new CBRotateSequenceElement(unit11, 60);
            var model = {
                type: "Rotate",
                unit: unit11,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false,
                angle: 60
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, angle:120})).isFalse();
    });

    it("Checks unit reorientation segment elements", () => {
        given:
            var {game, unit11} = create1Player2UnitsTinyGame();
        when:
            CBSequence.appendElement(game, new CBReorientSequenceElement(unit11, 60));
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element.equalsTo({
                type: "Reorient",
                unit: unit11,
                angle: 60
            })).isFalse();
            assert(element.equalsTo({
                type: "Reorient",
                unit: unit11,
                angle: 60,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: Reorient, Unit: banner1-0, Cohesion: 0, Tiredness: 0, Munitions: 0," +
                " Charging: 0, Engaging: false, OrderGiven: false, Played: false," +
                " Angle: 60 }"
            );
            assert(element.delay).equalsTo(500);
        when:
            element.apply(0);
            executeAllAnimations();
        then:
            assert(unit11.angle).equalsTo(60);
    });

    it("Checks unit reorientation segment equalsTo method", () => {
        given:
            var {unit11} = create1Player2UnitsTinyGame();
        when:
            var element = new CBReorientSequenceElement(unit11, 60);
            var model = {
                type: "Reorient",
                unit: unit11,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false,
                angle: 60
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, angle:120})).isFalse();
    });

    it("Checks formation turn segment elements", () => {
        given:
            var {game, unit11, formation1} = create1Player1Unit1FormationTinyGame();
        when:
            var targetLocation = formation1.hexLocation.getFaceHex(90);
            var hexSide = formation1.hexLocation.turnTo(60);
            unit11.hexLocation = targetLocation;
            CBSequence.appendElement(
                game, new CBTurnSequenceElement(formation1, 30, hexSide, CBStacking.TOP)
            );
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element.equalsTo({
                type: "Turn",
                unit: formation1,
                angle: 30
            })).isFalse();
            assert(element.equalsTo({
                type: "Turn",
                unit: formation1,
                angle: 30,
                hexLocation: hexSide,
                stacking: CBStacking.TOP,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: Turn, Unit: banner1-1, Cohesion: 0, Tiredness: 0, Munitions: 0," +
                " Charging: 0, Engaging: false, OrderGiven: false, Played: false," +
                " HexLocation: point(85.25, -147.6562), Stacking: 1, Angle: 30 }"
            );
            assert(element.delay).equalsTo(500);
        when:
            element.apply(0);
            executeAllAnimations();
        then:
            assert(formation1.angle).equalsTo(30);
            assert(formation1.hexLocation).equalsTo(hexSide);
            assert(targetLocation.units).arrayEqualsTo([unit11, formation1]);
    });

    it("Checks unit turn segment equalsTo method", () => {
        given:
            var {formation1} = create1Player1Unit1FormationTinyGame();
        when:
            var targetLocation = formation1.hexLocation.turnTo(60);
            var element = new CBTurnSequenceElement(formation1, 60, targetLocation, CBStacking.BOTTOM);
            var model = {
                type: "Turn",
                unit: formation1,
                cohesion: CBCohesion.GOOD_ORDER,
                tiredness: CBTiredness.NONE,
                munitions: CBMunitions.NONE,
                charging: CBCharge.NONE,
                engaging: false,
                orderGiven: false,
                played: false,
                hexLocation: targetLocation,
                stacking: CBStacking.BOTTOM,
                angle: 60
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, hexLocation:formation1.hexLocation})).isFalse();
            assert(element.equalsTo({...model, stacking:CBStacking.TOP})).isFalse();
            assert(element.equalsTo({...model, angle:120})).isFalse();
    });

    it("Checks next turn segment elements", () => {
        given:
            var {game} = createBaseGame();
            let player1 = new CBInteractivePlayer("player1");
            game.addPlayer(player1);
            let player2 = new CBInteractivePlayer("player2");
            game.addPlayer(player2);
            var turnAnimation= false;
            game._endOfTurnCommand = {
                animation() {turnAnimation = true;}
            }
        when:
            CBSequence.appendElement(
                game, new CBNextTurnSequenceElement(game)
            );
        then:
            var element = CBSequence.getElements(game)[0];
            assert(element.equalsTo({
                type: "NextTurn",
                game: new CBGame("OtherGame")
            })).isFalse();
            assert(element.equalsTo({
                type: "NextTurn",
                game: game
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: NextTurn, Game: Game }"
            );
            assert(element.delay).equalsTo(500);
        when:
            element.apply(0);
            executeAllAnimations();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(turnAnimation).isTrue();
    });

    it("Checks next turn segment equalsTo method", () => {
        given:
            var {game} = createBaseGame();
        when:
            var element = new CBNextTurnSequenceElement(game);
            var model = {
                type: "NextTurn",
                game: game
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, game:new CBGame("OtherGame")})).isFalse();
    });

});