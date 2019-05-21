/**
 * Batcher index
 */

'use strict';

/* Requires ------------------------------------------------------------------*/

const queue = require('./queries.js');
const store = require('./store.js');
const {contextKey, recordKey, contextRecordKey} = require('./utils.js');
const EventEmitter = require('events').EventEmitter;
const {hydrateConfig} = require('./options');

/* Local variable ------------------------------------------------------------*/

class HaStore extends EventEmitter {
  constructor(initialConfig, emitter) {
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

    this.store = this.config.cache ? store(this.config) : null;

    this.queue = queue(
      this.config,
      this,
      this.store,
    );
  }

  /**
   * Gets a list of records from source
   * @param {string|number|array<string|number>} ids The id of the record to fetch
   * @param {object} params (Optional)The Request parameters
   * @returns {Promise} The eventual single record
   */
  async get(ids, params = {}, agg = null) {
    if (params === null) params = {};
    const requestIds = (Array.isArray(ids)) ? ids : [ids];
    const key = contextKey(this.config.uniqueParams, params);
    return Promise.all(this.queue.getHandles(key, requestIds, params, agg))
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
    return this.store.set(contextRecordKey(key), ids, items);
  }

  /**
   * Clears one or more recors from temp store
   * @param {string|number|array<string|number>} ids The id(s) to clear
   * @param {object} params (Optional) The Request parameters
   * @returns {boolean} The result of the clearing
   */
  clear(ids, params) {
    if (this.store === null) return true;
    if (Array.isArray(ids)) {
      return ids.map(id => this.clear(id, params));
    }

    return this.store.clear(this.getKey(ids, params));
  }

  /**
   * Returns the amount of records and contexts in memory
   * @returns {object}
   */
  async size() {
    return {
      ...this.queue.size(),
      records: (this.store) ? await this.store.size() : 0,
    };
  }

  /**
   * Returns a record key
   * @param {string|number} id The id of the item
   * @param {object} params The parameters for the request
   * @returns {string} The record key
   */
  getKey(id, params) {
    return recordKey(contextKey(this.config.uniqueParams, params), id);
  }
}

/* Exports -------------------------------------------------------------------*/

function make(initialConfig = {}, emitter = new EventEmitter()) {
  return new HaStore(initialConfig, emitter);
}

module.exports = make;
