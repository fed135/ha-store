import { EventEmitter } from 'node:events';
import queue from './buffer.js';
import _caches from './caches.js';
import { contextKey, recordKey, contextRecordKey } from './utils.js';
import { hydrateConfig } from './options.js';

import inMemory from './stores/in-memory.js';
import redis from './stores/redis.js';

import pgResolver from './resolvers/postgres.js';

// Type definitions
export type DelimiterKeys<T extends readonly string[]> = T[number];

export type ParamsFromDelimiters<D extends readonly string[] | undefined>
  = D extends readonly string[]
    ? { [K in DelimiterKeys<D>]?: string } & { [key: string]: string | undefined }
    : { [key: string]: string | undefined };

export type Params = {
  [key: string]: string | undefined
};

export type RequestIds = string[];

export interface HACacheStore {
  get<Response>(key: string): Response | Promise<Response>
  getMulti<Response>(recordKey: (contextKey: string) => string, keys: RequestIds): Response[] | Promise<Response[]>
  set<DataType>(recordKey: (contextKey: string) => string, keys: RequestIds, values: DataType): boolean
  clear(key: '*' | string): boolean
  size(): number
  connection?: any
  local?: boolean
}

export interface InMemoryCacheOptions {
  limit?: number
  ttl?: number
}

export interface RedisCacheOptions {
  keyspace?: string
  host?: string
  port?: number
  path?: string
  connection?: any
  ttl?: number
}

export interface PostgresResolverOptions {
  db: any
  table: string
  identifier: string
}

export interface HAStoreConfig<D extends readonly string[] | undefined = undefined> {
  resolver<Response>(
    ids: string[],
    params?: ParamsFromDelimiters<D>
  ): Promise<{ [id: string]: Response }> | { [id: string]: Response }

  resolver<Response, Context>(
    ids: string[],
    params?: ParamsFromDelimiters<D>,
    context?: Context
  ): Promise<{ [id: string]: Response }> | { [id: string]: Response }

  delimiter?: D

  caches?: HACacheStore[]

  batch?: {
    delay?: number
    limit?: number
  } | null
}

export type QueryEvent = {
  key: string
  uid: string
  size: number
  params: any
  contexts?: any[]
  ids?: string[]
  cause?: 'limit' | 'timeout'
  error?: Error
};

export interface HAStore<D extends readonly string[] | undefined = undefined> {
  get<Response>(
    id: string,
    params?: ParamsFromDelimiters<D>
  ): Promise<Response>

  get<Response, Context>(
    id: string,
    params?: ParamsFromDelimiters<D>,
    context?: Context
  ): Promise<Response>

  getMany<Response>(
    ids: string[],
    params?: ParamsFromDelimiters<D>
  ): Promise<{ [id: string]: { status: string, value?: Response, reason?: any } }>

  getMany<Response, Context>(
    ids: string[],
    params?: ParamsFromDelimiters<D>,
    context?: Context
  ): Promise<{ [id: string]: { status: string, value?: Response, reason?: any } }>

  set(
    items: { [id: string]: any },
    ids: string[],
    params?: ParamsFromDelimiters<D>
  ): boolean

  clear(
    ids: '*' | string | string[],
    params?: ParamsFromDelimiters<D>
  ): void

  size(): Promise<{ pendingBuffers: number, activeBuffers: number, records: number }>

  getStorageKey(
    id: string,
    params?: ParamsFromDelimiters<D>
  ): string

  on(
    event: 'cacheHit' | 'cacheMiss' | 'localCacheHit' | 'coalescedHit',
    callback: (_: number) => any
  ): void

  on(
    event: 'query' | 'queryFailed' | 'querySuccess',
    callback: (_: QueryEvent) => any
  ): void

  once(
    event: 'cacheHit' | 'cacheMiss' | 'localCacheHit' | 'coalescedHit'
  ): Promise<number>

  once(
    event: 'query' | 'queryFailed' | 'querySuccess'
  ): Promise<QueryEvent>

  config: Readonly<HAStoreConfig<D>>
}

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

export default config => new HaStore(config);

export const caches: {
  inMemory: (config?: InMemoryCacheOptions) => HACacheStore
  redis: (config?: RedisCacheOptions) => HACacheStore
} = {
  inMemory: inMemory as (config?: InMemoryCacheOptions) => HACacheStore,
  redis: redis as (config?: RedisCacheOptions) => HACacheStore,
};

export const resolvers: {
  postgres: <Response>(options: PostgresResolverOptions) => (ids: string[], params?: Params) => Promise<{ [id: string]: Response }>
} = {
  postgres: pgResolver,
};
