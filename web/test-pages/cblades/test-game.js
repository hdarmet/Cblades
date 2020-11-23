'use strict'

import {
    assert, before, describe, it
} from "../../jstest/jtest.js";
import {
    DImage, setDrawPlatform
} from "../../jslib/draw.js";
import {
    createEvent,
    getDirectives, loadAllImages, mockPlatform, resetDirectives
} from "../mocks.js";
import {
    Mechanisms
} from "../../jslib/mechanisms.js";
import {
    CBGame, CBHexId, CBMap, CBUnit
} from "../../jslib/cblades/game.js";
import {
    Point2D
} from "../../jslib/geometry.js";

describe("Game", ()=> {

    before(() => {
        setDrawPlatform(mockPlatform);
        DImage.resetCache();
        Mechanisms.reset();
    });

    function paint(game) {
        game._board.paint();
    }

    it("Checks raw widget opening and closing", () => {
        given:
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit("/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
        when:
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(mapLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "drawImage(/CBlades/images/maps/map.png, -1023, -1575, 2046, 3150)",
                "restore()"
            ]);
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "setTransform(1, 0, 0, 1, 0, 0)",
                "setTransform(0.4888, 0, 0, 0.4888, 500, 250)",
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks that clicking on the map re-centers the viewport ", () => {
        given:
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            game.start();
            loadAllImages();
        then:
            assert(getDirectives(mapLevel)[1]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 250)");
        when:
            resetDirectives(mapLevel);
            var mouseEvent = createEvent("click", {offsetX:500, offsetY:260});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(getDirectives(mapLevel)[0]).equalsTo("setTransform(0.4888, 0, 0, 0.4888, 500, 240)");
    });

    it("Checks that clicking on a unit select the unit ", () => {
        given:
            var game = new CBGame();
            var unitsLevel = game._board.getLevel("units");
            var widgetsLevel = game._board.getLevel("widgets");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit("/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
        when:
            var transform = counter.element.transform.concat(unitsLevel.transform);
            let unitLocation = transform.point(new Point2D(0, 0));
            resetDirectives(unitsLevel);
            resetDirectives(widgetsLevel);
            var mouseEvent = createEvent("click", {offsetX:unitLocation.x, offsetY:unitLocation.y});
            mockPlatform.dispatchEvent(game.root, "click", mouseEvent);
        then:
            assert(CBUnit.selected).equalsTo(counter);
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)", "restore()"
            ]);
            assert(getDirectives(widgetsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "strokeStyle = #000000",
                "lineWidth = 1",
                "setTransform(1, 0, 0, 1, 376.6667, 136.8878)",
                "strokeRect(-50, -75, 100, 150)",
                "fillStyle = #FFFFFF",
                "fillRect(-50, -75, 100, 150)", "restore()"
            ]);
    });

    it("Checks unit selection/deselection appearance", () => {
        given:
            var game = new CBGame();
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter = new CBUnit("/CBlades/images/units/misc/unit.png");
            game.addCounter(counter, new CBHexId(map, 5, 8));
            game.start();
            loadAllImages();
        when:
            resetDirectives(unitsLevel);
            counter.select();
            paint(game);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #FF0000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
        when:
            resetDirectives(unitsLevel);
            counter.unselect();
            paint(game);
        then:
            assert(getDirectives(unitsLevel)).arrayEqualsTo([
                "save()",
                "resetTransform()",
                "clearRect(0, 0, 1000, 500)",
                "restore()",
                "save()",
                "shadowColor = #000000",
                "shadowBlur = 15",
                "drawImage(/CBlades/images/units/misc/unit.png, -241.5, -169.4375, 142, 142)",
                "restore()"
            ]);
    });

    it("Checks unit selection/deselection", () => {
        given:
            var game = new CBGame();
            var mapLevel = game._board.getLevel("map");
            var unitsLevel = game._board.getLevel("units");
            var map = new CBMap("/CBlades/images/maps/map.png");
            game.setMap(map);
            let counter1 = new CBUnit("/CBlades/images/units/misc/unit1.png");
            let counter2 = new CBUnit("/CBlades/images/units/misc/unit2.png");
            game.addCounter(counter1, new CBHexId(map, 5, 8));
            game.addCounter(counter2, new CBHexId(map, 8, 5));
            game.start();
            loadAllImages();
        when:
            counter1.select();
        then:
            assert(CBUnit.selected).equalsTo(counter1);
        when:
            counter2.select();
        then:
            assert(CBUnit.selected).equalsTo(counter2);
        when:
            counter2.unselect();
        then:
            assert(CBUnit.selected).isNotDefined();
    });

});