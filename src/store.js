/**
 * A-Store
 */

/* Methods -------------------------------------------------------------------*/

/**
 * Store constructor
 * @param {object} config The options for the store
 * @param {EventEmitter} emitter The event-emitter instance for the batcher
 */
function localStore(config, emitter) {
  const store = new Map();
  
  /**
   * Performs a query that returns a single entities to be cached
   * @param {object} opts The options for the dao
   * @param {string} method The dao method to call
   * @returns {Promise}
   */
  function get(key) {
    const record = store.get(key);
    if (record) {
      if (record.value && record.timer) {
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
  function set(key, value, opts) {
    if (opts && opts.ttl) {
      value.timestamp = Date.now();
      value.timer = setTimeout(() => lru(key), config.cache.step);
    }
    return store.set(key, value);
  }

  /**
   * Checks if a computed key is present in the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key is in the store or not 
   */
  function has(key) {
    return store.has(key);
  }

  /**
   * Clears a specified computed key from the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key was removed or not 
   */
  function clear(key) {
    return store.delete(key);
  }

  function lru(key) {
    const record = store.get(key);
    if (record) {
      if (record.value && record.timer) {
        const now = Date.now();
        if (now + config.cache.step <= record.timestamp + config.cache.ttl && record.bump === true) {
          emitter.emit('bumpCache', { key, timestamp: record.timestamp, expires: now + config.cache.step });
          clearTimeout(record.timer);
          value.timer = setTimeout(() => clear(key), config.cache.step);
          record.bump = false;
        }
        else {
          emitter.emit('clearCache', { key, timestamp: record.timestamp, expires: now });
          clear(key);
        }
      }
    }
  }

  return { get, set, has, clear };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
