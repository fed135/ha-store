import Queue from './Queue';
import {Id, IParams, IRequestMetadata, IResult, Middleware, Response} from './types';
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
    private resolver: (ids: Id[], params?: IParams) => Promise<IResult<T>>,
    private middlewares: Middleware<T>[] = [],
    private queue: Queue<T> = new Queue(),
  ) {
    setInterval(this.tick.bind(this), 200);
  }

  // DPL: TODO: :Move to tick class?
  public async tick(): Promise<void> {
    const requestsData: IRequestMetadata<T>[] = this.queue.pop();
    if (!requestsData || requestsData.length === 0) {
      return;
    }

    const ids: Set<Id> = requestsData
      .map((metaData: IRequestMetadata<T>) => metaData.ids)
      .reduce(
        (set: Set<Id>, ids: Id[]) => {
          ids.forEach((id: Id) => set.add(id));
          return set;
        },
        new Set<Id>(),
      );

    // Call the underlying service
    const queryResult: IResult<T> = resolveMiddlewares<T>(
      this.middlewares,
      await this.resolver(Array.from(ids), requestsData[0].params),
    );

    // Retrieve each piece of information and send it to whoever requested it
    requestsData.forEach((metaData: IRequestMetadata<T>) => {
      const result: Response<T> = {};
      metaData.ids.forEach((id: Id) => {
        result[id] = queryResult.response[id];
      });

      if (metaData.deferred.resolve) {
        metaData.deferred.resolve({error: queryResult.error, response: result});
      }
    });
  }

  public get(ids: Id[], params: IParams = {}): Promise<IResult<T>> {
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

