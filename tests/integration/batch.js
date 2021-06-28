/**
 * Batching feature integration tests
 */

/* Requires ------------------------------------------------------------------*/

const expect = require('chai').expect;
const sinon = require('sinon');
const dao = require('./utils/dao.js');
const store = require('../../src/index.js');

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
        uniqueParams: ['language'],
        resolver: dao.getAssets,
      });
    });

    it('should batch single calls', () => {
      return Promise.all([
        testStore.get('foo'),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'foo', language: undefined }, { id: 'abc', language: undefined }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch multi calls', () => {
      return testStore.get(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'abc', language: undefined }, { id: 'foo', language: undefined }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch mixed calls', () => {
      return Promise.all([
        testStore.get(['foo', 'bar']),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[{ id: 'foo', language: undefined }, { id: 'bar', language: undefined }], { id: 'abc', language: undefined }]);
          mockSource.expects('getAssets')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
        });
    });

    it('should mix unique params matches', () => {
      return Promise.all([
        testStore.get(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[{ id: 'foo', language: 'fr' }, { id: 'bar', language: 'fr' }], { id: 'abc', language: 'fr' }]);
          mockSource.expects('getAssets')
            .once().withArgs(['foo', 'bar', 'abc'], { language: 'fr' });
        });
    });

    it('should not mix unique params mismatches', () => {
      return Promise.all([
        testStore.get(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[{ id: 'foo', language: 'fr' }, { id: 'bar', language: 'fr' }], { id: 'abc', language: 'en' }]);
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
      testStore.config.batch = { max: 2, tick: 1 };
      return testStore.get(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' })
        .then((result) => {
          expect(result).to.deep.equal([
            { id: 'foo', language: 'en' },
            { id: 'bar', language: 'en' },
            { id: 'abc', language: 'en' },
            { id: 'def', language: 'en' },
            { id: 'ghi', language: 'en' },
          ]);
          mockSource.expects('getAssets')
            .once().withArgs(['foo', 'bar'], { language: 'en' })
            .once().withArgs(['abc', 'def'], { language: 'en' })
            .once().withArgs(['ghi'], { language: 'en' });
        });
    });

    it('should properly bucket very large requests (optimal batch size)', () => {
      testStore.config.batch = { max: 6, tick: 1 };
      return Promise.all([
        testStore.get(['foo2', 'bar2', 'abc2', 'def2', 'ghi2']),
        testStore.get(['foo', 'bar', 'abc', 'def', 'ghi'], { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[
            { id: 'foo2', language: undefined },
            { id: 'bar2', language: undefined },
            { id: 'abc2', language: undefined },
            { id: 'def2', language: undefined },
            { id: 'ghi2', language: undefined },
          ],[
            { id: 'foo', language: 'en' },
            { id: 'bar', language: 'en' },
            { id: 'abc', language: 'en' },
            { id: 'def', language: 'en' },
            { id: 'ghi', language: 'en' },
          ]]);
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
          expect(result).to.deep.equal([{ id: 'foo', language: undefined }, { id: 'foo', language: undefined }]);
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
          expect(result).to.deep.equal([{ id: 'foo', language: undefined }, { id: 'abc', language: undefined }]);
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
          expect(result).to.deep.equal([{ id: 'foo', language: undefined }, { id: 'abc', language: undefined }]);
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
        uniqueParams: ['language'],
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
      return testStore.get(['abc', 'foo'])
        .then((result) => {
          expect(result).to.deep.equal([undefined, undefined]);
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'abc']);
        });
    });

    it('should batch mixed calls', () => {
      return Promise.all([
        testStore.get(['foo', 'bar']),
        testStore.get('abc'),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[undefined, undefined], undefined]);
          mockSource.expects('getEmptyGroup')
            .once()
            .withArgs(['foo', 'bar', 'abc']);
        });
    });

    it('should mix unique params matches', () => {
      return Promise.all([
        testStore.get(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'fr' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[undefined, undefined], undefined]);
          mockSource.expects('getEmptyGroup')
            .once().withArgs(['foo', 'bar', 'abc'], { language: 'fr' });
        });
    });

    it('should not mix unique params mismatches', () => {
      return Promise.all([
        testStore.get(['foo', 'bar'], { language: 'fr' }),
        testStore.get('abc', { language: 'en' }),
      ])
        .then((result) => {
          expect(result).to.deep.equal([[undefined, undefined], undefined]);
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
        uniqueParams: ['language'],
        resolver: dao.getPartialGroup,
      });
    });

    it('should return the valid results mixed calls', () => {
      return testStore.get(['abc', 'foo', 'bar'])
        .then((result) => {
          expect(result).to.deep.equal([{ id: 'abc', language: undefined }, undefined, undefined]);
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
        uniqueParams: ['language'],
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
      return testStore.get(['abc', 'foo'], { language: 'en' })
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
        uniqueParams: ['language'],
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
      return testStore.get(['abc', 'foo'], { language: 'en' })
        .then(null, (error) => {
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
});