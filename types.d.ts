type DelimiterKeys<T extends readonly string[]> = T[number];

type ParamsFromDelimiters<D extends readonly string[] | undefined>
  = D extends readonly string[]
    ? { [K in DelimiterKeys<D>]?: string } & { [key: string]: string | undefined }
    : { [key: string]: string | undefined };

type Params = {
  [key: string]: string | undefined
};

type RequestIds = string[];

interface HACacheStore {
  get<Response>(key: string): Response | Promise<Response>
  getMulti<Response>(recordKey: (contextKey: string) => string, keys: RequestIds): Response[] | Promise<Response[]>
  set<DataType>(recordKey: (contextKey: string) => string, keys: RequestIds, values: DataType): boolean
  clear(key: '*' | string): boolean
  size(): number
  connection?: any
  local?: boolean
}

interface InMemoryCacheOptions {
  limit?: number
  ttl?: number
}

interface RedisCacheOptions {
  keyspace?: string
  host?: string
  port?: number
  path?: string
  connection?: any
  ttl?: number
}

interface HAStoreConfig<D extends readonly string[] | undefined = undefined> {
  resolver<Response>(
    ids: string[],
    params?: ParamsFromDelimiters<D>
  ): Promise<{ [id: string]: Response }> | { [id: string]: Response }

  resolver<Response, Context>(
    ids: string[],
    params?: ParamsFromDelimiters<D>,
    context?: Context
  ): Promise<{ [id: string]: Response }> | { [id: string]: Response }

  delimiter?: D | string[]

  caches?: HACacheStore[]

  batch?: {
    delay?: number
    limit?: number
  } | null
}

interface ConfigurableResolverConfig {
  identifier: string
  table: string
  fields?: string[]
  db: any
  allowedFilters?: string[]
}

type ConfigurableResolver<D extends readonly string[] | undefined = undefined> = (config: ConfigurableResolverConfig) => <Response>(
  ids: string[],
  params?: ParamsFromDelimiters<D>,
) => Promise<{ [id: string]: Response }> | { [id: string]: Response };

type QueryEvent = {
  key: string
  uid: string
  size: number
  params: any
  contexts?: any[]
  ids?: string[]
  cause?: 'limit' | 'timeout'
  error?: Error
};

interface HAStore<D extends readonly string[] | undefined = undefined> {
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

declare module 'ha-store' {
  export default function store(config: HAStoreConfig): HAStore;
  export const resolvers: {
    postgres: ConfigurableResolver
    sqlite: ConfigurableResolver
  };
  export const caches: {
    inMemory: (config?: InMemoryCacheOptions) => HACacheStore
    redis: (config?: RedisCacheOptions) => HACacheStore
  };
}
