export type HydratedConfig = Readonly<Omit<HAStoreConfig, 'delimiter' | 'caches' | 'batch'> & {
  delimiter: string[]
  caches: HACacheStore[]
  batch: Readonly<{ delay: number, limit: number }>
}>;

const defaultConfig = {
  batch: {
    delay: 50,
    limit: 100,
  },
};

// Batching disabled: flush on the next tick, without a size limit
const noBatch = {
  delay: 0,
  limit: Infinity,
};

export function hydrateConfig(config: HAStoreConfig): HydratedConfig {
  if (!config) throw new Error(`config is not defined`);

  if (typeof config.resolver !== 'function') {
    throw new Error(`config.resolver [${config.resolver}] is not a function`);
  }

  if (config.delimiter && (!Array.isArray(config.delimiter) || (config.delimiter as string[]).some(d => typeof d !== 'string'))) throw new Error('delimiter is not an array of strings');
  if (config.caches && (!Array.isArray(config.caches) || config.caches.some(d => typeof d?.local === 'undefined' || typeof d?.get !== 'function'))) throw new Error('invalid cache instance');

  const batch = config.batch ? { ...defaultConfig.batch, ...config.batch } : noBatch;

  return Object.freeze({
    ...config,
    delimiter: config.delimiter || [],
    caches: config.caches || [],
    batch: Object.freeze({
      delay: batch.delay || 0,
      limit: batch.limit || 1,
    }),
  });
}
