import { EventEmitter } from 'events'

type GenericCurveConfig = {
  base: number
  steps: number
  limit: number
  curve (progress: number, start: number, end: number): number
}

type BreakerCurveConfig = {
  base: number
  steps: number
  limit: number
  curve (progress: number, start: number, end: number): number
  tolerance: number
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
  cache?: GenericCurveConfig
  batch?: {
    tick: number,
    max: number
  }
  retry?: GenericCurveConfig
  breaker?: GenericCurveConfig
  store?: any
  storePluginFallback?: boolean
  storePluginRecoveryDelay?: number
}

declare function batcher(BatcherConfig, emitter: EventEmitter): {
  get(ids: string | number, params?: Params): Promise<any>
  set(items: any, ids: string[] | number[], params?: Params): Promise<any>
  clear(ids: RequestIds, params?: Params): void
  size(): Object
}
