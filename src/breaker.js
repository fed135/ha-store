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
  let violations = 0;
  let curve = tween(config.breaker);

  function closeCircuit() {
    if (!config.breaker) return;
    active = false;
    clearTimeout(timer);
    timer = null;
    step = 0;
    violations = 0;
    emitter.emit('circuitRecovered', status());
  }

  function restoreCircuit() {
    if (!config.breaker) return;
    active = false;
    clearTimeout(timer);
    timer = null;
    violations = 0;
    emitter.emit('circuitRestored', status());
  }

  function openCircuit() {
    if (config.breaker && active === false) {
      violations++;
      if (config.breaker.tolerance <= violations) {
        const ttl = Math.round(curve(step));
        if (step < config.breaker.steps) {
          step++;
        }
        active = true;
        emitter.emit('circuitBroken', status(ttl));
        timer = setTimeout(restoreCircuit, ttl);
      }
    }
  }

  function status(ttl) {
    return { step, active, ttl };
  }

  return { circuitError, openCircuit, restoreCircuit, closeCircuit, status };
}

/* Exports -------------------------------------------------------------------*/

module.exports = breaker;
