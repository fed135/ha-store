/**
 * Queue processing
 */

/* Requires ------------------------------------------------------------------*/

const { tween, basicParser, deferred, contextKey, recordKey } = require('./utils.js');

/* Methods -------------------------------------------------------------------*/

function queue(config, emitter, store, storePlugin, breaker) {

  // Local variables
  const contexts = new Map();
  let targetStore = storePlugin && storePlugin(config, emitter) || store;
  emitter.on('storePluginErrored', () => {
    if (config.storePluginFallback === true) {
      targetStore = store;
      setTimeout(() => {
        emitter.emit('storePluginRestored'), 
        targetStore = storePlugin && storePlugin(config, emitter) || store;
      }, config.storePluginRecoveryDelay);
    }
  });

  /**
   * Attempts to read a query item from cache
   * If no records are found, a deferred handle is created
   * @param {string} key The context key
   * @param {string} id The record id
   * @param {object} context The context object
   * @returns {*|null} The cache result
   */
  async function lookupCache(key, id, context) {
    if (config.cache !== null) {
      const record = await store.get(recordKey(key, id));
      
      if (record !== undefined && record !== null) {
        emitter.emit('cacheHit', { key, id, params: context.params });
        return record.value;
      }

      emitter.emit('cacheMiss', { key, id, params: context.params });
    }

    const expectation = context.promises.get(id);
    if (expectation !== undefined) {
      emitter.emit('coalescedHit', { key, id, params: context.params });
      return expectation.promise;
    }
    else {
      context.promises.set(id, deferred());
      context.ids.push(id);
    }
    
    return null;
  }

  /**
   * Creates or returns a context object
   * @param {string} key The context key
   * @param {*} params The parameters for the context
   * @returns {object} The context object
   */
  function resolveContext(key, params) {
    let context = contexts.get(key);
    if (context === undefined) {
      context = {
        ids: [],
        promises: new Map(),
        params,
        retry: {
          step: 0,
          curve: tween(config.retry),
        },
        timer: null,
      };
      contexts.set(key, context);
    }
    return context;
  }

  /**
   * Gathers the ids in preparation for a data-source query
   * @param {string} type The type of query (direct, batch or retry)
   * @param {string} key The context key
   * @param {object} context The context object
   */
  function batch(type, key, context) {
    clearTimeout(context.timer);
    context.timer = null;
    const targetIds = context.ids.splice(0, context.ids.length);
    if (targetIds.length > 0) {
      query(type, key, targetIds, context);
    }
  }

  /**
   * Main queue function
   * - Checks circuit-breaker status
   * - Resolves context object and deferred handlers
   * - Looks-up cache
   * - Prepares data-source query timer/invocation
   * @param {string} id The id of the record to query
   * @param {*} params The parameters for the query
   * @param {boolean} startQueue Wether to start the queue immediately or not
   */
  async function push(id, params, startQueue) {
    if (breaker.status().active === true) return Promise.reject(breaker.error);
    const key = contextKey(config.uniqueParams, params);
    const context = resolveContext(key, params);
    let entity = await lookupCache(key, id, context);
    if (entity === null) entity = context.promises.get(id).promise;

    if (config.batch) {
      if (context.timer === null) {
        context.timer = setTimeout(batch.bind(null, 'batch', key, context), config.batch.tick);
      }
    }
    else {
      if (startQueue === true) batch('direct', key, context);
    }
    
    return entity;
  }

  /**
   * Performs the query to the data-source
   * @param {string} type The type of query (direct, batch or retry)
   * @param {string} key The context key
   * @param {array} ids The ids to query
   * @param {object} context The context object
   */
  function query(type, key, ids, context) {
    // Force-bucket
    let targetIds = ids.splice(0, config.batch ? config.batch.max: ids.length);
    if (ids.length > 0) {
      query(type, key, ids, context);
    }
    if (targetIds.length > 0) {
      emitter.emit('query', { type, key, ids: targetIds, params: context.params, step: (type === 'retry') ? context.retry.step : undefined });
      Promise.resolve(config.resolver(targetIds, context.params))
        .catch(err => retry(key, targetIds, context, err))
        .then(
          function handleQuerySuccess(results) {
            emitter.emit('querySuccess', { type, key, ids: targetIds, params: context.params, step: (type === 'retry') ? context.retry.step : undefined });
            complete(key, targetIds, context, results);
          },
          function handleQueryError(err) {
            emitter.emit('queryFailed', { type, key, ids: targetIds, params: context.params, error: err, step: (type === 'retry') ? context.retry.step : undefined });
            retry(key, targetIds, context, err);
          }
        );
    }
  }

  /**
   * Query failure handler
   * Assures the queries are properly retried after the configured amount of time
   * @param {string} key The context key
   * @param {array} ids The list of ids to query
   * @param {object} context The context object
   * @param {Error} err The error that caused the failure
   */
  function retry(key, ids, context, err) {
    context.retry.step = context.retry.step + 1;
    if (config.retry && config.retry.limit >= context.retry.step) {
      setTimeout(query.bind(null, 'retry', key, ids, context), context.retry.curve(context.retry.step));
    }
    else {
      emitter.emit('retryCancelled', { key, ids, params: context.params, error: err });
      ids.forEach((id) => {
        const expectation = context.promises.get(id);
        if (expectation !== undefined) {
          expectation.reject(err);
          context.promises.delete(id);
        }
      });
      breaker.openCircuit();
    }
  }

  /**
   * Query success handler
   * Assures the results are properly parsed, promises resolved and contexts cleaned up
   * @param {string} key The context key
   * @param {array} ids The list of ids to query
   * @param {object} context The context object
   * @param {*} results The query results
   */
  function complete(key, ids, context, results) {
    const parser = config.responseParser || basicParser;
    const records = parser(results, ids, context.params);
    ids.forEach((id) => {
      const expectation = context.promises.get(id);
      if (expectation !== undefined) {
        expectation.resolve(records[id]);
        context.promises.delete(id);
      }
    });

    if (context.ids.length > 0) {
      context.retry.step = 0;
    }
    else {
      if (context.promises.size === 0) contexts.delete(key);
    }

    if (config.cache) {
      store.set(recordKey.bind(null, key), ids, records, { step: 0 });
    }
    if (breaker.status().step > 0) {
      breaker.closeCircuit();
    }
  }

  /**
   * The number of active contexts
   * @returns {number} The number of active contexts
   */
  function size() {
    return contexts.size;
  }

  return { batch, push, size, retry, query, resolveContext, complete, store: targetStore };
}

/* Exports -------------------------------------------------------------------*/

module.exports = queue;
