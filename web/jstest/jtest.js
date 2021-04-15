'use strict';

/**
 * Assertion Exception when a test failed
 */
export class AssertionFailed {
    constructor(...args) {
        this._args = args;
    }

    get args() {
        return this._args;
    }
}

/**
 * Assertion exception when a test crashes
 */
export class AssertionError {
    constructor(message) {
        this._message = message;
    }

    toString() {
        return this._message;
    }
}

let NUMBER_MARGIN = 0.0001;
export class Assertor {

    constructor(value) {
        this._value = value;
    }

    _is(modelClass, value) {
        if (!(value instanceof modelClass)) {
            throw new AssertionFailed(value, " is not an instance of ", modelClass);
        }
    }

    _isEqual(model, value) {
        if (typeof(model)==="number" && typeof(value)==="number") {
            if (value<model-NUMBER_MARGIN || value>model+NUMBER_MARGIN) {
                return false;
            }
        } else if (model!==value) {
            return false;
        }
        return true;
    }

    _equals(model, value) {
        if (!this._isEqual(model, value)) {
            throw new AssertionFailed(value, " is not equal to ", model);
        }
    }

    _notEquals(model, value) {
        if (this._isEqual(model, value)) {
            throw new AssertionFailed(value, " is equal to ", model);
        }
    }

    _contains(model, value) {
        if (!value || value.indexOf(model)===-1) {
            throw new AssertionFailed(value, " does not contain ", model);
        }
    }

    _notContains(model, value) {
        if (value && value.indexOf(model)!==-1) {
            throw new AssertionFailed(value, " contains ", model);
        }
    }

    _arrayContains(model, values) {
        if (values) {
            for (let value of values) {
                if (value.indexOf(model) !== -1) return;
            }
        }
        throw new AssertionFailed(values, " does not contain ", model);
    }

    _arrayNotContains(model, values) {
        if (values) {
            for (let value of values) {
                if (value.indexOf(model) !== -1) {
                    throw new AssertionFailed(values, " contains ", model);
                }
            }
        }
    }

    _setContains(model, values) {
        if (values) {
            for (let value of values) {
                if (value.has(model)) return;
            }
        }
        throw new AssertionFailed(values, " does not contain ", model);
    }

    _setNotContains(model, values) {
        if (values) {
            for (let value of values) {
                if (value.has(model)) {
                    throw new AssertionFailed(values, " contains ", model);
                }
            }
        }
    }

    _arrayIsEqual(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(model, " is not an array.");
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(value, " is not an array.");
        }
        if (value.length!=model.length) {
            return false;
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                if (!this._arrayIsEqual(model[index], value[index])) return false;
            }
            else {
                if (!this._isEqual(model[index], value[index])) return false;
            }
        }
        return true;
    }

    _arrayEquals(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(model, " is not an array.");
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(value, " is not an array.");
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(value, " is not equal to ", model);
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                this._arrayEquals(model[index], value[index]);
            }
            else {
                this._equals(model[index], value[index]);
            }
        }
    }

    _unorderedArrayEquals(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(model, " is not an array.");
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(value, " is not an array.");
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(value, " is not equal to ", model);
        }
        for (let item of value) {
            let found = false;
            for (let modelItem of model) {
                if (this._isAnyEqual(modelItem, item)) found = true;
            }
            if (!found) {
                throw new AssertionFailed(model, " does not contain ", item);
            }
        }
    }

    _isAnyEqual(model, value) {
        if (model && (model instanceof Array)) {
            if (!this._arrayIsEqual(model, value)) return false;
        }
        else if (model && (model.constructor === Object)) {
            if (!this._objectIsEqual(model, value)) return false;
        }
        else {
            if (!this._isEqual(model, value)) return false;
        }
        return true;
    }

    _objectIsEqual(model, value) {
        for (let key in model) {
            if (!this._isAnyEqual(model[key], value[key])) return false;
        }
        return true;
    }

    _objectEquals(model, value) {
        for (let key in model) {
            if (model[key] && (model[key] instanceof Array)) {
                this._arrayEquals(model[index], value[index]);
            }
            else if (model[key] && (model[key].constructor === Object)) {
                this._objectEquals(model[key], value[key]);
            }
            else {
                this._equals(model[key], value[key]);
            }
        }
    }

    _setEquals(model, value) {
        if (!model || !(model instanceof Set)) {
            throw new AssertionError(`${model} is not a set.`);
        }
        if (!value || !(value instanceof Set)) {
            throw new AssertionError(`${value} is not a set.`);
        }
        if (value.size!=model.size) {
            throw new AssertionFailed(value, " is not equal to ", model);
        }
        for (let modelElement of model) {
            if (!value.has(modelElement)) {
                throw new AssertionFailed(model, " does not contain ", value);
            }
        }
    }

    _arraySame(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(model, " is not an array.");
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(value, " is not an array.");
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(value, " is not equal to ", model);
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                this._arraySame(model[index], value[index]);
            }
            else {
                this._same(model[index], value[index]);
            }
        }
    }

    _same(model, object) {
        if (model === object) return;
        if (model===null || model===undefined || object===null || object===undefined) {
            throw new AssertionFailed(object, " is not equal to ", model);
        }
        if (typeof(model)==='object' || typeof(object)==='object') {
            if (model.constructor !== object.constructor) {
                throw new AssertionFailed(object, " and ", model, " are not of same type.");
            }
            if (model instanceof Array) {
                this._arraySame(model, object);
            }
            else {
                let modelPropNames = Object.getOwnPropertyNames(model);
                for (let propName of modelPropNames) {
                    let modelValue = model[propName];
                    let objectValue = object[propName];
                    this._same(modelValue, objectValue);
                }
            }
        }
        else {
            this._equals(model, object);
        }
    }

    fail() {
        try {
            this._value();
        }
        catch(exception) {
            return;
        }
        throw new AssertionError("No exception thrown");
    }

    is(modelClass) {
        this._is(modelClass, this._value);
        return this;
    }

    sameTo(model) {
        this._same(model, this._value);
        return this;
    }

    equalsTo(model) {
        this._equals(model, this._value);
        return this;
    }

    notEqualsTo(model) {
        this._notEquals(model, this._value);
        return this;
    }

    isDefined() {
        if (this._value===null || this._value===undefined) {
            throw new AssertionFailed("Not defined.");
        }
        return this;
    }

    isNotDefined() {
        if (this._value!==null && this._value!==undefined) {
            throw new AssertionFailed("Defined.");
        }
        return this;
    }

    isTrue() {
        if (!this._value) {
            throw new AssertionFailed("Not true.");
        }
        return this;
    }

    isFalse() {
        if (this._value) {
            throw new AssertionFailed("Not false.");
        }
        return this;
    }

    contains(model) {
        this._contains(model, this._value);
        return this;
    }

    notContains(model) {
        this._notContains(model, this._value);
        return this;
    }

    arrayContains(model) {
        this._arrayContains(model, this._value);
        return this;
    }

    arrayNotContains(model) {
        this._arrayNotContains(model, this._value);
        return this;
    }

    arrayEqualsTo(model) {
        this._arrayEquals(model, this._value);
        return this;
    }

    setContains(model) {
        this._setContains(model, this._value);
        return this;
    }

    setNotContains(model) {
        this._setNotContains(model, this._value);
        return this;
    }

    setEqualsTo(model) {
        this._setEquals(model, this._value);
        return this;
    }

    unorderedArrayEqualsTo(model) {
        this._unorderedArrayEquals(model, this._value);
        return this;
    }

    objectEqualsTo(model) {
        this._objectEquals(model, this._value);
        return this;
    }

    unorderedEqualsTo(model) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        let value = [...this._value];
        this._setEquals(new Set(model), new Set(this._value));
        return this;
    }

    hasContent(...elements) {
        if (this._value.length!==elements.length) {
            throw new AssertionFailed(this.value, " has not same length than ", elements);
        }
        for (let index=0; index<elements.length; index++) {
            if (this._value[index]!==elements[index]) {
                throw new AssertionFailed(this.value[index], " is not equal to ", elements[index]);
            }
        }
        return this;
    }

}

export function assert(value) {
    return new Assertor(value);
}

let _itCount = 0;
let _itFailed = 0;
let _testSuite;
let _startTime = new Date().getTime();
let _suites = [];

function executeNextSuite(suite) {
    let next = suite ? _suites.indexOf(suite)+1 : 0;
    if (next<_suites.length) {
        _suites[next]._execute();
    }
    else {
        console.log(`${_itCount} tests executed. ${_itCount-_itFailed} passed. ${_itFailed} failed. ${new Date().getTime() - _startTime} ms `);
    }
}

export class TestSuite {

    constructor(title) {
        this._title = title;
        _testSuite = this;
        this._befores = [];
        this._afters = [];
        this._its = [];
        this._index=0;
        _suites.push(this);
    }

    _before(before) {
        this._befores.push(before);
    }

    _after(after) {
        this._afters.push(after);
    }

    _it(caseTitle, testCase) {
        this._its.push({_caseTitle:caseTitle, _testCase:testCase});
        return this;
    }

    _executeIt() {
        function _done() {
            for (let after of this._afters) {
                after();
            }
            this._processSuccess();
            this._index++;
            this._executeIt();
        }

        while (this._index<this._its.length) {
            try {
                _itCount++;
                this._clearTimeouts();
                this._timeoutsID = 0;
                setTimeout = (action, delay, ...args)=> {
                    let token = this._timeoutsID++;
                    this._timeouts.push({_delay:delay, _action:action, _args:args, _token:token});
                    return token;
                };
                clearTimeout = (token)=> {
                    this._timeouts = this._timeouts.filter(timeout=> timeout._token != token);
                }
                for (let before of this._befores) {
                    before();
                }
                if (this._its[this._index]._testCase.length===0) {
                    this._its[this._index]._testCase();
                    this._executeTimeouts();
                    for (let after of this._afters) {
                        after();
                    }
                    this._processSuccess();
                    this._index++;
                }
                else {
                    this._its[this._index]._testCase(_done.bind(this));
                }
            }
            catch (exception) {
                for (let after of this._afters) {
                    after();
                }
                this._processException(exception);
                this._index++;
            }
        }
        executeNextSuite(this);
    }

    _execute() {
        _testSuite = this;
        console.log(this._title);
        this._executeIt(0);
    }

    _processException(exception) {
        let time = new Date().getTime() - _startTime;
        if (exception && (exception instanceof AssertionFailed)) {
            console.log(`- ${this._its[this._index]._caseTitle} -> FAILED (${time}): `, ...exception.args);
        }
        else {
            console.log(`- ${this._its[this._index]._caseTitle} -> ERROR (${time}): ${exception}`);
        }
        _itFailed ++;
    }

    _processSuccess() {
        let time = new Date().getTime() - _startTime;
        console.log(`- ${this._its[this._index]._caseTitle} -> OK (${time})`);
    }

    _executeTimeouts() {
        this._timeouts.sort((timeout1, timeout2)=>timeout1.delay-timeout2.delay);
        let timeouts = [...this._timeouts];
        this._timeouts = [];
        for (let timeout of timeouts) {
            timeout._action(...timeout._args);
        }
    }

    _clearTimeouts() {
        this._timeouts = [];
    }

}

export function defer(func, delay) {
    setTimeout(()=>{
        try {
            func();
        }
        catch (exception) {
            _testSuite._processException(exception);
            _testSuite._index++;
            _testSuite._executeIt();
        }
    }, delay)
}

export function describe(title, procedure) {
    _testSuite = new TestSuite(title);
    procedure.call(_testSuite);
}

export function before(before) {
    _testSuite._before(before);
}

export function after(after) {
    _testSuite._after(after);
}

export function it(caseTitle, testCase) {
    _testSuite._it(caseTitle, testCase);
}

export function result() {
    executeNextSuite();
}

export function executeTimeouts() {
    _testSuite._executeTimeouts();
}

