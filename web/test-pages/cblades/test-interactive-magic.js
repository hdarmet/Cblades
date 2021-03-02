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
    createEvent, findInDirectives,
    getDirectives, getLayers,
    loadAllImages,
    mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    clickOnActionMenu,
    clickOnCounter,
    clickOnDice,
    clickOnMap,
    clickOnMask,
    clickOnResult,
    clickOnTrigger,
    executeAllAnimations,
    paint,
    repaint,
    rollFor
} from "./interactive-tools.js";
import {
    create2PlayersTinyGameWithLeader,
    createTinyGame, createTinyGameWithLeader
} from "./game-examples.js";
import {
    CBSpellTargetFoesActuator,
    CBSpellTargetFriendsActuator,
    CBSpellTargetHexesActuator,
    registerInteractiveMagic,
    unregisterInteractiveMagic
} from "../../jslib/cblades/interactive-magic.js";
import {
    CBSpell
} from "../../jslib/cblades/magic.js";

describe("Interactive Magic", ()=> {

    before(() => {
        registerInteractiveMagic();
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    after(() => {
        unregisterInteractiveMagic();
    });

    it("Checks that the unit menu contains menu items for magic", () => {
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
                    "setTransform(1, 0, 0, 1, 361.6667, 190)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "strokeStyle = #000000", "lineWidth = 1",
                    "strokeRect(-65, -185, 130, 370)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-65, -185, 130, 370)",
                "restore()"
            ]);
            assert(getDirectives(widgetItemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 340)",
                    "drawImage(/CBlades/images/icons/cast-spell-gray.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 340)",
                    "drawImage(/CBlades/images/icons/select-spell-gray.png, -25, -25, 50, 50)",
                "restore()"
            ]);
    });

    function clickOnChoseSpellAction(game) {
        return clickOnActionMenu(game, 0, 5);
    }

    it("Checks chose spell popup opening and closing", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, wizard);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnChoseSpellAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 241.6667, 363.1122)",
                    "shadowColor = #000000",
                    "shadowBlur = 15", "strokeStyle = #000000",
                    "lineWidth = 1",
                    "strokeRect(-185, -95, 370, 190)",
                    "fillStyle = #FFFFFF",
                    "fillRect(-185, -95, 370, 190)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/firesword1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/firesword2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/firesword3.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/rainfire1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/rainfire2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/rainfire3.png, -25, -25, 50, 50)",
                    "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 91.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/pentacle1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 151.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/pentacle2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/pentacle3.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 271.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/circle1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 331.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/circle2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 303.1122)",
                    "drawImage(/CBlades/images/magic/fire/circle3.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 91.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/fireball1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 151.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/fireball2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 363.1122)",
                    "drawImage(/CBlades/images/magic/fire/fireball3.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 91.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/blaze1.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 151.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/blaze2.png, -25, -25, 50, 50)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 211.6667, 423.1122)",
                    "drawImage(/CBlades/images/magic/fire/blaze3.png, -25, -25, 50, 50)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMap(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(wing.leader).isNotDefined();
    });

    function clickOnSpellMenu(game, col, row) {
        var icon = game.popup.getItem(col, row);
        let iconLocation = icon.viewportLocation;
        var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
        mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
    }

    it("Checks chose spell action", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer, spellsLayer0] = getLayers(game.board,"widgets", "widget-items", "spells-0");
            clickOnCounter(game, wizard);
            clickOnChoseSpellAction(game);
            paint(game);
            loadAllImages();
            resetDirectives(widgetsLayer, itemsLayer, spellsLayer0);
        when:
            clickOnSpellMenu(game, 1, 2);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(spellsLayer0, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 448.1122)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/magic/fire/fireb.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    function clickOnTryToCastSpellAction(game) {
        return clickOnActionMenu(game, 1, 5);
    }

    it("Checks cast spell action opening and cancelling", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnCounter(game, wizard);
            paint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTryToCastSpellAction(game);
            loadAllImages();
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 423.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/cast-spell-insert.png, -141.5, -350, 283, 700)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 603.1667, 393.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 543.1667, 453.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(wing.leader).isNotDefined();
    });

    it("Checks failed cast spell action process ", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer, commandsLayer, hexLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands", "hex-0");
            clickOnCounter(game, wizard);
            clickOnTryToCastSpellAction(game);
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
                    "setTransform(1, 0, 0, 1, 603.1667, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d5.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 543.1667, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d6.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 423.1122)",
                    "shadowColor = #A00000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer, hexLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(wizard.hasBeenPlayed()).isTrue();
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
            ]);
    });

    it("Checks successful cast simple (fire pentacle) spell action process ", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer, commandsLayer, hexLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands", "hex-0");
            clickOnCounter(game, wizard);
            clickOnTryToCastSpellAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 603.1667, 393.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 543.1667, 453.1122)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d2.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 391.6667, 423.1122)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer, hexLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 457.8873)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/magic/fire/pentacle1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
            assert(wizard.hasBeenPlayed()).isTrue();
    });

    function getTargetHexActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBSpellTargetHexesActuator) return actuator;
        }
        return null;
    }

    it("Checks successful cast hex spell (blaze) action process ", () => {
        given:
            var {game, map, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("blaze1"));
            var [actuatorsLayer, hexLayer] = getLayers(game.board,"actuators", "hex-0");
            clickOnCounter(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            resetDirectives(actuatorsLayer, hexLayer);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4, 10)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 448.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-hex.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
            assert(getDirectives(actuatorsLayer, -7, -1)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 0, 688.673)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-hex.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var actuator = getTargetHexActuator(game);
            var trigger = actuator.getTrigger(map.getHex(5, 6));
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, hexLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(hexLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 169.2143)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/magic/fire/blaze1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    function getTargetFriendActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBSpellTargetFriendsActuator) return actuator;
        }
        return null;
    }

    it("Checks successful cast friend targeted spell (firesword) action process ", () => {
        given:
            var {game, unit, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireSword1"));
            var [actuatorsLayer, optionsLayer] = getLayers(game.board,"actuators", "options-0");
            clickOnCounter(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 448.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-friend.png, -50, -55.5, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 416.6667, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-friend.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var actuator = getTargetFriendActuator(game);
            var trigger = actuator.getTrigger(unit.hexLocation);
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 406.8915, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/magic/fire/firesword1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    function getTargetFoeActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBSpellTargetFoesActuator) return actuator;
        }
        return null;
    }

    it("Checks successful cast foe targeted spell (fireball) action process ", () => {
        given:
            var {game, unit2:foe, leader1:wizard} = create2PlayersTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [actuatorsLayer, optionsLayer] = getLayers(game.board,"actuators", "options-0");
            clickOnCounter(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
            loadAllImages();
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 351.8878)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-foe.png, -50, -55.5, 100, 111)",
                "restore()",
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 583.3333, 448.1122)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/actuators/spell-target-foe.png, -50, -55.5, 100, 111)",
                "restore()"
            ]);
        when:
            var actuator = getTargetFoeActuator(game);
            var trigger = actuator.getTrigger(foe.hexLocation);
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
        then:
            assert(getDirectives(actuatorsLayer, 4)).arrayEqualsTo([
            ]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(0.4888, 0, 0, 0.4888, 573.5582, 347.0002)",
                    "shadowColor = #000000", "shadowBlur = 15",
                    "drawImage(/CBlades/images/magic/fire/fireball1.png, -71, -71, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks a fireball successful resolution action process ", () => {
        given:
            var {game, unit2:foe, leader1:wizard} = create2PlayersTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [widgetsLayer, itemsLayer, commandsLayer, unitsLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-0", "options-0");
            clickOnCounter(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe.hexLocation);
            clickOnTrigger(game, trigger); // select a target
            loadAllImages();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer, optionsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 0, 0)",
                    "globalAlpha = 0.3",
                    "fillStyle = #000000",
                    "fillRect(0, 0, 1000, 800)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 407, 92)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/combat-result-table-insert.png, -402, -87, 804, 174)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 247, 297.5)",
                    "shadowColor = #000000", "shadowBlur = 10",
                    "drawImage(/CBlades/images/inserts/fireball-insert.png, -222, -128.5, 444, 257)",
                "restore()"
            ]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 557, 219)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()",
                "save()",
                    "setTransform(1, 0, 0, 1, 497, 279)",
                    "shadowColor = #00FFFF", "shadowBlur = 10",
                    "drawImage(/CBlades/images/dice/d1.png, -50, -44.5, 100, 89)",
                "restore()"
            ]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
            ]);
        when:
            rollFor(1, 2);
            clickOnDice(game); // roll dices for fireball resolution
            executeAllAnimations();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                    "setTransform(1, 0, 0, 1, 407, 169)",
                    "shadowColor = #00A000", "shadowBlur = 100",
                    "drawImage(/CBlades/images/dice/success.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game); // click on success trigger
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer, optionsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([]);
            assert(findInDirectives(unitsLayer, "drawImage(/CBlades/images/units/misc/unit2b.png, -71, -71, 142, 142)")).isTrue();
    });

    it("Checks a fireball failed resolution action process ", () => {
        given:
            var {game, unit2:foe, leader1:wizard} = create2PlayersTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [widgetsLayer, itemsLayer, commandsLayer, unitsLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-0", "options-0");
            clickOnCounter(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe.hexLocation);
            clickOnTrigger(game, trigger); // select a target
            rollFor(5, 6);
            clickOnDice(game); // roll dices for fireball resolution
            executeAllAnimations();
            loadAllImages();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([
                "save()",
                "setTransform(1, 0, 0, 1, 407, 169)",
                "shadowColor = #A00000", "shadowBlur = 100",
                "drawImage(/CBlades/images/dice/failure.png, -75, -75, 150, 150)",
                "restore()"
            ]);
        when:
            clickOnResult(game); // click on success trigger
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer, optionsLayer, unitsLayer);
            repaint(game);
        then:
            assert(getDirectives(widgetsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(itemsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(commandsLayer, 4)).arrayEqualsTo([]);
            assert(getDirectives(optionsLayer, 4)).arrayEqualsTo([]);
            assert(findInDirectives(unitsLayer, "drawImage(/CBlades/images/units/misc/unit2b.png, -71, -71, 142, 142)")).isFalse();
    });
});
