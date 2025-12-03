import { getAssets } from './dao.ts';
import { caches } from '../../dist/index.js';

export default {
  test: {
    sampleFile: './sample.txt',
  },
  setup: {
    resolver: getAssets,
    delimiter: ['language'],
    caches: [caches.inMemory({ limit: 5000, ttl: 300000 })],
    batch: { delay: 10, limit: 50 },
  },
  assert: {
    completed: [300000, 300000],
    coalescedHit: [7000, 50000],
    cacheHits: [35000, 50000],
    timeouts: [0, 0],
    batches: [4500, 5500],
    rss: [50000, 80000],
    avgBatchSize: [45, 50],
  },
};
