CREATE TABLE `daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`logged_on` text NOT NULL,
	`answers` text NOT NULL,
	`emergency_symptoms` text NOT NULL,
	`extra_symptoms` text NOT NULL,
	`note` text,
	`level` text NOT NULL,
	`assessment` text NOT NULL,
	`outcome_level` text,
	`outcome_record_id` text,
	`outcome_note` text,
	`outcome_recorded_at` integer,
	`created_by_user_id` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`outcome_record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_pet_day` ON `daily_logs` (`pet_id`,`logged_on`);--> statement-breakpoint
CREATE TABLE `log_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`log_id` text NOT NULL,
	`file_key` text NOT NULL,
	`media_type` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`log_id`) REFERENCES `daily_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `log_attachments_file_key_unique` ON `log_attachments` (`file_key`);--> statement-breakpoint
CREATE TABLE `watch_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`template_id` text,
	`condition` text NOT NULL,
	`questions` text NOT NULL,
	`source` text NOT NULL,
	`vet_name` text,
	`record_id` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_by_user_id` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
