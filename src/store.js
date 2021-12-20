const lru = require('lru-cache');

/* Methods -------------------------------------------------------------------*/

function localStore(config) {
  const store = new lru({
    max: config.cache.limit,
    maxAge: config.cache.ttl,
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
      store.reset();
      return true;
    }
    return store.del(key);
  }

  function size() {
    return store.itemCount;
  }

  return { get, getMulti, set, clear, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = localStore;
