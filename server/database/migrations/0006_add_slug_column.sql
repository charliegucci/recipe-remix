-- Add slug column to recipes table (nullable first, will add unique constraint after population)
ALTER TABLE recipes ADD COLUMN slug TEXT;
