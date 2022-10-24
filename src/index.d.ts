type Params = {
  [key: string]: string
}

export interface HAExternalStore {
  get<Response>(key: string): Promise<Response>
  getMulti<Response>(recordKey: (contextKey: string) => string, keys: RequestIds): Promise<Response[]>
  set<DataType>(recordKey: (contextKey: string) => string, keys: RequestIds, values: DataType): boolean
  clear(key: '*' | string): boolean
  size(): number
  connection?: any
}

export interface HAStoreConfig {
  resolver<Response>(ids: string[], params?: Params): Promise<{ [id: string]: Response }>
  resolver<Response, Context>(ids: string[], params?: Params, context?: Context): Promise<{ [id: string]: Response }>
  delimiter?: string[]
  cache?: {
    enabled: boolean
    tiers: {
      store: HAExternalStore
      limit?: number
      ttl?: number
    }
  }
  batch?: {
    enabled: boolean
    delay?: number
    limit?: number
  }
}

type QueryEvent = {
  key: string
  uid: string
  size: number
  params: any
  error?: Error
}

export interface HAStore {
  get<Response>(id: string, params?: Params): Promise<Response>
  get<Response, Context>(id: string, params?: Params, context?: Context): Promise<Response>
  getMany<Response>(id: string[], params?: Params): Promise<{status: string, value: Response}[]>
  getMany<Response, Context>(id: string[], params?: Params, context?: Context): Promise<{status: string, value: Response}[]>
  set(items: { [id: string]: any }, ids: string[], params?: Params): boolean
  clear(ids: '*' | string | string[], params?: Params): void
  size(): { pendingBuffers: number, activeBuffers: number, records: number }
  getStorageKey(id: string, params?: Params): string
  on(event: 'cacheHit' | 'cacheMiss' | 'localCacheHit' | 'coalescedHit', callback: (_: number) => any): void
  on(event: 'query' | 'queryFailed' | 'querySuccess', callback: (_: QueryEvent) => any): void
  once(event: 'cacheHit' | 'cacheMiss' | 'localCacheHit' | 'coalescedHit'): Promise<number>
  once(event: 'query' | 'queryFailed' | 'querySuccess'): Promise<QueryEvent>
}

export default function batcher(config: HAStoreConfig): HAStore
