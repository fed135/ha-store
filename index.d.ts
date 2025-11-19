declare module 'ha-store' {
  // Extract delimiter keys from readonly array for type safety
  type DelimiterKeys<T extends readonly string[]> = T[number];

  // Build params type from delimiter configuration
  type ParamsFromDelimiters<D extends readonly string[] | undefined>
    = D extends readonly string[]
      ? { [K in DelimiterKeys<D>]?: string } & { [key: string]: string | undefined }
      : { [key: string]: string | undefined };

  // Generic params type when delimiters are not specified
  type Params = {
    [key: string]: string | undefined
  };

  type RequestIds = string[];

  export interface HACacheStore {
    get<Response>(key: string): Promise<Response>
    getMulti<Response>(recordKey: (contextKey: string) => string, keys: RequestIds): Promise<Response[]>
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

  export interface PostgresResolverOptions {
    db: any
    table: string
    identifier: string
  }

  // Generic config that captures delimiter type
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
    }
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

  // Generic store interface that uses delimiter-specific params
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

  // Main factory function with delimiter type inference
  export default function haStore<D extends readonly string[] | undefined = undefined>(
    config: HAStoreConfig<D>,
  ): HAStore<D>;

  export const caches: { inMemory: (options: InMemoryCacheOptions) => HACacheStore };

  export const resolvers: { postgres: <Response>(options: PostgresResolverOptions) => (ids: string[], params?: Params) => Promise<{ [id: string]: Response }> };

  // Named export as well
  export function haStore<D extends readonly string[] | undefined = undefined>(
    config: HAStoreConfig<D>,
  ): HAStore<D>;
}
