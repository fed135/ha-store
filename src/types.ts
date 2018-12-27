// TODO: DPL: Move types to their respective module/file
import Deferred from './utils/Deferred';

export type Serializable = number | string;
export type Ids = Serializable[];
export type SerializableValue = number[] | string[] | boolean[] | number | string | boolean;

export interface IParams {
  [keys: string]: SerializableValue;
}

export type Data = null | undefined | string | number;

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
  ids: Serializable[];
  params: IParams;
  groupId: GroupId;
  deferred: Deferred<IResult<T>>;
}

export type Response<T> = {
  [id: string]: T,
};
