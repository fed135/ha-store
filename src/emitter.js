const EventEmitter = require('events').EventEmitter;

class DeferredEmitter extends EventEmitter {
  constructor() {
    super();
    this._counters = {
      localCacheHit: 0,
      cacheHit: 0,
      cacheMiss: 0,
      coalescedHit: 0,
    };

    this._timer = setInterval(() => {
      for (const type in this._counters) {
        if (this._counters[type] !== 0) this.emit(type, this._counters[type]);
        this._counters[type] = 0;
      }
    }, 1000);
  }

  track(type, number) {
    this._counters[type] += number;
  }
}

module.exports = DeferredEmitter;
