/**
 * Queue processing
 */

/* Requires ------------------------------------------------------------------*/

const localStore = require('./store');

/* Methods -------------------------------------------------------------------*/

function queue(config, emitter, userStore) {
  // Local variables
  const store = (userStore || localStore)(config, emitter);
  const contexts = new Map();

  /**
   * Adds an element to the end of the queue
   * @param {*} id
   * @param {*} params 
   */
  function add(id, params) {
    const key = contextKey(params);

    const record = store.get(recordKey(key, id));
    if (record !== undefined) {
      emitter.emit('cacheHit', { key, id, params, deferred: !!(record.value) });
      return record.value || record.promise;
    }

    emitter.emit('cacheMiss', { key, id, params });

    const context = store.get(key);
    console.log('setting context', context)
    if (context === undefined) {
      contexts.set(key, {
        ids: [id],
        params,
        attempts: 0,
        scale: (config.retry) ? config.retry.scale.base : 0,
        timer: setTimeout(() => query(key), config.batch.tick),
      });
    } else {
      context.ids.push(id);
      if (context.ids.length >= config.batch.limit) {
        query(key);
      }
      else {
        if (context.timer === null) {
          context.timer = setTimeout(() => query(key), config.batch.tick);
        }
      }
    }

    const recordDef = { promise: Promise.resolve(), value: null };

    store.set(recordKey(key, id), recordDef);
    return recordDef.promise;
  }

  /**
   * Skips queue and cache, gets an element directly
   * @param {*} id
   * @param {*} params 
   */
  function skip(id, params) {
    console.log('skip')
    return config.getter.method(id, params);
  }

  /**
   * Runs the getter function
   */
  function query(key, ids) {
    const context = store.get(key);
    if (context !== undefined) {
      clearTimeout(context.timer);
      const targetIds = ids || context.ids.splice(0,config.batch.limit);
      emitter.emit('batch', { key, ids: targetIds, params });
      config.getter.method(targetIds, context.params)
        .catch(err => retry(key, targetIds, params, err))
        .then(
          results => complete(key, targetIds, params, results),
          err => retry(key, targetIds, params, err)
        );
      
      if (context.ids.length > 0) {
        context.timer = setTimeout(() => query(key), config.batch.tick);
      }
      else {
        context.timer = null;
      }
    }
  }

  function retry(key, ids, params, err) {
    emitter.emit('batchFailed', { key, ids, params, error: err });
    const context = store.get(key);
    if (context !== undefined) {
      context.attempts = context.attempts + 1;
      if (config.retry) {
        if (config.retry.max >= context.attempts) {
          context.scale = context.scale * config.retry.scale.mult;
          context.timer = setTimeout(() => query(key, ids), context.scale);
        }
      }
      else {
        emitter.emit('batchCancelled', { key, ids, params, error: err });
      }
    }
  }

  function complete(key, ids, params, results) {
    emitter.emit('batchSuccess', { key, ids, params });
    const parser = config.getter.responseParser || (results => results);
    const records = parser(results, ids, params);
    const context = store.get(key);
    if (context !== undefined) {
      if (context.ids === 0) store.clear(key);
      else {
        context.attempts = 0;
        context.scale = config.retry.scale.base;
      }
    }

    return Promise.all(ids.map(id => {
      const record = store.get(id);
      if (record) record.promise.resolve(records[id]);

      if (config.cache) store.set(id, { value: records[id] }, { ttl: config.cache.ttl });
      else store.clear(id);
    }));
  }

  function contextKey(params) {
    return (config.uniqueOptions || []).map(opt => `${curr}=${params[curr]}`).join(';');
  }

  function recordKey(context, id) {
    return `${context}::${id}`;
  }

  function has(id, params) {
    return store.has(recordKey(contextKey(params), id));
  }

  function clear(id, params) {
    return store.clear(recordKey(contextKey(params), id));
  }

  function size() {
    return {
      contexts: contexts.size,
      records: store.size(),
    };
  }

  return { add, skip, has, clear, store, complete, contextKey, retry, query, size };
}

module.exports = queue;
