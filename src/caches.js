const {settleAndLog} = require('./utils');

function cachesConstructor(config, emitter) {
  const caches = isCacheEnabled() && config.stores.map(tier => tier.store(tier)) || [];
  const local = caches.find(cache => cache.local);
  const remotes = caches.filter(cache => !cache.local);

  function isCacheEnabled() {
    return config.cache !== null && config.cache !== false;
  }

  function getLocal(key) {
    return local && local.get(key);
  }

  function getMultiLocal(recordKey, keys) {
    return local && local.getMulti(recordKey, keys);
  }

  function get(key) {
    if (!isCacheEnabled()) return undefined;

    const localValue = getLocal(key);
    if (localValue !== undefined) {
      emitter.track('localCacheHit', 1);
      emitter.track('cacheHit', 1);
      return localValue;
    }

    return settleAndLog(remotes.map((remote) => remote.get(key)))
      .then((remoteValues) => {
        const responseValue = remoteValues.find(value => value !== undefined);
        if (responseValue !== undefined) {
          emitter.track('cacheHit', 1);
        }
        else {
          emitter.track('cacheMiss', 1);
        }
        return remoteValues.find((response) => response !== undefined);
      });
  }

  function getMulti(recordKey, keys) {
    if (!isCacheEnabled()) return Promise.resolve(Array.from(new Array(keys.length), () => undefined));

    const localValues = getMultiLocal(recordKey, keys);
    const foundLocally = localValues && localValues.filter(value => value !== undefined).length;
    if (foundLocally) {
      emitter.track('localCacheHit', foundLocally);
      emitter.track('cacheHit', foundLocally);
    }
    if (foundLocally && foundLocally === keys.length) {
      return Promise.resolve(localValues);
    }

    return settleAndLog(remotes.map((remote) => remote.getMulti(recordKey, keys)))
      .then((remoteValues) => {
        const responseValues = Object.assign(...remoteValues, localValues);
        const missingValues = responseValues.filter((value) => value === undefined);
        emitter.track('cacheHit', remoteValues.length - missingValues.length);
        emitter.track('cacheMiss', missingValues.length);
        return responseValues;
      });
  }

  function set(recordKey, keys, values) {
    local && local.set(recordKey, keys, values);
    return Promise.all(remotes.map((remote) => remote.set(recordKey, keys, values))).catch((err) => console.log('error writing', err));
  }

  function clear(key) {
    local && local.clear(key);
    remotes.forEach((remote) => remote.clear(key));
    return true;
  }

  function size() {
    if (!isCacheEnabled()) {
      return Promise.resolve({
        local: 0,
        remote: 0,
        status: 'disabled',
      });
    }

    return Promise.resolve(remotes[0] && remotes[0].size())
      .then((remoteItems) => {
        return {
          local: local && local.size(),
          remote: remoteItems || 0,
        }
      });
  }

  return {
    get,
    getLocal,
    getMulti,
    getMultiLocal,
    set,
    clear,
    size,
  };
}

module.exports = cachesConstructor;
