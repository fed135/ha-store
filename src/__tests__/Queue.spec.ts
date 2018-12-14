import {expect} from 'chai';
import Queue from '../Queue';
import {IRequestMetadata, IResult} from '../types';
import Deferred from '../utils/Deferred';


describe('HaStore class', () => {
  const value: IRequestMetadata = {
    ids: ['1', '2', '3'],
    groupId: 'aaa',
    middlewares: () => ({
      error: null,
      response: null,
    }),
    deferred: new Deferred<IResult>(),
  };

  describe('constructor', () => {
    it('should create an empty list', async () => {
      const queue = new Queue();
      expect(queue).to.not.be.undefined;
    });
  });

  describe('add', () => {
    it('should be able to accept new value', async () => {
      const queue = new Queue();
      queue.add(value);
    });
  });

  describe('pop', () => {
    it('should return all elements from the same group', async () => {
      const valueB = {...value};
      const valueC = {
        ...value,
        groupId: 'bbb',
      };
      const queue = new Queue();
      queue.add(value);
      queue.add(valueB);
      queue.add(valueC);

      expect(queue.pop()).to.be.deep.equal([value, valueB]);
      expect(queue.pop()).to.be.deep.equal([valueC]);
      expect(queue.pop()).to.be.deep.equal([]);
    });

    it('should return an empty array when the queue is empty', async () => {
      const queue = new Queue();
      expect(queue.pop()).to.be.deep.equal([]);

      queue.add(value);
      expect(queue.pop()).to.be.deep.equal([value]);
      expect(queue.pop()).to.be.deep.equal([]);
    });

  });

});
