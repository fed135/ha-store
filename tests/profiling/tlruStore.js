const LRUMap = require('caching-map');

function LRUStore(config, emitter) {
    const store = new LRUMap(config.storeOptions.recordLimit);

    function get(key) {
        return store.get(key);
    }

    function set(recordKey, keys, values, opts={}) {
        for (let i = 0; i < keys.length; i++) {
            store.set(recordKey(keys[i]), { value: values[keys[i]] }, { ttl: config.cache.limit });
        }
    }

    function clear(key) {
        if (key === '*') return store.clear();
        store.delete(key);
    }

    async function size() {
        return store && store.size;
    }

    return { get, set, clear, size };
}

module.exports = LRUStore;
