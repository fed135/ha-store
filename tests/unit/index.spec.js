/**
 * Root component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const queue = require('../../src/queue.js');
const { exp, contextKey } = require('../../src/utils.js');
const root = require('../../src/index.js');
const expect = require('chai').expect;
const sinon = require('sinon');

/* Tests ---------------------------------------------------------------------*/

describe('index', () => {

  describe('#constructor', () => {
    it('should produce a batcher with all the expected properties when called with minimal arguments', () => {
      const test = root({ resolver: () => {} });
      expect(test).to.contain.keys(['get', 'set', 'clear', 'config']);

    });

    it('should produce a batcher with all the expected properties when called with false arguments', () => {
      const test = root({
        resolver: () => {},
        uniqueParams: ['a', 'b', 'c'],
        cache: null,
        batch: null,
        retry: null,
      });
      expect(test).to.contain.keys(['get', 'set', 'clear', 'config']);
    });

    it('should produce a batcher with all the default config when called with true requirements', () => {
      const test = root({
        resolver: () => {},
        uniqueParams: ['a', 'b', 'c'],
        cache: true,
        batch: true,
        retry: true,
      });
      expect(test).to.contain.keys(['get', 'set', 'clear', 'config']);
      expect(test.config).to.deep.contain({
        cache: { limit: 30000, steps: 5, base: 1000, curve: exp },
        batch: { max: 100, tick: 50 },
        retry: { limit: 5000, steps: 3, base: 5, curve: exp },
        breaker: { limit: 65535, steps: 10, base: 1000, curve: exp, tolerance: 1 },
      });
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = root({
        resolver: () => {},
        uniqueParams: ['a', 'b', 'c'],
        cache: { base: 2 },
        batch: { max: 12 },
        retry: { limit: 35 },
        breaker: { steps: 1 },
      });
      expect(test).to.contain.keys(['get', 'set', 'clear', 'config']);
      expect(test.config).to.deep.contain({
        cache: { limit: 30000, steps: 5, base: 2, curve: exp },
        batch: { max: 12, tick: 50 },
        retry: { limit: 35, steps: 3, base: 5, curve: exp },
        breaker: { limit: 65535, steps: 1, base: 1000, curve: exp, tolerance: 1 },
      });
    });

    it('should throw if called with missing required arguments', () => {
      expect(root).to.throw(`config.resolver [undefined] is not a function`);
    });
  });

  describe('#get', () => {
    it('should handle single record queries', () => {
      const test = root({ resolver: () => {} });
      const queueMock = sinon.mock(test._queue);
      test.get('123abc');
      queueMock.expects('batch').once().withArgs('123abc');
    });

    it('should handle single record queries with params', () => {
      const test = root({ resolver: () => {} });
      const params = { foo: 'bar' };
      const queueMock = sinon.mock(test._queue);
      test.get('123abc', params);
      queueMock.expects('batch').once().withArgs('123abc', params);
    });

    it('should skip batching if batch config is false', () => {
      const test = root({ resolver: () => {}, batch: false });
      const queueMock = sinon.mock(test._queue);
      test.get('123abc');
      queueMock.expects('push').once().withArgs('123abc');
    });

    it('should skip batching if batch config is false with params', () => {
      const test = root({ resolver: () => {}, batch: false });
      const params = { foo: 'bar' };
      const queueMock = sinon.mock(test._queue);
      test.get('123abc', params);
      queueMock.expects('push').once().withArgs('123abc', params);
    });

    it('should handle multi record queries', () => {
      const test = root({ resolver: () => {} });
      const queueMock = sinon.mock(test._queue);
      test.get(['123abc', '456def', '789ghi']);
      queueMock.expects('push')
        .once().withArgs('123abc')
        .once().withArgs('456def')
        .once().withArgs('789ghi');
    });

    it('should handle multi record queries with params', () => {
      const test = root({ resolver: () => {} });
      const params = { foo: 'bar' };
      const queueMock = sinon.mock(test._queue);
      test.get(['123abc', '456def', '789ghi'], params);
      queueMock.expects('push')
        .once().withArgs('123abc', params)
        .once().withArgs('456def', params)
        .once().withArgs('789ghi', params);
    });
  });

  describe('#set', () => {
    it('should handle a collection of ids', () => {
      const test = root({ resolver: () => {} });
      const params = { foo: 'bar' };
      const queueMock = sinon.mock(test._queue);
      test.set({ foo123abc: 'test'}, ['123abc'], params);
      queueMock.expects('complete')
        .once()
        .withArgs(contextKey([], params), ['123abc'], params, { foo123abc: 'test' });
    });

    it('should throw if ids are not passed', () => {
      const test = root({ resolver: () => {} });
      const params = { foo: 'bar' };
      const queueMock = sinon.mock(test._queue);
      expect(test.set.bind(null, { foo123abc: 'test'}, params)).to.throw('Missing required argument id list in batcher #set.');
    });
  });

  describe('#clear', () => {
    it('should return clear value', () => {
      const test = root({ resolver: () => {} });
      const storeMock = sinon.mock(test._queue.store);
      test.clear('123abc');
      storeMock.expects('clear').once().withArgs('123abc');
    });

    it('should return clear value with params', () => {
      const test = root({ resolver: () => {}, uniqueParams: ['foo'] });
      const params = { foo: 'bar' };
      const storeMock = sinon.mock(test._queue.store);
      test.clear('123abc', params);
      storeMock.expects('clear').once().withArgs('foo=bar::123abc');
    });

    it('should handle multi record clear queries', () => {
      const test = root({ resolver: () => {} });
      const storeMock = sinon.mock(test._queue.store);
      test.clear(['123abc', '456def', '789ghi']);
      storeMock.expects('clear')
        .once().withArgs('123abc')
        .once().withArgs('456def')
        .once().withArgs('789ghi');
    });

    it('should handle multi record clear queries with params', () => {
      const test = root({ resolver: () => {}, uniqueParams: ['foo'] });
      const params = { foo: 'bar' };
      const storeMock = sinon.mock(test._queue.store);
      test.clear(['123abc', '456def', '789ghi'], params);
      storeMock.expects('clear')
        .once().withArgs('foo=bar::123abc')
        .once().withArgs('foo=bar::456def')
        .once().withArgs('foo=bar::789ghi');
    });
  });

  describe('#size', () => {
    it('should return size value', async () => {
      const test = root({ resolver: () => {} });
      const queueMock = sinon.mock(test._queue);
      const storeMock = sinon.mock(test._queue.store);
      test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).to.deep.equal({ contexts: 1, records: 0 });
      queueMock.expects('size').once();
      storeMock.expects('size').once();
    });
  });
});
