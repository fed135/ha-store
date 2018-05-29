/**
 * Queue component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const queue = require('../../src/queue');
const EventEmitter = require('events').EventEmitter;
const expect = require('chai').expect;
const sinon = require('sinon');

/* Local variables -----------------------------------------------------------*/

const testDuration = 100;
const config = {
  cache: {
    step: 10,
    ttl: 100,
  },
};

/* Tests ---------------------------------------------------------------------*/

describe('queue', () => {
  let testQueue;

  describe('#get', () => {
    beforeEach(() => {
      
    });
    
    it('should return a value if there\'s a value saved', () => {
      
    });
  });
});
