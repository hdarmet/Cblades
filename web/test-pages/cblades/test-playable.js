'use strict'

import {
    assert,
    before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertClearDirectives, assertDirectives, assertNoMoreDirectives, createEvent, getDirectives,
    getLayers, loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBStacking,
    BelongsToPlayerMixin,
    CBAbstractArbitrator,
    CBAbstractPlayer,
    CBAction, CBActuator, CBPiece, CBPieceImageArtifact, HexLocatableMixin, PlayableMixin
} from "../../jslib/cblades/game.js";
import {
    WidgetLevelMixin,
    CBMask,
    CBGame,
    RetractablePieceMixin,
    RetractableArtifactMixin,
    SelectableArtifactMixin,
    CBLevelBuilder,
    CBActionActuator,
    CBActuatorImageTrigger,
    RetractableActuatorMixin,
    CBUnitActuatorTrigger,
    CBActuatorMultiImagesTrigger,
    CBHexCounter
} from "../../jslib/cblades/playable.js";
import {
    clickOnTrigger,
    executeAllAnimations, mouseMoveOnTrigger, mouseMoveOutOfTrigger,
    paint,
    repaint,
    showActuatorTrigger,
    showFormation, showInsert, showMask, showOverFormation,
    showOverTroop, showSelectedActuatorTrigger, showSelectedTroop,
    showTroop,
    zoomAndRotate0, zoomAndRotate60, zoomAndRotate90
} from "./interactive-tools.js";
import {
    CBHexSideId, CBMap
} from "../../jslib/cblades/map.js";
import {
    DInsert
} from "../../jslib/widget.js";
import {
    Dimension2D, Point2D
} from "../../jslib/geometry.js";

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

class CBTestUnitActuator extends RetractableActuatorMixin(CBActionActuator) {

    constructor(action, unit) {
        super(action);
        let image = DImage.getImage("./../images/actuators/test.png");
        let imageArtifacts = [];
        this.trigger = new CBUnitActuatorTrigger(this, unit, "units", image,
            new Point2D(0, 0), new Dimension2D(142, 142));
        this.trigger.position = Point2D.position(action.playable.location, unit.location, 1);
        imageArtifacts.push(this.trigger);
        this.initElement(imageArtifacts);
    }

    get unit() {
        return this.playable;
    }

    onMouseClick(trigger, event) {
        this.unitProcessed = trigger.unit;
    }

}

export class TestPlayableImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(CBPieceImageArtifact)) {

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
        return CBLevelBuilder.ULAYERS.UNITS;
    }

}

class CBTestPlayable extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(CBPiece)))) {

    constructor(player, paths) {
        super("units", paths, new Dimension2D(142, 142));
        this.player = player;
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableImageArtifact(this, levelName, images, position, dimension);
    }

    markAsPlayed() {
        this.status = "played";
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }

    get slot() {
        return this.hexLocation.playables.indexOf(this);
    }

}

export class TestCounterImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(CBPieceImageArtifact)) {

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
        return CBLevelBuilder.ULAYERS.SPELLS;
    }

}

class CBTestCounter extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(CBPiece)))) {

    constructor(owner, paths) {
        super("units", paths, new Dimension2D(142, 142));
        this.owner = owner;
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestCounterImageArtifact(this, levelName, images, position, dimension);
    }

    markAsPlayed() {
        this.status = "played";
    }

    get player() {
        return this.owner.player;
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }

    get slot() {
        return this.owner.slot;//this.hexLocation.playables.indexOf(this);
    }

}

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

class CBTestFormation extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(CBPiece)))) {

    constructor(player, paths) {
        super("units", paths, new Dimension2D(142*2, 142));
        this.player = player;
        Object.defineProperty(this.artifact, "layer", {
            get: function () {
                return CBLevelBuilder.ULAYERS.FORMATIONS;
            }
        });
    }

    createArtifact(levelName, images, position, dimension) {
        return new TestPlayableImageArtifact(this, levelName, images, position, dimension);
    }

    get formationNature() {
        return true;
    }

    markAsPlayed() {
        this.status = "played";
    }

    reset(player) {
        super.reset(player);
        if (player === this.player) {
            delete this.status;
        }
    }

    get slot() {
        return this.hexLocation.playables.indexOf(this);
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
        this.trigger.alpha = (level===CBActuator.FULL_VISIBILITY ? 1:0);
    }

}

function clickOnPiece(game, piece) {
    let pieceLocation = piece.artifact.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:pieceLocation.x, offsetY:pieceLocation.y});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

function createBasicGame() {
    var game = new CBGame();
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
    var player = new CBAbstractPlayer();
    game.addPlayer(player);
    let unit = new CBTestPlayable(player, ["./../images/units/misc/unit.png"]);
    unit.addToMap(map.getHex(5, 8));
    repaint(game);
    loadAllImages();
    return { game, arbitrator, player, map, unit };
}

function create2PlayablesTinyGame() {
    var { game, map, arbitrator } = createBasicGame();
    var player = new CBAbstractPlayer();
    game.addPlayer(player);
    let unit1 = new CBTestPlayable(player,["./../images/units/misc/unit1.png"]);
    unit1.addToMap(map.getHex(5, 6));
    let unit2 = new CBTestPlayable(player,["./../images/units/misc/unit2.png"]);
    unit2.addToMap(map.getHex(5, 7));
    repaint(game);
    loadAllImages();
    return {game, map, arbitrator, unit1, unit2, player};
}

function showOverFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
        `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
        "shadowColor = #00FFFF", "shadowBlur = 15",
        `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

function showFakePiece(image, [a, b, c, d, e, f], s=50) {
    return [
        "save()",
        `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
        "shadowColor = #000000", "shadowBlur = 15",
        `drawImage(./../images/units/${image}.png, -${s/2}, -${s/2}, ${s}, ${s})`,
        "restore()"
    ];
}

let dummyEvent = {offsetX:0, offsetY:0};

describe("Playable", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        Memento.clear();
    });

    class TestInsert extends WidgetLevelMixin(DInsert) {
        constructor(game) {
            super(game, "./../images/inserts/test-insert.png", new Dimension2D(200, 300));
        }
    }

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
            var {game, unit1, unit2} = create2PlayablesTinyGame();
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

    function mouseMove(game, x, y) {
        var mouseEvent = createEvent("mousemove", {offsetX:x, offsetY:y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOnPlayable(game, counter) {
        let unitLocation = counter.artifact.viewportLocation;
        var mouseEvent = createEvent("mousemove", {offsetX:unitLocation.x, offsetY:unitLocation.y});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    function mouseMoveOutOfPlayable(game, counter) {
        let unitArea = counter.artifact.viewportBoundingArea;
        var mouseEvent = createEvent("mousemove", {offsetX:unitArea.left-5, offsetY:unitArea.top});
        mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
    }

    it("Checks playable appearance when mouse is over it", () => {
        given:
            var { game, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOnPlayable(game, unit);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showOverTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfPlayable(game, unit);
        then:
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:
            unit.select();
            paint(game);
            resetDirectives(unitsLayer);
            mouseMoveOnPlayable(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(unitsLayer);
            mouseMoveOutOfPlayable(game, unit);
        then:
            assert(getDirectives(unitsLayer)).arrayEqualsTo([]);
    });

    it("Checks that when the mouse is over a (one hex) counter, the ones above are retracted", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let counter1 = new CBTestPlayable(player, ["./../images/units/misc/counter1.png"]);
            let counter2 = new CBTestPlayable(player, ["./../images/units/misc/counter2.png"]);
            let counter3 = new CBTestPlayable(player, ["./../images/units/misc/counter3.png"]);
            counter1.addToMap(map.getHex(4, 5));
            counter2.addToMap(map.getHex(4, 5));
            counter3.addToMap(map.getHex(4, 5));
            repaint(game);
            loadAllImages();
            var [unitsLayer0, unitsLayer1, unitsLayer2] = getLayers(game.board, "units-0", "units-1", "units-2");
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertDirectives(unitsLayer1, showFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertDirectives(unitsLayer2, showFakePiece("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
        when:
            resetDirectives(unitsLayer0, unitsLayer1, unitsLayer2);
            mouseMove(game, 343-71/2+5, 101-71/2+5); // On counter2 but not counter3
            paint(game);
        then:
            assertClearDirectives(unitsLayer0);
            assertDirectives(unitsLayer0, showFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
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
            assertDirectives(unitsLayer0, showFakePiece("misc/counter1", zoomAndRotate0(333.3333, 111.327), 142));
            assertNoMoreDirectives(unitsLayer0);
            assertClearDirectives(unitsLayer1);
            assertDirectives(unitsLayer1, showFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(unitsLayer1);
            assertClearDirectives(unitsLayer2);
            assertDirectives(unitsLayer2, showFakePiece("misc/counter3", zoomAndRotate0(352.8837, 91.7766), 142));
            assertNoMoreDirectives(unitsLayer2);
    });

    it("Checks that when the mouse is over a actuator's (unit) trigger, the units above are retracted", () => {
        given:
            var { game, unit1, unit2 } = create2PlayablesTinyGame();
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
            var { game, unit1, unit2 } = create2PlayablesTinyGame();
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
                ]);
            assert(getDirectives(actuatorsLayer1, 4)).arrayEqualsTo([
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
            var { game, map } = createBasicGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let formation1 = new CBTestFormation(player, ["./../images/units/misc/formation1.png"]);
            formation1.angle = 90;
            let counter2 = new CBTestPlayable(player, ["./../images/units/misc/counter2.png"]);
            let counter3 = new CBTestPlayable(player, ["./../images/units/misc/counter3.png"]);
            formation1.addToMap(new CBHexSideId(map.getHex(4, 5), map.getHex(4, 6)));
            counter2.addToMap(map.getHex(4, 5));
            counter3.addToMap(map.getHex(4, 6));
            repaint(game);
            loadAllImages();
            var [formationsLayer0, unitsLayer1] = getLayers(game.board, "formations-0", "units-1");
        then:
            assertClearDirectives(formationsLayer0);
            assertDirectives(formationsLayer0, showFormation("misc/formation1", zoomAndRotate90(333.3333, 159.4391)));
            assertNoMoreDirectives(formationsLayer0);
            assertDirectives(unitsLayer1, showFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showFakePiece("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
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
            assertDirectives(unitsLayer1, showFakePiece("misc/counter2", zoomAndRotate0(343.1085, 101.5518), 142));
            assertDirectives(unitsLayer1, showFakePiece("misc/counter3", zoomAndRotate0(343.1085, 197.7761), 142));
            assertNoMoreDirectives(unitsLayer1);
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var { game, player, unit } = createTinyGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            var actionLaunched = false;
            player.launchPlayableAction = function(unit, event) {
                actionLaunched = true;
            }
        when:
            resetDirectives(unitsLayer);
            clickOnPiece(game, unit)
        then:
            assert(game.selectedPlayable).equalsTo(unit);
            assert(actionLaunched).isTrue();
            loadAllImages();
            assertClearDirectives(unitsLayer);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit", zoomAndRotate0(416.6667, 351.8878)));
            assertNoMoreDirectives(unitsLayer);
        when:   // Check that "reselecting" an already selected unit relaunch action
            actionLaunched = false;
            clickOnPiece(game, unit);
        then:
            assert(game.selectedPlayable).equalsTo(unit);
            assert(actionLaunched).isTrue();
    });

    function showMarker(image, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #000000", "shadowBlur = 15",
                `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
            "restore()"
        ];
    }

    class TestOptionImageArtifact extends CBPieceImageArtifact {

        constructor(...args) {
            super(...args);
        }

        get slot() {
            return this.piece.slot;
        }

        get layer() {
            return this.piece.owner.formationNature ? CBLevelBuilder.ULAYERS.FOPTIONS : CBLevelBuilder.ULAYERS.OPTIONS;
        }

    }

    class CBTestOption extends HexLocatableMixin(PlayableMixin(CBPiece)) {

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

    it("Checks unit and option counters registration on layers", () => {
        given:
            var { game, map } = createBasicGame();
            var player = new CBAbstractPlayer();
            game.addPlayer(player);
            let unit1 = new CBTestPlayable(player, ["./../images/units/misc/unit1.png"]);
            let markerImage = DImage.getImage("./../images/markers/misc/markers1.png");
            let marker = new CBTestMarker(unit1, "units", [markerImage],
                new Point2D(0, 0), new Dimension2D(64, 64));
            unit1._element.addArtifact(marker);
            let unit2 = new CBTestPlayable(player, ["./../images/units/misc/unit2.png"]);
            let spell = new CBTestCounter(unit2, ["./../images/units/misc/spell.png"]);
            let option = new CBTestOption(unit2, "units",  ["./../images/units/misc/option.png"], new Dimension2D(142, 142));
            option.artifact.option = option;
            option.unit = unit2;
            loadAllImages();
            var hexId = map.getHex(4, 5);
            unit1.addToMap(hexId, CBStacking.TOP);
            unit2.addToMap(hexId, CBStacking.TOP);
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
            assertDirectives(spellsLayer1, showFakePiece("misc/spell", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(spellsLayer1);
            assertClearDirectives(optionsLayer1);
            assertDirectives(optionsLayer1, showFakePiece("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
            assertNoMoreDirectives(optionsLayer1);
    });

    it("Checks formations and formation's marker and options registration on layers", () => {
        given:
            var { game, map } = createBasicGame();
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
            var hexId = map.getHex(4, 5);
            var hexSideId = new CBHexSideId(hexId, hexId.getNearHex(120))
            formation1.addToMap(hexSideId, CBStacking.TOP);
            formation2.addToMap(hexSideId, CBStacking.TOP);
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
            assertDirectives(foptionsLayer1, showFakePiece("misc/option", zoomAndRotate0(343.1085, 101.5518), 142));
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

    it("Checks mark a unit as played without effectively playing it (useful for unit created on the fly)", () => {
        given:
            var {game, unit} = createTinyGame();
            var [markersLayer] = getLayers(game.board, "markers-0");
        when:
            resetDirectives(markersLayer);
            unit.markAsBeingPlayed();
        then:
            assert(unit.isActivated()).isTrue();
            assert(unit.isPlayed()).isTrue();
    });

    it("Checks played status of a unit when selection is changed or turn is changed", () => {
        given:
            var {game, player, unit1, unit2} = create2PlayablesTinyGame();
            player.launchPlayableAction = function(unit, event) {
                unit.launchAction(new CBAction(game, unit));
            }
        when:
            player.changeSelection(unit1, dummyEvent);
            unit1.action.markAsStarted();
        then:
            assert(unit1.isActivated()).isTrue();
            assert(unit1.isPlayed()).isFalse();
        when:
            clickOnPiece(game, unit2);
        then:
            assert(unit1.action).isDefined();
            assert(unit1.isActivated()).isTrue();
            assert(unit1.isPlayed()).isTrue();
        when:   // changing turn reset played status
            game.nextTurn();
        then:
            assert(unit1.action).isNotDefined();
            assert(unit1.isActivated()).isFalse();
            assert(unit1.isPlayed()).isFalse();
    });

    it("Checks playable sorting on Hex", () => {
        given:
            var { game, map } = createBasicGame();
            var spell = new CBHexCounter("ground", ["./../images/units/misc/spell.png"], new Dimension2D(50, 50));
            spell.spellNature = true;
            var blaze = new CBHexCounter("ground", ["./../images/units/misc/blaze.png"], new Dimension2D(50, 50));
            blaze.elementNature = true;
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
            assertDirectives(hexLayer0, showFakePiece("misc/blaze", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertDirectives(hexLayer1, showFakePiece("misc/spell", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
        when:
            var trap = new CBHexCounter("ground", ["./../images/units/misc/trap.png"], new Dimension2D(50, 50));
            trap.featureNature = true;
            trap.appendToMap(map.getHex(4, 5));
            loadAllImages();
            resetDirectives(hexLayer0, hexLayer1);
            repaint(game);
            var [hexLayer2] = getLayers(game.board, "hex-2");
        then:
            assertClearDirectives(hexLayer0);
            assertDirectives(hexLayer0, showFakePiece("misc/trap", zoomAndRotate0(333.3333, 121.1022)));
            assertNoMoreDirectives(hexLayer0);
            assertClearDirectives(hexLayer1);
            assertDirectives(hexLayer1, showFakePiece("misc/blaze", zoomAndRotate0(323.5582, 111.327)));
            assertNoMoreDirectives(hexLayer1);
            assertDirectives(hexLayer2, showFakePiece("misc/spell", zoomAndRotate0(313.783, 101.5518)));
            assertNoMoreDirectives(hexLayer2);
    });

});