import { parentPort } from 'worker_threads';

parentPort?.on('message', (n) => {
  parentPort?.postMessage({ [n]: fibonacci(n) });
});

function fibonacci(n = 0): number {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
