import { EventEmitter } from 'events'

export type CacheConfig = {
    limit?: number
    ttl?: number
}

export type BatchConfig = {
    tick?: number
    max?: number
}

export type Params = {
  [key: string]: string
}

export type RequestIds = string | number | string[] | number[]

export type HaStoreConfig = {
  resolver(ids: RequestIds, params?: Params, batchData?: any): Promise<any>
  uniqueOptions?: string[]
  responseParser?(
    response: any,
    requestedIds: string[] | number[],
    params?: Params
  ): any
  cache?: CacheConfig
  batch?: BatchConfig
}
