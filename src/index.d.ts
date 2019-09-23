import { EventEmitter } from 'events'

type Params = {
  [key: string]: string
}

type RequestIds = string | number | string[] | number[]
type Serializable = string | number | boolean | { [key: string]: Serializable } | Array<Serializable>

export type HAExternalStore = {
  get: (key: string) => Promise<Serializable>
  getMulti: (recordKey: (contextKey: string) => string, keys: RequestIds) => Promise<Serializable[]>
  set: (recordKey: (contextKey: string) => string, keys: RequestIds, values: Serializable) => Promise<Serializable>
  clear: (key?: string) => boolean
  size: () => number
  connection?: any
}

export interface HAStoreConfig {
  resolver(ids: RequestIds, params?: Params, context?: Serializable): Promise<Serializable>
  uniqueOptions?: string[]
  responseParser?(
    response: Serializable,
    requestedIds: string[] | number[],
    params?: Params
  ): object
  cache?: {
    limit?: number
    ttl?: number
  }
  batch?: {
    tick?: number
    max?: number
  },
  store: HAExternalStore
}

export type HAStore = {
  get(ids: string | number, params?: Params): Promise<Serializable>
  set(items: Serializable, ids: string[] | number[], params?: Params): Promise<Serializable>
  clear(ids: RequestIds, params?: Params): void
  size(): { contexts: number, queries: number, records: number }
  getKey(id: string | number, params?: Params): string
} & EventEmitter

export default function batcher(config: HAStoreConfig, emitter?: EventEmitter): HAStore
