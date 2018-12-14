import {Response, Middleware, IResult, IParams, Serializable} from '../types';
import {expect} from 'chai';
import HaStore from '../HaStore';

const testMiddleware = (modifier: (response: Response) => Response): Middleware => {
  return (error: Error | null, response: Response, next?: Middleware): IResult => {
    const newResponse: Response = modifier(response);
    return next
      ? next(error, newResponse)
      : {error, response: newResponse};
  };
};

describe('HaStore class', () => {
  describe('middlewares', () => {
    const resolver = async (ids: Serializable[], params?: IParams) => {
      const response: Response = {};
      ids.forEach((id: Serializable) => {
        response[`${id}`] = Number(id);
      });
      return {response, error: null};
    };

    it('should resolve all ids passed to the resolver', async () => {
      const store = new HaStore(resolver);

      const resultA: IResult = await store.
      get([0], {region: 'us'});

      const resultB: IResult = await store.get([0, 1, 3], {region: 'us'});

      expect(resultA.response).to.deep.equal({"0": 0});
      expect(resultB.response).to.deep.equal({"0": 0, "1": 1, "3": 3});
    });
  });

  // DPL: TODO: Add a test to validate batching

});
