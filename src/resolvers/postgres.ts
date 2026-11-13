export default function pgResolver(config: ConfigurableResolverConfig) {
  if (!config?.db?.query) throw new Error(`Invalid resolver config for "db". Must be a database instance with a "query" method which returns Promise<Rows>.`);
  if (typeof config.identifier !== 'string') throw new Error(`Invalid resolver config for "identifier". Must be a string that represents the identifier column for the record.`);
  if (typeof config.table !== 'string') throw new Error(`Invalid resolver config for "table". Must be a string.`);
  if (!Array.isArray(config.fields ?? []) || config.fields?.some(f => typeof f !== 'string')) throw new Error(`Invalid resolver config for "fields". Must be an array of strings with the columns to return on SELECT. Ignore for "*"`);
  if (!Array.isArray(config.allowedFilters ?? []) || config.allowedFilters?.some(f => typeof f !== 'string')) throw new Error(`Invalid resolver config for "allowedFilters". Must be an array of strings with the columns to that can be sued in WHERE statements.`);

  return function query(ids: (number | string)[], params: Record<string, any>) {
    return config.db.query(buildQuery(config, params), ids, ...(config.allowedFilters || []).filter(p => p in params).map(p => params[p]))
      .then(rows => (rows ?? []).reduce((acc, curr) => {
        acc[curr[config.identifier]] = curr;
        return acc;
      }, {}));
  };
}

export function buildQuery(config: ConfigurableResolverConfig, params: Record<string, any>) {
  const filters = [];
  let n = 1;

  for (const key of config.allowedFilters || []) {
    if (!(key in params)) continue;
    filters.push(params[key] === null ? `${key} IS NULL` : `${key} = $${++n}`);
  }

  const fields = (config.fields || ['*']).join(',');

  return `SELECT ${fields} FROM ${config.table} WHERE ${config.identifier} IN($1)${filters.length > 0 ? ` AND ${filters.join(' AND ')}` : ''}`;
}
