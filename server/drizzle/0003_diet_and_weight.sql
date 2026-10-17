CREATE TABLE `diet_plans` (
	`pet_id` text PRIMARY KEY NOT NULL,
	`diet_type` text NOT NULL,
	`source` text NOT NULL,
	`food_name` text NOT NULL,
	`kcal_per_100g` real,
	`meals_per_day` integer NOT NULL,
	`target_weight_kg` real,
	`neutered` integer,
	`activity_level` text NOT NULL,
	`notes` text,
	`previous_food_name` text,
	`transition_started_on` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`weighed_on` text NOT NULL,
	`weight_kg` real NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weight_entries_pet_day` ON `weight_entries` (`pet_id`,`weighed_on`);