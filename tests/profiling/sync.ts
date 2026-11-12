/**
 * Benchmark test, asserts that the app does not introduce memory leaks or great variations in the
 * batching.
 */

import settings from './settings.ts';
import path from 'node:path';
import fs from 'node:fs';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import HA, { resolvers, caches } from '../../src/index.ts';
import { deferred } from '../../src/utils.ts';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

// Preload DB (adjust size based on your sample file id range)
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE IF NOT EXISTS test (
  id INTEGER PRIMARY KEY,
  language INTEGER NOT NULL
)`);
for (let i = 0; i < 300000; i++) {
  db.exec(`INSERT INTO test (id, language) VALUES (${i}, 1)`);
}

/* Local variables ----------------------------------------------------------- */

// Setup
const store = HA({
  resolver: resolvers.sqlite({ db, identifier: 'id', table: 'test', allowedFilters: ['language'] }),
  delimiter: ['language'],
  caches: [caches.inMemory({ limit: 5000, ttl: 300000 })],
  batch: { delay: 10, limit: 50 },
});

store.on('query', (batch) => {
  suite.batches++;
  suite.avgBatchSize += batch.size;
});
store.on('cacheHit', evt => suite.cacheHits += evt);
store.on('localCacheHit', evt => suite.localCacheHits += evt);
store.on('coalescedHit', evt => suite.coalescedHit += evt);

const suite = {
  completed: 0,
  cacheHits: 0,
  localCacheHits: 0,
  coalescedHit: 0,
  sum: 0,
  timeouts: 0,
  batches: 0,
  avgBatchSize: 0,
  startHeap: process.memoryUsage().rss,
};

processFile(path.resolve(settings.test.sampleFile));

/* Methods ------------------------------------------------------------------- */

function handleRequest(id, language) {
  let finished = false;
  const before = Date.now();
  const timeout = setTimeout(() => {
    if (finished === false) {
      suite.timeouts++;
      console.log(`request timed out: { id: ${id}, lang: ${language}}`);
    }
  }, 500);

  const { promise, resolve } = deferred();

  store.get(id, { language }, randomUUID())
    .then((result) => {
      clearTimeout(timeout);
      finished = true;
      if (!result || result.id !== Number(id) || result.language !== Number(language)) {
        throw new Error(`Integrity test failed: ${JSON.stringify(result)} does not match {${id} ${language}}`);
      }
      suite.sum += (Date.now() - before);
      suite.completed++;
      resolve();
    }, () => {})
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });

  return promise;
}

async function processFile(filename: string) {
  const fileStream = fs.createReadStream(filename, 'utf-8');

  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Identifies all CR LF (\r\n) variants as a single line break
  });

  for await (const line of rl) {
    const [id, language] = line.split(' ');
    handleRequest(id, language);
  }

  await sleep(1000);

  // End of suite
  suite.avgBatchSize = Math.round(suite.avgBatchSize / suite.batches);
  suite.size = await store.size();
  suite.startHeap = process.memoryUsage().rss - suite.startHeap;

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
    if (expectation !== 'coalescedHit') {
      if (suite[expectation] < settings.assert[expectation][0] || suite[expectation] > settings.assert[expectation][1]) {
        console.error(new Error(`Performance test failed: ${expectation} did not match expectation ${settings.assert[expectation]}`));
        process.exit(1);
      }
    }
  }
}
