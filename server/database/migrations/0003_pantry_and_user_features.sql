CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`common_names` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ingredients_name_idx` ON `ingredients` (`name`);--> statement-breakpoint
CREATE TABLE `pantry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`ingredient_name` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pantry_items_user_idx` ON `pantry_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `pantry_items_ingredient_idx` ON `pantry_items` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `user_dietary_restrictions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`restriction` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_dietary_restrictions_user_idx` ON `user_dietary_restrictions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_dietary_restrictions_unique` ON `user_dietary_restrictions` (`user_id`,`restriction`);--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `recipe_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_favorites_recipe_idx` ON `user_favorites` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `user_recipe_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_recipe_history_user_idx` ON `user_recipe_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_recipe_history_viewed_at_idx` ON `user_recipe_history` (`viewed_at`);--> statement-breakpoint
CREATE TABLE `user_recipe_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`rating` integer NOT NULL,
	`review` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_recipe_reviews_unique` ON `user_recipe_reviews` (`user_id`,`recipe_id`);--> statement-breakpoint
CREATE INDEX `user_recipe_reviews_recipe_idx` ON `user_recipe_reviews` (`recipe_id`);