import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator, DImage, setDrawPlatform
} from "../../jslib/board/draw.js";
import {
    assertClearDirectives,
    assertDirectives,
    assertNoMoreDirectives,
    getDirectives,
    getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
} from "../board/mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/board/mechanisms.js";
import {
    CarriableMixin, getUnitFromContext, HexLocated,
    OptionArtifactMixin,
    OptionMixin, setUnitToContext, TwoHexesUnit, WDisplaceAnimation, WSceneAnimation,
    WUnit,
    WUnitActuatorTrigger,
    WUnitPlayer,
    WWing
} from "../../jslib/wargame/wunit.js";
import {
    RetractableActuatorMixin,
    WActionActuator,
    WGame,
    WHexCounter,
    WLevelBuilder
} from "../../jslib/wargame/playable.js";
import {
    WHexSideId,
    WMap
} from "../../jslib/wargame/map.js";
import {
    Dimension2D, Point2D
} from "../../jslib/board/geometry.js";
import {
    HexLocatableMixin,
    PlayableMixin,
    WAction, WPiece, WPieceImageArtifact, WStacking
} from "../../jslib/wargame/game.js";
import {
    clickOnArtifact,
    clickOnTrigger, executeAllAnimations, executeAnimations,
    repaint,
    showActuatorTrigger,
    zoomAndRotate0,
    zoomAndRotate60
} from "../cblades/interactive-tools.js";
import {
    DPopup
} from "../../jslib/board/widget.js";
import {
    WSequenceElement
} from "../../jslib/wargame/sequences.js";

function prepareTinyGame() {
    var game = new WGame(1);
    var map = new WMap([{path:"./../images/maps/map.png", col:0, row:0}]);
    game.setMap(map);
    return {game, map};
}

function create2UnitsTinyGame(start = true) {
    var { game, map } = prepareTinyGame();
    let player = new WUnitPlayer("player", "/players/player.png");
    game.addPlayer(player);
    let wing = new WWing(player);
    let unit1 = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
    unit1.addToMap(map.getHex(5, 8));
    let unit2 = new WUnit(game, ["./../images/units/red.png"], wing, new Dimension2D(142, 142));
    unit2.addToMap(map.getHex(5, 7));
    if (start) {
        game.start();
        loadAllImages();
    }
    return {game, map, unit1, unit2, wing, player};
}

describe("WUnit", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        DAnimator.clear();
        Mechanisms.reset();
        Memento.clear();
    });

    it("Checks unit player", () => {
        given:
            var {game, map} = prepareTinyGame();
            let player1 = new WUnitPlayer("player1", "/players/player1.png");
            player1.canPlay = function () {
                return true;
            };
            game.addPlayer(player1);
            let player2 = new WUnitPlayer("player2", "/players/player2.png");
            game.addPlayer(player2);
            var wing1 = new WWing(player1);
            var wing2 = new WWing(player1);
            var wing3 = new WWing(player1);
            let unit1 = new WUnit(game, ["./../images/units/blue.png"], wing1, new Dimension2D(142, 142));
            unit1.addToMap(map.getHex(5, 8));
            let unit2 = new WUnit(game, ["./../images/units/red.png"], wing1, new Dimension2D(142, 142));
            unit2.addToMap(map.getHex(6, 8));
        then:
            assert(game.currentPlayer).equalsTo(player1);
            assert(player1.wings).arrayEqualsTo([wing1, wing2, wing3]);
            assert(player1.units).arrayEqualsTo([unit1, unit2]);
        when:
            player1.finishTurn(() => {});
        then:
            assert(game.currentPlayer).equalsTo(player2);
    });

    it("Checks player specs generation", () => {
        given:
            var {game, map} = prepareTinyGame();
            let player = new WUnitPlayer("player", "/players/player.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            unit.addToMap(map.getHex(5, 8));
        when:
            var context = new Map();
            var specs = player.toSpecs(context);
        then:
            assert(specs).objectEqualsTo({
                "version": 0,
                "identity": {"version": 0, "name": "player", "path": "/players/player.png"},
                "wings": [{
                    "version": 0, "units": [{
                        "version": 0, "positionCol": 5, "positionRow": 8
                    }]
                }]
            });
        when:
            player._oid = 1;
            player._oversion = 2;
            wing._oid = 3;
            wing._oversion = 4;
            unit._oid = 5;
            unit._oversion = 6;
            context = new Map();
            specs = player.toSpecs(context);
        then:
            assert(specs).objectEqualsTo({
                "id": 1,
                "version": 2,
                "identity": {"version": 0, "name": "player", "path": "/players/player.png"},
                "wings": [{
                    "id": 3,
                    "version": 4,
                    "units": [{
                        "id": 5,
                        "version": 6,
                        "positionCol": 5,
                        "positionRow": 8
                    }]
                }]
            });
    });

    it("Checks player specs generation", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("", "");
            var specs = {
                "id": 1,
                "version": 2,
                "identity": {"version": 0, "name": "player", "path": "/players/player.png"},
                "wings": [{
                    "id": 3,
                    "version": 4,
                    "units": [{
                        "id": 5,
                        "version": 6,
                        "positionCol": 5,
                        "positionRow": 8
                    }]
                }]
            };
            var context = new Map();
            context.game = game;
            context.map = map;
            context.pieceMap = new Map();
        when:
            WUnit.fromSpecs = function(wing, unitSpec, context) {
                let unit = new WUnit(game, ["./../images/units/unit.png"], wing, new Dimension2D(142, 142));
                unit.fromSpecs(unitSpec, context);
                return unit;
            }
            player.fromSpecs(game, specs, context);
        then:
            assert(specs).objectEqualsTo(specs);
    });

    class WTestUnitActuator extends RetractableActuatorMixin(WActionActuator) {

        constructor(action, unit) {
            super(action);
            let image = DImage.getImage("./../images/actuators/test.png");
            let imageArtifacts = [];
            this.trigger = new WUnitActuatorTrigger(this, unit, "units", image,
                new Point2D(0, 0), new Dimension2D(142, 142));
            this.trigger.position = Point2D.position(action.playable.location, unit.location, 1);
            imageArtifacts.push(this.trigger);
            this.initElement(imageArtifacts);
        }

        get unit() {
            return this.playable;
        }

        onMouseClick(trigger, event) {
            this.unitProcessed = trigger.playable;
        }

    }

    it("Checks actuators trigger on playable", () => {
        given:
            var {game, unit1, unit2} = create2UnitsTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators-0");
        when:
            var action = new WAction(game, unit1);
            var actuator = new WTestUnitActuator(action, unit2);
            game.openActuator(actuator);
            repaint(game);
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

    function showMarker(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000",
            "shadowBlur = 10",
            `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
            "restore()"
        ];
    }

    function showActivableMarker(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowBlur = 0",
            `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
            "restore()"
        ];
    }

    it("Checks marker artifact positions on a unit", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            var [markerLayer] = getLayers(game.board, "markers-0");
        when:
            unit.setMarkerArtifact("./../images/markers/tired.png", 0);
            unit.setMarkerArtifact("./../images/markers/ammunition.png", 1);
            unit.setMarkerArtifact("./../images/markers/cohesion.png", 2);
            unit.setMarkerArtifact("./../images/markers/moral.png", 3);
            unit.setMarkerArtifact("./../images/markers/charge.png", 4);
            unit.setMarkerArtifact("./../images/markers/fly.png", 5);
            unit.setMarkerArtifact("./../images/markers/order.png", 6);
            unit.setMarkerArtifact("./../images/markers/played.png", 7);
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showMarker("tired", [0.4888, 0, 0, 0.4888, 451.3685, 317.186]));
            assertDirectives(markerLayer, showMarker("ammunition", [0.4888, 0, 0, 0.4888, 416.6667, 317.186]));
            assertDirectives(markerLayer, showMarker("cohesion", [0.4888, 0, 0, 0.4888, 381.9648, 317.186]));
            assertDirectives(markerLayer, showMarker("moral", [0.4888, 0, 0, 0.4888, 381.9648, 351.8878]));
            assertDirectives(markerLayer, showMarker("charge", [0.4888, 0, 0, 0.4888, 381.9648, 386.5897]));
            assertDirectives(markerLayer, showMarker("fly", [0.4888, 0, 0, 0.4888, 416.6667, 386.5897]));
            assertDirectives(markerLayer, showMarker("order", [0.4888, 0, 0, 0.4888, 451.3685, 386.5897]));
            assertDirectives(markerLayer, showMarker("played", [0.4888, 0, 0, 0.4888, 451.3685, 351.8878]));
            assertNoMoreDirectives(markerLayer);
    });

    it("Checks marker artifact on a unit (not undoable)", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [markerLayer] = getLayers(game.board, "markers-0");
        when:
            var executed = false;
            var marker = unit.setMarkerArtifact("./../images/markers/tired.png", 0);
            var activeMarker = unit.setActivableMarkerArtifact(["./../images/markers/charge.png"],  ()=>{
                executed = true;
            }, 4);
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showMarker("tired", [0.4888, 0, 0, 0.4888, 451.3685, 317.186]));
            assertDirectives(markerLayer, showActivableMarker("charge", [0.4888, 0, 0, 0.4888, 381.9648, 386.5897]));
            assertNoMoreDirectives(markerLayer);
        when:
            unit.angle = 60;
            unit.hexLocation = nextHexId;
            repaint(game);
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showMarker("tired", [0.2444, 0.4233, -0.4233, 0.2444, 547.4036, 412.7018]));
            assertDirectives(markerLayer, showActivableMarker("charge", [0.2444, 0.4233, -0.4233, 0.2444, 452.5964, 387.2982]));
            assertNoMoreDirectives(markerLayer);
        when:
            unit.removeMarkerArtifact(marker);
            repaint(game);
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showActivableMarker("charge", [0.2444, 0.4233, -0.4233, 0.2444, 452.5964, 387.2982]));
            assertNoMoreDirectives(markerLayer);
        when:
            clickOnArtifact(game, activeMarker);
            assert(executed).isTrue();
    });

    it("Checks marker artifact on a unit (undoable)", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [markerLayer] = getLayers(game.board, "markers-0");
        when:
            Memento.open();
            var marker = unit.createMarkerArtifact("./../images/markers/tired.png", 0);
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showMarker("tired", [0.4888, 0, 0, 0.4888, 451.3685, 317.186]));
            assertNoMoreDirectives(markerLayer);
        when:
            Memento.open();
            unit.deleteMarkerArtifact(marker);
            unit.createActivableMarkerArtifact(["./../images/markers/charge.png"],  ()=>{}, 4);
            repaint(game);
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showActivableMarker("charge", [0.4888, 0, 0, 0.4888, 381.9648, 386.5897]));
            assertNoMoreDirectives(markerLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markerLayer);
            assertDirectives(markerLayer, showMarker("tired", [0.4888, 0, 0, 0.4888, 451.3685, 317.186]));
            assertNoMoreDirectives(markerLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assertClearDirectives(markerLayer);
            assertNoMoreDirectives(markerLayer);
    });

    class WTestCarriable extends CarriableMixin(WHexCounter) {

        constructor(unit, paths) {
            super("units", unit.game, paths, new Dimension2D(142, 142));
            Object.defineProperty(this.artifact, "slot", {
                get: function () {
                    return unit.slot;
                }
            });
            Object.defineProperty(this.artifact, "layer", {
                get: function () {
                    return WLevelBuilder.ULAYERS.SPELLS;
                }
            });
        }

    }

    function showPlayable(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
            "restore()"
        ];
    }

    function createCarriable(unit, path) {
        let carriable = new WTestCarriable(unit, [path]);
        unit.addCarried(carriable);
        return carriable;
    }

    it("Checks that a unit may carry other counters (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            var playable1 = createCarriable(unit, "./../images/units/misc/playable1.png");
            repaint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.angle = 60;
            unit.hexLocation = nextHexId;
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(500, 400)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.removeCarried(playable1);
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([]);
        when:
            unit.addCarried(playable1);
            unit.removeFromMap();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([]);
        when:
            unit.addToMap(hexId, WStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
    });

    it("Checks that a unit may carry other counters (undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [spellsLayer] = getLayers(game.board, "spells-0");
        when:
            var playable1 = new WTestCarriable(unit, ["./../images/units/misc/playable1.png"]);
            unit.carry(playable1);
            repaint(game);
            loadAllImages();
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            unit.reorient(60);
            unit.displace(nextHexId, WStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(500, 400)));
            assertNoMoreDirectives(spellsLayer);
        when:
            Memento.open();
            unit.drop(playable1);
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([]);
        when:
            Memento.open();
            unit.carry(playable1);
            unit.deleteFromMap();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([]);
        when:
            unit.appendToMap(hexId, WStacking.TOP);
            repaint(game);
        then:
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(416.6667, 351.8878)));
            assertNoMoreDirectives(spellsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([])
            assert(getDirectives(spellsLayer, 4)).arrayEqualsTo([]);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.carried).arrayEqualsTo([playable1]);
            assertClearDirectives(spellsLayer);
            assertDirectives(spellsLayer, showPlayable("misc/playable1", zoomAndRotate60(500, 400)));
            assertNoMoreDirectives(spellsLayer);
    });

    class WTestOptionArtifact extends OptionArtifactMixin(WPieceImageArtifact) {
        constructor(...args) {
            super(...args);
        }

        get unit() {
            return this.piece.unit;
        }
    }

    class WTestOption extends OptionMixin(CarriableMixin(WHexCounter)) {

        constructor(unit, paths) {
            super("units", unit.game, paths, new Dimension2D(142, 142));
            this._unit = unit;
        }

        createArtifact(levelName, images, location, dimension) {
            return new WTestOptionArtifact(this, levelName, images, location, dimension);
        }

        get unit() {
            return this._unit;
        }
    }

    function createOption(unit, path) {
        var option = new WTestOption(unit,[path]);
        unit.addOption(option);
        return option;
    }

    it("Checks option features", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
        when:
            var option = createOption(unit, "./../images/units/misc/option.png");
            repaint(game);
        then:
            assert(option.optionNature).isTrue();
            assert(option.owner).equalsTo(unit);
    });

    it("Checks that a unit may have option counters (not undoable)", () => {
        given:
            var { game, map } = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "./../images/units/misc/option0.png");
            var option1 = createOption(unit, "./../images/units/misc/option1.png");
            var option2 = createOption(unit, "./../images/units/misc/option2.png");
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            resetDirectives(optionsLayer);
            unit.removeOption(option1);
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(397.1163, 337.2251)));
            assertNoMoreDirectives(optionsLayer);
    });

    it("Checks that a unit may have option counters (undoable)", () => {
        function createOption(unit, path) {
            var option = new WTestOption(unit,[path]);
            unit.appendOption(option);
            return option;
        }

        given:
            var { game, map } = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            var [optionsLayer] = getLayers(game.board, "options-0");
        when:
            var option0 = createOption(unit, "./../images/units/misc/option0.png");
            var option1 = createOption(unit, "./../images/units/misc/option1.png");
            var option2 = createOption(unit, "./../images/units/misc/option2.png");
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2]);
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.open();
            unit.deleteOption(option1);
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(397.1163, 337.2251)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([option0, option1, option2])
            assertClearDirectives(optionsLayer);
            assertDirectives(optionsLayer, showPlayable("misc/option0", zoomAndRotate0(406.8915, 347.0002)));
            assertDirectives(optionsLayer, showPlayable("misc/option1", zoomAndRotate0(397.1163, 337.2251)));
            assertDirectives(optionsLayer, showPlayable("misc/option2", zoomAndRotate0(387.3412, 327.4499)));
            assertNoMoreDirectives(optionsLayer);
        when:
            Memento.undo();
            repaint(game);
        then:
            assert(unit.options).arrayEqualsTo([])
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks that when a unit retracts, it also hides options", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
            repaint(game);
            var [spellLayer, optionsLayer] = getLayers(game.board, "spells-0", "options-0");
        when:
            createCarriable(unit, "./../images/units/misc/spell.png");
            var option = createOption(unit, "./../images/units/misc/option.png");
            repaint(game);
        then:
            assertClearDirectives(spellLayer);
            assertClearDirectives(optionsLayer);
            assertDirectives(spellLayer, showPlayable("misc/spell", zoomAndRotate0(416.6667, 351.8878)));
            assertDirectives(optionsLayer, showPlayable("misc/option", zoomAndRotate0(406.8915, 347.0002)));
            assertNoMoreDirectives(spellLayer, optionsLayer);
        when:
            option.retractAbove();
            repaint(game);
        then:
            assert(getDirectives(spellLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks unit features", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            unit.name = "unit";
            let hexId = map.getHex(5, 8);
            unit.addToMap(hexId);
        when:
            var carriable = new WTestCarriable(unit, ["./../images/units/misc/playable1.png"]);
            unit.carry(carriable);
            var option = createOption(unit, "./../images/units/misc/option0.png");
        then:
            assert(unit.name).equalsTo("unit");
            assert(unit._getPieces()).arrayEqualsTo([carriable, unit, option]);
            assert(unit.movementPoints).isNotDefined();
            assert(unit.lossSteps).equalsTo(0);
        when:
            unit.movementPoints = 4;
            unit.maxStepCount = 2;
            unit.lossSteps = 1;
        then:
            assert(unit.movementPoints).equalsTo(4);
            assert(unit.lossSteps).equalsTo(1);
            assert(unit.steps).equalsTo(1);
            assert(unit.visible).isTrue();
            assert(unit.artifact.image.path).equalsTo("./../images/units/red.png");
        when:
            unit.steps = 2;
        then:
            assert(unit.lossSteps).equalsTo(0);
        when:
            unit.takeALoss();
        then:
            assert(unit.lossSteps).equalsTo(1);
            assert(unit.hexLocation).isDefined();
        when:
            unit.takeALoss();
        then:
            assert(unit.lossSteps).equalsTo(2);
            assert(unit.hexLocation).isNotDefined();
        when:
            unit.steps = 2;
            unit.displace(hexId, WStacking.TOP);
        then:
            assert(unit.hexLocation).equalsTo(hexId);
            assert(unit.getPosition()).objectEqualsTo({col:5, row:8});
        when:
            unit.displace(null);
        then:
            assert(unit.hexLocation).isNotDefined();
            assert(unit.getPosition()).isNotDefined();
        when:
            unit.setState({movementPoints:3, steps:2});
        then:
            assert(unit.movementPoints).equalsTo(3)
            assert(unit.steps).equalsTo(2);
        when:
            unit.addToMap(hexId);
            unit.setState({movementPoints:2, steps:0});
        then:
            assert(unit.movementPoints).equalsTo(2)
            assert(unit.hexLocation).isNotDefined();
            assert(unit.getPosition()).isNotDefined();
    });

    it("Checks unit cloning", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            unit.maxStepCount = 2;
        when:
            unit.movementPoints = 3;
            unit.fixRemainingLossSteps(1);
            var cloneUnit = unit.clone();
        then:
            assert(cloneUnit.movementPoints).equalsTo(3);
            assert(cloneUnit.steps).equalsTo(1);
    });

    class WTestLargeUnit extends TwoHexesUnit(WUnit) {
    }

    function showUnit(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000",
            "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
            "restore()"
        ];
    }

    function show2HexesUnit(image, [a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000",
            "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -142, -71, 284, 142)`,
            "restore()"
        ];
    }

    it("Checks 2 Hexes unit features", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WTestLargeUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(284, 142));
            unit.angle = 90;
            var hexSideId = new WHexSideId(map.getHex(5, 8), map.getHex(5, 7));
            unit.addToMap(hexSideId);
            var [formationLayer] = getLayers(game.board, "formations-0");
        when:
            repaint(game);
            loadAllImages();
        then:
            assertClearDirectives(formationLayer);
            assertDirectives(formationLayer, show2HexesUnit("blue", [0, 0.4888, -0.4888, 0, 416.6667, 303.7757]));
            assertNoMoreDirectives(formationLayer);
            assert(unit.getPosition()).objectEqualsTo({angle: 0, col: 5, row:8});
            assert(unit.getTurnOrientation(120)).equalsTo(150);
    });

    it("Checks unit displacement animation", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [unitLayer] = getLayers(game.board, "units-0");
            repaint(game);
            loadAllImages();
        when:
            new WDisplaceAnimation({
                unit,
                startTick:0, duration:500,
                state:{movementPoints:3, steps:1},
                hexLocation: nextHexId,
                angle: 60,
                stacking: WStacking.BOTTOM
            }).play(1);
            executeAnimations(10);
            repaint(game);
        then:
            assertClearDirectives(unitLayer);
            assertDirectives(unitLayer, showUnit("blue", [0.342, 0.3492, -0.3492, 0.342, 480, 388.4531]));
            assertNoMoreDirectives(unitLayer);
        when:
            executeAllAnimations();
        then:
            assert(unit.hexLocation).equalsTo(nextHexId);
            assert(unit.movementPoints).equalsTo(3);
            assert(unit.steps).equalsTo(1);
    });

    it("Checks unit animation cancellation by another unit animation", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            let nextHexId = map.getHex(6, 8);
            unit.addToMap(hexId);
            var [unitLayer] = getLayers(game.board, "units-0");
            repaint(game);
            loadAllImages();
            new WDisplaceAnimation({
                unit,
                startTick:0, duration:500,
                state:{movementPoints:3, steps:1},
                hexLocation: nextHexId,
                angle: 60,
                stacking: WStacking.BOTTOM
            }).play(1);
            executeAnimations(10);
        when:
            new WDisplaceAnimation({
                unit,
                startTick:0, duration:500,
                state:{movementPoints:1, steps:2},
                hexLocation: hexId,
                angle: 0,
                stacking: WStacking.BOTTOM
            }).play(1);
            executeAnimations(1);
            repaint(game);
        then:
            assertClearDirectives(unitLayer);
            assertDirectives(unitLayer, showUnit("blue", [0.2619, 0.4127, -0.4127, 0.2619, 496.6667, 398.0755]));
            assertNoMoreDirectives(unitLayer);
            assert(unit.hexLocation).equalsTo(hexId);
            assert(unit.movementPoints).equalsTo(3);
            assert(unit.steps).equalsTo(1);
    });

    it("Checks unit animation cancellation by another unit animation", () => {
        given:
            var {game} = prepareTinyGame();
            var popup1 = new DPopup(new Dimension2D(100, 200));
            var animation = new WSceneAnimation({
                startTick:1, duration: 200, game,
                animation: () => {
                    game.openPopup(popup1, new Point2D(10, 20));
                }
            });
        when:
            animation.play(1);
            executeAnimations(1);
        then:
            assert(game.popup).equalsTo(popup1);
        when:
            executeAllAnimations();
        then:
            assert(game.popup).isNotDefined();
    });

    class WTestPlayable extends PlayableMixin(HexLocatableMixin(WPiece)) {
        constructor(game, paths, dimension) {
            super("ground", game, paths, dimension);
        }

    }

    it("Checks management of units", () => {
        given:
            var {game, map} = prepareTinyGame();
            var player = new WUnitPlayer("player1", "/players/player1.png");
            game.addPlayer(player);
            var wing = new WWing(player);
            var unit1 = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            let hexId = map.getHex(5, 8);
            unit1.name = "unit1";
            unit1.addToMap(hexId);
            var playable = new WTestPlayable(game, ["./../images/playables/fire.png"], new Dimension2D(142, 142));
            let fireHexId = map.getHex(7, 7);
            playable.addToMap(fireHexId);
            var unit2 = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            let nextHexId = map.getHex(6, 8);
            unit2.name = "unit2";
            unit2.addToMap(nextHexId);
        then:
            assert(game.playables).arrayEqualsTo([unit1, playable, unit2]);
            assert(game.units).arrayEqualsTo([unit1, unit2]);
            assert(game.getUnit("unit2")).equalsTo(unit2);
        then:
            assert(hexId.empty).isFalse();
            assert(fireHexId.empty).isTrue();
            assert(map.getHex(1, 1)).isTrue();
        when:
            var context = new Map();
            context.game = game;
        then:
            assert(getUnitFromContext(context, "unit1")).equalsTo(unit1);
        when:
            var unit3 = new WUnit(game, ["./../images/units/blue.png", "./../images/units/red.png"], wing, new Dimension2D(142, 142));
            unit3.name = "unit3";
            setUnitToContext(context, unit3);
        then:
            assert(getUnitFromContext(context, "unit3")).equalsTo(unit3);
    });

    class WTestHexLocated extends HexLocated(WSequenceElement) {}

    it("Checks management of units", () => {
        given:
            var {game, map} = prepareTinyGame();
            let hexId = map.getHex(5, 8);
            var sequence = new WTestHexLocated({
                id:1234, type:"test",
                game,
                hexLocation:hexId,
                stacking: WStacking.BOTTOM
            });
            var model = {hexLocation: {col: 5, row: 8}, stacking: 'B'};
        when:
            var specs  = {};
            var context = new Map();
            sequence._toSpecs(specs, context);
        then:
            assert(specs).objectEqualsTo(model);
            assert(sequence._toString()).equalsTo("Type: test, HexLocation: point(-170.5, -98.4375), Stacking: B");
        when:
            var otherSequence = new WTestHexLocated({id:1234, type:"test", game});
            context = new Map();
            context.game = game;
            otherSequence._fromSpecs(model, context);
        then:
            assert(otherSequence._toString()).equalsTo("Type: test, HexLocation: point(-170.5, -98.4375), Stacking: B");
            assert(sequence.equalsTo(otherSequence)).isTrue();
        when:
            context = new Map();
            context.game = game;
            otherSequence._fromSpecs({hexLocation: {col: 5, row: 8}, stacking: 'T'}, context);
        then:
            assert(otherSequence._toString()).equalsTo("Type: test, HexLocation: point(-170.5, -98.4375), Stacking: T");
            assert(sequence.equalsTo(otherSequence)).isFalse();
    });

});