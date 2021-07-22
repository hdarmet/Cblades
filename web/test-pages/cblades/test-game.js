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
    CBHexSideId,
    CBMoveType, CBHexId
} from "../../jslib/cblades/map.js";
import {
    CBGame,
    CBActionActuator,
    CBAbstractPlayer,
    CBAbstractArbitrator,
    CBCounter,
    CBAction,
    CBAbstractUnit,
    CBActuatorImageTrigger,
    CBPlayable,
    CBCounterImageArtifact,
    CBUnitActuatorTrigger,
    RetractableActuatorMixin, CBActuatorMultiImagesTrigger, WidgetLevelMixin, CBMask, CBActuator
} from "../../jslib/cblades/game.js";
import {
    DBoard, DElement
} from "../../jslib/board.js";
import {
    Dimension2D,
    Point2D
} from "../../jslib/geometry.js";
import {
    DInsert,
    DPopup
} from "../../jslib/widget.js";
import {
    clickOnCounter,
    mouseMoveOnTrigger,
    mouseMoveOutOfTrigger,
    paint,
    repaint,
    clickOnTrigger,
    showTroop,
    zoomAndRotate0,
    showMap,
    showActuatorTrigger,
    showSelectedActuatorTrigger,
    showGameCommand,
    showGameInactiveCommand,
    showInsert,
    showMask,
    zoomAndRotate60,
    showMarker,
    showSelectedTroop,
    showOverTroop, showFormation, zoomAndRotate90, showSelectedFormation, showOverFormation, executeAllAnimations
} from "./interactive-tools.js";

class CBTestUnit extends CBAbstractUnit {
    constructor(player, paths) {
        super(paths, new Dimension2D(142, 142));
        this.player = player;
    }

    updatePlayed() {
        this.status = "played";
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }
}

class CBTestFormation extends CBAbstractUnit {

    constructor(player, paths) {
        super(paths, new Dimension2D(142*2, 142));
        this.player = player;
        Object.defineProperty(this.artifact, "layer", {
            get: function () {
                return CBGame.ULAYERS.FORMATIONS;
            }
        });
    }

    get formationNature() {
        return true;
    }

    updatePlayed() {
        this.status = "played";
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }
}

class CBTestActuator extends CBActionActuator {

    constructor(action) {
        super(action);
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new CBActuatorImageTrigger(this, "actuators", image,
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

class CBTestMultiImagesActuator extends CBActionActuator {

    constructor(action) {
        super(action);
        let images = [
            DImage.getImage("./../images/actuators/test1.png"),
            DImage.getImage("./../images/actuators/test2.png")
        ];
        let imageArtifacts = [];
        this.trigger = new CBActuatorMultiImagesTrigger(this, "actuators", images,
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
}

class CBTestUnitActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, unit) {
        super(action);
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new CBUnitActuatorTrigger(this, unit, "units", image,
            new Point2D(0, 0), new Dimension2D(142, 142));
        this.trigger.position = Point2D.position(action.unit.location, unit.location, 1);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    onMouseClick(trigger, event) {
        this.unitProcessed = trigger.unit;
    }

}

function prepareTinyGame() {
    var game = new CBGame();
    var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    return {game, map};
}

function createTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBAbstractArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBAbstractPlayer();
    game.addPlayer(player);
    var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
    game.addUnit(unit, map.getHex(5, 8));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, map, unit };
}

function showFakeInsert(x, y, w, h) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 15",
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
            "fillStyle = #FFFFFF",
            `fillRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

function showFakeCounter(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 15",
            `drawImage(/CBlades/images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

function showOverFakeCounter(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 15",
            `drawImage(/CBlades/images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

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
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units-0");
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
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units-0");
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
                    "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.7331, 0, 0, 0.7331, 625, 427.8317)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(actuator1.trigger.actuator).equalsTo(actuator1);
            assert(actuator1.unit).equalsTo(unit);
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

    it("Checks actuators management", () => {
        given:
            var {game, unit} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.setMenu();
            game._showCommand.action();
        when:
            var action = new CBAction(game, unit);
            var actuator = new CBTestActuator(action);
            actuator.enableHide(false);
            resetDirectives(actuatorsLayer);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game.closeActuators();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
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

    it("Checks that actuator closing may be preempted", () => {
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
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            game._insertLevelCommand.action();
            resetDirectives(actuatorsLayer);
            repaint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
            "save()",
            "restore()"
        ]);
    });

    it("Checks mouse move over a trigger of an actuator", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            var action = new CBAction(game, unit);
            var actuator = new CBTestActuator(action);
            game.openActuator(actuator);
            loadAllImages();
        when:
            resetDirectives(actuatorsLayer);
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
            paint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showSelectedActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOutOfTrigger(game, actuator.getTrigger());
            paint(game);
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 50, 50, zoomAndRotate0(416.6667, 351.8878)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            clickOnTrigger(game, actuator.getTrigger());
            assert(actuator.clicked).equalsTo(actuator.getTrigger());
    });

    it("Checks actuators trigger on unit", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
        when:
            var action = new CBAction(game, unit1);
            var actuator = new CBTestUnitActuator(action, unit2);
            resetDirectives(actuatorsLayer);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assertClearDirectives(actuatorsLayer);
            assertDirectives(actuatorsLayer, showActuatorTrigger("test", 142, 142, zoomAndRotate0(416.6667, 255.6635)))
            assertNoMoreDirectives(actuatorsLayer);
        when:
            clickOnTrigger(game, actuator.trigger);
        then:
            assert(actuator.unitProcessed).equalsTo(unit2);
    });

    it("Checks multi images trigger of an actuators", () => {
        given:
            var {game, unit} = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            var action = new CBAction(game, unit);
            var actuator = new CBTestMultiImagesActuator(action);
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

    it("Checks that clicking on the map re-centers the viewport ", () => {
        given:
            var game = new CBGame();
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

    it("Checks that a unit selection closes the actuators", () => {
        given:
            var { game, unit1, unit2, player } = create2UnitsTinyGame();
            player.launchUnitAction = function(unit, event) {};
            clickOnCounter(game, unit1);
            var action = new CBAction(game, unit1);
            var actuator = new CBTestActuator(action);
            game.openActuator(actuator);
            loadAllImages();
        then:
            assert(game.selectedUnit).equalsTo(unit1);
            assert(getTestActuator(game)).isDefined();
        when:
            clickOnCounter(game, unit2);
        then:
            assert(game.selectedUnit).equalsTo(unit2);
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

    it("Checks global push menu button", () => {
        given:
            var game = new CBGame();
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
            var game = new CBGame();
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
                var cbgameEdit = CBGame.edit;
                var editMode = false;
                CBGame.edit = function() {
                    editMode = !editMode;
                }
                var game = new CBGame();
                var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
                game.setMap(map);
                game.setMenu();
                game.start();
                var [commandsLayer] = getLayers(game.board, "widget-commands");
                loadAllImages();
                game._showCommand.action();
                executeAllAnimations();
            when:
                game._editorCommand.action();
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
                game._editorCommand.action();
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
            CBGame.edit = cbgameEdit;
        }
    });

    it("Checks full screen push menu button", () => {
        given:
            var game = new CBGame();
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
                    "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
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
                    "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
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

    class TestInsert extends WidgetLevelMixin(DInsert) {
        constructor(game) {
            super(game, "./../images/inserts/test-insert.png", new Dimension2D(200, 300));
        }
    }

    it("Checks visibility level management (on insert as example)", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.setMenu();
            game.start();
            game._showCommand.action();
            executeAllAnimations();
        when:
            var insert = new TestInsert(game);
        then:
            assert([...Mechanisms.manager._listeners]).notContains(insert);
        when:
            insert.open(game.board, new Point2D(150, 200));
            resetDirectives(widgetsLevel);
            repaint(game);
            loadAllImages();
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
            assertClearDirectives(widgetsLevel);
            assertDirectives(widgetsLevel, showInsert("test", 150, 200, 200, 300));
            assertNoMoreDirectives(widgetsLevel);
        when:
            game._insertLevelCommand.action();
            executeAllAnimations();
            resetDirectives(widgetsLevel);
            repaint(game);
        then:
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()", "restore()", "save()", "restore()"
            ]);
        when:
            Memento.open();
            insert.close();
        then:
            assert([...Mechanisms.manager._listeners]).notContains(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).contains(insert);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).notContains(insert);
    });

    it("Checks mask that depends on the visibility level", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.start();
            game.setMenu();
            game._showCommand.action();
            executeAllAnimations();
        when:
            var mask = new CBMask(game);
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
                "save()", "restore()"
            ]);
        when:
            Memento.open();
            mask.close();
        then:
            assert([...Mechanisms.manager._listeners]).notContains(mask);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).contains(mask);
        when:
            Memento.undo();
        then:
            assert([...Mechanisms.manager._listeners]).notContains(mask);
    });

    function mouseClickOnCounter(game, counter) {
        let counterLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:counterLocation.x, offsetY:counterLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    it("Checks counter basic appearance and features", () => {
        given:
            var { game } = prepareTinyGame();
            let counter = new CBCounter("ground", ["./../images/units/misc/counter.png"], new Dimension2D(50, 50));
            game.addCounter(counter, new Point2D(100, 200));
            game.start();
            loadAllImages();
            counter.angle = 45;
            var [hexLayer] = getLayers(game.board, "hex-0");
        when:
            resetDirectives(hexLayer);
            repaint(game);
        then:
            assert(counter.isShown()).isTrue();
            assert(counter.game).equalsTo(game);
            assert(counter.angle).equalsTo(45);
            assert(counter.element).is(DElement);
            assert(counter.element.artifacts[0]).equalsTo(counter.artifact);
            assert(counter.location.toString()).equalsTo("point(100, 200)");
            assert(counter.viewportLocation.toString()).equalsTo("point(548.8759, 507.5269)");
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakeCounter("misc/counter", [0.3456, 0.3456, -0.3456, 0.3456, 548.8759, 507.5269]));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            counter.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(counter.location.toString()).equalsTo("point(10, 20)");
            assert(counter.viewportLocation.toString()).equalsTo("point(504.8876, 419.5503)");
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakeCounter("misc/counter", [0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 419.5503]));
            assertNoMoreDirectives(hexLayer);
        when:
            resetDirectives(hexLayer);
            paint(game);
        then:
            assert(getDirectives(hexLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(hexLayer);
            counter.refresh();
            paint(game);
        then:
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakeCounter("misc/counter", [0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 419.5503]));
            assertNoMoreDirectives(hexLayer);
        when:
            mouseClickOnCounter(game, counter); // checks that tests does not crash
    });

    class CBTestPlayable extends CBPlayable {
        constructor(unit, layer, ...args) {
            super(...args);
            Object.defineProperty(this.artifact, "slot", {
                get: function () {
                    return unit.slot;
                }
            });
            Object.defineProperty(this.artifact, "layer", {
                get: function () {
                    return layer;
                }
            });
        }

    }

    class CBTestOption extends CBPlayable {
        constructor(unit, ...args) {
            super(...args);
            Object.defineProperty(this.artifact, "slot", {
                get: function () {
                    return unit.slot;
                }
            });
            Object.defineProperty(this.artifact, "layer", {
                get: function () {
                    return unit.formationNature ? CBGame.ULAYERS.FOPTIONS : CBGame.ULAYERS.OPTIONS;
                }
            });
        }

    }

    class CBTestMarker extends CBCounterImageArtifact {
        constructor(...args) {
            super(...args);
        }
        get layer() {
            return this.counter.formationNature ? CBGame.ULAYERS.FMARKERS : CBGame.ULAYERS.MARKERS;
        }
        get slot() {
            return this.counter.slot;
        }
    }

    it("Checks miscellaneous Aretifact methods ", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(unit, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            unit._element.addArtifact(marker);
            game.start();
            var hexId = map.getHex(4, 5);
            unit.addToMap(hexId, CBMoveType.BACKWARD);
        then:
            assert(marker.game).equalsTo(game);
    });

    it("Checks unit and option counters registration on layers", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit1 = new CBTestUnit(player, ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(unit1,"units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            unit1._element.addArtifact(marker);
            let unit2 = new CBTestUnit(player, ["./../images/units/misc/unit2.png"]);
            let spell = new CBTestPlayable(unit2, CBGame.ULAYERS.SPELLS, "units", ["./../images/units/misc/spell.png"],
                new Dimension2D(142, 142));
            let option = new CBTestOption(unit2, "units",  ["./../images/units/misc/option.png"],
                new Dimension2D(142, 142));
            option.artifact.option = option;
            option.unit = unit2;
            loadAllImages();
            game.start();
            var hexId = map.getHex(4, 5);
            unit1.addToMap(hexId, CBMoveType.BACKWARD);
            unit2.addToMap(hexId, CBMoveType.BACKWARD);
            spell.addToMap(hexId);
            option.addToMap(hexId);
            paint(game);
        when:
            var [unitsLayer0, markersLayer0, unitsLayer1, spellsLayer1, optionsLayer1] = getLayers(game.board,
                "units-0", "markers-0", "units-1", "spells-1", "options-1");
            resetDirectives(unitsLayer0, markersLayer0, unitsLayer1, spellsLayer1, optionsLayer1);
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
            assertDirectives(spellsLayer1, showFakeCounter("misc/spell", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(spellsLayer1);
            assertClearDirectives(optionsLayer1);
            assertDirectives(optionsLayer1, showFakeCounter("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(optionsLayer1);
    });

    it("Checks formations and formation's marker and options registration on layers", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, ["./../images/units/misc/formation1.png"]);
            formation1.angle = 60;
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(formation1, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            formation1._element.addArtifact(marker);
            let formation2 = new CBTestFormation(player, ["./../images/units/misc/formation2.png"]);
            formation2.angle = 60;
            let option = new CBTestOption(formation2, "units",  ["./../images/units/misc/option.png"],
                new Dimension2D(142, 142));
            option.artifact.option = option;
            option.unit = formation2;
            loadAllImages();
            game.start();
            var hexId = map.getHex(4, 5);
            var hexSideId = new CBHexSideId(hexId, hexId.getNearHex(120))
            formation1.addToMap(hexSideId, CBMoveType.BACKWARD);
            formation2.addToMap(hexSideId, CBMoveType.BACKWARD);
            option.addToMap(hexId);
            paint(game);
        when:
            var [formationsLayer0, fmarkersLayer0, formationsLayer1, foptionsLayer1] = getLayers(game.board,
                "formations-0", "fmarkers-0", "formations-1", "foptions-1");
            resetDirectives(formationsLayer0, fmarkersLayer0, formationsLayer1, foptionsLayer1);
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
            assertDirectives(foptionsLayer1, showFakeCounter("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(foptionsLayer1);
    });

    it("Checks unit selection/deselection appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        when:
            resetDirectives(unitsLayer);
            unit.select();
            paint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            unit.unselect();
            paint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
    });

    it("Checks unit addition and removing from game and map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var hexId = map.getHex(4, 5);
        when:
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            game.removeUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set([]));
            assert(unit.hexLocation).isNotDefined();
        when:
            game.appendUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            Memento.open();
            game.deleteUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.hexLocation).isNotDefined();
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.hexLocation).isNotDefined();
    });

    it("Checks unit list from game", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit1 = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            let unit2 = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
        when:
            game.addUnit(unit1, map.getHex(4, 5));
            game.addUnit(unit2, map.getHex(5, 4));
            let counter = new CBCounter("ground", ["./../images/units/misc/counter.png"], new Dimension2D(50, 50));
            game.addCounter(counter, new Point2D(100, 200));
        then:
            assert(game.units).arrayEqualsTo([unit1, unit2]);
    });

    it("Checks playable addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("ground", ["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            game.start();
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "hex-0");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(hexLayer);
            playable.addToMap(hexId);
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 121.1022)));
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

    it("Checks getByType method", () => {
        given:
            var { game, map } = prepareTinyGame();
            class PlayableOne extends CBPlayable {};
            class PlayableTwo extends CBPlayable {};
            class PlayableThree extends CBPlayable {};
            var playable1 = new PlayableOne("ground", ["./../images/units/misc/one.png"], new Dimension2D(50, 50));
            var playable2 = new PlayableTwo("ground", ["./../images/units/misc/two.png"], new Dimension2D(50, 50));
            game.start();
            var hexId = map.getHex(4, 5);
        when:
            playable1.addToMap(hexId);
            playable2.addToMap(hexId);
        then:
            assert(CBPlayable.getByType(hexId, PlayableOne)).equalsTo(playable1);
            assert(CBPlayable.getByType(hexId, PlayableThree)).isNotDefined();
    });

    it("Checks playable addition and removing on a Hex (undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("ground", ["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            game.start();
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "hex-0");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(hexLayer);
            playable.appendToMap(hexId);
            repaint(game);
        then:
            assert(hexId.playables).arrayEqualsTo([playable]);
            assertClearDirectives(hexLayer);
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 121.1022)));
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
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 121.1022)));
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

    it("Checks playable addition and removing on a Hex Side (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("ground", ["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            game.start();
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "hex-0");
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
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 169.2143)));
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
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("ground", ["./../images/units/misc/playable.png"], new Dimension2D(50, 50));
            game.start();
            loadAllImages();
            var [hexLayer] = getLayers(game.board, "hex-0");
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
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 169.2143)));
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
            assertDirectives(hexLayer, showFakeCounter("misc/playable", zoomAndRotate0(333.3333, 169.2143)));
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

    it("Checks unit addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(unitsLayer);
            unit.addToMap(hexId);
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            unit.removeFromMap();
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks unit addition and removing on a Hex (undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(unitsLayer);
            unit.appendToMap(hexId);
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            Memento.open();
            unit.deleteFromMap();
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks unit addition and removing on a Hex Side (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestFormation(player, ["./../images/units/misc/formation.png"]);
            unit.angle = 90;
            game.start();
            loadAllImages();
            var [formationsLayer] = getLayers(game.board, "formations-0");
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            resetDirectives(formationsLayer);
            unit.addToMap(hexSideId);
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(formationsLayer);
            assertDirectives(formationsLayer, showFormation("misc/formation", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer);
        when:
            resetDirectives(formationsLayer);
            unit.removeFromMap();
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assertNoMoreDirectives(formationsLayer, 4);
    });

    it("Checks unit addition and removing on a Hex Side (undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestFormation(player, ["./../images/units/misc/formation.png"]);
            unit.angle = 90;
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "formations-0");
            var hexId1 = map.getHex(4, 5);
            var hexId2 = map.getHex(4, 6);
            var hexSideId = new CBHexSideId(hexId1, hexId2);
        when:
            resetDirectives(unitsLayer);
            unit.appendToMap(hexSideId);
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showFormation("misc/formation", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            Memento.open();
            unit.deleteFromMap();
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([unit]);
            assert(hexId2.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.isOnBoard()).equalsTo(true);
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showFormation("misc/formation", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            Memento.undo();
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks unit addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var hexId = map.getHex(4, 5);
        when:
            resetDirectives(unitsLayer);
            unit.hexLocation = hexId;
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(333.3333, 111.327)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            var hexId2 = map.getHex(4, 6);
            unit.hexLocation = hexId2;
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(333.3333, 207.5513)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            unit.hexLocation = null;
            repaint(game);
        then:
            assert(game.counters).setEqualsTo(new Set());
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks unit addition and removing from game and map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["./../images/units/misc/unit.png"]);
            game.start();
            loadAllImages();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var hexId = map.getHex(4, 5);
        when:
            game.addUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            game.removeUnit(unit);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set([]));
            assert(unit.hexLocation).isNotDefined();
        when:
            game.appendUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            Memento.open();
            game.deleteUnit(unit, hexId);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.hexLocation).isNotDefined();
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([unit]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([unit]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(unit.hexLocation).equalsTo(hexId);
        when:
            Memento.undo();
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(map.getUnitsOnHex(hexId)).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.hexLocation).isNotDefined();
    });

    function create2UnitsTinyGame(start = true) {
        var { game, map } = prepareTinyGame();
        let player = new CBAbstractPlayer();
        game.addPlayer(player);
        let unit1 = new CBTestUnit(player,["./../images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 6));
        let unit2 = new CBTestUnit(player,["./../images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 7));
        if (start) {
            game.start();
            loadAllImages();
        }
        return {game, map, unit1, unit2, player};
    }

    it("Checks unit selection/deselection authorizations", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
        then:
            assert(game.canSelectUnit(unit1)).isTrue();
            assert(game.mayChangeSelection(unit1)).isTrue();
        when:
            unit1.select();
        then:
            assert(game.selectedUnit).equalsTo(unit1);
            assert(game.focusedUnit).isNotDefined();
        when: // if an item is "focused", selection of another item is not possible
            game.setFocusedUnit(unit1);
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
            assert(game.canSelectUnit(unit2)).isFalse();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // can select focused unit
            game.setFocusedUnit(unit2);
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
            assert(game.canSelectUnit(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isFalse();
        when: // No focused unit : selection is possible
            game.setFocusedUnit();
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
            assert(game.canSelectUnit(unit2)).isTrue();
            assert(game.mayChangeSelection(unit2)).isTrue();
        when:
            unit2.select();
        then:
            assert(game.selectedUnit).equalsTo(unit2);
        when:
            unit2.unselect();
        then:
            assert(game.selectedUnit).isNotDefined();
    });

    it("Checks unit selection/deselection regarding actions", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
            var action = new CBAction(game, unit1);
            action.isFinishable = function() { return false;};
        when:
            unit1.select();
            unit1.launchAction(action);
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
        when:
            action.markAsStarted();
        then:
            assert(game.canUnselectUnit(unit1)).isFalse();
        when:
            action.markAsFinished();
        then:
            assert(game.canUnselectUnit(unit1)).isTrue();
    });

    it("Checks unit destruction", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
            unit1.select();
            game.setFocusedUnit(unit1);
        then:
            assert(unit1.isOnBoard()).isTrue();
            assert(game.focusedUnit).equalsTo(unit1);
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit1.destroy();
        then:
            assert(unit1.isOnBoard()).isFalse();
            assert(game.focusedUnit).isNotDefined();
            assert(game.selectedUnit).isNotDefined();
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
            assert(unit.hasBeenActivated()).isFalse();
        when:
            Memento.open();
            action.markAsStarted();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
            assert(call).equalsTo(1);
        when:
            Memento.open();
            action.markAsFinished();
        then:
            assert(action.isStarted()).isTrue();
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
            assert(action.isFinalized()).isFalse();
            assert(call).equalsTo(2);
        when:
            Memento.open();
            var finalized = false;
            action.finalize(()=>{finalized = true;});
        then:
            assert(action.isFinished()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
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
            assert(unit.hasBeenActivated()).isTrue();
            assert(action.isFinished()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.action).equalsTo(action);
            assert(action.isStarted()).isFalse();
            assert(unit.hasBeenActivated()).isFalse();
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
            assert(unit.hasBeenActivated()).isFalse();
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
            assert(unit.hasBeenActivated()).isFalse();
            assert(call).equalsTo(1);
    });

    let dummyEvent = {offsetX:0, offsetY:0};

    function mouseMove(game, x, y) {
        var mouseEvent = createEvent("mousemove", {offsetX:x, offsetY:y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOnCounter(game, counter) {
        let unitLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfCounter(game, counter) {
        let unitArea = counter.artifact.viewportBoundingArea;
        var mouseEvent = createEvent("mousemove", {offsetX:unitArea.left-5, offsetY:unitArea.top});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    it("Checks unit appearance when mouse is over it", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            paint(game);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOnCounter(game, unit);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showOverTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfCounter(game, unit);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            unit.select();
            paint(game);
            resetDirectives(unitsLayer);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
    });

    it("Checks that when the mouse is over a (one hex) counter, the ones above are retracted", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let counter1 = new CBTestUnit(player, ["./../images/units/misc/counter1.png"]);
            let counter2 = new CBTestUnit(player, ["./../images/units/misc/counter2.png"]);
            let counter3 = new CBTestUnit(player, ["./../images/units/misc/counter3.png"]);
            game.addUnit(counter1, map.getHex(4, 5));
            game.addUnit(counter2, map.getHex(4, 5));
            game.addUnit(counter3, map.getHex(4, 5));
            game.start();
            loadAllImages();
            var [unitsLayer0] = getLayers(game.board, "units-0");
            paint(game);
            var [unitsLayer1, unitsLayer2] = getLayers(game.board, "units-1", "units-2");
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showFakeCounter("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertDirectives(unitsLayer2, showFakeCounter("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 343-71/2+5, 101-71/2+5); // On counter2 but not counter3
            paint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showFakeCounter("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showOverFakeCounter("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assert(getDirectives(unitsLayer2, 4)).arrayEqualsTo([
                "save()",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showFakeCounter("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertClearDirectives(unitsLayer2);
            assertDirectives(unitsLayer2, showFakeCounter("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
    });

    it("Checks that when the mouse is over a actuator's (unit) trigger, the units above are retracted", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
            unit2.hexLocation = unit1.hexLocation;
            var action = new CBAction(game, unit1);
            var actuator = new CBTestUnitActuator(action, unit1);
            game.openActuator(actuator);
            game.start();
            loadAllImages();
            var [unitsLayer0, actuatorsLayer0, unitsLayer1] = getLayers(game.board, "units-0", "actuators-0", "units-1");
            resetDirectives(unitsLayer0, actuatorsLayer0, unitsLayer1);
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
                "save()",
                "restore()"
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

    it("Checks that when the mouse is a unit is retracted, its actuator is retracted too", () => {
        given:
            var { game, unit1, unit2 } = create2UnitsTinyGame();
            unit2.hexLocation = unit1.hexLocation;
            var action = new CBAction(game, unit1);
            var actuator = new CBTestUnitActuator(action, unit2);
            game.openActuator(actuator);
            game.start();
            loadAllImages();
            var [unitsLayer0, actuatorsLayer1, unitsLayer1] = getLayers(game.board, "units-0", "actuators-1", "units-1");
            resetDirectives(unitsLayer0, actuatorsLayer1, unitsLayer1);
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
            resetDirectives(unitsLayer1, actuatorsLayer1);
            mouseMove(game, 417-71/2+5, 159-71/2+5); // On counter1 but not counter2
            paint(game);
        then:
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer1, 4)).arrayEqualsTo([
                "save()",
                "restore()"
            ]);
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
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, ["./../images/units/misc/formation1.png"]);
            formation1.angle = 90;
            let counter2 = new CBTestUnit(player, ["./../images/units/misc/counter2.png"]);
            let counter3 = new CBTestUnit(player, ["./../images/units/misc/counter3.png"]);
            game.addUnit(formation1, new CBHexSideId(map.getHex(4, 5), map.getHex(4, 6)));
            game.addUnit(counter2, map.getHex(4, 5));
            game.addUnit(counter3, map.getHex(4, 6));
            game.start();
            loadAllImages();
            var [formationsLayer0] = getLayers(game.board, "formations-0");
            paint(game);
            var [unitsLayer1] = getLayers(game.board, "units-1");
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showFormation("misc/formation1", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer0);
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
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
                "save()",
                "restore()",
                "save()",
                "restore()"
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
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showFakeCounter("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var { game, player, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var actionLaunched = false;
            player.launchUnitAction = function(unit, event) {
                actionLaunched = true;
            }
        when:
            resetDirectives(unitsLayer);
            mouseClickOnCounter(game, unit)
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
            loadAllImages();
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:   // Check that "reselecting" an already selected unit relaunch action
            actionLaunched = false;
            mouseClickOnCounter(game, unit);
        then:
            assert(game.selectedUnit).equalsTo(unit);
            assert(actionLaunched).isTrue();
    });

    function create2PlayersTinyGame() {
        var { game, map } = prepareTinyGame();
        let player1 = new CBAbstractPlayer();
        game.addPlayer(player1);
        let player2 = new CBAbstractPlayer();
        game.addPlayer(player2);
        let unit0 = new CBTestUnit(player1, ["./../images/units/misc/unit0.png"]);
        game.addUnit(unit0, map.getHex(5, 8));
        let unit1 = new CBTestUnit(player1, ["./../images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTestUnit(player2, ["./../images/units/misc/unit2.png"]);
        game.addUnit(unit2, map.getHex(5, 7));
        game.start();
        loadAllImages();
        return {game, map, unit0, unit1, unit2, player1, player2};
    }

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
        when:
            unit1.select();
            unit1.launchAction(new CBAction(unit1, dummyEvent));
        then:
            assert(game.selectedUnit).equalsTo(unit1);
        when:
            unit1.updatePlayed();
            assert(unit1.status).equalsTo("played");
            game.nextTurn();
        then:
            assert(game.currentPlayer).equalsTo(player2);
            assert(unit1.status).isNotDefined();
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
            game.setSelectedUnit(unit1);
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
            Mechanisms.fire(game, CBGame.TURN_EVENT);
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
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isFalse();
        when:
            Memento.undo();
        then:
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks playing a unit", () => {
        given:
            var {game, unit} = createTinyGame();
        when:
            unit.launchAction(new CBAction(game, unit));
            unit.markAsBeingPlayed();
            paint(game);
            loadAllImages(); // to load actiondone.png
        then:
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
        when:
            Memento.undo();
            paint(game);
        then:
            assert(unit.hasBeenActivated()).isFalse();
            assert(unit.hasBeenPlayed()).isFalse();
    });

    it("Checks mark a unit as played without effectively playing it (useful for unit created on the fly)", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsBeingPlayed();
        then:
            assert(unit.hasBeenActivated()).isTrue();
            assert(unit.hasBeenPlayed()).isTrue();
    });

    it("Checks played status of a unit when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2UnitsTinyGame();
            player.launchUnitAction = function(unit, event) {
                unit.launchAction(new CBAction(game, unit));
            }
        when:
            player.changeSelection(unit1, dummyEvent);
            unit1.action.markAsStarted();
        then:
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isFalse();
        when:
            mouseClickOnCounter(game, unit2);
        then:
            assert(unit1.action).isDefined();
            assert(unit1.hasBeenActivated()).isTrue();
            assert(unit1.hasBeenPlayed()).isTrue();
        when:   // changing turn reset played status
            game.nextTurn();
        then:
            assert(unit1.action).isNotDefined();
            assert(unit1.hasBeenActivated()).isFalse();
            assert(unit1.hasBeenPlayed()).isFalse();
    });

    it("Checks playable sorting on Hex", () => {
        given:
            var { game, map } = prepareTinyGame();
            var spell = new CBPlayable("ground", ["./../images/units/misc/spell.png"], new Dimension2D(50, 50));
            spell.spellNature = true;
            var blaze = new CBPlayable("ground", ["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));
            blaze.elementNature = true;
            game.start();
            var [hexLayer0] = getLayers(game.board, "hex-0");
        when:
            spell.appendToMap(map.getHex(4, 5));
            blaze.appendToMap(map.getHex(4, 5));
            loadAllImages();
            resetDirectives(hexLayer0);
            repaint(game);
            var [hexLayer1] = getLayers(game.board, "hex-1");
        then:
            assertClearDirectives(hexLayer0);
            assertDirectives(hexLayer0, showFakeCounter("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertDirectives(hexLayer1, showFakeCounter("misc/spell", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
        when:
            var trap = new CBPlayable("ground", ["./../images/units/misc/trap.png"], new Dimension2D(50, 50));
            trap.featureNature = true;
            trap.appendToMap(map.getHex(4, 5));
            loadAllImages();
            resetDirectives(hexLayer0, hexLayer1);
            repaint(game);
            var [hexLayer2] = getLayers(game.board, "hex-2");
        then:
            assertClearDirectives(hexLayer0);
            assertDirectives(hexLayer0, showFakeCounter("misc/trap", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertClearDirectives(hexLayer1);
            assertDirectives(hexLayer1, showFakeCounter("misc/blaze", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
            assertDirectives(hexLayer2, showFakeCounter("misc/spell", zoomAndRotate0(313.783, 101.5518)));
            assertNoMoreDirectives(hexLayer2);
    });

});