/**
 * Remote Caching feature integration tests
 */

import * as dao from './utils/dao';
import { sleep } from './utils/testUtils';
import store, { caches } from '../../src/index';

describe('Remote Caching', () => {
  describe('Happy remote-only responses', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(async () => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        caches: [
          caches.redis({ keyspace: Math.random().toString(36), host: '0.0.0.0', port: 6379 }),
        ],
      });
      await testStore.clear('*');
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single values without batching', async () => {
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'fr' });

      expect(result).toEqual({ id: 'foo', language: 'fr' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
      expect(getAssetsSpy).toHaveBeenCalledWith(['foo'], { language: 'fr' });
    });

    it('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'en' });

      expect(result).toEqual({ id: 'foo', language: 'en' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching after boot', async () => {
      testStore.config.caches = [];
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching and batching after boot', async () => {
      testStore.config.caches = [];
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Happy hybrid-caching responses', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(async () => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        caches: [
          caches.inMemory(),
          caches.redis({ keyspace: Math.random().toString(36), host: '0.0.0.0', port: 6379 }),
        ],
      });
      await testStore.clear('*');
    });

    it('remote cache should be populated', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.size();

      expect(result.records.remote).toBeGreaterThanOrEqual(1);
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single values without batching', async () => {
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'fr' });

      expect(result).toEqual({ id: 'foo', language: 'fr' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
      expect(getAssetsSpy).toHaveBeenCalledWith(['foo'], { language: 'fr' });
    });

    it('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'en' });

      expect(result).toEqual({ id: 'foo', language: 'en' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching after boot', async () => {
      testStore.config.caches = [];
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching and batching after boot', async () => {
      testStore.config.caches = [];
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rejected remote requests', () => {
    let testStore: any;
    let getFailedRequestSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getFailedRequestSpy) {
        getFailedRequestSpy.mockRestore();
      }
    });

    beforeEach(async () => {
      getFailedRequestSpy = jest.spyOn(dao, 'getFailedRequest');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getFailedRequest,
        caches: [
          caches.redis({ keyspace: Math.random().toString(36), host: '0.0.0.0', port: 6379 }),
        ],
      });
      await testStore.clear('*');
    });

    it('should not cache failed requests', async () => {
      await expect(testStore.get('abc', { language: 'fr' }))
        .rejects.toEqual({ error: 'Something went wrong' });
      expect(getFailedRequestSpy).toHaveBeenCalledTimes(1);
      expect(getFailedRequestSpy).toHaveBeenCalledWith(['abc'], { language: 'fr' });
    });

    it('should not cache failed multi requests', async () => {
      await expect(testStore.getMany(['abc', 'foo'], { language: 'en' }))
        .rejects.toEqual({ error: 'Something went wrong' });
      expect(getFailedRequestSpy).toHaveBeenCalledTimes(1);
      expect(getFailedRequestSpy).toHaveBeenCalledWith(['abc', 'foo'], { language: 'en' });
    });

    it('should properly reject with disabled batching', async () => {
      testStore.config.batch = null;
      await expect(testStore.get('abc'))
        .rejects.toEqual({ error: 'Something went wrong' });
      expect(getFailedRequestSpy).toHaveBeenCalledTimes(1);
      expect(getFailedRequestSpy).toHaveBeenCalledWith(['abc']);
    });
  });
});
