/**
 * Batcher index
 */

/* Requires ------------------------------------------------------------------*/
const queue = require('./queue.js');
const store = require('./store.js');
const {contextKey, recordKey} = require('./utils.js');
const EventEmitter = require('events').EventEmitter;
const {hydrateConfig} = require('./options');

/* Local variable ------------------------------------------------------------*/

class HaStore extends EventEmitter {
  constructor(initialConfig = {}, emitter = new EventEmitter()) {
    super();

    // Parameter validation
    if (typeof initialConfig.resolver !== 'function') {
      throw new Error(`config.resolver [${initialConfig.resolver}] is not a function`);
    }

    if (emitter && !emitter.emit) {
      throw new Error(`${emitter} is not an EventEmitter`);
    }

    this.config = hydrateConfig(initialConfig);

    // Local variables
    if (this.setMaxListeners) {
      this.setMaxListeners(Infinity);
    }

    this.queue = queue(
      this.config,
      this,
      store(this.config, this),
      this.config.store,
    );
  }

  /**
   * Gets a list of records from source
   * @param {string|number|array<string|number>} ids The id of the record to fetch
   * @param {object} params (Optional)The Request parameters
   * @returns {Promise} The eventual single record
   */
  get(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const uid = Math.random().toString(36).substring(7);
    const requestIds = (Array.isArray(ids)) ? ids : [ids];
    const promises = requestIds.map((id, i) => {
      return this.queue.push(id, params, agg, (this.config.batch === null && i === requestIds.length - 1), uid);
    });
    return Promise.all(promises)
      .then(response => (!Array.isArray(ids)) ? response[0] : response);
  }

  /**
   * Inserts results into cache manually
   * @param {*} items Raw results from a data-source to load into cache
   * @param {array<string|number>} ids The id(s) to extract from the raw dataset
   * @param {object} params (Optional)The Request parameters
   * @returns {Promise} The eventual single record
   */

  set(items, ids, params = {}) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing required argument id list in batcher #set. ');
    const key = contextKey(this.config.uniqueParams, params);
    return this.queue.complete(key, ids, this.queue.resolveContext(key, params), items);
  }

  /**
   * Clears one or more recors from temp store
   * @param {string|number|array<string|number>} ids The id(s) to clear
   * @param {object} params (Optional) The Request parameters
   * @returns {boolean} The result of the clearing
   */
  clear(ids, params) {
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this.queue.store.clear(recordKey(contextKey(this.config.uniqueParams, params), ids));
  }

  /**
   * Returns the amount of records and contexts in memory
   * @returns {object}
   */
  async size() {
    return {
      contexts: this.queue.size(),
      records: await this.queue.store.size(),
    };
  }
}

/* Exports -------------------------------------------------------------------*/
function make(initialConfig = {}, emitter = new EventEmitter()) {
  return new HaStore(initialConfig, emitter);
}

module.exports = make;
