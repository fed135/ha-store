/**
 * Queue processing
 */

/* Requires ------------------------------------------------------------------*/

const localStore = require('./store.js');
const circuitBreaker = require('./breaker.js');
const { tween, basicParser } = require('./utils.js');

/* Methods -------------------------------------------------------------------*/

function queue(config, emitter, userStore) {

  // Local variables
  const store = (userStore || localStore)(config, emitter);
  const breaker = circuitBreaker(config, emitter);
  const contexts = new Map();

  async function lookupCache(key, id, params) {
    if (config.cache !== null) {
      const record = await store.get(recordKey(key, id));
      
      if (record !== undefined && record !== null) {
        emitter.emit('cacheHit', { key, id, params, deferred: !!(record.value) });
        return record.value || record.promise;
      }
      emitter.emit('cacheMiss', { key, id, params });
    }
    return null;
  }

  async function addToQueue(key, id, params) {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    let context = contexts.get(key);
    if (context === undefined) {
      const expectations = new Map();
      expectations.set(id, [{ resolve, reject }]);
      contexts.set(key, {
        ids: [id],
        promises: expectations,
        params,
        retry: {
          step: 0,
          curve: tween(config.retry),
        },
        timer: setTimeout(query.bind(null, key), config.batch.tick),
      });
    }
    else {
      const expectations = context.promises.get(id);
      if (expectations === undefined) context.promises.set(id, [{ resolve, reject }]);
      else expectations.push({ resolve, reject });
      context.ids.push(id);
      if (context.timer === null) {
        context.timer = setTimeout(query.bind(null, key), config.batch.tick);
      }
    }
    
    return promise;
  }

  async function batch(id, params) {
    if (breaker.status().active === true) return Promise.reject(breaker.error);
    const key = contextKey(params);
    const cached = await lookupCache(key, id, params);
    if (cached !== null) return cached;
    return addToQueue(key, id, params);
  }

  async function direct(ids, params) {
    if (breaker.status().active === true) return Promise.reject(breaker.error);
    if (!Array.isArray(ids)) ids = [ids];
    const key = contextKey(params);
    const cachedResults = [];

    return Promise.resolve(ids.reduce(async (acc, id) => {
      const cached = await lookupCache(key, id, params);
      if (cached !== null) {
        cachedResults.push(cached);
        return acc;
      }
      return Promise.resolve(acc)
        .then((res) => {
          res.push(id);
          return res;
        });
    }, []))
      .then((notFound) => {
        if (notFound.length === 0) return Promise.resolve(cachedResults);

        return Promise.resolve(config.getter.method(notFound, params))
          .catch(err => retry(key, notFound, params, err))
          .then(
            function handleSuccess(results) {
              complete(key, notFound, params, results);
              return [...results || [], ...cachedResults];
            },
            function handleError(err) {
              return retry(key, notFound, params, err);
            }
          );
      });
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
        targetIds = ids.splice(0, config.batch.max);
        if (ids.length > 0) {
          query(key, ids);
        }
      }
      else {
        clearTimeout(context.timer);
        context.timer = null;
        targetIds = context.ids.splice(0, config.batch.max);
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
      context.retry.step = context.retry.step + 1;
      if (config.retry && config.retry.limit >= context.retry.step) {
        setTimeout(query.bind(null, key, ids), context.retry.curve(context.retry.step));
      }
      else {
        emitter.emit('retryCancelled', { key, ids, params, error: err });
        ids.forEach((id) => {
          const expectations = context.promises.get(id);
          if (expectations !== undefined) {
            expectations.forEach(rec => rec.reject(err));
            context.promises.delete(id);
          }
        });
        breaker.openCircuit();
      }
    }
  }

  function complete(key, ids, params, results) {
    const parser = config.getter.responseParser || basicParser;
    const records = parser(results, ids, params);
    const context = contexts.get(key);
    if (context !== undefined) {
      ids.forEach((id) => {
        const expectations = context.promises.get(id);
        if (expectations !== undefined) {
          expectations.forEach(rec => rec.resolve(records[id]));
          context.promises.delete(id);
        }
      });

      if (context.ids.length > 0) {
        context.retry.step = 0;
      }
      else {
        if (context.promises.size === 0) contexts.delete(key);
      }
    }
    if (config.cache) {
      store.set(recordKey.bind(null, key), ids, records, { step: 0 });
    }
    if (breaker.status().step > 0) {
      breaker.closeCircuit();
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

  return { batch, direct, has, clear, store, complete, contextKey, retry, query, size };
}

/* Exports -------------------------------------------------------------------*/

module.exports = queue;
