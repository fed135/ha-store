/**
 * Utils unit tests
 */

import * as utils from '../../src/utils';

describe('utils', () => {
  describe('contextKey', () => {
    it('should print a context key based on empty params', () => {
      expect(utils.contextKey(['foo'], {})).toBe('foo=undefined');
    });

    it('should print a context key based on an object params', () => {
      expect(utils.contextKey(['foo', 'abc'], { foo: 'bar', abc: { nested: true } })).toBe('foo="bar";abc={"nested":true}');
    });

    it('should print a context key based on a non-object params', () => {
      expect(utils.contextKey(['foo'], 'foo')).toBe('foo=undefined');
    });

    it('should ignore non-unique defining params based on an object params', () => {
      expect(utils.contextKey([], { foo: 'bar' })).toBe('');
    });
  });
});
