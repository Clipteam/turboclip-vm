const { InputUtil, StatementUtil, CompiledInput } = require('../compiler');

/**
 * @returns {Object.<string, (util: StatementUtil) => void>}
 */
module.exports.getStatements = () => {
    return {
        
    };
};

/**
 * @returns {Object.<string, (util: InputUtil) => CompiledInput>}
 */
module.exports.getInputs = () => {
    return {
        math_angle: number,
        math_number: number,
        math_integer: number,
        math_positive_number: number,
        math_whole_number: number,
        text: text,
        colour_picker: colour,
    };
};

const number = /** @param {InputUtil} util */ (util) => {
    const NUM = util.fieldValueUnsafe('NUM');
    const number = Number(NUM);
    return util.number(number);
};

const text = /** @param {InputUtil} util */ (util) => {
    const TEXT = util.fieldValueUnsafe('TEXT');
    return util.string(`"${util.safe('' + TEXT)}"`);
};

const colour = /** @param {InputUtil} util */ (util) => {
    const COLOUR = util.fieldValueUnsafe('COLOUR');
    if (/^[0-9a-f]{6,8}$/.test(COLOUR)) {
        return util.number('0x' + COLOUR);
    }
    return util.fieldString('COLOUR');
};
