CREATE TABLE `health_records` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`kind` text NOT NULL,
	`date` text,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passport_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient_name` text,
	`sections` text NOT NULL,
	`language` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passport_shares_token_hash_unique` ON `passport_shares` (`token_hash`);