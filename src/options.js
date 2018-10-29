const {exp} = require('./utils.js');

const defaultConfig = {
  batch: {
    tick: 50,
    max: 100,
  },
  retry: {
    base: 5,
    steps: 3,
    limit: 5000,
    curve: exp,
  },
  cache: {
    base: 1000,
    steps: 5,
    limit: 30000,
    curve: exp,
  },
  breaker: {
    base: 1000,
    steps: 10,
    limit: 0xffff,
    curve: exp,
    tolerance: 1,
    toleranceFrame: 10000,
  },
};

const defaultStoreOptions = {
  pluginRecoveryDelay: 10000,
  pluginFallback: true,
  memoryLimit: 0.9,
  recordLimit: Infinity,
};

/* Methods -------------------------------------------------------------------*/
function hydrateStoreOptions(storeOptions = {}) {
  return {
    ...defaultStoreOptions,
    ...storeOptions,
    pluginRecoveryDelay: Number(storeOptions.pluginRecoveryDelay) || defaultStoreOptions.pluginRecoveryDelay,
    pluginFallback: (storeOptions.pluginFallback === undefined) ? true : storeOptions.pluginFallback,
    memoryLimit: Math.max(0, Math.min(1, Number(storeOptions.memoryLimit) || defaultStoreOptions.memoryLimit)),
    recordLimit: Number(storeOptions.recordLimit) || defaultStoreOptions.recordLimit,
  };

}

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
    timeout: Number(config.timeout) || null,
    storeOptions: {
      ...hydrateStoreOptions(config.storeOptions || {}),
    },
    batch: {
      ...defaultConfig.batch,
      ...config.batch || {},
    },
    retry: {
      ...defaultConfig.retry,
      ...config.retry || {},
    },
    cache: {
      ...defaultConfig.cache,
      ...config.cache || {},
    },
    breaker: hydrateIfNotNull(config.breaker, defaultConfig.breaker),
  };
}

module.exports = {hydrateConfig, hydrateStoreOptions};
