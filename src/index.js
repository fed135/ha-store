const queue = require('./buffer');
const caches = require('./caches');
const DeferredEmitter = require('./emitter');
const {contextKey, recordKey, contextRecordKey} = require('./utils');
const {hydrateConfig} = require('./options');

class HaStore extends DeferredEmitter {
  constructor(initialConfig) {
    super();

    this.config = hydrateConfig(initialConfig);

    this.store = caches(this.config, this);

    this.queue = queue(
      this.config,
      this,
      this.store
    );
  }

  get(id, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this.queue.getHandles(key, [id], params, agg)
      .then(handles => handles[0]);
  }

  getMany(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this.queue.getHandles(key, ids, params, agg)
      .then((handles) => Promise.allSettled(handles)
        .then((outcomes) => ids.reduce((handles, id, index) => {
          handles[id] = outcomes[index];
          return handles;
        }, {})));
  }

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.delimiter, params);
    return this.store.set(contextRecordKey(key), ids, items);
  }

  clear(ids, params) {
    if (this.store === null) return true;
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this.store.clear(ids, params);
  }

  size() {
    return this.store.size()
      .then(records => ({
        ...this.queue.size(),
        records,
      }));
  }

  getStorageKey(id, params) {
    return recordKey(contextKey(this.config.delimiter, params), id);
  }
}

function make(initialConfig = {}) {
  return new HaStore(initialConfig);
}

module.exports = make;
