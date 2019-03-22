/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

/* Requires ------------------------------------------------------------------*/

const crypto = require('crypto');
const {getAssets, getErroredRequest} = require('../integration/utils/dao.js');
const settings = require('./settings');
const HA = require('../../src/index.js');

/* Init ----------------------------------------------------------------------*/

// Setup
const store = HA(settings.setup);
const startTime = Date.now();

// Suite
const suite = {
  sampleRange: 2,
  completed: 0,
  cacheHits: 0,
  sum: 0,
  timeouts: 0,
  batches: 0,
  startHeap: process.memoryUsage().rss,
};

store.on('query', () => { suite.batches++; });
store.on('cacheHit', () => { suite.cacheHits++; });

async function hitStore() {
  if (Date.now() - startTime <  settings.test.testDuration) {
    setTimeout(hitStore, settings.test.requestDelay);
    let finished = false;
    setTimeout(() => {
      if (finished === false) suite.timeouts++;
    }, 500);
    // Simulate normal z-distribution
    suite.sampleRange = (Math.round(Math.random()*3) === 0) ? 1:2;
    const randomError = (Math.round(Math.random()*10) === 0);
    const id = crypto.randomBytes(suite.sampleRange).toString('hex');
    const language = settings.test.languages[Math.floor(Math.random()*settings.test.languages.length)];
    const before = Date.now();
    if (randomError) store.config.resolver = getErroredRequest;
    else store.config.resolver = getAssets;
    store.get(id, { language }, crypto.randomBytes(8).toString('hex'))
      .then((result) => {
        if (!result || result.id !== id || result.language !== language) {
          console.log(result, 'does not match', id, language);
          throw new Error('integrity test failed');
        }
        suite.sum += (Date.now() - before);
        finished = true;
        suite.completed++;
      }, () => {})
      .catch((err) => { console.log(err); process.exit(1)} );
  }
  else {
    console.log(`
      ${suite.completed} completed requests
      ${suite.cacheHits} cache hits
      ${JSON.stringify(await store.size())}
      ${suite.timeouts} timed out
      avg response time ${(suite.sum / suite.completed).toFixed(3)}
      ${suite.batches} queries sent
      ${((process.memoryUsage().rss - suite.startHeap) / 1024).toFixed(2)} Kbytes allocated
    `);
    for (const expectation in settings.assert) {
      if (suite[expectation] < settings.assert[expectation][0] || suite[expectation] > settings.assert[expectation][1]) {
        console.log(expectation, 'did not match expectation', settings.assert[expectation]);
        throw new Error('performance test failed');
      }
    }
    
    process.exit(0);
  }
}

hitStore();

