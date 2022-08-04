const {contextRecordKey, deferred} = require('./utils');

const BufferState = {
  PENDING: 0,
  RUNNING: 1,
  COMPLETED: 2,
};

function queryBufferConstructor(config, emitter, caches) {
  const buffers = [];

  let numCoalesced = 0;

  class RequestBuffer {
    constructor(key, params) {
      this.uid = Math.random().toString(36);
      this.state = BufferState.PENDING;
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
        this.run('limit');
        return this;
      }
      
      if (this.timer === null) {
        this.timer = setTimeout(this.run.bind(this, 'timeout'), config.batch?.delay || 0);
      }

      return this;
    }

    run(cause) {
      this.state = BufferState.RUNNING;
      clearTimeout(this.timer);
      emitter.emit('query', { cause, key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params, contexts: this.contexts, ids: this.ids });
      const request = config.resolver(this.ids, this.params, this.contexts);
      (request instanceof Promise ? request : Promise.resolve(request)).then(this.handleQuerySuccess.bind(this), this.handleQueryError.bind(this));
    }

    handleQueryError(error) {
      this.state = BufferState.COMPLETED;
      emitter.emit('queryFailed', { key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params, error });
      this.handle.reject(error);
      buffers.splice(buffers.indexOf(this), 1);
    }
  
    handleQuerySuccess(entries) {
      this.state = BufferState.COMPLETED;
      emitter.emit('querySuccess', { key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params });
      this.handle.resolve(entries);
      if (config.cache !== null) caches.set(contextRecordKey(this.contextKey), this.ids, entries || {});
      buffers.splice(buffers.indexOf(this), 1);
    }
  }

  function getHandles(key, ids, params, context) {
    return caches.getMulti(contextRecordKey(key), ids.concat())
      .then((handles) => {
        for (let i = 0; i < ids.length; i++) {
          if (handles[i] === undefined) {
            const liveBuffer = buffers.find(buffer => buffer.contextKey === key && buffer.ids.includes(ids[i]));
            if (liveBuffer) {
              numCoalesced++;
              handles[i] = liveBuffer.handle.promise.then(results => results[ids[i]]);
            }
            else {
              handles[i] = assignQuery(key, ids[i], params, context).handle.promise.then(results => results && results[ids[i]]);
            }
          }
        }

        if (numCoalesced > 0) {
          emitter.track('coalescedHit', numCoalesced);
          numCoalesced = 0;
        }

        return handles;
      });
  }

  function assignQuery(key, id, params, context) {
    let liveBuffer = buffers.find(buffer => buffer.contextKey === key && buffer.state === BufferState.PENDING);
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
      pendingBuffers: buffers.filter(buffer => buffer.state === BufferState.PENDING).length,
      activeBuffers: buffers.filter(buffer => buffer.state === BufferState.RUNNING).length,
    }
  }

  return { getHandles, size };
}

module.exports = queryBufferConstructor;
