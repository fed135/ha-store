const {getAssets} = require('./dao.js');

module.exports = {
  test: {
    sampleFile: './sample.txt',
  },
  setup: {
    resolver: getAssets,
    delimiter: ['language'],
    cache: true,
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