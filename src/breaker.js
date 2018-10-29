/**
 * Circuit-breaker component
 */

/* Requires ------------------------------------------------------------------*/

const {tween} = require('./utils.js');

/* Methods -------------------------------------------------------------------*/

function breaker(config, emitter) {
  let active = false;
  const circuitError = new Error('Service unavailable (circuit-breaker)');
  let timer = null;
  let toleranceTimers = [];
  let step = 0;
  let violations = 0;
  let curve = tween(config.breaker);

  function reset() {
    clearTimeout(timer);
    timer = null;
    toleranceTimers.forEach(clearTimeout);
    toleranceTimers = [];
    violations = 0;
  }

  function closeCircuit() {
    if (!config.breaker) return;

    reset();
    active = false;
    step = 0;
    emitter.emit('circuitRecovered', status());
  }

  function restoreCircuit() {
    if (!config.breaker) return;

    reset();
    active = false;
    emitter.emit('circuitRestored', status());
  }

  function decreaseViolation() {
    if (active === false && violations > 0) {
      violations--;
    }
  }

  function openCircuit() {
    if (!config.breaker) return;

    if (active === false) {
      violations++;
      if (config.breaker.tolerance <= violations) {
        reset();
        const ttl = Math.round(curve(step));
        if (step < config.breaker.steps) {
          step++;
        }
        active = true;
        emitter.emit('circuitBroken', status(ttl));
        timer = setTimeout(restoreCircuit, ttl);
      } else {
        setTimeout(decreaseViolation, config.breaker.toleranceFrame);
      }
    }
  }

  function status(ttl) {
    return {step, active, ttl};
  }

  return {
    circuitError,
    openCircuit,
    restoreCircuit,
    closeCircuit,
    status,

    // TODO DPL: Deprecate this contract and remove duplicated functions (also, `close` === `restore`?)
    open: openCircuit,
    close: restoreCircuit,
  };
}

/* Exports -------------------------------------------------------------------*/

module.exports = breaker;
