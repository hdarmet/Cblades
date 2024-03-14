'use strict'

import {
    assert, describe, it, before
} from "../../jstest/jtest.js";
import {
    AVLTree,
    Mechanisms,
    Memento
} from "../../jslib/board/mechanisms.js";

describe("Mechansism", ()=> {

    class Revertable {

        constructor(data) {
            this.data = data;
        }

        _memento() {
            return {
                data:this.data
            }
        }

        _revert(memento) {
            this.data = memento.data;
        }

        setData(data) {
            Memento.register(this);
            this.data = data;
        }

    }

    class Recorder {

        constructor() {
            this.logs = [];
        }

        _processGlobalEvent(source, event) {
            this.logs.push(event);
        }

    }

    before(()=> {
        Mechanisms.reset();
        Memento.reset();
        Memento.activate();
    });

    it("Checks event listener registration and firing", () => {
        given:
            var recorder = new Recorder();
        when:
            Mechanisms.addListener(recorder);
            Mechanisms.fire(null, "fire-one")
        then:
            assert(recorder.logs.length).equalsTo(1);
            assert(recorder.logs[0]).equalsTo("fire-one");
            assert(Mechanisms.manager.listeners).setEqualsTo(new Set([recorder]));
        when:
            Mechanisms.removeListener(recorder);
            Mechanisms.fire(null, "fire-two")
        then:
            assert(recorder.logs.length).equalsTo(1);
    });

    it("Checks simple undo/redo", () => {
        given:
            var recorder = new Recorder();
            Mechanisms.addListener(recorder);
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            assert(revertable.data).equalsTo("modified");
            Memento.undo();
        then:
            assert(revertable.data).equalsTo("at start");
        when:
            Memento.redo();
        then:
            assert(revertable.data).equalsTo("modified");
            assert(recorder.logs.length).equalsTo(3);
            assert(recorder.logs[0]).equalsTo("memento-keep");
            assert(recorder.logs[1]).equalsTo("memento-undo");
            assert(recorder.logs[2]).equalsTo("memento-redo");
    });

    it("Checks multiple undo/redo", () => {
        given:
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified 1");
            Memento.open();
            revertable.setData("modified 2");
        then:
            assert(revertable.data).equalsTo("modified 2");
        when:
            Memento.undo();
        then:
            assert(revertable.data).equalsTo("modified 1");
        when:
            Memento.redo();
        then:
            assert(revertable.data).equalsTo("modified 2");
        when:
            Memento.undo();
            Memento.undo();
        then:
            assert(revertable.data).equalsTo("at start");
    });


    class ComplexRevertable extends Revertable {

        _prepareRevert() {
            Mechanisms.fire(this, "prepare-revert");
        }

        _finalizeRevert() {
            Mechanisms.fire(this, "finalize-revert");
        }
    }

    it("Checks complex recovering (includes prepare and finalize && usage of before/after hooks)", () => {
        given:
            var recorder = new Recorder();
            Mechanisms.addListener(recorder);
            Memento.doBefore(()=>{
                Mechanisms.fire(null,"before-undo")
            });
            Memento.doAfter(()=>{
                Mechanisms.fire(null,"after-undo")
            });
            var revertable = new ComplexRevertable("at start");
        when:
            revertable.setData("modified");
            Memento.undo();
        then:
            assert(recorder.logs.length).equalsTo(6);
            assert(recorder.logs[0]).equalsTo("memento-keep");
            assert(recorder.logs[1]).equalsTo("before-undo");
            assert(recorder.logs[2]).equalsTo("prepare-revert");
            assert(recorder.logs[3]).equalsTo("finalize-revert");
            assert(recorder.logs[4]).equalsTo("after-undo");
            assert(recorder.logs[5]).equalsTo("memento-undo");
    });

    it("Checks cancel (= undo that cannot be redoed)", () => {
        given:
            var recorder = new Recorder();
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            Memento.cancel();
        then:
            assert(revertable.data).equalsTo("at start");
        when:
            Memento.redo();
        then:
            assert(revertable.data).equalsTo("at start");
    });

    it("Checks clear (undo cancelled)", () => {
        given:
            var recorder = new Recorder();
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            Memento.clear();
        then:
            assert(revertable.data).equalsTo("modified");
    });

    it("Activate/deactivate Memento mechanisms", () => {
        given:
            var recorder = new Recorder();
            var revertable1 = new Revertable("at start");
            var revertable2 = new Revertable("at start");
        when: /* Memento mechanism activated here */
            revertable1.setData("modified 1");
            Memento.open();
            revertable2.setData("modified 1"); /* to make new transaction not empty */
            Memento.deactivate();
            revertable1.setData("modified 2"); /* No memento created for it ! */
        then:
            assert(revertable1.data).equalsTo("modified 2");
        when:
            Memento.activate();
            Memento.undo();
        then:
            assert(revertable1.data).equalsTo("modified 2"); /* No revert done for it ! */
            assert(revertable2.data).equalsTo("at start");
    });

    it("Checks undo/redo detection ('able' methods)", () => {
        given:
            var recorder = new Recorder();
            Mechanisms.addListener(recorder);
            var revertable = new Revertable("at start");
        then:
            assert(Memento.undoable()).isFalse();
            assert(Memento.redoable()).isFalse();
        when:
            revertable.setData("modified");
        then:
            assert(Memento.undoable()).isTrue();
            assert(Memento.redoable()).isFalse();
        when:
            Memento.undo();
        then:
            assert(Memento.undoable()).isFalse();
            assert(Memento.redoable()).isTrue();
        when:
            Memento.redo();
        then:
            assert(Memento.undoable()).isTrue();
            assert(Memento.redoable()).isFalse();
        when:
            Memento.cancel();
        then:
            assert(Memento.undoable()).isFalse();
            assert(Memento.redoable()).isFalse();
    });

    it("Checks that empty transactions are ignored when undo", () => {
        given:
            var recorder = new Recorder();
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            Memento.open();
            Memento.undo();
        then:
            assert(revertable.data).equalsTo("at start");
    });

    it("Checks that empty transactions are ignored when cancel", () => {
        given:
            var recorder = new Recorder();
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            Memento.open();
            Memento.cancel();
        then:
            assert(revertable.data).equalsTo("at start");
    });

    it("Checks that undo/redo may be invoked even if there is no transaction left", () => {
        given:
            var recorder = new Recorder();
            var revertable = new Revertable("at start");
        when:
            revertable.setData("modified");
            Memento.undo();
            Memento.undo();
        then:
            assert(revertable.data).equalsTo("at start");
        when:
            revertable.setData("modified");
            Memento.redo();
            Memento.redo();
        then:
            assert(revertable.data).equalsTo("modified");
    });

    it("Checks that redos are cancelled when something is modified", () => {
        given:
            var recorder = new Recorder();
            var revertable1 = new Revertable("at start");
            var revertable2 = new Revertable("at start");
        when:
            revertable1.setData("modified");
            Memento.undo();
            revertable2.setData("modified");
        then:
            assert(revertable1.data).equalsTo("at start");
            assert(revertable2.data).equalsTo("modified");
        when:
            Memento.redo();
        then: /* nothing happen... */
            assert(revertable1.data).equalsTo("at start");
            assert(revertable2.data).equalsTo("modified");
    });

    it("Creates and fill an AVL in the ascending direction", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL in the descending direction", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 6; i < 10; i++) {
            tree.insert(i);
        }
        for (let i = 0; i < 6; i++) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL so a left/right rotate is done", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 5; i >= 0; i--) {
            tree.insert(i);
        }
        for (let i = 9; i >= 6; i--) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL randomly", () => {
        let tree = new AVLTree((a, b) => a - b);
        tree.insert(5);
        tree.insert(8);
        tree.insert(2);
        tree.insert(3);
        tree.insert(0);
        tree.insert(7);
        tree.insert(6);
        tree.insert(9);
        tree.insert(1);
        tree.insert(4);
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Finds a value in AVL", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        for (let i = 0; i < 10; i++) {
            assert(tree.find(i)).equalsTo(i);
        }
    });

    it("Deletes values from an AVL", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        tree.delete(5);
        assert(tree.find(5)).equalsTo(null);
        assert(tree.find(8)).equalsTo(8);
        tree.delete(8);
        assert(tree.find(8)).equalsTo(null);
        assert(tree.find(2)).equalsTo(2);
        tree.delete(2);
        tree.delete(3);
        tree.delete(0);
        tree.delete(7);
        tree.delete(6);
        tree.delete(9);
        tree.delete(1);
        tree.delete(4);
        assert(tree.inside().next().done).equalsTo(true);
    });

    it("Deletes values from an AVL so adjustement is necessary", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i <= 25; i++) {
            tree.insert(i);
        }
        // rightRotate
        for (let i = 25; i >= 21; i--) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // leftRotate
        for (let i = 0; i < 4; i++) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // rightRightRotate + leftRotate
        for (let i = 9; i >=4; i--) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // leftLeftRotate + rightRotate
        for (let i = 15; i <=20; i++) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
        // Try to remove elements that are not present in the AVL
        tree.delete(9);
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
        tree.delete(15);
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
    });

    it("Iterates over a portion of an ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside(null, 4);
        for (let i of [0, 1, 2, 3, 4]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(4, null);
        for (let i of [4, 5, 6, 7, 8, 9]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, 6);
        for (let i of [3, 4, 5, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Iterates over a portion of an ALV when search values are not included in the ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i+=2) {
            tree.insert(i);
        }
        // Looks for elements at AVL start
        let it = tree.inside(null, 5);
        for (let i of [0, 2, 4]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(null, 5);
        for (let i of [0, 2, 4, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        // Looks for elements at AVL end
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, null);
        for (let i of [4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(3, null);
        for (let i of [2, 4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        // Looks for elements in the middle of the tree
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, 7);
        for (let i of [4, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(3, 7);
        for (let i of [2, 4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Check inconsistent iteration tries", () => {
        let tree = new AVLTree((a, b) => a - b);
        assert([...tree].length).equalsTo(0);
        // Looks for elements in an empty AVL
        let it = tree.inside(0, 10);
        assert(it.next().done).equalsTo(true);
        it = tree.including(0, 10);
        assert(it.next().done).equalsTo(true);

        for (let i = 0; i < 10; i+=2) {
            tree.insert(i);
        }
        // Start bound after AVL last element
        it = tree.inside(11, null);
        assert(it.next().done).equalsTo(true);
        // Unconsistent bounds
        it = tree.including(7, 3);
        assert(it.next().done).equalsTo(true);
    });

    it("Checks insertion of an already existing value in an AVL", () => {
        let tree = new AVLTree((a, b) => a.value - b.value);
        for (let i = 0; i < 10; i++) {
            tree.insert({value:i});
        }
        tree.insert({value:6, new:true});
        assert(tree.find({value:6}).new).equalsTo(true);
    });

    it("Checks uncommon (or false) usages of an ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside(6, 6);
        assert(it.next().value).equalsTo(6);
        assert(it.next().done).equalsTo(true);
        it = tree.inside(6, 3);
        assert(it.next().done).equalsTo(true);
    });

    it("Creates an AVL from an iterable (an array) and check tree as an iterator", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 8, 1, 9, 6, 4, 2, 5, 3, 7]);
        let values = [...tree];
        assert(values).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("Copies an AVL", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let values = [...new AVLTree(tree)];
        assert(values).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("Prints the content of an AVL", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let log = console.log;
        let line="";
        try {
            console.log = value=>line+=value+"\n";
            tree.print(elem => "" + elem._data);
            console.log = log;
            assert(line).equalsTo("0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n");
        }
        finally {
            console.log = log;
        }
    });

    it("Consumes the content of an AVL from both sides", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert(tree.pop()).equalsTo(9);
        assert(tree.shift()).equalsTo(0);
        assert(tree.size).equalsTo(8);
    });

    it("Retrieve an AVL list optimized for insertion", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let values = [...tree.forInsertList];
        assert(values).arrayEqualsTo([3, 1, 7, 0, 2, 5, 8, 4, 6, 9]);
    });

});