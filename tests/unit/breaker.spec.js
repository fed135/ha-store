/**
 * Breaker component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const breaker = require('../../src/breaker.js');
const { exp } = require('../../src/utils.js');
const EventEmitter = require('events').EventEmitter;
const expect = require('chai').expect;
const sinon = require('sinon');

/* Local variables -----------------------------------------------------------*/

const config = {
  breaker: {
    base: 1,
    steps: 10,
    limit: 100,
    curve: exp,
    tolerance: 1,
  },
};

/* Tests ---------------------------------------------------------------------*/

describe('breaker', () => {
  let testCircuit;
  let testEmitter;
  
  describe('#closeCircuit', () => {
    beforeEach(() => {
      testEmitter = new EventEmitter();
      testCircuit = breaker(config, testEmitter);
    });
      
    it('should close an opened circuit', (done) => {
      testCircuit.openCircuit();
      testEmitter.on('circuitRecovered', (status) => {
        expect(testCircuit.status()).to.deep.equal(status);
        expect(testCircuit.status()).to.deep.equal({ step: 0, active: false, ttl: undefined });
        done();
      });
      testCircuit.closeCircuit();
    });
  });

  describe('#openCircuit', () => {
    beforeEach(() => {
      testEmitter = new EventEmitter();
      testCircuit = breaker(config, testEmitter);
    });
          
    it('should open a circuit', (done) => {
      testEmitter.on('circuitBroken', (status) => {
        expect(status.step).to.equal(1);
        expect(status.active).to.be.true;
        expect(status.ttl).to.be.at.least(1);
        testEmitter.on('circuitRestored', (savedStatus) => {
          expect(testCircuit.status()).to.deep.equal(savedStatus);
          expect(testCircuit.status()).to.deep.equal({ step: 1, active: false, ttl: undefined });
          done();
        });
      });
      testCircuit.openCircuit();
    });

    it('should open a circuit when a custom tolerance is provided', (done) => {
      config.breaker.tolerance = 2;
      let called = 0;
      testEmitter.on('circuitBroken', (status) => {
        called++;
        expect(status.step).to.equal(1);
        expect(called).to.equal(1);
        expect(status.active).to.be.true;
        expect(status.ttl).to.be.at.least(1);
        testEmitter.on('circuitRestored', (savedStatus) => {
          expect(testCircuit.status()).to.deep.equal(savedStatus);
          expect(testCircuit.status()).to.deep.equal({ step: 1, active: false, ttl: undefined });
          done();
        });
      });
      testCircuit.openCircuit();
      testCircuit.openCircuit();
    });
  });
});
