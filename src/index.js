/** 
 * Batcher index
 */

/* Requires ------------------------------------------------------------------*/

const abatch = require('./queue');
const { requiredParam } = require('./utils');
const EventEmitter = require('events').EventEmitter;

/* Methods -------------------------------------------------------------------*/

/**
 * Batcher constructor 
 * @class batcher
 */
function batcher(config = {
    getter: requiredParam('getter', '<object>{ method: <function(ids, params)>, responseParser: <function(response, requestedIds)> }'),
    uniqueOptions = [],
    cache = {
        enabled: true,
        step: 1000,
        ttl: 10000,
    },
    batch = {
        enabled: false,
        tick: 40,
        limit: 100,
    },
    retry = {
        enabled: true,
        max: 3,
        scale: {
            mult: 2.5,
            base: 5,
        }
    }
}) {
    // Local variables
    const emitter = new EventEmitter();
    const queue = abatch(config, emitter);

    if (config.batch.enabled === true) _checkGetterConfig('many');

    /**
     * Gets a single record from source
     * @param {string|number} id The id of the record to fetch
     * @param {object} params (Optional) The Request parameters
     * @param {object} overrides (Optional) Batcher options for this call
     * @returns {Promise} The eventual single record
     */
    function one(id, params = {}, overrides = {}) {
        let method = queue.add;
        if (overrides.batch === false || config.batch.enabled === false) {
            method = queue.skip;
        }

        return method(id, params);
    }

    /**
     * Gets a list of records from source
     * @param {array<string|number>} ids The id of the record to fetch
     * @param {object} params (Optional)The Request parameters
     * @param {object} overrides (Optional) Batcher options for this call
     * @returns {Promise} The eventual single record
     */
    function many(ids, params = {}, overrides = {}) {
        return Promise.all(ids.map(id => one(id, params, overrides)));
    }

    /**
     * Checks if one or more recors are present in temp store 
     * @param {string|number|array<string|number>} ids The id(s) to lookup
     * @param {object} params (Optional) The Request parameters
     * @returns {boolean} If all records requested are in temp store
     */
    function has(ids, params) {
        if (Array.isArray(ids)) return ids.every(id => has(id, params));
        return queue.store.has(queue.store.key(ids, params));
    }

    /**
     * Clears one or more recors from temp store 
     * @param {string|number|array<string|number>} ids The id(s) to clear
     * @param {object} params (Optional) The Request parameters
     * @returns {boolean} The result of the clearing
     */
    function clear(ids, params) {
        if (Array.isArray(ids)) return ids.map(id => clear(id, params));
        return queue.store.clear(queue.store.key(ids, params));
    }

    return Object.assign({ one, many, has, clear }, emitter);
}

/* Exports -------------------------------------------------------------------*/

module.exports = batcher;