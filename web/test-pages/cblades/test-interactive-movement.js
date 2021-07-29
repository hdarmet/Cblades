'use strict'

import {
    after,
    assert, before, describe, executeTimeouts, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    assertDirectives, assertHex, assertHexSide, assertNoMoreDirectives,
    createEvent,
    filterPainting, getDirectives, getLayers,
    loadAllImages,
    mockPlatform, removeFilterPainting, resetDirectives, skipDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    DDice, DResult
} from "../../jslib/widget.js";
import {
    CBFormationMoveActuator, CBMovementHelpActuator,
    CBMoveActuator, CBRotationActuator,
    registerInteractiveMovement, unregisterInteractiveMovement
} from "../../jslib/cblades/interactive-movement.js";
import {
    repaint, paint, clickOnActionMenu, clickOnCounter, clickOnTrigger,
    dummyEvent, clickOnMask, rollFor,
    zoomAndRotate0, zoomAndRotate30, zoomAndRotate60, zoomAndRotate90, zoomAndRotate120, zoomAndRotate150,
    zoomAndRotate180, zoomAndRotate210, zoomAndRotate240, zoomAndRotate270, zoomAndRotate300, zoomAndRotate330,
    showFailureResult, showSuccessResult, showInsert, showMask, showDice, showPlayedDice, showMarker, showSelectedTroop,
    showSelectedFormation, showMenuPanel, showMenuItem, showMultiInsert, showInsertCommand, showInsertMark
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2PlayersTinyGame,
    createTinyFormationGame, create2PlayersTinyFormationGame
} from "./game-examples.js";
import {
    CBOrderInstruction,
    CBTiredness
} from "../../jslib/cblades/unit.js";
import {
    CBMoveMode
} from "../../jslib/cblades/game.js";

describe("Interactive Movement", ()=> {

    before(() => {
        registerInteractiveMovement();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveMovement();
    });

    function showMoveTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-move.png, -40, -65, 80, 130)",
            "restore()",
        ];
    }

    function showMoveCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-move-cost.png, -35, -35, 70, 70)",
                "font = bold 35px serif", "textAlign = center", "textBaseline = middle", "fillStyle = #2F528F",
            `fillText(${cost}, 0, 0)`,
            "restore()",
        ];
    }

    function showTowardTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/toward.png, -30, -40, 60, 80)",
            "restore()",
        ];
    }

    function showTowardCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-move-cost.png, -27.5, -27.5, 55, 55)",
                "font = bold 30px serif", "textAlign = center", "textBaseline = middle", "fillStyle = #2F528F",
            `fillText(${cost}, 0, 0)`,
            "restore()",
        ];
    }

    function showMovementHelp(move, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-movement-points.png, -27.5, -27.5, 55, 55)",
                "font = bold 30px serif", "textAlign = center", "textBaseline = middle", "fillStyle = #2F528F",
            `fillText(${move}, 0, 0)`,
            "restore()"
        ];
    }

    function showTurnTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-turn.png, -40, -48, 80, 96)",
            "restore()"
        ];
    }

    function showTurnCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-turn-cost.png, -35, -35, 70, 70)",
                "font = bold 35px serif", "textAlign = center", "textBaseline = middle", "fillStyle = #2F528F",
            `fillText(${cost}, 0, 0)`,
            "restore()"
        ];
    }

    function clickOnMoveAction(game) {
        return clickOnActionMenu(game, 0, 0);
    }

    function getOrientationActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBRotationActuator) return actuator;
        }
        return null;
    }

    function getMoveActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBMoveActuator) return actuator;
        }
        return null;
    }

    it("Checks that the unit menu contains menu items for movement", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, itemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, itemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(4, 1, 301.6667, 326.8878));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(2, 0, "icons/escape", 4, 1, 301.6667, 326.8878));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "icons/to-face", 4, 1, 301.6667, 326.8878));
            assertDirectives(itemsLayer, showMenuItem(0, 0, "icons/move", 4, 1, 301.6667, 326.8878));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "icons/move-back", 4, 1, 301.6667, 326.8878));
    });

    it("Checks move action actuators when Troop is oriented toward an hexside", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(game.selectedCounter).equalsTo(unit);
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
            skipDirectives(actuatorLayer, 4);

            assertDirectives(actuatorLayer, showMoveCostTrigger("1", zoomAndRotate0(416.6667, 226.7962)));
            assertDirectives(actuatorLayer, showMoveTrigger(zoomAndRotate0(416.6667, 265.2859)));
            assertDirectives(actuatorLayer, showMoveCostTrigger("1", zoomAndRotate60(525, 289.342)));
            assertDirectives(actuatorLayer, showMoveTrigger(zoomAndRotate60(491.6667, 308.5869)));
            assertDirectives(actuatorLayer, showMoveCostTrigger("1", zoomAndRotate300(308.3333, 289.342)));
            assertDirectives(actuatorLayer, showMoveTrigger(zoomAndRotate300(341.6667, 308.5869)));

            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate30(452.9167, 289.1014)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate30(443.75, 304.9785)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate60(479.1667, 315.8037)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate60(462.5, 325.4261)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate90(489.1667, 351.8878)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate90(470.8333, 351.8878)));

            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate120(479.1667, 387.972)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate120(462.5, 378.3495)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate150(452.9167, 414.6742)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate150(443.75, 398.7972)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate180(416.6667, 424.0561)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate180(416.6667, 404.8112)));

            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate210(380.4167, 414.6742)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate210(389.5833, 398.7972)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate240(354.1667, 387.972)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate240(370.8333, 378.3495)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate270(344.1667, 351.8878)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate270(362.5, 351.8878)));

            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate300(354.1667, 315.8037)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate300(370.8333, 325.4261)));
            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate330(380.4167, 289.1014)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("0.5", zoomAndRotate330(389.5833, 304.9785)));

            assertDirectives(actuatorLayer, showMovementHelp("2", zoomAndRotate0(431.3294, 366.5506)));
    });

    it("Checks move action actuators when Troop is oriented toward a vertex", () => {
        given:
            var { game, unit } = createTinyGame();
        when:
            unit.angle = 30;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        then:
            assert(game.selectedCounter).equalsTo(unit);
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isDefined();
            assert(orientationActuator.getTrigger(30)).isNotDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks move action actuators appearance", () => {
        given:
            var { game, unit } = createTinyGame();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
        when:
            filterPainting(moveActuator.getTrigger(0));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 265.2859)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/standard-move.png, -40, -65, 80, 130)"
            ]);
        when:
            removeFilterPainting(moveActuator.getTrigger(0));
            filterPainting(orientationActuator.getTrigger(30));
            resetDirectives(actuatorsLayer);
            stopRegister(actuatorsLayer);
            paint(game);
        then:
            assert(getDirectives(actuatorsLayer)).arrayEqualsTo([
                "setTransform(0.4233, 0.2444, -0.2444, 0.4233, 452.9167, 289.1014)",
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
    });

    function getMovementHelpActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBMovementHelpActuator) return actuator;
        }
        return null;
    }

    it("Checks movement rules showing", () => {
        given:
            var { game, unit } = createTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            let helpActuator = getMovementHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, helpActuator.getTrigger());
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showMultiInsert("movement-table", 455, 188, 900, 366, [
                {xs:0, ys:0, xd:-450, yd:-183, w:67, h:256},
                {xs:67, ys:0, xd:-383, yd:-183, w:833, h:256},
                {xs:0, ys:256, xd:-450, yd:73, w:900, h:110}
            ]));
            assertDirectives(widgetsLayer, showInsertCommand("right", 870, 133));
            assertDirectives(widgetsLayer, showInsert("movement", 233, 571, 444, 400));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks Unit move using actuators (move, rotate, move)", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getMoveActuator(game);
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assertHex(unit.hexLocation, [5, 8]);
            assert(unit.angle).equalsTo(0);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(0));
        then:
            assertHex(unit.hexLocation, [5, 7]);
        when:
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator2.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(unit.angle).equalsTo(60);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator3.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(0, -393.75)");
            assertHex(unit.hexLocation, [6, 6]);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assertHex(unit.hexLocation, [5, 7]);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -393.75)");
            assertHex(unit.hexLocation, [6, 6]);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
    });

    it("Checks Unit move using actuators (rotate, move, rotate)", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assertHex(unit.hexLocation, [5, 8]);
            assert(unit.angle).equalsTo(0);
        when:
            clickOnTrigger(game, orientationActuator1.getTrigger(60));
        then:
            assert(unit.angle).equalsTo(60);
        when:
            var moveActuator2 = getMoveActuator(game);
            clickOnTrigger(game, moveActuator2.getTrigger(60));
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assertHex(unit.hexLocation, [6, 7]);
        when:
            var moveActuator3 = getMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getTrigger(90));
        then:
            assert(unit.angle).equalsTo(90);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assertHex(unit.hexLocation, [6, 7]);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assertHex(unit.hexLocation, [6, 7]);
            assert(unit.angle).equalsTo(90);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
    });

    it("Checks that a unit is automatically played when its movement points are exhausted", () => {
        given:
            var {game, unit} = createTinyGame();
            unit.fixTirednessLevel(CBTiredness.EXHAUSTED);
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
        when:
            var orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(60));
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
            orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(90));
        then:
            assert(unit.angle).equalsTo(90);
            assert(unit.hasBeenPlayed()).isTrue();
    });

    function getFormationMoveActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFormationMoveActuator) return actuator;
        }
        return null;
    }

    it("Checks move action actuators when the unit is a formation", () => {
        given:
            var { game, formation } = createTinyFormationGame();
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            let moveActuator = getFormationMoveActuator(game);
            let orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(game.selectedCounter).equalsTo(formation);
            assert(moveActuator).isDefined();
            assert(moveActuator.getTurnTrigger(60)).isDefined();
            assert(moveActuator.getTurnTrigger(120)).isDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(moveActuator.getTrigger(120)).isDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(90)).isNotDefined();
            skipDirectives(actuatorLayer, 4);

            assertDirectives(actuatorLayer, showMoveCostTrigger("1", zoomAndRotate60(525, 193.1177)));
            assertDirectives(actuatorLayer, showMoveTrigger(zoomAndRotate60(491.6667, 212.3625)));
            assertDirectives(actuatorLayer, showMoveCostTrigger("1", zoomAndRotate120(525, 414.4337)));
            assertDirectives(actuatorLayer, showMoveTrigger(zoomAndRotate120(491.6667, 395.1888)));

            assertDirectives(actuatorLayer, showTurnCostTrigger("1", zoomAndRotate60(508.3333, 323.0205)));
            assertDirectives(actuatorLayer, showTurnTrigger(zoomAndRotate60(483.3333, 337.4542)));
            assertDirectives(actuatorLayer, showTurnCostTrigger("1", zoomAndRotate120(508.3333, 284.5308)));
            assertDirectives(actuatorLayer, showTurnTrigger(zoomAndRotate120(483.3333, 270.0971)));

            assertDirectives(actuatorLayer, showTowardTrigger(zoomAndRotate270(344.1667, 303.7757)));
            assertDirectives(actuatorLayer, showTowardCostTrigger("1", zoomAndRotate270(362.5, 303.7757)));

            assertDirectives(actuatorLayer, showMovementHelp("2", zoomAndRotate90(402.0039, 318.4384)));
    });

    it("Checks Formation move using actuators (advance, rotate, turn around) using move triggers", () => {
        given:
            var {game, formation} = createTinyFormationGame()
            clickOnCounter(game, formation);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getFormationMoveActuator(game);
        then:
            assert(formation.location.toString()).equalsTo("point(-170.5, -196.875)");
            assertHexSide(formation.hexLocation, [5, 8], [5, 7]);
            assert(formation.angle).equalsTo(90);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(120));
        then:
            assertHexSide(formation.hexLocation, [6, 8], [6, 7]);
            assert(formation.angle).equalsTo(90);
        when:
            var moveActuator2 = getFormationMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator2.getTurnTrigger(60));
        then:
            assertHexSide(formation.hexLocation, [6, 7], [7, 8]);
            assert(formation.angle).equalsTo(30);
        when:
            var moveActuator3 = getFormationMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getTrigger(210));
        then:
            assertHexSide(formation.hexLocation, [6, 7], [7, 8]);
            assert(formation.angle).equalsTo(210);
        when:
            Memento.undo();
        then:
            assertHexSide(formation.hexLocation, [6, 7], [7, 8]);
            assert(formation.angle).equalsTo(30);
            assert(getFormationMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.undo();
        then:
            assertHexSide(formation.hexLocation, [6, 8], [6, 7]);
            assert(getFormationMoveActuator(game)).equalsTo(moveActuator2);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator2);
    });

    it("Checks Formation move using actuators (advance, rotate, turn around) using cost triggers", () => {
        given:
            var {game, formation} = createTinyFormationGame()
            clickOnCounter(game, formation);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getFormationMoveActuator(game);
        when:
            clickOnTrigger(game, moveActuator1.getCostTrigger(120));
        then:
            assertHexSide(formation.hexLocation, [6, 8], [6, 7]);
            assert(formation.angle).equalsTo(90);
        when:
            var moveActuator2 = getFormationMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator2.getTurnCostTrigger(60));
        then:
            assertHexSide(formation.hexLocation, [6, 7], [7, 8]);
            assert(formation.angle).equalsTo(30);
        when:
            var moveActuator3 = getFormationMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getCostTrigger(210));
        then:
            assertHexSide(formation.hexLocation, [6, 7], [7, 8]);
            assert(formation.angle).equalsTo(210);
    });

    function resetAllDirectives(game) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        resetDirectives(unitsLayer, markersLayer, actuatorsLayer);
    }

    function registerAllDirectives(game) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        return {
            units:[...getDirectives(unitsLayer)],
            markers:[...getDirectives(markersLayer)],
            actuators:[...getDirectives(actuatorsLayer)]
        };
    }

    function assertAllDirectives(game, picture) {
        var [unitsLayer, markersLayer, actuatorsLayer] = getLayers(game.board,"units-0", "markers-0", "actuators");
        assert(getDirectives(unitsLayer)).arrayEqualsTo(picture.units);
        assert(getDirectives(markersLayer)).arrayEqualsTo(picture.markers);
        assert(getDirectives(actuatorsLayer)).arrayEqualsTo(picture.actuators);
    }

    it("Checks appearance when undoing (move, rotate, move)", () => {
        given:
            var {game, unit} = createTinyGame();
            loadAllImages();
            paint(game);
            resetAllDirectives(game);
        when:
            clickOnCounter(game, unit);
            loadAllImages();
            resetAllDirectives(game);
            clickOnMoveAction(game);
            loadAllImages();
            resetAllDirectives(game);
            repaint(game);
            var picture1 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            resetAllDirectives(game);
            repaint(game);
            var picture2 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            resetAllDirectives(game);
            repaint(game);
            var picture3 = registerAllDirectives(game);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture3);
        when:
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture2);
        when:
            Memento.undo();
        then:
            resetAllDirectives(game);
            repaint(game);
            assertAllDirectives(game, picture1);
        when:
            Memento.undo();
    });

    it("Checks Unit movement points management during move (using normal triggers)", () => {
        given:
            var {game, unit} = createTinyGame()
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(unit.movementPoints).equalsTo(2);
            assert(unit.extendedMovementPoints).equalsTo(3);
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
        then:
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            var orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(60));
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(1.5);
        when:
            Memento.undo();
        then:
            assert(unit.movementPoints).equalsTo(1);
            assert(unit.extendedMovementPoints).equalsTo(2);
        when:
            Memento.redo();
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(1.5);
    });

    it("Checks that extended move is proposed when unit does not have enough movement point (using cost triggers)", () => {
        given:
            var {game, unit} = createTinyGame()
            unit.movementPoints = 1;
            unit.extendedMovementPoints = 2;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator.getTrigger(0).image.path).equalsTo("./../images/actuators/standard-move.png");
            assert(moveActuator.getCostTrigger(0).image.path).equalsTo("./../images/actuators/standard-move-cost.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("./../images/actuators/toward.png");
            assert(orientationActuator.getCostTrigger(90).image.path).equalsTo("./../images/actuators/standard-move-cost.png");
        when:
            clickOnTrigger(game, moveActuator.getCostTrigger(0));
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator.getTrigger(0).image.path).equalsTo("./../images/actuators/extended-move.png");
            assert(moveActuator.getCostTrigger(0).image.path).equalsTo("./../images/actuators/extended-move-cost.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("./../images/actuators/extended-toward.png");
            assert(orientationActuator.getCostTrigger(90).image.path).equalsTo("./../images/actuators/extended-move-cost.png");
        when:
            clickOnTrigger(game, moveActuator.getCostTrigger(0));
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks that minimal move is proposed as first move when there are not enough movement points", () => {
        given:
            var {game, unit} = createTinyGame()
            unit.movementPoints = 0.5;
            unit.extendedMovementPoints = 0.5;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator = getMoveActuator(game);
        then:
            assert(unit.movementPoints).equalsTo(0.5);
            assert(unit.extendedMovementPoints).equalsTo(0.5);
            assert(moveActuator.getTrigger(0).image.path).equalsTo("./../images/actuators/minimal-move.png");
    });

    it("Checks that move may inflict tiredness", () => {
        given:
            var {game, unit} = createTinyGame();
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
        when:
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
        then:
            assert(unit.isTired()).isTrue();
    });

    it("Checks that rotation may inflict tiredness", () => {
        given:
            var {game, unit} = createTinyGame();
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
        when:
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(60));
            let orientationActuator = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator.getTrigger(90));
        then:
            assert(unit.isTired()).isTrue();
    });

    it("Checks Unit tiredness progression (fresh -> tired -> exhausted)", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, markersLayer] = getLayers(game.board,"units-0", "markers-0");
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            unit.movementPoints = 0.5;
            loadAllImages();
            paint(game);
            var moveActuator1 = getMoveActuator(game);
        when:
            resetDirectives(markersLayer, unitsLayer);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.TIRED);
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 255.6635)));
            skipDirectives(markersLayer, 4);
            assertDirectives(markersLayer, showMarker("tired", zoomAndRotate0(381.9648, 255.6635)));
        when:
            game.nextTurn();
            unit.movementPoints = 0.5;
            clickOnCounter(game, unit);
            clickOnMoveAction(game);
            paint(game);
            resetDirectives(markersLayer);
            clickOnTrigger(game, getMoveActuator(game).getTrigger(0));
            loadAllImages();
        then:
            assert(unit.tiredness).equalsTo(CBTiredness.EXHAUSTED);
            assert(unit.hasBeenPlayed()).isTrue();   // Unit is played automatically because no further movement/reorientation is possble
            skipDirectives(markersLayer, 4);
            assertDirectives(markersLayer, showMarker("exhausted", zoomAndRotate0(381.9648, 159.4391)));
            assertDirectives(markersLayer, showMarker("actiondone", zoomAndRotate0(451.3685, 124.7373)));
    });

    function executeAllAnimations() {
        while(DAnimator.isActive()) {
            executeTimeouts();
        }
    }

    function clickOnDice(game) {
        var itemsLevel = game.board.getLevel("widget-items");
        for (let item of itemsLevel.artifacts) {
            if (item.element instanceof DDice) {
                let itemLocation = item.viewportLocation;
                var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
                item.onMouseClick(mouseEvent);
                return;
            }
        }
    }

    function clickOnResult(game) {
        var commandsLevel = game.board.getLevel("widget-commands");
        for (let item of commandsLevel.artifacts) {
            if (item.element instanceof DResult) {
                let itemLocation = item.viewportLocation;
                var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
                item.onMouseClick(mouseEvent);
                return;
            }
        }
    }

    it("Checks attacker engagement process ", () => {
        given:
            var {map, player1, unit1, unit2} = create2PlayersTinyGame();
        when:
            unit1.hexLocation = map.getHex(5, 5);
            unit2.hexLocation = map.getHex(5, 3);
            moveUnitByAction(unit1, map.getHex(5, 4));
        then:
            assert(unit1.isEngaging()).isTrue();
        when:
            moveUnitByAction(unit1, map.getHex(5, 5));
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    function moveUnitByAction(unit, hex) {
        unit.player.startMoveUnit(unit, CBMoveMode.NO_CONSTRAINT, dummyEvent);
        unit.action.moveUnit(hex, unit.hexLocation.isNearHex(hex));
    }

    function moveUnit1OnContactToUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 5));
        unit2.move(map.getHex(2, 3));
        unit2.rotate(180);
        unit1.player.selectCounter(unit1, dummyEvent);
        map.game.closePopup();
        moveUnitByAction(unit1, map.getHex(2, 4));
        loadAllImages();
    }

    it("Checks attacker engagement check appearance (and cancelling next action)", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            var finished = false;
            player1.finishTurn(()=>{finished = true;})
            loadAllImages();
            paint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-attacker-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 426.5));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer);
            assert(finished).isFalse();
    });

    it("Checks when a unit successfully pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
            loadAllImages();
        when:
            rollFor(1,2);
            clickOnDice(game);
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
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isFalse();
            assert(finished).isTrue();
    });

    it("Checks when a unit fail to pass an attacker engagement check", () => {
        given:
            var {game, map, player1, unit1, unit2} = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            moveUnit1OnContactToUnit2(map, unit1, unit2);
            var finished = false;
            player1.finishTurn(()=>{finished=true;})
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 426.5));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 386.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isTrue();
            assert(finished).isTrue();
    });

    function clickOnMoveBackAction(game) {
        return clickOnActionMenu(game, 1, 0);
    }

    it("Checks move back action actuators appearance for a troop", () => {
        given:
            var { game, unit1 } = create2PlayersTinyGame();
            var [unitsLayer, actuatorsLayer] = getLayers(game.board, "units-0", "actuators");
            clickOnCounter(game, unit1);
            clickOnMoveBackAction(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate180(416.6667, 476.9795)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate180(416.6667, 438.4897)));
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate240(308.3333, 414.4337)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate240(341.6667, 395.1888)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate0(431.3294, 366.5506)));
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            clickOnTrigger(game, moveActuator.getTrigger(180));
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 448.1122)));
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    it("Checks move back rules showing", () => {
        given:
            var { game, unit1 } = create2PlayersTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit1);
            clickOnMoveBackAction(game);
            loadAllImages();
            let helpActuator = getMovementHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, helpActuator.getTrigger());
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showMultiInsert("movement-table", 455, 188, 900, 366, [
                {xs:0, ys:0, xd:-450, yd:-183, w:67, h:256},
                {xs:67, ys:0, xd:-383, yd:-183, w:833, h:256},
                {xs:0, ys:256, xd:-450, yd:73, w:900, h:110}
            ]));
            assertDirectives(widgetsLayer, showInsertCommand("right", 870, 133));
            assertDirectives(widgetsLayer, showInsert("move-back", 233, 571, 444, 400));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks move back action actuators appearance for a formation", () => {
        given:
            var { game, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [formationsLayer, actuatorsLayer] = getLayers(game.board, "formations-0", "actuators");
            unit1.move(null);
            game.nextTurn();
            clickOnCounter(game, formation2);
            clickOnMoveBackAction(game);
            loadAllImages();
            let moveActuator = getFormationMoveActuator(game);
        when:
            resetDirectives(formationsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation12", zoomAndRotate90(500, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate240(391.6667, 462.5458)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate240(425, 443.301)));
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate300(391.6667, 241.2298)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate300(425, 260.4747)));
            assertDirectives(actuatorsLayer, showTurnCostTrigger("1", zoomAndRotate240(408.3333, 332.643)));
            assertDirectives(actuatorsLayer, showTurnTrigger(zoomAndRotate240(433.3333, 318.2093)));
            assertDirectives(actuatorsLayer, showTurnCostTrigger("1", zoomAndRotate300(408.3333, 371.1327)));
            assertDirectives(actuatorsLayer, showTurnTrigger(zoomAndRotate300(433.3333, 385.5663)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate90(485.3372, 366.5506)));
        when:
            resetDirectives(formationsLayer, actuatorsLayer);
            clickOnTrigger(game, moveActuator.getTrigger(240));
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation12", zoomAndRotate90(416.6667, 400)));
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    it("Checks disengagement appearance after move back action (and cancelling disengagement)", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnMoveBackAction(game);
            paint(game);
            loadAllImages();
            let moveActuator = getMoveActuator(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTrigger(game, moveActuator.getTrigger(180));
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 436.5));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
    });

    it("Checks when a unit successfully pass disengagement after move back action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnMoveBackAction(game);
            let moveActuator = getMoveActuator(game);
        when:
            clickOnTrigger(game, moveActuator.getTrigger(180));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 396.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 436.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit fails to pass disengagement after move back action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnMoveBackAction(game);
            let moveActuator = getMoveActuator(game);
        when:
            clickOnTrigger(game, moveActuator.getTrigger(180));
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 396.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 436.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isTrue();
    });

    function clickOnRoutAction(game) {
        return clickOnActionMenu(game, 2, 0);
    }

    it("Checks rout action actuators appearance for a troop", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [unitsLayer, actuatorsLayer] = getLayers(game.board, "units-0", "actuators");
            clickOnCounter(game, unit1);
            clickOnRoutAction(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0(416.6667, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate300( 308.3333, 289.342)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate300(341.6667, 308.5869)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate240(354.1667, 387.972)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate240( 370.8333, 378.3495)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate300(354.1667, 315.8037)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5", zoomAndRotate300(370.8333, 325.4261)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate0(431.3294, 366.5506)));
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            clickOnTrigger(game, orientationActuator.getTrigger(240));
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate240(416.6667, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate240( 308.3333, 414.4337)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate240(341.6667, 395.1888)));
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate300( 308.3333, 289.342)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate300(341.6667, 308.5869)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate240(422.0336, 331.8581)));
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
        then:
            moveActuator = getMoveActuator(game);
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate240( 333.3333, 400)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate240( 225, 462.5458)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate240(258.3333, 443.301)));
            assertDirectives(actuatorsLayer, showMoveCostTrigger("1", zoomAndRotate300( 225, 337.4542)));
            assertDirectives(actuatorsLayer, showMoveTrigger(zoomAndRotate300(258.3333, 356.699)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate300(270.8333, 363.9159)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate300( 287.5, 373.5383)));
            assertDirectives(actuatorsLayer, showMovementHelp("1", zoomAndRotate240(338.7003, 379.9703)));
        when:
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            resetDirectives(unitsLayer, actuatorsLayer);
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    it("Checks rout rules showing", () => {
        given:
            var { game, unit1 } = create2PlayersTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit1);
            clickOnRoutAction(game);
            loadAllImages();
            let helpActuator = getMovementHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, helpActuator.getTrigger());
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showMultiInsert("movement-table", 455, 188, 900, 366, [
                {xs:0, ys:0, xd:-450, yd:-183, w:67, h:256},
                {xs:67, ys:0, xd:-383, yd:-183, w:833, h:256},
                {xs:0, ys:256, xd:-450, yd:73, w:900, h:110}
            ]));
            assertDirectives(widgetsLayer, showInsertCommand("right", 870, 133));
            assertDirectives(widgetsLayer, showInsert("rout", 233, 571, 444, 400));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks disengagement appearance after rout action (and cancelling disengagement)", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [actuatorsLayer, widgetsLayer, itemsLayer] = getLayers(game.board,"actuators", "widgets", "widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnRoutAction(game);
            paint(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            clickOnTrigger(game, orientationActuator.getTrigger(240));
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            loadAllImages();
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            resetDirectives(actuatorsLayer, widgetsLayer, itemsLayer);
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            loadAllImages();
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 436.5));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
    });

    it("Checks when a unit successfully pass disengagement after rout action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnRoutAction(game);
            let orientationActuator = getOrientationActuator(game);
        when:
            clickOnTrigger(game, orientationActuator.getTrigger(240));
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            resetDirectives(widgetsLayer, itemsLayer);
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 396.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 436.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit fails to pass disengagement after rout action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(0));
            unit2.rotate(180, 0);
            clickOnCounter(game, unit1);
            unit2.markAsEngaging(true); // AFTER clickOnCounter to avoid engagement test
            clickOnRoutAction(game);
            let orientationActuator = getOrientationActuator(game);
        when:
            clickOnTrigger(game, orientationActuator.getTrigger(240));
            var moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            resetDirectives(widgetsLayer, itemsLayer);
            moveActuator = getMoveActuator(game);
            clickOnTrigger(game, moveActuator.getTrigger(240));
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("disengagement", 227, 396.5, 444, 797));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 212, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 396.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 436.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isTrue();
    });

    function clickOnConfrontAction(game) {
        return clickOnActionMenu(game, 3, 0);
    }

    it("Checks confront action actuators appearance for a troop", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [unitsLayer, actuatorsLayer] = getLayers(game.board, "units-0", "actuators");
            unit2.move(unit1.hexLocation.getNearHex(120));
            clickOnCounter(game, unit1);
            clickOnConfrontAction(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate0( 416.6667, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate60(479.1667, 315.8037)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate60( 462.5, 325.4261)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate90(489.1667, 351.8878)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate90( 470.8333, 351.8878)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate120(479.1667, 387.972)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate120( 462.5, 378.3495)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate150(452.9167, 414.6742)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate150( 443.75, 398.7972)));
            assertDirectives(actuatorsLayer, showTowardTrigger(zoomAndRotate180(416.6667, 424.0561)));
            assertDirectives(actuatorsLayer, showTowardCostTrigger("0.5",zoomAndRotate180( 416.6667, 404.8112)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate0(431.3294, 366.5506)));
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            clickOnTrigger(game, orientationActuator.getTrigger(120));
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("misc/unit1", zoomAndRotate120( 416.6667, 351.8878)));
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    it("Checks confront rules showing", () => {
        given:
            var { game, unit1 } = create2PlayersTinyGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            clickOnCounter(game, unit1);
            clickOnConfrontAction(game);
            loadAllImages();
            let helpActuator = getMovementHelpActuator(game);
        when:
            resetDirectives(widgetsLayer);
            clickOnTrigger(game, helpActuator.getTrigger());
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("to-face", 227, 366.5506, 444, 298));
        when:
            resetDirectives(widgetsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
    });

    it("Checks confront action actuators appearance for a formation", () => {
        given:
            var { game, unit1, formation2 } = create2PlayersTinyFormationGame();
            var [formationsLayer, actuatorsLayer] = getLayers(game.board, "formations-0", "actuators");
            unit1.move(formation2.hexLocation.fromHex.getNearHex(180));
            game.nextTurn();
            clickOnCounter(game, formation2);
            clickOnConfrontAction(game);
            loadAllImages();
            let moveActuator = getFormationMoveActuator(game);
        when:
            resetDirectives(formationsLayer, actuatorsLayer);
            repaint(game);
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation12", zoomAndRotate90(500, 351.8878)));
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTurnCostTrigger("1",zoomAndRotate120( 591.6667, 332.643)));
            assertDirectives(actuatorsLayer, showTurnTrigger(zoomAndRotate120(566.6667, 318.2093)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate90(485.3372, 366.5506)));
        when:
            resetDirectives(formationsLayer, actuatorsLayer);
            clickOnTrigger(game, moveActuator.getTurnTrigger(120));
        then:
            skipDirectives(formationsLayer, 4);
            assertDirectives(formationsLayer, showSelectedFormation("misc/formation12", zoomAndRotate150(541.6667, 375.9439)));
            assertNoMoreDirectives(actuatorsLayer, 4);
    });

    it("Checks engagement appearance after confront action (and cancelling disengagement)", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            unit2.move(unit1.hexLocation.getNearHex(180));
            unit2.rotate(0, 0);
            clickOnCounter(game, unit1);
            clickOnConfrontAction(game);
            paint(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTrigger(game, orientationActuator.getTrigger(180));
            paint(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-confront-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 549, 426.5));
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
    });

    it("Checks when a unit successfully pass engagement after confront action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(180));
            unit2.rotate(0, 0);
            clickOnCounter(game, unit1);
            clickOnConfrontAction(game);
            var orientationActuator = getOrientationActuator(game);
        when:
            clickOnTrigger(game, orientationActuator.getTrigger(180));
            rollFor(1,2);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-confront-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(449, 386.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 549, 426.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks when a unit fails to pass engagement after confront action", () => {
        given:
            var { game, unit1, unit2 } = create2PlayersTinyGame();
            var [widgetsLayer, commandsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-commands","widget-items");
            unit2.move(unit1.hexLocation.getNearHex(180));
            unit2.rotate(0, 0);
            clickOnCounter(game, unit1);
            clickOnConfrontAction(game);
            var orientationActuator = getOrientationActuator(game);
        when:
            clickOnTrigger(game, orientationActuator.getTrigger(180));
            rollFor(5, 6);
            clickOnDice(game);
            executeAllAnimations();
            loadAllImages();
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("check-confront-engagement", 227, 386.5, 444, 763));
            assertDirectives(widgetsLayer, showInsertMark( 20, 372));
            assertDirectives(widgetsLayer, showInsertMark( 20, 390));
            assertDirectives(widgetsLayer, showInsert("moral", 661, 202, 444, 389));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(449, 386.5));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 549, 426.5));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(unit1.isDisrupted()).isTrue();
    });

    it("Checks Troop when it attack moves", () => {
        given:
            var {game, map, arbitrator, wing1, unit1} = create2PlayersTinyGame();
            unit1.hexLocation = map.getHex(2, 8);
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.ATTACK;
                return actions;
            });
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit1);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isNotDefined();
            assert(moveActuator.getTrigger(60)).isDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isNotDefined();
            assert(moveActuator.getTrigger(240)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isNotDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isNotDefined();
            assert(orientationActuator.getTrigger(180)).isNotDefined();
            assert(orientationActuator.getTrigger(210)).isNotDefined();
            assert(orientationActuator.getTrigger(240)).isNotDefined();
            assert(orientationActuator.getTrigger(270)).isNotDefined();
            assert(orientationActuator.getTrigger(300)).isNotDefined();
            assert(orientationActuator.getTrigger(330)).isNotDefined();
    });

    it("Checks Formation when it attack moves", () => {
        given:
            var {game, map, arbitrator, wing2, formation2} = create2PlayersTinyFormationGame();
            formation2.hexLocation = map.getHex(10, 8).toward(120);
            formation2.angle = 210;
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.ATTACK;
                return actions;
            });
            game.nextTurn(null);
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation2);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getFormationMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isNotDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isNotDefined();
            assert(moveActuator.getTrigger(240)).isDefined();
            assert(moveActuator.getTurnTrigger(300)).isNotDefined();
            assert(moveActuator.getTurnTrigger(0)).isNotDefined();
            assert(moveActuator.getTurnTrigger(60)).isNotDefined();
            assert(moveActuator.getTurnTrigger(120)).isNotDefined();
            assert(moveActuator.getTurnTrigger(180)).isNotDefined();
            assert(moveActuator.getTurnTrigger(240)).isDefined();
            assert(orientationActuator).isNotDefined();
    });

    it("Checks Formation when it has to turn to attack moves", () => {
        given:
            var {game, map, arbitrator, wing2, formation2} = create2PlayersTinyFormationGame();
            formation2.hexLocation = map.getHex(10, 8).toward(180);
            formation2.angle = 90;
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.ATTACK;
                return actions;
            });
            game.nextTurn(null);
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation2);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getFormationMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
    });

    it("Checks Troop when it fire moves", () => {
        given:
            var {game, map, arbitrator, wing1, unit1} = create2PlayersTinyGame();
            unit1.hexLocation = map.getHex(5, 8);
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.FIRE;
                return actions;
            });
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit1);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isNotDefined();
            assert(moveActuator.getTrigger(240)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
            assert(orientationActuator.getTrigger(60)).isDefined();
            assert(orientationActuator.getTrigger(90)).isNotDefined();
            assert(orientationActuator.getTrigger(120)).isNotDefined();
            assert(orientationActuator.getTrigger(150)).isNotDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks Troop when it moves in defense mode", () => {
        given:
            var {game, map, arbitrator, wing1, unit1} = create2PlayersTinyGame();
            unit1.angle = 60
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.DEFEND;
                return actions;
            });
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit1);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isNotDefined();
            assert(moveActuator.getTrigger(240)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
            assert(orientationActuator.getTrigger(60)).isNotDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks Formation when it moves in defense mode", () => {
        given:
            var {game, map, arbitrator, formation2} = create2PlayersTinyFormationGame();
            formation2.hexLocation = map.getHex(10, 8).toward(120);
            formation2.angle = 210;
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.DEFEND;
                return actions;
            });
            game.nextTurn(null);
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation2);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getFormationMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isNotDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isDefined();
            assert(moveActuator.getTrigger(240)).isDefined();
            assert(moveActuator.getTurnTrigger(300)).isNotDefined();
            assert(moveActuator.getTurnTrigger(0)).isNotDefined();
            assert(moveActuator.getTurnTrigger(60)).isNotDefined();
            assert(moveActuator.getTurnTrigger(120)).isNotDefined();
            assert(moveActuator.getTurnTrigger(180)).isDefined();
            assert(moveActuator.getTurnTrigger(240)).isDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
    });

    it("Checks Troop when it moves in regroup mode", () => {
        given:
            var {game, map, arbitrator, wing1, unit1} = create2PlayersTinyGame();
            unit1.angle = 60
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.REGROUP;
                return actions;
            });
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit1);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isNotDefined();
            assert(moveActuator.getTrigger(240)).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
            assert(orientationActuator.getTrigger(60)).isNotDefined();
            assert(orientationActuator.getTrigger(90)).isDefined();
            assert(orientationActuator.getTrigger(120)).isDefined();
            assert(orientationActuator.getTrigger(150)).isDefined();
            assert(orientationActuator.getTrigger(180)).isDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks Formation when it moves in regroup mode", () => {
        given:
            var {game, map, arbitrator, formation2} = create2PlayersTinyFormationGame();
            formation2.hexLocation = map.getHex(10, 8).toward(120);
            formation2.angle = 210;
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.REGROUP;
                return actions;
            });
            game.nextTurn(null);
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation2);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getFormationMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isDefined();
            assert(moveActuator.getTrigger(300)).isNotDefined();
            assert(moveActuator.getTrigger(0)).isNotDefined();
            assert(moveActuator.getTrigger(60)).isNotDefined();
            assert(moveActuator.getTrigger(120)).isNotDefined();
            assert(moveActuator.getTrigger(180)).isDefined();
            assert(moveActuator.getTrigger(240)).isDefined();
            assert(moveActuator.getTurnTrigger(300)).isNotDefined();
            assert(moveActuator.getTurnTrigger(0)).isNotDefined();
            assert(moveActuator.getTurnTrigger(60)).isNotDefined();
            assert(moveActuator.getTurnTrigger(120)).isNotDefined();
            assert(moveActuator.getTurnTrigger(180)).isDefined();
            assert(moveActuator.getTurnTrigger(240)).isDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
    });

    it("Checks Troop when it moves in retreat mode", () => {
        given:
            var {game, map, arbitrator, wing1, unit1} = create2PlayersTinyGame();
            unit1.angle = 60
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.RETREAT;
                return actions;
            });
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, unit1);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(0)).isNotDefined();
            assert(orientationActuator.getTrigger(30)).isNotDefined();
            assert(orientationActuator.getTrigger(60)).isNotDefined();
            assert(orientationActuator.getTrigger(90)).isNotDefined();
            assert(orientationActuator.getTrigger(120)).isNotDefined();
            assert(orientationActuator.getTrigger(150)).isNotDefined();
            assert(orientationActuator.getTrigger(180)).isNotDefined();
            assert(orientationActuator.getTrigger(210)).isDefined();
            assert(orientationActuator.getTrigger(240)).isDefined();
            assert(orientationActuator.getTrigger(270)).isDefined();
            assert(orientationActuator.getTrigger(300)).isDefined();
            assert(orientationActuator.getTrigger(330)).isDefined();
    });

    it("Checks Formation when it moves in retreat mode", () => {
        given:
            var {game, map, arbitrator, formation2} = create2PlayersTinyFormationGame();
            formation2.hexLocation = map.getHex(10, 8).toward(120);
            formation2.angle = 210;
            arbitrator.updateAllowedActions(actions=>{
                actions.moveMode = CBMoveMode.RETREAT;
                return actions;
            });
            game.nextTurn(null);
            var [actuatorLayer] = getLayers(game.board,"actuators");
        when:
            clickOnCounter(game, formation2);
            resetDirectives(actuatorLayer);
            clickOnMoveAction(game);
            var moveActuator = getFormationMoveActuator(game);
            var orientationActuator = getOrientationActuator(game);
            loadAllImages();
        then:
            assert(moveActuator).isNotDefined();
            assert(orientationActuator).isDefined();
            assert(orientationActuator.getTrigger(30)).isDefined();
    });

});