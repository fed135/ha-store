import { type Params } from './index';

export function deferred<T>() {
  let resolve: (value?: T | PromiseLike<T>) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export function contextKey(u, params: Params = {}) {
  return Array.from(u || []).map((opt: string) => `${opt}=${JSON.stringify(params[opt])}`).join(';');
}

export function recordKey(context, id) {
  return `${context}::${id}`;
}

export const contextRecordKey = key => id => recordKey(key, id);

const isRejected = (input: PromiseSettledResult<unknown>): input is PromiseRejectedResult =>
  input.status === 'rejected';

const isFulfilled = <T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> =>
  input.status === 'fulfilled';

export function settleAndLog(promises) {
  return Promise.allSettled(promises).then((results) => {
    const errors = results.filter(isRejected).map(result => result.reason);

    if (errors.length > 0) {
      console.error('Failed to get value from remote cache', errors);
    }
    return results.filter(isFulfilled).map(result => result.value);
  });
}
