import { IConfig, IResult, Middleware, Response} from '../types';

// DPL: TODO: Implement circuit breaking
export default <T>(config: IConfig): Middleware<T> => {
  return (error: Error | null, response: Response<T>, next?: Middleware<T>): IResult<T> => {
    return next && config.enable
      ? next(error, {})
      : { error, response };
  };
};
