const {getAssets} = require('./dao.js');

module.exports = {
    test: {
        testDuration: 6000,
        requestDelay: 0,
        languages: ['fr'/*, 'en', 'ge'*/],
    },
    setup: {
        resolver: getAssets,
        uniqueParams: ['language'],
        cache: { limit: 60000, steps: 5, base: 5000 },
        batch: { tick: 10, max: 50 },
        retry: { base: 1, step: 2 },
    },
    assert: {
        completed: [30000, 100000],
        cacheHits: [1000, 4000],
        timeouts: [500, 4000],
        batches: [20000, 60000],
        rss: [30000, 60000],
        avgBatchSize: [5, 50],
    },
}