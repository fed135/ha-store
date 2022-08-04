const inMemoryStore = require('./stores/in-memory');

const defaultConfig = {
  batch: {
    delay: 50,
    limit: 100,
  },
  stores: [{
    store: inMemoryStore,
    limit: 5000,
    ttl: 300000,
  }],
};

function hydrateConfig(config = {}) {
  if (typeof config.resolver !== 'function') {
    throw new Error(`config.resolver [${config.resolver}] is not a function`);
  }

  return {
    ...config,
    batch: config.batch && {...defaultConfig.batch, ...config.batch},
    stores: config.stores && config.stores.map((store) =>({...defaultConfig.stores[0], ...store})) || defaultConfig.stores,
  };
}

module.exports = {hydrateConfig};
