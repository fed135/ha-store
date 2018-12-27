// TODO: DPL: Move types to their respective module/file
import Deferred from './utils/Deferred';

export type Id = number | string;
export type IdValue = number[] | string[] | boolean[] | number | string | boolean;

export interface IParams {
  [keys: string]: IdValue;
}

export interface IResult<T> {
  error: Error | null;
  response: Response<T>;
}

export type Middleware<T> = (error: Error | null, response: Response<T>, next?: Middleware<T>) => IResult<T>;

export interface IConfig {
  enable: boolean;
}


export type GroupId = string;

export interface IRequestMetadata<T> {
  ids: Id[];
  params: IParams;
  groupId: GroupId;
  deferred: Deferred<IResult<T>>;
}

export type Response<T> = {
  [id: string]: T,
};
