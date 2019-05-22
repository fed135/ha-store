/**
 * Utilities
 */

'use strict';

/* Methods -------------------------------------------------------------------*/

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
  return Array.isArray(results)
   ? arrayParser(results, ids, params)
   : objectParser(results, ids, params);
}

/**
 * Parses the results from the data-source query
 * @param {array} results The raw results
 * @param {array} ids The list of ids to look for in the response
 * @param {*} params The original parameters of the query
 * @returns {object} The indexed result set found
 */
function arrayParser(results, ids, params = {}) {
  return results.reduce((acc, curr) => {
    if (!curr || !curr.id) return acc;
    if (ids.includes(`${curr.id}`)) {
      acc[curr.id] = curr;
    }
    return acc;
  }, {});
}

/**
 * Parses the results from the data-source query
 * @param {object} results The raw results
 * @param {array} ids The list of ids to look for in the response
 * @param {*} params The original parameters of the query
 * @returns {object} The indexed result set found
 */
function objectParser(results, ids, params = {}) {
  const acc = {};
  for (let key in results) {
    if (ids.includes(key) && results[key] !== null && results[key] !== undefined) {
      acc[key] = results[key];
    }
  }
  return acc;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function contextKey(u, params = {}) {
  return Array.from(u || []).map(opt => `${opt}=${JSON.stringify(params[opt])}`).join(';');
}

function recordKey(context, id) {
  return `${context}::${id}`;
}

const contextRecordKey = key => id => recordKey(key, id);

/* Exports -------------------------------------------------------------------*/

module.exports = { deferred, basicParser, contextKey, recordKey, contextRecordKey };
