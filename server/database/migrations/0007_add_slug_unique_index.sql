-- Add unique index on slug column (applied after slugs are generated)
CREATE UNIQUE INDEX recipes_slug_unique ON recipes(slug);
CREATE INDEX recipes_slug_idx ON recipes(slug);
