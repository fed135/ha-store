/**
 * Utils unit tests
 */

/* Requires ------------------------------------------------------------------*/
const {hydrateConfig} = require('../../src/options');
const batcher = require('../../src/index');
const {noop} = require('./utils');
const expect = require('chai').expect;
const store = require('../../src/store');

/* Tests ---------------------------------------------------------------------*/

describe('options', () => {
  const defaultConfig = {
    "batch": {"delay": 50, "limit": 100},
    "cache": {"limit": 5000, "ttl": 300000},
    "store": store,
  };

  describe('#basicParser', () => {
    it('should produce a batcher with all the default config when called with true requirements', () => {
      const test = batcher({
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        cache: true,
        batch: true,
      });

      expect(test.config).to.deep.contain({
        cache: {limit: 5000, ttl: 300000},
        batch: {limit: 100, delay: 50},
      });
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = batcher({
        resolver: noop,
        delimiter: ['a', 'b', 'c'],
        cache: {limit: 2},
        batch: {limit: 12},
      });

      expect(test.config).to.deep.contain({
        cache: {limit: 2, ttl: 300000},
        batch: {limit: 12, delay: 50},
      });
    });

    it('should hydrate the configuration with default values if none are provided', () => {
      const finalConfig = hydrateConfig({});

      expect(defaultConfig).to.deep.equal(finalConfig, "Did you change the default configuration?");
    });

    it('should hydrate a module\'s configuration if its base config is not `null`', () => {
      const baseConfig = {
        "batch": {},
        "cache": 1,
      };

      const finalConfig = hydrateConfig(baseConfig);

      expect(finalConfig.batch).to.not.be.undefined;
      expect(finalConfig.cache).to.not.be.undefined;

      expect(finalConfig.batch).to.not.be.null;
      expect(finalConfig.cache).to.not.be.null;

      expect(finalConfig.batch).to.deep.equal(defaultConfig.batch);
      expect(finalConfig.cache).to.deep.equal(defaultConfig.cache);
    });

    it('should not hydrate a module\'s configuration if its base config is `null`', () => {
      const baseConfig = {
        "batch": null,
        "cache": null,
      };

      const finalConfig = hydrateConfig(baseConfig);
      expect(finalConfig.batch).to.be.null;
      expect(finalConfig.cache).to.be.null;
    });
  });

});
