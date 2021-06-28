const queue = require('./queries.js');
const {contextKey, recordKey, contextRecordKey} = require('./utils.js');
const EventEmitter = require('events').EventEmitter;
const {hydrateConfig} = require('./options');

/* Local variable ------------------------------------------------------------*/

class HaStore extends EventEmitter {
  constructor(initialConfig, emitter) {
    super();

    if (typeof initialConfig.resolver !== 'function') {
      throw new Error(`config.resolver [${initialConfig.resolver}] is not a function`);
    }

    if (emitter && !emitter.emit) {
      throw new Error(`${emitter} is not an EventEmitter`);
    }

    this.config = hydrateConfig(initialConfig);

    if (this.setMaxListeners) {
      this.setMaxListeners(Infinity);
    }

    this.store = this.config.cache ? this.config.store(this.config) : null;

    this.queue = queue(
      this.config,
      this,
      this.store
    );
  }

  get(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.uniqueParams, params);
    return this.queue.getHandles(key, [ids], params, agg)
      .then(handles => handles[0]);
  }

  getMany(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.uniqueParams, params);
    return this.queue.getHandles(key, ids, params, agg)
      .then((handles) => Promise.allSettled(handles)
        .then((responses) => ids.reduce((acc, curr, index) => {
          acc[curr] = responses[index];
          return acc;
        }, {})));
  }

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.uniqueParams, params);
    return this.store.set(contextRecordKey(key), ids, items);
  }

  clear(ids, params) {
    if (this.store === null) return true;
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this.store.clear(this.getKey(ids, params));
  }

  size() {
    return {
      ...this.queue.size(),
      records: (this.store) ? this.store.size() : 0,
    };
  }

  getKey(id, params) {
    return recordKey(contextKey(this.config.uniqueParams, params), id);
  }
}

/* Exports -------------------------------------------------------------------*/

function make(initialConfig = {}, emitter = new EventEmitter()) {
  return new HaStore(initialConfig, emitter);
}

module.exports = make;
