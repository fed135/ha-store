/**
 * Root component unit tests
 */

/* Requires ------------------------------------------------------------------*/
const {exp, contextKey} = require('../../src/utils.js');
const {noop} = require('./utils');
const root = require('../../src/index.js');
const expect = require('chai').expect;
const sinon = require('sinon');

/* Utils ---------------------------------------------------------------------*/
function checkForPublicProperties(store) {
  expect(store.get).to.not.be.undefined;
  expect(store.set).to.not.be.undefined;
  expect(store.clear).to.not.be.undefined;
  expect(store.getKey).to.not.be.undefined;
  expect(store.config).to.not.be.undefined;
  expect(store.queue).to.not.be.undefined;
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
        uniqueParams: ['a', 'b', 'c'],
        cache: null,
        batch: null,
        retry: null,
      });
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the default config when called with true requirements', () => {
      const test = root({
        resolver: noop,
        uniqueParams: ['a', 'b', 'c'],
        cache: true,
        batch: true,
        retry: true,
      });
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = root({
        resolver: noop,
        uniqueParams: ['a', 'b', 'c'],
        cache: {base: 2},
        batch: {max: 12},
        retry: {limit: 35},
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
      const queueMock = sinon.mock(test.queue);
      test.get('123abc');
      queueMock.expects('batch').once().withArgs('123abc');
    });

    it('should handle single record queries with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test.queue);
      test.get('123abc', params);
      queueMock.expects('batch').once().withArgs('123abc', params);
    });

    it('should skip batching if batch config is false', () => {
      const test = root({
        resolver: noop,
        batch: false
      });
      const queueMock = sinon.mock(test.queue);
      test.get('123abc');
      queueMock.expects('push').once().withArgs('123abc');
    });

    it('should skip batching if batch config is false with params', () => {
      const test = root({
        resolver: noop,
        batch: false,
      });
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test.queue);
      test.get('123abc', params);
      queueMock.expects('push').once().withArgs('123abc', params);
    });

    it('should handle multi record queries', () => {
      const test = root({resolver: noop});
      const queueMock = sinon.mock(test.queue);
      test.get(['123abc', '456def', '789ghi']);
      queueMock.expects('push')
        .once().withArgs('123abc')
        .once().withArgs('456def')
        .once().withArgs('789ghi');
    });

    it('should handle multi record queries with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test.queue);
      test.get(['123abc', '456def', '789ghi'], params);
      queueMock.expects('push')
        .once().withArgs('123abc', params)
        .once().withArgs('456def', params)
        .once().withArgs('789ghi', params);
    });
  });

  describe('#set', () => {
    it('should handle a collection of ids', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test.queue);
      test.set({foo123abc: 'test'}, ['123abc'], params);
      queueMock.expects('complete')
        .once()
        .withArgs(contextKey([], params), ['123abc'], params, {foo123abc: 'test'});
    });

    it('should throw if ids are not passed', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const queueMock = sinon.mock(test.queue);
      expect(test.set.bind(null, {foo123abc: 'test'}, params)).to.throw('Missing required argument id list in batcher #set.');
    });
  });

  describe('#clear', () => {
    it('should return clear value', () => {
      const test = root({resolver: noop});
      const storeMock = sinon.mock(test.store);
      test.clear('123abc');
      storeMock.expects('clear').once().withArgs('123abc');
    });

    it('should return clear value with params', () => {
      const test = root({resolver: noop});
      const params = {foo: 'bar'};
      const storeMock = sinon.mock(test.store);
      test.clear('123abc', params);
      storeMock.expects('clear').once().withArgs('foo=bar::123abc');
    });

    it('should handle multi record clear queries', () => {
      const test = root({resolver: noop});
      const storeMock = sinon.mock(test.store);
      test.clear(['123abc', '456def', '789ghi']);
      storeMock.expects('clear')
        .once().withArgs('123abc')
        .once().withArgs('456def')
        .once().withArgs('789ghi');
    });

    it('should handle multi record clear queries with params', () => {
      const test = root({
        resolver: noop,
        uniqueParams: ['foo'],
      });
      const params = {foo: 'bar'};
      const storeMock = sinon.mock(test.store);
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
      const queueMock = sinon.mock(test.queue);
      const storeMock = sinon.mock(test.store);
      test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).to.deep.equal({contexts: 1, records: 0});
      queueMock.expects('size').once();
      storeMock.expects('size').once();
    });
  });

  describe('#getKey', () => {
    it('should return a record key when given an id', () => {
      const test = root({resolver: noop});
      expect(test.getKey('123abc')).to.be.equal('::123abc');
    });

    it('should return a record key when given an id and segregators', () => {
      const test = root({resolver: noop, uniqueParams: ['language']});
      expect(test.getKey('123abc')).to.be.equal('language=undefined::123abc');
    });

    it('should return a record key when given an id, segregators and params', () => {
      const test = root({resolver: noop, uniqueParams: ['language']});
      expect(test.getKey('123abc', {language:'fr'})).to.be.equal('language="fr"::123abc');
    });

    it('should return a record key when given an id, segregators and multiple params', () => {
      const test = root({resolver: noop, uniqueParams: ['language', 'country']});
      expect(test.getKey('123abc', {language:'fr',country:'FR'})).to.be.equal('language="fr";country="FR"::123abc');
    });
  });
});
