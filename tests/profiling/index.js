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

const languages = ['fr', 'en', 'pr', 'it', 'ge'];
const now = Date.now();

function hitStore() {
  if (Date.now() - now < 120000) {
    setTimeout(hitStore, 4);
    const id = crypto.randomBytes(2).toString('hex');
    const language = languages[Math.floor(Math.random()*languages.length)];
    store.get(id, { language })
      .then((result) => {
        if (!result || result.id !== id || result.language !== language) {
          console.log(result, id, language);
          throw new Error('result mismatch');
        }
      })
      .catch((err) => process.exit(1));
  }
  else process.exit(0);
}

hitStore();

