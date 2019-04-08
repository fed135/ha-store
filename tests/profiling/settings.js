const {getAssets} = require('./dao.js');

module.exports = {
    test: {
        sampleFile: './sample.txt',
    },
    setup: {
        resolver: getAssets,
        uniqueParams: ['language'],
        cache: { limit: 60000, ttl: 60000 },
        batch: { tick: 10, max: 50 },
        retry: { base: 1, step: 2 },
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