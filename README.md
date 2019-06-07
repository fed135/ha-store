<h1 align="center">
  High-Availability store
</h1>
<h3 align="center">
  Efficient data fetching
  <br/><br/><br/>
</h3>
<br/>

[![ha-store](https://img.shields.io/npm/v/ha-store.svg)](https://www.npmjs.com/package/ha-store)
[![Node](https://img.shields.io/badge/node->%3D8.0-blue.svg)](https://nodejs.org)
[![Build Status](https://travis-ci.org/fed135/ha-store.svg?branch=master)](https://travis-ci.org/fed135/ha-store)
[![Dependencies Status](https://david-dm.org/fed135/ha-store.svg)](https://david-dm.org/fed135/ha-store)

---

## How it works

Want to make your app faster and don't want to spend on extra infrastructure ? [Learn how](https://github.com/fed135/ha-store/wiki) you can do both with HA-store!

**HA-store** is a generic wrapper for your data queries, it features: 

- Smart TLRU cache for 'hot' information
- Request coalescing, batching and retrying
- Insightful stats and [events](#Monitoring-and-events)
- Lightweight, configurable, battle-tested


## Installing

`npm install ha-store`


## Usage

```node
const store = require('ha-store');
const itemStore = store({
  resolver: getItems, // Your resolver can be an async function or should return a Promise
  uniqueParams: ['language']
});

// Anywhere in your application

itemStore.get('123', { language: 'fr' })
  .then(item => /* The item you requested */);

itemStore.get(['123', '456'], { language: 'en' })
  .then(items => /* All the items you requested */);
```

## Options

Name | Required | Default | Description
--- | --- | --- | ---
resolver | true | - | The method to wrap, and how to interpret the returned data. Uses the format `<function(ids, params)>`
responseParser | false | (system) | The method that format the results from the resolver into an indexed collection. Accepts indexed collections or arrays of objects with an `id` property. Uses the format `<function(response, requestedIds, params)>`
uniqueParams | false | `[]` | The list of parameters that, when passed, generate unique results. Ex: 'language', 'view', 'fields', 'country'. These will generate different combinations of cache keys.
timeout | false | `null` | The maximum time allowed for the resolver to resolve.
store | false | `null` | A custom store for the data, like [ha-store-redis](https://github.com/fed135/ha-redis-adapter).
cache | false | <pre>{&#13;&#10;&nbsp;&nbsp;limit: 5000,&#13;&#10;&nbsp;&nbsp;ttl: 300000&#13;&#10;}</pre> | Caching options for the data - `limit` - the maximum number of records, and `ttl` - time to live for a record.
batch | false | <pre>{&#13;&#10;&nbsp;&nbsp;tick: 50,&#13;&#10;&nbsp;&nbsp;max: 100&#13;&#10;}</pre> | Batching options for the requests
retry | false | <pre>{&#13;&#10;&nbsp;&nbsp;base: 5,&#13;&#10;&nbsp;&nbsp;step: 3,&#13;&#10;&nbsp;&nbsp;limit: 5000,&#13;&#10;&nbsp;&nbsp;curve: <function(progress, start, end)>&#13;&#10;}</pre> | Retry options for the requests

*All options are in (ms)
*Scaling options are represented via and exponential curve with base and limit being the 2 edge values while steps is the number of events over that curve.

## Monitoring and events

HA-store emits events to track cache hits, miss and outbound requests.

Event | Description
--- | ---
cacheHit | When the requested item is present in the microcache, or is already being fetched. Prevents another request from being created.
cacheMiss | When the requested item is not present in the microcache and is not currently being fetched. A new request will be made.
coalescedHit | When a record query successfully hooks to the promise of the same record in transit.
query | When a batch of requests is about to be sent.
queryFailed | Indicates that the batch has failed. Retry policy will dictate if it should be re-attempted.
retryCancelled | Indicates that the batch has reached the allowed number of retries and is now abandoning.
querySuccess | Indicates that the batch request was successful.

You may also want to track the amount of `contexts` and `records` stored via the `size` method.


## Testing

`npm test`

`npm run bench`


## Contribute

Please do! This is an open source project - if you see something that you want, [open an issue](https://github.com/fed135/ha-store/issues/new) or file a pull request.

I am always looking for more maintainers, as well.


## License 

[Apache 2.0](LICENSE) (c) 2019 Frederic Charette

