const {basicParser, contextRecordKey, deferred} = require('./utils');

function queriesStore(config, emitter, targetStore) {
    const queries = {};

    async function getHandles(key, ids, params, context) {
        if (!(key in queries)) queries[key] = [];

        let numCoalesced = 0;
        let numCached = 0;

        const handles = [];
        for (let i = 0; i < ids.length; i++) {
            handles[i] = undefined;

            const existingQuery = queries[key].find(query => query.handles[ids[i]]);
            if (existingQuery && existingQuery.handles[ids[i]].promise) {
                numCoalesced++;
                handles[i] = existingQuery.handles[ids[i]].promise;
            }
        }

        const cacheResult = await targetStore.getMulti(contextRecordKey(key), ids.map((id, i) => handles[i] === undefined ? id : undefined));
        for (let i = 0; i < cacheResult.length; i++) {
            if (cacheResult[i] !== undefined) {
                numCached++;
                handles[i] = cacheResult[i];
            }
            else {
                if (handles[i] === undefined) handles[i] = assignQuery(key, ids[i], params, context);
            }
        }

        if (numCached > 0) emitter.emit('cacheHit', { key, found: numCached });
        if (numCoalesced > 0)  emitter.emit('coalescedHit', { key, found: numCoalesced });

        return handles;
    }

    function assignQuery(key, id, params, context) {
        const sizeLimit = config.batch && config.batch.max || 1;
        const query = queries[key].find(q => q.size < sizeLimit && q.state === 0) || createQuery(key, params);
        query.size++;
        query.handles[id] = deferred();
        if (query.contexts.indexOf(context) == -1) query.contexts.push(context);

        if (query.size >= sizeLimit) runQuery(query);
        return query.handles[id].promise;
    }

    function createQuery(key, params) {
        const query = { uid: Math.random().toString(36), key, params, handles: {}, state: 0, timer: null, contexts: [], size: 0 };
        queries[key].push(query);

        query.timer = setTimeout(() => runQuery(query), config.batch && config.batch.tick || 0);
        return query;
    }

    function deleteQuery(key, uid) {
        const index = (queries[key] || []).findIndex(query => query.uid === uid);
        if (index > -1) queries[key].splice(index, 1);
        if (queries[key].length === 0) delete queries[key];
    }

    async function runQuery(query) {
        query.state = 1;
        clearTimeout(query.timer);
        emitter.emit('query', query);
        config.resolver(Object.keys(query.handles), query.params, query.contexts)
            .then(handleQuerySuccess.bind(null, query), handleQueryError.bind(null, query));
    }

    function handleQueryError(query, error) {
        query.state = 2;
        emitter.emit('queryFailed', { key: query.key, uid: query.uid, size: query.size, params: query.params, error });
        for (const handle in query.handles) {
            query.handles[handle].reject(error);
        }
        deleteQuery(query.key, query.uid);
    }

    function handleQuerySuccess(query, rawResponse) {
        query.state = 2;
        emitter.emit('querySuccess', { key: query.key, uid: query.uid, size: query.size, params: query.params });
        const ids = Object.keys(query.handles);
        const entries = basicParser(rawResponse, ids, query.params);
        ids.forEach(id => query.handles[id].resolve(entries[id]));

        targetStore.set(contextRecordKey(query.key), ids, entries);
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
