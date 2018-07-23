import { EventEmitter } from "events";

declare type Config = {
  batch: {
    tick: number,
    max: number,
  },
  retry: {
    base: number,
    steps: number,
    limit: number,
  },
  cache: {
    base: number,
    steps: number,
    limit: number,
  },
  breaker: BreakerConfig,
}

type BreakerConfig = {
  base: number,
  steps: number,
  limit: number,
}

type Params = {
  [key: string]: string, 
};

type RequestIds = string | number | string[] | number[];
type RequestId = string | number;

declare interface Getter {
  method(ids: RequestIds, params?: Params): Promise<T>;
  responseParser(
    response: any, 
    requestedIds: string[] | number[], 
    params?: Params
  ): void;
}

declare interface BatcherConfig {
  getter: Getter,
  uniqueOptions?: string[],
  cache?: Config.cache,
  batch?: Config.batch,
  retry?: Config.retry,
  breaker?: BreakerConfig,
}

declare function batcher(BatcherConfig, emitter: EventEmitter): {

  get(ids: string | number, params?: Params): Promise;

  set(items: any, ids: string[] | number[], params?: Params): Promise;

  has(ids: RequestIds, params?: Params): Boolean;

  clear(ids: RequestIds, params?: Params): void;

  size(): Object;
};


/**
 * Utilities
 */
declare function requiredParam(param: any, def?: string): void | Error;
declare function exp(progress: number, start: number, end: number): number;
declare function tween(opts: BreakerConfig): (progress: number) => void;
declare function basicParser(results: any[], ids: RequestIds, params: Params): Object;

/**
 * Circuit-breaker component
 */
declare function breaker(config: Config, emitter: EventEmitter): {
    circuitError: Error;
    openCircuit: () => void;
    closeCircuit: () => void;
    status: (ttl: any) => {
        step: number;
        active: boolean;
        ttl: any;
    };
};


/**
 * Record Store
 */

type Record = {
  value: any,
  timer: Node.Timeout | number,
  bump: boolean,
}

type RecordKey = (context: string, id: string) => any;

declare interface Store {
  get: (key: string) => any;
  set: (
    recordKey: RecordKey, 
    keys: string[], 
    values: object, 
    opts: BreakerConfig
  ) => Promise;
  has: (key: string) => boolean;
  clear: (key: string) => boolean;
  lru: (key: any) => void;
  size: () => number;
}

declare function LocalStore(
  config: BreakerConfig, 
  emitter: EventEmitter, 
  store: Map<string, Record> // what values should be here? Records?
): Store;


/**
 * Queue processing
 */
declare function queue(
  config: Config, 
  emitter: EventEmitter, 
  userStore: Map<string, any>
): {
    batch: (id: RequestId, params: Params) => Promise<any>;
    direct: (ids: RequestIds, params: Params) => Promise<any>;
    has: (id: RequestId, params: Params) => boolean;
    clear: (id: RequestId, params: Params) => boolean;
    store: Map<string, any>;
    complete: (key: string, ids: RequestIds, params: Params, results: any) => void;
    contextKey: (params: Params) => string;
    retry: (key: string, ids: RequestIds, params: Params, err: Error) => void;
    query: (key: string, ids?: RequestIds) => void;
    size: () => {
        contexts: number;
        records: number;
    };
};
