/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

/* Requires ------------------------------------------------------------------*/

const settings = require('./settings');
const {fork} = require('child_process');
const path = require('path');
const fs = require('fs');
const split2 = require('split2');

/* Init ----------------------------------------------------------------------*/

// Setup
const app = fork(path.resolve(__dirname, './worker.js')/*, { execArgv: ['--prof']}*/);
const stream = fs.createReadStream(path.resolve(settings.test.sampleFile), 'utf-8').pipe(split2());

app.on('message', async (suite) => {
  console.log(`
    ${suite.completed} completed requests
    ${suite.cacheHits} cache hits
    ${suite.coalescedHit} coalesced hits
    ${JSON.stringify(suite.size)} in memory
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
  process.exit(0);
});

stream.on('data', (chunk) => {
  const [id, language] = chunk.split(' ');
  app.send({ id, language });
});

stream.on('end', () => {
  app.send('finish');
});
