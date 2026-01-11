-- Example Database Schema
-- PostgreSQL Database Setup

-- Drop existing tables if they exist
DROP TABLE IF EXISTS articles CASCADE;

-- Create articles table
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    author VARCHAR(255) NOT NULL,
    body TEXT,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on language for faster filtering
CREATE INDEX idx_articles_slug_language ON articles(slug, language);

-- Insert sample data
INSERT INTO articles (id, title, author, body, language) VALUES
    (1, 'Building efficient APIs', 'building-efficient-apis', 'alice@example.com', 'Lorem Ipsum dolor sit amet', 'en'),
    (2, 'Construire des APIs efficaces', 'building-efficient-apis', 'alice@example.com', 'Lorem Ipsum dolor sit amet', 'fr')
    (3, 'Optimizing database queries', 'optimizing-database-queries', 'bob@example.com', 'Lorem Ipsum dolor sit amet', 'en');
    (4, 'Optimiser des requêtes sur des bases de données', 'optimizing-database-queries', 'bob@example.com', 'Lorem Ipsum dolor sit amet', 'fr');

-- Reset the sequence for the id column
SELECT setval('articles_id_seq', (SELECT MAX(id) FROM articles));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
