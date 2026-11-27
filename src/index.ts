import QueryBuffer from './buffer.ts';
import Caches from './caches.ts';
import { contextKey, recordKey, contextRecordKey, Signal, type StoreSignals } from './utils.ts';
import { hydrateConfig, type HydratedConfig } from './options.ts';

import inMemory from './stores/in-memory.ts';
import redis from './stores/redis.ts';

import pgResolver from './resolvers/postgres.ts';
import sqliteResolver from './resolvers/sqlite.ts';

class HaStore implements StoreSignals {
  readonly config: HydratedConfig;

  readonly cacheHit = new Signal<[number]>();
  readonly cacheMiss = new Signal<[number]>();
  readonly localCacheHit = new Signal<[number]>();
  readonly coalescedHit = new Signal<[number]>();
  readonly query = new Signal<[QueryEvent]>();
  readonly queryFailed = new Signal<[QueryEvent]>();
  readonly querySuccess = new Signal<[QueryEvent]>();

  #caches: Caches;
  #queue: QueryBuffer;

  constructor(initialConfig: HAStoreConfig) {
    this.config = hydrateConfig(initialConfig);
    this.#caches = new Caches(this.config, this);
    this.#queue = new QueryBuffer(this.config, this, this.#caches);
  }

  get(id, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this.#queue.getHandles(key, [id], params, agg)
      .then(handles => handles[0]);
  }

  getMany(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this.#queue.getHandles(key, ids, params, agg)
      .then(handles => Promise.allSettled(handles)
        .then(outcomes => ids.reduce((handles, id, index) => {
          handles[id] = outcomes[index];
          return handles;
        }, {})));
  }

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.delimiter, params);
    return this.#caches.set(contextRecordKey(key), ids, items);
  }

  clear(ids, params) {
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this.#caches.clear(ids);
  }

  size() {
    return this.#caches.size()
      .then(records => ({
        ...this.#queue.size(),
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
