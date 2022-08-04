const lru = require('lru-cache');

function localStore(config) {
  const store = new lru({
    max: config.limit,
    ttl: config.ttl,
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

module.exports = localStore;
