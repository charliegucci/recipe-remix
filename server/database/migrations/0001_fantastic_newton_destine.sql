CREATE TABLE `recipe_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_categories_category_idx` ON `recipe_categories` (`category`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`ingredients` text NOT NULL,
	`instructions` text NOT NULL,
	`cuisine_tags` text DEFAULT '[]' NOT NULL,
	`dietary_tags` text DEFAULT '[]' NOT NULL,
	`cook_time` integer,
	`difficulty` text,
	`image_key` text,
	`source` text DEFAULT 'curated' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
