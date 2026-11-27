import { settleAndLog, type StoreSignals } from './utils.ts';
import { type HydratedConfig } from './options.ts';

export default class Caches {
  #signals: StoreSignals;
  #enabled: boolean;
  #local: HACacheStore | undefined;
  #remotes: HACacheStore[];

  constructor(config: HydratedConfig, signals: StoreSignals) {
    this.#signals = signals;
    this.#enabled = config.caches.length > 0;
    this.#local = config.caches.find(cache => cache.local);
    this.#remotes = config.caches.filter(cache => !cache.local);
  }

  get(key) {
    if (!this.#enabled) return undefined;

    const localValue = this.#local?.get(key);
    if (localValue !== undefined) {
      this.#signals.localCacheHit.emit(1);
      this.#signals.cacheHit.emit(1);
      return localValue;
    }

    return settleAndLog(this.#remotes.map(remote => remote.get(key)))
      .then((remoteValues) => {
        const responseValue = remoteValues.find(value => value !== undefined);
        if (responseValue !== undefined) {
          this.#signals.cacheHit.emit(1);
        }
        else {
          this.#signals.cacheMiss.emit(1);
        }
        return responseValue;
      });
  }

  getMulti(recordKey, keys) {
    if (!this.#enabled) return Promise.resolve(Array.from(new Array(keys.length), () => undefined));

    const localValues = this.#local?.getMulti(recordKey, keys) as unknown[] | undefined;
    const foundLocally = localValues && localValues.filter(value => value !== undefined).length;
    if (foundLocally) {
      this.#signals.localCacheHit.emit(foundLocally);
      this.#signals.cacheHit.emit(foundLocally);
    }
    if (foundLocally && foundLocally === keys.length) {
      return Promise.resolve(localValues);
    }

    // TODO: remove found local keys from remote query
    return settleAndLog(this.#remotes.map(remote => remote.getMulti(recordKey, keys)))
      .then((remoteValues) => {
        const responseValues = Object.assign([], ...remoteValues, localValues).map(value => (value === null || value === undefined) ? undefined : value);
        const foundRemotely = remoteValues.filter(value => value !== undefined);
        const missingValues = responseValues.filter(value => value === undefined);
        this.#signals.cacheHit.emit(foundRemotely.length);
        this.#signals.cacheMiss.emit(missingValues.length);
        return responseValues;
      });
  }

  set(recordKey, keys, values) {
    if (!this.#enabled) return undefined;

    this.#local?.set(recordKey, keys, values);
    return Promise.all(this.#remotes.map(remote => remote.set(recordKey, keys, values))).catch(err => console.log('error writing', err));
  }

  clear(key) {
    if (!this.#enabled) return undefined;

    this.#local?.clear(key);
    this.#remotes.forEach(remote => remote.clear(key));
    return true;
  }

  disconnectRemotes() {
    this.#remotes.forEach(remote => (remote as HACacheStore & { disconnect?: () => void }).disconnect?.());
  }

  size() {
    if (!this.#enabled) {
      return Promise.resolve({
        local: 0,
        remote: 0,
        status: 'disabled',
      });
    }

    return Promise.resolve(this.#remotes[0]?.size())
      .then((remoteItems) => {
        return {
          local: this.#local?.size(),
          remote: remoteItems || 0,
        };
      });
  }
}
