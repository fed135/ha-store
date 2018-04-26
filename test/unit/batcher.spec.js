const batcher = require('../../../../server/helpers/media-batcher');

const { expect } = require('chai');
const sinon = require('sinon');

describe('helper/media-batcher', () => {
  const testElement = {
    id: 123,
    status: 'approved',
  };

  const tick = 10;

  describe('add', () => {
    let storeStub;
    let batcherInstance;

    beforeEach(() => {
      storeStub = {
        get: sinon.stub(),
        search: sinon.stub(),
        has: sinon.stub(),
        storageKey: id => `${id}`,
      };

      batcherInstance = batcher(storeStub, 'getOne', { tick });
      storeStub.search.returns(Promise.resolve({ [testElement.id]: testElement }));
    });

    afterEach(() => {
      storeStub.get = null;
      storeStub.has = null;
      storeStub.search = null;

      batcherInstance = null;
    });

    it('should be a method', () => {
      expect(batcherInstance.add).to.be.a('function');
    });

    it('should return a list of promises equal to the number of ids provided', () => {
      expect(batcherInstance.add([123, 456, 789])).to.have.length(3);
    });

    it('should queue all requested ids with the requested options', (done) => {
      storeStub.has.returns(false);
      batcherInstance.add([123, 456, 789], { foo: 'bar' });

      expect(storeStub.search.called).to.be.false;

      setTimeout(() => {
        expect(storeStub.search.calledWith({ ids: [123, 456, 789], foo: 'bar' }, 'getOne')).to.be.true;
        done();
      }, tick + 1);
    });

    it('should resolve items already in the store', (done) => {
      storeStub.has.returns(true);
      storeStub.get.returns(Promise.resolve(testElement));
      const add = batcherInstance.add([123]);

      expect(storeStub.search.notCalled).to.be.true;

      setTimeout(() => {
        expect(storeStub.search.notCalled).to.be.true;
        expect(Promise.all(add)).to.eventually.deep.equal([testElement]).notify(done);
      }, tick + 1);
    });
  });
});
