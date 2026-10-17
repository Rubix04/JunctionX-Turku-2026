CREATE TABLE `device_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`previous_refresh_token_hash` text,
	`bank_auth_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_sessions_refresh_token_hash_unique` ON `device_sessions` (`refresh_token_hash`);--> statement-breakpoint
ALTER TABLE `pets` ADD `photo_key` text;--> statement-breakpoint
-- SQLite needs a default for a NOT NULL column. Users can't exist before bank sign-in, so no row keeps it.
ALTER TABLE `users` ADD `identity_hash` text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity_hash_unique` ON `users` (`identity_hash`);