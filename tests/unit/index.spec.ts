/**
 * Root component unit tests
 */
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { noop } from './testUtils.ts';
import root, { caches } from '../../src/index.ts';

function checkForPublicProperties(store: any) {
  assert.ok(store.get);
  assert.ok(store.getMany);
  assert.ok(store.set);
  assert.ok(store.clear);
  assert.ok(store.getStorageKey);
  assert.ok(store.config);
}

describe('index', () => {
  describe('constructor', () => {
    test('should produce a batcher with all the expected properties when called with minimal arguments', () => {
      const test = root({ resolver: noop });
      checkForPublicProperties(test);
    });

    test('should produce a batcher with all the expected properties when called with false arguments', () => {
      const test = root({
        resolver: () => {},
        delimiter: ['a', 'b', 'c'],
        caches: null,
        batch: null,
      });
      checkForPublicProperties(test);
    });

    test('should throw an error when called with invalid cache config', () => {
      const test = root.bind(null, {
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        caches: [{}],
        batch: true,
      });
      assert.throws(test, new Error('invalid cache instance'));
    });

    test('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = root({
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        caches: [caches.inMemory({ ttl: 1000 })],
        batch: { limit: 12 },
      });
      checkForPublicProperties(test);
    });

    test('should throw if called with missing required arguments', () => {
      assert.throws(root, new Error('config is not defined'));
    });
  });

  describe('get', () => {
    test('should handle single record queries', () => {
      const test = root({ resolver: noop });
      const getHandlesSpy = mock.method(test._queue, 'getHandles');
      test.get('123abc');
      assert.deepStrictEqual(getHandlesSpy.mock.calls[0].arguments, ['', ['123abc'], {}, null]);
    });

    test('should handle single record queries with params', () => {
      const test = root({ resolver: noop, delimiter: ['foo'] });
      const params = { foo: 'bar' };
      const getHandlesSpy = mock.method(test._queue, 'getHandles');
      test.get('123abc', params);
      assert.deepStrictEqual(getHandlesSpy.mock.calls[0].arguments, ['foo="bar"', ['123abc'], { foo: 'bar' }, null]);
    });

    test('should handle multi record queries', () => {
      const test = root({ resolver: noop });
      const getHandlesSpy = mock.method(test._queue, 'getHandles');
      test.getMany(['123abc', '456def', '789ghi']);
      assert.deepStrictEqual(getHandlesSpy.mock.calls[0].arguments, ['', ['123abc', '456def', '789ghi'], {}, null]);
    });

    test('should handle multi record queries with params', () => {
      const test = root({ resolver: noop, delimiter: ['foo'] });
      const params = { foo: 'bar' };
      const getHandlesSpy = mock.method(test._queue, 'getHandles');
      test.getMany(['123abc', '456def', '789ghi'], params);
      assert.deepStrictEqual(getHandlesSpy.mock.calls[0].arguments, ['foo="bar"', ['123abc', '456def', '789ghi'], { foo: 'bar' }, null]);
    });
  });

  describe('set', () => {
    test('should handle a collection of ids', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const setSpy = mock.method(test._store, 'set');
      test.set({ foo123abc: 'test' }, ['123abc'], params);
      assert.deepStrictEqual(setSpy.mock.calls[0].arguments.slice(1), [['123abc'], { foo123abc: 'test' }]);
    });

    test('should throw if ids are not passed', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      assert.throws(() => test.set({ foo123abc: 'test' }, undefined, params), 'Missing required argument id list in batcher #set.');
    });
  });

  describe('clear', () => {
    test('should return clear value', () => {
      const test = root({ resolver: noop });
      const clearSpy = mock.method(test._store, 'clear');
      test.clear('123abc');
      assert.deepStrictEqual(clearSpy.mock.calls[0].arguments, ['123abc', undefined]);
    });

    test('should return clear value with params', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const clearSpy = mock.method(test._store, 'clear');
      test.clear('123abc', params);
      assert.deepStrictEqual(clearSpy.mock.calls.length > 0, true);
    });

    test('should handle multi record clear queries', () => {
      const test = root({ resolver: noop });
      const clearSpy = mock.method(test._store, 'clear');
      test.clear(['123abc', '456def', '789ghi']);
      assert.deepStrictEqual(clearSpy.mock.calls.length, 3);
    });

    test('should handle multi record clear queries with params', () => {
      const test = root({
        resolver: noop,
        delimiter: ['foo'],
      });
      const params = { foo: 'bar' };
      const clearSpy = mock.method(test._store, 'clear');
      test.clear(['123abc', '456def', '789ghi'], params);
      assert.deepStrictEqual(clearSpy.mock.calls.length, 3);
    });
  });

  describe('size', () => {
    test('should return size value', async () => {
      const test = root({ resolver: noop });
      const sizeSpy = mock.method(test._queue, 'size');
      const storeSizeSpy = mock.method(test._store, 'size');
      await test.get('123abc');
      const sizeValue = await test.size();
      assert.deepStrictEqual(sizeValue.activeBuffers, 0);
      assert.deepStrictEqual(sizeValue.pendingBuffers, 0);
      assert.deepStrictEqual(sizeSpy.mock.calls.length > 0, true);
      assert.deepStrictEqual(storeSizeSpy.mock.calls.length > 0, true);
    });

    test('should return size value and status if cache is disabled', async () => {
      const test = root({ resolver: noop, caches: null });
      const sizeSpy = mock.method(test._queue, 'size');
      const storeSizeSpy = mock.method(test._store, 'size');
      await test.get('123abc');
      const sizeValue = await test.size();
      assert.deepStrictEqual(sizeValue.activeBuffers, 0);
      assert.deepStrictEqual(sizeValue.pendingBuffers, 0);
      assert.deepStrictEqual(sizeSpy.mock.calls.length > 0, true);
      assert.deepStrictEqual(storeSizeSpy.mock.calls.length > 0, true);
    });
  });

  describe('getStorageKey', () => {
    test('should return a record key when given an id', () => {
      const test = root({ resolver: noop });
      assert.deepStrictEqual(test.getStorageKey('123abc'), '::123abc');
    });

    test('should return a record key when given an id and segregators', () => {
      const test = root({ resolver: noop, delimiter: ['language'] });
      assert.deepStrictEqual(test.getStorageKey('123abc'), 'language=undefined::123abc');
    });

    test('should return a record key when given an id, segregators and params', () => {
      const test = root({ resolver: noop, delimiter: ['language'] });
      assert.deepStrictEqual(test.getStorageKey('123abc', { language: 'fr' }), 'language="fr"::123abc');
    });

    test('should return a record key when given an id, segregators and multiple params', () => {
      const test = root({ resolver: noop, delimiter: ['language', 'country'] });
      assert.deepStrictEqual(test.getStorageKey('123abc', { language: 'fr', country: 'FR' }), 'language="fr";country="FR"::123abc');
    });
  });
});
