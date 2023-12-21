'use strict'

import {
    assert,
    before, clean, describe, executeTimeouts, it
} from "../../jstest/jtest.js";
import {
    DAnimation,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    mockPlatform
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBAnimation,
    CBNextTurnSequenceElement,
    CBSequence, CBSequenceElement
} from "../../jslib/cblades/sequences.js";
import {
    CBBasicPlayer,
    CBGame
} from "../../jslib/cblades/playable.js";
import {
    CBMap
} from "../../jslib/cblades/map.js";
import {
    executeAllAnimations
} from "./interactive-tools.js";

export function createTinyGame() {
    let game = new CBGame("Game");
    var map = new CBMap([{path: "./../images/maps/map.png", col: 0, row: 0}]);
    game.setMap(map);
    game.start();
    return {game, map};
}

export class CBTestSequenceElement extends CBSequenceElement {

    constructor({id, game, data, type="test"}) {
        super({id, type, game});
        this.data = data;
    }

    equalsTo(element) {
        if (!super.equalsTo(element)) return false;
        if (this.data !== element.data) return false;
        return true;
    }

    _toString() {
        let result = super._toString();
        if (this.data !== undefined) result+=", Data: "+this.data;
        return result;
    }

    apply(startTick) {
        this._animation = new CBTestAnimation({ game:this.game, startTick, duration:this.delay });
        return this._animation;
    }

    get delay() {
        assert(super.delay).equalsTo(0);
        return 200;
    }

    _toSpecs(spec, context) {
        super._toSpecs(spec, context);
        spec.data = this.data;
    }

    _fromSpecs(spec, context) {
        super._fromSpecs(spec, context);
        this.data = spec.data;
    }

    static launch(playable, specs) {
        playable.specs = specs;
    }

}
CBSequence.register("test", CBTestSequenceElement);

export class CBTestAnimation extends CBAnimation {

    constructor({game, startTick, duration}) {
        super({game, startTick, duration});
        this.factor = 0;
    }

    _draw(count, ticks) {
        this.factor = this._factor(count);
        return super._draw(count, ticks);
    }

}

describe("Sequences", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks sequence overall behavior (not undoable)", () => {
        given:
            var {game} = createTinyGame();
            CBSequence.setCount(game, 0);
        when:
            var element1 = new CBTestSequenceElement({game, data:"d1"});
            var element2 = new CBTestSequenceElement({game, data:"d2"});
            CBSequence.addElement(game, element1);
            CBSequence.addElement(game, element2);
            var elements = CBSequence.getElements(game);
        then:
            assert(elements).arrayEqualsTo([element1, element2]);
        when:
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
            var {game} = createTinyGame();
            CBSequence.setCount(game, 0);
        when:
            var element1 = new CBTestSequenceElement({game, data:"d1"});
            var element2 = new CBTestSequenceElement({game, data:"d2"});
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
            var {game} = createTinyGame();
            CBSequence.setCount(game, 0);
        when:
            var element1 = new CBTestSequenceElement({game, data:"d1"});
            var element2 = new CBTestSequenceElement({game, data:"d2"});
            CBSequence.addElement(game, element1);
            CBSequence.addElement(game, element2);
            var finishReplay = false;
            CBSequence.getSequence(game).replay(0, ()=>{ finishReplay = true; });
            executeTimeouts();
        then:
            assert(element1._animation.factor).equalsTo(0);
            assert(element1._animation.game).equalsTo(game);
        when:
            executeTimeouts();
        then:
            assert(element1._animation.factor).equalsTo(0.1);
        when:
            executeAllAnimations();
        then:
            assert(element1._animation.factor).equalsTo(1);
            assert(finishReplay).isTrue();
    });

    it("Checks sequence toSpecs", () => {
        given:
            var {game} = createTinyGame();
            CBSequence.setCount(game, 0);
            var element = new CBTestSequenceElement({game, data:"d1"});
            CBSequence.addElement(game, element);
            CBSequence.getSequence(game).commit();
        when:
            var specs = CBSequence.getSequence(game).toSpecs();
        then:
            assert(specs).objectEqualsTo({
                "version":0,
                "game":"Game", "count":0,
                "elements":[{
                    "version":0,"type":"test","content":{"data":"d1"}}
                ]}
            );
    });

    it("Checks sequence fromSpecs", () => {
        given:
            var game = new CBGame("Game");
            var specs = {
                "version":0,
                "game":"Game", "count":0,
                "elements":[{
                    "version":0,"type":"test","content":{"data":"d1"}}
            ]};
        when:
            CBSequence.setCount(game, 0);
            var sequence = CBSequence.getSequence(game);
            var context = new Map();
            context.game = game;
            sequence.fromSpecs(specs, context);
            sequence.commit();
        then:
            assert(clean(sequence.toSpecs())).objectEqualsTo(specs);
    });

    it("Checks sequence fromSpecs", () => {
        then:
            assert(CBSequence.getLauncher("test")).isDefined();
            assert(CBSequence.getLauncher("next-turn")).isNotDefined();
    });
            /**
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
*/

    it("Checks next turn segment elements", () => {
        given:
            var {game} = createTinyGame();
            let player1 = new CBBasicPlayer("player1", "p1.png");
            game.addPlayer(player1);
            let player2 = new CBBasicPlayer("player2", "p2.png");
            game.addPlayer(player2);
            CBSequence.setCount(game, 0);
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
                type: "next-turn",
                game: new CBGame(2)
            })).isFalse();
            assert(element.equalsTo({
                type: "next-turn",
                game: game
            })).isTrue();
            assert(element.toString()).equalsTo(
                "{ Type: next-turn, Game: Game }"
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
            var {game} = createTinyGame();
        when:
            var element = new CBNextTurnSequenceElement({game});
            var model = {
                type: "next-turn",
                game: game
            }
        then:
            assert(element.equalsTo(model)).isTrue();
            assert(element.equalsTo({...model, type:"Other"})).isFalse();
            assert(element.equalsTo({...model, game:new CBGame(2)})).isFalse();
    });

});