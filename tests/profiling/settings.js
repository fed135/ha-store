const {getAssets} = require('./dao.js');

module.exports = {
  test: {
    sampleFile: './sample.txt',
  },
  setup: {
    resolver: getAssets,
    delimiter: ['language'],
    cache: { enabled: true,  tiers: [{ limit: 6939, ttl: 300000000 }] }, //5% of the dataset assets
    batch: { enabled: true, delay: 5, limit: 20 },
  },
  assert: {
    completed: [300000, 300000],
    coalescedHit: [7000, 50000],
    cacheHits: [35000, 50000],
    timeouts: [0, 0],
    batches: [4800, 5300],
    rss: [50000, 80000],
    avgBatchSize: [45, 50],
  },
}
