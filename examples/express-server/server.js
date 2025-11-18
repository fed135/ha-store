const express = require('express');
const store = require('ha-store');

const app = express();
const PORT = process.env.PORT || 3000;

// Simulated database of users
const database = {
  '1': { id: '1', name: 'Alice Johnson', email: 'alice@example.com', language: 'en' },
  '2': { id: '2', name: 'Bob Smith', email: 'bob@example.com', language: 'en' },
  '3': { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', language: 'en' },
  '4': { id: '4', name: 'Marie Dubois', email: 'marie@example.com', language: 'fr' },
  '5': { id: '5', name: 'Pierre Martin', email: 'pierre@example.com', language: 'fr' },
  '100': { id: '100', name: 'Test User', email: 'test@example.com', language: 'en' },
};

// Simulated expensive database query
// In a real app, this would be a database call or external API request
async function fetchUsersFromDatabase(ids, params) {
  console.log(`[DB Query] Fetching users: ${ids.join(', ')} with params:`, params);

  // Simulate database latency
  await new Promise(resolve => setTimeout(resolve, 100));

  const results = {};
  for (const id of ids) {
    const user = database[id];
    if (user) {
      // Apply language filter if specified
      if (!params.language || user.language === params.language) {
        results[id] = user;
      }
    }
  }

  return results;
}

// Create ha-store instance with caching and batching enabled
const userStore = store({
  // The resolver function - called when data needs to be fetched
  resolver: fetchUsersFromDatabase,

  // Parameters that affect the query result (used for cache key generation)
  delimiter: ['language'],

  // Enable caching with in-memory store
  cache: {
    enabled: true,
    tiers: [
      {
        store: require('ha-store/src/stores/in-memory.ts')(),
        limit: 1000,  // Maximum number of cached items
        ttl: 60000,   // Time to live: 60 seconds
      },
    ],
  },

  // Enable request batching
  batch: {
    enabled: true,
    delay: 50,   // Wait 50ms to collect requests
    limit: 100,  // Maximum batch size
  },
});

// Set up monitoring events
userStore.on('localCacheHit', (count) => {
  console.log(`[Cache] Local cache hit: ${count} items`);
});

userStore.on('cacheMiss', (count) => {
  console.log(`[Cache] Cache miss: ${count} items`);
});

userStore.on('coalescedHit', (count) => {
  console.log(`[Coalescing] Coalesced ${count} duplicate requests`);
});

userStore.on('query', (event) => {
  console.log(`[Query] Batch query triggered:`, {
    cause: event.cause,
    size: event.size,
    params: event.params,
  });
});

userStore.on('querySuccess', (event) => {
  console.log(`[Query] Batch query succeeded: ${event.size} items`);
});

userStore.on('queryFailed', (event) => {
  console.error(`[Query] Batch query failed:`, event.error);
});

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get a single user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const language = req.query.language;

    const user = await userStore.get(
      userId,
      { language },
      { requestId: req.headers['x-request-id'] || 'unknown' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get multiple users by IDs
app.get('/users', async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    const language = req.query.language;

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Please provide user IDs in query parameter: ?ids=1,2,3' });
    }

    const results = await userStore.getMany(
      ids,
      { language },
      { requestId: req.headers['x-request-id'] || 'unknown' }
    );

    // Transform Promise.allSettled results to a cleaner format
    const users = {};
    const errors = {};

    for (const [id, result] of Object.entries(results)) {
      if (result.status === 'fulfilled') {
        users[id] = result.value;
      } else {
        errors[id] = result.reason?.message || 'Unknown error';
      }
    }

    res.json({
      users,
      ...(Object.keys(errors).length > 0 && { errors })
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get store statistics
app.get('/stats', async (req, res) => {
  try {
    const stats = await userStore.size();
    res.json({
      stats,
      cacheKeys: {
        exampleKey: userStore.getStorageKey('1', { language: 'en' })
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear cache for specific user(s)
app.delete('/cache/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const language = req.query.language;

    userStore.clear(userId, { language });
    res.json({ message: `Cache cleared for user ${userId}` });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all cache
app.delete('/cache', (req, res) => {
  try {
    userStore.clear('*');
    res.json({ message: 'All cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health               - Health check`);
  console.log(`  GET  /users/:id            - Get user by ID`);
  console.log(`  GET  /users?ids=1,2,3      - Get multiple users`);
  console.log(`  GET  /stats                - Get cache statistics`);
  console.log(`  DELETE /cache/:id          - Clear cache for user`);
  console.log(`  DELETE /cache              - Clear all cache`);
  console.log(`\nQuery parameters:`);
  console.log(`  ?language=en|fr            - Filter by language\n`);
});
