import Queue from './Queue';
import {IParams, IRequestMetadata, IResult, Middleware, Serializable} from './types';
import Deferred from './utils/Deferred';

const resolveMiddlewares = (middlewares: Middleware[]) => (): IResult => {
  return middlewares.reduce(
    (result: IResult, middleware: Middleware) => {
      return middleware(result.error, result.response);
    },
    {error: null, response: null},
  );
};

export default class HaStore {
  private queue: Queue = new Queue();

  constructor(private middlewares: Middleware[] = []) {
  }

  public get(ids: Serializable[], params: IParams, resolver: Middleware): Promise<IResult> {
    const groupId = Object.keys(params)
      .sort()
      .map(key => `[${key}:${params[key]}]`)
      .join('');

    const deferred = new Deferred<IResult>();
    const metaData: IRequestMetadata = {
      ids,
      params,
      groupId,
      deferred,
      middlewares: resolveMiddlewares([resolver, ...this.middlewares]),
    };

    this.queue.add(metaData);

    // Fake tick
    setTimeout(() => {
      if (deferred.resolve) {
        deferred.resolve(metaData.middlewares());
      }
    }, 10);

    return deferred.promise;
  }
}
