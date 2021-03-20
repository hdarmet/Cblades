'use strict'

import {
    createEvent, mockPlatform
} from "../mocks.js";
import {
    Memento
} from "../../jslib/mechanisms.js";
import {
    DAnimator, getDrawPlatform
} from "../../jslib/draw.js";
import {
    executeTimeouts
} from "../../jstest/jtest.js";
import {
    DDice, DMessage, DResult
} from "../../jslib/widget.js";

export function paint(game) {
    game._board.paint();
}

export function repaint(game) {
    game._board.repaint();
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

export function clickOnArtifact(boardOrGame, artifact) {
    let unitLocation = artifact.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
    mockPlatform.dispatchEvent(boardOrGame.root, "click", mouseEvent);
}

export function clickOnCounter(game, counter) {
    clickOnArtifact(game, counter.artifact);
}

export function clickOnMask(game) {
    var mouseEvent = createEvent("click", {offsetX:1, offsetY:1});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function clickOnMap(game) {
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
