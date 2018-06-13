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

  function _defaultParser(results, ids, params) {
    if (Array.isArray(results)) {
      return results.reduce((acc, curr) => {
        if (ids.includes(curr.id)) {
          acc[curr.id] = curr;
        }
        return acc;
      }, {});
    }
    return {};
  }

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
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    emitter.emit('cacheMiss', { key, id, params });
    const context = contexts.get(key);
    if (context === undefined) {
      contexts.set(key, {
        ids: [ id ],
        promises: { [id]: [{ resolve, reject }] }, // Consider Map ?
        params,
        attempts: 0,
        scale: (config.retry) ? config.retry.base : 0,
        timer: setTimeout(() => query(key), config.batch.tick),
      });
    } else {
      context.promises[id] = context.promises[id] || [];
      context.promises[id].push({ resolve, reject });
      context.ids.push(id);
      if (context.timer === null) {
        context.timer = setTimeout(() => query(key), config.batch.tick);
      }
    }

    return promise;
  }

  /**
   * Skips queue and cache, gets an element directly
   * @param {*} id
   * @param {*} params 
   */
  function skip(ids, params) {
    const key = contextKey(params);
    if (!Array.isArray(ids)) ids = [ids];
    return Promise.resolve(config.getter.method(ids, params))
      .catch(err => retry(key, ids, params, err))
      .then(
        function handleSuccess(results) {
          complete(key, ids, params, results);
          return results;
        },
        function handleError(err) {
          retry(key, ids, params, err);
        }
      );
  }

  /**
   * Runs the getter function
   */
  function query(key, ids) {
    const context = contexts.get(key);
    if (context !== undefined) {
      let targetIds = [];
      // Force-bucket
      if (ids) {
        targetIds = ids.splice(0, config.batch.limit);
        if (ids.length > 0) {
          query(key, ids);
        }
      }
      else {
        clearTimeout(context.timer);
        context.timer = null;
        targetIds = context.ids.splice(0, config.batch.limit);
        if (context.ids.length > 0) {
          query(key);
        }
      }
      // Check if batch size > 0
      if (targetIds.length > 0) {
        emitter.emit('batch', { key, ids: targetIds, params: context.params });
        Promise.resolve(config.getter.method(targetIds, context.params))
          .catch(err => retry(key, targetIds, context.params, err))
          .then(
            function handleBatchSuccess(results) {
              emitter.emit('batchSuccess', { key, ids: targetIds, params: context.params });
              complete(key, targetIds, context.params, results);
            },
            function handleBatchError(err) {
              emitter.emit('batchFailed', { key, ids: targetIds, params: context.params, error: err });
              retry(key, targetIds, context.params, err);
            }
          );
      }
    }
  }

  function retry(key, ids, params, err) {
    const context = contexts.get(key);
    if (context !== undefined) {
      context.attempts = context.attempts + 1;
      if (config.retry && config.retry.limit >= context.attempts) {
        context.scale = context.scale * config.retry.scale;
        setTimeout(() => query(key, ids), context.scale);
      }
      else {
        emitter.emit('retryCancelled', { key, ids, params, error: err });
        ids.forEach((id) => {
          if (context.promises[id]) {
            context.promises[id].forEach(rec => rec.reject(err));
            delete context.promises[id];
          }
        });
      }
    }
  }

  function complete(key, ids, params, results) {
    const parser = config.getter.responseParser || _defaultParser;
    const records = parser(results, ids, params);
    const context = contexts.get(key);
    if (context !== undefined) {
      ids.forEach((id) => {
        if (config.cache) store.set(id, { value: records[id] }, { ttl: config.cache.ttl });
        if (context.promises[id]) {
          context.promises[id].forEach(rec => rec.resolve(records[id]));
          delete context.promises[id];
        }
      });

      context.attempts = 0;
      context.scale = config.retry.base;
    }
  }

  function contextKey(params) {
    return (config.uniqueOptions || []).map(opt => `${opt}=${params[opt]}`).join(';');
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
