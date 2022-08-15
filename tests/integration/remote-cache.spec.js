/**
 * Remote Caching feature integration tests
 */

/* Requires ------------------------------------------------------------------*/

const expect = require('chai').expect;
const sinon = require('sinon');
const dao = require('./utils/dao');
const {sleep} = require('./utils/testUtils');
const store = require('../../src/index');
const remote = require('ha-store-redis');
const local = require('../../src/stores/in-memory');

/* Tests ---------------------------------------------------------------------*/

describe('Remote Caching', () => {
  describe('Happy remote-only responses', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(async () => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        stores: [{
          store: remote(Math.random().toString(36), '//0.0.0.0:6379'),
        }],
      });
      await testStore.clear('*');
    });

    it('should cache single values', async () => {
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', async () => {
      testStore.getMany(['abc', 'foo'])
      await sleep(10);
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single values without batching', async () => {
      testStore.config.batch = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      testStore.getMany(['abc', 'foo'])
      await sleep(10);
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single calls with params', async () => {
      testStore.get('foo', { language: 'fr' });
      await sleep(10);
      return testStore.get('foo', { language: 'fr' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: 'fr' });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo'], { language: 'fr' });
        });
    });

    it('should not return cached values forunique params mismatches', async () => {
      testStore.get('foo', { language: 'fr' });
      await sleep(10);
      return testStore.get('foo', { language: 'en' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo' , language: 'en' });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo'], { language: 'en' });
        });
    });

    it('should support disabled caching after boot', async () => {
      testStore.config.cache = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo']);
        });
    });

    it('should support disabled caching and batching after boot', async () => {
      testStore.config.cache = null;
      testStore.config.batch = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .twice()
            .withArgs(['foo']);
        });
    });
  });

  describe('Happy hybrid-caching responses', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(async () => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        cache: {
          enabled: true,
          tiers: [
            {store: local},
            {store: remote(Math.random().toString(36), '//0.0.0.0:6379')},
          ],
        },
      });
      await testStore.clear('*');
    });

    it('remote cache should be populated', async () => {
      await testStore.get('foo');
      await sleep(10);
      return testStore.size()
        .then((result) => {
          expect(result).to.deep.equal({ 
            activeBuffers: 0,
            pendingBuffers: 0,
            records: { local: 1, remote: 1 },
          });
        });
    });

    it('should cache single values', async () => {
      testStore.get('foo')
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', async () => {
      testStore.getMany(['abc', 'foo'])
      await sleep(10);
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single values without batching', async () => {
      testStore.config.batch = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values without batching', async () => {
      testStore.config.batch = null;
      testStore.getMany(['abc', 'foo'])
      await sleep(10);
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single calls with params', async () => {
      testStore.get('foo', { language: 'fr' });
      await sleep(10);
      return testStore.get('foo', { language: 'fr' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: 'fr' });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo'], { language: 'fr' });
        });
    });

    it('should not return cached values forunique params mismatches', async () => {
      testStore.get('foo', { language: 'fr' });
      await sleep(10);
      return testStore.get('foo', { language: 'en' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo' , language: 'en' });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo'], { language: 'en' });
        });
    });

    it('should support disabled caching after boot', async () => {
      testStore.config.cache = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo']);
        });
    });

    it('should support disabled caching and batching after boot', async () => {
      testStore.config.cache = null;
      testStore.config.batch = null;
      testStore.get('foo');
      await sleep(10);
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .twice()
            .withArgs(['foo']);
        });
    });
  });

  describe('Rejected remote requests', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(async () => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getFailedRequest,
        stores: [{
          store: remote(Math.random().toString(36), '//0.0.0.0:6379'),
        }],
      });
      await testStore.clear('*');
    });

    it('should not cache failed requests', () => {
      return testStore.get('abc', { language: 'fr' })
        .then(null, (error) => {
          expect(error).to.deep.equal({ error: 'Something went wrong' });
          mockSource.expects('getFailedRequest')
            .once().withArgs(['abc'], { language: 'fr' });
        });
    });

    it('should not cache failed multi requests', () => {
      return testStore.getMany(['abc', 'foo'], { language: 'en' })
        .then(null, (error) => {
          expect(error).to.deep.equal({ error: 'Something went wrong' });
          mockSource.expects('getFailedRequest')
            .once().withArgs(['abc', 'foo'], { language: 'en' });
        });
    });

    it('should properly reject with disabled batching', () => {
      testStore.config.batch = null;
      return testStore.get('abc')
        .then(null, (error) => {
          expect(error).to.deep.equal({ error: 'Something went wrong' });
          mockSource.expects('getFailedRequest')
            .once()
            .withArgs(['abc']);
        });
    });
  });
});