const {contextRecordKey, deferred} = require('./utils');

function queriesStore(config, emitter, targetStore) {
  const queries = {};

  async function getHandles(key, ids, params, context) {
    if (!(key in queries)) queries[key] = [];

    let numCoalesced = 0;
    let numCached = 0;
    let numMisses = 0;

    const handles = [];
    for (let i = 0; i < ids.length; i++) {
      handles[i] = undefined;

      const existingQuery = queries[key].find(query => query.handles.has(ids[i]));
      if (existingQuery) {
        numCoalesced++;
        handles[i] = existingQuery.handles.get(ids[i]).promise;
      }
    }

    if (config.cache !== null) {
      const cacheResult = await targetStore.getMulti(contextRecordKey(key), ids.map((id, i) => handles[i] === undefined ? id : undefined));
      for (let i = 0; i < cacheResult.length; i++) {
        if (cacheResult[i] !== undefined) {
          numCached++;
          handles[i] = cacheResult[i];
        }
      }
    }

    for (let i = 0; i < ids.length; i++) {
      if (handles[i] === undefined) {
        numMisses++;
        handles[i] = assignQuery(key, ids[i], params, context);
      }
    }

    if (numCached > 0) emitter.emit('cacheHit', { key, found: numCached });
    if (numMisses > 0) emitter.emit('cacheMiss', { key, found: numMisses });
    if (numCoalesced > 0)  emitter.emit('coalescedHit', { key, found: numCoalesced });

    return handles;
  }

  function assignQuery(key, id, params, context) {
    const sizeLimit = config.batch?.limit || 1;
    const query = queries[key].find(q => q.size < sizeLimit && q.state === 0) || createQuery(key, params);
    query.size++;
    if (!query.handles.has(id)) query.handles.set(id, deferred());
    if (query.contexts.indexOf(context) == -1) query.contexts.push(context);

    if (query.size >= sizeLimit) runQuery(query);
    return query.handles.get(id).promise;
  }

  function createQuery(key, params) {
    const query = { uid: Math.random().toString(36), key, params, handles: new Map(), state: 0, timer: null, contexts: [], size: 0 };
    queries[key].push(query);

    query.timer = setTimeout(() => runQuery(query), config.batch?.delay || 0);
    return query;
  }

  function deleteQuery(key, uid) {
    const index = (queries[key] || []).findIndex(query => query.uid === uid);
    if (index > -1) queries[key].splice(index, 1);
    if (queries[key].length === 0) delete queries[key];
  }

  function runQuery(query) {
    query.state = 1;
    clearTimeout(query.timer);
    emitter.emit('query', query);
    config.resolver(Array.from(query.handles.keys()), query.params, query.contexts)
      .then((entries) => handleQuerySuccess(query, entries), (error) => handleQueryError(query, error));
  }

  function handleQueryError(query, error) {
    query.state = 2;
    emitter.emit('queryFailed', { key: query.key, uid: query.uid, size: query.size, params: query.params, error });
    Array.from(query.handles.values()).forEach(handle => handle.reject(error));
    deleteQuery(query.key, query.uid);
  }

  function handleQuerySuccess(query, entries) {
    query.state = 2;
    emitter.emit('querySuccess', { key: query.key, uid: query.uid, size: query.size, params: query.params });
    const ids = Array.from(query.handles.keys());
    ids.forEach(id => query.handles.get(id).resolve(entries?.[id]));
    if (config.cache !== null) targetStore.set(contextRecordKey(query.key), ids, entries || {});
    deleteQuery(query.key, query.uid);
  }

  function size() {
    const contexts = Object.keys(queries);
    return {
      contexts: contexts.length,
      queries: contexts.reduce((acc, curr) => acc + queries[curr].length, 0),
    }
  }

  return { getHandles, size };
}

module.exports = queriesStore;
