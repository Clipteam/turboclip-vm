const Thread = require('../engine/thread');
const Timer = require('../util/timer');

var jump = (id) => {
    immediate = thread.jumps[id];
};

var jumpLazy = (id) => {
    if (thread.warp) {
        jump(id);
    } else {
        thread.fn = thread.jumps[id];
    }
};

var call = (procedureCode, args, resume) => {
    thread.callStack.push(thread.call);
    thread.call = {
        args,
        resume,
    };
    // TODO: check recursion
    const procedure = thread.procedures[procedureCode];
    if (procedure.warp || thread.warp) {
        thread.warp++;
    }
    jump(procedure.label);
};

var end = () => {
    if (thread.callStack.length) {
        jump(thread.call.resume);
        if (thread.warp) {
            thread.warp--;
        }
        thread.call = thread.callStack.pop();
    } else {
        retire();
    }
};

var retire = () => {
    thread.target.runtime.sequencer.retireThread(thread);
};

/**
 * Scratch cast to number.
 * Similar to Cast.toNumber()
 * @param {*} value The value to cast
 * @returns {number}
 */
const toNumber = (value) => {
    // The only falsey values that Number can return is 0 and NaN, both of which are treated as 0.
    return Number(value) || 0;
};

/**
 * Convert a number to something other than NaN.
 * @param {number} number The value to convert.
 * @returns {number}
 */
const toNotNaN = (number) => {
    return number || 0;
};

/**
 * Scratch cast to boolean.
 * Similar to Cast.toBoolean()
 * @param {*} value The value to cast
 * @returns {boolean}
 */
const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value === '' || value === '0' || value.toLowerCase() === 'false') {
            return false;
        }
        return true;
    }
    return Boolean(value);
};

/**
 * Scratch cast to string.
 * Similar to Cast.toString()
 * @param {*} value The value to cast
 * @returns {string}
 */
const toString = (value) => {
    return '' + value;
};

/**
 * Check if a value is considered whitespace.
 * Similar to Cast.isWhiteSpace()
 * @param {*} val Value to check
 * @returns {boolean}
 */
const isWhiteSpace = (val) => {
    return val === null || (typeof val === 'string' && val.trim().length === 0);
}

/**
 * Compare two values using Scratch casting.
 * Similar to Cast.compare()
 * @param {*} v1 First value to compare.
 * @param {*} v2 Second value to compare.
 * @returns {number} Negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
const compare = (v1, v2) => {
    let n1 = Number(v1);
    let n2 = Number(v2);
    if (n1 === 0 && isWhiteSpace(v1)) {
        n1 = NaN;
    } else if (n2 === 0 && isWhiteSpace(v2)) {
        n2 = NaN;
    }
    if (isNaN(n1) || isNaN(n2)) {
        const s1 = String(v1).toLowerCase();
        const s2 = String(v2).toLowerCase();
        if (s1 < s2) {
            return -1;
        } else if (s1 > s2) {
            return 1;
        }
        return 0;
    }
    if (
        (n1 === Infinity && n2 === Infinity) ||
        (n1 === -Infinity && n2 === -Infinity)
    ) {
        return 0;
    }
    return n1 - n2;
};

const ioQuery = (runtime, device, func, args) => {
    // We will assume that the device always exists.
    const devObject = runtime.ioDevices[device];
    return devObject[func].apply(devObject, args);
};

/**
 * Create and start a timer.
 */
const timer = () => {
    const timer = new Timer();
    timer.start();
    return timer;
};

/**
 * Convert a Scratch list index to a JavaScript list index.
 * "all" is not considered as a list index.
 * Similar to Cast.toListIndex()
 * @param {number} index Scratch list index.
 * @param {number} length Length of the list.
 * @returns {number} 0 based list index, or -1 if invalid.
 */
var toListIndex = (index, length) => {
    if (typeof index !== 'number') {
        if (index === 'last') {
            if (length > 0) {
                return length;
            }
            return -1;
        } else if (index === 'random' || index === 'any') {
            if (length > 0) {
                return 1 + Math.floor(Math.random() * length);
            }
            return -1;
        }
    }
    index = Math.floor(toNumber(index));
    if (index < 1 || index > length) {
        return -1;
    }
    return index - 1;
};

const getListItem = (list, idx) => {
    const index = toListIndex(idx, list.value.length);
    if (index === -1) {
        return '';
    }
    return list.value[index];
};

var replaceItemOfList = (list, idx, value) => {
    const index = toListIndex(idx, list.value.length);
    if (index === -1) {
        return;
    }
    list.value[index] = value;
    list._monitorUpToDate = false;
};

var insertAtList = (list, idx, value) => {
    const index = toListIndex(idx, list.value.length + 1);
    if (index === -1) {
        return;
    }
    list.value.splice(index - 1, 0, value);
    list._monitorUpToDate = false;
};

var deleteOfList = (list, idx) => {
    if (idx === 'all') {
        list.value = [];
        return;
    }
    const index = toListIndex(idx, list.value.length);
    if (index === -1) {
        return;
    }
    list.value.splice(index - 1, 1);
    list._monitorUpToDate = false;
};

var mod = (n, modulus) => {
    let result = n % modulus;
    if (result / modulus < 0) result += modulus;
    return result;
};

/**
 * If set, the executor will immediately start executing this function when the current function returns.
 * @type {Function}
 */
var immediate;
/**
 * The currently running thread.
 * @type {Thread}
 */
var thread;
/**
 * The target of the current thread.
 * @type {Target}
 */
var target;

/**
 * Step a compiled thread.
 * @param {Thread} _thread 
 */
const execute = (_thread) => {
    thread = _thread;
    target = thread.target;

    _thread.fn();

    while (immediate) {
        var fn = immediate;
        immediate = null;
        fn();
    }
};

const evalCompiledScript = (compiler, _source) => {
    // Cache some of the data that the script will need to execute.
    const runtime = compiler.target.runtime;
    const stage = runtime.getTargetForStage();

    // no reason to access compiler anymore
    compiler = null;

    // eval will grab references to all variables in this context
    return eval(_source);
};

var createContinuation = (compiler, source) => {
    // TODO: optimize, refactor
    // TODO: support more than just "} else {"
    // TODO: this is something that definitely deserves unit tests
    var result = '(function continuation() {\n';
    var brackets = 0;
    var delBrackets = 0;
    var shouldDelete = false;
    var here = 0;
    var length = source.length;
    while (here < length) {
        var i = source.indexOf('{', here);
        var j = source.indexOf('}', here);
        var k = source.indexOf('return;', here);
        if (k === -1) k = length;
        if (i === -1 && j === -1) {
            if (!shouldDelete) {
                result += source.slice(here, k);
            }
            break;
        }
        if (i === -1) i = length;
        if (j === -1) j = length;
        if (shouldDelete) {
            if (i < j) {
                delBrackets++;
                here = i + 1;
            } else {
                delBrackets--;
                if (!delBrackets) {
                    shouldDelete = false;
                }
                here = j + 1;
            }
        } else {
            if (brackets === 0 && k < i && k < j) {
                result += source.slice(here, k);
                break;
            }
            if (i < j) {
                result += source.slice(here, i + 1);
                brackets++;
                here = i + 1;
            } else {
                result += source.slice(here, j);
                here = j + 1;
                if (source.substr(j, 8) === '} else {') {
                    if (brackets > 0) {
                        result += '} else {';
                        here = j + 8;
                    } else {
                        shouldDelete = true;
                        delBrackets = 0;
                    }
                } else {
                    if (brackets > 0) {
                        result += '}';
                        brackets--;
                    }
                }
            }
        }
    }
    result += '})';
    return evalCompiledScript(compiler, result);
};

execute.createContinuation = createContinuation;

module.exports = execute;
