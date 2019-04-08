import { EventEmitter } from 'events'

type GenericCurveConfig = {
  base?: number
  steps?: number
  limit?: number
  curve? (progress: number, start: number, end: number): number
}

type Params = {
  [key: string]: string
}

type RequestIds = string | number | string[] | number[]

declare interface BatcherConfig {
  resolver(ids: RequestIds, params?: Params, batchData?: any): Promise<any>
  uniqueOptions?: string[]
  responseParser?(
    response: any,
    requestedIds: string[] | number[],
    params?: Params
  ): any
  cache?: {
    limit?: number
    ttl?: number
  }
  batch?: {
    tick?: number
    max?: number
  }
  retry?: GenericCurveConfig
}

declare function batcher(config: BatcherConfig, emitter: EventEmitter): {
  get(ids: string | number, params?: Params): Promise<any>
  set(items: any, ids: string[] | number[], params?: Params): Promise<any>
  clear(ids: RequestIds, params?: Params): void
  size(): Object
  getKey(id: string | number, params?: Params): string
}
