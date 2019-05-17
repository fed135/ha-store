const {basicParser, contextRecordKey, recordKey, deferred} = require('./utils');

function queriesStore(config, emitter, targetStore) {
    const queries = {};

    async function getHandles(key, ids, params, context) {
        if (!(key in queries)) queries[key] = [];

        const cached = ids
            .map(async (id) => await targetStore.get(recordKey(key, id)));

        const cacheHits = cached.filter(handle => handle !== undefined).length;

        if (cacheHits > 0) emitter.emit('cacheHit', { key, found: cacheHits });

        const coalesced = cached
            .map((handle, i) => {
                if (handle === undefined) handle = queries[key].find(query => query.handles[ids[i]]);
                return handle.promise;
            });
        
        const missing = coalesced.filter(handle => !!(handle)).length;

        if (missing < ids.length - cacheHits) emitter.emit('coalescedHit', { key, found: ids.length - missing - cacheHits });
        
        return coalesced.map((handle, i) => {
            if (!handle) return assignQuery(key, ids[i], params, context, missing);
            return handle;
        });
    }

    function assignQuery(key, id, params, context, total) {
        const query = queries[key].find(q => q.size < (config.batch && config.batch.max || total) && q.running === false) || createQuery(key, params);

        if (query.size === 0 && config.batch === null) query.timer = setTimeout(() => runQuery(query), 0);

        query.size++;
        query.handles[id] = deferred();
        query.contexts.push(context);
        return query.handles[id].promise;
    }

    function createQuery(key, params) {
        const query = { uid: Math.random().toString(36), key, params, handles: {}, running: false, timer: null, contexts: [], size: 0 };
        queries[key].push(query);

        if (config.batch !== null) query.timer = setTimeout(() => runQuery(query), config.batch.tick);
        return query;
    }

    function deleteQuery(key, uid) {
        const index = (queries[key] || []).findIndex(query => query.uid === uid);
        if (index > -1) queries[key].splice(index, 1);
    }

    async function runQuery(query) {
        query.running = true;
        emitter.emit('query', query);
        await config.resolver(Object.keys(query.handles), query.params, query.contexts)
            .then(handleQuerySuccess.bind(null, query), handleQueryError.bind(null, query))
    }

    function handleQueryError(query, error) {
        emitter.emit('queryFailed', { key: query.key, uid: query.uid, size: query.size, params: query.params, error });
        for (const handle in query.handles) {
            query.handles[handle].reject(error);
        }
        deleteQuery(query.key, query.uid);
    }

    function handleQuerySuccess(query, rawResponse) {
        emitter.emit('querySuccess', { key: query.key, uid: query.uid, size: query.size, params: query.params });
        const ids = Object.keys(query.handles);
        const entries = basicParser(rawResponse, ids, query.params);

        for (const handle in query.handles) {
            if (entries[handle] !== null && entries[handle] !== undefined) {
                targetStore.set(contextRecordKey(query.key), ids, entries);
            }
            query.handles[handle].resolve(entries[handle]);
        }
        deleteQuery(query.key, query.uid);
    }

    function size() {
        const contexts = Object.keys(queries);
        return {
            contexts: contexts.length,
            queries: contexts.reduce((acc, curr) => acc + curr.length, 0),
        }
    }

    return { getHandles, size };
}

module.exports = queriesStore;
