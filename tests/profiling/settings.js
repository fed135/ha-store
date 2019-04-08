const {getAssets} = require('./dao.js');

module.exports = {
    test: {
        testDuration: 1000,
        requestDelay: 0,
        languages: ['fr', 'en', 'ge', 'it', 'pr'],
    },
    setup: {
        resolver: getAssets,
        uniqueParams: ['language'],
        cache: { limit: 60000, steps: 5, base: 5000 },
        batch: { tick: 10, max: 50 },
        retry: { base: 1, step: 2 },
        storeOptions: { dropFactor: 2.5, recordLimit: 60000, scavengeCycle: 50 }
    },
    assert: {
        completed: [90000, 200000],
        cacheHits: [20000, 70000],
        timeouts: [0, 0],
        batches: [500, 4000],
        rss: [90000, 120000],
        avgBatchSize: [35, 50],
    },
}