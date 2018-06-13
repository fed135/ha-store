/**
 * Script to run the app for 2 minutes with a steady debit of queries
 * Useful for running profilers
 */

/* Init ----------------------------------------------------------------------*/

const crypto = require('crypto');
const store = require('../../src')({
    getter: {
        method: require('../integration/utils/dao').getAssets,
    },
    uniqueOptions: ['language'],
    cache: { ttl: 60000, step: 1000 },
    batch: { tick: 25, limit: 100 },
    retry: { scale: 2, base: 5, limit: 10 },
});
let completed = 0;
const startHeap = process.memoryUsage().heapUsed;

const languages = ['fr', 'en', 'pr', 'it', 'ge'];
const now = Date.now();

/*
store.on('cacheBump', console.log.bind(console, 'cacheBump'));
store.on('cacheClear', console.log.bind(console, 'cacheClear'));
store.on('retryCancelled', console.log.bind(console, 'retryCancelled'));
store.on('batch', console.log.bind(console, 'batch'));
store.on('batchSuccess', console.log.bind(console, 'batchSuccess'));
store.on('batchFailed', console.log.bind(console, 'batchFailed'));
store.on('cacheHit', console.log.bind(console, 'cacheHit'));
store.on('cacheMiss', console.log.bind(console, 'cacheMiss'));
*/

function hitStore() {
  if (Date.now() - now < 60000) {
    setTimeout(hitStore, 4);
    const id = crypto.randomBytes(2).toString('hex');
    const language = languages[Math.floor(Math.random()*languages.length)];
    store.get(id, { language })
      .then((result) => {
        if (!result || result.id !== id || result.language !== language) {
          console.log(result, id, language);
          throw new Error('result mismatch');
        }
        completed++;
      })
      .catch((err) => process.exit(1));
  }
  else {
    console.log(`${completed} completed requests - ${JSON.stringify(store.size())} - ${process.memoryUsage().heapUsed - startHeap} bytes allocated`)
    process.exit(0);
  }
}

hitStore();

