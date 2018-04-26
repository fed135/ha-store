const expect = require('chai').expect;
const dao = require('./dao');
const store = require('../../src');


describe('Rest-store', () => {
    describe('Happy responses', () => {
        let testStore;
        afterEach(() => testStore = null);
        context('Cache: true', () => {})
        context('')
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