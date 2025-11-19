<h1 align="center">
  <img alt="HA-store" width="300px" src="https://ha-store.js.org/logo.png" />
  <br/>
  High-Availability store
</h1>
<h3 align="center">
  Efficient data fetching to prevent thundering herds!
  <br/><br/><br/>
</h3>
<br/>


**HA-store** is a wrapper for your data queries, it features:

- Smart TLRU cache for 'hot' information
- Supports multiple caching levels
- Request coalescing and batching (solves the [Thundering Herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem))
- Insightful stats and [events](#Monitoring-and-events)
- Lightweight, configurable, battle-tested

Learn how you can improve your app's performance, design and resilience [here](https://github.com/fed135/ha-store/wiki)!


## Installing

`npm install ha-store`


## Usage

```javascript
// Create your store
import HAStore, {caches} from 'ha-store';

const itemStore = HAStore({
  resolver: getItems,
  delimiter: ['language'],
  caches: [
    stores.inMemory({
      limit: 1000,  // Maximum number of cached items
      ttl: 60000,   // Time to live: 60 seconds
    }),
  ],
});

// Define your resolver
function getItems(ids, params, contexts) {
  // Ids will be a list of all the unique requested items
  // Params will be the parameters for the request, which must be declared in the `delimiter` config of the store
  // Contexts will be the list of originating context information

  // Now perform some expensive network call or database lookup...

  // Then, respond with your data formatted into this formats:
  // { '123': { language: 'fr', name: 'fred' } }
}

// Now to use your store
itemStore.get('123', { language: 'fr' }, { requestId: '123' })
  .then(item => /* The item you requested */);

// You can even ask for more than one item at a time
itemStore.getMany(['123', '456'], { language: 'en' }, { requestId: '123' })
  .then(items => /* All the items you requested, in Promise.allSettled fashion */);
```

### Prebuilt resolvers

HA-store has prebuilt resolvers for common use-cases:

```typescript
import HAStore, {resolvers} from 'ha-store';
import { Pool } from 'pg';

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ha_store_example',
  user: process.env.DB_USER || 'postgres',
});

const store = haStore({
  resolver: resolvers.postgres({
    db: pool,
    table: 'items',
    identifier: 'id',
  }),
  delimiter: ['language', 'region'],
  batch: {
    delay: 50,
    limit: 50,
  }
});
```

## Options

Name | Required | Default | Description
--- | --- | --- | ---
resolver | true | - | The method to wrap, and how to interpret the returned data. Uses the format `<function(ids, params)>`
delimiters | false | `[]` | The list of parameters that, when passed, generate unique results. Ex: 'language', 'view', 'fields', 'country'. These will generate different combinations of cache keys.
caches | false | <pre>[&#13;&#10;&nbsp;&nbsp; &#60;instance of a store&#62;,&#13;&#10;]</pre> | A list of storage tiers for the data. The order indicates where to look first. It's recommended to keep an instance of an in-memory store as the first one, and then expend to external stores like [ha-store-redis](https://github.com/fed135/ha-redis-adapter). Check below for storage configurations.
batch | false | <pre>{&#13;&#10;&nbsp;&nbsp;delay: 50,&#13;&#10;&nbsp;&nbsp;limit: 100&#13;&#10;}</pre> | Batching options for the requests - `delay` is the amount of time to wait before sending the batch, `limit` is the maximum number of data items to send in a batch.

*All options are in (ms)

## Caching storage

Name | Default | Description
--- | --- | ---
inMemory | <pre>{&#13;&#10;&nbsp;&nbsp;limit: 5000,&#13;&#10;&nbsp;&nbsp;ttl: 300000&#13;&#10;}</pre> | Caching options for the data - `limit` - the maximum number of records, and `ttl` - time to live for a record in milliseconds
[ha-store-redis](https://github.com/fed135/ha-redis-adapter) | <pre>{&#13;&#10;&nbsp;&nbsp;ttl: 300000,&#13;&#10;&nbsp;&nbsp;namespace: '',&#13;&#10;&nbsp;&nbsp;host: '0.0.0.0',&#13;&#10;&nbsp;&nbsp;path: null,&#13;&#10;&nbsp;&nbsp;connection: &#60;instance of redis connection&#62;&#13;&#10;}</pre> | Allows redis to act as a caching layer for ha-store. Keys are prefixed with the namespace. An existing connection handle can be passed. A new connection can be made via either `host` (IP, FQDN, etc) or `path` (Unix socket path)

## Monitoring and events

HA-store emits events to track cache hits, miss and outbound requests.

Event | Format | Description
--- | --- | ---
localCacheHit | `<number>` | When the requested item is present in the first listed local store (usually in-memory).
cacheHit | `<number>` | When the requested item is present in a store.
cacheMiss | `<number>` | When the requested item not cached or coalesced and must be fetched.
coalescedHit | `<number>` | When a record query successfully hooks to the promise of the same record in transit.
query | `<object>` | When a batch of requests is about to be sent, gives the detail of the query and what triggered it.
queryFailed | `<object>` | Indicates that the batch has failed. Retry policy will dictate if it should be re-attempted.
querySuccess | `<object>` | Indicates that the batch request was successful.

You may also want to track the amount of `contexts` and `records` stored via the `size` method.


## Testing

`npm test`


## Benchmarks

Read instructions [here](./tests/profiling/README.md)

`npm run bench`


## Contribute

Please do! This is an open source project - if you see something that you want, [open an issue](https://github.com/fed135/ha-store/issues/new) or file a pull request.


## License 

[Apache 2.0](LICENSE) 2025 Frederic Charette

