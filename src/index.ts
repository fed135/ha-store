import { EventEmitter } from 'node:events';
import queue from './buffer.ts';
import _caches from './caches.ts';
import { contextKey, recordKey, contextRecordKey } from './utils.ts';
import { hydrateConfig } from './options.ts';

import inMemory from './stores/in-memory.ts';
import redis from './stores/redis.ts';

import pgResolver from './resolvers/postgres.ts';
import sqliteResolver from './resolvers/sqlite.ts';

class HaStore extends EventEmitter {
  config: any;
  _store: any;
  _queue: any;

  constructor(initialConfig) {
    super();

    this.config = hydrateConfig(initialConfig);

    this._store = _caches(this.config, this);

    this._queue = queue(
      this.config,
      this,
      this._store,
    );
  }

  get(id, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this._queue.getHandles(key, [id], params, agg)
      .then(handles => handles[0]);
  }

  getMany(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this._queue.getHandles(key, ids, params, agg)
      .then(handles => Promise.allSettled(handles)
        .then(outcomes => ids.reduce((handles, id, index) => {
          handles[id] = outcomes[index];
          return handles;
        }, {})));
  }

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.delimiter, params);
    return this._store.set(contextRecordKey(key), ids, items);
  }

  clear(ids, params) {
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this._store.clear(ids, params);
  }

  size() {
    return this._store.size()
      .then(records => ({
        ...this._queue.size(),
        records,
      }));
  }

  getStorageKey(id, params) {
    return recordKey(contextKey(this.config.delimiter, params), id);
  }
}

export default (config: HAStoreConfig) => new HaStore(config);

export const caches = {
  inMemory: inMemory,
  redis: redis,
};

export const resolvers = {
  postgres: pgResolver,
  sqlite: sqliteResolver,
};
