/**
 * Caching feature integration tests
 */

/* Requires ------------------------------------------------------------------*/

const expect = require('chai').expect;
const sinon = require('sinon');
const dao = require('./utils/dao');
const store = require('../../src/index');

/* Tests ---------------------------------------------------------------------*/

describe('Caching', () => {
  describe('Happy responses', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
      });
    });

    it('should cache single values', () => {
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', () => {
      testStore.getMany(['abc', 'foo'])
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single values without batching', () => {
      testStore.config.batch = null;
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values without batching', () => {
      testStore.config.batch = null;
      testStore.getMany(['abc', 'foo'])
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache single calls with params', () => {
      testStore.get('foo', { language: 'fr' });
      return testStore.get('foo', { language: 'fr' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: 'fr' });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo'], { language: 'fr' });
        });
    });

    it('should not return cached values forunique params mismatches', () => {
      testStore.get('foo', { language: 'fr' });
      return testStore.get('foo', { language: 'en' })
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo' , language: 'en' });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo'], { language: 'en' });
        });
    });

    it('should support disabled caching after boot', () => {
      testStore.config.cache = null;
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo']);
        });
    });

    it('should support disabled caching and batching after boot', () => {
      testStore.config.cache = null;
      testStore.config.batch = null;
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .twice()
            .withArgs(['foo']);
        });
    });
  });

  describe('Happy responses - disabled caching', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        cache: null,
      });
    });

    it('should cache single values', () => {
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', () => {
      testStore.getMany(['abc', 'foo'])
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });
  });

  describe('Happy responses - disabled batching', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        batch: null,
      });
    });

    it('should cache single values', () => {
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', () => {
      testStore.getMany(['abc', 'foo'])
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });
  });

  describe('Happy responses - everything disabled', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getAssets,
        cache: null,
        batch: null,
      });
    });

    it('should cache single values', () => {
      testStore.get('foo');
      return testStore.get('foo')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'foo', language: null });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });

    it('should cache multi values', () => {
      testStore.getMany(['abc', 'foo'])
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .exactly(1)
            .withArgs(['foo', 'abc']);
        });
    });
  });

  describe('Empty responses', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getEmptyGroup,
      });
    });

    it('should cache empty single values', () => {
      testStore.get('foo');
      return testStore.get('abc')
        .then((result) => {
          expect(result).to.be.undefined;
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch empty multi values', () => {
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: undefined }, foo: { status: 'fulfilled', value: undefined } });
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should support disabled caching', () => {
      testStore.config.batch = null;
      testStore.get('foo');
      return testStore.get('abc')
        .then((result) => {
          expect(result).to.be.undefined;
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['abc']);
        });
    });
  });

  describe('Partial responses', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        batch: {},
        delimiter: ['language'],
        resolver: dao.getPartialGroup,
      });
    });

    it('should cache all the results on mixed responses', () => {
      return testStore.getMany(['abc', 'foo', 'bar'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: undefined }, bar: { status: 'fulfilled', value: undefined } });
          mockSource.expects('getPartialGroup')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
        });
    });

    it('should support disabled caching', () => {
      testStore.config.batch = null;
      testStore.get('foo');
      return testStore.get('abc')
        .then((result) => {
          expect(result).to.deep.equal({ id: 'abc', language: null });
          mockSource.expects('getPartialGroup')
            .once()
            .withArgs(['abc']);
        });
    });
  });

  describe('Rejected requests', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getFailedRequest,
      });
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

  describe('Failed requests', () => {
    let testStore;
    let mockSource;
    afterEach(() => {
      testStore = null;
      mockSource.restore();
    });
    beforeEach(() => {
      mockSource = sinon.mock(dao);
      testStore = store({
        delimiter: ['language'],
        resolver: dao.getErroredRequest,
      });
    });

    it('should not cache on rejected requests', () => {
      testStore.config.retry = { base: 1, steps: 1, limit: 1 };
      return testStore.get('abc', { language: 'fr' })
        .then(null, (error) => {
          expect(error).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
          mockSource.expects('getErroredRequest')
            .once().withArgs(['abc'], { language: 'fr' });
        });
    });

    it('should properly reject with disabled batching', () => {
      testStore.config.retry = null;
      testStore.config.batch = null;
      return testStore.get('abc')
        .then(null, (error) => {
          expect(error).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
          mockSource.expects('getErroredRequest')
            .once()
            .withArgs(['abc']);
        });
    });
  });
});