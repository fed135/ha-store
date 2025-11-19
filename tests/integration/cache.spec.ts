/**
 * Caching feature integration tests
 */

import * as dao from './utils/dao';
import store from '../../src/index';

describe('Caching', () => {
  describe('Happy responses', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
      });
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single values without batching', async () => {
      testStore.config.batch.enabled = false;
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values without batching', async () => {
      testStore.config.batch.enabled = false;
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      const result = await testStore.get('foo', { language: 'fr' });

      expect(result).toEqual({ id: 'foo', language: 'fr' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
      expect(getAssetsSpy).toHaveBeenCalledWith(['foo'], { language: 'fr' });
    });

    it('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      const result = await testStore.get('foo', { language: 'en' });

      expect(result).toEqual({ id: 'foo', language: 'en' });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching after boot', async () => {
      testStore.config.cache.enabled = false;
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should support disabled caching and batching after boot', async () => {
      testStore.config.cache.enabled = false;
      testStore.config.batch.enabled = false;
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Happy responses - disabled caching', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        cache: null,
      });
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Happy responses - disabled batching', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        batch: null,
      });
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Happy responses - everything disabled', () => {
    let testStore: any;
    let getAssetsSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getAssetsSpy) {
        getAssetsSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getAssetsSpy = jest.spyOn(dao, 'getAssets');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        cache: null,
        batch: null,
      });
    });

    it('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      expect(result).toEqual({ id: 'foo', language: null });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });

    it('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      expect(getAssetsSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty responses', () => {
    let testStore: any;
    let getEmptyGroupSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getEmptyGroupSpy) {
        getEmptyGroupSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getEmptyGroupSpy = jest.spyOn(dao, 'getEmptyGroup');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getEmptyGroup,
      });
    });

    it('should cache empty single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('abc');

      expect(result).toBeUndefined();
      expect(getEmptyGroupSpy).toHaveBeenCalledTimes(2);
    });

    it('should batch empty multi values', async () => {
      const result = await testStore.getMany(['abc', 'foo']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: undefined },
        foo: { status: 'fulfilled', value: undefined },
      });
      expect(getEmptyGroupSpy).toHaveBeenCalledTimes(1);
    });

    it('should support disabled caching', async () => {
      testStore.config.batch.enabled = false;
      await testStore.get('foo');
      const result = await testStore.get('abc');

      expect(result).toBeUndefined();
      expect(getEmptyGroupSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Partial responses', () => {
    let testStore: any;
    let getPartialGroupSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getPartialGroupSpy) {
        getPartialGroupSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getPartialGroupSpy = jest.spyOn(dao, 'getPartialGroup');
      testStore = store({
        batch: { enabled: true },
        cache: { enabled: true, tiers: [ { }] },
        delimiter: ['language'],
        resolver: dao.getPartialGroup,
      });
    });

    it('should cache all the results on mixed responses', async () => {
      const result = await testStore.getMany(['abc', 'foo', 'bar']);

      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: undefined },
        bar: { status: 'fulfilled', value: undefined },
      });
      expect(getPartialGroupSpy).toHaveBeenCalledTimes(1);
    });

    it('should support disabled batching', async () => {
      testStore.config.batch.enabled = false;
      await testStore.get('foo');
      const result = await testStore.get('abc');

      expect(result).toEqual({ id: 'abc', language: null });
      expect(getPartialGroupSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rejected requests', () => {
    let testStore: any;
    let getFailedRequestSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getFailedRequestSpy) {
        getFailedRequestSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getFailedRequestSpy = jest.spyOn(dao, 'getFailedRequest');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getFailedRequest,
      });
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
      testStore.config.batch.enabled = false;
      await expect(testStore.get('abc'))
        .rejects.toEqual({ error: 'Something went wrong' });
      expect(getFailedRequestSpy).toHaveBeenCalledTimes(1);
      expect(getFailedRequestSpy).toHaveBeenCalledWith(['abc']);
    });
  });

  describe('Failed requests', () => {
    let testStore: any;
    let getErroredRequestSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getErroredRequestSpy) {
        getErroredRequestSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getErroredRequestSpy = jest.spyOn(dao, 'getErroredRequest');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getErroredRequest,
      });
    });

    it('should not cache on rejected requests', async () => {
      await expect(testStore.get('abc', { language: 'fr' }))
        .rejects.toThrow('Something went wrong');
      expect(getErroredRequestSpy).toHaveBeenCalledTimes(1);
      expect(getErroredRequestSpy).toHaveBeenCalledWith(['abc'], { language: 'fr' });
    });

    it('should properly reject with disabled batching', async () => {
      testStore.config.batch.enabled = false;
      await expect(testStore.get('abc'))
        .rejects.toThrow('Something went wrong');
      expect(getErroredRequestSpy).toHaveBeenCalledTimes(1);
      expect(getErroredRequestSpy).toHaveBeenCalledWith(['abc']);
    });
  });
});
