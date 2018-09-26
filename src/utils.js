/**
 * Utilities
 */

/* Methods -------------------------------------------------------------------*/

/**
 * Returns value for an exponential curve
 * @param {number} progress The p value for the curve
 * @param {number} start The start value for the curve
 * @param {number} end The end value for the curve
 * @returns {number} The exponential value
 */
function exp(progress, start, end) {
  return start + (end - start) * (progress * progress);
}

/**
 * Returns a curve object based on the common curve options
 * @param {object} opts The config for the curve (base, limit, step, curve)
 * @returns {object} The curve object
 */
function tween(opts) {
  let step = 0;

  return function _tweenStep(progress) {
    if (progress === undefined) step++;
    return (opts.curve || exp)(Math.min(1, ((progress === undefined) ? step : progress / (opts.steps || 1))), opts.base, opts.limit);
  };
}

/**
 * Parses the results from the data-source query
 * @param {*} results The raw results
 * @param {array} ids The list of ids to look for in the response
 * @param {*} params The original parameters of the query
 * @returns {object} The indexed result set found
 */
function basicParser(results, ids, params = {}) {
  if (results === null || results === undefined) return {};
  ids = ids.map(id => `${id}`);
  if (Array.isArray(results)) {
    return results.reduce((acc, curr) => {
      if (ids.includes(`${curr.id}`)) {
        acc[curr.id] = curr;
      }
      return acc;
    }, {});
  }
  const keys = Object.keys(results).map(id => `${id}`);
  return keys.reduce((acc, curr) => {
    if (ids.includes(curr)) {
      acc[curr] = results[curr];
    }
    return acc;
  }, {});
}

/**
 * Deferred promise helper
 * @returns {object} A deferred promise handler 
 */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/**
 * Returns a context key based on query parameters
 * @param {array} u The list of uniqueness identifying parameters for the query 
 * @param {*} params The parameters for the query
 * @returns {string} The context key
 */
function contextKey(u, params) {
  return Array.from(u || []).map(opt => `${opt}=${JSON.stringify(params[opt])}`).join(';');
}

/**
 * Returns a record key based on a context key and an id
 * @param {*} context The context key
 * @param {*} id The id
 * @returns {string} The record key
 */
function recordKey(context, id) {
  return `${context}::${id}`;
}

/* Exports -------------------------------------------------------------------*/

module.exports = { deferred, exp, tween, basicParser, contextKey, recordKey };
