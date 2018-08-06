/** 
 * Batcher index
 */

/* Requires ------------------------------------------------------------------*/

const q = require('./queue.js');
const l = require('./store.js');
const b = require('./breaker.js');
const { exp, contextKey, recordKey } = require('./utils.js');
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
        steps: 0xffff,
        limit: 0xffffff,
        curve: exp,
    }
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

    if (config.batch !== null) config.batch = { ...baseConfig.batch, ...config.batch };
    if (config.retry !== null) config.retry = { ...baseConfig.retry, ...config.retry };
    if (config.cache !== null) config.cache = { ...baseConfig.cache, ...config.cache };
    if (config.breaker !== null) config.breaker = { ...baseConfig.breaker, ...config.breaker };

    if (emitter && !emitter.emit) {
        throw new Error(`${emitter} is not an EventEmitter`);
    }

    // Local variables
    const _emitter = emitter || new EventEmitter();
    const _store = (config.store || l)(config, _emitter);
    const _breaker = b(config, emitter);
    const _queue = q(config, _emitter, _store, _breaker);

    /**
     * Gets a list of records from source
     * @param {string|number|array<string|number>} ids The id of the record to fetch
     * @param {object} params (Optional)The Request parameters
     * @returns {Promise} The eventual single record
     */
    function get(ids, params = {}) {
        const requestIds = (Array.isArray(ids)) ? ids : [ids];
        const promises = requestIds.map((id, i) => {
            return _queue.push(id, params, (config.batch === null && i === requestIds.length -1));
        });
        return Promise.all(promises)
            .then(response => (!Array.isArray(ids)) ? response[0] : response)
            .catch(err => console.log); // TODO remove
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
        return _store.clear(recordKey(contextKey(config.uniqueParams, params), ids));
    }

    /**
     * Returns the amount of records and contexts in memory
     * @returns {object}
     */
    async function size() {
        return await {
            contexts: _queue.size(),
            records: await _store.size(),
        }; 
    }

    return Object.assign(_emitter, { get, set, clear, size, config, _queue, _store });
}

/* Exports -------------------------------------------------------------------*/

module.exports = batcher;