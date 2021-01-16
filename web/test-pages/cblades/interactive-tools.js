import {createEvent, loadAllImages, mockPlatform} from "../mocks.js";
import {CBGame, CBMap} from "../../jslib/cblades/game.js";
import {CBArbitrator} from "../../jslib/cblades/arbitrator.js";
import {CBInteractivePlayer} from "../../jslib/cblades/interactive-player.js";
import {CBCharacter, CBTroop, CBUnitType, CBWing} from "../../jslib/cblades/unit.js";
import {Memento} from "../../jslib/mechanisms.js";
import {DAnimator, getDrawPlatform} from "../../jslib/draw.js";
import {executeTimeouts} from "../../jstest/jtest.js";
import {DDice, DMessage, DResult} from "../../jslib/widget.js";

export function paint(game) {
    game._board.paint();
}

export function repaint(game) {
    game._board.repaint();
}


export function createTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var wing = new CBWing(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let unitType = new CBUnitType("unit", ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex( 5, 8));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, wing, map, unit };
}

export function create2PlayersTinyGame() {
    let game = new CBGame();
    let arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    let player1 = new CBInteractivePlayer();
    game.addPlayer(player1);
    let player2 = new CBInteractivePlayer();
    game.addPlayer(player2);
    let map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing1 = new CBWing(player1);
    let unitType1 = new CBUnitType("unit1", ["/CBlades/images/units/misc/unit1.png", "/CBlades/images/units/misc/unit1b.png"]);
    let unit1 = new CBTroop(unitType1, wing1);
    game.addUnit(unit1, map.getHex(5, 8));
    let wing2 = new CBWing(player2);
    let unitType2 = new CBUnitType("unit2", ["/CBlades/images/units/misc/unit2.png", "/CBlades/images/units/misc/unit2b.png"]);
    let unit2 = new CBTroop(unitType2, wing2);
    game.addUnit(unit2, map.getHex(6, 8));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing1, wing2, player1, player2};
}

export function create2UnitsTinyGame() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let wing = new CBWing(player);
    let leaderType = new CBUnitType("leader",
        ["/CBlades/images/units/misc/character.png", "/CBlades/images/units/misc/characterb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    let unitType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit1 = new CBTroop(unitType, wing);
    let unit2 = new CBTroop(unitType, wing);
    game.addUnit(leader, map.getHex(6, 9));
    game.addUnit(unit1, map.getHex(5, 8));
    game.addUnit(unit2, map.getHex( 8, 7));
    game.start();
    loadAllImages();
    return {game, map, unit1, unit2, wing, leader, player};
}

export function createTinyGameWithLeader() {
    var game = new CBGame();
    var arbitrator = new CBArbitrator();
    game.setArbitrator(arbitrator);
    var player = new CBInteractivePlayer();
    game.addPlayer(player);
    var wing = new CBWing(player);
    var map = new CBMap("/CBlades/images/maps/map.png");
    game.setMap(map);
    let unitType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/unit.png", "/CBlades/images/units/misc/unitb.png"]);
    let unit = new CBTroop(unitType, wing);
    game.addUnit(unit, map.getHex( 5, 8));
    let leaderType = new CBUnitType("unit",
        ["/CBlades/images/units/misc/leader.png", "/CBlades/images/units/misc/leaderb.png"]);
    let leader = new CBCharacter(leaderType, wing);
    game.addUnit(leader, map.getHex( 5, 9));
    game.start();
    loadAllImages();
    return { game, arbitrator, player, wing, map, unit, leader };
}


export let dummyEvent = {offsetX:0, offsetY:0};

export function rollFor(d1, d2) {
    getDrawPlatform().resetRandoms((d1-0.5)/6, (d2-0.5)/6, 0);
}

export function rollFor1Die(d1) {
    getDrawPlatform().resetRandoms((d1-0.5)/6, 0);
}

export function executeAllAnimations() {
    while(DAnimator.isActive()) {
        executeTimeouts();
    }
}


export function clickOnCounter(game, counter) {
    let unitLocation = counter.artifact.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function clickOnMask(game) {
    var mouseEvent = createEvent("click", {offsetX:1, offsetY:1});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function clickOnActionMenu(game, col, row) {
    var icon = game.popup.getItem(col, row);
    let iconLocation = icon.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:iconLocation.x, offsetY:iconLocation.y});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function clickOnTrigger(game, trigger) {
    let triggerLocation = trigger.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:triggerLocation.x, offsetY:triggerLocation.y});
    trigger.onMouseClick(mouseEvent);
    paint(game);
    Memento.open();
}

export function clickOnMessage(game) {
    var commandsLevel = game.board.getLevel("widget-commands");
    for (let item of commandsLevel.artifacts) {
        if (item.element instanceof DMessage) {
            let itemLocation = item.viewportLocation;
            var mouseEvent = createEvent("click", {offsetX:itemLocation.x, offsetY:itemLocation.y});
            item.onMouseClick(mouseEvent);
            return;
        }
    }
}

export function clickOnDice(game) {
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

export function clickOnResult(game) {
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

export function mouseMoveOnTrigger(game, trigger) {
    let actuatorLocation = trigger.viewportLocation;
    var mouseEvent = createEvent("mousemove", {offsetX:actuatorLocation.x, offsetY:actuatorLocation.y});
    mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
}

export function mouseMoveOutOfTrigger(game, trigger) {
    let actuatorArea = trigger.viewportBoundingArea;
    var mouseEvent = createEvent("mousemove", {offsetX:actuatorArea.left-5, offsetY:actuatorArea.top});
    mockPlatform.dispatchEvent(game.root, "mousemove", mouseEvent);
}
