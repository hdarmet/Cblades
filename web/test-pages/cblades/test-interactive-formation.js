'use strict'

import {
    after,
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DAnimator,
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    clickOnActionMenu,
    clickOnCounter, clickOnTrigger, paint, repaint
} from "./interactive-tools.js";
import {
    create2UnitsTinyGame,
    createTinyGame,
    createTinyFormationGame, create2UnitsAndAFormationTinyGame
} from "./game-examples.js";
import {
    CBCreateFormationActuator, CBReleaseTroopActuator,
    registerInteractiveFormation,
    unregisterInteractiveFormation
} from "../../jslib/cblades/interactive-formation.js";
import {
    CBHexSideId,
    CBMoveType
} from "../../jslib/cblades/game.js";

describe("Interactive Formation", ()=> {

    before(() => {
        registerInteractiveFormation();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveFormation();
    });

    it("Checks that the unit menu contains menu items for formation management", () => {
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
                    "setTransform(1, 0, 0, 1, 301.6667, 236.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-125, -125, 250, 250)", "fillStyle = #FFFFFF",
                    "fillRect(-125, -125, 250, 250)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/leave-formation-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/dismiss-formation-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/create-formation-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 326.8878)",
                    "drawImage(/CBlades/images/icons/join-formation-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function clickOnCreateFormationAction(game) {
        return clickOnActionMenu(game, 0, 3);
    }

    function getCreateFormationActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBCreateFormationActuator) return actuator;
        }
        return null;
    }

    it("Checks create formation action process", () => {
        given:
            var {game, map, leader, unit1, unit2} = create2UnitsTinyGame();
            unit1.angle = 90;
            unit2.angle = 90;
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(2);
            unit1.move(map.getHex(8, 8), 0);
            unit2.move(map.getHex(8, 7), 0);
            unit1.receiveOrder(true);
            unit2.receiveOrder(true);
            leader.move(null, 0);
            var [unitsLayer, formationsLayer, actuatorsLayer] = getLayers(game.board,"units-0", "formations-0", "actuators");
            clickOnCounter(game, unit1);
            clickOnCreateFormationAction(game);
            let createFormationActuator = getCreateFormationActuator(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, actuatorsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 666.6667, 400)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unitb.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 666.6667, 303.7757)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/unit.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(-0.4888, 0, 0, -0.4888, 666.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/formation.png, -40, -85, 80, 170)",
                "restore()"
            ]);
            assert(createFormationActuator.getTrigger(unit2.hexLocation)).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, actuatorsLayer);
            clickOnTrigger(game, createFormationActuator.getTrigger(unit2.hexLocation));
            loadAllImages();
            paint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 666.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation1b.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
    });

    function clickOnBreakFormationAction(game) {
        return clickOnActionMenu(game, 3, 3);
    }

    it("Checks break formation action process", () => {
        given:
            var {game, map, leader, formation} = createTinyFormationGame();
            formation.receiveOrder(true);
            loadAllImages();
            paint(game);
            var [unitsLayer, formationsLayer] = getLayers(game.board,"units-0", "formations-0");
            clickOnCounter(game, formation);
            clickOnBreakFormationAction(game);
            loadAllImages();
        when:
            resetDirectives(unitsLayer, formationsLayer);
            repaint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/troop.png, -71, -71, 142, 142)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 255.6635)",
                    "shadowColor = #000000", "shadowBlur = 15", "drawImage(/CBlades/images/units/misc/troop.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    function clickOnReleaseTroopsAction(game) {
        return clickOnActionMenu(game, 2, 3);
    }

    function getReleaseTroopsActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBReleaseTroopActuator) return actuator;
        }
        return null;
    }

    it("Checks release troops from formation action process", () => {
        given:
            var {game, formation} = createTinyFormationGame();
            formation.receiveOrder(true);
            var [unitsLayer, formationsLayer, markersLayer, actuatorsLayer] =
                getLayers(game.board,"units-0", "formations-0", "markers-0", "actuators");
            clickOnCounter(game, formation);
            clickOnReleaseTroopsAction(game);
            loadAllImages();
        when:
            resetDirectives(formationsLayer, actuatorsLayer, markersLayer);
            repaint(game);
        then:
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 303.7757)",
                "shadowColor = #FF0000", "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/formation3.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 451.3685, 373.1794)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 332.643)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 332.643)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 361.5103)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 361.5103)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 274.9084)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 274.9084)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 246.0411)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 246.0411)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()"
            ]);
        when:
            var releaseTroopActuator = getReleaseTroopsActuator(game);
            var trigger = releaseTroopActuator.getTrigger(formation.hexLocation.fromHex, 2, CBMoveType.FORWARD);
        then:
            assert(trigger).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, markersLayer, actuatorsLayer);
            clickOnTrigger(game, trigger);
            loadAllImages();
            paint(game);
            var [units1Layer, formations1Layer, markers1Layer] = getLayers(game.board,"units-1", "formations-1", "markers-1");
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 416.6667, 351.8878)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/troop.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(markersLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 451.3685, 386.5897)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/actiondone.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(getDirectives(formations1Layer)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 423.998, 296.4443)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation2.png, -142, -71, 284, 142)",
                "restore()"
            ]);
            assert(getDirectives(markers1Layer)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.6999, 365.848)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/markers/ordergiven.png, -32, -32, 64, 64)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 274.9084)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 274.9084)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-half.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 458.3333, 246.0411)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()",
                "save()",
                    "setTransform(0, -0.4888, 0.4888, 0, 375, 246.0411)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/quit-full.png, -32, -30, 64, 60)",
                "restore()"
            ]);
        when:
            releaseTroopActuator = getReleaseTroopsActuator(game);
            trigger = releaseTroopActuator.getTrigger(formation.hexLocation.toHex, 1, CBMoveType.BACKWARD);
        then:
            assert(trigger).isDefined();
        when:
            resetDirectives(unitsLayer, formationsLayer, markersLayer, units1Layer, formations1Layer, markers1Layer, actuatorsLayer);
            clickOnTrigger(game, trigger);
            loadAllImages();
            paint(game);
    });

    function clickOnIncludeTroopsAction(game) {
        return clickOnActionMenu(game, 1, 3);
    }

    it("Checks include troops action process", () => {
        given:
            var {game, map, leader, unit1, unit2, formation} = create2UnitsAndAFormationTinyGame();
            unit1.angle = 90;
            unit2.angle = 90;
            unit1.fixRemainingLossSteps(1);
            unit2.fixRemainingLossSteps(2);
            unit1.receiveOrder(true);
            unit2.receiveOrder(true);
            leader.move(null, 0);
            formation.angle = 90;
            formation.fixRemainingLossSteps(4);
            unit1.move(map.getHex(8, 8), 0);
            formation.move(new CBHexSideId(unit1.hexLocation, unit2.hexLocation), 0);
            unit2.move(map.getHex(8, 7), 0);
            formation.receiveOrder(true);
            clickOnCounter(game, formation);
        when:
            var [unitsLayer, formationsLayer] = getLayers(game.board,"units-0", "formations-0");
            resetDirectives(unitsLayer, formationsLayer);
            clickOnIncludeTroopsAction(game);
            paint(game);
        then:
            assert(getDirectives(unitsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(formationsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0, 0.4888, -0.4888, 0, 666.6667, 351.8878)",
                    "shadowColor = #FF0000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/units/misc/formation3b.png, -142, -71, 284, 142)",
                "restore()"
            ]);
    });
});