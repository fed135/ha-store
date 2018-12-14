import Queue from './Queue';
import {Response, IRequestMetadata} from './types';

// export interface IRequestMetadata {
//   ids: Serializable[];
//   params?: IParams;
//   groupId: GroupId;
//   deferred: Deferred<IResult>;
//   middlewares: () => IResult;
// }

export default class Batcher<T extends IRequestMetadata = IRequestMetadata> {

  constructor(private queue: Queue<T> = new Queue()) {
  }

  /**
   * Process all request in the queue
   */
  public process(value: T): Promise<Response> {
    this.queue.add(value);
    /**
     * Get running query for each id in the group
     * Add each running query found to the resolver's data
     * Create a query for each remaining id
     * Add thoses queries to the list of running query
     *
     *
     * Queries must be self-removable
     *
     */
    return new Promise((resolve: (response: Response) => void) => {
      const response: Response = {};
      // const resolvers = [];

      value.ids.forEach((id) => {
        // if (queryGroup[id]) {
        //   resolvers.push(queryGroup[id]);
        // } else {
        //   const query = new Query();//or somehting else, a function maybe?
        //
        //   queryGroup[id]=query;
        //   resolvers.push(query);
        // }

        response[`${id}`] = null;
      });

      return resolve(response);
    });
  }
}
