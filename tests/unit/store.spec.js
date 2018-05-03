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
  let mapStub;
  let emitterStub;

  describe('#get', () => {
    beforeEach(() => {
      mapStub = sinon.stub(new Map());
      emitterStub = sinon.stub(new EventEmitter());
      testStore = store(config, emitterStub, mapStub);

      const valueRecord = { value: 'foo' };
      const promiseRecord = { promise: new Promise(()=>{}) };
      testStore.set('testValue', valueRecord);
      testStore.set('testPromise', promiseRecord);
    });
    
    it('should return a value if there\'s a value saved', () => {
      expect(testStore.get('testValue')).to.equal('foo');
      expect(mapStub.get).calledWith('testValue');
      expect(valueRecord.bump).to.be.true;
    });

    it('should return a promise if there\'s a promise saved', () => {
      expect(testStore.get('testPromise')).to.be.instanceOf(Promise);
      expect(mapStub.get).calledWith('testPromise');
      expect(promiseRecord.bump).to.not.be.true;
    });

    it('should return a null if the key is missing', () => {
      expect(testStore.get('test')).to.be.null;
      expect(mapStub.get).calledWith('test');
    });
  });

  describe('#set', () => {
    beforeEach(() => {
      mapStub = sinon.stub(new Map());
      emitterStub = sinon.stub(new EventEmitter());
      testStore = store(config, emitterStub, mapStub);
    });

    it('should save to the store and not schedule lru', (done) => {
      const lruMock = sinon.mock(testStore, 'lru');
      expect(testStore.set('testValue', { value: 'foo' })).to.equal({ value: 'foo' });
      setTimeout(() => {
        expect(lruMock.neverCalled);
        done();
      }, 11);
    });

    it('should save to the store and schedule lru when there\'s a ttl', (done) => {
      const lruMock = sinon.mock(testStore, 'lru');
      expect(testStore.set('testLRUValue', { value: 'foo' }, { ttl: 10 })).to.equal({ value: 'foo' });
      setTimeout(() => {
        expect(lruMock.calledWith('testLRUValue'));
        done();
      }, 11);
    });
  });

  describe('#has', () => {
    beforeEach(() => {
      mapStub = sinon.stub(new Map());
      emitterStub = sinon.stub(new EventEmitter());
      testStore = store(config, emitterStub, mapStub);

      const valueRecord = { value: 'foo' };
      const promiseRecord = { promise: new Promise(()=>{}) };
      testStore.set('testValue', valueRecord);
      testStore.set('testPromise', promiseRecord);
    });

    it('should return true if there\'s a value saved', () => {
      expect(testStore.has('testValue')).to.be.true;
      expect(mapStub.has).calledWith('testValue');
    });

    it('should return true if there\'s a promise saved', () => {
      expect(testStore.has('testPromise')).to.be.true;
      expect(mapStub.has).calledWith('testPromise');
    });

    it('should return false if the key is missing', () => {
      expect(testStore.has('test')).to.be.false;
      expect(mapStub.has).calledWith('test');
    });
  });

  describe('#clear', () => {
    beforeEach(() => {
      mapStub = sinon.stub(new Map());
      emitterStub = sinon.stub(new EventEmitter());
      testStore = store(config, emitterStub, mapStub);

      const promiseRecord = { promise: new Promise(()=>{}) };
      testStore.set('testPromise', promiseRecord);
    });

    it('should clear the record and return true if there\'s a promise saved', () => {
      expect(testStore.clear('testPromise')).to.be.true;
      expect(mapStub.clear).calledWith('testPromise');
    });

    it('should do nothing and return false if the key is missing', () => {
      expect(testStore.clear('testPromise')).to.be.false;
      expect(mapStub.clear).calledWith('testPromise');
    });
  });

  describe('#lru', () => {

  });
});
