import {Response, IParams, Serializable} from '../types';
import {expect} from 'chai';
import * as sinon from 'sinon';
import HaStore from '../HaStore';

describe('HaStore class', () => {
  describe('middlewares', () => {
    const resolverSpy = sinon.spy();
    const resolver = async (ids: Serializable[], params?: IParams) => {
      resolverSpy(ids, params);
      const response: Response = {};
      ids.forEach((id: Serializable) => {
        response[`${id}`] = Number(id);
      });
      return {response, error: null};
    };

    it('should resolve all ids passed to the resolver', async () => {
      const store = new HaStore(resolver);

      return Promise.all([
        store.get([0], {region: 'us'}),
        store.get([0, 1, 3], {region: 'us'}),
      ])
        .then(([resultA, resultB]) => {
          expect(resultA.response).to.deep.equal({"0": 0});
          expect(resultB.response).to.deep.equal({"0": 0, "1": 1, "3": 3});
          sinon.assert.calledOnce(resolverSpy);
        });
    });
  });
});
