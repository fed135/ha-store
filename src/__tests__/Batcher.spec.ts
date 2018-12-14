import {expect} from 'chai';
import Batcher from '../Batcher';
import {IRequestMetadata, IResult} from '../types';
import Deferred from '../utils/Deferred';
import Queue from '../Queue';


describe('Batcher', () => {
  const value: IRequestMetadata = {
    ids: [0, 1, 2],
    groupId: 'aaa',
    deferred: new Deferred<IResult>(),
  };

  describe('constructor', () => {
    it('should initialize the batcher', async () => {
      const batcher = new Batcher();
      expect(batcher).to.not.be.undefined;
    });
  });

  describe('process', () => {
    it('should return a provider', async () => {
      const batcher = new Batcher();
      const resolver = batcher.process(value);

      expect(resolver).to.not.be.undefined;
      expect(typeof resolver).to.be.equal(typeof Promise.resolve());
    });

    describe('query, provider and resolver', () => {
      it('should return a promise', async () => {
        const queue = new Queue();
        const batcher = new Batcher(queue);
        const resolver = await batcher.process(value);

        expect(resolver).to.not.be.undefined;
      });
    });

    describe('provider', () => {
      it('should resolve eventually', async () => {
        const batcher = new Batcher();
        const resolver = batcher.process(value);
        return resolver;
      });

      it('should return and object ordered by ids', async () => {
        const batcher = new Batcher();
        const response = await batcher.process(value);
        expect(Object.keys(response)).to.deep.equal(value.ids.map(id => `${id}`));
      });

      it('should return and object ordered by ids', async () => {
        const batcher = new Batcher();
        const response = await batcher.process(value);
        expect(Object.keys(response)).to.deep.equal(value.ids.map(id => `${id}`));
      });

    });

  });
});
