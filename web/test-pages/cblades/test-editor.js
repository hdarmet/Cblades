'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    Point2D
} from "../../jslib/geometry.js";
import {
    DAnimator,
    DImage, getDrawPlatform, setDrawPlatform
} from "../../jslib/draw.js";
import {
    filterPainting, assertClearDirectives, assertDirectives, assertNoMoreDirectives,
    getDirectives, getLayers, loadAllImages, mockPlatform, resetDirectives, skipDirectives, stopRegister
} from "../mocks.js";
import {
    Mechanisms, Memento
} from "../../jslib/mechanisms.js";
import {
    CBBoard,
    CBMap
} from "../../jslib/cblades/map.js";
import {
    CBCharacter,
    CBFormation, CBOrderInstruction,
    CBTroop,
    CBWing
} from "../../jslib/cblades/unit.js";
import {
    CBMapEditorGame, CBScenarioEditorGame, CBEditorPlayer, CBEditUnitMenu, CBFormationPlacementActuator,
    CBBoardEditActuator, CBPiecePlacementActuator, CBUnitsRoster, CBUnitsRosterContent, CBMapComposer
} from "../../jslib/cblades/editor.js";
import {
    clickOnTrigger,
    mouseMoveOnTrigger,
    showGameCommand,
    executeAllAnimations,
    paint,
    repaint,
    zoomAndRotate0,
    zoomAndRotate240,
    showPopup,
    showImage,
    showColoredRect,
    showInactivePopupCommand,
    showPopupCommand,
    clickOnArtifact,
    showTroop,
    zoomAndRotate90,
    mouseMoveOnArtifact,
    keydown,
    zoomAndRotate150,
    showFormation,
    zoomAndRotate210,
    clickOnPiece,
    showMenuItem,
    clickOnActionMenu,
    showSelectedTroop,
    showSelectedFormation, getArtifactPoint, mouseMoveOnPoint, showShadowedImage, showMask
} from "./interactive-tools.js";
import {
    GoblinLeader,
    GoblinWolfRider
} from "../../jslib/cblades/armies/orcs.js";
import {
    RoughneckLance
} from "../../jslib/cblades/armies/roughnecks.js";

describe("Editor", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
        DAnimator.clear();
        Memento.clear();
    });

    function showMouseOverHexTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #FF0000", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/${type}.png, -30, -30, 60, 60)`,
            "restore()"
        ]
    }

    function showHexTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/${type}.png, -30, -30, 60, 60)`,
            "restore()"
        ]
    }

    function showHexHeightTrigger(height, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/level-${height}.png, -35, -35, 70, 70)`,
            "restore()"
        ]
    }

    function showHexSideTypeTrigger(type, [a, b, c, d, e, f]) {
        return [
            "save()",
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/actuators/ground/${type}.png, -23, -10, 46, 20)`,
            "restore()"
        ]
    }

    function getMapEditorActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBBoardEditActuator) return actuator;
        }
        return null;
    }

    function getTriggerDirectives(layer) {
        return [
            "save()",
            ...getDirectives(layer),
            "restore()"
        ];
    }

    it("Checks switch to map editor mode", () => {
        given:
            var game = new CBMapEditorGame();
            let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            loadAllImages();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
        when:
            game.editBoard();
            let mapEditActuator = getMapEditorActuator(game);
            let hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            mouseMoveOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assert(getDirectives(actuatorsLayer).length).equalsTo(258);
            assert(getDirectives(actuatorsLayer, 0, 6)).arrayEqualsTo(
                showHexTypeTrigger("outdoor-clear", zoomAndRotate0(230.4497, 63.2148))
            );
            assert(getDirectives(actuatorsLayer, 6, 12)).arrayEqualsTo(
                showHexHeightTrigger(0, zoomAndRotate0(269.5503, 63.2148))
            );
            assert(getDirectives(actuatorsLayer, 258-6, 258)).arrayEqualsTo(
                showHexSideTypeTrigger("normal", zoomAndRotate240(458.3333, 135.3831))
            );
    });

    it("Checks edit a hex type", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editBoard();
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
        when:
            filterPainting(hexTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-rough", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-difficult", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-clear-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-rough-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("water", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("lava", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("impassable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-clear", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-rough", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-clear-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-rough-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("outdoor-clear", zoomAndRotate0(313.783, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showMouseOverHexTypeTrigger("cave-difficult-flammable", zoomAndRotate0(313.783, 111.327))
            );
    });

    it("Checks edit a hex side type", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editBoard();
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            var hexSideTrigger = mapEditActuator.getHexSideTypeTrigger(map.getHex(4, 5).toward(240));
        when:
            filterPainting(hexSideTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("easy", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("difficult", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("climb", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("wall", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexSideTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("normal", zoomAndRotate240(291.6667, 135.3831))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexSideTypeTrigger("wall", zoomAndRotate240(291.6667, 135.3831))
            );
    });

    it("Checks edit a hex side height", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.start();
            var [actuatorsLayer] = getLayers(game.board, "actuators");
            game.editBoard();
            paint(game);
            loadAllImages();
            var mapEditActuator = getMapEditorActuator(game);
            var hexTrigger = mapEditActuator.getHexTypeTrigger(map.getHex(4, 5));
            var hexHeightTrigger = mapEditActuator.getHexHeightTrigger(map.getHex(4, 5));
        when:
            filterPainting(hexHeightTrigger);
            stopRegister(actuatorsLayer);
            mouseMoveOnTrigger(game, hexTrigger);
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-1", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-2", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-3", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-4", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("up-5", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-5", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            clickOnTrigger(game, hexHeightTrigger);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-4", zoomAndRotate0(352.8837, 111.327))
            );
        when:
            resetDirectives(actuatorsLayer);
            Memento.undo();
            paint(game);
        then:
            assert(getTriggerDirectives(actuatorsLayer)).arrayEqualsTo(
                showHexHeightTrigger("down-5", zoomAndRotate0(352.8837, 111.327))
            );
    });

    function buildMapEditorGame() {
        let BlueBanner0 = "./../images/units/blue/banners/banner0.png";
        let RedBanner0 = "./../images/units/red/banners/banner0.png";

        var game = new CBMapEditorGame();
        let map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
        game.setMap(map);
        game.start();
        return { game, map};
    }

    function showMapSelector(map, highlighted, selected, x, y) {
        let shadow = selected ? "#FF0000" : highlighted ? "#00FFFF" : "#000000";
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                `shadowColor = ${shadow}`, "shadowBlur = 10",
                `drawImage(./../images/maps/${map}-icon.png, -40, -62.5, 80, 125)`,
            "restore()"
        ]
    }

    function showFilledMapCell(map, col, row, inverted=false) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${145+col*80}, ${212.5+row*125})`,
                "shadowBlur = 0",
                `drawImage(./../images/maps/${map}-icon.png, -40, -62.5, 80, 125)`,
            "restore()"
        ]
    }

    function showSelectedFilledMapCell(map, col, row, inverted=false, onTurn=false, onDelete=false) {
        let ad = inverted ? -1 : 1;
        return [
            "save()",
                `setTransform(${ad}, 0, 0, ${ad}, ${145+col*80}, ${212.5+row*125})`,
                "shadowColor = #FF0000", "shadowBlur = 10",
                `drawImage(./../images/maps/${map}-icon.png, -40, -62.5, 80, 125)`,
            "restore()",
            "save()",
                `setTransform(1, 0, 0, 1, ${145+col*80}, ${182.5+row*125})`,
                onTurn ? "shadowColor = #FF0000" : "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/edit-actions/flip.png, -18, -18, 36, 36)",
            "restore()",
            "save()",
                `setTransform(1, 0, 0, 1, ${145+col*80}, ${242.5+row*125})`,
                onDelete ? "shadowColor = #FF0000" : "shadowColor = #00FFFF", "shadowBlur = 10",
                "drawImage(./../images/edit-actions/remove.png, -18, -18, 36, 36)",
            "restore()"
        ]
    }

    function showEmptyMapCell(col, row) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${145+col*80}, ${212.5+row*125})`,
                "shadowBlur = 0",
                "fillStyle = #E0E0E0", "fillRect(-40, -62.5, 80, 125)",
                "strokeStyle = #000000", "lineWidth = 1",
                "strokeRect(-40, -62.5, 80, 125)",
            "restore()"
        ]
    }

    function showHoleMapCell(col, row) {
        return [
            "save()",
            `setTransform(1, 0, 0, 1, ${145+col*80}, ${212.5+row*125})`,
            "shadowBlur = 0",
            "fillStyle = #FFE0E0", "fillRect(-40, -62.5, 80, 125)",
            "strokeStyle = #000000", "lineWidth = 1",
            "strokeRect(-40, -62.5, 80, 125)",
            "restore()"
        ]
    }

    function showSelectedEmptyMapCell(col, row) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${145+col*80}, ${212.5+row*125})`,
                "shadowColor = #FF0000", "shadowBlur = 10",
                "fillStyle = #E0E0E0", "fillRect(-40, -62.5, 80, 125)",
                "strokeStyle = #000000", "lineWidth = 1",
                "strokeRect(-40, -62.5, 80, 125)",
            "restore()"
        ]
    }

    function assertMapContent(layer, boards) {
        let boardMap = new Map();
        for (let board of boards) {
            boardMap.set(board.col*4+board.row, board);
        }
        let selected = null;
        for (let col=0; col<8; col++) {
            for (let row=0; row<4; row++) {
                let board = boardMap.get(col*4+row);
                if (board) {
                    if (board.front) {
                        selected = board;
                    }
                    else {
                        if (board.map) {
                            assertDirectives(layer, showFilledMapCell(board.map, col, row));
                        }
                        else if (board.hole) {
                            assertDirectives(layer, showHoleMapCell(col, row));
                        }
                        else {
                            assertDirectives(layer, showEmptyMapCell(col, row));
                        }
                    }
                }
                else {
                    assertDirectives(layer, showEmptyMapCell(col, row));
                }
            }
        }
    }

    function showActiveMoveBoardCommand(command, x, y) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                "shadowColor = #00FFFF", "shadowBlur = 5",
                `drawImage(./../images/commands/${command}.png, -18, -18, 36, 36)`,
            "restore()"
        ]
    }

    function showInactiveMoveBoardCommand(command, x, y) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                "shadowColor = #000000", "shadowBlur = 5",
                `drawImage(./../images/commands/${command}-inactive.png, -18, -18, 36, 36)`,
            "restore()"
        ]
    }

    function showSelectedMoveBoardCommand(command, x, y) {
        return [
            "save()",
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            "shadowColor = #FF0000", "shadowBlur = 10",
            `drawImage(./../images/commands/${command}.png, -18, -18, 36, 36)`,
            "restore()"
        ]
    }

    function showActiveMapCommand(command, x, y) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                "shadowColor = #00FFFF", "shadowBlur = 10",
                `drawImage(./../images/commands/${command}.png, -25, -25, 50, 50)`,
            "restore()"
        ];
    }

    function showInactiveMapCommand(command, x, y) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                "shadowColor = #000000", "shadowBlur = 10",
                `drawImage(./../images/commands/${command}-inactive.png, -25, -25, 50, 50)`,
            "restore()"
        ];
    }

    function showSelectedMapCommand(command, x, y) {
        return [
            "save()",
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                "shadowColor = #FF0000", "shadowBlur = 10",
                `drawImage(./../images/commands/${command}.png, -25, -25, 50, 50)`,
            "restore()"
        ];
    }

    function getMapComposerPopup(game) {
        return game._popup && game._popup instanceof CBMapComposer ? game._popup : null;
    }

    function assertMapComposerContent(itemsLayer, { commands, boards, cells }) {

        function showMoveBoardCommand(command, active, highlight, col, row) {
            if (active) {
                if (highlight) {
                    return showSelectedMoveBoardCommand(command, col, row);
                }
                else {
                    return showActiveMoveBoardCommand(command, col, row);
                }
            }
            else {
                return showInactiveMoveBoardCommand(command, col, row);
            }
        }

        skipDirectives(itemsLayer, 4);
        for (let index=0; index<3; index++) {
            if (boards[index]) {
                assertDirectives(itemsLayer, showMapSelector(
                    boards[index].board, boards[index].highlighted, boards[index].selected, 875, 265+135*index
                ));
            }
        }
        assertMapContent(itemsLayer, cells);
        assertDirectives(itemsLayer, showMoveBoardCommand(
            "top", commands.top.active, commands.top.highlight, 785, 170));
        assertDirectives(itemsLayer, showMoveBoardCommand(
            "prev", commands.prev.active, commands.prev.highlight, 785, 220));
        assertDirectives(itemsLayer, showMoveBoardCommand(
            "next", commands.next.active, commands.next.highlight,785, 270));
        assertDirectives(itemsLayer, showMoveBoardCommand(
            "bottom", commands.bottom.active, commands.bottom.highlight,785, 320));
        for (let board of cells) {
            if (board.front) {
                if (board.map) {
                    if (board.selected) {
                        assertDirectives(itemsLayer, showSelectedFilledMapCell(
                            board.map, board.col, board.row, board.inverted, board.onTurn, board.onDelete));
                    } else {
                        assertDirectives(itemsLayer, showFilledMapCell(
                            board.map, board.col, board.row, board.inverted, board.onTurn, board.onDelete));
                    }
                }
                else {
                    if (board.selected) {
                        assertDirectives(itemsLayer, showSelectedEmptyMapCell(board.col, board.row));
                    } else {
                        assertDirectives(itemsLayer, showEmptyMapCell(board.col, board.row));
                    }
                }
            }
        }
        assertNoMoreDirectives(itemsLayer);
    }

    function assertMapComposerCommands(widgetsLayer, {up, down, ok, cancel}) {
        function showMapCommand(command, active, x, y) {
            if (active) {
                return showActiveMapCommand(command, x, y);
            } else {
                return showInactiveMapCommand(command, x, y);
            }
        }

        skipDirectives(widgetsLayer, 4);
        assertDirectives(widgetsLayer, showMask());
        assertDirectives(widgetsLayer, showPopup(500, 400, 850, 550));
        assertDirectives(widgetsLayer, showColoredRect(875, 400, "#C0C0C0", 100, 550));
        assertDirectives(widgetsLayer, showMapCommand("up", up, 875, 160));
        assertDirectives(widgetsLayer, showMapCommand("down", down, 875, 640));
        assertDirectives(widgetsLayer, showMapCommand("ko", cancel, 785, 580));
        assertDirectives(widgetsLayer, showMapCommand("ok", ok, 785, 640));
        assertNoMoreDirectives(widgetsLayer);
    }

    let allBoards = [
        { name: "map", path: "./../images/maps/map.png", icon: "./../images/maps/map-icon.png" },
        { name: "map1", path: "./../images/maps/map1.png", icon: "./../images/maps/map1-icon.png" },
        { name: "map2", path: "./../images/maps/map2.png", icon: "./../images/maps/map2-icon.png" },
        { name: "map3", path: "./../images/maps/map3.png", icon: "./../images/maps/map3-icon.png" }
    ];

    let fewBoards = [
        { name: "map", path: "./../images/maps/map.png", icon: "./../images/maps/map-icon.png" },
        { name: "map1", path: "./../images/maps/map1.png", icon: "./../images/maps/map1-icon.png" }
    ];

    it("Checks open map composer popup and board catalog loading", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
    });

    it("Checks board composer opening when board catalog is tiny", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(fewBoards), 200);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
    });

    it("Checks map composer glider buttons", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [itemsLayer] = getLayers(game.board, "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.translateRight);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true, highlight:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.translateLeft);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.translateRight);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:true }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:1 }]
            });
        when:
            clickOnArtifact(game, mapComposer.translateDown);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:true }, prev:{ active:true }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:1, col:1 }]
            });
        when:
            clickOnArtifact(game, mapComposer.translateLeft);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:true }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:1, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.translateUp);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
    });

    it("Checks map composer glider buttons", () => {
        given:
            var {game} = buildScenarioEditorGame();
            var [itemsLayer] = getLayers(game.board, "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            for (let col=1; col<8; col++) {
                clickOnArtifact(game, mapComposer.translateRight);
            }
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: {top: {active: false}, prev: {active: true}, next: {active: false}, bottom: {active: true}},
                boards: [{board: "map"}, {board: "map1"}, {board: "map2"}],
                cells: [{map: "map", col: 7, row: 0}]
            });
        when:
            for (let row=1; row<4; row++) {
                clickOnArtifact(game, mapComposer.translateDown);
            }
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: {top: {active: true}, prev: {active: true}, next: {active: false}, bottom: {active: false}},
                boards: [{board: "map"}, {board: "map1"}, {board: "map2"}],
                cells: [{map: "map", col: 7, row: 3}]
            });
    });

    it("Checks board edition in map composer content", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [itemsLayer] = getLayers(game.board, "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getCell(0, 0));
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0, front:true, selected:true }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getCell(1, 0));
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0, front:true }, { row:0, col:1, front:true, selected:true }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getCell(0, 0));
            mouseMoveOnArtifact(game, mapComposer.getCell(0, 0).deleteCommand);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ row:0, col:1, front:true}, { map:"map", row:0, col:0, front:true, selected:true, onDelete:true }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getCell(0, 0).turnCommand);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ row:0, col:1, front:true}, { map:"map", row:0, col:0, front:true, selected:true, onTurn:true }]
            });
        when:
            clickOnArtifact(game, mapComposer.getCell(0, 0).turnCommand);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [
                    { row:0, col:1, front:true},
                    { map:"map", row:0, col:0, front:true, inverted:true, selected:true, onTurn:true }
                ]
            });
        when:
            clickOnArtifact(game, mapComposer.getCell(0, 0).deleteCommand);
            repaint(game);
        then:
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:false }, bottom:{ active:false } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [
                    { row:0, col:1, front:true},
                    { row:0, col:0, front:true, inverted:true, selected:true }
                ]
            });
    });

    it("Checks board selection", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1"}, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.selectorBottom);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:true, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map1"}, { board: "map2"}, { board: "map3"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getMapSelectors(1));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:true, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map1"}, { board: "map2", highlighted:true }, { board: "map3"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getMapSelectors(0));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:true, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map1", highlighted:true }, { board: "map2" }, { board: "map3"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.getMapSelectors(0));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:true, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map1", selected:true }, { board: "map2" }, { board: "map3"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.getMapSelectors(1));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:true, down:false, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map1" }, { board: "map2", selected:true }, { board: "map3"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            clickOnArtifact(game, mapComposer.selectorTop);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map"}, { board: "map1" }, { board: "map2", selected:true }],
                cells: [{ map:"map", row:0, col:0 }]
            });
    });

    it("Checks map composition", () => {
        given:
            var {game} = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up: false, down: true, ok: true, cancel: true});
            assertMapComposerContent(itemsLayer, {
                commands: {top: {active: false}, prev: {active: false}, next: {active: true}, bottom: {active: true}},
                boards: [{board: "map"}, {board: "map1"}, {board: "map2"}],
                cells: [{map: "map", row: 0, col: 0}]
            });
        when:
            clickOnArtifact(game, mapComposer.getMapSelectors(1));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map" }, { board: "map1", selected:true }, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }]
            });
        when:
            mouseMoveOnArtifact(game, mapComposer.getCell(1, 0));
            clickOnArtifact(game, mapComposer.getCell(1, 0));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:true, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map" }, { board: "map1", selected:true }, { board: "map2"}],
                cells: [{ map:"map", row:0, col:0 }, { map:"map1", row:0, col:1, front:true, selected:true }]
            });
            assert(mapComposer.ok.active).isTrue();
            assert(mapComposer.cancel.active).isTrue();
    });

    it("Checks map composition when there are map holes", () => {
        given:
            var {game} = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            clickOnArtifact(game, mapComposer.getMapSelectors(1));
            mouseMoveOnArtifact(game, mapComposer.getCell(1, 1));
            clickOnArtifact(game, mapComposer.getCell(1, 1));
            repaint(game);
        then:
            assertMapComposerCommands(widgetsLayer, {up:false, down:true, ok:false, cancel:true});
            assertMapComposerContent(itemsLayer, {
                commands: { top:{ active:false }, prev:{ active:false }, next:{ active:true }, bottom:{ active:true } },
                boards: [{ board: "map" }, { board: "map1", selected:true }, { board: "map2"}],
                cells: [
                    { map:"map", row:0, col:0 }, { row:1, col:0, hole:true },
                    { row:0, col:1, hole:true }, { map:"map1", row:1, col:1, front:true, selected:true }
                ]
            });
            assert(mapComposer.ok.active).isFalse();
            assert(mapComposer.cancel.active).isTrue();
    });

    it("Checks map edition and confirmation", () => {
        given:
            var {game} = buildScenarioEditorGame(true);
            var [mapLayer, widgetsLayer, widgetsItems, widgetsCommands] = getLayers(game.board, "map", "widgets", "widget-items", "widget-commands");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            clickOnArtifact(game, mapComposer.getMapSelectors(1));
            mouseMoveOnArtifact(game, mapComposer.getCell(1, 0));
            clickOnArtifact(game, mapComposer.getCell(1, 0));
            clickOnArtifact(game, mapComposer.ok);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsItems, 4);
            assertNoMoreDirectives(widgetsCommands, 4);
            skipDirectives(mapLayer, 4);
            assertDirectives(mapLayer, [
                'save()',
                    'setTransform(-0.4888, 0, 0, -0.4888, 0, 400)',
                    'drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)',
                'restore()',
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 1000, 400)',
                    'drawImage(./../images/maps/map1.png, -1023, -1575, 2046, 3150)',
                'restore()'
            ]);
            assertNoMoreDirectives(mapLayer);
    });

    it("Checks map edition and cancellation", () => {
        given:
            var {game} = buildScenarioEditorGame();
            var [mapLayer, widgetsLayer, widgetsItems, widgetsCommands] = getLayers(game.board, "map", "widgets", "widget-items", "widget-commands");
        when:
            game.editMap();
            getDrawPlatform().requestSucceeds(JSON.stringify(allBoards), 200);
            var mapComposer = getMapComposerPopup(game);
            clickOnArtifact(game, mapComposer.getMapSelectors(1));
            mouseMoveOnArtifact(game, mapComposer.getCell(1, 0));
            clickOnArtifact(game, mapComposer.getCell(1, 0));
            clickOnArtifact(game, mapComposer.cancel);
            repaint(game);
        then:
            assertNoMoreDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsItems, 4);
            assertNoMoreDirectives(widgetsCommands, 4);
            skipDirectives(mapLayer, 4);
            assertDirectives(mapLayer, [
                'save()',
                    'setTransform(0.4888, 0, 0, 0.4888, 500, 400)',
                    'drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)',
                'restore()'
            ]);
            assertNoMoreDirectives(mapLayer);
    });

    it("Checks map composer push menu button", () => {
        given:
            var editMode = false;
            var { game } = buildScenarioEditorGame();
            game.editMap = function() {
                editMode = !editMode;
            }
            game.setMenu();
            var [commandsLayer] = getLayers(game.board, "widget-commands");
            loadAllImages();
            game._showCommand.action();
            executeAllAnimations();
        when:
            game._editMapCommand.action();
            executeAllAnimations();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            assert(editMode).isTrue();
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    function buildScenarioEditorGame(invert = false) {
        let BlueBanner0 = {
            name: "blue-banner",
            path: "./../images/units/blue/banners/banner0.png"
        };
        let RedBanner0 = {
            name: "red-banner",
            path: "./../images/units/red/banners/banner0.png"
        };

        var game = new CBScenarioEditorGame(1);
        let map = new CBMap([{
            path:"./../images/maps/map.png",
            icon:"./../images/maps/map-icon.png",
            col:0, row:0, invert
        }]);
        game.setMap(map);
        let player1 = new CBEditorPlayer("player1", "./../players/player1.png");
        game.addPlayer(player1);
        let wing1 = new CBWing(player1, BlueBanner0);
        wing1.setRetreatZone(map.getSouthZone());
        let player2 = new CBEditorPlayer("player2", "./../players/player2.png");
        game.addPlayer(player2);
        let wing2 = new CBWing(player2, RedBanner0);
        wing2.setRetreatZone(map.getNorthZone());
        game.start();
        return { game, map, player1, player2, wing1, wing2 };
    }

    function build3playersScenarioEditorGame() {
        let GreenBanner0 = {
            name: "green-banner",
            path: "./../images/units/green/banners/banner0.png"
        };

        let { game, map, player1, player2, wing1, wing2 } = buildScenarioEditorGame();
        let player3 = new CBEditorPlayer("player3", "./../players/player3.png");
        game.addPlayer(player3);
        let wing3 = new CBWing(player3, GreenBanner0);
        wing3.setRetreatZone(map.getWestZone());
        return { game, map, player1, player2, player3, wing1, wing2, wing3 };
    }

    function showTroopButton(x, y, unit) {
        return [
            'save()',
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                'shadowColor = #000000', 'shadowBlur = 5',
                `drawImage(./../images/units/${unit}.png, -30, -30, 60, 60)`,
            'restore()',
        ];
    }

    function showFormationButton(x, y, unit) {
        return [
            'save()',
            `setTransform(1, 0, 0, 1, ${x}, ${y})`,
            'shadowColor = #000000', 'shadowBlur = 5',
            `drawImage(./../images/units/${unit}.png, -60, -30, 120, 60)`,
            'restore()',
        ];
    }

    function getEditUnitPopup(game) {
        return game._popup && game._popup instanceof CBUnitsRoster ? game._popup : null;
    }

    it("Checks open units editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
        when:
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 330, "orcs/character2C", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 330, 36));

            assertDirectives(widgetsLayer, showTroopButton(375, 400, "orcs/unit1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 400, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 400, "orcs/unit2L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 400, 36));

            assertNoMoreDirectives(widgetsLayer);

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(500, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(570, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(640, 235, "orcs/unit1L"));
            assertNoMoreDirectives(itemsLayer);
    });

    it("Checks wing switching in editor popup", () => {
        given:
            var { game, wing2 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.nextWingButton);
            repaint(game);
        then:
            assert(unitEditorPopup.currentWing).equalsTo(wing2);
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showInactivePopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player2.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/red/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
        when:
            clickOnArtifact(game, unitEditorPopup.header.prevWingButton);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
    });

    it("Checks player/wing header artifacts appeance when mouse moves on them", () => {
        given:
            var {game} = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.prevWingButton);
            repaint(game);
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.header.playerArtifact);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#FF0000", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.header.wingArtifact);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#FF0000", 10, 50, 120));
    });

    let players = [
        {
            name: "player1",
            path: "./../players/player1.png"
        }, {
            name: "player2",
            path: "./../players/player2.png"
        }, {
            name: "player3",
            path: "./../players/player3.png"
        }
    ];

    let banners = [
        {
            name: "blue-banner",
            path: "./../images/units/blue/banners/banner0.png"
        }, {
            name: "red-banner",
            path: "./../images/units/red/banners/banner0.png"
        }, {
            name: "green-banner",
            path: "./../images/units/green/banners/banner0.png"
        }
    ];

    it("Checks player selection", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [itemsLayer] = getLayers(game.board, "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            repaint(game);
        then:
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage(300, 232.5, "./../players/player1.png",
                "#FF0000", 20, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 307.5, "./../players/player2.png",
                "#FF0000", 20, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 382.5, "./../players/player3.png",
                "#0050FF", 5, 60, 60));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 0));
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage(300, 232.5, "./../players/player1.png",
                "#0050FF", 5, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 307.5, "./../players/player2.png",
                "#FF0000", 20, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 382.5, "./../players/player3.png",
                "#0050FF", 5, 60, 60));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 2));
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage(300, 232.5, "./../players/player1.png",
                "#FF0000", 20, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 307.5, "./../players/player2.png",
                "#FF0000", 20, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(300, 382.5, "./../players/player3.png",
                "#FF0000", 20, 60, 60));
    });

    it("Checks wing selection", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [itemsLayer] = getLayers(game.board, "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.wingArtifact);
            repaint(game);
        then:
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 240, "./../images/units/blue/banners/banner0.png",
                "#FF0000", 20, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 360, "./../images/units/red/banners/banner0.png",
                "#000000", 5, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 480, "./../images/units/green/banners/banner0.png",
                "#0050FF", 5, 50, 120));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 0));
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 240, "./../images/units/blue/banners/banner0.png",
                "#0050FF", 5, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 360, "./../images/units/red/banners/banner0.png",
                "#000000", 5, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 480, "./../images/units/green/banners/banner0.png",
                "#0050FF", 5, 50, 120));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 1));
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 240, "./../images/units/blue/banners/banner0.png",
                "#FF0000", 20, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 360, "./../images/units/red/banners/banner0.png",
                "#000000", 5, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 480, "./../images/units/green/banners/banner0.png",
                "#0050FF", 5, 50, 120));
        when:
            mouseMoveOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 2));
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 240, "./../images/units/blue/banners/banner0.png",
                "#FF0000", 20, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 360, "./../images/units/red/banners/banner0.png",
                "#000000", 5, 50, 120));
            assertDirectives(itemsLayer, showShadowedImage( 300, 480, "./../images/units/green/banners/banner0.png",
                "#FF0000", 20, 50, 120));
    });

    it("Checks that a player selection inactivate the roster header", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 0));
        then:
            assert(unitEditorPopup.header.playerArtifact.active).isFalse();
            assert(unitEditorPopup.header.wingArtifact.active).isFalse();
    });

    it("Checks that a wing selection inactivate the roster header", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.wingArtifact);
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 0));
        then:
            assert(unitEditorPopup.header.playerArtifact.active).isFalse();
            assert(unitEditorPopup.header.wingArtifact.active).isFalse();
    });

    it("Checks navigation in player selection", () => {
        given:
            var players = [];
            for (let index = 0; index<40; index++) {
                players.push({name : "player"+index, path: "./players/player"+index+".png"});
            }
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            repaint(game);
        then:
            assert(unitEditorPopup.playerSelector.prevSelectorPage.active).isFalse();
            assert(unitEditorPopup.playerSelector.nextSelectorPage.active).isTrue();
            assert(unitEditorPopup.playerSelector.getCell(0, 0).item.name).equalsTo("player0");
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.nextSelectorPage);
            repaint(game);
        then:
            assert(unitEditorPopup.playerSelector.prevSelectorPage.active).isTrue();
            assert(unitEditorPopup.playerSelector.nextSelectorPage.active).isFalse();
            assert(unitEditorPopup.playerSelector.getCell(0, 0).item.name).equalsTo("player6");
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.prevSelectorPage);
            repaint(game);
        then:
            assert(unitEditorPopup.playerSelector.prevSelectorPage.active).isFalse();
            assert(unitEditorPopup.playerSelector.nextSelectorPage.active).isTrue();
            assert(unitEditorPopup.playerSelector.getCell(0, 0).item.name).equalsTo("player0");
    });

    it("Checks navigation in wing selection", () => {
        given:
            var banners = [];
            for (let index = 0; index<28; index++) {
                banners.push({name : "banner"+index, path: "./banners/banner"+index+".png"});
            }
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.wingArtifact);
            repaint(game);
        then:
            assert(unitEditorPopup.wingSelector.prevSelectorPage.active).isFalse();
            assert(unitEditorPopup.wingSelector.nextSelectorPage.active).isTrue();
            assert(unitEditorPopup.wingSelector.getCell(0, 0).item.name).equalsTo("banner0");
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.nextSelectorPage);
            repaint(game);
        then:
            assert(unitEditorPopup.wingSelector.prevSelectorPage.active).isTrue();
            assert(unitEditorPopup.wingSelector.nextSelectorPage.active).isFalse();
            assert(unitEditorPopup.wingSelector.getCell(0, 0).item.name).equalsTo("banner4");
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.prevSelectorPage);
            repaint(game);
        then:
            assert(unitEditorPopup.wingSelector.prevSelectorPage.active).isFalse();
            assert(unitEditorPopup.wingSelector.nextSelectorPage.active).isTrue();
            assert(unitEditorPopup.wingSelector.getCell(0, 0).item.name).equalsTo("banner0");
    });

    it("Checks change rosters in editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rightRoster);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "mercenaries/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "orcs/unit1L"));
        when:
            clickOnArtifact(game, unitEditorPopup._rosterContent._leftRoster);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));

            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showShadowedImage(420, 135, "./../players/player1.png",
                "#00FFFF", 10, 60, 60));
            assertDirectives(itemsLayer, showShadowedImage(580, 135, "./../images/units/blue/banners/banner0.png",
                "#00FFFF", 10, 50, 120));
            assertDirectives(itemsLayer, showTroopButton(360, 235, "orcs/unit1L"));
            assertDirectives(itemsLayer, showTroopButton(430, 235, "mercenaries/unit1L"));
        when:
            for (let index=0; index<2; index++) {
                clickOnArtifact(game, unitEditorPopup._rosterContent._rightRoster);
            }
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
            assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
            assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
            assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
            assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
            assertDirectives(widgetsLayer, showPopupCommand("left", 285, 235));
            assertDirectives(widgetsLayer, showInactivePopupCommand("right", 715, 235));
    });

    it("Checks a player creation process", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.wingSelector.validateButton.active).isTrue();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 2));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isTrue();
            assert(unitEditorPopup.wingSelector.validateButton.active).isFalse();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player3.png");
            assert(unitEditorPopup.header.wingArtifact.path).isNotDefined();
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 2));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isTrue();
            assert(unitEditorPopup.wingSelector.validateButton.active).isTrue();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player3.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/green/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.validateButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isFalse();
            assert(unitEditorPopup.header.wingArtifact.active).isFalse();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player3.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/green/banners/banner0.png");
            assert(game.players.length).equalsTo(2);
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.validateButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player3.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/green/banners/banner0.png");
            assert(game.players.length).equalsTo(3);
            assert(game.players[2].name).equalsTo("player3");
            assert(game.players[2].wings.length).equalsTo(1);
            assert(game.players[2].wings[0].banner.name).equalsTo("green-banner");
    });

    it("Checks the cancellation of a player creation process from the wing selector page", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 2));
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 2));
            clickOnArtifact(game, unitEditorPopup.wingSelector.cancelButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isFalse();
            assert(unitEditorPopup.header.wingArtifact.active).isFalse();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
            assert(game.players.length).equalsTo(2);
    });

    it("Checks the cancellation of a player creation process from the player selector page", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 2));
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 2));
            clickOnArtifact(game, unitEditorPopup.wingSelector.validateButton);
            clickOnArtifact(game, unitEditorPopup.playerSelector.cancelButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
            assert(game.players.length).equalsTo(2);
    });

    it("Checks a player deletion process", () => {
        given:
            var { game } = build3playersScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 0));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.playerSelector.validateButton.active).isTrue();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player2.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/red/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.validateButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            assert(game.players.length).equalsTo(2);
            assert(game.players[0].name).equalsTo("player2");
            assert(game.players[1].name).equalsTo("player3");
    });

    it("Checks that it is not possible to validate when only one player is defined", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 0));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.playerSelector.validateButton.active).isFalse();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
    });

    it("Checks a player deletion process", () => {
        given:
            var { game } = build3playersScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup.header.playerArtifact);
            clickOnArtifact(game, unitEditorPopup.playerSelector.getCell(0, 1));
        then:
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.playerSelector.cancelButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
            assert(game.players.length).equalsTo(3);
    });

    function skipEditorHeader(widgetsLayer) {
        skipDirectives(widgetsLayer, 4);
        assertDirectives(widgetsLayer, showPopup(500, 400, 500, 650));
        assertDirectives(widgetsLayer, showImage(500, 135, "./../images/units/misc/unit-wing-back.png", 500, 120));
        assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 135));
        assertDirectives(widgetsLayer, showPopupCommand("right", 715, 135));
        assertDirectives(widgetsLayer, showColoredRect(500, 235, "#C0C0C0", 500, 80));
        assertDirectives(widgetsLayer, showInactivePopupCommand("left", 285, 235));
        assertDirectives(widgetsLayer, showPopupCommand("right", 715, 235));
    }

    it("Checks a wings edition process", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify(players), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify(banners), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.header.wingArtifact);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isTrue();
            assert(unitEditorPopup.wingSelector.validateButton.active).isTrue();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/blue/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 0));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isTrue();
            assert(unitEditorPopup.header.playerArtifact.active).isFalse();
            assert(unitEditorPopup.header.wingArtifact.active).isFalse();
            assert(unitEditorPopup.wingSelector.validateButton.active).isFalse();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).isNotDefined();
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.getCell(0, 2));
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isTrue();
            assert(unitEditorPopup.wingSelector.validateButton.active).isTrue();
            assert(unitEditorPopup.wingSelector.cancelButton.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/green/banners/banner0.png");
        when:
            clickOnArtifact(game, unitEditorPopup.wingSelector.validateButton);
        then:
            assert(unitEditorPopup.hasElement(unitEditorPopup.rosterContent)).isTrue();
            assert(unitEditorPopup.hasElement(unitEditorPopup.playerSelector)).isFalse();
            assert(unitEditorPopup.hasElement(unitEditorPopup.wingSelector)).isFalse();
            assert(unitEditorPopup.header.playerArtifact.active).isTrue();
            assert(unitEditorPopup.header.wingArtifact.active).isTrue();
            assert(unitEditorPopup.header.playerArtifact.path).equalsTo("./../players/player1.png");
            assert(unitEditorPopup.header.wingArtifact.path).equalsTo("./../images/units/green/banners/banner0.png");
            assert(game.players[0].wings.length).equalsTo(1);
            assert(game.players[0].wings[0].banner.name).equalsTo("green-banner");
    });

    it("Checks select rosters in editor popup", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);

            assertDirectives(widgetsLayer, showTroopButton(375, 330, "mercenaries/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 330, "mercenaries/character2L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 715, 330, 36));

            assertDirectives(widgetsLayer, showTroopButton(375, 400, "mercenaries/unit1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 400, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 400, 36));
            assertDirectives(widgetsLayer, showTroopButton(625, 400, "mercenaries/unit2L1", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
    });

    function getUnitButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3];
    }

    function getPrevButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3+1];
    }

    function getNextButton(unitRoster, index) {
        return unitRoster._rosterContent._unitArtifacts[index*3+2];
    }

    it("Checks change character/troop type steps", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getPrevButton(unitEditorPopup, 0));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1Lb", ));
            assertDirectives(widgetsLayer, showInactivePopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 465, 330, 36));
        when:
            clickOnArtifact(game, getNextButton(unitEditorPopup, 0));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1L", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showInactivePopupCommand("next", 465, 330, 36));
    });

    it("Checks that unit steps are memorized", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getPrevButton(unitEditorPopup, 0));
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[0]);
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            assertDirectives(widgetsLayer, showTroopButton(375, 330, "orcs/character1Lb", ));
            assertDirectives(widgetsLayer, showInactivePopupCommand("prev", 285, 330, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 465, 330, 36));
    });

    it("Checks change formation type steps", () => {
        given:
            var { game } = buildScenarioEditorGame();
            var [widgetsLayer] = getLayers(game.board, "widgets", "widget-items");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            skipDirectives(widgetsLayer, (6+6+6)*3);
            assertDirectives(widgetsLayer, showFormationButton(625, 400, "mercenaries/unit2L2b", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
        when:
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipEditorHeader(widgetsLayer);
            skipDirectives(widgetsLayer, (6+6+6)*3);
            assertDirectives(widgetsLayer, showFormationButton(625, 400, "mercenaries/unit2L2", ));
            assertDirectives(widgetsLayer, showPopupCommand("prev", 535, 400, 36));
            assertDirectives(widgetsLayer, showPopupCommand("next", 715, 400, 36));
    });

    function getTroopPlacementActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBPiecePlacementActuator) return actuator;
        }
        return null;
    }

    function showTroopTrigger([a, b, c, d, e, f]) {
        return [
            'save()',
                `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                'shadowColor = #FF0000', 'shadowBlur = 10',
                'drawImage(./../images/actuators/unit-t.png, -50, -100, 100, 200)',
            'restore()',
        ];
    }

    function getFormationPlacementActuator(game) {
        for (let actuator of game.actuators) {
            if (actuator instanceof CBFormationPlacementActuator) return actuator;
        }
        return null;
    }

    function showFormationTrigger([a, b, c, d, e, f]) {
        return [
            'save()',
            `setTransform(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
            'shadowColor = #FF0000', 'shadowBlur = 10',
            'drawImage(./../images/actuators/unit-f.png, -100, -100, 200, 200)',
            'restore()',
        ];
    }

    it("Checks unit placement", () => {
        given:
            var { game, map } = buildScenarioEditorGame();
            var [actuatorsLayer, widgetsLayer, units0Layer] = getLayers(game.board, "actuators", "widgets", "units-0");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, getUnitButton(unitEditorPopup, 2));
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
        when:
            var troopPlacementActuator = getTroopPlacementActuator(game);
            var hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 5));
            mouseMoveOnPoint(game, getArtifactPoint(hexTrigger));
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate90(333.3333, 111.327)));
        when:
            clickOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
        when:
            hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 6));
            mouseMoveOnArtifact(game, hexTrigger, 0, -10);
            clickOnTrigger(game, hexTrigger, 10, 0);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate0(333.3333, 207.5513)));
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
            assertDirectives(units0Layer, showTroop("orcs/unit1L", zoomAndRotate0(333.3333, 207.5513)));
        when:
            keydown(game, 'Escape');
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertNoMoreDirectives(actuatorsLayer);

    });

    it("Checks formation placement", () => {
        given:
            var { game, map } = buildScenarioEditorGame();
            var [actuatorsLayer, widgetsLayer, formations0Layer] = getLayers(game.board, "actuators", "widgets", "formations-0");
            game.editUnits();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
        when:
            var unitEditorPopup = getEditUnitPopup(game);
            clickOnArtifact(game, unitEditorPopup._rosterContent._rosterArtifacts[1]);
            clickOnArtifact(game, getNextButton(unitEditorPopup, 3));
            clickOnArtifact(game, getUnitButton(unitEditorPopup, 3));
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
        when:
            var formationPlacementActuator = getFormationPlacementActuator(game);
            var hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 5).toward(60));
            mouseMoveOnPoint(game, getArtifactPoint(hexSideTrigger));
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate150(375, 87.2709)));
        when:
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate150(375, 87.2709)));
        when:
            hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 6).toward(120));
            mouseMoveOnArtifact(game, hexSideTrigger, 0, 10);
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate210(375, 231.6074)));
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate150(375, 87.2709)));
            assertDirectives(formations0Layer, showFormation("mercenaries/unit2L2b", zoomAndRotate210(375, 231.6074)));
        when:
            keydown(game, 'Escape');
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertNoMoreDirectives(actuatorsLayer);
    });

    function showUnitMenuPopup(x, y) {
        return [
            'save()',
                `setTransform(1, 0, 0, 1, ${x}, ${y})`,
                'shadowColor = #000000', 'shadowBlur = 10',
                'strokeStyle = #000000', 'lineWidth = 1',
                'strokeRect(-125, -125, 250, 250)',
                'fillStyle = #FFFFFF',
                'fillRect(-125, -125, 250, 250)',
            'restore()'
        ];
    }

    it("Checks unit menu", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertDirectives(widgetsLayer, showUnitMenuPopup(301.6667, 130));
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);

            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
    });

    it("Checks unit menu item: tired", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 0);
            repaint(game);
        then:
            assert(unit1.isTired()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/cancel-tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 0);
        then:
            assert(unit1.isTired()).isFalse();
    });

    it("Checks unit menu item: exhausted", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 0);
            repaint(game);
        then:
            assert(unit1.isExhausted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/cancel-exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 0);
        then:
            assert(unit1.isExhausted()).isFalse();
    });

    it("Checks unit menu item: disrupted", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 0);
            repaint(game);
        then:
            assert(unit1.isDisrupted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/cancel-disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 0);
        then:
            assert(unit1.isDisrupted()).isFalse();
    });

    it("Checks unit menu item: routed", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 0);
            repaint(game);
        then:
            assert(unit1.isRouted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/cancel-routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 0);
        then:
            assert(unit1.isRouted()).isFalse();
    });

    it("Checks unit menu item: scarce ammunitions", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 1);
            repaint(game);
        then:
            assert(unit1.areMunitionsScarce()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/cancel-scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 1);
        then:
            assert(unit1.areMunitionsScarce()).isFalse();
    });

    it("Checks unit menu item: no ammunition", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 1);
            repaint(game);
        then:
            assert(unit1.areMunitionsExhausted()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/cancel-no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 1);
        then:
            assert(unit1.areMunitionsExhausted()).isFalse();
    });

    it("Checks unit menu item: contact", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 1);
            repaint(game);
        then:
            assert(unit1.isEngaging()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/cancel-contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 1);
        then:
            assert(unit1.isEngaging()).isFalse();
    });

    it("Checks unit menu item: charge", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 1);
            repaint(game);
        then:
            assert(unit1.isCharging()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed-gray", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/cancel-charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 1);
        then:
            assert(unit1.isCharging()).isFalse();
    });

    it("Checks unit menu item: order given", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 2);
            repaint(game);
        then:
            assert(unit1.hasReceivedOrder()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/cancel-order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 2);
        then:
            assert(unit1.hasReceivedOrder()).isFalse();
    });

    it("Checks unit menu item: played", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 2);
            repaint(game);
        then:
            assert(unit1.isPlayed()).isTrue();
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/cancel-played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup-gray", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat-gray", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 2);
        then:
            assert(unit1.isPlayed()).isFalse();
    });

    it("Checks unit menu item: move troop", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, units0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            var troopPlacementActuator = getTroopPlacementActuator(game);
            var hexTrigger = troopPlacementActuator.getTrigger(map.getHex(4, 5));
            mouseMoveOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showTroopTrigger(zoomAndRotate90(333.3333, 111.327)));
        when:
            clickOnTrigger(game, hexTrigger);
            repaint(game);
        then:
            skipDirectives(units0Layer, 4);
            assertDirectives(units0Layer, showSelectedTroop("orcs/unit1L", zoomAndRotate90(333.3333, 111.327)));
    });

    it("Checks unit menu item: move formation", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, formations0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "formations-0");
            let formation1 = new CBFormation(RoughneckLance, wing1);
            formation1.addToMap(map.getHex(5, 6).toward(0));
        when:
            clickOnPiece(game, formation1);
            clickOnActionMenu(game, 2, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            var formationPlacementActuator = getFormationPlacementActuator(game);
            var hexSideTrigger = formationPlacementActuator.getTrigger(map.getHex(4, 5).toward(60));
            mouseMoveOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(actuatorsLayer, 4);
            assertDirectives(actuatorsLayer, showFormationTrigger(zoomAndRotate150(375, 87.2709)));
        when:
            clickOnTrigger(game, hexSideTrigger);
            repaint(game);
        then:
            skipDirectives(formations0Layer, 4);
            assertDirectives(formations0Layer, showSelectedFormation("mercenaries/unit2L4", zoomAndRotate150(375, 87.2709)));
    });

    it("Checks unit menu item: delete", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer, actuatorsLayer, units0Layer] = getLayers(game.board, "widgets", "widget-items", "actuators", "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 2);
            repaint(game);
        then:
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
            skipDirectives(units0Layer, 4);
            assertNoMoreDirectives(units0Layer);
    });

    it("Checks unit menu item: attack order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 0, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.ATTACK);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/cancel-attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 0, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: defend order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 1, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.DEFEND);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/cancel-defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 1, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: regroup order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 2, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.REGROUP);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/cancel-regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 2, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks unit menu item: retreat order instruction", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [widgetsLayer, itemsLayer] = getLayers(game.board, "widgets", "widget-items");
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
            clickOnActionMenu(game, 3, 3);
            repaint(game);
        then:
            assert(unit1.wing.orderInstruction).equalsTo(CBOrderInstruction.RETREAT);
            assert(unit1.wing.leader).equalsTo(unit1);
            skipDirectives(widgetsLayer, 4);
            assertNoMoreDirectives(widgetsLayer);
            skipDirectives(itemsLayer, 4);
            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnPiece(game, unit1);
            repaint(game);
        then:
            skipDirectives(itemsLayer, 4);
            assertDirectives(itemsLayer, showMenuItem(0, 0, "edit-actions/tired", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 0, "edit-actions/exhausted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 0, "edit-actions/disrupted", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 0, "edit-actions/routed", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 1, "edit-actions/scarce-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 1, "edit-actions/no-ammunition", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 1, "edit-actions/contact", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 1, "edit-actions/charge", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 2, "edit-actions/order-given", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 2, "edit-actions/played", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 2, "edit-actions/move", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 2, "edit-actions/delete", 4, 4, 301.6667, 130));

            assertDirectives(itemsLayer, showMenuItem(0, 3, "edit-actions/attack", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(1, 3, "edit-actions/defend", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(2, 3, "edit-actions/regroup", 4, 4, 301.6667, 130));
            assertDirectives(itemsLayer, showMenuItem(3, 3, "edit-actions/cancel-retreat", 4, 4, 301.6667, 130));

            assertNoMoreDirectives(itemsLayer);
        when:
            clickOnActionMenu(game, 3, 3);
        then:
            assert(unit1.wing.leader).isNotDefined();
    });

    it("Checks delete unit using keyboard", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            var [unitsLayer] = getLayers(game.board, "units-0");
            let unit1 = new CBTroop(GoblinWolfRider, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            unit1._select();
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertDirectives(unitsLayer, showSelectedTroop("orcs/unit1L", zoomAndRotate0(416.6667, 159.4391)));
            assertNoMoreDirectives(unitsLayer);
        when:
            keydown(game, 'Delete');
            repaint(game);
        then:
            skipDirectives(unitsLayer, 4);
            assertNoMoreDirectives(unitsLayer);
    });

    it("Checks edit push menu button", () => {
        given:
            var editMode = false;
            var { game } = buildScenarioEditorGame();
            game.editUnits = function() {
                editMode = !editMode;
            }
            game.setMenu();
            var [commandsLayer] = getLayers(game.board, "widget-commands");
            loadAllImages();
            game._showCommand.action();
            executeAllAnimations();
        when:
            game._editUnitsCommand.action();
            executeAllAnimations();
            resetDirectives(commandsLayer);
            repaint(game);
        then:
            assert(editMode).isTrue();
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks edit map button", () => {
        given:
            var { game } = buildMapEditorGame();
            game.setMenu();
            loadAllImages();
            game._showCommand.action();
            game._editBoardCommand.action();
            executeAllAnimations();
        when:
            clickOnArtifact(game, game._editBoardCommand.artifacts[0]);
            executeAllAnimations();
        then:
            assert(getMapEditorActuator(game)).isDefined();
            assert(getEditUnitPopup(game)).isNotDefined();
    });

    it("Checks edit units button", () => {
        given:
            var { game } = buildScenarioEditorGame();
            game.setMenu();
            loadAllImages();
            game._showCommand.action();
            game._editUnitsCommand.action();
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            getDrawPlatform().requestSucceeds(JSON.stringify([]), 200);
            executeAllAnimations();
        when:
            clickOnArtifact(game, game._editUnitsCommand.artifacts[0]);
            executeAllAnimations();
        then:
            assert(getEditUnitPopup(game)).isNotDefined();
    });

    it("Checks global push menu button for Map Editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLayer] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._showCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-board", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 520, 740));
        when:
            game._hideCommand.action();
        repaint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks global push menu button for Scenario Editor", () => {
        given:
            var game = new CBScenarioEditorGame(1);
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            var [commandsLayer] = getLayers(game.board, "widget-commands");
        when:
            game.setMenu();
            game.start();
            loadAllImages();
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
        when:
            resetDirectives(commandsLayer);
            game._showCommand.action();
            paint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("hide", 940, 740));
            assertDirectives(commandsLayer, showGameCommand("undo", 880, 740));
            assertDirectives(commandsLayer, showGameCommand("redo", 820, 740));
            assertDirectives(commandsLayer, showGameCommand("settings", 760, 740));
            assertDirectives(commandsLayer, showGameCommand("save", 700, 740));
            assertDirectives(commandsLayer, showGameCommand("load", 640, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 580, 740));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 520, 740));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 460, 740));
        when:
            game._hideCommand.action();
            repaint(game);
        then:
            assertClearDirectives(commandsLayer);
            assertDirectives(commandsLayer, showGameCommand("show", 940, 740));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks undo/redo push menu button on map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
    });

    it("Checks full screen push menu button on map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            game.fitWindow();
            var [mapLayer, commandsLayer] = getLayers(game.board,"map", "widget-commands");
            loadAllImages();
        when:
            game._showCommand.action();
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 2000, 1500)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 1000, 750)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 2000, 1500);
            assertDirectives(commandsLayer, showGameCommand("hide", 1940, 1440));
            assertDirectives(commandsLayer, showGameCommand("undo", 1880, 1440));
            assertDirectives(commandsLayer, showGameCommand("redo", 1820, 1440));
            assertDirectives(commandsLayer, showGameCommand("settings", 1760, 1440));
            assertDirectives(commandsLayer, showGameCommand("save", 1700, 1440));
            assertDirectives(commandsLayer, showGameCommand("load", 1640, 1440));
            assertDirectives(commandsLayer, showGameCommand("edit-board", 1580, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1520, 1440));
            assertNoMoreDirectives(commandsLayer);
        when:
            game._fullScreenCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                    "resetTransform()",
                    "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                    "setTransform(0.9775, 0, 0, 0.9775, 750, 500)",
                    "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 1500, 1000);
            assertDirectives(commandsLayer, showGameCommand("hide", 1440, 940));
            assertDirectives(commandsLayer, showGameCommand("undo", 1380, 940));
            assertDirectives(commandsLayer, showGameCommand("redo", 1320, 940));
            assertDirectives(commandsLayer, showGameCommand("settings", 1260, 940));
            assertDirectives(commandsLayer, showGameCommand("save", 1200, 940));
            assertDirectives(commandsLayer, showGameCommand("load", 1140, 940));
            assertDirectives(commandsLayer, showGameCommand("edit-board", 1080, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 1020, 940));
            assertNoMoreDirectives(commandsLayer);
    });

    it("Checks undo/redo push menu button on Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame(1);
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            loadAllImages();
            game._showCommand.action();
            paint(game);
            var something = {
                value : true,
                _memento() {
                    return {value:this.value};
                },
                _revert(memento) {
                    this.value = memento.value;
                }
            }
            Memento.register(something);
            something.value = false;
        when:
            game._undoCommand.action();
        then:
            assert(something.value).isTrue();
        when:
            game._redoCommand.action();
        then:
            assert(something.value).isFalse();
    });

    it("Checks full screen push menu button on Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame(1);
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
            game.fitWindow();
            var [mapLayer, commandsLayer] = getLayers(game.board,"map", "widget-commands");
            loadAllImages();
        when:
            game._showCommand.action();
            game._fullScreenCommand.action();
            executeAllAnimations();
            resetDirectives(mapLayer, commandsLayer);
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 2000, 1500)",
                "restore()",
                "save()",
                "setTransform(0.9775, 0, 0, 0.9775, 1000, 750)",
                "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 2000, 1500);
            assertDirectives(commandsLayer, showGameCommand("hide", 1940, 1440));
            assertDirectives(commandsLayer, showGameCommand("undo", 1880, 1440));
            assertDirectives(commandsLayer, showGameCommand("redo", 1820, 1440));
            assertDirectives(commandsLayer, showGameCommand("settings", 1760, 1440));
            assertDirectives(commandsLayer, showGameCommand("save", 1700, 1440));
            assertDirectives(commandsLayer, showGameCommand("load", 1640, 1440));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 1580, 1440));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 1520, 1440));
            assertDirectives(commandsLayer, showGameCommand("full-screen-off", 1460, 1440));
            assertNoMoreDirectives(commandsLayer);
        when:
            game._fullScreenCommand.action();
            executeAllAnimations();
            repaint(game);
        then:
            assert(getDirectives(mapLayer)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1500, 1000)",
                "restore()",
                "save()",
                "setTransform(0.9775, 0, 0, 0.9775, 750, 500)",
                "drawImage(./../images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assertClearDirectives(commandsLayer, 1500, 1000);
            assertDirectives(commandsLayer, showGameCommand("hide", 1440, 940));
            assertDirectives(commandsLayer, showGameCommand("undo", 1380, 940));
            assertDirectives(commandsLayer, showGameCommand("redo", 1320, 940));
            assertDirectives(commandsLayer, showGameCommand("settings", 1260, 940));
            assertDirectives(commandsLayer, showGameCommand("save", 1200, 940));
            assertDirectives(commandsLayer, showGameCommand("load", 1140, 940));
            assertDirectives(commandsLayer, showGameCommand("edit-units", 1080, 940));
            assertDirectives(commandsLayer, showGameCommand("edit-map", 1020, 940));
            assertDirectives(commandsLayer, showGameCommand("full-screen-on", 960, 940));
            assertNoMoreDirectives(commandsLayer);
    });

    function getUnitMenuPopup(game) {
        return game._popup && game._popup instanceof CBEditUnitMenu ? game._popup : null;
    }

    it("Checks edit units button", () => {
        given:
            var { game, map, wing1 } = buildScenarioEditorGame();
            let unit1 = new CBCharacter(GoblinLeader, wing1);
            unit1.addToMap(map.getHex(5, 6));
        when:
            clickOnPiece(game, unit1);
        then:
            assert(getUnitMenuPopup(game)).isDefined()
        when:
            game.board.zoomIn(new Point2D(0, 0));
        then:
            assert(getUnitMenuPopup(game)).isNotDefined();
    });

    it("Checks connect/save/load from the Map editor", () => {
        given:
            var game = new CBMapEditorGame();
            var board = new CBBoard("board", "./../images/maps/map.png", "./../images/maps/map1-icon.png");
            game.setMap(board);
            game.setMenu();
            game.start();
        when:
            game._showCommand.action();
            game._settingsCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/ping-login");
        when:
            game._saveCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/create");
        when:
            game._loadCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/board/by-name/board");
    });

    it("Checks connect/save/load from the Scenario editor", () => {
        given:
            var game = new CBScenarioEditorGame(1);
            var map = new CBMap([{path:"./../images/maps/map.png", col:0, row:0}]);
            game.setMap(map);
            game.setMenu();
            game.start();
        when:
            game._showCommand.action();
            game._settingsCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/ping-login");
        when:
            game._saveCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/create");
        when:
            game._loadCommand.action();
        then:
            assert(getDrawPlatform().getRequest().uri).equalsTo("/api/game/by-name/Scenario");
    });

});