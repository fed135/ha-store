/**
 * Utilities
 */

/* Methods -------------------------------------------------------------------*/

function requiredParam(param, def = '{}') {
    const requiredParamError = new Error(`Parameter "${param}" is missing.\nExpected\n\t${param}: ${def}`);

    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(requiredParamError, requiredParam);
    }

    throw requiredParamError;
}

/* Exports -------------------------------------------------------------------*/

module.exports = { requiredParam };
