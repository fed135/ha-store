/**
 * Record Store
 */

'use strict';

/* Methods -------------------------------------------------------------------*/

/**
 * Store constructor
 * @param {object} config The options for the store
 * @param {EventEmitter} emitter The event-emitter instance for the batcher
 * @param {Object} store A store instance to replace the default in-memory Dictionary
 */
function localStore(config, emitter, store) {
  // config: { ttl, limit }
  store = store || {};
  let storeSize = 0;
  let totalHits = 0;
  let totalMisses = 0;
  let topHitter = 0;
  let head = null;
  let tail = null;
  let now = Date.now();

  setInterval(() => now = Date.now(), 100);

  function get(key) {
    const record = store[key];
    if (record !== undefined) {
      totalHits++;
      if (record.hits + 1 > topHitter) topHitter = record.hits;
      clear(key);
      if (record.timestamp + config.cache.ttl > now) set(key, record.value, record.timestamp, record.hits + 1);
    }
    else totalMisses++;
    return record;
  }

  function batchSet(recordKey, keys, values) {
    for (let i = 0; i < keys.length; i++) {
      set(recordKey(keys[i]), values[keys[i]]);
    }
  }

  function set(key, value, timestamp, hits) {
    timestamp = timestamp || now;

    if (checkEfficiency()) {
      if (storeSize + 1 > config.cache.limit) {
        clear(store[tail].key);
      }
      // Records = {value, timestamp, hits, head, tail}

      let record = {
        key,
        value,
        timestamp,
        hits: hits || 0,
        head: null,
        tail: head
      };
      store[key] = record;
      if (head) store[head].head = key;
      head = key;
      storeSize++;
    }
  }

  function checkEfficiency() {
    // Check for stagnancy
    if (totalMisses >= totalHits) {
      totalMisses = 0;
      return true;
    }
    // Generates a 0-1 number indicating current efficiency.
    const storageEfficiency = ((totalHits / storeSize || 1) / config.cache.limit - topHitter);
    return !!(Math.random() > storageEfficiency);
  }

  function clear(key) {
    if (key === '*') {
      totalHits = 0;
      storeSize = 0;
      store = {};
      return true;
    }
    const record = store[key];
    if (record !== undefined) {
      if (record.head) store[record.head].tail = record.tail;
      if (record.key === head) head = store[record.tail].key;
      if (record.hits === topHitter) {
        if (record.tail) topHitter = store[record.tail].hits;
        else if (record.head) topHitter = store[record.head].hits;
        else topHitter = 0;
      }
      if (record.tail) store[record.tail].head = record.head;
      totalHits -= record.hits;
      storeSize--;
      delete store[key];
    }
  }

  function size() {
    return storeSize;
  }

  return { get, set, clear, batchSet, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
