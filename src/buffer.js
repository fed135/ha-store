const {contextRecordKey, deferred} = require('./utils');

function queryBuffer(config, emitter, targetStore) {
  const buffers = [];

  let numCoalesced = 0;
  let numCached = 0;
  let numMisses = 0;

  class RequestBuffer {
    constructor(key, params) {
      this.uid = Math.random().toString(36);
      this.status = 0;
      this.ids = [];
      this.contextKey = key;
      this.params = params;
      this.contexts = [];
      this.handle = deferred();
      this.timer = null;
    }

    tick() {
      const sizeLimit = config.batch?.limit || 1;

      if (this.ids.length >= sizeLimit) {
        this.run();
        return this;
      }
      if (this.timer === null) {
        this.timer = setTimeout(this.run.bind(this), config.batch?.delay || 0);
      }
      return this;
    }

    run() {
      this.state = 1;
      clearTimeout(this.timer);
      emitter.emit('query', this);
      config.resolver(this.ids, this.params, this.contexts)
        .then(this.handleQuerySuccess.bind(this), this.handleQueryError.bind(this));
      
      if (numCached > 0) {
        emitter.emit('cacheHit', { found: numCached });
        numCached = 0;
      }
      if (numMisses > 0) {
        emitter.emit('cacheMiss', { found: numMisses });
        numMisses = 0;
      }
      if (numCoalesced > 0) {
        emitter.emit('coalescedHit', { found: numCoalesced });
        numCoalesced = 0;
      }
    }

    handleQueryError(error) {
      this.state = 2;
      emitter.emit('queryFailed', { key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params, error });
      this.handle.reject(error);
      buffers.splice(buffers.indexOf(this));
    }
  
    handleQuerySuccess(entries) {
      this.state = 2;
      emitter.emit('querySuccess', { key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params });
      this.handle.resolve(entries);
      if (config.cache !== null) targetStore.set(contextRecordKey(this.contextKey), this.ids, entries || {});
      buffers.splice(buffers.indexOf(this));
    }
  }

  async function getHandles(key, ids, params, context) {
    const handles = Array.from(new Array(ids.length));

    if (config.cache !== null) {
      const cacheResult = await targetStore.getMulti(contextRecordKey(key), ids.map((id, i) => handles[i] === undefined ? id : undefined));
      for (let i = 0; i < cacheResult.length; i++) {
        if (cacheResult[i] !== undefined) {
          numCached++;
          handles[i] = cacheResult[i];
        }
      }
    }

    for (let i = 0; i < ids.length; i++) {
      if (handles[i] === undefined) {
        const liveBuffer = buffers.find(buffer => buffer.contextKey === key && buffer.ids.includes(ids[i]));
        if (liveBuffer) {
          numCoalesced++;
          handles[i] = liveBuffer.handle.promise.then(results => results[ids[i]]);
        }
        else {
          numMisses++;
          handles[i] = assignQuery(key, ids[i], params, context).handle.promise.then(results => results[ids[i]]);
        }
      }
    }

    return handles;
  }

  function assignQuery(key, id, params, context) {
    let liveBuffer = buffers.find(buffer => buffer.contextKey === key);
    if (!liveBuffer) {
      liveBuffer = new RequestBuffer(key, params);
      buffers.push(liveBuffer);
    }

    liveBuffer.ids.push(id);
    if (!liveBuffer.contexts.includes(context)) liveBuffer.contexts.push(context);

    liveBuffer.tick();
    return liveBuffer;
  }

  function size() {
    return {
      pendingBuffers: buffers.filter(buffer => buffer.status === 0).length,
      activeBuffers: buffers.filter(buffer => buffer.status === 1).length,
    }
  }

  return { getHandles, size };
}

module.exports = queryBuffer;
