/**
 * Record Store
 */

'use strict';

/* Requires ------------------------------------------------------------------*/

const { tween } = require('./utils.js');

/* Methods -------------------------------------------------------------------*/

/**
 * Store constructor
 * @param {object} config The options for the store
 * @param {EventEmitter} emitter The event-emitter instance for the batcher
 * @param {Object} store A store instance to replace the default in-memory Dictionary
 */
function localStore(config, emitter, store) {
  store = store || {};
  let storeSize = 0;
  let totalTTL = 0;
  const curve = tween(config.cache);
  
  function garbageCollect(bucket) {
    setTimeout(garbageCollect, config.storeOptions.scavengeCycle);
    const now = Date.now();
    for (const key in store) {
      if (store[key].ttl <= now) checkExpiration(key);
    }
  }

  /**
   * Performs a query that returns a single entities to be cached
   * @param {string} key the key of the record to get from store
   * @returns {Promise}
   */
  function get(key) {
    const record = store[key];
    if (record !== undefined) {
      if (record.value !== undefined && record.ttl > 0) {
        record.bump = true;
      }
    }
    return record;
  }

  /**
   * Performs a query that returns a single entities to be cached
   * @param {object} opts The options for the dao
   * @param {string} method The dao method to call
   * @returns {Promise}
   */
  function set(recordKey, keys, values, opts={}) {
    const now = Date.now();
    const stepSize = Math.round(curve(opts.step || 0));
    for (let i = 0; i < keys.length; i++) {
      if (storeSize + 1 > config.storeOptions.recordLimit) {
        emitter.emit('cacheSkip', { omitted: { key: recordKey(keys[i]), value: values[keys[i]] }, reason: 'Too many records' });
        continue;
      }
      const storageEfficiency = ((totalTTL / storeSize || 1) / config.cache.limit); // Generates a 0-1 number indicating current efficiency.
      if (Math.random() < storageEfficiency * config.storeOptions.dropFactor) {
        emitter.emit('cacheSkip', { omitted: { key: recordKey(keys[i]), value: values[keys[i]] }, reason: 'Efficiency capped' });
        continue;
      }
      let value = {
        value: values[keys[i]],
        timestamp: null,
        step: null,
        ttl: 0,
        bump: null,
      };
      totalTTL += stepSize;
      const key = recordKey(keys[i]);
      if (opts && opts.step !== undefined) {
        value.timestamp = now;
        value.step = opts.step;
        value.ttl = now + stepSize;
      }
      storeSize++;
      store[key] = value;
    }
  }

  /**
   * Clears a specified computed key from the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key was removed or not 
   */
  function clear(key) {
    if (key === '*') {
      totalTTL = 0;
      storeSize = 0;
      store = {};
      return true;
    }
    const record = store[key];
    if (record !== undefined) {
      storeSize--;
      totalTTL -= curve(record.step);
      delete store[key];
      return true;
    }
    return false;
  }

  /**
   * Attempts to invalidate a key once it's cache step time expires
   * @param {string} key The key to be evaluated for invalidation
   */
  function checkExpiration(key) {
    const record = store[key];
    if (record !== undefined) {
      if (record.value && record.ttl > 0) {
        const now = Math.round(record.timestamp + curve(record.step));
        if (record.step < config.cache.steps && record.bump === true) {
          record.step = record.step + 1;
          const ext = Math.round(curve(record.step));
          const ttl = Math.min(record.timestamp + ext, record.timestamp + config.cache.limit);
          emitter.emit('cacheBump', { key, value: record.value, timestamp: record.timestamp, step: record.step, expires: ttl });
          record.ttl = ttl;
          totalTTL += ext;
          record.bump = false;
        }
        else {
          emitter.emit('cacheClear', { key, value: record.value, timestamp: record.timestamp, step: record.step, expires: now });
          clear(key);
        }
      }
    }
  }

  /**
   * The number of active records
   * @returns {number} The number of active records
   */
  async function size() {
    return storeSize;
  }

  setTimeout(garbageCollect, config.storeOptions.scavengeCycle);

  return { get, set, clear, checkExpiration, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;