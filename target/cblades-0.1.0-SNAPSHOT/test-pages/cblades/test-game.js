'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertDirectives, assertNoMoreDirectives, assertClearDirectives,
    createEvent,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBMap,
    CBAbstractMap,
    CBHexSideId
} from "../../jslib/cblades/map.js";
import {
    BelongsToPlayerMixin, CBCounterDisplay,
    CBPiece,
    CBStacking, DisplayLocatableMixin, HexLocatableMixin, PlayableMixin
} from "../../jslib/cblades/game.js";
import {
    CBAbstractGame,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBAction,
    CBPieceImageArtifact,
    CBActuator
} from "../../jslib/cblades/game.js";
import {
    DBoard, DElement, DImageArtifact, DSimpleLevel, DStaticLevel
} from "../../jslib/board.js";
import {
    Dimension2D,
    Point2D
} from "../../jslib/geometry.js";
import {
    DMask,
    DPopup, DPushButton
} from "../../jslib/widget.js";
import {
    paint,
    repaint,
    showTroop,
    zoomAndRotate0,
    showMap, showMask, executeAllAnimations
} from "./interactive-tools.js";

class CBTestGame extends CBAbstractGame {

    constructor() {
        super(1, [
            new DSimpleLevel("map"),
            new DSimpleLevel("grounds"),
            new DSimpleLevel("units"),
            new DSimpleLevel("actuators"),
            new DStaticLevel("counters"),
            new DStaticLevel("counter-markers"),
            new DStaticLevel("widgets"),
            new DStaticLevel("widget-commands")
        ]);
    }

}

class CBTestPlayer extends CBAbstractPlayer {

    constructor(...args) {
        super(...args);
        this.launched = 0;
        this.actionClass = CBAction;
    }

    setAction(actionClass) {
        this.actionClass = actionClass;
    }

    launchPlayableAction(playable, point) {
        if (this.actionClass) {
            playable.launchAction(new this.actionClass(this.game, playable));
        }
        this.launched++;
        super.launchPlayableAction(playable, point);
    }

}

function showFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
        `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
        "shadowColor = #000000", "shadowBlur = 10",
        `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

function showFakeInsert(x, y, w, h) {
    return [
        "save()",
        `setTransform(1, 0, 0, 1, ${x}, ${y})`,
        "shadowColor = #000000", "shadowBlur = 10",
        "strokeStyle = #000000", "lineWidth = 1",
        `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "fillStyle = #FFFFFF",
        `fillRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

class CBTestActuatorTrigger extends DImageArtifact {

    constructor(actuator, levelName, image, position, dimension) {
        super(levelName, image, position, dimension);
        this.actuator = actuator;
    }

}

class CBTestActuator extends CBActuator {

    constructor() {
        super();
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new CBTestActuatorTrigger(this, "actuators", image,
            new Point2D(0, 0), new Dimension2D(50, 50));
        this.trigger.position = new Point2D(0, 0);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    getTrigger() {
        return this.findTrigger(artifact=>true);
    }

    failToGetTrigger() {
        return this.findTrigger(artifact=>false);
    }

    onMouseClick(artifact, event) {
        this.clicked = artifact;
    }

    setVisibility(level) {
        super.setVisibility(level);
    }

}

class TestPlayableArtifact extends CBPieceImageArtifact {

    get slot() {
        return this.piece.slot;
    }

    get layer() {
        return 4; // Layer "unit-"
    }

    _select() {}

    _unselect() {}

    onMouseClick(event) {
        this.piece.onMouseClick(event);
        return true;
    }

}

class CBTestPlayable extends HexLocatableMixin(PlayableMixin(CBPiece)) {

    constructor(layerName, paths, dimension = new Dimension2D(142, 142)) {
        super(layerName, paths, dimension);
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableArtifact(this, levelName, images, position, dimension);
    }

    play(point) {
        this.played = point;
    }

    get slot() {
        return this.hexLocation.playables.indexOf(this);
    }

}

class CBTestBelongsToPlayerPlayable extends BelongsToPlayerMixin(CBTestPlayable) {

    constructor(layerName, player, paths, dimension = new Dimension2D(142, 142)) {
        super(layerName, paths, dimension);
        this.player = player;
    }

    _updatePlayed() {
        this.updated = true;
    }

}

class CBTestDisplayPlayable extends DisplayLocatableMixin(PlayableMixin(CBPiece)) {

    constructor(layerName, paths, dimension = new Dimension2D(142, 142)) {
        super(layerName, paths, dimension);
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableArtifact(this, levelName, images, position, dimension);
    }

    play() {
        this.launchAction(new CBAction(this.game, this));
    }

}

function createBasicGame() {
    var game = new CBTestGame();
    var arbitrator = new CBAbstractArbitrator();
    game.setArbitrator(arbitrator);
    var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    game.start();
    loadAllImages();
    return { game, arbitrator, map };
}

function createTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new CBTestPlayer("player1");
    game.addPlayer(player);
    let playable = new CBTestBelongsToPlayerPlayable("units", player, ["./../images/units/misc/unit.png"]);
    playable.addToMap(map.getHex(5, 8));
    repaint(game);
    loadAllImages();
    return { game, arbitrator, player, map, playable };
}

function createSmallGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new CBTestPlayer("player1");
    game.addPlayer(player);
    let playable1 = new CBTestPlayable("units", ["./../images/units/misc/unit.png"]);
    let playable2 = new CBTestPlayable("units", ["./../images/units/misc/unit.png"]);
    playable1.addToMap(map.getHex(5, 8));
    playable2.addToMap(map.getHex(5, 9));
    repaint(game);
    loadAllImages();
    return { game, arbitrator, map, playable1, playable2 };
}

function create2PlayersTinyGame() {
    var { game, map } = createBasicGame();
    let player1 = new CBTestPlayer("player1", "./players/player1.png");
    game.addPlayer(player1);
    let player2 = new CBTestPlayer("player2", "./players/player2.png");
    game.addPlayer(player2);
    let playable0 = new CBTestBelongsToPlayerPlayable("units", player1, ["./../images/units/misc/unit0.png"]);
    playable0.addToMap(map.getHex(5, 8));
    let playable1 = new CBTestBelongsToPlayerPlayable("units", player1, ["./../images/units/misc/unit1.png"]);
    playable1.addToMap(map.getHex(5, 8));
    let playable2 = new CBTestBelongsToPlayerPlayable("units", player2, ["./../images/units/misc/unit2.png"]);
    playable2.addToMap(map.getHex(5, 7));
    game.start();
    loadAllImages();
    return {game, map, playable0, playable1, playable2, player1, player2};
}

function create2PiecesTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new CBTestPlayer("player1");
    game.addPlayer(player);
    let playable1 = new CBTestBelongsToPlayerPlayable("units", player,["./../images/units/misc/unit1.png"]);
    playable1.addToMap(map.getHex(5, 6));
    let playable2 = new CBTestBelongsToPlayerPlayable("units", player,["./../images/units/misc/unit2.png"]);
    playable2.addToMap(map.getHex(5, 7));
    repaint(game);
    loadAllImages();
    return {game, map, arbitrator, playable1, playable2, player};
}

function createDisplayTinyGame() {
    var { game, map } = createBasicGame();
    let player = new CBTestPlayer("player1");
    game.addPlayer(player);
    let display0 = new CBTestDisplayPlayable("counters", ["./../images/units/misc/display0.png"]);
    display0.setOnGame(game);
    let display1 = new CBTestDisplayPlayable("counters", ["./../images/units/misc/display1.png"]);
    display1.setOnGame(game);
    game.start();
    loadAllImages();
    return {game, map, display0, display1, player};
}

export function showActuatorTrigger(image, w, h, [a, b, c, d, e, f]) {
    return [
        "save()",
        `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
        `drawImage(./../images/actuators/${image}.png, -${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ]
}

let dummyEvent = {offsetX:0, offsetY:0};

describe("Game", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        DAnimator.clear();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks game building", () => {
        given:
            var {game, map, player, arbitrator} = createTinyGame();
            var [mapLayer, unitsLayer] = getLayers(game.board, "map", "units");
        when:
            loadAllImages();
        then:
            assert(game.board).is(DBoard);
            assert(game.board.game).equalsTo(game);
            assert(arbitrator.game).equalsTo(game);
            assert(game.arbitrator).equalsTo(arbitrator);
            assert(game.map).equalsTo(map);
            assert(player.game).equalsTo(game);
            assert(game.getPlayer("player1")).equalsTo(player);
            assert(game.getPlayer("unknown")).isNotDefined();
            assert(game.currentPlayer).equalsTo(player);
            assert(game.viewportCenter.toString()).equalsTo("point(500, 400)");
            assertClearDirectives(mapLayer);
            assertDirectives(mapLayer, showMap("map", zoomAndRotate0(500, 400)));
            assertNoMoreDirectives(mapLayer);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
    });

    it("Checks game edition", () => {
        given:
            var {game} = createTinyGame();
            var [mapLayer] = getLayers(game.board, "map", "units");
            loadAllImages();
        when:
            var newMap = new CBMap([{path:"./../images/maps/newmap.png", col:0, row:0}]);
            game.changeMap(newMap);
            repaint(game);
        then:
            assertClearDirectives(mapLayer);
            assertDirectives(mapLayer, showMap("newmap", zoomAndRotate0(500, 400)));
        when:
            var player1 = new CBTestPlayer("Hector", "./players/hector.png");
            var player2 = new CBTestPlayer("Achilles", "./players/achilles.png");
            game.setPlayers([player1, player2]);
        then:
            assert(game.players).arrayEqualsTo([player1, player2]);
    });

    it("Checks game fitting on window", () => {
        given:
            var {game} = createTinyGame();
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units");
        when:
            resetDirectives(mapLayer, unitsLayer);
            game.fitWindow();
            loadAllImages();
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.7331, 0, 0, 0.7331, 750, 500)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.7331, 0, 0, 0.7331, 625, 427.8317)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks playable basic features", () => {
        given:
            var {game, playable1, playable2} = createSmallGame();
        when:
            playable1.select();
        then:
            assert(game.selectedPlayable).equalsTo(playable1);
        when:
            clickOnPiece(game, playable2);
        then:
            assert(game.selectedPlayable).equalsTo(playable2);
        when:
            playable2.unselect();
        then:
            assert(game.selectedPlayable).isNotDefined();
    });

    it("Checks player basic features", () => {
        given:
            var {game, player1, player2} = create2PlayersTinyGame();
        then:
            assert(game.players).unorderedArrayEqualsTo([player1, player2]);
            assert(player1.name).equalsTo("player1");
            assert(player1.path).equalsTo("./players/player1.png");
            assert(player1._memento()).isDefined();
            assert(player1._revert({}));
            assert(player1.canFinishPlayable({})).isTrue();
        when:
            player1.setIdentity({
                name: "Hector",
                path: "./players/hector.png"
            });
        then:
            assert(player1.identity).objectEqualsTo({
                name: "Hector",
                path: "./players/hector.png"
            });
            assert(player1.name).equalsTo("Hector");
            assert(player1.path).equalsTo("./players/hector.png");
        when:
            var init = false;
            player1._init = function() { init = true;};
            player1.clean();
        then:
            assert(init).isTrue();
        when:
            init = false;
            player1.cancel();
        then:
            assert(init).isTrue();
    });

    it("Checks that playing a playable is finishing its action", () => {
        given:
            var {game, playable} = createTinyGame();
        when:
            playable.action = new CBAction(game, playable);
            playable.action.status = CBAction.FINISHED;
        then:
            assert(playable.isPlayed()).isTrue();
        when:
            playable.action = new CBAction(game, playable);
            playable.played = true;
        then:
            assert(playable.action.status).equalsTo(CBAction.FINISHED);
        when:
            delete playable._action;
        then:
            assert(playable.isPlayed()).isFalse();
        when:
            playable.played = true;
        then:
            assert(playable.isPlayed()).isTrue();
    });

    it("Checks that playable may be marked playable without defining an action", () => {
        given:
            var {game, playable} = createTinyGame();
        when:
            playable.played = true;
        then:
            assert(playable.isPlayed()).isTrue();
        when:
            playable.played = false;
        then:
            assert(playable.isPlayed()).isFalse();
    });

    it("Checks game commands", () => {
        given:
            var {game} = createTinyGame();
            var [commandsLevel] = getLayers(game.board, "widget-commands");
            var flip = true;
            game._flipCommand = new DPushButton(
                "./../images/commands/flip-command.png", "./../images/commands/flip-command-inactive.png",
                new Point2D(-60, -60), animation=>{
                    flip = false;
                    game.hideCommand(game._flipCommand);
                    game.showCommand(game._flopCommand);
                    animation();
                });
            game._flopCommand = new DPushButton(
                "./../images/commands/flop-command.png", "./../images/commands/flop-command-inactive.png",
                new Point2D(-60, -60), animation=>{});
            game.showCommand(game._flipCommand);
            repaint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 940, 740)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/flip-command.png, -25, -25, 50, 50)',
                'restore()'
            ]);
            assert(flip).isTrue();
        when:
            game._flipCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 940, 740)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/flop-command.png, -25, -25, 50, 50)',
                'restore()'
            ]);
            assert(flip).isFalse();
        when:
            resetDirectives(commandsLevel);
            game.board._draw.setSize(new Dimension2D(1000, 1000));
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(1, 0, 0, 1, 940, 940)',
                    'shadowColor = #00FFFF', 'shadowBlur = 10',
                    'drawImage(./../images/commands/flop-command.png, -25, -25, 50, 50)',
                'restore()'
            ]);
    });

    it("Checks action launch during selection (and automatic finalization when a started playable is unselected)", () => {
        given:
            var {game, playable1, playable2, player} = create2PiecesTinyGame();
        when:
            clickOnPiece(game, playable1);
        then:
            assert(player.launched).equalsTo(1);
            assert(playable1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, playable1);
        then:
            assert(player.launched).equalsTo(2);
            assert(playable1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, playable2);
        then: // playable1 is not "played" because the action was not started
            assert(player.launched).equalsTo(3);
            assert(playable1.isPlayed()).isFalse();
        when:
            playable2.action.markAsStarted();
            clickOnPiece(game, playable1);
        then: // playable2 has not played because the action was not started
            assert(player.launched).equalsTo(4);
            assert(playable2.isPlayed()).isTrue();
        when:
            clickOnPiece(game, playable2);
            clickOnPiece(game, playable1);
        then: // playable2 has already played, nothing happened
            assert(player.launched).equalsTo(5);
            assert(playable2.isPlayed()).isTrue();
    });

    it("Checks that it is possible to not set an action to a playable when it is selected", () => {
        given:
            var {game, playable1, playable2, player} = create2PiecesTinyGame();
        when:
            player.setAction(null);
            clickOnPiece(game, playable1);
        then:
            assert(player.launched).equalsTo(1);
            assert(playable1.action).isNotDefined();
        when:
            player.setAction(null);
            clickOnPiece(game, playable1);
        then:
            assert(player.launched).equalsTo(2);
    });

    it("Checks if a piece selection/deselection is allowed when focusing", () => {
        given:
            var { game, playable1, playable2 } = create2PiecesTinyGame();
        then:
            assert(game.canSelectPlayable(playable1)).isTrue();
            assert(game.mayChangeSelection(playable1)).isTrue();
        when:
            playable1._select();
        then:
            assert(game.selectedPlayable).equalsTo(playable1);
            assert(game.focusedPlayable).isNotDefined();
        when: // if an item is "focused", selection of another item is not possible
            game.setFocusedPlayable(playable1);
        then:
            assert(game.canUnselectPlayable(playable1)).isFalse();
            assert(game.canSelectPlayable(playable2)).isFalse();
            assert(game.mayChangeSelection(playable2)).isFalse();
        when: // can select focused playable
            game.setFocusedPlayable(playable2);
        then:
            assert(game.canUnselectPlayable(playable1)).isFalse();
            assert(game.canSelectPlayable(playable2)).isTrue();
            assert(game.mayChangeSelection(playable2)).isFalse();
        when: // No focused playable : selection is possible
            game.setFocusedPlayable();
        then:
            assert(game.canUnselectPlayable(playable1)).isTrue();
            assert(game.canSelectPlayable(playable2)).isTrue();
            assert(game.mayChangeSelection(playable2)).isTrue();
        when:
            playable2._select();
        then:
            assert(game.selectedPlayable).equalsTo(playable2);
        when:
            playable2._unselect();
        then:
            assert(game.selectedPlayable).isNotDefined();
    });

    it("Checks playable selection/deselection regarding actions", () => {
        given:
            var { game, playable1 } = create2PiecesTinyGame();
            var action = new CBAction(game, playable1);
            action.isFinishable = function() { return false;};
        when:
            playable1._select();
            playable1.launchAction(action);
        then:
            assert(game.canUnselectPlayable(playable1)).isTrue();
        when:
            action.markAsStarted();
        then:
            assert(game.canUnselectPlayable(playable1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectPlayable(playable1)).isTrue();
    });

    it("Checks focus on playable prevents other playable selection", () => {
        given:
            var { game, playable1, playable2 } = create2PiecesTinyGame();
            var action = new CBAction(game, playable1);
            game.setFocusedPlayable(playable1);
        when:
            playable1._select();
            playable1.launchAction(action);
        then:
            assert(game.canUnselectPlayable(playable1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectPlayable(playable1)).isTrue();
    });

    it("Checks actuators management", () => {
        given:
            var {game, playable} = createTinyGame();
        when:
            var action = new CBAction(game, playable);
            var actuator1 = new CBTestActuator(action);
            var actuator2 = new CBTestActuator(action);
            game.openActuator(actuator1);
        then:
            assert(actuator1.triggers).arrayEqualsTo([actuator1.trigger]);
            assert(actuator1.getTrigger()).equalsTo(actuator1.trigger);
            assert(actuator1.failToGetTrigger()).equalsTo(null);
            assert(actuator1.trigger.actuator).equalsTo(actuator1);
            assert(game.actuators).arrayEqualsTo([actuator1]);
            assert(actuator1.getPosition(actuator1.trigger.location).toString()).equalsTo("point(0, 0)");
        when:
            Memento.open();
            game.closeActuators();
            game.openActuator(actuator2);
        then:
            assert(game.actuators).arrayEqualsTo([actuator2]);
        when:
            Memento.undo();
        then:
            assert(game.actuators).arrayEqualsTo([actuator1]);
        when:
            game.openActuator(actuator2);
        then:
            assert(game.actuators).arrayEqualsTo([actuator1, actuator2]);
        when:
            Memento.open();
            game.closeActuators();
        then:
            assert(game.actuators).arrayEqualsTo([]);
        when:
            Memento.undo();
        then:
            assert(game.actuators).arrayEqualsTo([actuator1, actuator2]);
    });

    it("Checks that clicking on the map re-centers the viewport ", () => {
        given:
            var game = new CBTestGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [mapLayer] = getLayers(game.board, "map");
            loadAllImages();
        then:
            assert(getDirectives(mapLayer)).arrayContains("setTransform(0.4888, 0, 0, 0.4888, 500, 400)");
        when:
            resetDirectives(mapLayer);
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:410});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(getDirectives(mapLayer)).arrayContains("setTransform(0.4888, 0, 0, 0.4888, 500, 390)");
    });

    function getTestActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBTestActuator) return actuator;
        }
        return null;
    }

    it("Checks that a playable selection closes the actuators", () => {
        given:
            var { game, playable1, playable2, player } = create2PiecesTinyGame();
            clickOnPiece(game, playable1);
            var action = new CBAction(game, playable1);
            var actuator = new CBTestActuator(action);
            game.openActuator(actuator);
            loadAllImages();
        then:
            assert(game.selectedPlayable).equalsTo(playable1);
            assert(getTestActuator(game)).isDefined();
        when:
            clickOnPiece(game, playable2);
        then:
            assert(game.selectedPlayable).equalsTo(playable2);
            assert(getTestActuator(game)).isNotDefined();
    });

    it("Checks popup management", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLevel] = getLayers(game.board, "widgets");
            resetDirectives(widgetsLevel);
        when:
            var popup1 = new DPopup(new Dimension2D(100, 200));
            game.openPopup(popup1, new Point2D(10, 20));
            paint(game);
        then:
            assert(game.popup).equalsTo(popup1);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showFakeInsert(55, 105, 100, 200));
            assertNoMoreDirectives(widgetsLevel);
        when:
            resetDirectives(widgetsLevel);
            var popup2 = new DPopup(new Dimension2D(150, 250));
            game.openPopup(popup2, new Point2D(15, 25));
            paint(game);
        then:
            assert(game.popup).equalsTo(popup2);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showFakeInsert(80, 130, 150, 250));
            assertNoMoreDirectives(widgetsLevel);
        when:
            Memento.open();
            resetDirectives(widgetsLevel);
            game.closePopup();
            paint(game);
        then:
            assert(game.popup).isNotDefined();
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([]);
        when:
            Memento.undo();
            resetDirectives(widgetsLevel);
            paint(game);
        then:
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showFakeInsert(80, 130, 150, 250));
            assertNoMoreDirectives(widgetsLevel);
    });

    it("Checks mask management", () => {
        given:
            var {game} = createTinyGame();
            var [widgetsLevel] = getLayers(game.board, "widgets");
            resetDirectives(widgetsLevel);
        when:
            var mask1 = new DMask("#000000", 0.3);
            game.openMask(mask1);
            paint(game);
        then:
            assert(game.mask).equalsTo(mask1);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showMask());
            assertNoMoreDirectives(widgetsLevel);
        when:
            resetDirectives(widgetsLevel);
            var mask2 = new DMask("#000000", 0.3);
            game.openMask(mask2);
            paint(game);
        then:
            assert(game.mask).equalsTo(mask2);
        when:
            Memento.open();
            resetDirectives(widgetsLevel);
            game.closePopup();
            paint(game);
        then:
            assert(game.mask).isNotDefined();
            assertClearDirectives(widgetsLevel);
            assertNoMoreDirectives(widgetsLevel);
        when:
            resetDirectives(widgetsLevel);
            Memento.undo();
            paint(game);
        then:
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showMask());
            assertNoMoreDirectives(widgetsLevel);
    });

    function clickOnPiece(game, piece) {
        let pieceLocation = piece.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:pieceLocation.x, offsetY:pieceLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    it("Checks piece basic appearance and features", () => {
        given:
            var { game } = createBasicGame();
            let piece = new CBPiece("grounds", ["./../images/units/misc/piece.png"], new Dimension2D(50, 50));
            piece._setOnGame(game);
            piece.location = new Point2D(100, 200);
            game.start();
            loadAllImages();
            piece.angle = 45;
            var [hexLayer] = getLayers(game.board, "grounds");
        when:
            resetDirectives(hexLayer);
            repaint(game);
        then:
            assert(piece.isShown()).isTrue();
            assert(piece.game).equalsTo(game);
            assert(piece.angle).equalsTo(45);
            assert(piece.element).is(DElement);
            assert(piece.element.artifacts[0]).equalsTo(piece.artifact);
            assert(piece.location.toString()).equalsTo("point(100, 200)");
            assert(piece.viewportLocation.toString()).equalsTo("point(548.8759, 497.7517)");
            assert(piece.pieces).arrayEqualsTo([piece]);
            assert(piece.allArtifacts).arrayEqualsTo([piece.artifact]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/piece", [0.3456, 0.3456, -0.3456, 0.3456, 548.8759, 497.7517]));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            piece.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(piece.location.toString()).equalsTo("point(10, 20)");
            assert(piece.viewportLocation.toString()).equalsTo("point(504.8876, 409.7752)");
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/piece", [0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 409.7752]));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            paint(game);
        then:
            assert(getDirectives(hexLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(hexLayer);
            piece.refresh();
            paint(game);
        then:
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/piece", [0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 409.7752]));
            assertNoMoreDirectives(hexLayer);
        when:
            clickOnPiece(game, piece); // checks that tests does not crash
    });

    class CBTestMarker extends CBPieceImageArtifact {
        constructor(...args) {
            super(...args);
        }
        get layer() {
            return "markers";
        }
        get slot() {
            return this.piece.slot;
        }
    }

    it("Checks miscellaneous playable methods ", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new CBTestPlayer("player1");
            game.addPlayer(player);
            let playable = new CBTestBelongsToPlayerPlayable("units", player, ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(playable, "units", [markerImage], new Point2D(0, 0), new Dimension2D(64, 64));
            playable._element.addArtifact(marker);
            var hexId = map.getHex(4, 5);
            playable.addToMap(hexId, CBStacking.TOP);
        then:
            assert(marker.game).equalsTo(game);
            assert(playable.artifact.onMouseEnter(dummyEvent)).isTrue();
            assert(playable.artifact.onMouseLeave(dummyEvent)).isTrue();
    });

    it("Checks playable addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestBelongsToPlayerPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "grounds");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(hexLayer);
            playable.addToMap(hexId);
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            playable.removeFromMap();
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks playable addition and removing on a Hex (undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestBelongsToPlayerPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "grounds");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(hexLayer);
            playable.appendToMap(hexId);
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            Memento.open();
            playable.deleteFromMap();
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(hexLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks getOneByType method", () => {
        given:
            var { map, player, playable } = createTinyGame();
            class PlayableOne extends CBTestBelongsToPlayerPlayable {};
            class PlayableTwo extends CBTestBelongsToPlayerPlayable {};
            class PlayableThree extends CBTestBelongsToPlayerPlayable {};
            var playable1 = new PlayableOne("grounds", player,["./../images/units/misc/one.png"], new Dimension2D(50, 50));
            var playable2 = new PlayableTwo("grounds", player,["./../images/units/misc/two.png"], new Dimension2D(50, 50));
            var hexId = map.getHex(4, 5);
        when:
            playable1.addToMap(hexId);
            playable2.addToMap(hexId);
        then:
            assert(PlayableMixin.getOneByType(hexId, PlayableOne)).equalsTo(playable1);
            assert(PlayableMixin.getOneByType(hexId, PlayableThree)).isNotDefined();
            assert(player.playables).unorderedArrayEqualsTo([playable, playable1, playable2]);
    });

    it("Checks getAllByType method", () => {
        given:
            var { game, map, player, playable } = createTinyGame();
            class PlayableOne extends CBTestBelongsToPlayerPlayable {};
            class PlayableTwo extends CBTestBelongsToPlayerPlayable {};
            class PlayableThree extends CBTestBelongsToPlayerPlayable {};
            var playable1 = new PlayableOne("grounds", player,["./../images/units/misc/one.png"], new Dimension2D(50, 50));
            var playable2 = new PlayableOne("grounds", player,["./../images/units/misc/two.png"], new Dimension2D(50, 50));
            var playable3 = new PlayableTwo("grounds", player,["./../images/units/misc/three.png"], new Dimension2D(50, 50));
            var hexId = map.getHex(4, 5);
        when:
            playable1.addToMap(hexId);
            playable2.addToMap(hexId);
            playable3.addToMap(hexId);
        then:
            assert(PlayableMixin.getAllByType(hexId, PlayableOne)).unorderedArrayEqualsTo([playable1, playable2]);
            assert(PlayableMixin.getAllByType(hexId, PlayableTwo)).arrayEqualsTo([playable3]);
            assert(PlayableMixin.getAllByType(hexId, PlayableThree)).arrayEqualsTo([]);
            assert(player.playables).unorderedArrayEqualsTo([playable, playable1, playable2, playable3]);
    });

    it("Checks playable addition and removing on a Hex Side (not undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestBelongsToPlayerPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "grounds");
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            resetDirectives(hexLayer);
            playable.addToMap(hexSideId);
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 159.4391)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            playable.removeFromMap();
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks playable addition and removing on a Hex Side (undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestBelongsToPlayerPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "grounds");
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            resetDirectives(hexLayer);
            playable.appendToMap(hexSideId);
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 159.4391)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            Memento.open();
            playable.deleteFromMap();
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(hexLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([playable]);
            assert(hexId2.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakePiece("misc/playable", zoomAndRotate0(333.3333, 159.4391)));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId1.playables).arrayEqualsTo([]);
            assert(hexId2.playables).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that selected/focused playable destruction release selection/focus", () => {
        given:
            var { game, playable1, playable2 } = create2PiecesTinyGame();
        playable1._select();
        game.setFocusedPlayable(playable1);
        then:
            assert(playable1.isOnHex()).isTrue();
        assert(game.focusedPlayable).equalsTo(playable1);
        assert(game.selectedPlayable).equalsTo(playable1);
        when:
            playable1.destroy();
        then:
            assert(playable1.isOnHex()).isFalse();
        assert(game.focusedPlayable).isNotDefined();
        assert(game.selectedPlayable).isNotDefined();
    });

    it("Checks the displacement of a hex located playable", () => {
        given:
            var {game, playable} = createTinyGame();
        var playableHex = playable.hexLocation;
        var nearHex = playableHex.getNearHex(0);
        then:
            assert(playableHex.playables).contains(playable);
        when:
            playable.hexLocation = nearHex;
        then:
            assert(playable.hexLocation).equalsTo(nearHex);
        assert(playableHex.playables).doesNotContain(playable);
        assert(nearHex.playables).contains(playable);
        when:
            playable.hexLocation = null;
        then:
            assert(playable.hexLocation).isNotDefined();
        assert(nearHex.playables).doesNotContain(playable);
    });

    it("Checks the removing of a playable belonging to a player", () => {
        given:
            var {game, playable} = createTinyGame();
            var playableHex = playable.hexLocation;
        then:
            assert(playableHex.playables).contains(playable);
            assert(game.playables).contains(playable);
        when:
            Memento.open();
            playable.destroy();
        then:
            assert(playableHex.playables).doesNotContain(playable);
            assert(game.playables).doesNotContain(playable);
        when:
            Memento.undo();
        then:
            assert(playableHex.playables).contains(playable);
            assert(game.playables).contains(playable);
    });

    it("Checks basic processing of an action", () => {
        given:
            var { game, playable } = createTinyGame();
            var call = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (source instanceof CBAction) call++;
                }
            });
        when:
            var action = new CBAction(game, playable);
            playable.launchAction(action);
        then:
            assert(playable.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(playable.isActivated()).isFalse();
        when:
            Memento.open();
            action.markAsStarted();
        then:
            assert(action.isStarted()).isTrue();
            assert(playable.isActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(playable.isPlayed()).isFalse();
            assert(call).equalsTo(1);
        when:
            Memento.open();
            action.markAsFinished();
        then:
            assert(action.isStarted()).isTrue();
            assert(playable.isActivated()).isTrue();
            assert(action.isFinished()).isTrue();
            assert(playable.isPlayed()).isTrue();
            assert(action.isFinalized()).isFalse();
            assert(call).equalsTo(2);
        when:
            Memento.open();
            var finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinished()).isTrue();
            assert(playable.isPlayed()).isTrue();
            assert(action.isFinalized()).isTrue();
            assert(finalized).isTrue();
            assert(call).equalsTo(3);
        when: // finalization is executed ony once
            finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinalized()).isTrue();
            assert(finalized).isFalse();
            assert(call).equalsTo(3);
        when:
            Memento.undo();
        then:
            assert(action.isFinalized()).isFalse();
        when:
            Memento.undo();
        then:
            assert(action.isStarted()).isTrue();
            assert(playable.isActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(playable.isPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(playable.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(playable.isActivated()).isFalse();
            assert(call).equalsTo(3);
        when:
            playable.removeAction();
        then:
            assert(playable.action).isNotDefined();
    });

    it("Checks action cancellation", () => {
        given:
            var { game, playable } = createTinyGame();
            var call = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (source instanceof CBAction) call++;
                }
            });
        when:
            var action = new CBAction(game, playable);
            playable.launchAction(action);
        then:
            assert(playable.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isFalse();
            assert(playable.isActivated()).isFalse();
            assert(call).equalsTo(0);
        when:
            Memento.open();
            action.cancel();
        then:
            assert(playable.action).isNotDefined();
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isTrue();
            assert(call).equalsTo(1);
        when:
            Memento.undo();
        then:
            assert(playable.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isFalse();
            assert(playable.isActivated()).isFalse();
            assert(call).equalsTo(1);
    });

    it("Checks turn setting", () => {
        given:
            var {game, player1, player2} = create2PlayersTinyGame();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            game.currentPlayer = player2;
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

    it("Checks activating a playable", () => {
        given:
            var {game, playable, map} = createTinyGame();
        when:
            playable.launchAction(new CBAction(game, playable))
            playable.action.markAsStarted();
        then:
            assert(playable.isActivated()).isTrue();
            assert(playable.isPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(playable.isActivated()).isFalse();
            assert(playable.isPlayed()).isFalse();
    });

    it("Checks playing a playable belonging to a player", () => {
        given:
            var {game, player, playable} = createTinyGame();
        when:
            playable.launchAction(new CBAction(game, playable));
            playable.setPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(playable.isActivated()).isTrue();
            assert(playable.isPlayed()).isTrue();
        when:
            Memento.undo();
            paint(game);
        then:
            assert(playable.isActivated()).isFalse();
            assert(playable.isPlayed()).isFalse();
        when:
            playable.launchAction(new CBAction(game, playable));
            playable.setPlayed();
        then:
            assert(playable.isActivated()).isTrue();
            assert(playable.isPlayed()).isTrue();
        when:
            playable.reset(player);
        then:
            assert(playable.isPlayed()).isFalse();
            assert(playable.updated).isTrue();
        when:
            game.currentPlayer = new CBTestPlayer("player2");
        then:
            assert(playable.isFinishable()).isTrue();
        when:
            game.currentPlayer = playable.player;
        then:
            assert(playable.isFinishable()).isTrue();
        when:
            playable.player.canFinishPlayable = function(playable) {
                return false;
            }
        then:
            assert(playable.isFinishable()).isFalse();
    });

    it("Checks playing a playable not belonging to a player", () => {
        given:
            var {game, display0} = createDisplayTinyGame();
        when:
            display0.setPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(display0.isPlayed()).isTrue();
            assert(display0.isFinishable()).isTrue();
        when:
            Memento.undo();
            paint(game);
        then:
            assert(display0.isPlayed()).isFalse();
            assert(display0.isFinishable()).isFalse();
        when:
            display0.onMouseClick(dummyEvent);
        then:
            assert(display0.action).isDefined();
    });

    it("Checks display pieces", () => {
        given:
            var {game, display0} = createDisplayTinyGame();
            var [countersLayer] = getLayers(game.board, "counters");
        when:
            resetDirectives(countersLayer);
            display0.removeFromGame(game);
            paint(game);
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            Memento.open();
            display0.show(game);
            paint(game);
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            Memento.open();
            display0.hide(game);
            paint(game);
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks cleanup", () => {
        given:
            var {game, player, map} = createDisplayTinyGame();
            let playable1 = new CBTestBelongsToPlayerPlayable("units", player,["./../images/units/misc/unit1.png"]);
            playable1.addToMap(map.getHex(5, 6));
            var [countersLayer, unitsLayer] = getLayers(game.board, "counters", "units");
        when:
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/units/misc/unit1.png, -71, -71, 142, 142)',
                'restore()'
            ]);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            game.clean();
            repaint(game);
        then:
            assert(game.playables).arrayEqualsTo([]);
            assert(game.counterDisplay.counters).arrayEqualsTo([])
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks pieces display placement on the four corners of the screen", () => {
        given:
            var {game} = createDisplayTinyGame();
            var [countersLayer] = getLayers(game.board, "counters");
        when:
            resetDirectives(countersLayer);
            game.counterDisplay.setHorizontal(CBCounterDisplay.LEFT);
            game.counterDisplay.setVertical(CBCounterDisplay.TOP);
            paint(game);
        then:
            assert(game.counterDisplay.horizontal).equalsTo(CBCounterDisplay.LEFT);
            assert(game.counterDisplay.vertical).equalsTo(CBCounterDisplay.TOP);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            game.counterDisplay.setHorizontal(CBCounterDisplay.RIGHT);
            paint(game);
        then:
            assert(game.counterDisplay.horizontal).equalsTo(CBCounterDisplay.RIGHT);
            assert(game.counterDisplay.vertical).equalsTo(CBCounterDisplay.TOP);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 841.1535, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 938.9052, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            game.counterDisplay.setVertical(CBCounterDisplay.BOTTOM);
            paint(game);
        then:
            assert(game.counterDisplay.horizontal).equalsTo(CBCounterDisplay.RIGHT);
            assert(game.counterDisplay.vertical).equalsTo(CBCounterDisplay.BOTTOM);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 841.1535, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 938.9052, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            game.counterDisplay.setHorizontal(CBCounterDisplay.LEFT);
            paint(game);
        then:
            assert(game.counterDisplay.horizontal).equalsTo(CBCounterDisplay.LEFT);
            assert(game.counterDisplay.vertical).equalsTo(CBCounterDisplay.BOTTOM);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks pieces display placement when focus on screen is moved", () => {
        given:
            var {game} = createDisplayTinyGame();
            var [countersLayer] = getLayers(game.board, "counters");
        when:
            resetDirectives(countersLayer);
            game.board.recenter(new Point2D(1, 1));
            paint(game);
        then:
            game.counterDisplay.setHorizontal(CBCounterDisplay.LEFT);
            game.counterDisplay.setVertical(CBCounterDisplay.TOP);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 738.9052)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(countersLayer);
            game.board.recenter(new Point2D(CBAbstractMap.WIDTH-1, CBAbstractMap.HEIGHT-1));
            paint(game);
        then:
            game.counterDisplay.setHorizontal(CBCounterDisplay.RIGHT);
            game.counterDisplay.setVertical(CBCounterDisplay.BOTTOM);
            assert(getDirectives(countersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 61.0948, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display0.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 158.8465, 61.0948)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(./../images/units/misc/display1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks that actuator closing may be preempted", () => {
        given:
            var {game} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            var actuator = new CBTestActuator();
            actuator.enableClosing(false);
            game.openActuator(actuator);
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(500, 400)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game.closeActuators();
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(500, 400)))
            assertNoMoreDirectives(actuatorsLayer);
            assert(game._actuators).arrayEqualsTo([actuator]);
        when:
            game.enableActuatorsClosing(true);
            game.closeActuators();
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertNoMoreDirectives(actuatorsLayer);
            assert(game._actuators).arrayEqualsTo([]);
    });

    it("Checks game specs export", () => {
        given:
            var {game} = createTinyGame();
        when:
            var context = new Map();
            var specs = game.toSpecs(context);
        then:
            assert(specs).objectEqualsTo({
                "id":1,"version":0,
                "currentPlayerIndex":0,
                "currentTurn":0,
                "players":[{"version":0,"identity":{"version":0,"name":"player1"}}],
                "map":{"version":0,
                    "boards":[{"version":0,"col":0,"row":0,"path":"./../images/maps/map.png","invert":false}]
                },
                "locations":[]
            });
    });

    it("Checks game specs import", () => {
        given:
            var game = new CBTestGame();
            var specs = {
                "id": 1, "version": 0,
                "currentPlayerIndex": 0,
                "currentTurn": 0,
                "players": [{"version": 0, "identity": {"version": 0, "name": "player1"}}],
                "map": {
                    "version": 0,
                    "boards": [{"version": 0, "col": 0, "row": 0, "path": "./../images/maps/map.png", "invert": false}]
                }
            };
        when:
            var context = new Map();
            context.playerCreator = (name, path)=>new CBTestPlayer(name, path);
            game.fromSpecs(specs, context);
        then:
            assert(game.toSpecs(new Map())).objectEqualsTo(specs);
    });

});