import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import resolver, { buildQuery } from '../../../src/resolvers/sqlite.ts';

const preparedQuery = { all: () => {} };
const db = { exec: () => {}, prepare: () => preparedQuery };

describe('sqlite resolver', () => {
  describe('query builder', () => {
    test('should build a valid sql statement based on empty params and no specified fields', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test' }, {}), 'SELECT * FROM test WHERE id IN (SELECT value FROM json_each(?))');
    });

    test('should build a valid sql statement based on empty params and specified field list', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test', fields: ['id', 'foo'] }, {}), 'SELECT id,foo FROM test WHERE id IN (SELECT value FROM json_each(?))');
    });

    test('should build a valid sql statement based on present params, no allowed filters and specified field list', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test', fields: ['id', 'foo', 'bar'] }, { foo: 'a', bar: 1 }), 'SELECT id,foo,bar FROM test WHERE id IN (SELECT value FROM json_each(?))');
    });

    test('should build a valid sql statement based on present params, allowed filters and specified field list', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test', fields: ['id'], allowedFilters: ['foo', 'bar'] }, { foo: 'a', bar: 1 }), 'SELECT id FROM test WHERE id IN (SELECT value FROM json_each(?)) AND foo = ? AND bar = ?');
    });

    test('should build a valid sql statement with null parameter value', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test', fields: ['id'], allowedFilters: ['foo', 'bar'] }, { foo: null }), 'SELECT id FROM test WHERE id IN (SELECT value FROM json_each(?)) AND foo IS NULL');
    });

    test('should correctly escape potential SQL injections', () => {
      assert.deepStrictEqual(buildQuery({ identifier: 'id', table: 'test', allowedFilters: ['foo', 'bar'] }, { 'foo': '; DROP TABLE test;', '; DROP TABLE test;': 'foo', 'bar': 'active\'; DROP TABLE users; --' }), 'SELECT * FROM test WHERE id IN (SELECT value FROM json_each(?)) AND foo = ? AND bar = ?');
    });
  });

  describe('resolver call', () => {
    test('should reject config with missing db', () => {
      assert.throws(resolver, new Error(`Invalid resolver config for "db". Must be a database instance with an "exec" method which returns SQLOutputValue.`));
    });

    test('should reject config with missing identifier', () => {
      assert.throws(() => resolver({ db }), new Error(`Invalid resolver config for "identifier". Must be a string that represents the identifier column for the record.`));
    });

    test('should reject config with missing table', () => {
      assert.throws(() => resolver({ db, identifier: 'id' }), new Error(`Invalid resolver config for "table". Must be a string.`));
    });

    test('should reject config with invalid field object', () => {
      assert.throws(() => resolver({ db, identifier: 'id', table: 'test', fields: 'a' }), new Error(`Invalid resolver config for "fields". Must be an array of strings with the columns to return on SELECT. Ignore for "*"`));
    });

    test('should reject config with invalid field values', () => {
      assert.throws(() => resolver({ db, identifier: 'id', table: 'test', fields: ['a', 1] }), new Error(`Invalid resolver config for "fields". Must be an array of strings with the columns to return on SELECT. Ignore for "*"`));
    });

    test('should reject config with invalid allowedFilters object', () => {
      assert.throws(() => resolver({ db, identifier: 'id', table: 'test', allowedFilters: 'a' }), new Error(`Invalid resolver config for "allowedFilters". Must be an array of strings with the columns to that can be sued in WHERE statements.`));
    });

    test('should reject config with invalid allowedFilters values', () => {
      assert.throws(() => resolver({ db, identifier: 'id', table: 'test', allowedFilters: ['a', 1] }), new Error(`Invalid resolver config for "allowedFilters". Must be an array of strings with the columns to that can be sued in WHERE statements.`));
    });

    test('should inject only valid params', () => {
      const dbMock = mock.method(db, 'prepare', () => preparedQuery);
      const preparedMock = mock.method(preparedQuery, 'all', () => [{ id: 1 }, { id: 2 }, { id: 3 }]);

      assert.deepStrictEqual(resolver({ identifier: 'id', table: 'test', allowedFilters: ['foo', 'bar'], db })([1, 2, 3], { foo: 'a', bar: 1 }), { 1: { id: 1 }, 2: { id: 2 }, 3: { id: 3 } });
      assert.deepStrictEqual(dbMock.mock.calls[0].arguments, ['SELECT * FROM test WHERE id IN (SELECT value FROM json_each(?)) AND foo = ? AND bar = ?']);
      assert.deepStrictEqual(preparedMock.mock.calls[0].arguments, ['[1,2,3]', 'a', 1]);
    });

    test('should inject out of order params', () => {
      const dbMock = mock.method(db, 'prepare', () => preparedQuery);
      const preparedMock = mock.method(preparedQuery, 'all', () => [{ id: 1 }, { id: 2 }, { id: 3 }]);

      assert.deepStrictEqual(resolver({ identifier: 'id', table: 'test', allowedFilters: ['bar', 'foo'], db })([1, 2, 3], { foo: 'a', bar: 1 }), { 1: { id: 1 }, 2: { id: 2 }, 3: { id: 3 } });
      assert.deepStrictEqual(dbMock.mock.calls[0].arguments, ['SELECT * FROM test WHERE id IN (SELECT value FROM json_each(?)) AND bar = ? AND foo = ?']);
      assert.deepStrictEqual(preparedMock.mock.calls[0].arguments, ['[1,2,3]', 1, 'a']);
    });

    test('should handle empty db response', () => {
      mock.method(db, 'prepare', () => preparedQuery);
      const preparedMock = mock.method(preparedQuery, 'all', () => []);

      assert.deepStrictEqual(resolver({ identifier: 'id', table: 'test', allowedFilters: ['foo', 'bar'], db })([1, 2, 3], { foo: 'a', bar: 1 }), {});
      assert.deepStrictEqual(preparedMock.mock.calls.length, 1);
    });
  });
});
