/**
 * Test app worker - allows us to saturate the request generator without impacting the app
 */

/* Requires ------------------------------------------------------------------*/

const settings = require('./settings');
const HA = require('../../src/index.js');
const crypto = require('crypto');
const v8 = require('v8');
const heapdump = require('heapdump');

/* Local variables -----------------------------------------------------------*/

const suite = {
    completed: 0,
    cacheHits: 0,
    sum: 0,
    timeouts: 0,
    batches: 0,
    avgBatchSize: 0,
    startHeap: process.memoryUsage().rss,
};

const store = HA(settings.setup);

// console.log(v8.getHeapSpaceStatistics().map(parseMemorySpace));

/* Methods -------------------------------------------------------------------*/

function handleRequest(id, language) {
    let finished = false;
    const before = Date.now();
    setTimeout(() => {
      if (finished === false) suite.timeouts++;
    }, 500);
    store.get(id, { language }, crypto.randomBytes(8).toString('hex'))
    .then((result) => {
        finished = true;
        if (!result || result.id !== id || result.language !== language) {
            throw new Error(`Integrity test failed: ${result} does not match {${id} ${language}}`);
        }
        suite.sum += (Date.now() - before);
        suite.completed++;
    }, () => {})
    .catch((err) => { console.log(err); process.exit(1)} );
}

store.on('query', batch => { suite.batches++; suite.avgBatchSize += batch.ids.length; });
store.on('cacheHit', () => { suite.cacheHits++; });

function roundMi(value) {
    return Math.round((value / 1024 / 1024) * 1000) / 1000;
}

function parseMemorySpace(space) {
    return `${space.space_name} = ${roundMi(space.space_used_size)}/${roundMi(space.space_size)}`;
}

//End
function complete() {
    // give a chance to in-flight requests to complete
    setTimeout(async () => {
        suite.avgBatchSize = Math.round(suite.avgBatchSize / suite.batches);
        suite.size = await store.size();
        suite.startHeap = process.memoryUsage().rss - suite.startHeap;

        // console.log(v8.getHeapSpaceStatistics().map(parseMemorySpace));

        /*heapdump.writeSnapshot((err, filename) => {
            console.log('Heap dump written to', filename)
        });*/

        process.send(suite);
        process.exit(0);
    }, 1000);
}

/* Init ----------------------------------------------------------------------*/

process.on('message', (msg) => msg === 'finish' ? complete() : handleRequest(msg.id, msg.language));
