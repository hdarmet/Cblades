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
    DPopup
} from "../../jslib/widget.js";
import {
    showGameCommand,
    showGameInactiveCommand,
    executeAllAnimations,
    paint,
    repaint,
    showTroop,
    zoomAndRotate0,
    showMap, showMask
} from "./interactive-tools.js";
import {
    CBLevelBuilder
} from "../../jslib/cblades/playable.js";

class CBTestGame extends CBAbstractGame {

    constructor() {
        super([
            new DSimpleLevel("map"),
            new DSimpleLevel("grounds"),
            new DSimpleLevel("units"),
            new DSimpleLevel("actuators"),
            new DStaticLevel("counters"),
            new DStaticLevel("counter-markers"),
            new DStaticLevel("widgets"),
            new DStaticLevel("widget-items"),
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

    launchPlayableAction(playable, event) {
        if (this.actionClass) {
            playable.launchAction(new this.actionClass(this.game, playable));
        }
        this.launched++;
        super.launchPlayableAction(playable, event);
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
        this.trigger.alpha = (level===CBActuator.FULL_VISIBILITY ? 1:0);
    }

}

class TestPlayableArtifact extends CBPieceImageArtifact {

    get slot() {
        return this.piece.slot;
    }

    get layer() {
        return 4; // Layer "unit-"
    }

    select() {}

    unselect() {}

    onMouseClick(event) {
        this.piece.onMouseClick(event);
        return true;
    }

}

class CBTestPlayable extends BelongsToPlayerMixin(HexLocatableMixin(PlayableMixin(CBPiece))) {

    constructor(layerName, player, paths, dimension = new Dimension2D(142, 142), nature="unit") {
        super(layerName, paths, dimension);
        this.player = player;
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableArtifact(this, levelName, images, position, dimension);
    }

    get unitNature() {
        return this._nature = "unit";
    }

    /*
    markAsPlayed() {
        this.status = "played";
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }
     */

    get slot() {
        return this.hexLocation.playables.indexOf(this);
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
    var player = new CBTestPlayer();
    game.addPlayer(player);
    let unit = new CBTestPlayable("units", player, ["./../images/units/misc/unit.png"]);
    unit.addToMap(map.getHex(5, 8));
    repaint(game);
    loadAllImages();
    return { game, arbitrator, player, map, unit };
}

function create2PlayersTinyGame() {
    var { game, map } = createBasicGame();
    let player1 = new CBTestPlayer();
    game.addPlayer(player1);
    let player2 = new CBTestPlayer();
    game.addPlayer(player2);
    let unit0 = new CBTestPlayable("units", player1, ["./../images/units/misc/unit0.png"]);
    unit0.addToMap(map.getHex(5, 8));
    let unit1 = new CBTestPlayable("units", player1, ["./../images/units/misc/unit1.png"]);
    unit1.addToMap(map.getHex(5, 8));
    let unit2 = new CBTestPlayable("units", player2, ["./../images/units/misc/unit2.png"]);
    unit2.addToMap(map.getHex(5, 7));
    game.start();
    loadAllImages();
    return {game, map, unit0, unit1, unit2, player1, player2};
}

function create2PiecesTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new CBTestPlayer();
    game.addPlayer(player);
    let unit1 = new CBTestPlayable("units", player,["./../images/units/misc/unit1.png"]);
    unit1.addToMap(map.getHex(5, 6));
    let unit2 = new CBTestPlayable("units", player,["./../images/units/misc/unit2.png"]);
    unit2.addToMap(map.getHex(5, 7));
    repaint(game);
    loadAllImages();
    return {game, map, arbitrator, unit1, unit2, player};
}

function createDisplayTinyGame() {
    var { game, map } = createBasicGame();
    let player = new CBTestPlayer();
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
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units");
        when:
            loadAllImages();
        then:
            assert(game.board).is(DBoard);
            assert(arbitrator.game).equalsTo(game);
            assert(game.arbitrator).equalsTo(arbitrator);
            assert(game.map).equalsTo(map);
            assert(player.game).equalsTo(game);
            assert(game.currentPlayer).equalsTo(player);
            assertClearDirectives(mapLayer);
            assertDirectives(mapLayer, showMap("map", zoomAndRotate0(500, 400)));
            assertNoMoreDirectives(mapLayer);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
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

    it("Checks action launch during selection (and automatic finalization when a started playable is unselected)", () => {
        given:
            var {game, unit1, unit2, player} = create2PiecesTinyGame();
        when:
            clickOnPiece(game, unit1);
        then:
            assert(player.launched).equalsTo(1);
            assert(unit1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, unit1);
        then:
            assert(player.launched).equalsTo(2);
            assert(unit1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, unit2);
        then: // unit1 is not "played" because the action was not started
            assert(player.launched).equalsTo(3);
            assert(unit1.isPlayed()).isFalse();
        when:
            unit2.action.markAsStarted();
            clickOnPiece(game, unit1);
        then: // unit2 has not played because the action was not started
            assert(player.launched).equalsTo(4);
            assert(unit2.isPlayed()).isTrue();
        when:
            clickOnPiece(game, unit2);
            clickOnPiece(game, unit1);
        then: // unit2 has already played, nothing happened
            assert(player.launched).equalsTo(5);
            assert(unit2.isPlayed()).isTrue();
    });

    it("Checks that it is possible to not set an action to a playable when it is selected", () => {
        given:
            var {game, unit1, unit2, player} = create2PiecesTinyGame();
        when:
            player.setAction(null);
            clickOnPiece(game, unit1);
        then:
            assert(player.launched).equalsTo(1);
            assert(unit1.action).isNotDefined();
        when:
            player.setAction(null);
            clickOnPiece(game, unit1);
        then:
            assert(player.launched).equalsTo(2);
    });

    it("Checks if a piece selection/deselection is allowed when focusing", () => {
        given:
            var { game, unit1, unit2 } = create2PiecesTinyGame();
        then:
            assert(game.canSelectPlayable(unit1)).isTrue();
            assert(game.mayChangeSelection(unit1)).isTrue();
        when:
            unit1.select();
        then:
            assert(game.selectedPlayable).equalsTo(unit1);
            assert(game.focusedPlayable).isNotDefined();
        when: // if an item is "focused", selection of another item is not possible
            game.setFocusedPlayable(unit1);
        then:
            assert(game.canUnselectPlayable(unit1)).isFalse();
            assert(game.canSelectPlayable(unit2)).isFalse();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // can select focused unit
            game.setFocusedPlayable(unit2);
        then:
            assert(game.canUnselectPlayable(unit1)).isFalse();
            assert(game.canSelectPlayable(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // No focused unit : selection is possible
            game.setFocusedPlayable();
        then:
            assert(game.canUnselectPlayable(unit1)).isTrue();
            assert(game.canSelectPlayable(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isTrue();
        when:
            unit2.select();
        then:
            assert(game.selectedPlayable).equalsTo(unit2);
        when:
            unit2.unselect();
        then:
            assert(game.selectedPlayable).isNotDefined();
    });

    it("Checks playable selection/deselection regarding actions", () => {
        given:
            var { game, unit1 } = create2PiecesTinyGame();
            var action = new CBAction(game, unit1);
            action.isFinishable = function() { return false;};
        when:
            unit1.select();
            unit1.launchAction(action);
        then:
            assert(game.canUnselectPlayable(unit1)).isTrue();
        when:
            action.markAsStarted();
        then:
            assert(game.canUnselectPlayable(unit1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectPlayable(unit1)).isTrue();
    });

    it("Checks focus on playable prevents other playable selection", () => {
        given:
            var { game, unit1, unit2 } = create2PiecesTinyGame();
            var action = new CBAction(game, unit1);
            game.setFocusedPlayable(unit1);
        when:
            unit1.select();
            unit1.launchAction(action);
        then:
            assert(game.canUnselectPlayable(unit1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectPlayable(unit1)).isTrue();
    });

    it("Checks actuators management", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            var action = new CBAction(game, unit);
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

    it("Checks that actuator closing may be preempted", () => {
        given:
            var {game, unit} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.setMenu();
            game._showCommand.action();
        when:
            var actuator = new CBTestActuator();
            actuator.enableHide(false);
            resetDirectives(actuatorsLayer);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(500, 400)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game.closeActuators();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(500, 400)))
            assertNoMoreDirectives(actuatorsLayer);
            assert(game._actuators).arrayEqualsTo([actuator]);
        when:
            game.enableActuatorsClosing(true);
            game.closeActuators();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertNoMoreDirectives(actuatorsLayer);
            assert(game._actuators).arrayEqualsTo([]);
    });

    it("Checks that actuator is hidden if the game visibility level is lowered", () => {
        given:
            var {game, unit} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.setMenu();
            game._showCommand.action();
        when:
            var action = new CBAction(game, unit);
            var actuator = new CBTestActuator(action);
            resetDirectives(actuatorsLayer);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assert([...Mechanisms.manager._listeners]).contains(actuator);
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(500, 400)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game._insertLevelCommand.action();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([]);
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
            var { game, unit1, unit2, player } = create2PiecesTinyGame();
            clickOnPiece(game, unit1);
            var action = new CBAction(game, unit1);
            var actuator = new CBTestActuator(action);
            game.openActuator(actuator);
            loadAllImages();
        then:
            assert(game.selectedPlayable).equalsTo(unit1);
            assert(getTestActuator(game)).isDefined();
        when:
            clickOnPiece(game, unit2);
        then:
            assert(game.selectedPlayable).equalsTo(unit2);
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

    it("Checks mak management", () => {
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

    it("Checks global push menu button", () => {
        given:
            var game = new CBTestGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLayer] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("show", 880, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._showCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("hide", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 760, 740));
            assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 700, 740));
            assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 640, 740));
            assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("editor", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("insert2", 460, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 400, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._hideCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("show", 880, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks undo/redo push menu button", () => {
        given:
            var game = new CBTestGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
    });

    it("Checks edit push menu button", () => {
        try {
            given:
                var cbgameEdit = CBAbstractGame.editMap;
                var editMode = false;
                CBAbstractGame.editMap = function() {
                    editMode = !editMode;
                }
                var game = new CBTestGame();
                var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
                game.setMap(map);
                game.setMenu();
                game.start();
                var [commandsLayer] = getLayers(game.board, "widget-commands");
                loadAllImages();
                game._showCommand.action();
                executeAllAnimations();
            when:
                game._editMapCommand.action();
                executeAllAnimations();
                resetDirectives(commandsLayer);
                repaint(game);
            then:
                assert(editMode).isTrue();
                assertClearDirectives(commandsLayer);
                assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
                assertDirectives(commandsLayer, showGameCommand("hide", 880, 740));
                assertDirectives(commandsLayer, showGameCommand("undo", 820, 740));
                assertDirectives(commandsLayer, showGameCommand("redo", 760, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 700, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 640, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 580, 740));
                assertDirectives(commandsLayer, showGameCommand("field", 520, 740));
                assertDirectives(commandsLayer, showGameCommand("insert2", 460, 740));
                assertDirectives(commandsLayer, showGameCommand("full-screen-on", 400, 740));
                assertNoMoreDirectives(commandsLayer);
            when:
                editMode = false;
                game._editMapCommand.action();
                executeAllAnimations();
                resetDirectives(commandsLayer);
                repaint(game);
            then:
                assert(editMode).isFalse();
                assertClearDirectives(commandsLayer);
                assertDirectives(commandsLayer, showGameCommand("turn", 940, 740));
                assertDirectives(commandsLayer, showGameCommand("hide", 880, 740));
                assertDirectives(commandsLayer, showGameCommand("undo", 820, 740));
                assertDirectives(commandsLayer, showGameCommand("redo", 760, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 700, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 640, 740));
                assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 580, 740));
                assertDirectives(commandsLayer, showGameCommand("editor", 520, 740));
                assertDirectives(commandsLayer, showGameCommand("insert2", 460, 740));
                assertDirectives(commandsLayer, showGameCommand("full-screen-on", 400, 740));
                assertNoMoreDirectives(commandsLayer);
        } finally {
            CBAbstractGame.editMap = cbgameEdit;
        }
    });

    it("Checks full screen push menu button", () => {
        given:
            var game = new CBTestGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            game.fitWindow();
            var [mapLayer, commandsLayer] = getLayers(game.board,"map", "widget-commands");
            loadAllImages();
        when:
            game._showCommand.action();
            executeAllAnimations();
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 2000, 1500)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 1000, 750)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 2000, 1500);
            assertDirectives(commandsLayer, showGameCommand("turn", 1940, 1440));
            assertDirectives(commandsLayer, showGameCommand("hide", 1880, 1440));
            assertDirectives(commandsLayer, showGameCommand("undo", 1820, 1440));
            assertDirectives(commandsLayer, showGameCommand("redo", 1760, 1440));
            assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 1700, 1440));
            assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 1640, 1440));
            assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 1580, 1440));
            assertDirectives(commandsLayer, showGameCommand("editor", 1520, 1440));
            assertDirectives(commandsLayer, showGameCommand("insert2", 1460, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1400, 1440));
            assertNoMoreDirectives(commandsLayer);
        when:
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 750, 500)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 1500, 1000);
            assertDirectives(commandsLayer, showGameCommand("turn", 1440, 940));
            assertDirectives(commandsLayer, showGameCommand("hide", 1380, 940));
            assertDirectives(commandsLayer, showGameCommand("undo", 1320, 940));
            assertDirectives(commandsLayer, showGameCommand("redo", 1260, 940));
            assertDirectives(commandsLayer, showGameInactiveCommand("settings-inactive", 1200, 940));
            assertDirectives(commandsLayer, showGameInactiveCommand("save-inactive", 1140, 940));
            assertDirectives(commandsLayer, showGameInactiveCommand("load-inactive", 1080, 940));
            assertDirectives(commandsLayer, showGameCommand("editor", 1020, 940));
            assertDirectives(commandsLayer, showGameCommand("insert2", 960, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 900, 940));
            assertNoMoreDirectives(commandsLayer);
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
            assert(piece._processGlobalEvent());
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
            return this.piece.formationNature ? CBLevelBuilder.ULAYERS.FMARKERS : CBLevelBuilder.ULAYERS.MARKERS;
        }
        get slot() {
            return this.piece.slot;
        }
    }

    it("Checks miscellaneous playable methods ", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new CBTestPlayer();
            game.addPlayer(player);
            let unit = new CBTestPlayable("units", player, ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(unit, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            unit._element.addArtifact(marker);
            var hexId = map.getHex(4, 5);
            unit.addToMap(hexId, CBStacking.TOP);
        then:
            assert(marker.game).equalsTo(game);
            assert(unit.artifact.onMouseEnter(dummyEvent)).isTrue();
            assert(unit.artifact.onMouseLeave(dummyEvent)).isTrue();
    });

    it("Checks playable addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            let playable = new CBTestPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            var { map, player } = createTinyGame();
            class PlayableOne extends CBTestPlayable {};
            class PlayableTwo extends CBTestPlayable {};
            class PlayableThree extends CBTestPlayable {};
            var playable1 = new PlayableOne("grounds", player,["./../images/units/misc/one.png"], new Dimension2D(50, 50));
            var playable2 = new PlayableTwo("grounds", player,["./../images/units/misc/two.png"], new Dimension2D(50, 50));
            var hexId = map.getHex(4, 5);
        when:
            playable1.addToMap(hexId);
            playable2.addToMap(hexId);
        then:
            assert(PlayableMixin.getOneByType(hexId, PlayableOne)).equalsTo(playable1);
            assert(PlayableMixin.getOneByType(hexId, PlayableThree)).isNotDefined();
    });

    it("Checks getAllByType method", () => {
        given:
            var { game, map, player } = createTinyGame();
            class PlayableOne extends CBTestPlayable {};
            class PlayableTwo extends CBTestPlayable {};
            class PlayableThree extends CBTestPlayable {};
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
    });

    it("Checks playable addition and removing on a Hex Side (not undoable)", () => {
        given:
            var { game, map, player } = createTinyGame();
            let playable = new CBTestPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            let playable = new CBTestPlayable("grounds", player,["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            var { game, unit1, unit2 } = create2PiecesTinyGame();
        unit1.select();
        game.setFocusedPlayable(unit1);
        then:
            assert(unit1.isOnHex()).isTrue();
        assert(game.focusedPlayable).equalsTo(unit1);
        assert(game.selectedPlayable).equalsTo(unit1);
        when:
            unit1.destroy();
        then:
            assert(unit1.isOnHex()).isFalse();
        assert(game.focusedPlayable).isNotDefined();
        assert(game.selectedPlayable).isNotDefined();
    });

    it("Checks the displacement of a hex located playable", () => {
        given:
            var {game, unit} = createTinyGame();
        var unitHex = unit.hexLocation;
        var nearHex = unitHex.getNearHex(0);
        then:
            assert(unitHex.playables).contains(unit);
        when:
            unit.hexLocation = nearHex;
        then:
            assert(unit.hexLocation).equalsTo(nearHex);
        assert(unitHex.playables).notContains(unit);
        assert(nearHex.playables).contains(unit);
        when:
            unit.hexLocation = null;
        then:
            assert(unit.hexLocation).isNotDefined();
        assert(nearHex.playables).notContains(unit);
    });

    it("Checks the removing of a playable belonging to a player", () => {
        given:
            var {game, unit} = createTinyGame();
        var unitHex = unit.hexLocation;
        then:
            assert(unitHex.playables).contains(unit);
        assert(game.playables).contains(unit);
        when:
            Memento.open();
        unit.destroy();
        then:
            assert(unitHex.playables).notContains(unit);
        assert(game.playables).notContains(unit);
        when:
            Memento.undo();
        then:
            assert(unitHex.playables).contains(unit);
        assert(game.playables).contains(unit);
    });

    it("Checks basic processing of an action", () => {
        given:
            var { game, unit } = createTinyGame();
            var call = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (source instanceof CBAction) call++;
                }
            });
        when:
            var action = new CBAction(game, unit);
            unit.launchAction(action);
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(unit.isActivated()).isFalse();
        when:
            Memento.open();
            action.markAsStarted();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.isActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.isPlayed()).isFalse();
            assert(call).equalsTo(1);
        when:
            Memento.open();
            action.markAsFinished();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.isActivated()).isTrue();
            assert(action.isFinished()).isTrue();
            assert(unit.isPlayed()).isTrue();
            assert(action.isFinalized()).isFalse();
            assert(call).equalsTo(2);
        when:
            Memento.open();
            var finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinished()).isTrue();
            assert(unit.isPlayed()).isTrue();
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
            assert(unit.isActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.isPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(unit.isActivated()).isFalse();
            assert(call).equalsTo(3);
        when:
            unit.removeAction();
        then:
            assert(unit.action).isNotDefined();
    });

    it("Checks action cancellation", () => {
        given:
            var { game, unit } = createTinyGame();
            var call = 0;
            Mechanisms.addListener({
                _processGlobalEvent(source, event, value) {
                    if (source instanceof CBAction) call++;
                }
            });
        when:
            var action = new CBAction(game, unit);
            unit.launchAction(action);
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isFalse();
            assert(unit.isActivated()).isFalse();
            assert(call).equalsTo(0);
        when:
            Memento.open();
            action.cancel();
        then:
            assert(unit.action).isNotDefined();
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isTrue();
            assert(call).equalsTo(1);
        when:
            Memento.undo();
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(action.isCancelled()).isFalse();
            assert(unit.isActivated()).isFalse();
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

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, player1, player2, unit0, unit1, unit2} = create2PlayersTinyGame();
        then:
            assert(player1.units).arrayEqualsTo([unit0, unit1]);
            assert(game.currentPlayer).equalsTo(player1);
            assert(unit1.isCurrentPlayer()).isTrue();
        when:
            unit1.select();
            unit1.launchAction(new CBAction(game, unit1, dummyEvent));
        then:
            assert(game.selectedPlayable).equalsTo(unit1);
        when:
            unit1.markAsPlayed();
            assert(unit1.isPlayed()).isTrue();
            game.nextTurn();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(unit1.isPlayed()).isFalse();
            assert(unit1.isCurrentPlayer()).isFalse();
    });

    it("Checks next turn push buttons menu", () => {
        given:
            var {game, player1, player2} = create2PlayersTinyGame();
            game.setMenu();
        then:
            assert(game.currentPlayer).equalsTo(player1);
        when:
            game._endOfTurnCommand.action();
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

    it("Checks that when a unit cannot be unselected, turn cannot change", () => {
        given:
            var {game, unit1} = create2PlayersTinyGame();
            game.setMenu();
            game.setSelectedPlayable(unit1);
            let action = new CBAction(game, unit1);
            action.isFinishable = ()=>false;
            unit1.launchAction(action);
            action.markAsStarted();
        then:
            assert(game._endOfTurnCommand.active).isFalse();
    });

    it("Checks that when a unit is not finishable, turn cannot change", () => {
        given:
            var {game, unit1} = create2PlayersTinyGame();
            game.setMenu();
            unit1.isFinishable = ()=>false;
            Mechanisms.fire(game, CBAbstractGame.TURN_EVENT);
        then:
            assert(game._endOfTurnCommand.active).isFalse();
    });

    it("Checks activating a unit", () => {
        given:
            var {game, unit, map} = createTinyGame();
        when:
            unit.launchAction(new CBAction(game, unit))
            unit.action.markAsStarted();
        then:
            assert(unit.isActivated()).isTrue();
            assert(unit.isPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.isActivated()).isFalse();
            assert(unit.isPlayed()).isFalse();
    });

    it("Checks playing a unit belonging to a player", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            unit.launchAction(new CBAction(game, unit));
            unit.markAsPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(unit.isActivated()).isTrue();
            assert(unit.isPlayed()).isTrue();
        when:
            Memento.undo();
            paint(game);
        then:
            assert(unit.isActivated()).isFalse();
            assert(unit.isPlayed()).isFalse();
    });

    it("Checks playing a unit not belonging to a player", () => {
        given:
            var {game, display0} = createDisplayTinyGame();
        when:
            display0.markAsPlayed();
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
            game.board.recenter(new Point2D(CBMap.WIDTH-1, CBMap.HEIGHT-1));
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

});