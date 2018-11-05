import Queue from './Queue';
import { IParams, IResult, Middleware, Serializable } from './types';

interface IRequestMetadata {
  uuid: string;
  ids: Serializable[];
  params: IParams;
  parser: () => IResult;
  resolve: (result: IResult) => void;
  reject: (error: Error) => void;
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
    return new Promise((resolve, reject) => {
      const uuid = Object.keys(params)
        .sort()
        // TODO: DPL: only use keys
        .map(key => `[${key}:${params[key]}]`)
        .join('');

      const metaData: IRequestMetadata = {
        ids,
        params,
        reject,
        resolve,
        uuid,
        parser: resolveMiddlewares([resolver, ...this.middlewares]),
      };

      const result = metaData.parser();
      resolve(result);
    });

    // TODO: DPL: link metaData & returned promises/callback
    // Create promise
    // Use resolve/reject as/in middleware
    // Return promise so caller can wait for its data
  }
}
