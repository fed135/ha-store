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

  describe('deferred', () => {
    test('deferred should return and object with references to promise, resolve and reject', () => {
      const foo = utils.deferred();
      expect(foo).toBeInstanceOf(Object);
      expect(foo.promise).toBeInstanceOf(Promise);
      expect(foo.resolve).toBeInstanceOf(Function);
      expect(foo.reject).toBeInstanceOf(Function);
    });

    test('deferred promise should resolve once internal resolve is called', () => {
      expect.assertions(1);
      const foo = utils.deferred();
      foo.resolve('a');
      return expect(foo.promise).resolves.toEqual('a');
    });

    test('deferred promise should reject once internal reject is called', () => {
      expect.assertions(1);
      const foo = utils.deferred();
      foo.reject('b');
      return expect(foo.promise).rejects.toEqual('b');
    });
  });
});
