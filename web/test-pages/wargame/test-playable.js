'use strict'

import {
    after,
    assert,
    before, clean, describe, executeTimeouts, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/board/draw.js";
import {
    assertClearDirectives, assertDirectives, assertNoMoreDirectives, createEvent, getDirectives,
    getLayers, loadAllImages,
    mockPlatform, resetDirectives
} from "../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/board/mechanisms.js";
import {
    WStacking,
    BelongsToPlayerMixin,
    WAbstractArbitrator,
    WAction, WPiece, WPieceImageArtifact, HexLocatableMixin, PlayableMixin, WAbstractGame, WActuator
} from "../../jslib/wargame/game.js";
import {
    WInsert,
    WMask,
    WGame,
    RetractablePieceMixin,
    RetractableArtifactMixin,
    SelectableArtifactMixin,
    WLevelBuilder,
    WActionActuator,
    WActuatorImageTrigger,
    RetractableActuatorMixin,
    WActuatorMultiImagesTrigger,
    WHexCounter,
    ActivableArtifactMixin,
    WPlayableActuatorTrigger,
    WPlayer,
    WAbstractInsert,
    NeighborActuatorMixin, NeighborActuatorArtifactMixin, GhostArtifactMixin
} from "../../jslib/wargame/playable.js";
import {
    clickOnTrigger, clickOnPiece,
    executeAllAnimations, mouseMoveOnTrigger, mouseMoveOutOfTrigger,
    paint,
    repaint,
    showActuatorTrigger,
    showFormation, showGameCommand, showGameInactiveCommand, showInsert, showMask, showOverFormation,
    showOverTroop, showSelectedActuatorTrigger, showSelectedTroop,
    showTroop,
    zoomAndRotate0, zoomAndRotate60, zoomAndRotate90, showOverActuatorTrigger
} from "../cblades/interactive-tools.js";
import {
    WHexSideId, WMap
} from "../../jslib/wargame/map.js";
import {
    Area2D,
    Dimension2D, Point2D
} from "../../jslib/board/geometry.js";
import {
    DInsertFrame
} from "../../jslib/board/widget.js";

class WTestPlayer extends WPlayer {

    constructor(...args) {
        super(...args);
        this.launched = 0;
        this.actionClass = WAction;
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

    toSpecs(context) {
        let playerSpecs = super.toSpecs(context);
        playerSpecs.playables = [];
        for (let playable of this.playables) {
            playerSpecs.playables.push(playable.toSpecs(context));
        }
        return playerSpecs;
    }

    fromSpecs(game, specs, context) {
        super.fromSpecs(game, specs, context);
        for (let playableSpecs of specs.playables) {
            let playable = new WTestPlayable(this, game, playableSpecs.name, playableSpecs.paths);
            playable.fromSpecs(playableSpecs, context);
            context.pieceMap.set(playableSpecs.name, playable);
        }
        return this;
    }

}

class WTestMultiImagesActuator extends WActionActuator {

    constructor(action) {
        super(action);
        let images = [
            DImage.getImage("./../images/actuators/test1.png"),
            DImage.getImage("./../images/actuators/test2.png")
        ];
        let imageArtifacts = [];
        this.trigger = new WActuatorMultiImagesTrigger(this, "actuators", images,
            new Point2D(0, 0), new Dimension2D(50, 50));
        this.trigger.position = new Point2D(0, 0);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    get unit() {
        return this.playable;
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
}

class WTestPlayableActuatorTrigger extends WPlayableActuatorTrigger {

    get layer() {
        return WLevelBuilder.ULAYERS.ACTUATORS;
    }

}

class WTestPlayableActuator extends RetractableActuatorMixin(WActionActuator) {

    constructor(action, playable) {
        super(action);
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new WTestPlayableActuatorTrigger(this, playable, "units", image,
            new Point2D(0, 0), new Dimension2D(142, 142));
        this.trigger.position = Point2D.position(action.playable.location, playable.location, 1);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    onMouseClick(trigger, event) {
        this.playableProcessed = trigger.playable;
    }

}

class TestPlayableImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(WPieceImageArtifact)) {

    constructor(playable, ...args) {
        super(playable, ...args);
    }

    get game() {
        return this.piece.game;
    }

    get slot() {
        return this.piece.slot;
    }

    get layer() {
        return WLevelBuilder.ULAYERS.UNITS;
    }

}

class WTestPlayable extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(WPiece)))) {

    constructor(player, game, name, paths) {
        super("units", game, paths, new Dimension2D(142, 142));
        this.player = player;
        this.name = name;
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableImageArtifact(this, levelName, images, position, dimension);
    }

    toReferenceSpecs(context) {
        return this.toSpecs(context);
    }

    get slot() {
        return this.hexLocation.playables.indexOf(this);
    }

    toSpecs(context) {
        let pieceSpecs = super.toSpecs(context);
        pieceSpecs.name = this.name;
        pieceSpecs.paths = this.paths;
        return pieceSpecs;
    }

    fromSpecs(specs, context) {
        super.fromSpecs(specs, context);
        this.name = specs.name;
        return this;
    }

}

class WTestHexCounter extends WHexCounter {

    constructor(game) {
        super("ground", game, ["./../images/units/misc/counter.png"], new Dimension2D(50, 50));
    }

    toSpecs(context) {
        let specs = super.toSpecs(context);
        specs.type = "counter";
        return specs;
    }
}

class TestCounterImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(WPieceImageArtifact)) {

    constructor(playable, ...args) {
        super(playable, ...args);
    }

    get game() {
        return this.piece.game;
    }

    get slot() {
        return this.piece.slot;
    }

    get layer() {
        return WLevelBuilder.ULAYERS.SPELLS;
    }

}

class WTestCounter extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(WPiece)))) {

    constructor(owner, game, paths) {
        super("units", game, paths, new Dimension2D(142, 142));
        this.owner = owner;
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestCounterImageArtifact(this, levelName, images, position, dimension);
    }

    setPlayed() {
        this.status = "played";
    }

    get player() {
        return this.owner.player;
    }

    reset() {
        super.reset();
        delete this.status;
    }

    get slot() {
        return this.owner.slot;//this.hexLocation.playables.indexOf(this);
    }

}

class CBTestMarker extends WPieceImageArtifact {

    constructor(...args) {
        super(...args);
    }
    get layer() {
        return this.piece.formationNature ? WLevelBuilder.ULAYERS.FMARKERS : WLevelBuilder.ULAYERS.MARKERS;
    }
    get slot() {
        return this.piece.slot;
    }

}

class CBTestFormation extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(WPiece)))) {

    constructor(player, game, paths) {
        super("units", game, paths, new Dimension2D(142*2, 142));
        this.player = player;
        Object.defineProperty(this.artifact, "layer", {
            get: function () {
                return WLevelBuilder.ULAYERS.FORMATIONS;
            }
        });
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableImageArtifact(this, levelName, images, position, dimension);
    }

    get formationNature() {
        return true;
    }

    setPlayed() {
        this.status = "played";
    }

    reset() {
        super.reset();
        delete this.status;
    }

    get slot() {
        return this.hexLocation.playables.indexOf(this);
    }

}

class CBTestActionActuator extends WActionActuator {

    constructor(action) {
        super(action);
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new WActuatorImageTrigger(this, "actuators", image,
            new Point2D(0, 0), new Dimension2D(50, 50));
        this.trigger.position = new Point2D(0, 0);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    get unit() {
        return this.playable;
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
        this.trigger.alpha = (level===WGame.FULL_VISIBILITY ? 1:0);
    }

}

function createBasicGame() {
    var game = new WGame(1);
    var arbitrator = new WAbstractArbitrator();
    game.setArbitrator(arbitrator);
    var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    game.start();
    loadAllImages();
    return { game, arbitrator, map };
}

function createTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new WTestPlayer("player1");
    game.addPlayer(player);
    let playable = new WTestPlayable(player, game,"u1", ["./../images/units/misc/unit.png"]);
    playable.addToMap(map.getHex(5, 8));
    repaint(game);
    loadAllImages();
    return { game, arbitrator, player, map, playable };
}

function create2PlayablesTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new WTestPlayer("player1");
    game.addPlayer(player);
    let playable1 = new WTestPlayable(player, game,"u1", ["./../images/units/misc/unit1.png"]);
    playable1.addToMap(map.getHex(5, 6));
    let playable2 = new WTestPlayable(player, game,"u2", ["./../images/units/misc/unit2.png"]);
    playable2.addToMap(map.getHex(5, 7));
    repaint(game);
    loadAllImages();
    return {game, map, arbitrator, playable1, playable2, player};
}

function create2PlayersTinyGame() {
    var { game, map } = createBasicGame();
    let player1 = new WTestPlayer();
    game.addPlayer(player1);
    let player2 = new WTestPlayer();
    game.addPlayer(player2);
    let unit0 = new WTestPlayable(player1, game,"u1",  ["./../images/units/misc/unit0.png"]);
    unit0.addToMap(map.getHex(5, 8));
    let unit1 = new WTestPlayable(player1, game, "u2",  ["./../images/units/misc/unit1.png"]);
    unit1.addToMap(map.getHex(5, 8));
    let unit2 = new WTestPlayable(player2, game, "u3", ["./../images/units/misc/unit2.png"]);
    unit2.addToMap(map.getHex(5, 7));
    game.start();
    loadAllImages();
    return {game, map, unit0, unit1, unit2, player1, player2};
}

function showOverFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

function showInactiveFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

function showActiveFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowBlur = 0",
            `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

export class CBTestHexNeighborTrigger extends NeighborActuatorArtifactMixin(WActuatorImageTrigger) {

    constructor(actuator, hex) {
        super(hex, actuator, "actuators", DImage.getImage("./../images/actuators/hex.png"),
            hex.location, new Dimension2D(50, 50));
    }

}

export class CBTestHexNeighborActuator extends NeighborActuatorMixin(WActuator) {

    constructor(map) {
        super();
        let imageArtifacts = [];
        for (let hex of map.hexes) {
            let triggerType = new CBTestHexNeighborTrigger(this, hex);
            imageArtifacts.push(triggerType);
        }
        this.initElement(imageArtifacts);
    }

    getHexTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger.hexLocation.similar(hexLocation));
    }

}

export class CBTestHexGhostTrigger extends GhostArtifactMixin(WActuatorImageTrigger) {

    constructor(actuator, hex) {
        super(actuator, "actuators", DImage.getImage("./../images/actuators/hex.png"),
            hex.location, new Dimension2D(50, 50));
        this.hexLocation = hex;
    }

}

export class CBTestHexGhostActuator extends WActuator {

    constructor(map) {
        super();
        let imageArtifacts = [];
        for (let hex of map.hexes) {
            let triggerType = new CBTestHexGhostTrigger(this, hex);
            imageArtifacts.push(triggerType);
        }
        this.initElement(imageArtifacts);
    }

    getHexTrigger(hexLocation) {
        return this.findTrigger(trigger=>trigger.hexLocation.similar(hexLocation));
    }

}

let dummyEvent = {offsetX:0, offsetY:0};

describe("Playable", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        WHexCounter.resetTokenType();
    });

    it("Checks that actuator is hidden if the game visibility level is lowered", () => {
        given:
            var {game, playable} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.setMenu();
            game._showCommand.action();
        when:
            var action = new WAction(game, playable);
            var actuator = new CBTestActionActuator(action);
            game.openActuator(actuator);
            repaint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(actuator);
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game._insertLevelCommand.action();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(actuator);
            assertClearDirectives(actuatorsLayer);
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([]);
        when:
            actuator.close();
            repaint(game);
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(actuator);
    });

    it("Checks global push menu button", () => {
        given:
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
            assertDirectives(commandsLayer, showGameCommand("insert2", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
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
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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

    it("Checks full screen push menu button", () => {
        given:
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
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
            assertDirectives(commandsLayer, showGameCommand("insert2", 1520, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1460, 1440));
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
            assertDirectives(commandsLayer, showGameCommand("insert2", 1020, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 960, 940));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks next turn push buttons menu", () => {
        given:
            var {game, player1, player2} = create2PlayersTinyGame();
            game.setMenu();
            player1.canPlay = function() { return true; };
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
            let action = new WAction(game, unit1);
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
            Mechanisms.fire(game, WGame.TURN_EVENT);
        then:
            assert(game._endOfTurnCommand.active).isFalse();
    });

    it("Checks that when changing turn, current player changes too and counters are reset", () => {
        given:
            var {game, player1, player2, unit0, unit1, unit2} = create2PlayersTinyGame();
            player1.canPlay = function() { return true; };
        then:
            assert(player1.playables).arrayEqualsTo([unit0, unit1]);
            assert(game.currentPlayer).equalsTo(player1);
            assert(unit1.isCurrentPlayer()).isTrue();
        when:
            unit1._select();
            unit1.launchAction(new WAction(game, unit1, dummyEvent));
        then:
            assert(game.selectedPlayable).equalsTo(unit1);
        when:
            unit1.setPlayed();
            assert(unit1.isPlayed()).isTrue();
            game.nextTurn();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(unit1.isPlayed()).isFalse();
            assert(unit1.isCurrentPlayer()).isFalse();
    });

    it("Checks mouse move over a trigger of an actuator", () => {
        given:
            var { game, playable } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            var action = new WAction(game, playable);
            var actuator = new CBTestActionActuator(action);
            game.openActuator(actuator);
        when:
            repaint(game);
        then:
            assert(actuator.getTrigger()).isDefined();
            assert(actuator.failToGetTrigger()).isNotDefined();
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOnTrigger(game, actuator.getTrigger());
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showOverActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOutOfTrigger(game, actuator.getTrigger());
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            clickOnTrigger(game, actuator.getTrigger());
            assert(actuator.clicked).equalsTo(actuator.getTrigger());
    });

    it("Checks actuators trigger on playable", () => {
        given:
            var {game, playable1, playable2} = create2PlayablesTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
        when:
            var action = new WAction(game, playable1);
            var actuator = new WTestPlayableActuator(action, playable2);
            game.openActuator(actuator);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 142, 142, zoomAndRotate0(416.6667, 255.6635)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            clickOnTrigger(game, actuator.trigger);
        then:
            assert(actuator.playableProcessed).equalsTo(playable2);
    });

    it("Checks multi images trigger of an actuators", () => {
        given:
            var {game, playable} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            var action = new WAction(game, playable);
            var actuator = new WTestMultiImagesActuator(action);
            resetDirectives(actuatorsLayer);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test1", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            resetDirectives(actuatorsLayer);
            actuator.trigger.changeImage(1);
            paint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test2", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
    });

    it("Checks mouse move over a trigger of an neighbor actuator", () => {
        given:
            var { game, map } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            var actuator = new CBTestHexNeighborActuator(map);
            game.openActuator(actuator);
            loadAllImages();
        when:
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(actuatorsLayer);
            var trigger = actuator.getHexTrigger(map.getHex(5, 5));
        then:
            assert(trigger.mayCaptureEvent({})).isTrue();
            assert(trigger.containsPoint(map.getHex(5, 5).location)).isTrue();
            assert(trigger.containsPoint(map.getHex(5, 6).location)).isFalse();
        when:
            mouseMoveOnTrigger(game, trigger);
        then:
            assert(trigger.mayCaptureEvent({})).isTrue();
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("hex", 50, 50, zoomAndRotate0(333.3333, 15.1026)));
            assertDirectives(actuatorsLayer, showActuatorTrigger("hex", 50, 50, zoomAndRotate0(333.3333, 111.327)));
            assertDirectives(actuatorsLayer, showOverActuatorTrigger("hex", 50, 50, zoomAndRotate0(416.6667, 63.2148)));
            assertDirectives(actuatorsLayer, showActuatorTrigger("hex", 50, 50, zoomAndRotate0(416.6667, 159.4391)));
            assertDirectives(actuatorsLayer, showActuatorTrigger("hex", 50, 50, zoomAndRotate0(500, 15.1026)));
            assertDirectives(actuatorsLayer, showActuatorTrigger("hex", 50, 50, zoomAndRotate0(500, 111.327)));
            assertNoMoreDirectives(actuatorsLayer);
    });

    it("Checks mouse move over a trigger of an ghost actuator", () => {
        given:
            var { game, map } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            var actuator = new CBTestHexGhostActuator(map);
            game.openActuator(actuator);
            loadAllImages();
        when:
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(actuatorsLayer);
            var trigger = actuator.getHexTrigger(map.getHex(5, 5));
        then:
            assert(trigger.mayCaptureEvent({})).isTrue();
        when:
            mouseMoveOnTrigger(game, trigger);
        then:
            assert(trigger.mayCaptureEvent({})).isTrue();
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showOverActuatorTrigger("hex", 50, 50, zoomAndRotate0(416.6667, 63.2148)));
            assertNoMoreDirectives(actuatorsLayer);
        when:
            var otherTrigger = actuator.getHexTrigger(map.getHex(5, 6));
            resetDirectives(actuatorsLayer);
            mouseMoveOnTrigger(game, otherTrigger);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showOverActuatorTrigger("hex", 50, 50, zoomAndRotate0(416.6667, 159.4391)));
            assertNoMoreDirectives(actuatorsLayer);
    });

    class TestInsert extends WInsert {

        constructor() {
            super("./../images/inserts/test-insert.png", new Dimension2D(200, 300));
        }

    }

    it("Checks visibility level management on insert", () => {
        given:
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.setMenu();
        when:
            var insert = new TestInsert();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
        when:
            insert.open(game.board, new Point2D(150, 200));
            repaint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showInsert("test", 150, 200, 200, 300));
            assertNoMoreDirectives(widgetsLevel);
        when:
            game._insertLevelCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            insert.close();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
    });

    class TestAbstractInsert extends WAbstractInsert {

        constructor() {
            super("./../images/inserts/test-insert.png", new Dimension2D(200, 300));
            this.addFrame(new DInsertFrame(this, 0,
                Area2D.create(new Point2D(0, 0), new Dimension2D(200, 300)),
                Area2D.create(new Point2D(0, 0), new Dimension2D(400, 300))
            ));
        }

    }

    it("Checks visibility level management on abstract insert", () => {
        given:
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.setMenu();
        when:
            var insert = new TestAbstractInsert();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
        when:
            insert.open(game.board, new Point2D(150, 200));
            repaint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showInsert("test", 150, 200, 200, 300));
            assertNoMoreDirectives(widgetsLevel);
        when:
            game._insertLevelCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            insert.close();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(insert);
    });

    it("Checks mask that depends on the visibility level", () => {
        given:
            var game = new WGame(1);
            var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.start();
            game.setMenu();
            game._showCommand.action();
            executeAllAnimations();
        when:
            var mask = new WMask();
            resetDirectives(widgetsLevel);
            mask.open(game.board);
            paint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(mask);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showMask());
            assertNoMoreDirectives(widgetsLevel);
        when:
            game._insertLevelCommand.action();
            executeAllAnimations();
            resetDirectives(widgetsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
            ]);
        when:
            Memento.open();
            mask.close();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(mask);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).contains(mask);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).doesNotContain(mask);
    });

    function mouseMove(game, x, y) {
        var mouseEvent = createEvent("mousemove", {offsetX:x, offsetY:y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOnPlayable(game, counter) {
        let playableLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:playableLocation.x, offsetY:playableLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfPlayable(game, counter) {
        let playableArea = counter.artifact.viewportBoundingArea;
        var mouseEvent = createEvent("mousemove", {offsetX:playableArea.left-5, offsetY:playableArea.top});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    it("Checks appearance of ground playable", () => {
        given:
            var { game, map } = createBasicGame();
            var blaze = new CBTestActivableCounter("ground", game,["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));
            class BlazeMarker extends WPieceImageArtifact {
                get layer() {
                    return WLevelBuilder.GLAYERS.MARKERS;
                }
            }
            var blazeMarker = new BlazeMarker(blaze, "ground", [DImage.getImage("./../images/units/misc/blazeMarker.png")],
                new Point2D(10, 10), new Dimension2D(25, 25));
            blaze.element.addArtifact(blazeMarker);
            var [groundLayer, groundMarkerLayer] = getLayers(game.board, "hex-0", "hmarkers-0");
            var hex = map.getHex(4, 5);
        when:
            blaze.appendToMap(hex);
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showActiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
            assertClearDirectives(groundMarkerLayer)
            assert(getDirectives(groundMarkerLayer)).arrayEqualsTo([
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 338.2209, 125.9897)',
                    'shadowColor = #000000', 'shadowBlur = 10',
                    'drawImage(./../images/units/misc/blazeMarker.png, -12.5, -12.5, 25, 25)',
                'restore()'
            ]);
    });

    it("Checks playable appearance when mouse is over it", () => {
        given:
            var { game, playable } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOnPlayable(game, playable);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showOverTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfPlayable(game, playable);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            playable._select();
            paint(game);
            resetDirectives(unitsLayer);
            mouseMoveOnPlayable(game, playable);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfPlayable(game, playable);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
    });

    it("Checks that when the mouse is over a (one hex) counter, the ones above are retracted", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let counter1 = new WTestPlayable(player, game,"u1",  ["./../images/units/misc/counter1.png"]);
            let counter2 = new WTestPlayable(player, game,"u2",  ["./../images/units/misc/counter2.png"]);
            let counter3 = new WTestPlayable(player, game,"u3", ["./../images/units/misc/counter3.png"]);
            counter1.addToMap(map.getHex(4, 5));
            counter2.addToMap(map.getHex(4, 5));
            counter3.addToMap(map.getHex(4, 5));
            repaint(game);
            var [unitsLayer0, unitsLayer1, unitsLayer2] = getLayers(game.board, "units-0", "units-1", "units-2");
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showInactiveFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertDirectives(unitsLayer2, showInactiveFakePiece("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 343-71/2+5, 101-71/2+5); // On counter2 but not counter3
            paint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showInactiveFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showOverFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assert(getDirectives(unitsLayer2, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showInactiveFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertClearDirectives(unitsLayer2);
            assertDirectives(unitsLayer2, showInactiveFakePiece("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
    });

    it("Checks that a retracted counter reappears after a period of time", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let counter1 = new WTestPlayable(player, game,"u1",  ["./../images/units/misc/counter1.png"]);
            let counter2 = new WTestPlayable(player, game,"u2", ["./../images/units/misc/counter2.png"]);
            counter1.addToMap(map.getHex(4, 5));
            counter2.addToMap(map.getHex(4, 5));
            repaint(game);
            var [unitsLayer1] = getLayers(game.board, "units-1");
        then:
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
        when:
            resetDirectives(unitsLayer1);
            mouseMove(game, 333-71/2+5, 111-71/2+5); // On counter0 but not counter1
            paint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertNoMoreDirectives(unitsLayer1);
        when:
            executeTimeouts();
            repaint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that moving on a retracted counter reinit the reappearance delay", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let counter1 = new WTestPlayable(player, game,"u1", ["./../images/units/misc/counter1.png"]);
            let counter2 = new WTestPlayable(player, game,"u2", ["./../images/units/misc/counter2.png"]);
            counter1.addToMap(map.getHex(4, 5));
            counter2.addToMap(map.getHex(4, 5));
            mouseMove(game, 333-71/2+5, 111-71/2+5); // On counter0 but not counter1
            executeTimeouts(500);
            repaint(game);
            var [unitsLayer1] = getLayers(game.board, "units-1");
        then:
            assertClearDirectives(unitsLayer1);
            assertNoMoreDirectives(unitsLayer1);
        when:
            mouseMove(game, 333-71/2+4, 111-71/2+4); // On counter0 but not counter1
            executeTimeouts(600);
            repaint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertNoMoreDirectives(unitsLayer1);
        when:
            executeTimeouts(600);
            repaint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that when the mouse is over a actuator's (playable) trigger, the playables above are retracted", () => {
        given:
            var { game, playable1, playable2 } = create2PlayablesTinyGame();
            playable2.hexLocation = playable1.hexLocation;
            var action = new WAction(game, playable1);
            var actuator = new WTestPlayableActuator(action, playable1);
            game.openActuator(actuator);
            game.start();
            loadAllImages();
            var [unitsLayer0, actuatorsLayer0, unitsLayer1] = getLayers(game.board, "units-0", "actuators-0", "units-1");
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer0);
            assertDirectives(actuatorsLayer0, showActuatorTrigger("test", 142, 142, zoomAndRotate0(416.6667, 159.4391)))
            assertNoMoreDirectives(actuatorsLayer0);
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showTroop("misc/unit1", zoomAndRotate0(416.6667, 159.4391)));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showTroop("misc/unit2", zoomAndRotate0(426.4418, 149.664)));
            assertNoMoreDirectives(unitsLayer1);
        when:
            resetDirectives(unitsLayer1);
            mouseMove(game, 417-71/2+5, 159-71/2+5); // On counter2's actuator but not counter3
            paint(game);
        then:
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(unitsLayer1);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showTroop("misc/unit2", zoomAndRotate0(426.4418, 149.664)));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that when a playable is retracted, its actuator is retracted too", () => {
        given:
            var { game, playable1, playable2 } = create2PlayablesTinyGame();
            playable2.hexLocation = playable1.hexLocation;
            var action = new WAction(game, playable1);
            var actuator = new WTestPlayableActuator(action, playable2);
            game.openActuator(actuator);
            game.start();
            loadAllImages();
            var [unitsLayer0, actuatorsLayer1, unitsLayer1] = getLayers(game.board, "units-0", "actuators-1", "units-1");
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer1);
            assertDirectives(actuatorsLayer1, showActuatorTrigger("test", 142, 142, zoomAndRotate0(426.4418, 149.664)))
            assertNoMoreDirectives(actuatorsLayer1);
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showTroop("misc/unit1", zoomAndRotate0(416.6667, 159.4391)));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showTroop("misc/unit2", zoomAndRotate0(426.4418, 149.664)));
            assertNoMoreDirectives(unitsLayer1);
        when:
            mouseMove(game, 417-71/2+5, 159-71/2+5); // On counter1 but not counter2
            repaint(game);
        then:
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([]);
            assert(getDirectives(actuatorsLayer1, 4)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer1, actuatorsLayer1);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showTroop("misc/unit2", zoomAndRotate0(426.4418, 149.664)));
            assertNoMoreDirectives(unitsLayer1);
            assertClearDirectives(actuatorsLayer1);
            assertDirectives(actuatorsLayer1, showActuatorTrigger("test", 142, 142, zoomAndRotate0(426.4418, 149.664)))
            assertNoMoreDirectives(actuatorsLayer1);
    });

    it("Checks that when the mouse is over a formation, the above counters are retracted", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, game,["./../images/units/misc/formation1.png"]);
            formation1.angle = 90;
            let counter2 = new WTestPlayable(player, game,"u1",["./../images/units/misc/counter2.png"]);
            let counter3 = new WTestPlayable(player, game, "u2", ["./../images/units/misc/counter3.png"]);
            formation1.addToMap(new WHexSideId(map.getHex(4, 5), map.getHex(4, 6)));
            counter2.addToMap(map.getHex(4, 5));
            counter3.addToMap(map.getHex(4, 6));
            repaint(game);
            var [formationsLayer0, unitsLayer1] = getLayers(game.board, "formations-0", "units-1");
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showFormation("misc/formation1", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer0);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
            assertNoMoreDirectives(unitsLayer1);
        when:
            resetDirectives(formationsLayer0, unitsLayer1);
            mouseMove(game, 333-71/2+5, 159-142/2+5); // On formation1 but not on counter2 or counter3
            paint(game);
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showOverFormation("misc/formation1", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer0);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(formationsLayer0, unitsLayer1);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showFormation("misc/formation1", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer0);
            assertNoMoreDirectives(formationsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showInactiveFakePiece("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that clicking on a playable select the playable ", () => {
        given:
            var { game, player, playable } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var actionLaunched = false;
            player.launchPlayableAction = function(playable, point) {
                actionLaunched = true;
            }
        when:
            resetDirectives(unitsLayer);
            clickOnPiece(game, playable)
        then:
            assert(game.selectedPlayable).equalsTo(playable);
            assert(actionLaunched).isTrue();
            loadAllImages();
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:   // Check that "reselecting" an already selected playable relaunch action
            actionLaunched = false;
            clickOnPiece(game, playable);
        then:
            assert(game.selectedPlayable).equalsTo(playable);
            assert(actionLaunched).isTrue();
    });

    function showMarker(image, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #000000", "shadowBlur = 10",
                `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
            "restore()"
        ];
    }

    class TestOptionImageArtifact extends WPieceImageArtifact {

        constructor(...args) {
            super(...args);
        }

        get slot() {
            return this.piece.slot;
        }

        get layer() {
            return this.piece.owner.formationNature ? WLevelBuilder.ULAYERS.FOPTIONS : WLevelBuilder.ULAYERS.OPTIONS;
        }

    }

    class CBTestOption extends HexLocatableMixin(PlayableMixin(WPiece)) {

        constructor(owner, ...args) {
            super(...args);
            this.owner = owner;
        }

        createArtifact(levelName, images, position, dimension) {
            return new TestOptionImageArtifact(this, levelName, images, position, dimension);
        }

        get slot() {
            return this.owner.slot;
        }
    }

    it("Checks playable and option counters registration on layers", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let playable1 = new WTestPlayable(player, game, "u1", ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(playable1, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            playable1._element.addArtifact(marker);
            let playable2 = new WTestPlayable(player, game, "u2", ["./../images/units/misc/unit2.png"]);
            let spell = new WTestCounter(playable2, game,["./../images/units/misc/spell.png"]);
            let option = new CBTestOption(playable2, "units",  game, ["./../images/units/misc/option.png"], new Dimension2D(142, 142));
            option.artifact.option = option;
            option.playable = playable2;
            loadAllImages();
            var hexId = map.getHex(4, 5);
            playable1.addToMap(hexId, WStacking.TOP);
            playable2.addToMap(hexId, WStacking.TOP);
            spell.addToMap(hexId);
            option.addToMap(hexId);
            paint(game);
        when:
            var [unitsLayer0, markersLayer0, unitsLayer1, spellsLayer1, optionsLayer1] = getLayers(game.board,
                "units-0", "markers-0", "units-1", "spells-1", "options-1");
            repaint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showTroop("misc/unit1", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(markersLayer0);
            assertDirectives(markersLayer0, showMarker("misc/markers1", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(markersLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showTroop("misc/unit2", zoomAndRotate0(343.1085, 101.5518)));
            assertNoMoreDirectives(unitsLayer1);
            assertClearDirectives(spellsLayer1);
            assertDirectives(spellsLayer1, showInactiveFakePiece("misc/spell", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(spellsLayer1);
            assertClearDirectives(optionsLayer1);
            assertDirectives(optionsLayer1, showInactiveFakePiece("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(optionsLayer1);
    });

    it("Checks formations and formation's marker and options registration on layers", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new WTestPlayer("player1");
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, game,["./../images/units/misc/formation1.png"]);
            formation1.angle = 60;
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(formation1, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            formation1._element.addArtifact(marker);
            let formation2 = new CBTestFormation(player, game,["./../images/units/misc/formation2.png"]);
            formation2.angle = 60;
            let option = new CBTestOption(formation2, "units",  game, ["./../images/units/misc/option.png"],
                new Dimension2D(142, 142));
            option.artifact.option = option;
            option.playable = formation2;
            loadAllImages();
            var hexId = map.getHex(4, 5);
            var hexSideId = new WHexSideId(hexId, hexId.getNearHex(120))
            formation1.addToMap(hexSideId, WStacking.TOP);
            formation2.addToMap(hexSideId, WStacking.TOP);
            option.addToMap(hexId);
            paint(game);
        when:
            var [formationsLayer0, fmarkersLayer0, formationsLayer1, foptionsLayer1] = getLayers(game.board,
                "formations-0", "fmarkers-0", "formations-1", "foptions-1");
            repaint(game);
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showFormation("misc/formation1", zoomAndRotate60(375, 135.3831)));
            assertNoMoreDirectives(formationsLayer0);
            assertClearDirectives(fmarkersLayer0);
            assertDirectives(fmarkersLayer0, showMarker("misc/markers1", zoomAndRotate60(375, 135.3831)));
            assertNoMoreDirectives(fmarkersLayer0);
            assertClearDirectives(formationsLayer1);
            assertDirectives(formationsLayer1, showFormation("misc/formation2", zoomAndRotate60(379.8876, 130.4955)));
            assertNoMoreDirectives(formationsLayer1);
            assertClearDirectives(foptionsLayer1);
            assertDirectives(foptionsLayer1, showInactiveFakePiece("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(foptionsLayer1);
    });

    it("Checks playable selection/deselection appearance", () => {
        given:
            var { game, playable } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            resetDirectives(unitsLayer);
            playable._select();
            paint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            playable._unselect();
            paint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
    });

    it("Checks mark a playable as played without effectively playing it (useful for playable created on the fly)", () => {
        given:
            var {game, playable} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            playable.setPlayed();
        then:
            assert(playable.isActivated()).isTrue();
            assert(playable.isPlayed()).isTrue();
    });

    it("Checks played status of a playable when selection is changed or turn is changed", () => {
        given:
            var {game, player, playable1, playable2} = create2PlayablesTinyGame();
            player.launchPlayableAction = function(playable, point) {
                playable.launchAction(new WAction(game, playable));
            }
            player.canPlay = function() { return true; };
        when:
            game.changeSelection(playable1, dummyEvent);
            playable1.action.markAsStarted();
        then:
            assert(playable1.isActivated()).isTrue();
            assert(playable1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, playable2);
        then:
            assert(playable1.action).isDefined();
            assert(playable1.isActivated()).isTrue();
            assert(playable1.isPlayed()).isTrue();
        when:   // changing turn reset played status
            game.nextTurn();
        then:
            assert(playable1.action).isNotDefined();
            assert(playable1.isActivated()).isFalse();
            assert(playable1.isPlayed()).isFalse();
    });

    it("Checks conditions when turn is finishable", () => {
        given:
            var {game, player, playable1} = create2PlayablesTinyGame();
        when:
            player.canPlay = function() { return false; }
        then:
            assert(game.turnIsFinishable()).isFalse();
        when:
            player.canPlay = function() { return true; }
        then:
            assert(game.turnIsFinishable()).isTrue();
        when:
            game.canUnselectPlayable = function() { return false; }
        then:
            assert(game.turnIsFinishable()).isFalse();
        when:
            game.canUnselectPlayable = function() { return true; }
        then:
            assert(game.turnIsFinishable()).isTrue();
        when:
            playable1.isFinishable = function() { return false; }
        then:
            assert(game.turnIsFinishable()).isFalse();
        when:
            playable1.isFinishable = function() { return true; }
        then:
            assert(game.turnIsFinishable()).isTrue();
     });

    it("Checks CBHexCounter features", () => {
        given:
            var { game } = createBasicGame();
            var TestBlaze = class extends WHexCounter {
                constructor() {super("ground", game, ["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));}
                static fromSpecs(specs, context) {
                    return new TestBlaze();
                }
            }
            var TestMagic = class extends WHexCounter {
                constructor() {super("ground", game, ["./../images/units/misc/spell.png"], new Dimension2D(50, 50));}
                static fromSpecs(specs, context) {
                    return new TestMagic();
                }
            }
        when:
            WHexCounter.registerTokenType("blaze", TestBlaze);
            WHexCounter.registerTokenType("magic", TestMagic);
            let context = new Map();
            context.game = game;
            var blaze = WHexCounter.fromSpecs({type:"blaze", id:2, version:3}, context);
        then:
            assert(blaze._oid).equalsTo(2);
            assert(blaze._oversion).equalsTo(3);
            assert(blaze.artifact.images[0].path).equalsTo( "./../images/units/misc/blaze.png");
            assert(blaze.artifact.dimension).objectEqualsTo( {w:50, h:50});
        });

        it("Checks playable sorting on Hex", () => {
        given:
            var { game, map } = createBasicGame();
            var spell = new WHexCounter("ground", game, ["./../images/units/misc/spell.png"], new Dimension2D(50, 50));
            spell.spellNature = true;
            var blaze = new WHexCounter("ground", game, ["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));
            blaze.elementNature = true;
            var [hexLayer0] = getLayers(game.board, "hex-0");
            var hex = map.getHex(4, 5);
        when:
            spell.appendToMap(hex);
            blaze.appendToMap(hex);
            repaint(game);
            var [hexLayer1] = getLayers(game.board, "hex-1");
        then:
            assertClearDirectives(hexLayer0);
            assertDirectives(hexLayer0, showInactiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertDirectives(hexLayer1, showInactiveFakePiece("misc/spell", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
        when:
            var trap = new WHexCounter("ground", game, ["./../images/units/misc/trap.png"], new Dimension2D(50, 50));
            trap.featureNature = true;
            trap.appendToMap(map.getHex(4, 5));
            repaint(game);
            var [hexLayer2] = getLayers(game.board, "hex-2");
        then:
            assert(hex.counters).unorderedArrayEqualsTo([spell, blaze, trap]);
            assertClearDirectives(hexLayer0);
            assertDirectives(hexLayer0, showInactiveFakePiece("misc/trap", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertClearDirectives(hexLayer1);
            assertDirectives(hexLayer1, showInactiveFakePiece("misc/blaze", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
            assertDirectives(hexLayer2, showInactiveFakePiece("misc/spell", zoomAndRotate0(313.783, 101.5518)));
            assertNoMoreDirectives(hexLayer2);
    });

    class TestActivableCounterImageArtifact extends ActivableArtifactMixin(WPieceImageArtifact) {

        constructor(playable, ...args) {
            super(playable, ...args);
        }

        get game() {
            return this.piece.game;
        }

        get slot() {
            return this.piece.slot;
        }

        get layer() {
            return WLevelBuilder.GLAYERS.COUNTERS;
        }

    }

    class CBTestActivableCounter extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(WPiece)))) {

        constructor(layer, game, paths, dimension) {
            super(layer, game, paths, dimension);
        }

        createArtifact(levelName, images, position, dimension) {
            return new TestActivableCounterImageArtifact(this, levelName, images, position, dimension);
        }

    }

    it("Checks activation/desactivation of an artifact", () => {
        given:
            var { game, map } = createBasicGame();
            var blaze = new CBTestActivableCounter("ground", game, ["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));
            blaze.elementNature = true;
            var [groundLayer] = getLayers(game.board, "hex-0");
            var hex = map.getHex(4, 5);
        when:
            blaze.appendToMap(hex);
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showActiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
        when:
            Memento.open();
            blaze.artifact.desactivate();
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showInactiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
        when:
            Memento.open();
            blaze.artifact.activate();
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showActiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showInactiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(groundLayer);
            assertDirectives(groundLayer, showActiveFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
    });

    function createPlayableAndCounterTinyGame() {
        var { game, map, arbitrator } = createBasicGame();
        var player = new WTestPlayer("player1");
        game.addPlayer(player);
        let playable = new WTestPlayable(player, game,"u1", ["./../images/units/misc/unit1.png"]);
        playable.addToMap(map.getHex(5, 6));
        let counter = new WTestHexCounter(game);
        counter.addToMap(map.getHex(5, 7));
        loadAllImages();
        return {game, map, arbitrator, playable, counter, player};
    }

    it("Checks game export", () => {
        given:
            var {game} = createPlayableAndCounterTinyGame();
            var context = new Map();
            var specs = {
                "id":1,"version":0,
                "currentPlayerIndex":0,"currentTurn":0,
                "players":[{
                    "version":0,"identity":{"version":0,"name":"player1"},
                    "playables":[{
                        "version":0,"positionCol":5,"positionRow":6,"name":"u1",
                        "paths":["./../images/units/misc/unit1.png"]
                    }]
                }],
                "map":{
                    "version":0,
                    "boards":[{
                        "version":0,"col":0,"row":0,"path":"./../images/maps/map.png","invert":false
                    }]
                },
                "locations":[{
                    "version":0,"col":5,"row":6,
                    "pieces":[{
                        "version":0,"positionCol":5,"positionRow":6,"name":"u1",
                        "paths":["./../images/units/misc/unit1.png"]
                    }]
                },{
                    "version":0,"col":5,"row":7,
                    "pieces":[{
                        "version":0,"positionCol":5,"positionRow":7, "type": "counter"
                    }]
                }]
            };
        then:
            //console.log(JSON.stringify(game.toSpecs(context)));
            //console.log(JSON.stringify(specs));
            assert(clean(game.toSpecs(context))).objectEqualsTo(specs);
    });

    it("Checks game import", () => {
        given:
            WHexCounter.registerTokenType("counter", WTestHexCounter);
            var game = new WGame(1);
            var context = new Map();
            var specs = {
                "id":1,"version":0,
                "currentPlayerIndex":0,"currentTurn":0,
                "players":[{
                    "version":0,"identity":{"version":0,"name":"player1"},
                    "playables":[{
                        "version":0,"positionCol":5,"positionRow":6,"name":"u1",
                        "paths":["./../images/units/misc/unit1.png"]
                    }]
                }],
                "map":{
                    "version":0,
                    "boards":[{
                        "version":0,"col":0,"row":0,"path":"./../images/maps/map.png","invert":false
                    }]
                },
                "locations":[{
                    "version":0,"col":5,"row":6,
                    "pieces":[{
                        "version":0,"positionCol":5,"positionRow":6,"name":"u1",
                        "paths":["./../images/units/misc/unit1.png"]
                    }]
                },{
                    "version":0,"col":5,"row":7,
                    "pieces":[{
                        "version":0, "type": "counter"
                    }]
                }]
            };
        when:
            context.playerCreator = (name, path)=> {
                return new WTestPlayer(name, path);
            }
            game.fromSpecs(clean(specs), context);
        then:
            //console.log(JSON.stringify(clean(game.toSpecs(context))));
            //console.log(JSON.stringify(specs));
            context = new Map();
            assert(clean(game.toSpecs(context))).objectEqualsTo(specs);
    });

});