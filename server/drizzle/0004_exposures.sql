CREATE TABLE `exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`substance_id` text NOT NULL,
	`variant_id` text,
	`amount` real,
	`occurred_at` integer NOT NULL,
	`risk_level` text NOT NULL,
	`mg_per_kg` real,
	`note` text,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
