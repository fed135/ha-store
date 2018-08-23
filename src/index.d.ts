import { EventEmitter } from "events";

declare type Config = {
  batch: {
    tick: number,
    max: number,
  },
  retry: GenericCurveConfig,
  cache: GenericCurveConfig,
  breaker: GenericCurveConfig,
}

type GenericCurveConfig = {
  base: number,
  steps: number,
  limit: number,
  curve (progress: number, start: number, end: number): number
}

type Params = {
  [key: string]: string, 
};

type RequestIds = string | number | string[] | number[];

declare interface BatcherConfig {
  resolver(ids: RequestIds, params?: Params): Promise<T>,
  uniqueOptions?: string[],
  responseParser?(
    response: any, 
    requestedIds: string[] | number[], 
    params?: Params
  ): any
  cache?: Config.cache,
  batch?: Config.batch,
  retry?: Config.retry,
  breaker?: BreakerConfig,
  store?: any,
  storePluginFallback?: boolean,
  storePluginRecoveryDelay?: number
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
declare function exp(progress: number, start: number, end: number): number;
declare function tween(opts: GenericCurveConfig): (progress: number) => void;
declare function basicParser(results: any[], ids: RequestIds, params: Params): Object;
