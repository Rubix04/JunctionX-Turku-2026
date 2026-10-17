CREATE TABLE `care_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`visit_record_id` text NOT NULL,
	`diagnosis` text NOT NULL,
	`vet_name` text,
	`checked_by_clinic` integer DEFAULT false NOT NULL,
	`findings` text NOT NULL,
	`home_care` text NOT NULL,
	`follow_up` text,
	`products` text NOT NULL,
	`original_text` text NOT NULL,
	`created_by_user_id` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visit_record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_plans_visit_record_id_unique` ON `care_plans` (`visit_record_id`);--> statement-breakpoint
CREATE TABLE `medication_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`medication_record_id` text,
	`care_plan_id` text,
	`name` text NOT NULL,
	`detail` text NOT NULL,
	`start_date` text NOT NULL,
	`total_days` integer,
	`times` text NOT NULL,
	`stopped_on` text,
	`generated_until` text,
	`created_by_user_id` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`medication_record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`care_plan_id`) REFERENCES `care_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`due_at` text NOT NULL,
	`due_at_ms` integer NOT NULL,
	`source` text NOT NULL,
	`schedule_id` text,
	`care_plan_id` text,
	`record_id` text,
	`done_at` integer,
	`done_by_user_id` text,
	`pushed_at` integer,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_id`) REFERENCES `medication_schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`care_plan_id`) REFERENCES `care_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `health_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`done_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_schedule_dose` ON `reminders` (`schedule_id`,`due_at`);--> statement-breakpoint
ALTER TABLE `push_devices` ADD `reminders` integer DEFAULT true NOT NULL;