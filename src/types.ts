// TODO: DPL: Move types to their respective module/file
import Deferred from "./utils/Deferred";

export type Serializable = number | string;
export type Ids = Serializable[];
export type SerializableValue = number[] | string[] | boolean[] | number | string | boolean;

export interface IParams {
  [keys: string]: SerializableValue;
}

export type Data = null | undefined | string;

export interface IResult {
  error: Error | null;
  response: Data;
}

export type Middleware = (error: Error | null, response: Data, next?: Middleware) => IResult;

export interface IConfig {
  enable: boolean;
}


export type GroupId = string;

export interface IRequestMetadata {
  ids: Serializable[];
  params?: IParams;
  groupId: GroupId;
  deferred: Deferred<IResult>;
  middlewares: () => IResult;
}
