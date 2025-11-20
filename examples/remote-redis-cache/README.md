# HA-Store Express Server Example with PostgreSQL

This example demonstrates how to use **ha-store** in an Express.js application with a real PostgreSQL database to efficiently cache and batch data requests.

## Prerequisites

- Node.js >= 16.0.0
- PostgreSQL >= 12.0 installed and running

## Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Create the database
createdb ha_store_example

# Or using psql
psql -U postgres
CREATE DATABASE ha_store_example;
\q
```

### 3. Load Schema

```bash
# Load the schema and seed data
psql ha_store_example < schema.sql

# Or specify user
psql -U postgres -d ha_store_example -f schema.sql
```

### 4. Verify Setup

```bash
psql ha_store_example
SELECT * FROM articles;
\q
```

## Installation

`npm install`

## Configuration

You can configure the database connection using environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=hastore_example
export DB_USER=postgres
export DB_PASSWORD=postgres
```

## Running the Example

`npm start`

The server will start on `http://localhost:3000`

## API Endpoints

### Get Single article
```bash
# Get article by ID (cached & batched through ha-store). language is a defined delimiter, so it will always be set internally, and in our config we instructed to default to "en"
curl http://localhost:3000/articles/building-efficient-apis

# Get article with language qualifier
curl http://localhost:3000/users/building-efficient-apis?language=fr
```

## Behaviours

### 1. Request Batching with Real Database

Open multiple terminal windows and run these commands simultaneously:

```bash
# Terminal 1
curl http://localhost:3000/articles/building-efficient-apis

# Terminal 2 (run immediately after)
curl http://localhost:3000/articles/building-efficient-apis?language=fr

```

**Expected behavior**: A single database query fetching both articles together

### 2. Test Caching

```bash
# First request - cache miss, will query database
curl http://localhost:3000/articles/building-efficient-apis

# Second request - cache hit, no database query
curl http://localhost:3000/articles/building-efficient-apis
```

**Expected behavior**:
- First request hits the database
- Second request should hit the cache and not generate a request to the db
  - If the first request is still in-flight when the second request is made ha-store will coalesce them, improving performances further (thundering herd).

## Learn More

- [ha-store Wiki](https://github.com/fed135/ha-store/wiki)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
