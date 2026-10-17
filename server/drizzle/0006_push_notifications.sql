CREATE TABLE `push_devices` (
	`session_id` text PRIMARY KEY NOT NULL,
	`expo_push_token` text NOT NULL,
	`platform` text NOT NULL,
	`language` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`seasonal_alerts` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `device_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seasonal_notifications_sent` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`card_id` text NOT NULL,
	`season_year` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `device_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasonal_sent_once` ON `seasonal_notifications_sent` (`session_id`,`card_id`,`season_year`);