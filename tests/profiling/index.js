/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

/* Requires ------------------------------------------------------------------*/

const crypto = require('crypto');
const settings = require('./settings');
const {fork} = require('child_process');
const path = require('path');

/* Init ----------------------------------------------------------------------*/

// Setup
<<<<<<< HEAD
const app = fork(path.resolve(__dirname, './testApp.js'));
const startTime = Date.now();

async function hitStore() {
  if (Date.now() - startTime <  settings.test.testDuration) {
    process.nextTick(hitStore);
    
=======
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
>>>>>>> dbb8bdae167b20efe994bc765b4a92ba38186cc8
    // Simulate normal z-distribution
    let sampleRange = (Math.round(Math.random()*3) === 0) ? 1:2;
    const id = crypto.randomBytes(sampleRange).toString('hex');
    const language = settings.test.languages[Math.floor(Math.random()*settings.test.languages.length)];
    app.send({ id, language });
  }
  else {
    app.send('finish');
  }
}

app.on('message', async (suite) => {
  console.log(`
    ${suite.completed} completed requests
    ${suite.cacheHits} cache hits
    ${JSON.stringify(suite.size)} in memory
    ${suite.timeouts} timed out
    avg response time ${(suite.sum / suite.completed).toFixed(3)}
    ${suite.batches} queries sent
    ${suite.avgBatchSize} items per queries on average
    ${(suite.startHeap / 1024).toFixed(2)} Kbytes allocated
  `);

  for (const expectation in settings.assert) {
    if (suite[expectation] <= settings.assert[expectation][0] || suite[expectation] >= settings.assert[expectation][1]) {
      console.log(expectation, 'did not match expectation', settings.assert[expectation]);
      throw new Error('performance test failed');
    }
  }
  process.exit(0);
});

hitStore();

