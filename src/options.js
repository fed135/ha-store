const inMemoryStore = require('./stores/in-memory');

const defaultCacheConfig = {
  client: inMemoryStore,
  limit: 5000,
  ttl: 300000,
};

const defaultConfig = {
  batch: {
    enabled: false,
    delay: 50,
    limit: 100,
  },
  cache: {
    enabled: false,
    tiers: [],
  },
};

function hydrateConfig(config = {}) {
  if (typeof config.resolver !== 'function') {
    throw new Error(`config.resolver [${config.resolver}] is not a function`);
  }

  if (config.cache?.enabled) {
    if (!config.cache?.tiers?.length) {
      config.cache.tiers = [defaultCacheConfig];
    }
    else {
      config.cache.tiers = config.cache.tiers.map((store) =>({...defaultCacheConfig, ...store}));
    }
  }
  else config.cache = defaultConfig.cache;

  return {
    ...config,
    batch: {...defaultConfig.batch, ...config.batch},
    cache: config.cache,
  };
}

module.exports = {hydrateConfig};
