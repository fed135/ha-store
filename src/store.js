/**
 * Record Store
 */

'use strict';

/* Requires ------------------------------------------------------------------*/

const lruNative = require('lru-native2');

/* Methods -------------------------------------------------------------------*/

/**
 * Store constructor
 * @param {object} config The options for the store
 * @param {EventEmitter} emitter The event-emitter instance for the batcher
 */
function localStore(config, emitter) {
  const store = new lruNative({
    maxElements: config.cache.limit,
    maxAge: config.cache.ttl,
    size: Math.min(Math.ceil(config.cache.limit / 10), 1000),
  });

  /**
   * Performs a query that returns a single entities to be cached
   * @param {string} key the key of the record to get from store
   * @returns {*}
   */
  function get(key) {
    return store.get(key);
  }

  /**
   * Performs a query that returns a single entities to be cached
   * @param {object} opts The options for the dao
   * @param {string} method The dao method to call
   * @returns {undefined}
   */
  function set(recordKey, keys, values) {
    for (let i = 0; i < keys.length; i++) {
      store.set(recordKey(keys[i]), values[keys[i]]);
    }
  }

  /**
   * Clears a specified computed key from the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key was removed or not 
   */
  function clear(key) {
    if (key === '*') {
      store.clear();
      return true;
    }
    return store.remove(key);
  }

  /**
   * The number of active records
   * @returns {number} The number of active records
   */
  async function size() {
    return store.size();
  }

  return { get, set, clear, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
