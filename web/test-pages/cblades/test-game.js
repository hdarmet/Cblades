'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertDirectives,
    createEvent,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives
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
    clickOnTrigger, showInsertMark
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
        let image = DImage.getImage("/CBlades/images/actuators/test.png");
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
            DImage.getImage("/CBlades/images/actuators/test1.png"),
            DImage.getImage("/CBlades/images/actuators/test2.png")
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
        let image = DImage.getImage("/CBlades/images/actuators/test.png");
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

export function prepareTinyGame() {
    var game = new CBGame();
    var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    return {game, map};
}

export function createTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBAbstractArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBAbstractPlayer();
    game.addPlayer(player);
    var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
    game.addUnit(unit, map.getHex(5, 8));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, map, unit };
}

describe("Game", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks game building", () => {
        given:
            var game = new CBGame();
            var arbitrator = new CBAbstractArbitrator();
            game.setArbitrator(arbitrator);
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [mapLayer, unitsLayer] = getLayers(game.board, "map","units-0");
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
            game.addUnit(unit, map.getHex(5, 8));
        when:
            game.start();
            loadAllImages();
        then:
            assert(game.board).is(DBoard);
            assert(arbitrator.game).equalsTo(game);
            assert(game.arbitrator).equalsTo(arbitrator);
            assert(game.map).equalsTo(map);
            assert(player.game).equalsTo(game);
            assert(game.currentPlayer).equalsTo(player);
            assert(getDirectives(mapLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 500, 400)",
                    "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
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
            var [actuatorsLevel] = getLayers(game.board, "actuators");
            game.setMenu();
            game._showCommand.action();
        when:
            var action = new CBAction(game, unit);
            var actuator = new CBTestActuator(action);
            resetDirectives(actuatorsLevel);
            game.openActuator(actuator);
            paint(game);
            loadAllImages();
        then:
            assert([...Mechanisms.manager._listeners]).contains(actuator);
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            game._insertLevelCommand.action();
            resetDirectives(actuatorsLevel);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLevel, 4)).arrayEqualsTo([
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
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOnTrigger(game, actuator.getTrigger());
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            mouseMoveOutOfTrigger(game, actuator.getTrigger());
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test1.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(actuatorsLayer);
            actuator.trigger.changeImage(1);
            paint(game);
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/test2.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks that clicking on the map re-centers the viewport ", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 55, 105)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-50, -100, 100, 200)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-50, -100, 100, 200)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLevel);
            var popup2 = new DPopup(new Dimension2D(150, 250));
            game.openPopup(popup2, new Point2D(15, 25));
            paint(game);
        then:
            assert(game.popup).equalsTo(popup2);
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 80, 130)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-75, -125, 150, 250)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-75, -125, 150, 250)",
                "restore()"
            ]);
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
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 80, 130)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-75, -125, 150, 250)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-75, -125, 150, 250)",
                "restore()"
            ]);
    });

    it("Checks global push buttons menu", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLevel] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/show.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._showCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/hide.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 820, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/undo.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 760, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/redo.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 700, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/settings-inactive.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 640, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/save-inactive.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 580, 740)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/load-inactive.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 520, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/editor.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 460, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/insert2.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(commandsLevel);
            game._hideCommand.action();
            paint(game);
        then:
            assert(getDirectives(commandsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 940, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/turn.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 880, 740)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/commands/show.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    it("Checks undo/redo push buttons menu", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
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

    it("Checks edit push buttons menu", () => {
        try {
            given:
                var cbgameEdit = CBGame.edit;
                var editMode = false;
                CBGame.edit = function() {
                    editMode = true;
                }
                var game = new CBGame();
                var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
                game.setMap(map);
                game.setMenu();
                game.start();
                loadAllImages();
                game._showCommand.action();
                paint(game);
            when:
                game._editorCommand.action();
            then:
                assert(editMode).isTrue();
        } finally {
            CBGame.edit = cbgameEdit;
        }
    });

    class TestInsert extends WidgetLevelMixin(DInsert) {
        constructor(game) {
            super(game, "/CBlades/images/inserts/test-insert.png", new Dimension2D(200, 300));
        }
    }

    it("Checks visibility level management (on insert as exemple)", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.setMenu();
            game.start();
            game._showCommand.action();
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
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-100, -150, 200, 300)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 150, 200)",
                    "drawImage(/CBlades/images/inserts/test-insert.png, 0, 0, 200, 300, -100, -150, 200, 300)",
                "restore()"
            ]);
        when:
            game._insertLevelCommand.action();
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

    it("Checks mask thats depends on the visibility level", () => {
        given:
            var game = new CBGame();
            var map = new CBMap([{path:"/CBlades/images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [widgetsLevel] = getLayers(game.board, "widgets");
            game.start();
            game.setMenu();
            game._showCommand.action();
        when:
            var mask = new CBMask(game);
            resetDirectives(widgetsLevel);
            mask.open(game.board);
            paint(game);
        then:
            assert([...Mechanisms.manager._listeners]).contains(mask);
            assert(getDirectives(widgetsLevel, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()"
            ]);
        when:
            game._insertLevelCommand.action();
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
            let counter = new CBCounter("terran", ["/CBlades/images/units/misc/counter.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 548.8759, 507.5269)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:
            resetDirectives(hexLayer);
            counter.location = new Point2D(10, 20);
            paint(game);
        then:
            assert(counter.location.toString()).equalsTo("point(10, 20)");
            assert(counter.viewportLocation.toString()).equalsTo("point(504.8876, 419.5503)");
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 419.5503)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.3456, 0.3456, -0.3456, 0.3456, 504.8876, 419.5503)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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

    it("Checks unit and option counters registration on layers", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit1 = new CBTestUnit(player, ["/CBlades/images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("/CBlades/images/units/misc/markers1.png");
            let marker = new CBTestMarker(unit1,"units", [markerImage],
                new Point2D(0, 0), new Dimension2D(142, 142));
            unit1._element.addArtifact(marker);
            let unit2 = new CBTestUnit(player, ["/CBlades/images/units/misc/unit2.png"]);
            let spell = new CBTestPlayable(unit2, CBGame.ULAYERS.SPELLS, "units", ["/CBlades/images/units/misc/spell.png"],
                new Dimension2D(142, 142));
            let option = new CBTestOption(unit2, "units",  ["/CBlades/images/units/misc/option.png"],
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
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/markers1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(spellsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/spell.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(optionsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks formations and formation's marker and options registration on layers", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, ["/CBlades/images/units/misc/formation1.png"]);
            formation1.angle = 60;
            let markerImage = DImage.getImage("/CBlades/images/units/misc/markers1.png");
            let marker = new CBTestMarker(formation1, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(142, 142));
            formation1._element.addArtifact(marker);
            let formation2 = new CBTestFormation(player, ["/CBlades/images/units/misc/formation2.png"]);
            formation2.angle = 60;
            let option = new CBTestOption(formation2, "units",  ["/CBlades/images/units/misc/option.png"],
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
            assert(getDirectives(formationsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 375, 135.3831)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation1.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(fmarkersLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 375, 135.3831)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/markers1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(formationsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.2444, 0.4233, -0.4233, 0.2444, 379.8876, 130.4955)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(foptionsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/option.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            unit.unselect();
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks unit addition and removing from game and map", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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

    it("Checks playable addition and removing on a Hex (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("terran", ["/CBlades/images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 121.1022)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            var { game, map } = prepareTinyGame();
            let playable = new CBPlayable("terran", ["/CBlades/images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 121.1022)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 121.1022)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            let playable = new CBPlayable("terran", ["/CBlades/images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 169.2143)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            let playable = new CBPlayable("terran", ["/CBlades/images/units/misc/playable.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 169.2143)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 169.2143)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/playable.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            let unit = new CBTestFormation(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -142, -71, 284, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(formationsLayer);
            unit.removeFromMap();
            repaint(game);
        then:
            assert(hexId1.units).arrayEqualsTo([]);
            assert(hexId2.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set());
            assert(unit.isOnBoard()).equalsTo(false);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks unit addition and removing on a Hex Side (undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit = new CBTestFormation(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -142, -71, 284, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -142, -71, 284, 142)",
                "restore()"
            ]);
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
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            var hexId2 = map.getHex(4, 6);
            unit.hexLocation = hexId2;
            repaint(game);
        then:
            assert(hexId.units).arrayEqualsTo([]);
            assert(game.counters).setEqualsTo(new Set([unit]));
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 207.5513)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            let unit = new CBTestUnit(player, ["/CBlades/images/units/misc/unit.png"]);
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
        let unit1 = new CBTestUnit(player,["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 6));
        let unit2 = new CBTestUnit(player,["/CBlades/images/units/misc/unit2.png"]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOnCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #00FFFF", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfCounter(game, unit);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            let counter1 = new CBTestUnit(player, ["/CBlades/images/units/misc/counter1.png"]);
            let counter2 = new CBTestUnit(player, ["/CBlades/images/units/misc/counter2.png"]);
            let counter3 = new CBTestUnit(player, ["/CBlades/images/units/misc/counter3.png"]);
            game.addUnit(counter1, map.getHex(4, 5));
            game.addUnit(counter2, map.getHex(4, 5));
            game.addUnit(counter3, map.getHex(4, 5));
            game.start();
            loadAllImages();
            var [unitsLayer0] = getLayers(game.board, "units-0");
            paint(game);
            var [unitsLayer1, unitsLayer2] = getLayers(game.board, "units-1", "units-2");
        then:
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer2)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 352.8837, 91.7766)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter3.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 343-71/2+5, 101-71/2+5); // On counter2 but not counter3
            paint(game);
        then:
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #00FFFF", "shadowBlur = 15", // Ready to be selected
                    "drawImage(/CBlades/images/units/misc/counter2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer2, 4)).arrayEqualsTo([
                "save()",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 100, 100); // not on any counter
            paint(game);
        then:
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 111.327)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer2, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 352.8837, 91.7766)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter3.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(actuatorsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(actuatorsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit2.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 426.4418, 149.664)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/test.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks that when the mouse is over a formation, the above counters are retracted", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, ["/CBlades/images/units/misc/formation1.png"]);
            formation1.angle = 90;
            let counter2 = new CBTestUnit(player, ["/CBlades/images/units/misc/counter2.png"]);
            let counter3 = new CBTestUnit(player, ["/CBlades/images/units/misc/counter3.png"]);
            game.addUnit(formation1, new CBHexSideId(map.getHex(4, 5), map.getHex(4, 6)));
            game.addUnit(counter2, map.getHex(4, 5));
            game.addUnit(counter3, map.getHex(4, 6));
            game.start();
            loadAllImages();
            var [formationsLayer0] = getLayers(game.board, "formations-0");
            paint(game);
            var [unitsLayer1] = getLayers(game.board, "units-1");
        then:
            assert(getDirectives(formationsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation1.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter2.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 197.7761)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter3.png, -71, -71, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(formationsLayer0, unitsLayer1);
            mouseMove(game, 333-71/2+5, 159-142/2+5); // On formation1 but not on counter2 or counter3
            paint(game);
        then:
            assert(getDirectives(formationsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                    "shadowColor = #00FFFF", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation1.png, -142, -71, 284, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(formationsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 333.3333, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation1.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(unitsLayer1, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 101.5518)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter2.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 343.1085, 197.7761)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/counter3.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
        let unit0 = new CBTestUnit(player1, ["/CBlades/images/units/misc/unit0.png"]);
        game.addUnit(unit0, map.getHex(5, 8));
        let unit1 = new CBTestUnit(player1, ["/CBlades/images/units/misc/unit1.png"]);
        game.addUnit(unit1, map.getHex(5, 8));
        let unit2 = new CBTestUnit(player2, ["/CBlades/images/units/misc/unit2.png"]);
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
            Mechanisms.fire(game, CBGame.PROGRESSION);
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
        var spell = new CBPlayable("terran", ["/CBlades/images/units/misc/spell.png"], new Dimension2D(50, 50));
        spell.spellNature = true;
        var blaze = new CBPlayable("terran", ["/CBlades/images/units/misc/blaze.png"], new Dimension2D(50, 50));
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
            assert(getDirectives(hexLayer0, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 121.1022)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/blaze.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        assert(getDirectives(hexLayer1)).arrayEqualsTo([
            "save()",
            "setTransform(0.4888, 0, 0, 0.4888, 323.5582, 111.327)",
            "shadowColor = #000000", "shadowBlur = 15",
            "drawImage(/CBlades/images/units/misc/spell.png, -25, -25, 50, 50)",
            "restore()"
        ]);
        when:
            var trap = new CBPlayable("terran", ["/CBlades/images/units/misc/trap.png"], new Dimension2D(50, 50));
        trap.featureNature = true;
        trap.appendToMap(map.getHex(4, 5));
        loadAllImages();
        resetDirectives(hexLayer0, hexLayer1);
        repaint(game);
        var [hexLayer2] = getLayers(game.board, "hex-2");
        then:
            assert(getDirectives(hexLayer0, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0.4888, 0, 0, 0.4888, 333.3333, 121.1022)",
                "shadowColor = #000000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/trap.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        assert(getDirectives(hexLayer1, 4)).arrayEqualsTo([
            "save()",
            "setTransform(0.4888, 0, 0, 0.4888, 323.5582, 111.327)",
            "shadowColor = #000000", "shadowBlur = 15",
            "drawImage(/CBlades/images/units/misc/blaze.png, -25, -25, 50, 50)",
            "restore()"
        ]);
        assert(getDirectives(hexLayer2)).arrayEqualsTo([
            "save()",
            "setTransform(0.4888, 0, 0, 0.4888, 313.783, 101.5518)",
            "shadowColor = #000000", "shadowBlur = 15",
            "drawImage(/CBlades/images/units/misc/spell.png, -25, -25, 50, 50)",
            "restore()"
        ]);
    });

});