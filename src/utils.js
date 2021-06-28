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

/* Exports -------------------------------------------------------------------*/

module.exports = { deferred, contextKey, recordKey, contextRecordKey };
