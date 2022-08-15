/**
 * Batching feature integration tests
 */

/* Requires ------------------------------------------------------------------*/

const expect = require('chai').expect;
const sinon = require('sinon');
const dao = require('./utils/dao');
const store = require('../../src/index');

/* Tests ---------------------------------------------------------------------*/

describe('Batching', () => {
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

    it('should batch single calls', () => {
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch multi calls', () => {
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } });
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch mixed calls', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: { id: 'bar', language: null } }, foo: { status: 'fulfilled', value: { id: 'foo', language: null } } }, { id: 'abc', language: null }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
        });
    });

    it('should mix unique params matches', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } }, foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } } }, { id: 'abc', language: 'fr' }]);
          mockSource.expects('getAssets')
            .once().withArgs(['foo', 'bar', 'abc'], { language: 'fr' });
        });
    });

    it('should not mix unique params mismatches', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: { id: 'bar', language: 'fr' } }, foo: { status: 'fulfilled', value: { id: 'foo', language: 'fr' } } }, { id: 'abc', language: 'en' }]);
          mockSource.expects('getAssets')
            .once().withArgs(['abc'], { language: 'en' })
            .once().withArgs(['foo', 'bar'], { language: 'fr' });
        });
    });

    it('should coalesce duplicate entries', () => {
      return Promise.all([
        testStore.get('foo', { language: 'fr' }),
        testStore.get('foo', { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: 'fr' }, { id: 'foo', language: 'fr' }]);
          mockSource.expects('getAssets')
            .once().withArgs(['foo'], { language: 'fr' });
        });
    });

    it('should maintain id ordering with numeric ids', () => {
      return Promise.all([
        testStore.get(2, { language: 'fr' }),
        testStore.get(1, { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 2, language: 'fr' }, { id: 1, language: 'fr' }]);
          mockSource.expects('getAssets')
            .once().withArgs(['2', '1'], { language: 'fr' });
        });
    });

    it('should properly bucket large requests', () => {
      testStore.config.batch = { limit: 2, delay: 1 };
      return testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' })
        .then((result) => {
          expect(result).to.deep.equal({
            foo: { status: 'fulfilled', value: { id: 'foo', language: 'en' } },
            bar: { status: 'fulfilled', value: { id: 'bar', language: 'en' } },
            abc: { status: 'fulfilled', value: { id: 'abc', language: 'en' } },
            def: { status: 'fulfilled', value: { id: 'def', language: 'en' } },
            ghi: { status: 'fulfilled', value: { id: 'ghi', language: 'en' } },
          });

          mockSource.expects('getAssets')
            .once().withArgs(['foo', 'bar'], { language: 'en' })
            .once().withArgs(['abc', 'def'], { language: 'en' })
            .once().withArgs(['ghi'], { language: 'en' });
        });
    });

    it('should properly bucket very large requests (optimal batch size)', () => {
      testStore.config.batch = { limit: 6, delay: 1 };
      return Promise.all([
        testStore.getMany(['foo2', 'bar2', 'abc2', 'def2', 'ghi2']),
        testStore.getMany(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{
            foo2: { status: 'fulfilled', value: { id: 'foo2', language: null } },
            bar2: { status: 'fulfilled', value: { id: 'bar2', language: null } },
            abc2: { status: 'fulfilled', value: { id: 'abc2', language: null } },
            def2: { status: 'fulfilled', value: { id: 'def2', language: null } },
            ghi2: { status: 'fulfilled', value: { id: 'ghi2', language: null } },
          },{
            foo: { status: 'fulfilled', value: { id: 'foo', language: 'en' } },
            bar: { status: 'fulfilled', value: { id: 'bar', language: 'en' } },
            abc: { status: 'fulfilled', value: { id: 'abc', language: 'en' } },
            def: { status: 'fulfilled', value: { id: 'def', language: 'en' } },
            ghi: { status: 'fulfilled', value: { id: 'ghi', language: 'en' } },
          }]);
          mockSource.expects('getAssets')
            .once().withArgs(['foo2', 'bar2', 'abc2', 'def2', 'ghi2', 'foo'])
            .once().withArgs(['bar', 'abc', 'def', 'ghi'], { language: 'en' })
        });
    });

    it('should accumulate batch data', () => {
      return Promise.all([
        testStore.get('foo', null, '1234567890'),
        testStore.get('foo', null, '2345678901'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: null }, { id: 'foo', language: null }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['abc'], null, ['1234567890', '2345678901']);
        });
    });

    it('should accumulate batch data, when batching is disabled', () => {
      testStore.config.batch = null;
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc', null, '1234567890'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['abc'], null, ['1234567890']);
        });
    });

    it('should support disabled batching', () => {
      testStore.config.batch = null;
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: null }, { id: 'abc', language: null }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['abc']);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo']);
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

    it('should batch single calls', () => {
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([undefined, undefined]);
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch multi calls', () => {
      return testStore.getMany(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: undefined }, foo: { status: 'fulfilled', value: undefined } });
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch mixed calls', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar']),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: undefined }, foo: { status: 'fulfilled', value: undefined } }, undefined]);
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
        });
    });

    it('should mix unique params matches', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: undefined }, foo: { status: 'fulfilled', value: undefined } }, undefined]);
          mockSource.expects('getEmptyGroup')
            .once().withArgs(['foo', 'bar', 'abc'], { language: 'fr' });
        });
    });

    it('should not mix unique params mismatches', () => {
      return Promise.all([
        testStore.getMany(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ bar: { status: 'fulfilled', value: undefined }, foo: { status: 'fulfilled', value: undefined } }, undefined]);
          mockSource.expects('getEmptyGroup')
            .once().withArgs(['abc'], { language: 'en' })
            .once().withArgs(['foo', 'bar'], { language: 'fr' });
        });
    });

    it('should support disabled batching', () => {
      testStore.config.batch = null;
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([undefined,undefined]);
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
        delimiter: ['language'],
        resolver: dao.getPartialGroup,
        batch: { limit: 6, delay: 1 },
      });
    });

    it('should return the valid results mixed calls', () => {
      return testStore.getMany(['abc', 'foo', 'bar'])
        .then((result) => {
          expect(result).to.deep.equal({ abc: { status: 'fulfilled', value: { id: 'abc', language: null } }, foo: { status: 'fulfilled', value: undefined }, bar: { status: 'fulfilled', value: undefined } });
          mockSource.expects('getPartialGroup')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
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

    it('should properly reject on single request', () => {
      return testStore.get('abc', { language: 'fr' })
        .then(null, (error) => {
          expect(error).to.deep.equal({ error: 'Something went wrong' });
          mockSource.expects('getFailedRequest')
            .once().withArgs(['abc'], { language: 'fr' });
        });
    });

    it('should properly reject on multi request', () => {
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

    it('should properly reject on single request', () => {
      return testStore.get('abc', { language: 'fr' })
        .then(null, (error) => {
          expect(error).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
          mockSource.expects('getErroredRequest')
            .once().withArgs(['abc'], { language: 'fr' });
        });
    });

    it('should properly reject on multi request', () => {
      return testStore.getMany(['abc', 'foo'], { language: 'en' })
        .then((result) => {
          //expect(result).to.deep.include({ abc: { status: 'rejected', reason: new Error('Something went wrong') }, foo: { status: 'rejected', reason: new Error('Something went wrong') } });
          expect(result.abc.status).to.equal('rejected');
          expect(result.abc.reason).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
          expect(result.foo.status).to.equal('rejected');
          expect(result.foo.reason).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
        },
        (error) => {
          expect(error).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
          mockSource.expects('getErroredRequest')
            .once().withArgs(['abc', 'foo'], { language: 'en' });
        });
    });

    it('should properly reject with disabled batching', () => {
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

  describe('Mixed multi requests', () => {
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
        resolver: dao.getFailOnFoo,
        batch: { limit: 1 },
      });
    });

    it('should properly return a mix of valid items and errors', () => {
      return testStore.getMany(['abc', 'foo'], { language: 'en' })
        .then((result) => {
          expect(result.abc).to.deep.equal({ status: 'fulfilled', value: { id: 'abc', language: 'en' } });
          expect(result.foo.status).to.equal('rejected');
          expect(result.foo.reason).to.be.instanceOf(Error).with.property('message', 'Something went wrong');
        });
    });
  });
});