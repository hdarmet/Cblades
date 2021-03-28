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
    assertDirectives,
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
    CBFormationMoveActuator,
    CBMoveActuator, CBRotationActuator,
    registerInteractiveMovement, unregisterInteractiveMovement
} from "../../jslib/cblades/interactive-movement.js";
import {
    repaint,
    paint,
    clickOnActionMenu,
    clickOnCounter,
    clickOnTrigger,
    dummyEvent,
    clickOnMask,
    rollFor
} from "./interactive-tools.js";
import {
    createTinyGame,
    create2PlayersTinyGame,
    createTinyFormationGame, create2PlayersTinyFormationGame
} from "./game-examples.js";

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
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)",
            "restore()",
        ];
    }

    function showMoveCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move-cost.png, -35, -35, 70, 70)",
                "font = bold 35px serif", "textAlign = center", "fillStyle = #2F528F",
                `fillText(${cost}, 0, 10)`,
            "restore()",
        ];
    }

    function showTowardTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)",
            "restore()",
        ];
    }

    function showTowardCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-move-cost.png, -27.5, -27.5, 55, 55)",
                "font = bold 30px serif", "textAlign = center", "fillStyle = #2F528F",
                `fillText(${cost}, 0, 10)`,
            "restore()",
        ];
    }

    function showMovementHelp(move, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-movement-points.png, -27.5, -27.5, 55, 55)",
                "font = bold 30px serif", "textAlign = center", "fillStyle = #2F528F",
                `fillText(${move}, 0, 10)`,
            "restore()"
        ];
    }

    function showTurnTrigger([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-turn.png, -40, -48, 80, 96)",
            "restore()"
        ];
    }

    function showTurnCostTrigger(cost, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(/CBlades/images/actuators/standard-turn-cost.png, -35, -35, 70, 70)",
                "font = bold 35px serif", "textAlign = center", "fillStyle = #2F528F",
                `fillText(${cost}, 0, 10)`,
            "restore()"
        ];
    }

    function zoomAndRotate0(e, f) {
        return [0.4888, 0, 0, 0.4888, e, f];
    }

    function zoomAndRotate30(e, f) {
        return [0.4233, 0.2444, -0.2444, 0.4233, e, f];
    }

    function zoomAndRotate60(e, f) {
        return [0.2444, 0.4233, -0.4233, 0.2444, e, f];
    }

    function zoomAndRotate90(e, f) {
        return [0, 0.4888, -0.4888, 0, e, f];
    }

    function zoomAndRotate120(e, f) {
        return [-0.2444, 0.4233, -0.4233, -0.2444, e, f];
    }

    function zoomAndRotate150(e, f) {
        return [-0.4233, 0.2444, -0.2444, -0.4233, e, f];
    }

    function zoomAndRotate180(e, f) {
        return [-0.4888, 0, 0, -0.4888, e, f];
    }

    function zoomAndRotate210(e, f) {
        return [-0.4233, -0.2444, 0.2444, -0.4233, e, f];
    }

    function zoomAndRotate240(e, f) {
        return [-0.2444, -0.4233, 0.4233, -0.2444, e, f];
    }

    function zoomAndRotate270(e, f) {
        return [0, -0.4888, 0.4888, 0, e, f];
    }

    function zoomAndRotate300(e, f) {
        return [0.2444, -0.4233, 0.4233, 0.2444, e, f];
    }

    function zoomAndRotate330(e, f) {
        return [0.4233, -0.2444, 0.2444, 0.4233, e, f];
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
            var [unitsLayer, widgetsLayer, widgetItemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, widgetItemsLayer);
            clickOnCounter(game, unit);
        then:
            loadAllImages();
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 301.6667, 326.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -35, 250, 70)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-125, -35, 250, 70)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/escape.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/to-face-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/move.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/move-back.png, -25, -25, 50, 50)",
                "restore()"
            ]);
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
            assert(game.selectedUnit).equalsTo(unit);
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
            assert(game.selectedUnit).equalsTo(unit);
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
                "drawImage(/CBlades/images/actuators/standard-move.png, -40, -65, 80, 130)"
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
                "drawImage(/CBlades/images/actuators/toward.png, -30, -40, 60, 80)"
            ]);
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
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(8);
            assert(unit.angle).equalsTo(0);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(0));
        then:
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(7);
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
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(6);
        when:
            var moveActuator4 = getMoveActuator(game);
            var orientationActuator4 = getOrientationActuator(game);
            Memento.undo();
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -295.3125)");
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -393.75)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(6);
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
            var moveActuator1 = getMoveActuator(game);
            var orientationActuator1 = getOrientationActuator(game);
        then:
            assert(unit.location.toString()).equalsTo("point(-170.5, -98.4375)");
            assert(unit.hexLocation.col).equalsTo(5);
            assert(unit.hexLocation.row).equalsTo(8);
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
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
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
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(60);
            assert(getMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.redo();
        then:
            assert(unit.location.toString()).equalsTo("point(0, -196.875)");
            assert(unit.hexLocation.col).equalsTo(6);
            assert(unit.hexLocation.row).equalsTo(7);
            assert(unit.angle).equalsTo(90);
            assert(getMoveActuator(game)).equalsTo(moveActuator4);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator4);
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
            assert(game.selectedUnit).equalsTo(formation);
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

    it("Checks Formation move using actuators (advance, rotate, turn around)", () => {
        given:
            var {game, formation} = createTinyFormationGame()
            clickOnCounter(game, formation);
            clickOnMoveAction(game);
            loadAllImages();
            var moveActuator1 = getFormationMoveActuator(game);
        then:
            assert(formation.location.toString()).equalsTo("point(-170.5, -196.875)");
            assert(formation.hexLocation.fromHex.col).equalsTo(5);
            assert(formation.hexLocation.fromHex.row).equalsTo(8);
            assert(formation.hexLocation.toHex.col).equalsTo(5);
            assert(formation.hexLocation.toHex.row).equalsTo(7);
            assert(formation.angle).equalsTo(90);
        when:
            clickOnTrigger(game, moveActuator1.getTrigger(120));
        then:
            assert(formation.hexLocation.fromHex.col).equalsTo(6);
            assert(formation.hexLocation.fromHex.row).equalsTo(8);
            assert(formation.hexLocation.toHex.col).equalsTo(6);
            assert(formation.hexLocation.toHex.row).equalsTo(7);
            assert(formation.angle).equalsTo(90);
        when:
            var moveActuator2 = getFormationMoveActuator(game);
            var orientationActuator2 = getOrientationActuator(game);
            clickOnTrigger(game, moveActuator2.getTurnTrigger(60));
        then:
            assert(formation.hexLocation.fromHex.col).equalsTo(6);
            assert(formation.hexLocation.fromHex.row).equalsTo(7);
            assert(formation.hexLocation.toHex.col).equalsTo(7);
            assert(formation.hexLocation.toHex.row).equalsTo(8);
            assert(formation.angle).equalsTo(30);
        when:
            var moveActuator3 = getFormationMoveActuator(game);
            var orientationActuator3 = getOrientationActuator(game);
            clickOnTrigger(game, orientationActuator3.getTrigger(210));
        then:
            assert(formation.hexLocation.fromHex.col).equalsTo(6);
            assert(formation.hexLocation.fromHex.row).equalsTo(7);
            assert(formation.hexLocation.toHex.col).equalsTo(7);
            assert(formation.hexLocation.toHex.row).equalsTo(8);
            assert(formation.angle).equalsTo(210);
        when:
            Memento.undo();
        then:
            assert(formation.hexLocation.fromHex.col).equalsTo(6);
            assert(formation.hexLocation.fromHex.row).equalsTo(7);
            assert(formation.hexLocation.toHex.col).equalsTo(7);
            assert(formation.hexLocation.toHex.row).equalsTo(8);
            assert(formation.angle).equalsTo(30);
            assert(getFormationMoveActuator(game)).equalsTo(moveActuator3);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator3);
        when:
            Memento.undo();
        then:
            assert(formation.hexLocation.fromHex.col).equalsTo(6);
            assert(formation.hexLocation.fromHex.row).equalsTo(8);
            assert(formation.hexLocation.toHex.col).equalsTo(6);
            assert(formation.hexLocation.toHex.row).equalsTo(7);
            assert(getFormationMoveActuator(game)).equalsTo(moveActuator2);
            assert(getOrientationActuator(game)).equalsTo(orientationActuator2);
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

    it("Checks Unit movement points management during move", () => {
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

    it("Checks that extended move is proposed when unit does not have enough movement point", () => {
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
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/standard-move.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("/CBlades/images/actuators/toward.png");
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
            moveActuator = getMoveActuator(game);
            orientationActuator = getOrientationActuator(game);
        then:
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/extended-move.png");
            assert(orientationActuator.getTrigger(30).image.path).equalsTo("/CBlades/images/actuators/extended-toward.png");
        when:
            clickOnTrigger(game, moveActuator.getTrigger(0));
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
            assert(moveActuator.getTrigger(0).image.path).equalsTo("/CBlades/images/actuators/minimal-move.png");
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
            assert(unit.tiredness).equalsTo(1);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 255.6635)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/tired.png, -32, -32, 64, 64)",
                "restore()"
            ]);
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
            assert(unit.tiredness).equalsTo(2);
            assert(unit.hasBeenPlayed()).isTrue();   // Unit is played automatically because no further movement/reorientation is possble
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 381.9648, 159.4391)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/exhausted.png, -32, -32, 64, 64)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 451.3685, 124.7373)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
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
            unit1.action.moveUnit(map.getHex(5, 5), dummyEvent);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    function moveUnitByAction(unit, hex) {
        unit.player.startMoveUnit(unit, dummyEvent);
        unit.action.moveUnit(hex);
    }

    function moveUnit1OnContactToUnit2(map, unit1, unit2) {
        unit1.move(map.getHex(2, 5));
        unit2.move(map.getHex(2, 3));
        unit2.rotate(180);
        unit1.player.selectUnit(unit1, dummyEvent);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-attacker-engagement-insert.png, 0, 0, 444, 763, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
        when:
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 448.1122)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
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
            assert(getDirectives(formationsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 500, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(formationsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 400)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 396.5)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 396.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

    function clickOnRoutAction(game) {
        return clickOnActionMenu(game, 2, 0);
    }

    it("Checks rout action actuators appearance for a troop", () => {
        given:
            var { game, unit1 } = create2PlayersTinyGame();
            var [unitsLayer, actuatorsLayer] = getLayers(game.board, "units-0", "actuators");
            clickOnCounter(game, unit1);
            clickOnRoutAction(game);
            loadAllImages();
            let orientationActuator = getOrientationActuator(game);
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.2444, -0.4233, 0.4233, -0.2444, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.2444, -0.4233, 0.4233, -0.2444, 333.3333, 400)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
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
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
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
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 396.5)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/disengagement-insert.png, 0, 0, 444, 797, -222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 396.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -398.5, 444, 797)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 212)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 396.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 436.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 496.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);

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
            assert(getDirectives(unitsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.2444, 0.4233, -0.4233, -0.2444, 416.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
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
            assert(getDirectives(formationsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 500, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTurnCostTrigger("1",zoomAndRotate120( 591.6667, 332.643)));
            assertDirectives(actuatorsLayer, showTurnTrigger(zoomAndRotate120(566.6667, 318.2093)));
            assertDirectives(actuatorsLayer, showMovementHelp("2", zoomAndRotate90(485.3372, 366.5506)));
        when:
            resetDirectives(formationsLayer, actuatorsLayer);
            clickOnTrigger(game, moveActuator.getTurnTrigger(120));
        then:
            assert(getDirectives(formationsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4233, 0.2444, -0.2444, -0.4233, 541.6667, 375.9439)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-confront-engagement-insert.png, 0, 0, 444, 763, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
            paint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-confront-engagement-insert.png, 0, 0, 444, 763, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
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
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3", "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/check-confront-engagement-insert.png, 0, 0, 444, 763, -222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 227, 386.5)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -381.5, 444, 763)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/moral-insert.png, 0, 0, 444, 389, -222, -194.5, 444, 389)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 661, 202)",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-222, -194.5, 444, 389)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 449, 386.5)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 549, 426.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 489, 486.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(unit1.isDisrupted()).isTrue();
    });

});