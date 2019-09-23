import { EventEmitter } from 'events'

type Params = {
  [key: string]: string
}

type RequestIds = string | number | string[] | number[]
type Serializable = string | number | boolean | { [key: string]: Serializable } | Array<Serializable>

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
  }
}

export type HAStore = {
  get(ids: string | number, params?: Params): Promise<any>
  set(items: Serializable, ids: string[] | number[], params?: Params): Promise<any>
  clear(ids: RequestIds, params?: Params): void
  size(): { contexts: number, queries: number, records: number }
  getKey(id: string | number, params?: Params): string
} & EventEmitter

export default function batcher(config: HAStoreConfig, emitter?: EventEmitter): HAStore
