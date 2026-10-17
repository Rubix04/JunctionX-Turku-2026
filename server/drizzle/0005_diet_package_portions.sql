-- Diet portions now come from the food package's feeding amount instead of calories,
-- and weights can come from passport visits. Written by hand from drizzle-kit's diff so that
-- existing rows get sensible values.
ALTER TABLE `diet_plans` DROP COLUMN `kcal_per_100g`;--> statement-breakpoint
ALTER TABLE `diet_plans` DROP COLUMN `neutered`;--> statement-breakpoint
ALTER TABLE `diet_plans` DROP COLUMN `activity_level`;--> statement-breakpoint
ALTER TABLE `diet_plans` DROP COLUMN `previous_food_name`;--> statement-breakpoint
ALTER TABLE `diet_plans` DROP COLUMN `transition_started_on`;--> statement-breakpoint
ALTER TABLE `diet_plans` ADD `package_daily_grams` real;--> statement-breakpoint
ALTER TABLE `diet_plans` ADD `package_for_weight_kg` real;--> statement-breakpoint
ALTER TABLE `diet_plans` ADD `goal` text NOT NULL DEFAULT 'maintain';--> statement-breakpoint
-- Existing weight-loss plans with a target keep losing weight.
UPDATE `diet_plans` SET `goal` = 'lose' WHERE `diet_type` = 'weightLoss' AND `target_weight_kg` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `diet_plans` ADD `grams_per_scoop` real;--> statement-breakpoint
-- Weights logged before this change were all entered by the owner.
ALTER TABLE `weight_entries` ADD `source` text NOT NULL DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE `weight_entries` ADD `visit_record_id` text REFERENCES health_records(id) ON DELETE cascade;
