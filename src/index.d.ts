import { EventEmitter } from 'events'

type Params = {
  [key: string]: string
}

export interface HAExternalStore {
  get<Response>(key: string): Promise<Response>
  getMulti<Response>(recordKey: (contextKey: string) => string, keys: RequestIds): Promise<Response[]>
  set<DataType>(recordKey: (contextKey: string) => string, keys: RequestIds, values: DataType): boolean
  clear(key?: string): boolean
  size(): number
  connection?: any
}

export interface HAStoreConfig {
  resolver<Response>(ids: string[], params?: Params): Promise<{ [id: string]: Response }>
  resolver<Response, Context>(ids: string[], params?: Params, context?: Context): Promise<{ [id: string]: Response }>
  delimiter?: string[]
  cache?: {
    limit?: number
    ttl?: number
  }
  batch?: {
    delay?: number
    limit?: number
  },
  store?: HAExternalStore
}

export interface HAStore extends EventEmitter {
  get<Response>(id: string, params?: Params): Promise<Response>
  get<Response, Context>(id: string, params?: Params, context?: Context): Promise<Response>
  getMany<Response>(id: string[], params?: Params): Promise<{status: string, value: Response}[]>
  getMany<Response, Context>(id: string[], params?: Params, context?: Context): Promise<{status: string, value: Response}[]>
  set(items: { [id: string]: any }, ids: string[], params?: Params): boolean
  clear(ids: string[], params?: Params): void
  size(): { contexts: number, queries: number, records: number }
  getStorageKey(id: string, params?: Params): string
}

export default function batcher(config: HAStoreConfig, emitter?: EventEmitter): HAStore
