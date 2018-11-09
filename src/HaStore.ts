import Queue from './Queue';
import { IParams, IResult, Middleware, Serializable } from './types';
import Deferred from './utils/Deferred';

interface IRequestMetadata {
  uuid: string;
  ids: Serializable[];
  params: IParams;
  parser: () => IResult;
  deferred: Deferred<IResult>;
}

const resolveMiddlewares = (middlewares: Middleware[]) => (): IResult => {
  return middlewares.reduce(
    (result: IResult, middleware: Middleware) => {
      return middleware(result.error, result.response);
    },
    { error: null, response: null },
  );
};

export default class HaStore {
  private queue: Queue<IRequestMetadata> = new Queue();

  constructor(private middlewares: Middleware[] = []) {
  }

  public get(ids: Serializable[], params: IParams, resolver: Middleware): Promise<IResult> {
    const uuid = Object.keys(params)
      .sort()
      // TODO: DPL: only use keys
      .map(key => `[${key}:${params[key]}]`)
      .join('');

    const deferred = new Deferred<IResult>();
    const metaData: IRequestMetadata = {
      ids,
      params,
      uuid,
      deferred,
      parser: resolveMiddlewares([resolver, ...this.middlewares]),
    };

    // DPL: Temp fake queue/batch
    setTimeout(
      () => {
        if (metaData.deferred.resolve) {
          metaData.deferred.resolve(metaData.parser());
        }
      },
      500,
    );

    return deferred.promise;
    // TODO: DPL: link metaData & returned promises/callback
    // Create promise
    // Use resolve/reject as/in middleware
    // Return promise so caller can wait for its data
  }
}
