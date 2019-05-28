const {getAssets} = require('./dao.js');
//const redisStore = require('ha-store-redis');
const redisStore = require('../../../ha-redis-adapter');

module.exports = {
    test: {
        sampleFile: './sample.txt',
    },
    setup: {
        resolver: getAssets,
        // store: redisStore('footage-api-ha-cache', { host: '0.0.0.0', port: 6379 }),
        uniqueParams: ['language'],
        cache: { limit: 5000, ttl: 300000 },
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