import {expect} from 'chai';
import Batch from '../Batch';
import {IRequestMetadata, Serializable} from "../types";


describe('Batch', () => {
  const value: IRequestMetadata = {
    ids: [0, 1, 2],
  };

  describe('constructor', () => {
    it('should initialize the batcher', async () => {
      const batcher = new Batch();
      expect(batcher).to.not.be.undefined;
    });
  });

  describe('process', () => {
    it('should return a provider', async () => {
      const batcher = new Batch();
      const resolver = batcher.process(value);

      expect(resolver).to.not.be.undefined;
    });

    describe('provider', () => {
      it('should resolve eventually', async () => {
        const batcher = new Batch();
        const resolver = batcher.process(value);
        return resolver;
      });

      it('should return and object ordered by ids', async () => {
        const batcher = new Batch();
        const response = await batcher.process(value);
        expect(Object.keys(response)).to.deep.equal(value.ids.map(id => `${id}`));
      });

      it('should return and object ordered by ids', async () => {
        const batcher = new Batch();
        const response = await batcher.process(value);
        expect(Object.keys(response)).to.deep.equal(value.ids.map(id => `${id}`));
      });

    });

  });
});
