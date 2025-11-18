const queue = require('./buffer');
const caches = require('./caches');
const DeferredEmitter = require('./emitter');
const {contextKey, recordKey, contextRecordKey} = require('./utils');
const {hydrateConfig} = require('./options');

class HaStore extends DeferredEmitter {
  constructor(initialConfig) {
    super();

    this.config = Object.freeze(hydrateConfig(initialConfig));

    this._store = caches(this.config, this);

    this._queue = queue(
      this.config,
      this,
      this._store
    );
  }

  get(id, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this._queue.getHandles(key, [id], params, agg)
      .then(handles => handles[0]);
  }

  getMany(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const key = contextKey(this.config.delimiter, params);

    return this._queue.getHandles(key, ids, params, agg)
      .then((handles) => Promise.allSettled(handles)
        .then((outcomes) => ids.reduce((handles, id, index) => {
          handles[id] = outcomes[index];
          return handles;
        }, {})));
  }

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.delimiter, params);
    return this._store.set(contextRecordKey(key), ids, items);
  }

  clear(ids, params) {
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this._store.clear(ids, params);
  }

  size() {
    return this._store.size()
      .then(records => ({
        ...this._queue.size(),
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
