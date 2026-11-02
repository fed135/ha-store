/**
 * Remote Caching feature integration tests
 */
Error.stackTraceLimit = 20;

import { describe, test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as dao from './utils/dao.ts';
import { sleep } from './utils/testUtils.ts';
import redis from 'redis';
import store, { caches } from '../../src/index.ts';

describe('Remote Caching', () => {
  const connection = redis.createClient({ socket: { host: '0.0.0.0', port: 6379 } });

  after(async () => {
    await connection.quit();
  });

  describe('Happy remote-only responses', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach(async (t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: [
          caches.redis({ keyspace: Math.random().toString(36), connection }),
        ],
      });
      await testStore.clear('*');
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
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
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'fr' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'fr' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getAssetsSpy.mock.calls[0].arguments, [['foo'], { language: 'fr' }, [null]]);
    });

    test('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'en' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'en' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching after boot', async () => {
      testStore.config.caches = [];
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching and batching after boot', async () => {
      testStore.config.caches = [];
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });
  });

  describe('Happy hybrid-caching responses', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach(async (t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);
      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        caches: [
          caches.inMemory(),
          caches.redis({ keyspace: Math.random().toString(36), connection }),
        ],
      });
      await testStore.clear('*');
    });

    test('remote cache should be populated', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.size();

      assert.deepStrictEqual(result.records.remote, 1);
    });

    test('should cache single values', async () => {
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values', async () => {
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
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
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      await testStore.getMany(['abc', 'foo']);
      await sleep(10);
      const result = await testStore.getMany(['abc', 'foo']);

      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should cache single calls with params', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'fr' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'fr' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
      assert.deepStrictEqual(getAssetsSpy.mock.calls[0].arguments, [['foo'], { language: 'fr' }, [null]]);
    });

    test('should not return cached values forunique params mismatches', async () => {
      await testStore.get('foo', { language: 'fr' });
      await sleep(10);
      const result = await testStore.get('foo', { language: 'en' });

      assert.deepStrictEqual(result, { id: 'foo', language: 'en' });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching after boot', async () => {
      testStore.config.caches = [];
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should support disabled caching and batching after boot', async () => {
      testStore.config.caches = [];
      testStore.config.batch = null;
      await testStore.get('foo');
      await sleep(10);
      const result = await testStore.get('foo');

      assert.deepStrictEqual(result, { id: 'foo', language: null });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });
  });

  describe('Rejected remote requests', () => {
    let testStore: any;
    let getFailedRequestSpy: test.Mock<any>;

    beforeEach(async (t) => {
      getFailedRequestSpy = t.mock.fn(dao.getFailedRequest);
      testStore = store({
        delimiter: ['language'],
        resolver: getFailedRequestSpy,
        caches: [
          caches.redis({ keyspace: Math.random().toString(36), connection }),
        ],
      });
      await testStore.clear('*');
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
});
