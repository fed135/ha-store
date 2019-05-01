/**
 * Index
 */

/* Imports -------------------------------------------------------------------*/

import { CacheConfig, BatchConfig, HaStoreConfig, Params, RequestIds } from "./ha-store";

/* Methods -------------------------------------------------------------------*/

class HaStore {
    private caching: CacheConfig
    private batching: BatchConfig
    constructor(options: HaStoreConfig) {
        this.caching = options.cache;
        this.batching = options.batch;
    }

    get(ids: RequestIds, params: Params, ): Promise<any> {

    }
}

/* Exports -------------------------------------------------------------------*/

export default function storeFactory(userOptions: HaStoreConfig) {
    if (!userOptions) throw new Error(`config object required, see README for details`);
    
    // Parameter validation
    if (typeof userOptions.resolver !== 'function') {
        throw new Error(`config.resolver [${userOptions.resolver}] is not a function`);
    }

    if (userOptions.cache !== null) userOptions.cache = { limit: 1000, ttl: 300000, ...userOptions.cache };
    if (userOptions.batch !== null) userOptions.batch = { tick: 50, max: 100, ...userOptions.batch };

    return new HaStore(userOptions);
}