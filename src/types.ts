//TODO: DPL: Move types to their respective module/file
export type Serializable = number | string;
export type Ids = Serializable[];
export type SerializableValue = number[] | string[] | boolean[] | number | string | boolean;
export type Params = { [keys: string]: SerializableValue };
export type Data = null | undefined | string;
export type Result = { error: Error | null, response: Data };
export type Middleware = (error: Error | null, response: Data, next?: Middleware) => Result;
export type Config = { enable: boolean };

