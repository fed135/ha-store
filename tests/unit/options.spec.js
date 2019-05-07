/**
 * Utils unit tests
 */

/* Requires ------------------------------------------------------------------*/
const {hydrateConfig} = require('../../src/options');
const batcher = require('../../src/index');
const {exp} = require('../../src/utils');
const {noop} = require('./utils');
const expect = require('chai').expect;

/* Tests ---------------------------------------------------------------------*/

describe('options', () => {
  const defaultConfig = {
    "timeout": null,
    "batch": {"tick": 50, "max": 100},
    "retry": {curve: exp, "base": 5, "steps": 3, "limit": 5000},
    "cache": {"limit": 5000, "ttl": 300000},
  };

  describe('#basicParser', () => {
    it('should produce a batcher with all the default config when called with true requirements', () => {
      const test = batcher({
        resolver: noop,
        uniqueParams: ['a', 'b', 'c'],
        cache: true,
        batch: true,
        retry: true,
      });

      expect(test.config).to.deep.contain({
        cache: {limit: 5000, ttl: 300000},
        batch: {max: 100, tick: 50},
        retry: {limit: 5000, steps: 3, base: 5, curve: exp},
      });
    });

    it('should produce a batcher with all the merged config when called with custom requirements', () => {
      const test = batcher({
        resolver: noop,
        uniqueParams: ['a', 'b', 'c'],
        cache: {limit: 2},
        batch: {max: 12},
        retry: {limit: 35},
      });

      expect(test.config).to.deep.contain({
        cache: {limit: 2, ttl: 300000},
        batch: {max: 12, tick: 50},
        retry: {limit: 35, steps: 3, base: 5, curve: exp},
      });
    });

    it('should hydrate the configuration with default values if none are provided', () => {
      const finalConfig = hydrateConfig({});

      expect(defaultConfig).to.deep.equal(finalConfig, "Did you change the default configuration?");
    });

    it('should hydrate a module\'s configuration if its base config is not `null`', () => {
      const baseConfig = {
        "timeout": false,
        "batch": {},
        "retry": undefined,
        "cache": 1,
      };

      const finalConfig = hydrateConfig(baseConfig);

      expect(finalConfig.batch).to.not.be.undefined;
      expect(finalConfig.retry).to.not.be.undefined;
      expect(finalConfig.cache).to.not.be.undefined;

      expect(finalConfig.batch).to.not.be.null;
      expect(finalConfig.retry).to.not.be.null;
      expect(finalConfig.cache).to.not.be.null;

      expect(finalConfig.batch).to.deep.equal(defaultConfig.batch);
      expect(finalConfig.retry).to.deep.equal(defaultConfig.retry);
      expect(finalConfig.cache).to.deep.equal(defaultConfig.cache);
    });

    it('should not hydrate a module\'s configuration if its base config is `null`', () => {
      const baseConfig = {
        "timeout": null,
        "batch": null,
        "retry": null,
        "cache": null,
      };

      const finalConfig = hydrateConfig(baseConfig);
      expect(finalConfig.batch).to.be.null;
      expect(finalConfig.retry).to.be.null;
      expect(finalConfig.cache).to.be.null;
    });
  });

});
