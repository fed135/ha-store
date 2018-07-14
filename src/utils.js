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

function exp(progress, start, end) {
    return start + (end - start) * (progress * progress);
}

function tween(opts) {
    let step = 0;

    return function step(progress) {
        if (progress === undefined) step++;
        return exp(Math.min(1, ((progress === undefined) ? step : progress / opts.steps)), opts.base, opts.limit);
    };
}

function basicParser(results, ids, params) {
    if (Array.isArray(results)) {
      return results.reduce((acc, curr) => {
        if (ids.includes(curr.id)) {
          acc[curr.id] = curr;
        }
        return acc;
      }, {});
    }
    return {};
  }

/* Exports -------------------------------------------------------------------*/

module.exports = { requiredParam, exp, tween, basicParser };
