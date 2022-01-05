'use strict'

import {
    createEvent, round, mockPlatform, resetAllDirectives, loadAllImages
} from "../mocks.js";
import {
    DAnimator, getDrawPlatform
} from "../../jslib/draw.js";
import {
    executeTimeouts
} from "../../jstest/jtest.js";
import {
    DDice, DMessage, DResult, DSwipe
} from "../../jslib/widget.js";
import {
    Point2D
} from "../../jslib/geometry.js";

export function paint(game) {
    game.board.paint();
}

export function repaint(game) {
    loadAllImages();
    resetAllDirectives(game.board);
    game.board.repaint();
    loadAllImages();
}

export let dummyEvent = {offsetX:0, offsetY:0};

export function rollFor(d1, d2) {
    getDrawPlatform().resetRandoms((d1-0.5)/6, (d2-0.5)/6, 0);
}

export function rollFor1Die(d1) {
    getDrawPlatform().resetRandoms((d1-0.5)/6, 0);
}

export function executeAllAnimations(finalization) {
    if (finalization) {
        let finalizer = DAnimator.getFinalizer();
        DAnimator.setFinalizer(()=>{
            finalization();
            finalizer && finalizer();
        });
    }
    while(DAnimator.isActive()) {
        executeTimeouts();
    }
}

export function clickOnArtifact(boardOrGame, artifact) {
    let arifactLocation = artifact.viewportLocation;
    var mouseEvent = createEvent("click", {offsetX:arifactLocation.x, offsetY:arifactLocation.y, artifact});
    mockPlatform.dispatchEvent(boardOrGame.root, "click", mouseEvent);
}

export function mouseMoveOnArtifactPoint(gameOrBoard, artifact, x, y) {
    var mouseEvent = createEvent("mousemove", {offsetX:x, offsetY:y, artifact});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function getArtifactPoint(artifact, x=0, y=0) {
    let artifactLocation = artifact.viewportLocation;
    x += artifactLocation.x;
    y += artifactLocation.y;
    return new Point2D(x, y);
}

export function mouseMoveOnPoint(gameOrBoard, point) {
    var mouseEvent = createEvent("mousemove", {offsetX:point.x, offsetY:point.y});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function mouseMoveOnArtifact(gameOrBoard, artifact, x=0, y=0) {
    ({x, y} = getArtifactPoint(artifact, x, y));
    var mouseEvent = createEvent("mousemove", {offsetX:x, offsetY:y, artifact});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function mouseMoveOutOfArtifact(gameOrBoard, artifact) {
    let artifactLocation = artifact.viewportBoundingArea;
    var mouseEvent = createEvent("mousemove", {offsetX:artifactLocation.left-5, offsetY:artifactLocation.top, artifact:null});
    mockPlatform.dispatchEvent(gameOrBoard.root, "mousemove", mouseEvent);
}

export function keydown(gameOrBoard, key) {
    var keyboardEvent = createEvent("keydown", {key});
    mockPlatform.dispatchEvent(gameOrBoard.root, "keydown", keyboardEvent);
}

export function clickOnPiece(game, piece) {
    clickOnArtifact(game, piece.artifact);
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

export function getInsert(game, clazz) {
    var widgetsLevel = game.board.getLevel("widgets");
    for (let item of widgetsLevel.artifacts) {
        if (item.element instanceof clazz) {
            return item.element;
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

export function getSwipe(game) {
    var commandsLevel = game.board.getLevel("widget-commands");
    for (let item of commandsLevel.artifacts) {
        if (item.element instanceof DSwipe) {
            return item;
        }
    }
    return null;
}

export function clickOnResult(game) {
    clickOnArtifact(game, getResult(game));
}

export function clickOnSwipe(game) {
    clickOnArtifact(game, getSwipe(game));
}

export function showMap(image, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            `drawImage(./../images/maps/${image}.png, -1023, -1575, 2046, 3150)`,
        "restore()"
    ]
}

export function showGameCommand(image, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/commands/${image}.png, -25, -25, 50, 50)`,
        "restore()"
    ];
}

export function showGameInactiveCommand(image, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/commands/${image}.png, -25, -25, 50, 50)`,
        "restore()"
    ];
}

export function showActuatorTrigger(image, w, h, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/actuators/${image}.png, -${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ]
}

export function showSelectedActuatorTrigger(image, w, h, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/actuators/${image}.png, -${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ]
}

export function showTroop(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
        "restore()"
    ];
}

export function showOverTroop(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
        "restore()"
    ];
}

export function showSelectedTroop(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -71, -71, 142, 142)`,
        "restore()"
    ];
}

export function showCharacter(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -60, -60, 120, 120)`,
        "restore()",
    ];
}

export function showSelectedCharacter(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -60, -60, 120, 120)`,
        "restore()",
    ];
}

export function showOverFormation(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -142, -71, 284, 142)`,
        "restore()"
    ];
}

export function showSelectedFormation(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -142, -71, 284, 142)`,
        "restore()"
    ];
}

export function showFormation(image, [a, b, c, d, e, f]) {
    return[
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/units/${image}.png, -142, -71, 284, 142)`,
        "restore()"
    ];
}

export function showMarker(image, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
        "restore()"
    ];
}

export function showActiveMarker(image, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/markers/${image}.png, -32, -32, 64, 64)`,
        "restore()"
    ];
}

export function showCommandMarker(image, [a, b, c, d, e, f]) {
    return [
        "save()",
        `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
        "shadowColor = #000000", "shadowBlur = 10",
        `drawImage(./../images/markers/${image}.png, -40, -40, 80, 80)`,
        "restore()"
    ];
}

export function showMask() {
    return [
        "save()",
            "setTransform(1, 0, 0, 1, 0, 0)",
            "globalAlpha = 0.3", "fillStyle = #000000",
            "fillRect(0, 0, 1000, 800)",
        "restore()"
    ];
}

export function showInsert(insert, x, y, w, h) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            `drawImage(./../images/inserts/${insert}-insert.png, 0, 0, ${w}, ${h}, -${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

export function showScrolledInsert(insert, x, y, w, h, dx, dy) {
    return [
        "save()",
        `setTransform(1, 0, 0, 1, ${x}, ${y})`,
        "shadowColor = #000000", "shadowBlur = 10",
        "strokeStyle = #000000", "lineWidth = 1",
        `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()",
        "save()",
        `setTransform(1, 0, 0, 1, ${x}, ${y})`,
        `drawImage(./../images/inserts/${insert}-insert.png, ${dx}, ${dy}, ${w}, ${h}, -${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

export function showMultiInsert(insert, x, y, w, h, frames) {
    let model = [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`
    ];
    for (let frame of frames) {
        model.push(`drawImage(./../images/inserts/${insert}-insert.png, ${frame.xs}, ${frame.ys}, ${frame.w}, ${frame.h}, ${frame.xd}, ${frame.yd}, ${frame.w}, ${frame.h})`);
    }
    model.push("restore()");
    return model;
}

export function showPopupCommand(command, x, y, size=50) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/commands/${command}.png, -${size/2}, -${size/2}, ${size}, ${size})`,
        "restore()"
    ];
}

export function showInactivePopupCommand(command, x, y, size=50) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/commands/${command}-inactive.png, -${size/2}, -${size/2}, ${size}, ${size})`,
        "restore()"
    ];
}

export function showInsertMark(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "drawImage(./../images/inserts/ok.png, -12.5, -12.5, 25, 25)",
        "restore()"
    ];
}

export function showIndicator(image, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/inserts/${image}.png, -71, -71, 142, 142)`,
        "restore()"
    ];
}

export function showBanneredIndicator(image, banner,  x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/inserts/${image}.png, -71, -71, 142, 142)`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x+41}, ${y})`,
            `drawImage(./../${banner}.png, -25, -60, 50, 120)`,
        "restore()"
    ];
}

export function showOrientedIndicator(image, [a, b, c, d, e, f]) {
    return [
        "save()",
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/inserts/${image}.png, -71, -71, 142, 142)`,
        "restore()"
    ];
}

export function showWingIndicator(image, banner, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/inserts/${image}.png, -71, -71, 142, 142)`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x+41}, ${y})`,
            `drawImage(./../units/${banner}.png, -25, -60, 50, 120)`,
        "restore()"
    ];
}

export function showDice(d1, d2, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d1}.png, -50, -44.5, 100, 89)`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x-60}, ${y+60})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d2}.png, -50, -44.5, 100, 89)`,
        "restore()"
    ];
}

export function showPlayedDice(d1, d2, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d1}.png, -50, -44.5, 100, 89)`,
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x-60}, ${y+60})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d2}.png, -50, -44.5, 100, 89)`,
        "restore()"
    ];
}

export function showDie(d1, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00FFFF", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d1}.png, -50, -44.5, 100, 89)`,
        "restore()",
    ];
}

export function showPlayedDie(d1, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            `drawImage(./../images/dice/d${d1}.png, -50, -44.5, 100, 89)`,
        "restore()",
    ];
}

export function showSuccessResult(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00A000", "shadowBlur = 100",
            "drawImage(./../images/dice/success.png, -75, -75, 150, 150)",
        "restore()"
    ];
}

export function showFailureResult(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #A00000", "shadowBlur = 100",
            "drawImage(./../images/dice/failure.png, -75, -75, 150, 150)",
        "restore()"
    ];
}

export function showSwipeUpResult(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00A000", "shadowBlur = 100",
            "drawImage(./../images/dice/swipe-up.png, -75, -75, 150, 150)",
        "restore()"
    ];
}

export function showNoSwipeResult(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00A000", "shadowBlur = 100",
            "drawImage(./../images/dice/no-swipe.png, -75, -75, 150, 150)",
        "restore()"
    ];
}

export function showSwipeDownResult(x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #00A000", "shadowBlur = 100",
            "drawImage(./../images/dice/swipe-down.png, -75, -75, 150, 150)",
        "restore()"
    ];
}

export function showMenuPanel(colCount, rowCount, x, y) {
    let w = colCount*60+10;
    let h = rowCount*60+10;
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(${-w/2}, ${-h/2}, ${w}, ${h})`,
            "fillStyle = #FFFFFF",
            `fillRect(${-w/2}, ${-h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

export function showMenuItem(col, row, image, colCount, rowCount, x, y) {
    let lx = round(30+col*60-colCount*30+x);
    let ly = round(30+row*60-rowCount*30+y);
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${lx}, ${ly})`,
            `drawImage(./../images/${image}.png, -25, -25, 50, 50)`,
        "restore()"
    ];
}

export function showMessage(message, x, y) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "drawImage(./../images/dice/message.png, -75, -75, 150, 150)",
        "restore()",
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y+10})`,
            "font = 90px serif", "textAlign = center",
            "textBaseline = middle",
            "shadowColor = #000000", "shadowBlur = 5",
            "strokeStyle = #0000FF", "lineWidth = 3",
            "strokeText(9, 0, 0)",
            "fillStyle = #8080FF",
            `fillText(${message}, 0, 0)`,
        "restore()"
    ];
}

export function showPopup(x, y, w, h) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #000000", "shadowBlur = 10",
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
            "fillStyle = #FFFFFF",
            `fillRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

export function showColoredRect(x, y, color, w, h) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            `fillStyle = ${color}`,
            `fillRect(-${w/2}, -${h/2}, ${w}, ${h})`,
            "strokeStyle = #000000", "lineWidth = 1",
            `strokeRect(-${w/2}, -${h/2}, ${w}, ${h})`,
        "restore()"
    ];
}

export function showShadowedImage(x, y, image, shadowColor, shadowBlur, w, h) {
    return [
        "save()",
        `setTransform(1, 0, 0, 1, ${x}, ${y})`,
        `shadowColor = ${shadowColor}`, `shadowBlur = ${shadowBlur}`,
        `drawImage(${image}, -${w/2}, -${h/2}, ${w}, ${h})`,
        'restore()',
    ];
}

export function showImage(x, y, image, w, h) {
    return [
        "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            `drawImage(${image}, -${w/2}, -${h/2}, ${w}, ${h})`,
        'restore()',
    ];
}

export function zoomAndRotate0(e, f) {
    return [0.4888, 0, 0, 0.4888, e, f];
}

export function zoomAndRotate30(e, f) {
    return [0.4233, 0.2444, -0.2444, 0.4233, e, f];
}

export function zoomAndRotate60(e, f) {
    return [0.2444, 0.4233, -0.4233, 0.2444, e, f];
}

export function zoomAndRotate90(e, f) {
    return [0, 0.4888, -0.4888, 0, e, f];
}

export function zoomAndRotate120(e, f) {
    return [-0.2444, 0.4233, -0.4233, -0.2444, e, f];
}

export function zoomAndRotate150(e, f) {
    return [-0.4233, 0.2444, -0.2444, -0.4233, e, f];
}

export function zoomAndRotate180(e, f) {
    return [-0.4888, 0, 0, -0.4888, e, f];
}

export function zoomAndRotate210(e, f) {
    return [-0.4233, -0.2444, 0.2444, -0.4233, e, f];
}

export function zoomAndRotate240(e, f) {
    return [-0.2444, -0.4233, 0.4233, -0.2444, e, f];
}

export function zoomAndRotate270(e, f) {
    return [0, -0.4888, 0.4888, 0, e, f];
}

export function zoomAndRotate300(e, f) {
    return [0.2444, -0.4233, 0.4233, 0.2444, e, f];
}

export function zoomAndRotate330(e, f) {
    return [0.4233, -0.2444, 0.2444, 0.4233, e, f];
}
