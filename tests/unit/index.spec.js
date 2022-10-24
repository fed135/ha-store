/**
 * Root component unit tests
 */

/* Requires ------------------------------------------------------------------*/
const {contextKey} = require('../../src/utils');
const {noop} = require('./testUtils');
const root = require('../../src/index');
const expect = require('chai').expect;
const sinon = require('sinon');

/* Utils ---------------------------------------------------------------------*/
function checkForPublicProperties(store) {
  expect(store.get).to.not.be.undefined;
  expect(store.getMany).to.not.be.undefined;
  expect(store.set).to.not.be.undefined;
  expect(store.clear).to.not.be.undefined;
  expect(store.getStorageKey).to.not.be.undefined;
  expect(store.config).to.not.be.undefined;
}

/* Tests ---------------------------------------------------------------------*/

describe('index', () => {
  describe('#constructor', () => {
    it('should produce a batcher with all the expected properties when called with minimal arguments', () => {
      const test = root({resolver: noop});
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the expected properties when called with false arguments', () => {
      const test = root({
        resolver: () => {
        },
        delimiter: ['a', 'b', 'c'],
        cache: null,
        batch: null,
      });
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the default config when called with true requirements', () => {
      const test = root({
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        cache: true,
        batch: true,
      });
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = root({
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        cache: {enabled: true, tiers: [{ttl: 1000}]},
        batch: {limit: 12},
      });
      checkForPublicProperties(test);
    });

    it('should throw if called with missing required arguments', () => {
      expect(root).to.throw(`config.resolver [undefined] is not a function`);
    });
  });

  describe('#get', () => {
    it('should handle single record queries', () => {
      const test = root({resolver: noop});
      const queueMock = sinon.mock(test._queue);
      test.get('123abc');
      queueMock.expects('getHandles').once().withArgs('', ['123abc'], undefined, undefined);
    });

    it('should handle single record queries with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test._queue);
      test.get('123abc', params);
      queueMock.expects('getHandles').once().withArgs('foo="bar"', ['123abc'], { foo: 'bar' }, undefined);
    });

    it('should handle multi record queries', () => {
      const test = root({resolver: noop});
      const queueMock = sinon.mock(test._queue);
      test.get(['123abc', '456def', '789ghi']);
      queueMock.expects('getHandles').once().withArgs('', ['123abc', '456def', '789ghi'], undefined, undefined);
    });

    it('should handle multi record queries with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test._queue);
      test.get(['123abc', '456def', '789ghi'], params);
      queueMock.expects('getHandles').once().withArgs('foo="bar"', ['123abc', '456def', '789ghi'], { foo: 'bar' }, undefined);
    });
  });

  describe('#set', () => {
    it('should handle a collection of ids', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const storeMock = sinon.mock(test._store);
      test.set({foo123abc: 'test'}, ['123abc'], params);
      storeMock.expects('set')
        .once()
        .withArgs(contextKey([], params), ['123abc'], params, {foo123abc: 'test'});
    });

    it('should throw if ids are not passed', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      expect(test.set.bind(null, {foo123abc: 'test'}, params)).to.throw('Missing required argument id list in batcher #set.');
    });
  });

  describe('#clear', () => {
    it('should return clear value', () => {
      const test = root({resolver: noop});
      const storeMock = sinon.mock(test._store);
      test.clear('123abc');
      storeMock.expects('clear').once().withArgs('123abc');
    });

    it('should return clear value with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const storeMock = sinon.mock(test._store);
      test.clear('123abc', params);
      storeMock.expects('clear').once().withArgs('foo=bar::123abc');
    });

    it('should handle multi record clear queries', () => {
      const test = root({resolver: noop});
      const storeMock = sinon.mock(test._store);
      test.clear(['123abc', '456def', '789ghi']);
      storeMock.expects('clear')
        .once().withArgs('123abc')
        .once().withArgs('456def')
        .once().withArgs('789ghi');
    });

    it('should handle multi record clear queries with params', () => {
      const test = root({
        resolver: noop,
        delimiter: ['foo'],
      });
      const params = {foo: 'bar'};
      const storeMock = sinon.mock(test._store);
      test.clear(['123abc', '456def', '789ghi'], params);
      storeMock.expects('clear')
        .once().withArgs('foo=bar::123abc')
        .once().withArgs('foo=bar::456def')
        .once().withArgs('foo=bar::789ghi');
    });
  });

  describe('#size', () => {
    it('should return size value', async () => {
      const test = root({resolver: noop});
      const queueMock = sinon.mock(test._queue);
      const storeMock = sinon.mock(test._store);
      await test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).to.deep.equal({
        activeBuffers: 0,
        pendingBuffers: 0,
        records: {
          local: 0,
          remote: 0,
          status: 'disabled',
        },
      });
      queueMock.expects('size').once();
      storeMock.expects('size').once();
    });

    it('should return size value and status if cache is disabled', async () => {
      const test = root({resolver: noop, cache: null});
      const queueMock = sinon.mock(test._queue);
      const storeMock = sinon.mock(test._store);
      await test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).to.deep.equal({
        activeBuffers: 0,
        pendingBuffers: 0,
        records: {
          local: 0,
          remote: 0,
          status: 'disabled',
        },
      });
      queueMock.expects('size').once();
      storeMock.expects('size').once();
    });
  });

  describe('#getStorageKey', () => {
    it('should return a record key when given an id', () => {
      const test = root({resolver: noop});
      expect(test.getStorageKey('123abc')).to.be.equal('::123abc');
    });

    it('should return a record key when given an id and segregators', () => {
      const test = root({resolver: noop, delimiter: ['language']});
      expect(test.getStorageKey('123abc')).to.be.equal('language=undefined::123abc');
    });

    it('should return a record key when given an id, segregators and params', () => {
      const test = root({resolver: noop, delimiter: ['language']});
      expect(test.getStorageKey('123abc', {language:'fr'})).to.be.equal('language="fr"::123abc');
    });

    it('should return a record key when given an id, segregators and multiple params', () => {
      const test = root({resolver: noop, delimiter: ['language', 'country']});
      expect(test.getStorageKey('123abc', {language:'fr',country:'FR'})).to.be.equal('language="fr";country="FR"::123abc');
    });
  });
});
