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

    get listeners() {
        return this._listeners;
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

class AVLNode {

    constructor(tree, data) {
        this._tree = tree;
        this._data = data;
        this._left = null;
        this._right = null;
        this._parent = null;
        this._height = 0;
    }

    duplicate(tree, parent) {
        let node = new AVLNode(tree, this._data);
        node._parent = parent;
        node._left = this._left ? this._left.duplicate(tree, node) : null;
        node._right = this._right ? this._right.duplicate(tree, node) : null;
        node._height = this._height;
        return node;
    }

    print(stringifier, parent) {
        console.assert(this._parent===parent);
        if (this._left) {
            this._left.print(stringifier, this);
        }
        console.log(stringifier(this));
        if (this._right) {
            this._right.print(stringifier, this);
        }
    }

    get left() {
        return this._left;
    }

    set left(node) {
        node && (node._parent = this);
        this._left = node;
    }

    get right() {
        return this._right;
    }

    set right(node) {
        node && (node._parent = this);
        this._right = node;
    }

    _computeHeight() {
        let left = this.left ? this.left._height : -1;
        let right = this.right ? this.right._height : -1;
        this._height = left>right ? left+1 : right+1;
    }

    get balanceFactor() {
        let left = this.left ? this.left._height : -1;
        let right = this.right ? this.right._height : -1;
        return left - right;
    }

    rightRotate() {
        let tmp = this.left;
        this.left = tmp.right;
        tmp.right = this;
        this._computeHeight();
        tmp._computeHeight();
        return tmp;
    }

    leftRotate() {
        let tmp = this.right;
        this.right = tmp.left;
        tmp.left = this;
        this._computeHeight();
        tmp._computeHeight();
        return tmp;
    }

    insert(node, tree) {
        let comparator = this._tree._comparator;
        let comp = comparator(node._data, this._data);
        if (comp<0) {
            // Go left!
            if (this.left) {
                this.left = this.left.insert(node, tree);
            }
            else {
                this.left = node;
                tree._size++;
            }
            this._computeHeight();
            if (this.balanceFactor > 1) {
                if (comparator(node._data, this.left._data)<0) {
                    return this.rightRotate();
                } else {
                    this.left = this.left.leftRotate();
                    return this.rightRotate();
                }
            }
        } else if (comp>0) {
            if (this.right) {
                this.right = this.right.insert(node, tree);
            }
            else {
                this.right = node;
                tree._size++;
            }
            this._computeHeight();
            if (this.balanceFactor < -1) {
                if (comparator(node._data, this.right._data)>0) {
                    return this.leftRotate();
                } else {
                    this.right = this.right.rightRotate();
                    return this.leftRotate();
                }
            }
        }
        else {
            this._data = node._data;
        }
        return this;
    }

    _adjustForDeletion() {
        this._computeHeight();
        let balanceFactor = this.balanceFactor;
        if (balanceFactor > 1 && this.left.balanceFactor >= 0) {
            return this.rightRotate();
        }
        if (balanceFactor > 1 && this.left.balanceFactor < 0) {
            this.left = this.left.leftRotate();
            return this.rightRotate();
        }
        if (balanceFactor < -1 && this.right.balanceFactor <= 0) {
            return this.leftRotate();
        }
        if (balanceFactor < -1 && this.right.balanceFactor > 0) {
            this.right = this.right.rightRotate();
            return this.leftRotate();
        }
        return this;
    }

    _minValueNode() {
        let current = this;
        while (current.left != null) {
            current = current.left;
        }
        return current;
    }

    _maxValueNode() {
        let current = this;
        while (current.right != null) {
            current = current.right;
        }
        return current;
    }

    delete(data, tree) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (this.left) {
                this.left = this.left.delete(data, tree);
                return this._adjustForDeletion();
            }
            else return this;
        }
        else if (comp>0) {
            if (this.right) {
                this.right = this.right.delete(data, tree);
                return this._adjustForDeletion();
            }
            else return this;
        }
        else {
            tree._size--;
            if (!this.left || !this.right) {
                let tmp = this.left ? this.left : this.right;
                return tmp ? tmp._adjustForDeletion() : null;
            }
            else {
                let tmp = this.right._minValueNode();
                this._data = tmp._data;
                this.right = this.right.delete(this._data, tree);
                return this._adjustForDeletion();
            }
        }
    }

    find(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return null;
            return this.left.find(data);
        }
        else if (comp>0) {
            if (!this.right) return null;
            return this.right.find(data);
        }
        else {
            return this;
        }
    }

    findBefore(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return null;
            return  this.left.findBefore(data);
        }
        else if (comp>0) {
            if (!this.right) return this;
            let node = this.right.findBefore(data);
            return node!==null ? node : this;
        }
        else {
            return this;
        }
    }

    findAfter(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return this;
            let node = this.left.findAfter(data);
            return node!==null ? node : this;
        }
        else if (comp>0) {
            if (!this.right) return null;
            return this.right.findAfter(data);
        }
        else {
            return this;
        }
    }

    _next(node) {
        if (node === this.left) {
            return this;
        }
        else {
            return this._parent ? this._parent._next(this) : null;
        }
    }

    next() {
        if (this.right) {
            return this.right._minValueNode();
        }
        else {
            return this._parent ? this._parent._next(this) : null;
        }
    }
}

class AVLIterator {

    constructor(start, end) {
        this._node = start;
        this._end = end ? end : null;
        this[Symbol.iterator] = ()=>this;
    }

    next() {
        if (!this._node) {
            return {
                value: null,
                done: true
            }
        }
        let value = {
            value: this._node._data,
            done: false
        };
        this._node = this._node!==this._end ? this._node.next() : null;
        return value;
    }

}

export class AVLTree {

    constructor(comparatorOrTree, iterable) {
        this._size = 0;
        this._root = null;
        if (comparatorOrTree instanceof AVLTree) {
            this._comparator = comparatorOrTree._comparator;
            this._root = comparatorOrTree._root ? comparatorOrTree._root.duplicate(this, null) : null;
        }
        else {
            this._comparator = comparatorOrTree;
            if (iterable) {
                for (let data of iterable) {
                    this.insert(data);
                }
            }
        }
    }

    get size() {
        return this._size;
    }

    insert(data) {
        let node = new AVLNode(this, data);
        if (this._root === null) {
            this._root = node;
            this._size = 1;
        } else {
            this._root = this._root.insert(node, this);
        }
        this._root._parent = null;
    }

    delete(data) {
        if (this._root) {
            this._root = this._root.delete(data, this);
            this._root && (this._root._parent = null);
        }
    }

    pop() {
        let data = this._root._maxValueNode()._data;
        this.delete(data);
        return data;
    }

    shift() {
        let data = this._root._minValueNode()._data;
        this.delete(data);
        return data;
    }

    find(data) {
        let node = this._root ? this._root.find(data) : null;
        return node ? node._data : null;
    }

    inside(startData = null, endData = null) {
        if (startData && endData && this._comparator(startData, endData)>0) {
            return new AVLIterator();
        }
        else if (this._root) {
            let startNode = startData ? this._root.findAfter(startData) : null;
            if (!startNode) {
                if (startData !== null) {
                    return new AVLIterator();
                }
                else {
                    startNode = this._root._minValueNode();
                }
            }
            let endNode = endData ? this._root.findBefore(endData) : null;
            return new AVLIterator(startNode, endNode);
        }
        else {
            return new AVLIterator();
        }
    }

    including(startData = null, endData = null) {
        if (startData && endData && this._comparator(startData, endData)>0) {
            return new AVLIterator();
        }
        else if (this._root) {
            let startNode = startData ? this._root.findBefore(startData) : null;
            if (!startNode) startNode = this._root._minValueNode();
            let endNode = endData ? this._root.findAfter(endData) : null;
            return new AVLIterator(startNode, endNode);
        }
        else {
            return new AVLIterator();
        }
    }

    print(stringifier) {
        if (this._root) {
            this._root.print(stringifier, null);
        }
    }

    [Symbol.iterator]() {
        if (this._root) {
            return new AVLIterator(this._root._minValueNode(), null);
        }
        else {
            return new AVLIterator();
        }
    }

    get forInsertList() {
        let result = [this._root._data];
        let toProcess = [this._root];
        while(toProcess.length>0) {
            let nextToProcess = [];
            for (let record of toProcess) {
                if (record._left) {
                    nextToProcess.push(record._left);
                    result.push(record._left._data);
                }
                if (record._right) {
                    nextToProcess.push(record._right);
                    result.push(record._right._data);
                }
            }
            toProcess = nextToProcess;
        }
        return result;
    }

}