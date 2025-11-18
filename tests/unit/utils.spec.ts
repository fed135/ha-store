/**
 * Utils unit tests
 */

/* Requires ------------------------------------------------------------------*/

const utils = require('../../src/utils');
const expect = require('chai').expect;

/* Tests ---------------------------------------------------------------------*/

describe('utils', () => {
  describe('#contextKey', () => {
    it('should print a context key based on empty params', () => {
      expect(utils.contextKey(['foo'], {})).to.equal('foo=undefined');
    });

    it('should print a context key based on an object params', () => {
      expect(utils.contextKey(['foo', 'abc'], { foo: 'bar', abc: { nested: true }})).to.equal('foo="bar";abc={"nested":true}');
    });

    it('should print a context key based on a non-object params', () => {
      expect(utils.contextKey(['foo'], 'foo')).to.equal('foo=undefined');
    });

    it('should ignore non-unique defining params based on an object params', () => {
      expect(utils.contextKey([], { foo: 'bar' })).to.equal('');
    });
  });
});
