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
    let arifactLocation = artifact.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:arifactLocation.x, offsetY:arifactLocation.y});
    mockPlatform.dispatchEvent(boardOrGame.root, "click", mouseEvent);
}

export function mouseMoveOnArtifact(gameOrBoard, artifact) {
    let artifactLocation = artifact.viewportLocation;
    var mouseEvent = createEvent("mousemove", {offsetX:artifactLocation.x, offsetY:artifactLocation.y});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function mouseMoveOutOfArtifact(gameOrBoard, trigger) {
    let artifactLocation = trigger.viewportBoundingArea;
    var mouseEvent = createEvent("mousemove", {offsetX:artifactLocation.left-5, offsetY:artifactLocation.top});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function clickOnCounter(game, counter) {
    clickOnArtifact(game, counter.artifact);
}

export function mouseMoveOnTrigger(game, trigger) {
    mouseMoveOnArtifact(game, trigger);
}

export function mouseMoveOutOfTrigger(game, trigger) {
    mouseMoveOutOfArtifact(game, trigger);
}

export function clickOnMask(game) {
    var mouseEvent = createEvent("click", {offsetX:1, offsetY:1});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function clickOnMap(game) {
    var mouseEvent = createEvent("click", {offsetX:1, offsetY:1});
    mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
}

export function getActionMenu(game, col, row) {
    return game.popup.getItem(col, row);
}

export function clickOnActionMenu(game, col, row) {
    clickOnArtifact(game, getActionMenu(game, col, row));
}

export function clickOnTrigger(game, trigger) {
    clickOnArtifact(game, trigger);
}

export function getMessage(game) {
    var commandsLevel = game.board.getLevel("widget-commands");
    for (let item of commandsLevel.artifacts) {
        if (item.element instanceof DMessage) {
            return item;
        }
    }
    return null;
}

export function clickOnMessage(game) {
    clickOnArtifact(game, getMessage(game));
}

export function getDice(game) {
    var itemsLevel = game.board.getLevel("widget-items");
    for (let item of itemsLevel.artifacts) {
        if (item.element instanceof DDice) {
            return item;
        }
    }
    return null;
}

export function clickOnDice(game) {
    clickOnArtifact(game, getDice(game));
}

export function getResult(game) {
    var commandsLevel = game.board.getLevel("widget-commands");
    for (let item of commandsLevel.artifacts) {
        if (item.element instanceof DResult) {
            return item;
        }
    }
    return null;
}

export function clickOnResult(game) {
    clickOnArtifact(game, getResult(game));
}
