import { contextRecordKey, deferred, type StoreSignals } from './utils.ts';
import { type HydratedConfig } from './options.ts';
import type Caches from './caches.ts';

const BufferState = {
  PENDING: 0,
  RUNNING: 1,
  COMPLETED: 2,
};

type RequestBufferDependencies = {
  config: HydratedConfig
  signals: StoreSignals
  caches: Caches
  release: (buffer: RequestBuffer) => void
};

class RequestBuffer {
  uid = Math.random().toString(36);
  state = BufferState.PENDING;
  ids: string[] = [];
  contextKey: string;
  params: any;
  contexts: any[] = [];
  handle = deferred<any>();
  #timer: NodeJS.Timeout | null = null;
  #dependencies: RequestBufferDependencies;

  constructor(key: string, params, dependencies: RequestBufferDependencies) {
    this.contextKey = key;
    this.params = params;
    this.#dependencies = dependencies;
  }

  tick() {
    const { batch } = this.#dependencies.config;

    if (this.ids.length >= batch.limit) {
      this.#run('limit');
      return this;
    }

    // TODO: think out and test out impacts of batch-disabled still going through a Timeout of 0.
    if (this.#timer === null) {
      this.#timer = setTimeout(() => this.#run('timeout'), batch.delay);
    }

    return this;
  }

  #run(cause: QueryEvent['cause']) {
    const { config, signals } = this.#dependencies;

    this.state = BufferState.RUNNING;
    clearTimeout(this.#timer);
    signals.query.emit({ cause, key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params, contexts: this.contexts, ids: this.ids });
    let request;
    try {
      request = Promise.resolve(config.resolver(this.ids, this.params, this.contexts));
    }
    catch (e) {
      return this.#handleQueryError(e);
    }
    request.then(entries => this.#handleQuerySuccess(entries), error => this.#handleQueryError(error));
  }

  #handleQueryError(error) {
    this.state = BufferState.COMPLETED;
    this.#dependencies.signals.queryFailed.emit({ key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params, error });
    this.handle.reject(error);
    this.#dependencies.release(this);
  }

  #handleQuerySuccess(entries) {
    this.state = BufferState.COMPLETED;
    this.#dependencies.signals.querySuccess.emit({ key: this.contextKey, uid: this.uid, size: this.ids.length, params: this.params });
    this.handle.resolve(entries);
    this.#dependencies.caches.set(contextRecordKey(this.contextKey), this.ids, entries || {});
    this.#dependencies.release(this);
  }
}

export default class QueryBuffer {
  #buffers: RequestBuffer[] = [];
  #dependencies: RequestBufferDependencies;

  constructor(config: HydratedConfig, signals: StoreSignals, caches: Caches) {
    this.#dependencies = {
      config,
      signals,
      caches,
      release: buffer => this.#buffers.splice(this.#buffers.indexOf(buffer), 1),
    };
  }

  getHandles(key, ids, params, context) {
    return this.#dependencies.caches.getMulti(contextRecordKey(key), ids.concat())
      .then((handles) => {
        let numCoalesced = 0;

        for (let i = 0; i < ids.length; i++) {
          if (handles[i] === undefined) {
            const liveBuffer = this.#buffers.find(buffer => buffer.contextKey === key && buffer.ids.includes(ids[i]));
            if (liveBuffer) {
              numCoalesced++;
              handles[i] = liveBuffer.handle.promise.then(results => results && results[ids[i]]);
            }
            else {
              handles[i] = this.#assignQuery(key, ids[i], params, context).handle.promise.then(results => results && results[ids[i]]);
            }
          }
        }

        if (numCoalesced > 0) {
          this.#dependencies.signals.coalescedHit.emit(numCoalesced);
        }

        return handles;
      });
  }

  #assignQuery(key, id, params, context) {
    let liveBuffer = this.#buffers.find(buffer => buffer.contextKey === key && buffer.state === BufferState.PENDING);
    if (!liveBuffer) {
      liveBuffer = new RequestBuffer(key, params, this.#dependencies);
      this.#buffers.push(liveBuffer);
    }

    liveBuffer.ids.push(id);
    if (!liveBuffer.contexts.includes(context)) liveBuffer.contexts.push(context);

    liveBuffer.tick();
    return liveBuffer;
  }

  size() {
    return {
      pendingBuffers: this.#buffers.filter(buffer => buffer.state === BufferState.PENDING).length,
      activeBuffers: this.#buffers.filter(buffer => buffer.state === BufferState.RUNNING).length,
    };
  }
}
