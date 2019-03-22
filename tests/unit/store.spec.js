/**
 * Store component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const store = require('../../src/store.js');
const { exp } = require('../../src/utils.js')
const EventEmitter = require('events').EventEmitter;
const expect = require('chai').expect;
const sinon = require('sinon');

/* Local variables -----------------------------------------------------------*/

const testDuration = 100;
const config = {
  cache: {
    base: 1,
    steps: 10,
    limit: 100,
    curve: exp,
  },
  storeOptions: {
    recordLimit: Infinity,
    scavengeCycle: 10,
  },
};
const recordKey = (id) => `${id}`;

/* Tests ---------------------------------------------------------------------*/

describe('store', () => {
  let testStore;
  let emitterMock;
  let testMap;
  let testEmitter;
  let valueRecord;
  let evictableRecord;

  describe('#get', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
      valueRecord = { value: 'foo' };
      evictableRecord = { value: 'bar', ttl: 0 };
    });
    
    it('should return a value if there\'s a value saved', async () => {
      testStore.set(recordKey, ['testValue'], { testValue: 'foo' });
      const val = await testStore.get('testValue');
      expect(val).to.deep.equal({
        value: 'foo',
        timestamp: null,
        bump: null,
        step: null,
        ttl: 0,
      });
    });

    it('should return a value and bump status if there\'s an evictable value saved', async () => {
      testStore.set(recordKey, ['testEvictable'], { testEvictable: 'bar' }, { step: 0 });
      const record = await testStore.get('testEvictable');
      expect(record).to.contain.keys(['value', 'bump', 'step', 'ttl', 'timestamp']);
      expect(record.value).to.equal('bar');
    });

    it('should return a null if the key is missing', async () => {
      const val = await testStore.get('test');
      expect(val).to.be.undefined;
    });
  });

  describe('#set', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should save to the store and not schedule lru', (done) => {
      const lruMock = sinon.mock(testStore);
      testStore.set(recordKey, ['testValue'], { testValue: { value: 'foo' } });
      setTimeout(() => {
        lruMock.expects('lru').never();
        done();
      }, 11);
    });

    it('should save to the store and schedule lru when there\'s a ttl', (done) => {
      const lruMock = sinon.mock(testStore);
      testStore.set(recordKey, ['testLRUValue'], { testLRUValue: { value: 'foo' } }, { step: 0 });
      setTimeout(() => {
        lruMock.expects('lru').once().withArgs('testLRUValue');
        emitterMock.expects('emit').once().withArgs('cacheClear');
        done();
      }, 11);
    });
  });

  describe('#clear', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);

      valueRecord = { value: 'foo' };
      testStore.set(recordKey, ['testValue'], { testValue: valueRecord });
    });

    it('should clear the record and return true if there\'s a value saved', async () => {
      const prior = await testStore.get('testValue');
      expect(prior).to.deep.equal({
        value: { value: 'foo' },
        timestamp: null,
        bump: null,
        step: null,
        ttl: 0,
      });
      expect(testStore.clear('testValue')).to.be.true;
      const after = await testStore.get('testValue');
      expect(after).to.be.undefined;
    });

    it('should do nothing and return false if the key is missing', () => {
      expect(testStore.clear('testPromise')).to.be.false;
    });
  });

  describe('#lru', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should extend the cache period if bump is true', () => {
      testStore.set(recordKey, ['testLRUValue'], { testLRUValue: 'foo' }, { step: 0 });
      testStore.get('testLRUValue');
      testStore.lru('testLRUValue');
      emitterMock.expects('emit').once().withArgs('cacheBump');
    });
  });

  describe('#size', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should return the amount of records in the store', async () => {
      testStore.set(recordKey, ['testLRUValue'], { testLRUValue: 'foo' }, { step: 0 });
      testStore.get('testLRUValue');
      const sizeValue = await testStore.size()
      expect(sizeValue).to.equal(1);
    });
  });

  describe('#store limitations', () => {
    beforeEach(() => {
      testMap = {};
      testEmitter = new EventEmitter();
      emitterMock = sinon.mock(testEmitter);
      testStore = store({
        cache: {
          base: 1,
          steps: 10,
          limit: 100,
          curve: exp,
        },
        storeOptions: { recordLimit: 1 },
      }, testEmitter, testMap);
    });

    it('should not save if record count has reached the limit', () => {
      testStore.set(recordKey, ['testLRUValue', 'testLRUValue2'], { testLRUValue: { value: 'foo' }, testLRUValue2: { value: 'foo' } }, { step: 0 });
      emitterMock.expects('emit').once().withArgs('cacheClear');
      emitterMock.expects('emit').withArgs('cacheSkip');
    });
  });
});
