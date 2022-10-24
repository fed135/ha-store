function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function contextKey(u, params = {}) {
  return Array.from(u || []).map(opt => `${opt}=${JSON.stringify(params[opt])}`).join(';');
}

function recordKey(context, id) {
  return `${context}::${id}`;
}

const contextRecordKey = key => id => recordKey(key, id);

function settleAndLog(promises) {
  return Promise.allSettled(promises).then((results) => {
    const errors = results.filter((result) => result.status !== 'fulfilled').map((result) => result.reason);
    if (errors.length > 0) {
      console.error('Failed to get value from remote cache', errors);
    }
    return results.map((result) => result.value);
  });
}

module.exports = { deferred, contextKey, recordKey, contextRecordKey, settleAndLog };
