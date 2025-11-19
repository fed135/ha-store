const defaultConfig = {
  batch: {
    delay: 50,
    limit: 100,
  },
  caches: [],
};

export function hydrateConfig(config = {}) {
  if (typeof config.resolver !== 'function') {
    throw new Error(`config.resolver [${config.resolver}] is not a function`);
  }

  if (config.delimiter && (!Array.isArray(config.delimiter) || config.delimiter.some(d => typeof d !== 'string'))) throw new Error('delimiter is not an array of strings');
  if (config.caches && (!Array.isArray(config.caches) || config.caches.some(d => typeof d?.local === 'undefined' || typeof d?.get !== 'function'))) throw new Error('invalid cache instance');

  return {
    ...config,
    batch: { ...defaultConfig.batch, ...config.batch },
    caches: config.caches,
  };
}
