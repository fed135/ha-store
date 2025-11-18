# HA-Store Express Server Example

This example demonstrates how to use **ha-store** in an Express.js application to efficiently cache and batch data requests.

## Features Demonstrated

- **Request Batching**: Multiple simultaneous requests are automatically batched into a single database query
- **In-Memory Caching**: Frequently accessed data is cached to reduce database load
- **Request Coalescing**: Duplicate in-flight requests are deduplicated
- **Event Monitoring**: Track cache hits, misses, and query performance
- **Parameter-based Cache Keys**: Different cache entries based on query parameters (e.g., language)

## Installation

```bash
cd examples/express-server
npm install
```

## Running the Example

```bash
# Start the server
npm start

# Or use nodemon for development (auto-restart on changes)
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Single User
```bash
# Get user by ID
curl http://localhost:3000/users/1

# Get user with language filter
curl http://localhost:3000/users/4?language=fr
```

### Get Multiple Users
```bash
# Get multiple users at once (demonstrates batching)
curl http://localhost:3000/users?ids=1,2,3

# With language filter
curl http://localhost:3000/users?ids=4,5?language=fr
```

### Cache Statistics
```bash
# View current cache size and pending requests
curl http://localhost:3000/stats
```

### Clear Cache
```bash
# Clear cache for specific user
curl -X DELETE http://localhost:3000/cache/1

# Clear all cache
curl -X DELETE http://localhost:3000/cache
```

## Testing the Features

### 1. Test Request Batching

Open multiple terminal windows and run these commands simultaneously:

```bash
# Terminal 1
curl http://localhost:3000/users/1

# Terminal 2 (run immediately after)
curl http://localhost:3000/users/2

# Terminal 3 (run immediately after)
curl http://localhost:3000/users/3
```

**Expected behavior**: You'll see a single database query in the server logs fetching all three users together, demonstrating request batching.

### 2. Test Caching

```bash
# First request - cache miss, will query database
curl http://localhost:3000/users/1

# Second request - cache hit, no database query
curl http://localhost:3000/users/1
```

**Expected behavior**: The first request shows `[DB Query]` in logs. The second shows `[Cache] Local cache hit` instead.

### 3. Test Request Coalescing

Run this command multiple times rapidly (or use a tool like `ab` or `hey`):

```bash
# Using a simple bash loop
for i in {1..10}; do curl http://localhost:3000/users/100 & done; wait
```

**Expected behavior**: You'll see `[Coalescing]` messages in the logs, showing that duplicate in-flight requests were merged into a single database query.

### 4. Test Cache Expiration

```bash
# Request a user
curl http://localhost:3000/users/1

# Wait 65 seconds (TTL is 60 seconds)
sleep 65

# Request again - cache expired, will query database
curl http://localhost:3000/users/1
```

### 5. Test Language-based Cache Keys

```bash
# Request user 4 in French
curl http://localhost:3000/users/4?language=fr

# Request user 4 in English (different cache key)
curl http://localhost:3000/users/4?language=en

# Request user 4 in French again (cache hit)
curl http://localhost:3000/users/4?language=fr
```

**Expected behavior**: The third request is a cache hit because it matches the first request's parameters.

## Understanding the Code

### Store Configuration

```javascript
const userStore = store({
  // Resolver: function called when data needs to be fetched
  resolver: fetchUsersFromDatabase,

  // Delimiter: parameters that affect query results
  delimiter: ['language'],

  // Cache configuration
  cache: {
    enabled: true,
    tiers: [
      {
        store: require('ha-store/src/stores/in-memory.ts')(),
        limit: 1000,  // Max cached items
        ttl: 60000,   // Cache TTL in milliseconds
      },
    ],
  },

  // Batch configuration
  batch: {
    enabled: true,
    delay: 50,   // Wait time to collect requests (ms)
    limit: 100,  // Max items per batch
  },
});
```

### Event Monitoring

The example demonstrates all available events:

- `localCacheHit`: Item found in first-tier cache (in-memory)
- `cacheHit`: Item found in any cache tier
- `cacheMiss`: Item not in cache, must be fetched
- `coalescedHit`: Duplicate request merged with in-flight request
- `query`: Batch query is about to be sent
- `querySuccess`: Batch query completed successfully
- `queryFailed`: Batch query failed

## Performance Benefits

### Without ha-store
- 100 simultaneous requests = 100 database queries
- Repeated requests always hit the database
- High database load and latency

### With ha-store
- 100 simultaneous requests = 1-2 batched queries (depending on timing)
- Repeated requests served from cache (microseconds vs milliseconds)
- Duplicate in-flight requests coalesced
- Dramatically reduced database load

## Real-World Use Cases

This pattern is particularly useful for:

1. **GraphQL Resolvers**: Solving the N+1 query problem
2. **REST APIs**: Caching frequently accessed resources
3. **Microservices**: Reducing inter-service call overhead
4. **Database Queries**: Batching and caching database lookups
5. **External APIs**: Rate limiting and reducing API calls

## Customization

You can modify this example to:

- Add Redis as a second cache tier (install `@ha-store/redis`)
- Implement custom cache invalidation strategies
- Add request authentication and authorization
- Integrate with real databases (PostgreSQL, MongoDB, etc.)
- Add Prometheus metrics collection
- Implement circuit breaker patterns

## Learn More

- [ha-store Documentation](../../README.md)
- [ha-store Wiki](https://github.com/fed135/ha-store/wiki)
- [Thundering Herd Problem](https://en.wikipedia.org/wiki/Thundering_herd_problem)
