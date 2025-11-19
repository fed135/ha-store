export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function contextKey(u, params = {}) {
  return Array.from(u || []).map(opt => `${opt}=${JSON.stringify(params[opt])}`).join(';');
}

export function recordKey(context, id) {
  return `${context}::${id}`;
}

export const contextRecordKey = key => id => recordKey(key, id);

export function settleAndLog(promises) {
  return Promise.allSettled(promises).then((results) => {
    const errors = results.filter(result => result.status !== 'fulfilled').map(result => result.reason);
    if (errors.length > 0) {
      console.error('Failed to get value from remote cache', errors);
    }
    return results.map(result => result.value);
  });
}
