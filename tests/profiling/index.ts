/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

import settings from './settings.ts';
import { fork } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = fork(path.resolve(__dirname, './worker.ts') /* { execArgv: ['--inspect=10245']} */);
processFile(path.resolve(settings.test.sampleFile));

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
});

async function processFile(filename: string) {
  const fileStream = fs.createReadStream(filename, 'utf-8');

  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Identifies all CR LF (\r\n) variants as a single line break
  });

  for await (const line of rl) {
    const [id, language] = line.split(' ');
    app.send({ id, language });
  }
  app.send('finish');
}
