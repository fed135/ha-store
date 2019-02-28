/**
 * Test app worker - allows us to saturate the request generator without impacting the app
 */

/* Requires ------------------------------------------------------------------*/

const settings = require('./settings');
const HA = require('../../src/index.js');
const {getAssets,getErroredRequest} = require('./dao');
const crypto = require('crypto');

/* Local variables -----------------------------------------------------------*/

let handbreak = false;

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

/* Methods -------------------------------------------------------------------*/

function handleRequest(id, language) {
    const randomError = (Math.round(Math.random()*10) === 0);
    let finished = false;
    const before = Date.now();
    setTimeout(() => {
      if (finished === false) suite.timeouts++;
    }, 500);
    if (randomError) store.config.resolver = getErroredRequest;
    else store.config.resolver = getAssets;
    store.get(id, { language }, crypto.randomBytes(8).toString('hex'))
    .then((result) => {
        finished = true;
        if (handbreak) return;
        if (!result || result.id !== id || result.language !== language) {
        console.log(result, 'does not match', id, language);
        throw new Error('integrity test failed');
        }
        suite.sum += (Date.now() - before);
        suite.completed++;
    }, () => {})
    .catch((err) => { console.log(err); process.exit(1)} );
}

store.on('query', batch => { suite.batches++; suite.avgBatchSize += batch.ids.length; });
store.on('cacheHit', () => { suite.cacheHits++; });

//End
async function complete() {
    handbreak = true;
    suite.avgBatchSize = Math.round(suite.avgBatchSize / suite.batches);
    suite.size = await store.size();
    suite.startHeap = process.memoryUsage().rss - suite.startHeap;
    
    process.send(suite);
}

/* Init ----------------------------------------------------------------------*/

process.on('message', (msg) => msg === 'finish' ? complete() : handleRequest(msg.id, msg.language));
