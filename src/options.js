/**
 * Options
 */

'use strict';

/* Local variables -----------------------------------------------------------*/

const defaultConfig = {
  batch: {
    tick: 50,
    max: 100,
  },
  cache: {
    limit: 5000,
    ttl: 300000,
  },
};

/* Methods -------------------------------------------------------------------*/

function hydrateIfNotNull(baseConfig, defaultConfig) {
  if (baseConfig === null) {
    return null;
  }

  if (!baseConfig) {
    return {...defaultConfig};
  }

  return {
    ...defaultConfig,
    ...baseConfig,
  };
}

function hydrateConfig(config = {}) {
  return {
    ...config,
    batch: hydrateIfNotNull(config.batch, defaultConfig.batch),
    cache: hydrateIfNotNull(config.cache, defaultConfig.cache),
  };
}

/* Exports -------------------------------------------------------------------*/

module.exports = {hydrateConfig};
