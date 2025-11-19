import { settleAndLog } from './utils';

export default function cachesConstructor(config, emitter) {
  const local = config.caches?.find(cache => cache.local);
  const remotes = config.caches?.filter(cache => !cache.local);

  function getLocal(key) {
    return local && local.get(key);
  }

  function getMultiLocal(recordKey, keys) {
    return local && local.getMulti(recordKey, keys);
  }

  function get(key) {
    if (!config.caches?.length) return undefined;

    const localValue = getLocal(key);
    if (localValue !== undefined) {
      emitter.emit('localCacheHit', 1);
      emitter.emit('cacheHit', 1);
      return localValue;
    }

    return settleAndLog(remotes.map(remote => remote.get(key)))
      .then((remoteValues) => {
        const responseValue = remoteValues.find(value => value !== undefined);
        if (responseValue !== undefined) {
          emitter.emit('cacheHit', 1);
        }
        else {
          emitter.emit('cacheMiss', 1);
        }
        return remoteValues.find(response => response !== undefined);
      });
  }

  function getMulti(recordKey, keys) {
    if (!config.caches?.length) return Promise.resolve(Array.from(new Array(keys.length), () => undefined));

    const localValues = getMultiLocal(recordKey, keys);
    const foundLocally = localValues && localValues.filter(value => value !== undefined).length;
    if (foundLocally) {
      emitter.emit('localCacheHit', foundLocally);
      emitter.emit('cacheHit', foundLocally);
    }
    if (foundLocally && foundLocally === keys.length) {
      return Promise.resolve(localValues);
    }

    return settleAndLog(remotes.map(remote => remote.getMulti(recordKey, keys)))
      .then((remoteValues) => {
        const responseValues = Object.assign(...remoteValues, localValues).map(value => (value === null || value === undefined) ? undefined : JSON.parse(value));
        const foundRemotely = remoteValues.filter(value => value !== undefined);
        const missingValues = responseValues.filter(value => value === undefined);
        emitter.emit('cacheHit', foundRemotely.length);
        emitter.emit('cacheMiss', missingValues.length);
        return responseValues;
      });
  }

  function set(recordKey, keys, values) {
    if (local) local.set(recordKey, keys, values);
    return Promise.all(remotes.map(remote => remote.set(recordKey, keys, values))).catch(err => console.log('error writing', err));
  }

  function clear(key) {
    if (local) local.clear(key);
    remotes.forEach(remote => remote.clear(key));
    return true;
  }

  function size() {
    if (!config.caches?.length) {
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
        };
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
