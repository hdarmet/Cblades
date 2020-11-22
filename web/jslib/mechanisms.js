'use strict'

export class Mechanisms {

    constructor() {
        this.reset();
    }

    reset() {
        this._listeners = new Set();
    }

    addListener(listener) {
        this._listeners.add(listener);
    }

    removeListener(listener) {
        this._listeners.delete(listener);
    }

    fire(source, event, value) {
        for (let listener of this._listeners.values()) {
            listener._processGlobalEvent(source, event, value);
        }
    }

}
Mechanisms.manager = new Mechanisms();
Mechanisms.reset = function() {
    Mechanisms.manager.reset();
}
Mechanisms.addListener = function(listener) {
    Mechanisms.manager.addListener(listener);
}
Mechanisms.removeListener = function(listener) {
    Mechanisms.manager.removeListener(listener);
}
Mechanisms.fire = function(source, event, value) {
    Mechanisms.manager.fire(source, event, value);
}

export class Memento {

    constructor() {
        this.reset();
    }

    reset() {
        this._active = false;
        this._undoTrx = [];
        this._undoTrx.push(new Map());
        this._redoTrx = [];
        this._before = [];
        this._after = [];
    }

    doBefore(beforeFunction) {
        this._before.push(beforeFunction);
    }

    doAfter(afterFunction) {
        this._after.push(afterFunction);
    }

    get current() {
        console.assert(this._undoTrx.length);
        return this._undoTrx[this._undoTrx.length - 1];
    }

    undoable() {
        return (
            this._undoTrx.length > 1 || (this.current && this.current.size > 0)
        );
    }

    redoable() {
        return this._redoTrx.length > 0;
    }

    open() {
        let current = this.current;
        if (current.size !== 0) {
            this._undoTrx.push(new Map());
            this._fire(Memento.OPEN_EVENT, this.current);
        }
        return this;
    }

    register(element) {
        if (this._active) {
            let current = this.current;
            if (!current.has(element)) {
                this._redoTrx.length = 0;
                current.set(element, this._memento(element));
                this._fire(Memento.KEEP_EVENT, element);
            }
            return this;
        }
    }

    _memento(element) {
        return element._memento();
    }

    _prepare(element, memento) {
        element._prepareRevert && element._prepareRevert(memento);
    }

    _revert(element, memento) {
        element._revert(memento);
    }

    _finalize(element, memento) {
        element._finalizeRevert && element._finalizeRevert(memento);
    }

    _rollback(trx) {
        this._active = false;
        for (let before of this._before) {
            before();
        }
        let inverse = new Map();
        for (let element of trx.keys()) {
            inverse.set(element, this._memento(element));
        }
        for (let element of trx.keys()) {
            this._prepare(element, trx.get(element));
        }
        for (let element of trx.keys()) {
            this._revert(element, trx.get(element));
        }
        for (let element of trx.keys()) {
            this._finalize(element, trx.get(element));
        }
        for (let after of this._after) {
            after();
        }
        this._active = true;
        return inverse;
    }

    _fire(event) {
        Mechanisms.fire(this, event);
    }

    activate() {
        this._active = true;
        this._fire(Memento.ACTIVATE_EVENT);
    }

    deactivate() {
        this._active = false;
        this._fire(Memento.DESACTIVATE_EVENT);
    }

    undo() {
        let current = this._undoTrx.pop();
        if (current.size === 0) {
            current = this._undoTrx.pop();
        }
        if (current) {
            let redo = this._rollback(current);
            this._redoTrx.push(redo);
            this._fire(Memento.UNDO_EVENT);
        }
        this._undoTrx.push(new Map());
        return this;
    }

    redo() {
        let current = this._redoTrx.pop();
        if (current) {
            let undo = this._rollback(current);
            if (this.current.size === 0) {
                this._undoTrx.pop();
            }
            this._undoTrx.push(undo);
            this._fire(Memento.REDO_EVENT);
        }
        return this;
    }

    cancel() {
        let current = this._undoTrx.pop();
        if (current.size === 0) {
            current = this._undoTrx.pop();
        }
        if (current) {
            this._rollback(current);
            this._fire(Memento.UNDO_EVENT);
        }
        this._undoTrx.push(new Map());
        return this;
    }

    clear() {
        this._undoTrx.length = 0;
        this._redoTrx.length = 0;
        this._undoTrx.push(new Map());
        this._fire(Memento.CLEAR_EVENT);
        return this;
    }
}
Memento.manager = new Memento();
Memento.KEEP_EVENT = "memento-keep";
Memento.OPEN_EVENT = "memento-open";
Memento.UNDO_EVENT = "memento-undo";
Memento.REDO_EVENT = "memento-redo";
Memento.CLEAR_EVENT = "memento-clear";
Memento.ACTIVATE_EVENT = "memento-activate";
Memento.DESACTIVATE_EVENT = "memento-desactivate";
Memento.register = function(element) {
    Memento.manager.register(element);
}
Memento.reset = function() {
    Memento.manager.reset();
}
Memento.activate = function() {
    Memento.manager.activate();
}
Memento.deactivate = function() {
    Memento.manager.deactivate();
}
Memento.doBefore = function(func) {
    Memento.manager.doBefore(func);
}
Memento.doAfter = function(func) {
    Memento.manager.doAfter(func);
}
Memento.clear = function() {
    Memento.manager.clear();
}
Memento.open = function() {
    Memento.manager.open();
}
Memento.undo = function() {
    Memento.manager.undo();
}
Memento.redo = function() {
    Memento.manager.redo();
}
Memento.undoable = function() {
    return Memento.manager.undoable();
}
Memento.redoable = function() {
    return Memento.manager.redoable();
}
Memento.cancel = function() {
    Memento.manager.cancel();
}
