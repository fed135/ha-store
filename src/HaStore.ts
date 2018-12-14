import Queue from './Queue';
import {Response, IParams, IRequestMetadata, IResult, Middleware, Serializable} from './types';
import Deferred from './utils/Deferred';
import Batcher from './Batcher';

const resolveMiddlewares = (middlewares: Middleware[], result: IResult): IResult => {
  return middlewares.reduce(
    (currentResult: IResult, middleware: Middleware) => {
      return middleware(currentResult.error, currentResult.response);
    },
    {...result},
  );
};

export default class HaStore {

  constructor(
    private resolver: (ids: Serializable[], params?: IParams) => Promise<IResult>,
    private middlewares: Middleware[] = [],
    private queue: Queue = new Queue(),
    private batcher: Batcher = new Batcher(queue),
  ) {
  }

  // DPL: TODO: :Move to tick class?
  public async tick(): Promise<void> {
    const metaDatas: IRequestMetadata[] = this.queue.pop();
    if (!metaDatas) {
      return;
    }

    const ids: Set<Serializable> = metaDatas
      .map((metaData: IRequestMetadata) => metaData.ids)
      .reduce(
        (set: Set<Serializable>, ids: Serializable[]) => {
          ids.forEach((id: Serializable) => set.add(id));
          return set;
        },
        new Set<Serializable>(),
      );

    // Call the underlying service
    const queryResult: IResult = resolveMiddlewares(
      this.middlewares,
      await this.resolver(Array.from(ids), metaDatas[0].params),
    );

    // Retrieve each piece of information and send it to whoever requested it
    metaDatas.forEach((metaData: IRequestMetadata) => {
      const result: Response = {};
      metaData.ids.forEach((id: Serializable) => {
        result[id] = queryResult.response[id];
      });

      if (metaData.deferred.resolve) {
        metaData.deferred.resolve({error: queryResult.error, response: result});
      }
    });
  }

  public get(ids: Serializable[], params: IParams): Promise<IResult> {
    const groupId = Object.keys(params)
      .sort()
      .map(key => `[${key}:${params[key]}]`)
      .join('');

    const deferred = new Deferred<IResult>();
    // DPL: TODO: Reuse metaData if group & ids are already present in queue
    const metaData: IRequestMetadata = {
      ids,
      params,
      groupId,
      deferred,
    };
    this.queue.add(metaData);

    // Fake tick
    setTimeout(() => {
      this.tick();
    }, 10);

    return deferred.promise
      ? deferred.promise
      : Promise.reject({error: 'Could not create deferred promise', response: null});
  }
}

