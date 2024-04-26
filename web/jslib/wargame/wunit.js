'use strict'

import {
    Memento
} from "../board/mechanisms.js";
import {
    ActivableArtifactMixin,
    RetractableArtifactMixin,
    RetractablePieceMixin,
    SelectableArtifactMixin, WGame,
    WLevelBuilder, WPlayableActuatorTrigger, WPlayer
} from "./playable.js";
import {
    BelongsToPlayerMixin,
    HexLocatableMixin,
    PlayableMixin,
    WPiece, WPieceImageArtifact,
    WStacking
} from "./game.js";
import {
    WAnimation
} from "./sequences.js";
import {
    DImage
} from "../board/draw.js";
import {
    diffAngle,
    Dimension2D, Point2D, sumAngle
} from "../board/geometry.js";
import {
    WHexLocation
} from "./map.js";

export class WUnitPlayer extends WPlayer {

    _init() {
        super._init();
        this._wings = [];
    }

    addWing(wing) {
        this._wings.push(wing);
        wing.player = this;
    }

    get wings() {
        return this._wings;
    }

    get units() {
        return this.game.playables.filter(playable=>playable.unitNature && playable.player === this);
    }

    toSpecs(context) {
        let playerSpecs = super.toSpecs(context);
        playerSpecs.wings = [];
        for (let wing of this.wings) {
            let wingSpecs = wing.toSpecs(context);
            playerSpecs.wings.push(wingSpecs);
        }
        return playerSpecs;
    }

    _fromWingSpec(wingSpecs, context) {
        return WWing.fromSpecs(this, wingSpecs, context);
    }

    fromSpecs(game, specs, context) {
        super.fromSpecs(game, specs, context);
        for (let wingSpecs of specs.wings) {
            this._fromWingSpec(wingSpecs, context);
        }
        return this;
    }

}

export class WWing {

    constructor(player) {
        if (player) {
            player.addWing(this);
        }
    }

    get player() {
        return this._player;
    }

    set player(player) {
        this._player = player;
    }

    get playables() {
        let playables = [];
        for (let playable of this._player.playables) {
            if (playable.wing === this) playables.push(playable);
        }
        return playables;
    }

    static fromSpecs(player, specs, context) {
        let wing = new WWing(
            player, {
                _oid: specs.id,
                _oversion: specs.version
            }
        );
        wing.fromSpecs(specs, context);
        return wing;
    }

    toSpecs(context) {
        let wingSpecs = {
            id: this._oid,
            version: this._oversion || 0,
            units: []
        }
        for (let unit of this.playables) {
            let unitSpecs = unit.toSpecs(context);
            wingSpecs.units.push(unitSpecs);
        }
        return wingSpecs;
    }

    fromSpecs(specs, context) {
        this._oid = specs.id;
        this._oversion = specs.version;
        for (let unitSpecs of specs.units) {
            let unit = WUnit.fromSpecs(this, unitSpecs, context);
            context.pieceMap.set(unit.name, unit);
        }
    }

}

export class UnitImageArtifact extends RetractableArtifactMixin(SelectableArtifactMixin(WPieceImageArtifact)) {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get unit() {
        return this.piece;
    }

    /*
    get game() {
        return this.unit.game;
    }
     */

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return WLevelBuilder.ULAYERS.UNITS;
    }

}

export class WMarkerArtifact extends RetractableArtifactMixin(WPieceImageArtifact) {

    constructor(unit, images, position, dimension= WMarkerArtifact.DIMENSION) {
        super(unit, "units", images, position, dimension);
    }

    get unit() {
        return this.piece;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return this.unit.formationNature ? WLevelBuilder.ULAYERS.FMARKERS : WLevelBuilder.ULAYERS.MARKERS;
    }

    static DIMENSION = new Dimension2D(64, 64);
}


export class WActivableMarkerArtifact extends ActivableArtifactMixin(WMarkerArtifact) {

    constructor(unit, paths, position, action, dimension= WMarkerArtifact.DIMENSION) {
        let images = [];
        for (let path of paths) {
            images.push(DImage.getImage(path));
        }
        super(unit, images, position, dimension);
        this._action = action;
    }

    onMouseClick(event) {
        this._action(this);
        return true;
    }

}

export function OptionArtifactMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        get slot() {
            return this.unit.slot;
        }

        get layer() {
            return this.unit.formationNature ? WLevelBuilder.ULAYERS.FOPTIONS : WLevelBuilder.ULAYERS.OPTIONS;
        }

    }

}

export function OptionMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        _memento() {
            let memento = super._memento();
            memento.owner = this._owner;
            return memento;
        }

        _revert(memento) {
            super._revert(memento);
            if (memento.owner) {
                this._owner = memento.owner;
            }
            else {
                delete this._owner;
            }
        }

        shift(owner, steps) {
            Memento.register(this);
            this._owner = owner;
            this.artifact.shift(new Point2D(-steps*20, -steps*20+10));
        }

        setPosition(owner, steps) {
            this._owner = owner
            this.artifact.position = new Point2D(-steps*20, -steps*20+10);
        }

        removeAsOption() {
            delete this._owner;
        }

        deleteAsOption() {
            Memento.register(this);
            delete this._owner;
        }

        get owner() {
            return this._owner;
        }

        get optionNature() {
            return true;
        }

    }

}

export function CarriableMixin(clazz) {

    return class extends clazz {
        constructor(...args) {
            super(...args);
        }

        _move(hexLocation) {
            Memento.register(this);
            this._deletePlayable(this._hexLocation);
            this._hexLocation = hexLocation;
            this._appendPlayable(hexLocation, WStacking.TOP);
            this._element.move(hexLocation.location);
        }

        _rotate(angle) {
            Memento.register(this);
            this._element.rotate(angle);
        }

    }

}

export class WSimpleMarkerArtifact extends WMarkerArtifact {

    constructor(unit, path, position, dimension = WMarkerArtifact.DIMENSION) {
        super(unit, [DImage.getImage(path)], position, dimension);
    }

}

export class WUnit extends RetractablePieceMixin(HexLocatableMixin(BelongsToPlayerMixin(PlayableMixin(WPiece)))) {

    constructor(game, paths, wing, dimension) {
        super("units", game, paths, dimension);
        this._wing = wing;
        this.artifact.setImage(0);
        this._carried = [];
        this._options = [];
        this._lossSteps = 0;
    }

    _init() {
    }

    createArtifact(levelName, images, position, dimension) {
        return new UnitImageArtifact(this, levelName, images, position, dimension);
    }

    get unitNature() {
        return true;
    }

    get slot() {
        return this.hexLocation.units.indexOf(this);
    }

    _getPieces() {
        let counters = [];
        for (let carried of this._carried) {
            if (!carried.optionNature) {
                counters.push(carried);
            }
        }
        counters.push(...super._getPieces());
        counters.push(...this.options);
        return counters;
    }

    get dimension() {
        return this.artifact.dimension;
    }

    get dimensionForMarkers() {
        return this.dimension;
    }

    getMarkerPosition(positionSlot) {
        switch(positionSlot) {
            case 0: return new Point2D(this.dimensionForMarkers.w / 2, -this.dimensionForMarkers.h / 2);
            case 1: return new Point2D(0, -this.dimensionForMarkers.h / 2);
            case 2: return new Point2D(-this.dimensionForMarkers.w / 2, -this.dimensionForMarkers.h / 2);
            case 3: return new Point2D(-this.dimensionForMarkers.w / 2, 0);
            case 4: return new Point2D(-this.dimensionForMarkers.w / 2, this.dimensionForMarkers.h / 2);
            case 5: return new Point2D(0, this.dimensionForMarkers.h / 2);
            case 6: return new Point2D(this.dimensionForMarkers.w / 2, this.dimensionForMarkers.h / 2);
            case 7: return new Point2D(this.dimensionForMarkers.w / 2, 0);
        }
    }

    setMarkerArtifact(path, positionSlot) {
        let marker = new WSimpleMarkerArtifact(this, path, this.getMarkerPosition(positionSlot));
        this._element.addArtifact(marker);
        return marker;
    }

    createMarkerArtifact(path, positionSlot) {
        let marker = new WSimpleMarkerArtifact(this, path, this.getMarkerPosition(positionSlot));
        this._element.appendArtifact(marker);
        return marker;
    }

    setActivableMarkerArtifact(paths, action, positionSlot) {
        let marker = new WActivableMarkerArtifact(this, paths, this.getMarkerPosition(positionSlot), action);
        this._element.addArtifact(marker);
        return marker;
    }

    createActivableMarkerArtifact(paths, action, positionSlot) {
        let marker = new WActivableMarkerArtifact(this, paths, this.getMarkerPosition(positionSlot), action);
        this._element.appendArtifact(marker);
        return marker;
    }

    removeMarkerArtifact(marker) {
        this._element.removeArtifact(marker);
    }

    deleteMarkerArtifact(marker) {
        this._element.deleteArtifact(marker);
    }

    _setLocation(location) {
        super._setLocation(location);
        for (let carried of this._carried) {
            carried.location = this.location;
        }
    }

    _setAngle(angle) {
        super._setAngle(angle);
        for (let carried of this._carried) {
            carried.angle = this.angle;
        }
    }

    _memento() {
        return {
            ...super._memento(),
            movementPoints: this._movementPoints,
            lossSteps: this._lossSteps,
            carried: [...this._carried],
            options: [...this._options]
        };
    }

    _revert(memento) {
        super._revert(memento);
        this._movementPoints = memento.movementPoints;
        this._lossSteps = memento.lossSteps;
        this._carried = memento.carried;
        this._options = memento.options;
    }

    copy(unit) {
        unit._movementPoints = this._movementPoints;
        unit.lossSteps = this.lossSteps;
    }

    clone() {
        let copy = new this.constructor(this.game, this.paths, this.wing, this.dimension);
        this.copy(copy);
        return copy;
    }

    addToMap(hexId, stacking) {
        super.addToMap(hexId, stacking);
        for (let carried of this._carried) {
            carried.addToMap(hexId, stacking);
        }
    }

    removeFromMap() {
        super.removeFromMap();
        for (let carried of this._carried) {
            carried.removeFromMap();
        }
    }

    appendToMap(hexLocation, stacking) {
        super.appendToMap(hexLocation, stacking);
        for (let carried of this._carried) {
            carried.appendToMap(hexLocation, stacking);
        }
    }

    deleteFromMap() {
        super.deleteFromMap();
        for (let carried of this._carried) {
            carried.deleteFromMap();
        }
    }

    addCarried(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        this._carried.push(piece);
        piece.angle = this.angle;
        piece.location = this.location;
        if (this.isShown()) piece.addToMap(this.hexLocation);
    }

    removeCarried(piece) {
        this._carried.remove(piece);
        if (this.isShown()) piece.removeFromMap();
    }

    carry(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        Memento.register(this);
        this._carried.push(piece);
        piece._rotate(this.angle);
        if (this.isShown()) {
            piece.appendToMap(this.hexLocation);
        }
    }

    drop(piece) {
        console.assert(this._carried.contains(piece));
        Memento.register(this);
        this._carried.remove(piece);
        if (this.isShown()) {
            piece.deleteFromMap();
        }
    }

    addOption(piece) {
        console.assert(this._options.indexOf(piece)===-1);
        this.addCarried(piece);
        this._options.push(piece);
        piece.setPosition(this, this._options.length);
    }

    removeOption(piece) {
        this.removeCarried(piece);
        let indexPiece = this._options.remove(piece);
        for (let index = indexPiece; index<this._options.length; index++) {
            this._options[index].setPosition(this, index+1);
        }
        piece.removeAsOption();
    }

    appendOption(piece) {
        console.assert(this._carried.indexOf(piece)===-1);
        Memento.register(this);
        this.carry(piece);
        this._options.push(piece);
        piece.shift(this, this._options.length);
    }

    deleteOption(piece) {
        console.assert(this._options.contains(piece));
        Memento.register(this);
        this.drop(piece);
        let indexPiece = this._options.remove(piece, 1);
        for (let index = indexPiece; index<this._options.length; index++) {
            this._options[index].shift(this, index+1);
        }
        piece.deleteAsOption();
    }

    get carried() {
        return this._carried;
    }

    get name() {
        return this._name;
    }
    set name(name) {
        this._name = name;
    }

    get wing() {
        return this._wing;
    }

    get player() {
        return this._wing.player;
    }

    get movementPoints() {
        return this._movementPoints;
    }

    set movementPoints(movementPoints) {
        this._movementPoints = movementPoints;
    }

    get options() {
        return this._options;
    }

    get lossSteps() {
        return this._lossSteps;
    }

    set lossSteps(lossSteps) {
        this._lossSteps = lossSteps;
        if (this._lossSteps<this.maxStepCount) {
            this.artifact.setImage(this._lossSteps);
        }
    }

    get visible() {
        return this.steps>0;
    }

    get steps() {
        return this.maxStepCount - this.lossSteps;
    }

    set steps(steps) {
        this.lossSteps = this.maxStepCount - steps;
    }

    takeALoss() {
        if (this._lossSteps <= this.maxStepCount) {
            Memento.register(this);
            this._lossSteps++;
            if (this._lossSteps === this.maxStepCount) {
                this.destroy();
            } else {
                this.artifact.changeImage(this._lossSteps);
            }
        }
    }

    fixRemainingLossSteps(stepCount) {
        console.assert(stepCount<=this.maxStepCount);
        Memento.register(this);
        this._lossSteps=this.maxStepCount-stepCount;
        this.artifact.changeImage(this._lossSteps);
    }

    _displace(hexLocation, stacking) {
        Memento.register(this);
        this._hexLocation._deletePlayable(this);
        this._hexLocation = hexLocation;
        stacking===WStacking.BOTTOM ? hexLocation._appendPlayableOnBottom(this) : hexLocation._appendPlayableOnTop(this);
        this._element.move(hexLocation.location);
        for (let carried of this._carried) {
            carried._move(hexLocation);
        }
    }

    displace(hexLocation, stacking) {
        if ((hexLocation || this.hexLocation) && (hexLocation !== this.hexLocation)) {
            if (this.isOnHex() && !hexLocation) {
                this.deleteFromMap();
            } else if (!this.hexLocation && hexLocation) {
                this.appendToMap(hexLocation, stacking);
            } else {
                this._displace(hexLocation, stacking);
            }
        }
    }

    _rotate(angle) {
        this._element.rotate(angle);
        for (let carried of this._carried) {
            carried._rotate(angle);
        }
    }

    reorient(angle) {
        Memento.register(this);
        this._rotate(angle);
    }

    getPosition() {
        return this.hexLocation ? {
            col: this.hexLocation.col,
            row: this.hexLocation.row
        } : null;
    }

    setState(state) {
        this._movementPoints = state.movementPoints;
        if (state.steps) {
            this.steps = state.steps;
        } else {
            if (this.isOnHex()) {
                this.destroy();
            }
        }
    }

}

export class TwoHexesImageArtifact extends UnitImageArtifact {

    constructor(unit, ...args) {
        super(unit, ...args);
    }

    get layer() {
        return WLevelBuilder.ULAYERS.FORMATIONS;
    }

}

export function TwoHexesUnit(clazz) {

    return class extends clazz {

        createArtifact(levelName, images, position, dimension) {
            return new TwoHexesImageArtifact(this, levelName, images, position, dimension);
        }

        get slot() {
            let slot1 = this.hexLocation.fromHex.units.indexOf(this);
            let slot2 = this.hexLocation.toHex.units.indexOf(this);
            return slot1 > slot2 ? slot1 : slot2;
        }

        getTurnOrientation(angle) {
            let delta = diffAngle(this.angle, angle) * 2;
            return sumAngle(this.angle, delta);
        }

        getPosition() {
            return {
                col: this.hexLocation.fromHex.col,
                row: this.hexLocation.fromHex.row,
                angle: this.hexLocation.angle
            };
        }

    }

}

export function SceneAnimation(clazz) {

    return class extends clazz {
        constructor({animation, ...params}) {
            super(params);
            this._animation = animation;
        }

        _draw(count, ticks) {
            if (count === 0) {
                this._animation();
            }
            return super._draw(count, ticks);
        }

        _finalize() {
            this.game.closePopup();
            super._finalize();
        }
    }

}

export let WSceneAnimation = SceneAnimation(WAnimation);

export class WUnitAnimation extends WAnimation {

    constructor({unit, state, ...params}) {
        super({game: unit.game, ...params});
        this._unit = unit;
        this._state = state;
    }

    get unit() {
        return this._unit;
    }

    _init() {
        if (this.unit) {
            if (this.unit._animation) {
                this.unit._animation.cancel();
            }
            this.unit._animation = this;
        }
    }

    _finalize() {
        super._finalize();
        if (this.unit) {
            this.unit.setState(this._state);
            delete this.unit._animation;
        }
    }

}

export class WDisplaceAnimation extends WUnitAnimation {

    constructor({unit, startTick, duration, state, angle, hexLocation, stacking}) {
        super({unit, startTick, duration, state});
        this._angle = angle;
        this._hexLocation = hexLocation;
        this._stacking = stacking;
    }

    _init() {
        super._init();
        if (this._angle!==undefined) {
            this._startAngle = this.unit.element.angle;
            this.unit._rotate(this._angle);
            this._stopAngle = this.unit.element.angle;
            this.unit.element.setAngle(this._startAngle);
        }
        if (this._hexLocation!==undefined) {
            this._startLocation = this.unit.element.location;
            this.unit._displace(this._hexLocation, this._stacking);
            this._stopLocation = this.unit.element.location;
            this.unit.element.setLocation(this._startLocation);
        }
    }

    _finalize() {
        if (this._stopAngle) {
            this.unit.element.setAngle(this._stopAngle);
        }
        if (this._stopLocation) {
            this.unit.element.setLocation(this._stopLocation);
        }
        super._finalize();
    }

    _draw(count, ticks) {
        let factor = this._factor(count);
        if (this._startAngle!==undefined) {
            this.unit.element.setAngle(this._startAngle + factor*diffAngle(this._startAngle, this._stopAngle));
        }
        if (this._startLocation!==undefined) {
            let location = new Point2D(
                this._startLocation.x + factor*(this._stopLocation.x-this._startLocation.x),
                this._startLocation.y + factor*(this._stopLocation.y-this._startLocation.y)
            );
            this.unit.element.setLocation(location);
        }
        return super._draw(count, ticks);
    }

}

export let WUnitSceneAnimation = SceneAnimation(WUnitAnimation);

export class WUnitActuatorTrigger extends WPlayableActuatorTrigger {

    constructor(actuator, unit, ...args) {
        super(actuator, unit, ...args);
    }

    get unit() {
        return this.playable;
    }

    get slot() {
        return this.unit.slot;
    }

    get layer() {
        return WLevelBuilder.ULAYERS.ACTUATORS;
    }

}

function loadUnitsToContext(context) {
    if (!context.units) {
        context.units = new Map();
        for (let playable of context.game.playables) {
            if (playable instanceof WUnit) {
                context.units.set(playable.name, playable);
            }
        }
    }
    return context;
}

export function getUnitFromContext(context, name) {
    let unit = loadUnitsToContext(context).units.get(name);
    console.assert(unit);
    return unit;
}

export function setUnitToContext(context, unit) {
    loadUnitsToContext(context).units.set(unit.name, unit);
}

Object.defineProperty(WHexLocation.prototype, "units", {
    get: function() {
        return this.playables.filter(playable=>playable.unitNature);
    }
});
Object.defineProperty(WHexLocation.prototype, "empty", {
    get: function() {
        return this.units.length===0;
    }
});
Object.defineProperty(WGame.prototype, "units", {
    get: function() {
        let units = [];
        if (this._playables) {
            for (let playable of this._playables) {
                if (playable.unitNature) {
                    units.push(playable);
                }
            }
        }
        return units;
    }
});

WGame.prototype.getUnit = function(name) {
    let unit = this._playables.filter(unit=>unit.name === name);
    return unit.length>0 ? unit[0] : null;
}

export function getStackingCode(stacking) {
    if (stacking===WStacking.TOP) return "T";
    else return "B";
}

export function getStacking(code) {
    switch (code) {
        case "T": return WStacking.TOP;
        case "B": return WStacking.BOTTOM;
    }
}

export function HexLocated(clazz) {

    return class extends clazz {

        constructor({hexLocation, stacking, ...params}) {
            super(params);
            this.hexLocation = hexLocation;
            this.stacking = stacking;
        }

        equalsTo(element) {
            if (!super.equalsTo(element)) return false;
            if (this.hexLocation.location.toString() !== element.hexLocation.location.toString()) return false;
            if (this.stacking !== element.stacking) return false;
            return true;
        }

        _toString() {
            let result = super._toString();
            if (this.hexLocation !== undefined) result+=", HexLocation: "+this.hexLocation.location.toString();
            if (this.stacking !== undefined) result+=", Stacking: "+getStackingCode(this.stacking);
            return result;
        }

        _toSpecs(spec, context) {
            super._toSpecs(spec, context);
            if (this.hexLocation) {
                spec.hexLocation = WHexLocation.toSpecs(this.hexLocation);
            }
            spec.stacking = getStackingCode(this.stacking);
        }

        _fromSpecs(spec, context) {
            super._fromSpecs(spec, context);
            if (spec.hexLocation) {
                this.hexLocation = WHexLocation.fromSpecs(context.game.map, spec.hexLocation);
            }
            this.stacking = getStacking(spec.stacking);
        }

    }

}