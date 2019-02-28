/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

/* Requires ------------------------------------------------------------------*/

const crypto = require('crypto');
const settings = require('./settings');
const { Worker } = require('worker_threads');

/* Init ----------------------------------------------------------------------*/

// Setup
const app = new Worker('./testApp.js');
const now = Date.now();

async function hitStore() {
  if (Date.now() - now <  settings.test.testDuration) {
    process.nextTick(hitStore);
    
    // Simulate normal z-distribution
    let sampleRange = (Math.round(Math.random()*3) === 0) ? 1:2;
    const id = crypto.randomBytes(sampleRange).toString('hex');
    const language = settings.test.languages[Math.floor(Math.random()*settings.test.languages.length)];
    app.postMessage({ id, language });
  }
  else {
    app.postMessage({ event: 'finish' });
    app.on('message', (suite) => {
      console.log(`
        ${suite.completed} completed requests
        ${suite.cacheHits} cache hits
        ${JSON.stringify(await store.size())}
        ${suite.timeouts} timed out
        avg response time ${(suite.sum / suite.completed).toFixed(3)}
        ${suite.batches} queries sent
        ${suite.avgBatchSize} items per queries on average
        ${((process.memoryUsage().rss - suite.startHeap) / 1024).toFixed(2)} Kbytes allocated
      `);

      for (const expectation in settings.assert) {
        if (suite[expectation] <= settings.assert[expectation][0] || suite[expectation] >= settings.assert[expectation][1]) {
          console.log(expectation, 'did not match expectation', settings.assert[expectation]);
          throw new Error('performance test failed');
        }
      }
      process.exit(0);
    });
  }
}

hitStore();

