import Queue from './Queue';
import {IParams, IRequestMetadata, IResult, Middleware, Response, Serializable} from './types';
import Deferred from './utils/Deferred';

const resolveMiddlewares = <T>(middlewares: Middleware<T>[], result: IResult<T>): IResult<T> => {
  return middlewares.reduce(
    (currentResult: IResult<T>, middleware: Middleware<T>) => {
      return middleware(currentResult.error, currentResult.response);
    },
    {...result},
  );
};

export default class HaStore<T> {

  constructor(
    private resolver: (ids: Serializable[], params?: IParams) => Promise<IResult<T>>,
    private middlewares: Middleware<T>[] = [],
    private queue: Queue<T> = new Queue(),
  ) {
    setInterval(this.tick.bind(this), 200);
  }

  // DPL: TODO: :Move to tick class?
  public async tick(): Promise<void> {
    const metaDatas: IRequestMetadata<T>[] = this.queue.pop();
    if (!metaDatas || metaDatas.length === 0) {
      return;
    }

    const ids: Set<Serializable> = metaDatas
      .map((metaData: IRequestMetadata<T>) => metaData.ids)
      .reduce(
        (set: Set<Serializable>, ids: Serializable[]) => {
          ids.forEach((id: Serializable) => set.add(id));
          return set;
        },
        new Set<Serializable>(),
      );

    // Call the underlying service
    const queryResult: IResult<T> = resolveMiddlewares<T>(
      this.middlewares,
      await this.resolver(Array.from(ids), metaDatas[0].params),
    );

    // Retrieve each piece of information and send it to whoever requested it
    metaDatas.forEach((metaData: IRequestMetadata<T>) => {
      const result: Response<T> = {};
      metaData.ids.forEach((id: Serializable) => {
        result[id] = queryResult.response[id];
      });

      if (metaData.deferred.resolve) {
        metaData.deferred.resolve({error: queryResult.error, response: result});
      }
    });
  }

  public get(ids: Serializable[], params: IParams = {}): Promise<IResult<T>> {
    const groupId = Object.keys(params)
      .sort()
      .map(key => `[${key}:${params[key]}]`)
      .join('');

    const deferred = new Deferred<IResult<T>>();
    // DPL: TODO: Reuse metaData if group & ids are already present in queue
    const metaData: IRequestMetadata<T> = {
      ids,
      params,
      groupId,
      deferred,
    };
    this.queue.add(metaData);

    return deferred.promise
      ? deferred.promise
      : Promise.reject({error: 'Could not create deferred promise', response: null});
  }
}

