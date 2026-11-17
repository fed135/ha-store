/**
 * Batching feature integration tests
 */
import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as dao from './utils/dao.ts';
import store from '../../src/index.ts';

describe('Batching', () => {
  describe('Happy responses', () => {
    let testStore: any;
    let getAssetsSpy: test.Mock<any>;

    beforeEach((t) => {
      getAssetsSpy = t.mock.fn(dao.getAssets);

      testStore = store({
        delimiter: ['language'],
        resolver: getAssetsSpy,
        batch: { limit: 100 },
      });
    });

    test('should batch single calls', async () => {
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [{ id: 'foo', language: null }, { id: 'abc', language: null }]);
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should batch multi calls', async () => {
      const result = await testStore.getMany(['abc', 'foo']);
      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should batch mixed calls', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: null } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
        },
        { id: 'abc', language: null },
      ]);
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should mix unique params matches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } },
        },
        { id: 'abc', language: 'fr' },
      ]);
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should not mix unique params mismatches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } },
        },
        { id: 'abc', language: 'en' },
      ]);
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 2);
    });

    test('should coalesce duplicate entries', async () => {
      const result = await Promise.all([
        testStore.get('foo', { language: 'fr' }),
        testStore.get('foo', { language: 'fr' }),
      ]);

      assert.deepStrictEqual(result, [{ id: 'foo', language: 'fr' }, { id: 'foo', language: 'fr' }]);
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 1);
    });

    test('should maintain id ordering with numeric ids', async () => {
      const result = await Promise.all([
        testStore.get(2, { language: 'fr' }),
        testStore.get(1, { language: 'fr' }),
      ]);

      assert.deepStrictEqual(result, [{ id: 2, language: 'fr' }, { id: 1, language: 'fr' }]);
    });

    test('should properly bucket large requests', async () => {
      testStore.config.batch = { limit: 2, delay: 1 };
      const result = await testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' });

      assert.deepStrictEqual(result, {
        foo: { status: 'fulfilled', value: { id: 'foo', language: 'en' } },
        bar: { status: 'fulfilled', value: { id: 'bar', language: 'en' } },
        abc: { status: 'fulfilled', value: { id: 'abc', language: 'en' } },
        def: { status: 'fulfilled', value: { id: 'def', language: 'en' } },
        ghi: { status: 'fulfilled', value: { id: 'ghi', language: 'en' } },
      });
      assert.deepStrictEqual(getAssetsSpy.mock.calls.length, 3);
    });

    test('should properly bucket very large requests (optimal batch size)', async () => {
      testStore.config.batch = { limit: 6, delay: 1 };
      const result = await Promise.all([
        testStore.getMany(['foo2', 'bar2', 'abc2', 'def2', 'ghi2']),
        testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' }),
      ]);

      assert.deepStrictEqual(result, [
        {
          foo2: { status: 'fulfilled', value: { id: 'foo2', language: null } },
          bar2: { status: 'fulfilled', value: { id: 'bar2', language: null } },
          abc2: { status: 'fulfilled', value: { id: 'abc2', language: null } },
          def2: { status: 'fulfilled', value: { id: 'def2', language: null } },
          ghi2: { status: 'fulfilled', value: { id: 'ghi2', language: null } },
        },
        {
          foo: { status: 'fulfilled', value: { id: 'foo', language: 'en' } },
          bar: { status: 'fulfilled', value: { id: 'bar', language: 'en' } },
          abc: { status: 'fulfilled', value: { id: 'abc', language: 'en' } },
          def: { status: 'fulfilled', value: { id: 'def', language: 'en' } },
          ghi: { status: 'fulfilled', value: { id: 'ghi', language: 'en' } },
        },
      ]);
    });

    test('should accumulate batch data', async () => {
      const result = await Promise.all([
        testStore.get('foo', null, '1234567890'),
        testStore.get('foo', null, '2345678901'),
      ]);

      assert.deepStrictEqual(result, [{ id: 'foo', language: null }, { id: 'foo', language: null }]);
    });

    test('should accumulate batch data, when batching is disabled', async () => {
      testStore.config.batch = null;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc', null, '1234567890'),
      ]);

      assert.deepStrictEqual(result, [{ id: 'foo', language: null }, { id: 'abc', language: null }]);
    });

    test('should support disabled batching', async () => {
      testStore.config.batch = null;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [{ id: 'foo', language: null }, { id: 'abc', language: null }]);
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
        batch: {},
      });
    });

    test('should batch single calls', async () => {
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [undefined, undefined]);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });

    test('should batch multi calls', async () => {
      const result = await testStore.getMany(['abc', 'foo']);
      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: undefined },
        foo: { status: 'fulfilled', value: undefined },
      });
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });

    test('should batch mixed calls', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });

    test('should mix unique params matches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });

    test('should not mix unique params mismatches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ]);

      assert.deepStrictEqual(result, [
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 2);
    });

    test('should support disabled batching', async () => {
      testStore.config.batch = null;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      assert.deepStrictEqual(result, [undefined, undefined]);
      // TODO: if we remove the Timeout of 0 on batching disabled stores, this should be 2 calls.
      assert.deepStrictEqual(getEmptyGroupSpy.mock.calls.length, 1);
    });
  });

  describe('Partial responses', () => {
    let testStore: any;
    let getPartialGroupSpy: test.Mock<any>;

    beforeEach((t) => {
      getPartialGroupSpy = t.mock.fn(dao.getPartialGroup);
      testStore = store({
        delimiter: ['language'],
        resolver: getPartialGroupSpy,
        batch: { limit: 6, delay: 1 },
      });
    });

    test('should return the valid results mixed calls', async () => {
      const result = await testStore.getMany(['abc', 'foo', 'bar']);
      assert.deepStrictEqual(result, {
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: undefined },
        bar: { status: 'fulfilled', value: undefined },
      });
      assert.deepStrictEqual(getPartialGroupSpy.mock.calls.length, 1);
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
        batch: {},
      });
    });

    test('should properly reject on single request', () => {
      assert.rejects(testStore.get('abc', { language: 'fr' }), { error: 'Something went wrong' });
    });

    test('should properly reject on multi request', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      assert.deepStrictEqual(result.abc.status, 'rejected');
      assert.deepStrictEqual(result.abc.reason, { error: 'Something went wrong' });
      assert.deepStrictEqual(result.foo.status, 'rejected');
      assert.deepStrictEqual(result.foo.reason, { error: 'Something went wrong' });
      assert.deepStrictEqual(getFailedRequestSpy.mock.calls.length, 1);
    });

    test('should properly reject with disabled batching', () => {
      testStore.config.batch = null;
      assert.rejects(testStore.get('abc'), { error: 'Something went wrong' });
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
        batch: {},
      });
    });

    test('should properly reject on single request', () => {
      assert.rejects(testStore.get('abc', { language: 'fr' }), new Error('Something went wrong'));
    });

    test('should properly reject on multi request', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      assert.deepStrictEqual(result.abc.status, 'rejected');
      assert.deepStrictEqual(result.abc.reason instanceof Error, true);
      assert.deepStrictEqual(result.abc.reason.message, 'Something went wrong');
      assert.deepStrictEqual(result.foo.status, 'rejected');
      assert.deepStrictEqual(result.foo.reason instanceof Error, true);
      assert.deepStrictEqual(result.foo.reason.message, 'Something went wrong');
      assert.deepStrictEqual(getErroredRequestSpy.mock.calls.length, 1);
    });

    test('should properly reject with disabled batching', () => {
      testStore.config.batch = null;
      assert.rejects(testStore.get('abc'), new Error('Something went wrong'));
    });
  });

  describe('Mixed multi requests', () => {
    let testStore: any;
    let getFailOnFooSpy: test.Mock<any>;

    beforeEach((t) => {
      getFailOnFooSpy = t.mock.fn(dao.getFailOnFoo);
      testStore = store({
        delimiter: ['language'],
        resolver: getFailOnFooSpy,
        batch: { limit: 1 },
      });
    });

    test('should properly return a mix of valid items and errors', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      assert.deepStrictEqual(result.abc, { status: 'fulfilled', value: { id: 'abc', language: 'en' } });
      assert.deepStrictEqual(result.foo.status, 'rejected');
      assert.deepStrictEqual(result.foo.reason instanceof Error, true);
      assert.deepStrictEqual(result.foo.reason.message, 'Something went wrong');
      assert.deepStrictEqual(getFailOnFooSpy.mock.calls.length, 2);
    });
  });
});
