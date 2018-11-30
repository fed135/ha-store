import Queue from "./Queue";
import {IRequestMetadata} from "./types";

type Response = {
  [id: string]: null,
};

export default class Batch<T extends IRequestMetadata = IRequestMetadata> {

  constructor(private queue: Queue<T> = new Queue()) {
  }

  public process(value: T): Promise<Response> {
    // return Promise.resolve(value.ids);
    return new Promise((resolve: (response: Response) => void) => {
      const response: Response = {};

      value.ids.forEach((id) => {
        response[`${id}`] = null;
      });

      return resolve(response);
    });
  }
}
