-- Phase 5: Fusion Intelligence and Polish
-- Add servings and explanation columns to recipes table
ALTER TABLE recipes ADD COLUMN servings INTEGER DEFAULT 4;
--> statement-breakpoint
ALTER TABLE recipes ADD COLUMN explanation TEXT;
