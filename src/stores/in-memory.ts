import { LRUCache } from 'lru-cache';

const DEFAULT_LIMIT = 5000;
const DEFAULT_TTL = 1000 * 60 * 60 * 2; // 2 hours

export default function inMemory(config = {}) {
  const store = new LRUCache({
    max: config.limit || DEFAULT_LIMIT,
    ttl: config.ttl || DEFAULT_TTL,
  });

  function get(key) {
    return store.get(key);
  }

  function getMulti(recordKey, keys) {
    return keys.map((id) => {
      if (id === undefined) return undefined;
      return store.get(recordKey(id));
    });
  }

  function set(recordKey, keys, values) {
    for (let i = 0; i < keys.length; i++) {
      if (values[keys[i]] !== undefined && values[keys[i]] !== null) {
        store.set(recordKey(keys[i]), values[keys[i]]);
      }
    }
    return true;
  }

  function clear(key) {
    if (key === '*') {
      store.clear();
      return true;
    }
    return store.delete(key);
  }

  function size() {
    return store.size;
  }

  function _debug() {
    return store.dump();
  }

  return { get, getMulti, set, clear, size, local: true, _debug };
}
