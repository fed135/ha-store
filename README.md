<h1 align="center">
  High-Availability store
</h1>
<h3 align="center">
  A better solution for entity management
  <br/><br/><br/>
</h3>
<br/>

[![ha-store](https://img.shields.io/npm/v/ha-store.svg)](https://www.npmjs.com/package/ha-store)
[![Node](https://img.shields.io/badge/node->%3D8.0-blue.svg)](https://nodejs.org)
[![Build Status](https://travis-ci.org/fed135/ha-store.svg?branch=master)](https://travis-ci.org/fed135/ha-store)
[![Dependencies Status](https://david-dm.org/fed135/ha-store.svg)](https://david-dm.org/fed135/ha-store)

---

## How it works

Want to make your app faster and don't want to spend on extra infrastructure ? 

**HA-store** is: 

- Smart caching for 'hot' information (in-memory or using [redis-adapter](https://github.com/fed135/ha-redis-adapter))
- Loads of features (request dedupping, batching, retrying and circuit-breaking)
- Insightful stats and [events](#Monitoring-and-events)
- Lightweight and has **zero dependencies**

## Installing

`npm install ha-store`


## Usage

**Data-Access layer**

```node
function getItems(ids, params) {
    // Some compute-heavy async function or external request to a DB / service
}
```

**Store**
```node
const store = require('ha-store');
const itemStore = store({ getter: { method: getItems }});
```

**Model**
```node
function getItemById(id, params) {
    itemStore.one(id, params)
        .then(item => /* The item you requested */);
}
```

## Options

Name | Required | Default | Description
--- | --- | --- | ---
getter | true | - | The method to wrap, and how to interpret the returned data. Uses the format `<object>{ method: <function(ids, params)>, responseParser: <function(response, requestedIds)>`
uniqueOptions | false | `[]` | The list of parameters that, when passed, alter the results of the items requested. Ex: 'language', 'view', 'fields', 'country'. These will generate different combinaisons of cache keys.
cache | false | ```{ base: 1000, step: 5, limit: 30000 }``` | Caching options for the data
batch | false | ```{ tick: 50, max: 100 }``` | Batching options for the requests
retry | false | ```{ base: 5, step: 3, limit: 5000 }``` | Retry options for the requests
circuitBreaker | false | ```{ base: 1000, steps: 0xffff, limit: 0xffffff }``` | Circuit-breaker options, enabled by default and triggers after the retry limit

*All options are in (ms)
*Scaling options are represented via and exponential curve with base and limit being the 2 edge values while steps is the number of events over that curve.

## Monitoring and events

HA-store emits events to track cache hits, miss and outbound requests.

Event | Description
--- | ---
cacheHit | When the requested item is present in the microcache, or is already being fetched. Prevents another request from being created.
cacheMiss | When the requested item is not present in the microcache and is not currently being fetched. A new request will be made.
batch | When a batch of requests is about to be sent.
batchFailed | Indicates that the batch has failed. Retry policy will dictate if it should be re-attempted.
batchCancelled | Indicates that the batch has reached the allowed number of retries and is now abandonning.
batchSuccess | Indicates that the batch request was successful.
bumpCache | When a call for an item fully loaded in the microcache succeeds, it's ttl gets extended.
clearCache | When an item in the microcache has reached it's ttl and is now being evicted.
circuitBroken | When a batch call fails after the limit amount of retries, the circuit gets broken - all calls in the next ttl will automatically fail. It is assumed that there is a problem with the data-source.
circuitRestored | Circuit temporarily restored, a tentative to the data-source may be sent.
circuitRecovered | The tentative request was successful and the circuit it's assumed that the data-source has recovered.


## Testing

`npm test`


## Contribute

Please do! This is an open source project - if you see something that you want, [open an issue](https://github.com/fed135/ha-store/issues/new) or file a pull request.

I am always looking for more maintainers, as well.


## License 

[Apache 2.0](LICENSE) (c) 2018 Frederic Charette

