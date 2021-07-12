const {getAssets} = require('./dao.js');
//const redisStore = require('ha-store-redis');

module.exports = {
  test: {
    sampleFile: './sample.txt',
  },
  setup: {
    resolver: getAssets,
    // store: redisStore('footage-api-ha-cache', { host: '0.0.0.0', port: 6379 }),
    delimiter: ['language'],
    cache: { limit: 5000, ttl: 300000 },
    batch: { delay: 10, limit: 50 },
    retry: { base: 1, step: 2 },
  },
  assert: {
    completed: [300000, 300000],
    coalescedHit: [8000, 50000],
    cacheHits: [35000, 50000],
    timeouts: [0, 0],
    batches: [4800, 5300],
    rss: [50000, 80000],
    avgBatchSize: [45, 50],
  },
}