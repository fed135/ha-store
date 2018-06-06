/**
 * Root component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const queue = require('../../src/queue');
const root = require('../../src');
const expect = require('chai').expect;
const sinon = require('sinon');

/* Tests ---------------------------------------------------------------------*/

describe('index', () => {

  describe('#constructor', () => {
    it('should produce a batcher with all the expected properties when called with minimal arguments', () => {
        const test = root({ getter: { method: () => {} } });
        expect(test).to.contain.keys(['get', 'set', 'has', 'clear', 'config']);

    });

    it('should produce a batcher with all the expected properties when called with false arguments', () => {
        const test = root({
            getter: { method: () => {} },
            uniqueOptions: ['a', 'b', 'c'],
            cache: false,
            batch: false,
            retry: false,
        });
        expect(test).to.contain.keys(['get', 'set', 'has', 'clear', 'config']);
    });

    it('should produce a batcher with all the default config when called with true requirements', () => {
        const test = root({
            getter: { method: () => {} },
            uniqueOptions: ['a', 'b', 'c'],
            cache: true,
            batch: true,
            retry: true,
        });
        expect(test).to.contain.keys(['get', 'set', 'has', 'clear', 'config']);
        expect(test.config).to.deep.contain({
            cache: { ttl: 30000, step: 1000 },
            batch: { limit: 100, tick: 50 },
            retry: { limit: 3, scale: 2.5, base: 5 },
        });
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
        const test = root({
            getter: { method: () => {} },
            uniqueOptions: ['a', 'b', 'c'],
            cache: { ttl: 2 },
            batch: { limit: 12 },
            retry: { limit: 35 },
        });
        expect(test).to.contain.keys(['get', 'set', 'has', 'clear', 'config']);
        expect(test.config).to.deep.contain({
            cache: { ttl: 2, step: 1000 },
            batch: { limit: 12, tick: 50 },
            retry: { limit: 35, scale: 2.5, base: 5 },
        });
    });

    it('should throw if called with missing required arguments', () => {
        expect(root).to.throw('Parameter "getter" is missing.\nExpected\n\tgetter: <object>{ method: <function(ids, params)>, responseParser: <function(response, requestedIds)> }');
    });
  });

  describe('#get', () => {
    it('should handle single record queries', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.get('123abc');
        queueMock.expects('add').once().withArgs('123abc');
    });

    it('should handle single record queries with params', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.get('123abc', params);
        queueMock.expects('add').once().withArgs('123abc', params);
    });

    it('should skip batching if batch config is false', () => {
        const test = root({ getter: { method: () => {} }, batch: false });
        const queueMock = sinon.mock(test._queue);
        test.get('123abc');
        queueMock.expects('skip').once().withArgs('123abc');
    });

    it('should skip batching if batch config is false with params', () => {
        const test = root({ getter: { method: () => {} }, batch: false });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.get('123abc', params);
        queueMock.expects('skip').once().withArgs('123abc', params);
    });

    it('should handle multi record queries', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.get(['123abc', '456def', '789ghi']);
        queueMock.expects('add')
            .once().withArgs('123abc')
            .once().withArgs('456def')
            .once().withArgs('789ghi');
    });

    it('should handle multi record queries with params', () => {
        const test = root({ getter: { method: () => {}, batch: false } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.get(['123abc', '456def', '789ghi'], params);
        queueMock.expects('skip')
            .once().withArgs('123abc', params)
            .once().withArgs('456def', params)
            .once().withArgs('789ghi', params);
    });
  });

  describe('#set', () => {
    it('should handle a collection of ids', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.set({ foo123abc: 'test'}, ['123abc'], params);
        queueMock.expects('contextKey').once().withArgs(params);
        queueMock.expects('complete')
            .once()
            .withArgs(test._queue.contextKey(params), ['123abc'], params, { foo123abc: 'test' });
    });

    it('should throw if ids are not passed', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        expect(test.set.bind(null, { foo123abc: 'test'}, params)).to.throw('Missing required argument id list in batcher #set.');
    });
  });

  describe('#has', () => {
    it('should return presence value', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.has('123abc');
        queueMock.expects('has').once().withArgs('123abc');
    });

    it('should return presence value with params', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.has('123abc', params);
        queueMock.expects('has').once().withArgs('123abc', params);
    });

    it('should handle multi record presence queries', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.has(['123abc', '456def', '789ghi']);
        queueMock.expects('has')
            .once().withArgs('123abc')
            .once().withArgs('456def')
            .once().withArgs('789ghi');
    });

    it('should handle multi record presence queries with params', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.has(['123abc', '456def', '789ghi'], params);
        queueMock.expects('has')
            .once().withArgs('123abc', params)
            .once().withArgs('456def', params)
            .once().withArgs('789ghi', params);
    });
  });

  describe('#clear', () => {
    it('should return clear value', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.clear('123abc');
        queueMock.expects('clear').once().withArgs('123abc');
    });

    it('should return clear value with params', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.clear('123abc', params);
        queueMock.expects('clear').once().withArgs('123abc', params);
    });

    it('should handle multi record clear queries', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.clear(['123abc', '456def', '789ghi']);
        queueMock.expects('clear')
            .once().withArgs('123abc')
            .once().withArgs('456def')
            .once().withArgs('789ghi');
    });

    it('should handle multi record clear queries with params', () => {
        const test = root({ getter: { method: () => {} } });
        const params = { foo: 'bar' };
        const queueMock = sinon.mock(test._queue);
        test.clear(['123abc', '456def', '789ghi'], params);
        queueMock.expects('clear')
            .once().withArgs('123abc', params)
            .once().withArgs('456def', params)
            .once().withArgs('789ghi', params);
    });
  });

  describe('#size', () => {
    it('should return size value', () => {
        const test = root({ getter: { method: () => {} } });
        const queueMock = sinon.mock(test._queue);
        test.get('123abc');
        expect(test.size()).to.deep.equal({ contexts: 1, records: 1 });
        queueMock.expects('size').once();
    });
  });
});
