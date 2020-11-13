'use strict'

import {
    assert, describe, it, before
} from "../jstest/jtest.js";
import {
    Mechanisms,
    Memento
} from "../jslib/mechanisms.js";

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

});