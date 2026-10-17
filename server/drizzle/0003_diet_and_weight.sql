CREATE TABLE `diet_plans` (
	`pet_id` text PRIMARY KEY NOT NULL,
	`diet_type` text NOT NULL,
	`source` text NOT NULL,
	`food_name` text NOT NULL,
	`package_daily_grams` real,
	`package_for_weight_kg` real,
	`meals_per_day` integer NOT NULL,
	`goal` text NOT NULL,
	`target_weight_kg` real,
	`grams_per_scoop` real,
	`notes` text,
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
	`source` text NOT NULL,
	`visit_record_id` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visit_record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weight_entries_pet_day` ON `weight_entries` (`pet_id`,`weighed_on`);