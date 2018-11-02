import {Serializable, Ids, SerializableValue, Params, Data, Result, Middleware, Config} from './types';
import Queue from './Queue';

const breaker = (config: Config): Middleware => (error: Error | null, response: Data, next?: Middleware) => {
    console.log('breaker');
    return next && config.enable
        ? next(null, 'breaker')
        : {error, response};
};

type RequestMetadata = {
    uuid: string,
    ids: Serializable[],
    params: Params,
    resolve: () => Result,
};

const resolveMiddlewares = (middlewares: Middleware[]) => (): Result => {
    return middlewares.reduce(
        (result: Result, middleware: Middleware) => {
            return middleware(result.error, result.response);
        },
        {error: null, response: null}
    );
};

class HaStore {
    private queue: Queue<RequestMetadata> = new Queue();

    constructor(private middlewares: Middleware[]) {
    }

    public get(ids: Serializable[], params: Params, next?: Middleware) {
        const uuid = Object.keys(params)
            .sort()
            .map((key) => `[${key}:${params[key]}]`)
            .join('');

        const metaData: RequestMetadata = {
            uuid,
            ids,
            params,
            resolve: resolveMiddlewares(this.middlewares),
        };
        this.queue.add(metaData);

        //TODO: DPL: link metaData & returned promises/callback
        // Create promise
        // Use resolve/reject as/in middleware
        // Return promise so caller can wait for its data
    };
}

const store = new HaStore([
    breaker({enable: true}),
    breaker({enable: false}),
    breaker({enable: true}),
]);


const result = store.get([0], {region: 'us'}, (error: Error | null, response: Data) => {
    console.log('resolver', error, response);
    return {error: null, response: response + ' from get'};
});


console.log('result', result);
