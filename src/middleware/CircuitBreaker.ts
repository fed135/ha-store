import { Data, IConfig, IResult, Middleware } from '../types';

export default (config: IConfig): Middleware => {
  return (error: Error | null, response: Data, next?: Middleware): IResult => {
    return next && config.enable
      ? next(error, 'breaker')
      : { error, response };
  };
};
