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
    assertDirectives, assertNoMoreDirectives,
    createEvent, findInDirectives,
    getLayers,
    loadAllImages,
    mockPlatform, resetDirectives, skipDirectives
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    clickOnActionMenu,
    clickOnPiece,
    clickOnDice,
    clickOnMap,
    clickOnMask,
    clickOnResult,
    clickOnTrigger,
    executeAllAnimations,
    paint,
    repaint,
    rollFor,
    showDice,
    showFailureResult,
    showInsert,
    showMask, showMenuItem, showMenuPanel, showPlayedDice,
    showSuccessResult,
    zoomAndRotate0, mouseMoveOnTrigger, mouseMoveOnArtifact
} from "./interactive-tools.js";
import {
    create2Players2Units2LeadersTinyGame, create2Players2UnitsALeaderAnArcaneWizardTinyGame,
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

    function showSpell(spell, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #000000", "shadowBlur = 10",
                `drawImage(./../images/magic/${spell}.png, -71, -71, 142, 142)`,
            "restore()"
        ];
    }

    function spellTargetFoe([a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/actuators/spell-target-foe.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }
    function spellTargetFriend([a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            "drawImage(./../images/actuators/spell-target-friend.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }
    function spellTargetHex([a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            "drawImage(./../images/actuators/spell-target-hex.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }
    function mouseOverSpellTargetHex([a, b, c, d, e, f]) {
        return [
            "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            "drawImage(./../images/actuators/spell-target-hex.png, -50, -55.5, 100, 111)",
            "restore()"
        ];
    }
    it("Checks that the unit menu contains menu items for magic", () => {
        given:
            var {game, unit} = createTinyGame();
            var [unitsLayer, widgetsLayer, itemsLayer] = getLayers(game.board, "units-0", "widgets", "widget-items");
            loadAllImages();
        when:
            resetDirectives(unitsLayer, widgetsLayer, itemsLayer);
            clickOnPiece(game, unit);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(2, 6, 361.6667, 190));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(1, 5, "icons/cast-spell", 2, 6, 361.6667, 190));
            assertDirectives(itemsLayer, showMenuItem(0, 5, "icons/select-spell", 2, 6, 361.6667, 190));
    });

    function clickOnChoseSpellAction(game) {
        return clickOnActionMenu(game, 0, 5);
    }

    it("Checks chose spell popup opening and closing", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, wizard);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnChoseSpellAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMenuPanel(6, 3, 241.6667, 363.1122));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(3, 1, "magic/fire/firesword1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(4, 1, "magic/fire/firesword2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(5, 1, "magic/fire/firesword3", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "magic/fire/rainfire1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(4, 2, "magic/fire/rainfire2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(5, 2, "magic/fire/rainfire3", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(0, 0, "magic/fire/pentacle1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "magic/fire/pentacle2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "magic/fire/pentacle3", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "magic/fire/circle1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(4, 0, "magic/fire/circle2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(5, 0, "magic/fire/circle3", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(0, 1, "magic/fire/fireball1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "magic/fire/fireball2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "magic/fire/fireball3", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(0, 2, "magic/fire/blaze1", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "magic/fire/blaze2", 6, 3, 241.6667, 363.1122));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "magic/fire/blaze3", 6, 3, 241.6667, 363.1122));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMap(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
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
            clickOnPiece(game, wizard);
            clickOnChoseSpellAction(game);
            repaint(game);
            loadAllImages();
            resetDirectives(widgetsLayer, itemsLayer, spellsLayer0);
        when:
            clickOnSpellMenu(game, 1, 2);
            loadAllImages();
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            skipDirectives(spellsLayer0, 4);
            assertDirectives(spellsLayer0, showSpell("fire/fireb", zoomAndRotate0(416.6667, 448.1122)));
    });

    function clickOnTryToCastSpellAction(game) {
        return clickOnActionMenu(game, 1, 5);
    }

    it("Checks cast spell action opening and cancelling", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer] = getLayers(game.board,"widgets", "widget-items");
            clickOnPiece(game, wizard);
            repaint(game);
        when:
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnTryToCastSpellAction(game);
            loadAllImages();
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("cast-spell", 391.6667, 423.1122, 444, 600));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 683.6667, 393.1122));
        when:       // Clicking on the mask cancel the action
            resetDirectives(widgetsLayer, itemsLayer);
            clickOnMask(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assert(wing.leader).isNotDefined();
    });

    it("Checks failed cast spell action process ", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer, commandsLayer, hexLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands", "hex-0");
            clickOnPiece(game, wizard);
            clickOnTryToCastSpellAction(game);
            loadAllImages();
        when:
            rollFor(5,6);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(5, 6, 683.6667, 393.1122));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(391.6667, 423.1122));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer, hexLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assert(wizard.isPlayed()).isTrue();
            assertNoMoreDirectives(hexLayer, 4);
    });

    it("Checks successful simple (fire pentacle) spell cast action process ", () => {
        given:
            var {game, wing, leader:wizard} = createTinyGameWithLeader();
            wizard.choseSpell(CBSpell.laboratory.get("firePentacle1"));
            var [widgetsLayer, itemsLayer, commandsLayer, hexLayer] = getLayers(game.board,"widgets", "widget-items", "widget-commands", "hex-0");
            clickOnPiece(game, wizard);
            clickOnTryToCastSpellAction(game);
            loadAllImages();
        when:
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            resetDirectives(commandsLayer, itemsLayer);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showPlayedDice(1, 2, 683.6667, 393.1122));
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(391.6667, 423.1122));
        when:
            clickOnResult(game);
            resetDirectives(widgetsLayer, commandsLayer, itemsLayer, hexLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            skipDirectives(hexLayer, 4);
            assertDirectives(hexLayer, showSpell("fire/pentacle1", zoomAndRotate0(416.6667, 457.8873)));
            assert(wizard.isPlayed()).isTrue();
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
            clickOnPiece(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            var actuator = getTargetHexActuator(game);
            var trigger = actuator.getTrigger(map.getHex(5, 6));
        when:
            mouseMoveOnTrigger(game, trigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, spellTargetHex(zoomAndRotate0(416.6667, 255.6635)));
            assertDirectives(actuatorsLayer, mouseOverSpellTargetHex(zoomAndRotate0(416.6667, 159.4391)));
        when:
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, hexLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(hexLayer, 4);
            assertDirectives(hexLayer, showSpell("fire/blaze1", zoomAndRotate0(416.6667, 169.2143)));
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
            var [actuatorsLayer, optionsLayer] = getLayers(game.board,"actuators-0", "options-0");
            clickOnPiece(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
            loadAllImages();
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, spellTargetFriend(zoomAndRotate0(416.6667, 448.1122)));
            assertDirectives(actuatorsLayer, spellTargetFriend(zoomAndRotate0(416.6667, 351.8878)));
        when:
            var actuator = getTargetFriendActuator(game);
            var trigger = actuator.getTrigger(unit);
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(optionsLayer, 4);
            assertDirectives(optionsLayer, showSpell("fire/firesword1", zoomAndRotate0(406.8915, 347.0002)));
    });

    function getTargetFoeActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBSpellTargetFoesActuator) return actuator;
        }
        return null;
    }

    it("Checks successful cast foe targeted spell (fireball) action process ", () => {
        given:
            var {game, map, unit2:foe, leader1:wizard} = create2Players2Units2LeadersTinyGame();
            wizard.hexLocation = map.getHex(5, 9);
            foe.hexLocation = map.getHex(7, 8);
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [actuatorsLayer, optionsLayer] = getLayers(game.board,"actuators-0", "options-0");
            clickOnPiece(game, wizard);
            clickOnTryToCastSpellAction(game);
            rollFor(1, 2);
            clickOnDice(game);
            executeAllAnimations();
            clickOnResult(game);
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
            loadAllImages();
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, spellTargetFoe(zoomAndRotate0(583.3333, 351.8878)));
            assertDirectives(actuatorsLayer, spellTargetFoe(zoomAndRotate0(500, 400)));
        when:
            var actuator = getTargetFoeActuator(game);
            var trigger = actuator.getTrigger(foe);
            clickOnTrigger(game, trigger);
            loadAllImages();
            resetDirectives(actuatorsLayer, optionsLayer);
            repaint(game);
        then:
            assertNoMoreDirectives(actuatorsLayer, 4);
            skipDirectives(optionsLayer, 4);
            assertDirectives(optionsLayer, showSpell("fire/fireball1", zoomAndRotate0(573.5582, 347.0002)));
    });

    it("Checks a fireball successful resolution action process ", () => {
        given:
            var {game, unit2:foe, leader1:wizard} = create2Players2Units2LeadersTinyGame();
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [widgetsLayer, itemsLayer, commandsLayer, unitsLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-0", "options-0");
            clickOnPiece(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe);
            clickOnTrigger(game, trigger); // select a target
            loadAllImages();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer, optionsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 407, 92, 804, 174));
            assertDirectives(widgetsLayer, showInsert("fireball", 247, 297.5, 444, 257));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 557, 219));
            assertNoMoreDirectives(commandsLayer, 4);
        when:
            rollFor(1, 2);
            clickOnDice(game); // roll dices for fireball resolution
            executeAllAnimations();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(407, 169));
        when:
            clickOnResult(game); // click on success trigger
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assertNoMoreDirectives(optionsLayer, 4);
            assert(findInDirectives(unitsLayer, "drawImage(./../images/units/misc/unit2b.png, -71, -71, 142, 142)")).isTrue();
    });

    it("Checks a fireball failed resolution action process ", () => {
        given:
            var {game, unit2:foe, leader1:wizard} = create2Players2Units2LeadersTinyGame();
            wizard.choseSpell(CBSpell.laboratory.get("fireball1"));
            var [widgetsLayer, itemsLayer, commandsLayer, unitsLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-0", "options-0");
            clickOnPiece(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe);
            clickOnTrigger(game, trigger); // select a target
            rollFor(5, 6);
            clickOnDice(game); // roll dices for fireball resolution
            executeAllAnimations();
            loadAllImages();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(407, 169));
        when:
            clickOnResult(game); // click on success trigger
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assertNoMoreDirectives(optionsLayer, 4);
            assert(findInDirectives(unitsLayer, "drawImage(./../images/units/misc/unit2b.png, -71, -71, 142, 142)")).isFalse();
    });

    it("Checks a magic arrow successful resolution action process ", () => {
        given:
            var {game, leader2:foe, leader1:wizard} = create2Players2UnitsALeaderAnArcaneWizardTinyGame();
            wizard.choseSpell(CBSpell.laboratory.get("magicArrow1"));
            repaint(game);
            var [widgetsLayer, itemsLayer, commandsLayer, leaderLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-1", "options-0");
            clickOnPiece(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe);
            clickOnTrigger(game, trigger); // select a target
            loadAllImages();
            resetDirectives(widgetsLayer, itemsLayer, commandsLayer, optionsLayer);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showMask());
            assertDirectives(widgetsLayer, showInsert("combat-result-table", 407, 92, 804, 174));
            assertDirectives(widgetsLayer, showInsert("magic-arrow", 247, 289.5, 444, 241));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showDice(1, 1, 557, 219));
            assertNoMoreDirectives(commandsLayer, 4);
        when:
            rollFor(1, 2);
            clickOnDice(game); // roll dices for magic arrow resolution
            executeAllAnimations();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showSuccessResult(407, 169));
        when:
            clickOnResult(game); // click on success trigger
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assertNoMoreDirectives(optionsLayer, 4);
            assert(findInDirectives(leaderLayer, "drawImage(./../images/units/misc/leader2b.png, -60, -60, 120, 120)")).isTrue();
    });

    it("Checks a magic arrow failed resolution action process ", () => {
        given:
            var {game, leader2:foe, leader1:wizard} = create2Players2UnitsALeaderAnArcaneWizardTinyGame();
            wizard.choseSpell(CBSpell.laboratory.get("magicArrow1"));
            repaint(game);
            var [widgetsLayer, itemsLayer, commandsLayer, leaderLayer, optionsLayer] =
                getLayers(game.board,"widgets", "widget-items", "widget-commands", "units-1", "options-0");
            clickOnPiece(game, wizard);   // show action menu
            clickOnTryToCastSpellAction(game); // select cast action
            rollFor(1, 2);
            clickOnDice(game); // roll dices
            executeAllAnimations();
            clickOnResult(game); // click on success trigger
            var actuator = getTargetFoeActuator(game); // a foe selection actuator appears
            var trigger = actuator.getTrigger(foe);
            clickOnTrigger(game, trigger); // select a target
            rollFor(5, 6);
            clickOnDice(game); // roll dices for fireball resolution
            executeAllAnimations();
            loadAllImages();
            repaint(game);
        then:
            skipDirectives(commandsLayer, 4);
            assertDirectives(commandsLayer, showFailureResult(407, 169));
        when:
            clickOnResult(game); // click on success trigger
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(itemsLayer, 4);
            assertNoMoreDirectives(commandsLayer, 4);
            assertNoMoreDirectives(optionsLayer, 4);
            assert(findInDirectives(leaderLayer, "drawImage(./../images/units/misc/unit2b.png, -60, -60, 120, 120)")).isFalse();
    });













});
