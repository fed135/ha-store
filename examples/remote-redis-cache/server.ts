import express from 'express';
import HAStore, { caches } from 'ha-store';
import { Worker } from 'worker_threads';
import { deferred } from '../../src/utils.ts'; // Just borrowing a util for the sake of this example

const app = express();
const PORT = process.env.PORT || 3000;

function workerify(index) {
  const worker = new Worker('./fib.ts');
  const { resolve, promise } = deferred();

  worker.postMessage(index);

  worker.on('message', (result) => {
    resolve(result);
    worker.terminate();
  });

  return promise;
}

// Data loader
const articleStore = HAStore({
  // The resolver function called when data needs to be fetched
  // It could be anything you want (generating images, documents, sending http requests, etc.)
  // In this case we are performing a cpu-intensive task in worker threads
  resolver: (indexes: number[]) => {
    return Promise.all(indexes.map(workerify)).then((vals) => {
      return Object.assign({}, ...vals);
    });
  },

  // Enable caching to a remote redis instance
  caches: [
    caches.redis({
      ttl: 60000, // Time to live: 60 seconds
      host: '0.0.0.0',
      port: 6379,
    }),
  ],

  // Disabling batch loads for this use-case.
  batch: null,
});

// Get a single fibonacci value by index. Values already generated will be cached in redis.
app.get('/fibonacci/:num', async (req, res) => {
  const n = req.params.num;
  if (n < 0) throw 'Fibonacci not defined for negative numbers';

  const value = await articleStore.get(n);

  if (!value) {
    return res.status(500).json({ error: 'Could not generate fibonacci value for index number ' + n });
  }

  res.json({ value });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
});
