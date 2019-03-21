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
    },
    assert: {
        completed: [100000, 200000],
        cacheHits: [40000, 70000],
        timeouts: [500, 8000],
        batches: [500, 4000],
        rss: [90000, 200000],
        avgBatchSize: [30, 50],
    },
}