function pgResolver(config) {
    if (typeof config.identifier !== 'string') throw new Error(`Invalid resolver config for "identifier". Must be a string that represents the identifier column for the record.`);
    if (typeof config.table !== 'string') throw new Error(`Invalid resolver config for "table". Must be a string.`);
    if (config.fields && config.fields.some((f) => typeof f !== 'string')) throw new Error(`Invalid resolver config for "fields". Must be an array of strings with the columns to return on SELECT. Ignore for "*"`);
    if (!config.db?.query) throw new Error(`Invalid resolver config for "db". Must be a database instance with a "query" method which returns Promise<Rows>.`);

    return function query(ids, params) {
        let filters = Object.keys(params).map((k, i) => `WHERE ${k} = $${i+2}`);
        
        return config.db.query(`SELECT ${(config.fields || ['*']).join(',')} FROM ${config.table} WHERE ${config.identifier} IN($1) ${filters.length > 0 ? 'AND ' + filters.join(' AND ') : ''}`, ids, ...Object.values(params))
            .then((rows) => rows.reduce((acc, curr) => {
                acc[curr[config.identifier]] = curr;
                return acc;
            }), {});
    }
}