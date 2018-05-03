const expect = require('chai').expect;
const dao = require('./dao');
const store = require('../../src');

// Variables:
// Cache (true/false)
// Batch (true/false)
// Retry (true/false)
describe('Rest-store', () => {
    describe('Happy responses', () => {
        let testStore;
        afterEach(() => testStore = null);
        beforeEach(() => {
            testStore = store({
                getter: {
                    method: dao.getAssets
                }
            });
        });
    });

    describe('Empty responses', () => {
        const empty = store({
            one: {
                method: dao.getEmptyGroup
            }
        });
    });

    describe('Rejected requests', () => {
        const rejection = store({
            one: {
                method: dao.getErroredRequest
            }
        });
    });

    describe('Failed requests', () => {
        const exception = store({
            one: {
                method: dao.getFailedRequest
            }
        });
    });
});