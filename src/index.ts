import { EventEmitter } from 'node:events';
import queue from './buffer';
import _caches from './caches';
import { contextKey, recordKey, contextRecordKey } from './utils';
import { hydrateConfig } from './options';

import inMemory from './stores/in-memory';

import pgResolver from './resolvers/postgres';

class HaStore extends EventEmitter {
  constructor(initialConfig = {}) {
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

export default config => new HaStore(config);

export const caches = {
  inMemory,
};

export const resolvers = {
  postgres: pgResolver,
};
