/**
 * Store component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const store = require('../../src/store');
const EventEmitter = require('events').EventEmitter;
const expect = require('chai').expect;
const sinon = require('sinon');

/* Local variables -----------------------------------------------------------*/

const testDuration = 100;
const config = {
  cache: {
    step: 10,
    ttl: 100,
  },
};

/* Tests ---------------------------------------------------------------------*/

describe('store', () => {
  let testStore;
  let mapMock;
  let emitterMock;
  let testMap;
  let testEmitter;
  let valueRecord;
  let evictableRecord;
  let promiseRecord;

  describe('#get', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
      valueRecord = { value: 'foo' };
      evictableRecord = { value: 'bar', timer: 0 };
      promiseRecord = { promise: new Promise(()=>{}) };
      
      testStore.set('testValue', valueRecord);
      testStore.set('testEvictable', evictableRecord);
      testStore.set('testPromise', promiseRecord);
    });
    
    it('should return a value if there\'s a value saved', () => {
      expect(testStore.get('testValue')).to.deep.equal({ value: 'foo' });
      mapMock.expects('get').once().withArgs('testValue');
    });

    it('should return a value and bump status if there\'s an evictable value saved', () => {
      expect(testStore.get('testEvictable')).to.deep.equal({ value: 'bar', bump: true, timer: 0 });
      mapMock.expects('get').once().withArgs('testEvictable');
    });

    it('should return a promise if there\'s a promise saved', () => {
      expect(testStore.get('testPromise').promise).to.be.instanceOf(Promise);
      mapMock.expects('get').once().withArgs('testPromise');
    });

    it('should return a null if the key is missing', () => {
      expect(testStore.get('test')).to.be.undefined;
      mapMock.expects('get').once().withArgs('test');
    });
  });

  describe('#set', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should save to the store and not schedule lru', (done) => {
      const lruMock = sinon.mock(testStore);
      expect(testStore.set('testValue', { value: 'foo' })).to.deep.equal({ value: 'foo' });
      setTimeout(() => {
        lruMock.expects('lru').never();
        done();
      }, 11);
    });

    it('should save to the store and schedule lru when there\'s a ttl', (done) => {
      const lruMock = sinon.mock(testStore);
      expect(testStore.set('testLRUValue', { value: 'foo' }, { ttl: 10 })).to.have.all.keys(['value', 'timestamp', 'timer']);
      setTimeout(() => {
        lruMock.expects('lru').once().withArgs('testLRUValue');
        emitterMock.expects('emit').once().withArgs('cacheClear');
        done();
      }, 11);
    });
  });

  describe('#has', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);

      valueRecord = { value: 'foo' };
      promiseRecord = { promise: new Promise(()=>{}) };
    });

    it('should return true if there\'s a value saved', () => {
      testStore.set('testValue', valueRecord);
      expect(testStore.has('testValue')).to.be.true;
      mapMock.expects('has').once().withArgs('testValue');
    });

    it('should return true if there\'s a promise saved', () => {
      testStore.set('testPromise', promiseRecord);
      expect(testStore.has('testPromise')).to.be.true;
      mapMock.expects('has').once().withArgs('testPromise');
    });

    it('should return false if the key is missing', () => {
      expect(testStore.has('test')).to.be.false;
      mapMock.expects('has').once().withArgs('test');
    });
  });

  describe('#clear', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);

      promiseRecord = { promise: new Promise(()=>{}) };
      testStore.set('testPromise', promiseRecord);
    });

    it('should clear the record and return true if there\'s a promise saved', () => {
      expect(testStore.clear('testPromise')).to.be.true;
      mapMock.expects('clear').once().withArgs('testPromise');
    });

    it('should do nothing and return true if the key is missing', () => {
      expect(testStore.clear('testPromise')).to.be.true;
      mapMock.expects('clear').once().withArgs('testPromise');
    });
  });

  describe('#lru', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should extend the cache period if bump is true', () => {
      testStore.set('testLRUValue', { value: 'foo' }, { ttl: 10 });
      testStore.get('testLRUValue');
      testStore.lru('testLRUValue');
      emitterMock.expects('emit').once().withArgs('cacheBump');
    });
  });

  describe('#size', () => {
    beforeEach(() => {
      testMap = new Map();
      testEmitter = new EventEmitter();
      mapMock = sinon.mock(testMap);
      emitterMock = sinon.mock(testEmitter);
      testStore = store(config, testEmitter, testMap);
    });

    it('should return the amount of records in the store', () => {
      testStore.set('testLRUValue', { value: 'foo' }, { ttl: 10 });
      testStore.get('testLRUValue');
      expect(testStore.size()).to.equal(1);
    });
  });
});
