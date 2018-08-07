/**
 * Record Store
 */

/* Requires ------------------------------------------------------------------*/

const { tween } = require('./utils.js');

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
    if (record) {
      if (record.value !== undefined && record.timer !== undefined) {
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
    const now = Date.now();
    const stepSize = curve(opts.step || 0);
    return keys.map((id) => {
      let value = { value: values[id] };
      if (opts && opts.step !== undefined) {
        value.timestamp = now;
        value.step = opts.step;
        value.timer = setTimeout(lru.bind(null, recordKey(id)), stepSize);
      }
      return store.set(recordKey(id), value);
    });
  }

  /**
   * Clears a specified computed key from the store
   * @param {string} key The key to search for
   * @returns {boolean} Wether the key was removed or not 
   */
  function clear(key) {
    return !!store.delete(key);
  }

  /**
   * Attempts to invalidate a key once it's cache step time expires
   * @param {string} key The key to be evaluated for invalidation
   */
  function lru(key) {
    const record = store.get(key);
    if (record) {
      if (record.value && record.timer) {
        const now = Date.now();
        if (record.step < config.cache.steps && record.bump === true) {
          record.step = record.step + 1;
          const ext = curve(record.step);
          emitter.emit('cacheBump', { key, timestamp: record.timestamp, step: record.step, expires: now + ext });
          clearTimeout(record.timer);
          record.timer = setTimeout(clear.bind(null, key), ext);
          record.bump = false;
        }
        else {
          emitter.emit('cacheClear', { key, timestamp: record.timestamp, step: record.step, expires: now });
          process.nextTick(clear.bind(null, key));
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
