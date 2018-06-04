const expect = require('chai').expect;
const sinon = require('sinon');
const dao = require('./utils/dao');
const store = require('../../src');

describe.only('Retrying', () => {

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
                uniqueOptions: ['language'],
                getter: {
                    method: dao.getEmptyGroup
                }
            });
        });

        it('should not retry on empty responses', () => {
            return testStore.get('abc')
                .then((result) => {
                    expect(result).to.be.undefined;
                    mockSource.expects('getEmptyGroup')
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
                uniqueOptions: ['language'],
                getter: {
                    method: dao.getFailedRequest
                }
            });
        });

        it('should retry the default amount of times before erroring', () => {
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getFailedRequest')
                        .exactly(3).withArgs(['abc'], { language: 'fr' });
                });
        });

        it('should retry the default amount of times before erroring for batches', () => {
            testStore.get('foo', { language: 'fr' });
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getFailedRequest')
                        .exactly(3).withArgs(['foo', 'abc'], { language: 'fr' });
                });
        });

        it('should retry the specified amount of times before erroring', () => {
            testStore.config.retry = { limit: 2 };
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getFailedRequest')
                        .exactly(2).withArgs(['abc'], { language: 'fr' });
                });
        });

        it('should not retry with disabled retry', () => {
            testStore.config.retry = false;
            return testStore.get('abc')
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getFailedRequest')
                        .exactly(1).withArgs(['abc']);
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
                uniqueOptions: ['language'],
                getter: {
                    method: dao.getErroredRequest
                }
            });
        });

        it('should retry the default amount of times before erroring', () => {
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getErroredRequest')
                        .exactly(3).withArgs(['abc'], { language: 'fr' });
                });
        });

        it('should retry the default amount of times before erroring for batches', () => {
            testStore.get('foo', { language: 'fr' });
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getErroredRequest')
                        .exactly(3).withArgs(['foo', 'abc'], { language: 'fr' });
                });
        });

        it('should retry the specified amount of times before erroring', () => {
            testStore.config.retry = { limit: 2 };
            return testStore.get('abc', { language: 'fr' })
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getErroredRequest')
                        .exactly(2).withArgs(['abc'], { language: 'fr' });
                });
        });

        it('should not retry with disabled retry', () => {
            testStore.config.retry = false;
            return testStore.get('abc')
                .then(null, (error) => {
                    expect(error).to.deep.equal({ error: 'Something went wrong' });
                    mockSource.expects('getErroredRequest')
                        .exactly(1).withArgs(['abc']);
                });
        });
    });
});