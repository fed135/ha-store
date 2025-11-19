/**
 * Batching feature integration tests
 */

import * as dao from './utils/dao';
import store from '../../src/index';

describe('Batching', () => {
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
        batch: { enabled: true },
      });
    });

    it('should batch single calls', async () => {
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
    });

    it('should batch multi calls', async () => {
      const result = await testStore.getMany(['abc', 'foo']);
      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
      });
    });

    it('should batch mixed calls', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: null } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: null } },
        },
        { id: 'abc', language: null },
      ]);
    });

    it('should mix unique params matches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } },
        },
        { id: 'abc', language: 'fr' },
      ]);
    });

    it('should not mix unique params mismatches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } },
          foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } },
        },
        { id: 'abc', language: 'en' },
      ]);
    });

    it('should coalesce duplicate entries', async () => {
      const result = await Promise.all([
        testStore.get('foo', { language: 'fr' }),
        testStore.get('foo', { language: 'fr' }),
      ]);

      expect(result).toEqual([{ id: 'foo', language: 'fr' }, { id: 'foo', language: 'fr' }]);
    });

    it('should maintain id ordering with numeric ids', async () => {
      const result = await Promise.all([
        testStore.get(2, { language: 'fr' }),
        testStore.get(1, { language: 'fr' }),
      ]);

      expect(result).toEqual([{ id: 2, language: 'fr' }, { id: 1, language: 'fr' }]);
    });

    it('should properly bucket large requests', async () => {
      testStore.config.batch = { limit: 2, delay: 1 };
      const result = await testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' });

      expect(result).toEqual({
        foo: { status: 'fulfilled', value: { id: 'foo', language: 'en' } },
        bar: { status: 'fulfilled', value: { id: 'bar', language: 'en' } },
        abc: { status: 'fulfilled', value: { id: 'abc', language: 'en' } },
        def: { status: 'fulfilled', value: { id: 'def', language: 'en' } },
        ghi: { status: 'fulfilled', value: { id: 'ghi', language: 'en' } },
      });
    });

    it('should properly bucket very large requests (optimal batch size)', async () => {
      testStore.config.batch = { limit: 6, delay: 1 };
      const result = await Promise.all([
        testStore.getMany(['foo2', 'bar2', 'abc2', 'def2', 'ghi2']),
        testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' }),
      ]);

      expect(result).toEqual([
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

    it('should accumulate batch data', async () => {
      const result = await Promise.all([
        testStore.get('foo', null, '1234567890'),
        testStore.get('foo', null, '2345678901'),
      ]);

      expect(result).toEqual([{ id: 'foo', language: null }, { id: 'foo', language: null }]);
    });

    it('should accumulate batch data, when batching is disabled', async () => {
      testStore.config.batch.enabled = false;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc', null, '1234567890'),
      ]);

      expect(result).toEqual([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
    });

    it('should support disabled batching', async () => {
      testStore.config.batch.enabled = false;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
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
        batch: { enabled: true },
      });
    });

    it('should batch single calls', async () => {
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([undefined, undefined]);
    });

    it('should batch multi calls', async () => {
      const result = await testStore.getMany(['abc', 'foo']);
      expect(result).toEqual({
        abc: { status: 'fulfilled', value: undefined },
        foo: { status: 'fulfilled', value: undefined },
      });
    });

    it('should batch mixed calls', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
    });

    it('should mix unique params matches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
    });

    it('should not mix unique params mismatches', async () => {
      const result = await Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ]);

      expect(result).toEqual([
        {
          bar: { status: 'fulfilled', value: undefined },
          foo: { status: 'fulfilled', value: undefined },
        },
        undefined,
      ]);
    });

    it('should support disabled batching', async () => {
      testStore.config.batch.enabled = false;
      const result = await Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ]);

      expect(result).toEqual([undefined, undefined]);
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
        delimiter: ['language'],
        resolver: dao.getPartialGroup,
        batch: { limit: 6, delay: 1, enabled: true },
      });
    });

    it('should return the valid results mixed calls', async () => {
      const result = await testStore.getMany(['abc', 'foo', 'bar']);
      expect(result).toEqual({
        abc: { status: 'fulfilled', value: { id: 'abc', language: null } },
        foo: { status: 'fulfilled', value: undefined },
        bar: { status: 'fulfilled', value: undefined },
      });
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
        batch: { enabled: true },
      });
    });

    it('should properly reject on single request', async () => {
      await expect(testStore.get('abc', { language: 'fr' }))
        .rejects.toEqual({ error: 'Something went wrong' });
    });

    it('should properly reject on multi request', async () => {
      await expect(testStore.getMany(['abc', 'foo'], { language: 'en' }))
        .rejects.toEqual({ error: 'Something went wrong' });
    });

    it('should properly reject with disabled batching', async () => {
      testStore.config.batch.enabled = false;
      await expect(testStore.get('abc'))
        .rejects.toEqual({ error: 'Something went wrong' });
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
        batch: { enabled: true },
      });
    });

    it('should properly reject on single request', async () => {
      await expect(testStore.get('abc', { language: 'fr' }))
        .rejects.toThrow('Something went wrong');
    });

    it('should properly reject on multi request', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      expect(result.abc.status).toBe('rejected');
      expect(result.abc.reason).toBeInstanceOf(Error);
      expect(result.abc.reason.message).toBe('Something went wrong');
      expect(result.foo.status).toBe('rejected');
      expect(result.foo.reason).toBeInstanceOf(Error);
      expect(result.foo.reason.message).toBe('Something went wrong');
    });

    it('should properly reject with disabled batching', async () => {
      testStore.config.batch.enabled = false;
      await expect(testStore.get('abc'))
        .rejects.toThrow('Something went wrong');
    });
  });

  describe('Mixed multi requests', () => {
    let testStore: any;
    let getFailOnFooSpy: jest.SpyInstance;

    afterEach(() => {
      testStore = null;
      if (getFailOnFooSpy) {
        getFailOnFooSpy.mockRestore();
      }
    });

    beforeEach(() => {
      getFailOnFooSpy = jest.spyOn(dao, 'getFailOnFoo');
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getFailOnFoo,
        batch: { limit: 1, enabled: true },
      });
    });

    it('should properly return a mix of valid items and errors', async () => {
      const result = await testStore.getMany(['abc', 'foo'], { language: 'en' });
      expect(result.abc).toEqual({ status: 'fulfilled', value: { id: 'abc', language: 'en' } });
      expect(result.foo.status).toBe('rejected');
      expect(result.foo.reason).toBeInstanceOf(Error);
      expect(result.foo.reason.message).toBe('Something went wrong');
    });
  });
});
