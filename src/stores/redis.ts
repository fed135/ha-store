import { createRequire } from 'node:module';

const DEFAULT_TTL = 0; // Disabled

export default function RedisCache({ keyspace, host, path, port, connection, ttl }: any = {}) {
  let instance = connection;

  if (!instance) {
    if (!host && !path && !port) throw new Error('Missing redis connection options (`host`, `path`, `port`)');
    try {
      const require = createRequire(import.meta.url);
      instance = require('redis').createClient({ socket: { host, path, port } });
    }
    catch (e) {
      throw e;
    }
  }
  if (!instance.isOpen) instance.connect();

  function get(key) {
    return instance.get(`${keyspace}:${key}`).then(val => typeof val === 'string' ? JSON.parse(val) : val);
  }

  function getMulti(recordKey, keys) {
    return instance.mGet(keys.map(id => `${keyspace}:${recordKey(id)}`)).then(result => result?.map(val => typeof val === 'string' ? JSON.parse(val) : val));
  }

  function set(recordKey, keys, values) {
    const b = instance.multi();

    keys.forEach((id) => {
      b.set(`${keyspace}:${recordKey(id)}`, JSON.stringify(values[id]), 'PX', ttl || DEFAULT_TTL);
    });
    return b.exec();
  }

  function disconnect() {
    instance?.quit?.();
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
    disconnect,
  };
}
