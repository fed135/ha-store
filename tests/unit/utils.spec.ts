/**
 * Utils unit tests
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../src/utils.ts';

describe('utils', () => {
  describe('contextKey', () => {
    test('should print a context key based on empty params', () => {
      assert.deepStrictEqual(utils.contextKey(['foo'], {}), 'foo=undefined');
    });

    test('should print a context key based on an object params', () => {
      assert.deepStrictEqual(utils.contextKey(['foo', 'abc'], { foo: 'bar', abc: { nested: true } }), 'foo="bar";abc={"nested":true}');
    });

    test('should print a context key based on a non-object params', () => {
      assert.deepStrictEqual(utils.contextKey(['foo'], 'foo'), 'foo=undefined');
    });

    test('should ignore non-unique defining params based on an object params', () => {
      assert.deepStrictEqual(utils.contextKey([], { foo: 'bar' }), '');
    });
  });

  describe('deferred', () => {
    test('deferred should return and object with references to promise, resolve and reject', () => {
      const foo = utils.deferred();
      assert.deepStrictEqual(foo instanceof Object, true);
      assert.deepStrictEqual(foo.promise instanceof Promise, true);
      assert.deepStrictEqual(foo.resolve instanceof Function, true);
      assert.deepStrictEqual(foo.reject instanceof Function, true);
    });

    test('deferred promise should resolve once internal resolve is called', async () => {
      const foo = utils.deferred();
      foo.resolve('a');
      return assert.deepStrictEqual(await foo.promise, 'a');
    });

    test('deferred promise should reject once internal reject is called', () => {
      const foo = utils.deferred();
      foo.reject(new Error('b'));
      return assert.rejects(foo.promise, new Error('b'));
    });
  });
});
