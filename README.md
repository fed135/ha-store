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

A configurable, self-adjustting microcache: 

- Helps reduce the number of requests for 'hot' information
- No noticeable footprint 
- No need for extra caching architecture

Adds request dedupping, batching and retrying:

- Process-wide request profiling and mapping
- Greatly reduces the number of requests
- Fully configurable


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
cache | false | ```{ step: 1000, ttl: 30000 }``` | Caching options for the data
batch | false | ```{ tick: 50, limit: 100 }``` | Batching options for the requests
retry | false | ```{ limit: 3, scale: 2.5, base: 5 }``` | Retry options for the requests


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


## Testing

`npm test`


## Roadmap

- Implement circuit-breaking
- Release a redis adapter for the microcache
- Link White Paper + graphs for improvements (avg latency, avg ext calls, avg cost savings)


## Contribute

Please do! This is an open source project - if you see something that you want, [open an issue](https://github.com/fed135/ha-store/issues/new) or file a pull request.

If you have a major change, it would be better to open an issue first so that we can talk about it. 

I am always looking for more maintainers, as well. Get involved. 


## License 

[Apache 2.0](LICENSE) (c) 2018 Frederic Charette

