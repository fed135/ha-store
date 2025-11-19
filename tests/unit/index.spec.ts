/**
 * Root component unit tests
 */

import { noop } from './testUtils';
import root from '../../src/index';

function checkForPublicProperties(store: any) {
  expect(store.get).toBeDefined();
  expect(store.getMany).toBeDefined();
  expect(store.set).toBeDefined();
  expect(store.clear).toBeDefined();
  expect(store.getStorageKey).toBeDefined();
  expect(store.config).toBeDefined();
}

describe('index', () => {
  describe('constructor', () => {
    it('should produce a batcher with all the expected properties when called with minimal arguments', () => {
      const test = root({ resolver: noop });
      checkForPublicProperties(test);
    });

    it('should produce a batcher with all the expected properties when called with false arguments', () => {
      const test = root({
        resolver: () => {},
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
        cache: { enabled: true, tiers: [{ ttl: 1000 }] },
        batch: { limit: 12 },
      });
      checkForPublicProperties(test);
    });

    it('should throw if called with missing required arguments', () => {
      expect(root).toThrow('config.resolver [undefined] is not a function');
    });
  });

  describe('get', () => {
    it('should handle single record queries', () => {
      const test = root({ resolver: noop });
      const getHandlesSpy = jest.spyOn(test._queue, 'getHandles');
      test.get('123abc');
      expect(getHandlesSpy).toHaveBeenCalledWith('', ['123abc'], {}, undefined);
    });

    it('should handle single record queries with params', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const getHandlesSpy = jest.spyOn(test._queue, 'getHandles');
      test.get('123abc', params);
      expect(getHandlesSpy).toHaveBeenCalledWith('foo="bar"', ['123abc'], { foo: 'bar' }, undefined);
    });

    it('should handle multi record queries', () => {
      const test = root({ resolver: noop });
      const getHandlesSpy = jest.spyOn(test._queue, 'getHandles');
      test.get(['123abc', '456def', '789ghi']);
      expect(getHandlesSpy).toHaveBeenCalledWith('', ['123abc', '456def', '789ghi'], {}, undefined);
    });

    it('should handle multi record queries with params', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const getHandlesSpy = jest.spyOn(test._queue, 'getHandles');
      test.get(['123abc', '456def', '789ghi'], params);
      expect(getHandlesSpy).toHaveBeenCalledWith('foo="bar"', ['123abc', '456def', '789ghi'], { foo: 'bar' }, undefined);
    });
  });

  describe('set', () => {
    it('should handle a collection of ids', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const setSpy = jest.spyOn(test._store, 'set');
      test.set({ foo123abc: 'test' }, ['123abc'], params);
      expect(setSpy).toHaveBeenCalledWith(expect.any(Function), ['123abc'], { foo123abc: 'test' });
    });

    it('should throw if ids are not passed', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      expect(() => test.set({ foo123abc: 'test' }, undefined, params)).toThrow('Missing required argument id list in batcher #set.');
    });
  });

  describe('clear', () => {
    it('should return clear value', () => {
      const test = root({ resolver: noop });
      const clearSpy = jest.spyOn(test._store, 'clear');
      test.clear('123abc');
      expect(clearSpy).toHaveBeenCalledWith('123abc', undefined);
    });

    it('should return clear value with params', () => {
      const test = root({ resolver: noop });
      const params = { foo: 'bar' };
      const clearSpy = jest.spyOn(test._store, 'clear');
      test.clear('123abc', params);
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle multi record clear queries', () => {
      const test = root({ resolver: noop });
      const clearSpy = jest.spyOn(test._store, 'clear');
      test.clear(['123abc', '456def', '789ghi']);
      expect(clearSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle multi record clear queries with params', () => {
      const test = root({
        resolver: noop,
        delimiter: ['foo'],
      });
      const params = { foo: 'bar' };
      const clearSpy = jest.spyOn(test._store, 'clear');
      test.clear(['123abc', '456def', '789ghi'], params);
      expect(clearSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('size', () => {
    it('should return size value', async () => {
      const test = root({ resolver: noop });
      const sizeSpy = jest.spyOn(test._queue, 'size');
      const storeSizeSpy = jest.spyOn(test._store, 'size');
      await test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).toEqual({
        activeBuffers: 0,
        pendingBuffers: 0,
        records: expect.any(Object),
      });
      expect(sizeSpy).toHaveBeenCalled();
      expect(storeSizeSpy).toHaveBeenCalled();
    });

    it('should return size value and status if cache is disabled', async () => {
      const test = root({ resolver: noop, cache: null });
      const sizeSpy = jest.spyOn(test._queue, 'size');
      const storeSizeSpy = jest.spyOn(test._store, 'size');
      await test.get('123abc');
      const sizeValue = await test.size();
      expect(sizeValue).toEqual({
        activeBuffers: 0,
        pendingBuffers: 0,
        records: expect.any(Object),
      });
      expect(sizeSpy).toHaveBeenCalled();
      expect(storeSizeSpy).toHaveBeenCalled();
    });
  });

  describe('getStorageKey', () => {
    it('should return a record key when given an id', () => {
      const test = root({ resolver: noop });
      expect(test.getStorageKey('123abc')).toBe('::123abc');
    });

    it('should return a record key when given an id and segregators', () => {
      const test = root({ resolver: noop, delimiter: ['language'] });
      expect(test.getStorageKey('123abc')).toBe('language=undefined::123abc');
    });

    it('should return a record key when given an id, segregators and params', () => {
      const test = root({ resolver: noop, delimiter: ['language'] });
      expect(test.getStorageKey('123abc', { language: 'fr' })).toBe('language="fr"::123abc');
    });

    it('should return a record key when given an id, segregators and multiple params', () => {
      const test = root({ resolver: noop, delimiter: ['language', 'country'] });
      expect(test.getStorageKey('123abc', { language: 'fr', country: 'FR' })).toBe('language="fr";country="FR"::123abc');
    });
  });
});
