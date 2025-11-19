import express from 'express';
import { Pool } from 'pg';
import HAStore, {caches, resolvers} from 'ha-store';

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ha_store_example',
  user: process.env.DB_USER || 'postgres',
});

// Data loader
const articleStore = HAStore({
  // The resolver function called when data needs to be fetched, in this case ha-store has a helper for postgres
  resolver: resolvers.postgres({
    identifier: 'slug',
    table: 'articles',
    db: pool,
  }),

  // These are delimiter columns, similar to a WHERE statement. Cache keys for individual items will have these delimiters
  delimiters: {
    language: { default: 'en' },
  },

  // Enable caching with in-memory (TLRU) store
  cache: {
    enabled: true,
    tiers: [
      {
        store: caches.inMemory(),
        limit: 1000, // Maximum number of cached items
        ttl: 60000, // Time to live: 60 seconds
      },
    ],
  },

  // Enable request batching: slows API responses by up to 40ms but reduces DB queries but up to 50x (not counting the cache).
  batch: {
    enabled: true,
    delay: 40, // Wait 40ms to collect requests
    limit: 50, // Maximum batch size
  },
});

// Get a single article by ID is the typical use case. DB requests will be optimized and individual records cached in memory.
app.get('/articles/:slug', async (req, res) => {
  const slug = req.params.slug;
  const language = req.query.language;

  const article = await articleStore.get(slug, { language });

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  res.json({ article });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
});
