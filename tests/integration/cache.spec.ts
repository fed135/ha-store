/**
 * Caching feature integration tests
 */
import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as dao from './utils/dao.ts';
import store, { caches } from '../../src/index.ts';

describe('Caching', () => {
  describe('Happy responses', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach((t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: [
          caches.inMemory(),
        ],
      });
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache single values without batching', async () => {
      testStore.config.batch = null;
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      const result = await testStore.get('foo', { language: 'fr' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'fr' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getAssetsSpy.mock.calls[0].arguments, [['foo'], { language: 'fr' }, [null]]);
    });

    test('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      const result = await testStore.get('foo', { language: 'en' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'en' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching after boot', async () => {
      testStore.config.caches = [];
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching and batching after boot', async () => {
      testStore.config.caches = [];
      testStore.config.batch = null;
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });
  });

  describe('Happy responses - disabled caching', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach((t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: null,
      });
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });
  });

  describe('Happy responses - disabled batching', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach((t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: [
          caches.inMemory(),
        ],
        batch: null,
      });
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });
  });

  describe('Happy responses - everything disabled', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach((t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: null,
        batch: null,
      });
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });
  });

  describe('Empty responses', () => {
    let testStore: any;
    let getEmptyGroupSpy: test.Mock<any>;

    beforeEach((t) => {
      getEmptyGroupSpy = t.mock.fn(dao.getEmptyGroup);
      testStore = store({
        delimiter: ['language'],
        resolver: getEmptyGroupSpy,
      });
    });

    test('should cache empty single values', async () => {
      await testStore.get('foo');
      const result = await testStore.get('abc');

      assert.deepStrictEqual(result, undefined);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 2);
    });

    test('should batch empty multi values', async () => {
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: undefined },
        foo: { status: 'fulfilled', value: undefined },
      });
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });

    test('should support disabled caching', async () => {
      testStore.config.batch = null;
      await testStore.get('foo');
      const result = await testStore.get('abc');

      assert.deepStrictEqual(result, undefined);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 2);
    });
  });

  describe('Partial responses', () => {
    let testStore: any;
    let getPartialGroupSpy: test.Mock<any>;

    beforeEach((t) => {
      getPartialGroupSpy = t.mock.fn(dao.getPartialGroup);
      testStore = store({
        batch: {},
        caches: [caches.inMemory()],
        delimiter: ['language'],
        resolver: getPartialGroupSpy,
      });
    });

    test('should cache all the results on mixed responses', async () => {
      const result = await testStore.getMany(['abc', 'foo', 'bar']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: undefined },
        bar: { status: 'fulfilled', value: undefined },
      });
      assert.deepStrictEqual(getPartialGroupSpy.mock.calls.length, 1);
    });

    test('should support disabled batching', async () => {
      testStore.config.batch = null;
      await testStore.get('foo');
      const result = await testStore.get('abc');

      assert.deepStrictEqual(result, { id: 'abc', language: null });
      assert.deepStrictEqual(getPartialGroupSpy.mock.calls.length, 2);
    });
  });

  describe('Rejected requests', () => {
    let testStore: any;
    let getFailedRequestSpy: test.Mock<any>;

    beforeEach((t) => {
      getFailedRequestSpy = t.mock.fn(dao.getFailedRequest);
      testStore = store({
        delimiter: ['language'],
        resolver: getFailedRequestSpy,
        caches: [
          caches.inMemory(),
        ],
      });
    });

    test('should not cache failed requests', async () => {
      await assert.rejects(testStore.get('abc', { language: 'fr' }), { error: 'Something went wrong' });
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls[0].arguments, [['abc'], { language: 'fr' }, [null]]);
    });

    test('should not cache failed multi requests', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      assert.deepStrictEqual(result.abc.status, 'rejected');
      assert.deepStrictEqual(result.abc.reason, { error: 'Something went wrong' });
      assert.deepStrictEqual(result.foo.status, 'rejected');
      assert.deepStrictEqual(result.foo.reason, { error: 'Something went wrong' });
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls[0].arguments, [['abc', 'foo'], { language: 'en' }, [null]]);
    });

    test('should properly reject with disabled batching', async () => {
      testStore.config.batch = null;
      await assert.rejects(testStore.get('abc'), { error: 'Something went wrong' });
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls[0].arguments, [['abc'], {}, [null]]);
    });
  });

  describe('Failed requests', () => {
    let testStore: any;
    let getErroredRequestSpy: test.Mock<any>;

    beforeEach((t) => {
      getErroredRequestSpy = t.mock.fn(dao.getErroredRequest);
      testStore = store({
        delimiter: ['language'],
        resolver: getErroredRequestSpy,
        caches: [
          caches.inMemory(),
        ],
      });
    });

    test('should not cache on rejected requests', async () => {
      await assert.rejects(testStore.get('abc', { language: 'fr' }), new Error('Something went wrong'));
      assert.deepStrictEqual(getErroredRequestSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getErroredRequestSpy.mock.calls[0].arguments, [['abc'], { language: 'fr' }, [null]]);
    });

    test('should properly reject with disabled batching', async () => {
      testStore.config.batch = null;
      await assert.rejects(testStore.get('abc'), new Error('Something went wrong'));
      assert.deepStrictEqual(getErroredRequestSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getErroredRequestSpy.mock.calls[0].arguments, [['abc'], {}, [null]]);
    });
  });
});
