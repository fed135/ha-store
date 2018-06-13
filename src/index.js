/** 
 * Batcher index
 */

/* Requires ------------------------------------------------------------------*/

const q = require('./queue');
const { requiredParam } = require('./utils');
const EventEmitter = require('events').EventEmitter;

/* Local variable ------------------------------------------------------------*/

const baseConfig = {
    batch: {
        tick: 50,
        limit: 100,
    },
    retry: {
        limit: 3,
        scale: 2.5,
        base: 5,
    },
    cache: {
        step: 1000,
        ttl: 30000,
    },
}

/* Methods -------------------------------------------------------------------*/

/**
 * Batcher constructor 
 * @class batcher
 */
function batcher(config = {
    getter: requiredParam('getter', '<object>{ method: <function(ids, params)>, responseParser: <function(response, requestedIds)> }'),
    uniqueOptions: [],
    cache: baseConfig.cache,
    batch: baseConfig.batch,
    retry: baseConfig.retry,
}, emitter) {
    // Local variables
    const _emitter = emitter || new EventEmitter();
    const _queue = q(config, _emitter, config.store);

    // Parameter validation
    if (config.batch !== null && config.batch !== false) {
        if (typeof config.batch !== 'object') config.batch = {};
        config.batch = Object.assign({}, baseConfig.batch, config.batch);
    }

    if (config.retry !== null && config.retry !== false) {
        if (typeof config.retry !== 'object') config.retry = {};
        config.retry = Object.assign({}, baseConfig.retry, config.retry);
    }

    if (config.cache !== null && config.cache !== false) {
        if (typeof config.cache !== 'object') config.cache = {};
        config.cache = Object.assign({}, baseConfig.cache, config.cache);
    }

    if (emitter && !emitter.emit) {
        throw new Error(`${emitter} is not an Event Emitter`);
    }

    /**
     * Gets a list of records from source
     * @param {string|number|array<string|number>} ids The id of the record to fetch
     * @param {object} params (Optional)The Request parameters
     * @returns {Promise} The eventual single record
     */
    function get(ids, params = {}) {
        if (!config.batch) {
            return _queue.skip(ids, params)
                .then((results) => {
                    if (!Array.isArray(ids) && Array.isArray(results)) return results[0];
                    return results;
                });
        }
        if (Array.isArray(ids)) return Promise.all(ids.map(id => get(id, params)));
        return _queue.add(ids, params);
    }

    /**
     * Inserts results into cache manually
     * @param {*} items Raw results from a data-source to load into cache
     * @param {array<string|number>} ids The id(s) to extract from the raw dataset
     * @param {object} params (Optional)The Request parameters
     * @returns {Promise} The eventual single record
     */
    function set(items, ids, params = {}) {
        if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ')
        return _queue.complete(_queue.contextKey(params), ids, params, items);
    }

    /**
     * Checks if one or more recors are present in temp store 
     * @param {string|number|array<string|number>} ids The id(s) to lookup
     * @param {object} params (Optional) The Request parameters
     * @returns {boolean} If all records requested are in temp store
     */
    function has(ids, params) {
        if (Array.isArray(ids)) return ids.every(id => has(id, params));
        return _queue.has(ids, params);
    }

    /**
     * Clears one or more recors from temp store 
     * @param {string|number|array<string|number>} ids The id(s) to clear
     * @param {object} params (Optional) The Request parameters
     * @returns {boolean} The result of the clearing
     */
    function clear(ids, params) {
        if (Array.isArray(ids)) return ids.map(id => clear(id, params));
        return _queue.clear(ids, params);
    }

    /**
     * Returns the amount of records and contexts in memory
     * @returns {object}
     */
    function size() {
        return _queue.size();
    }

    return Object.assign(_emitter, { get, set, has, clear, size, config, _queue });
}

/* Exports -------------------------------------------------------------------*/

module.exports = batcher;