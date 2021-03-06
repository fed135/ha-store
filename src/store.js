const lruNative = require('lru-native2');

/* Methods -------------------------------------------------------------------*/

function localStore(config) {
  const store = new lruNative({
    maxElements: config.cache.limit,
    maxAge: config.cache.ttl,
    size: Math.min(Math.ceil(config.cache.limit / 10), 1000),
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
    return store.remove(key);
  }

  function size() {
    return store.size();
  }

  return { get, getMulti, set, clear, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
