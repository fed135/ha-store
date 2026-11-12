const statementCache = new Map();

function getPreparedQuery(db, sql) {
  let statement = statementCache.get(sql);
  if (!statement) {
    statement = db.prepare(sql);
    statementCache.set(sql, statement);
  }
  return statement;
}

export default function pgResolver(config: ConfigurableResolverConfig) {
  if (!config?.db?.exec) throw new Error(`Invalid resolver config for "db". Must be a database instance with an "exec" method which returns SQLOutputValue.`);
  if (typeof config.identifier !== 'string') throw new Error(`Invalid resolver config for "identifier". Must be a string that represents the identifier column for the record.`);
  if (typeof config.table !== 'string') throw new Error(`Invalid resolver config for "table". Must be a string.`);
  if (!Array.isArray(config.fields ?? []) || config.fields?.some(f => typeof f !== 'string')) throw new Error(`Invalid resolver config for "fields". Must be an array of strings with the columns to return on SELECT. Ignore for "*"`);
  if (!Array.isArray(config.allowedFilters ?? []) || config.allowedFilters?.some(f => typeof f !== 'string')) throw new Error(`Invalid resolver config for "allowedFilters". Must be an array of strings with the columns to that can be sued in WHERE statements.`);

  return function query(ids: (number | string)[], params: Record<string, any>) {
    const sql = buildQuery(config, params);
    const preparedQuery = getPreparedQuery(config.db, sql);

    return preparedQuery.all(JSON.stringify(ids), ...(config.allowedFilters || []).filter(p => p in params).map(p => params[p])).reduce((acc, curr) => {
      acc[curr[config.identifier]] = curr;
      return acc;
    }, {});
  };
}

export function buildQuery(config: ConfigurableResolverConfig, params: Record<string, any>) {
  const filters = (config.allowedFilters || []).reduce((acc, curr) => {
    if (curr in params) {
      acc.push(params[curr] === null ? `${curr} IS NULL` : `${curr} = ?`);
    }
    return acc;
  }, []).join(' AND ');

  const fields = (config.fields || ['*']).join(',');

  return `SELECT ${fields} FROM ${config.table} WHERE ${config.identifier} IN (SELECT value FROM json_each(?))${filters.length > 0 ? ` AND ${filters}` : ''}`;
}
