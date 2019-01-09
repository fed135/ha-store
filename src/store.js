/**
 * Record Store
 */

/* Requires ------------------------------------------------------------------*/

const { tween } = require('./utils.js');

/* Server variables ----------------------------------------------------------*/

let memoryLimit = 1;
let currentMemory = 0;

if (typeof window === 'undefined') {
  memoryLimit = require('v8').getHeapStatistics().total_available_size;
  currentMemory = 0;

  function checkMemory() {
    setTimeout(checkMemory, 1000);
    currentMemory = process.memoryUsage().rss;
  }

  checkMemory();
}

/* Methods -------------------------------------------------------------------*/

/**
 * Store constructor
 * @param {object} config The options for the store
 * @param {EventEmitter} emitter The event-emitter instance for the batcher
 * @param {Map} store A store instance to replace the default in-memory Map
 */
function localStore(config, emitter, store) {
  store = store || new Map();
  const curve = tween(config.cache);
  
  /**
   * Performs a query that returns a single entities to be cached
   * @param {string} key the key of the record to get from store
   * @returns {Promise}
   */
  function get(key) {
    const record = store.get(key);
    if (record !== undefined) {
      if (record.value !== undefined && record.timer !== null) {
        record.bump = true;
      }
    }
    return Promise.resolve(record);
  }

  /**
   * Performs a query that returns a single entities to be cached
   * @param {object} opts The options for the dao
   * @param {string} method The dao method to call
   * @returns {Promise}
   */
  function set(recordKey, keys, values, opts={}) {
    if (currentMemory / memoryLimit > config.storeOptions.memoryLimit) {
      emitter.emit('cacheFull', { reason: 'Out of memory', current: currentMemory, limit: memoryLimit * config.storeOptions.memoryLimit });
      return null;
    }
    const now = Date.now();
    const stepSize = curve(opts.step || 0);
    const storeSize = size();
    for (let i = 0; i < keys.length; i++) {
      if (storeSize + i + 1 > config.storeOptions.recordLimit) {
        emitter.emit('cacheFull', { reason: 'Too many records', current: config.storeOptions.recordLimit, limit: config.storeOptions.recordLimit });
        continue;
      }
      let value = {
        value: values[keys[i]],
        timestamp: null,
        step: null,
        timer: null,
        bump: null,
      };
      const key = recordKey(keys[i]);
      if (opts && opts.step !== undefined) {
        value.timestamp = now;
        value.step = opts.step;
        value.timer = setTimeout(() => lru(key), stepSize);
      }
      store.set(key, value);
    }
  }

  /**
   * Clears a specified computed key from the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key was removed or not 
   */
  function clear(key) {
    if (key === '*') return !!store.clear();
    return !!store.delete(key);
  }

  /**
   * Attempts to invalidate a key once it's cache step time expires
   * @param {string} key The key to be evaluated for invalidation
   */
  function lru(key) {
    const record = store.get(key);
    if (record !== undefined) {
      if (record.value && record.timer) {
        const now = record.timestamp + curve(record.step);
        if (record.step < config.cache.steps && record.bump === true) {
          record.step = record.step + 1;
          const ext = curve(record.step);
          const ttl = Math.min(record.timestamp + ext, record.timestamp + config.cache.limit);
          emitter.emit('cacheBump', { key, timestamp: record.timestamp, step: record.step, expires: ttl });
          clearTimeout(record.timer);
          record.timer = setTimeout(() => clear(key), ttl - now);
          record.bump = false;
        }
        else {
          emitter.emit('cacheClear', { key, timestamp: record.timestamp, step: record.step, expires: now });
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
    return store.size;
  }

  return { get, set, clear, lru, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
