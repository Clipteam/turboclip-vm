const { InputUtil, StatementUtil, CompiledInput } = require('../compiler');

/**
 * @returns {Object.<string, (util: StatementUtil) => void>}
 */
module.exports.getStatements = () => {
    return {
        motion_gotoxy: goToXY,
    };
};

/**
 * @returns {Object.<string, (util: InputUtil) => CompiledInput>}
 */
module.exports.getInputs = () => {
    return {

    };
};

const goToXY = /** @param {StatementUtil} util */ (util) => {
    const X = util.input('X');
    const Y = util.input('Y');
    util.writeLn(`target.setXY(${X.asNumber()}, ${Y.asNumber()});`);
};
