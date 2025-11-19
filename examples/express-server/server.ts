import express from 'express';
import { Pool } from 'pg';
import store from 'ha-store';
import inMemory from 'ha-store/stores/in-memory';
import pgResolver from 'ha-store/resolvers/postgres';

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ha_store_example',
  user: process.env.DB_USER || 'postgres',
});

// Data loader
const articleStore = store({
  // The resolver function called when data needs to be fetched, in this case ha-store has a helper for postgres
  resolver: pgResolver({
    identifier: 'slug',
    table: 'articles',
    db: pool,
  }),

  // These are delimiter columns, similar to a WHERE statement. Cache keys for individual items will have these delimiters
  delimiters: {
    language: { default: 'en'}
  },

  // Enable caching with in-memory (TLRU) store
  cache: {
    enabled: true,
    tiers: [
      {
        store: inMemory(),
        limit: 1000,  // Maximum number of cached items
        ttl: 60000,   // Time to live: 60 seconds
      },
    ],
  },

  // Enable request batching: slows API responses by up to 40ms but reduces DB queries but up to 50x (not counting the cache).
  batch: {
    enabled: true,
    delay: 40,   // Wait 40ms to collect requests
    limit: 50,  // Maximum batch size
  },
});

// Get a single article by ID is the typical use case. DB requests will be optimized and individual records cached in memory.
app.get('/articles/:slug', (req, res) => {
  const slug = req.params.slug;
  const language = req.query.language;

  const article = articleStore.get(slug, { language });

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  res.json({ article });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
});
