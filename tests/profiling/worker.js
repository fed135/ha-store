/**
 * Test app worker - allows us to saturate the request generator without impacting the app
 */

/* Requires ------------------------------------------------------------------*/

const settings = require('./settings');
const HA = require('../../src/index.js');
const crypto = require('crypto');

/* Local variables -----------------------------------------------------------*/

const suite = {
  completed: 0,
  cacheHits: 0,
  coalescedHit: 0,
  sum: 0,
  timeouts: 0,
  batches: 0,
  avgBatchSize: 0,
  startHeap: process.memoryUsage().rss,
};

const store = HA(settings.setup);

/* Methods -------------------------------------------------------------------*/

function handleRequest(id, language) {
  let finished = false;
  const before = Date.now();
  const timeout = setTimeout(() => {
    if (finished === false) {
      suite.timeouts++;
      console.log(`request timed out: { id: ${id}, lang: ${language}}`);
    }
  }, 500);
  store.get(id, { language }, crypto.randomBytes(8).toString('hex'))
    .then((result) => {
      clearTimeout(timeout);
      finished = true;
      if (!result || result.id !== id || result.language !== language) {
        throw new Error(`Integrity test failed: ${result} does not match {${id} ${language}}`);
      }
      suite.sum += (Date.now() - before);
      suite.completed++;
    }, () => {})
    .catch((err) => { console.log(err); process.exit(1)} );
}

store.on('query', batch => { suite.batches++; suite.avgBatchSize += batch.size; });
store.on('cacheHit', evt => { suite.cacheHits+=evt.found; });
store.on('coalescedHit', evt => { suite.coalescedHit+=evt.found; });

//End
function complete() {
  // give a chance to in-flight requests to complete
  setTimeout(async () => {
    suite.avgBatchSize = Math.round(suite.avgBatchSize / suite.batches);
    suite.size = await store.size();
    suite.startHeap = process.memoryUsage().rss - suite.startHeap;

    process.send(suite);
    process.exit(0);
  }, 1000);
}

/* Init ----------------------------------------------------------------------*/

process.on('message', (msg) => msg === 'finish' ? complete() : handleRequest(msg.id, msg.language));
