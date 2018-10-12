/** 
 * Batcher index
 */

/* Requires ------------------------------------------------------------------*/

const q = require('./queue.js');
const l = require('./store.js');
const b = require('./breaker.js');
const { exp, contextKey, recordKey } = require('./utils.js');
const { randomBytes } = require('crypto');
const EventEmitter = require('events').EventEmitter;

/* Local variable ------------------------------------------------------------*/

const baseConfig = {
  batch: {
    tick: 50,
    max: 100,
  },
  retry: {
    base: 5,
    steps: 3,
    limit: 5000,
    curve: exp,
  },
  cache: {
    base: 1000,
    steps: 5,
    limit: 30000,
    curve: exp,
  },
  breaker: {
    base: 1000,
    steps: 10,
    limit: 0xffff,
    curve: exp,
  },
}

/* Methods -------------------------------------------------------------------*/

/**
 * Batcher constructor 
 * @class batcher
 */
function batcher(config = {}, emitter) {
  // Parameter validation
  if (typeof config.resolver !== 'function') {
    throw new Error(`config.resolver [${config.resolver}] is not a function`);
  }

  config.storeOptions = config.storeOptions || {};
  config.timeout = Number(config.timeout) || null; 
  config.storeOptions.pluginRecoveryDelay = Number(config.storeOptions.pluginRecoveryDelay) || 10000;
  config.storeOptions.pluginFallback = (config.storeOptions.pluginFallback === undefined) ? true : config.storeOptions.pluginFallback;
  config.storeOptions.memoryLimit = Math.max(0, Math.min(1, Number(config.storeOptions.memoryLimit) || 0.9));
  config.storeOptions.recordLimit = Number(config.storeOptions.recordLimit) || Infinity;

  if (config.batch !== null) config.batch = { ...baseConfig.batch, ...config.batch };
  if (config.retry !== null) config.retry = { ...baseConfig.retry, ...config.retry };
  if (config.cache !== null) config.cache = { ...baseConfig.cache, ...config.cache };
  if (config.breaker !== null) config.breaker = { ...baseConfig.breaker, ...config.breaker };

  if (emitter && !emitter.emit) {
    throw new Error(`${emitter} is not an EventEmitter`);
  }

  // Local variables
  const _emitter = emitter || new EventEmitter();
  _emitter.setMaxListeners && _emitter.setMaxListeners(Infinity);
  const _breaker = b(config, _emitter);

  const _queue = q(config, _emitter, l(config, _emitter), config.store, _breaker);

  /**
     * Gets a list of records from source
     * @param {string|number|array<string|number>} ids The id of the record to fetch
     * @param {object} params (Optional)The Request parameters
     * @returns {Promise} The eventual single record
     */
  function get(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const uid = randomBytes(8).toString('hex');
    const requestIds = (Array.isArray(ids)) ? ids : [ids];
    const promises = requestIds.map((id, i) => {
      return _queue.push(id, params, agg, (config.batch === null && i === requestIds.length -1), uid);
    });
    return Promise.all(promises)
      .then(response => (!Array.isArray(ids)) ? response[0] : response);
  }

  /**
     * Inserts results into cache manually
     * @param {*} items Raw results from a data-source to load into cache
     * @param {array<string|number>} ids The id(s) to extract from the raw dataset
     * @param {object} params (Optional)The Request parameters
     * @returns {Promise} The eventual single record
     */
  function set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(config.uniqueParams, params);
    return _queue.complete(key, ids, _queue.resolveContext(key, params), items);
  }

  /**
     * Clears one or more recors from temp store 
     * @param {string|number|array<string|number>} ids The id(s) to clear
     * @param {object} params (Optional) The Request parameters
     * @returns {boolean} The result of the clearing
     */
  function clear(ids, params) {
    if (Array.isArray(ids)) return ids.map(id => clear(id, params));
    return _queue.store.clear(recordKey(contextKey(config.uniqueParams, params), ids));
  }

  /**
     * Returns the amount of records and contexts in memory
     * @returns {object}
     */
  async function size() {
    return await {
      contexts: _queue.size(),
      records: await _queue.store.size(),
    }; 
  }

  return Object.assign(_emitter, {
    get,
    set,
    clear,
    size,
    config,
    breaker: { open: _breaker.openCircuit, close: _breaker.restoreCircuit },
    _queue
  });
}

/* Exports -------------------------------------------------------------------*/

module.exports = batcher;