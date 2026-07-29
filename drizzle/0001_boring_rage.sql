CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'website' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`subscribed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
ALTER TABLE `products` ADD `sku` text;--> statement-breakpoint
ALTER TABLE `products` ADD `volume` text;--> statement-breakpoint
ALTER TABLE `products` ADD `ingredients` text;--> statement-breakpoint
ALTER TABLE `products` ADD `usage` text;