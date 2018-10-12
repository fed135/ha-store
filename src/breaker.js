/**
 * Circuit-breaker component
 */

/* Requires ------------------------------------------------------------------*/

const { tween } = require('./utils.js');

/* Methods -------------------------------------------------------------------*/

function breaker(config, emitter) {
  let active = false;
  const circuitError = new Error('Service unavailable (circuit-breaker)');
  let timer = null;
  let step = 0;
  let curve = tween(config.breaker);

  function closeCircuit() {
    active = false;
    clearTimeout(timer);
    timer = null;
    step = 0;
    emitter.emit('circuitRecovered', status());
  }

  function restoreCircuit() {
    active = false;
    clearTimeout(timer);
    timer = null;
    emitter.emit('circuitRestored', status());
  }

  function openCircuit() {
    if (config.breaker && active === false) {
      const ttl = Math.round(curve(step));
      step++;
      active = true;
      emitter.emit('circuitBroken', status(ttl));
      timer = setTimeout(restoreCircuit, ttl);
    }
  }

  function status(ttl) {
    return { step, active, ttl };
  }

  return { circuitError, openCircuit, restoreCircuit, closeCircuit, status };
}

/* Exports -------------------------------------------------------------------*/

module.exports = breaker;
