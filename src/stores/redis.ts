import { createClient } from 'redis';

const DEFAULT_TTL = 0; // Disabled

export default function RedisCache({ keyspace, host, path, port, connection, ttl } = {}) {
  const instance = connection || createClient({ socket: { host, path, port } });
  instance.connect();

  function get(key) {
    return instance.get(`${keyspace}:${key}`);
  }

  function getMulti(recordKey, keys) {
    return instance.mGet(keys.map(id => `${keyspace}:${recordKey(id)}`));
  }

  function set(recordKey, keys, values) {
    const b = instance.multi();

    keys.forEach((id) => {
      b.set(`${keyspace}:${recordKey(id)}`, JSON.stringify(values[id]), 'PX', ttl || DEFAULT_TTL);
    });
    return b.exec();
  }

  function clear(key) {
    if (key === '*') return instance.sendCommand(['FLUSHDB']);
    return instance.del(`${keyspace}:${key}`);
  }

  function size() {
    return instance.sendCommand(['DBSIZE']);
  }

  return {
    get,
    getMulti,
    set,
    clear,
    size,
    store: instance,
    local: false,
  };
}
