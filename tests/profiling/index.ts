/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

import settings from './settings';
import { fork } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import split2 from 'split2';

// Setup
const app = fork(path.resolve(__dirname, './worker.ts') /* { execArgv: ['--inspect=10245']} */);
const stream = fs.createReadStream(path.resolve(settings.test.sampleFile), 'utf-8').pipe(split2());

app.on('message', async (suite) => {
  console.log(`
    ${suite.completed} completed requests
    ${suite.cacheHits} cache hits
    ${suite.localCacheHits} local cache hits
    ${suite.coalescedHit} coalesced hits
    ${JSON.stringify(suite.size)}
    ${suite.timeouts} timed out
    avg response time ${(suite.sum / suite.completed).toFixed(3)}
    ${suite.batches} queries sent
    ${suite.avgBatchSize} items per queries on average
    ${(suite.startHeap / 1024).toFixed(2)} Kbytes allocated
  `);

  for (const expectation in settings.assert) {
    if (suite[expectation] < settings.assert[expectation][0] || suite[expectation] > settings.assert[expectation][1]) {
      console.error(new Error(`Performance test failed: ${expectation} did not match expectation ${settings.assert[expectation]}`));
      process.exit(1);
    }
  }
  // process.exit(0);
});

stream.on('data', (chunk) => {
  const [id, language] = chunk.split(' ');
  app.send({ id, language });
});

stream.on('end', () => {
  app.send('finish');
});
