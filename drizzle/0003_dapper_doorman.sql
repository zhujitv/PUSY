CREATE TABLE `member_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`label` text DEFAULT '家' NOT NULL,
	`recipient` text NOT NULL,
	`phone` text NOT NULL,
	`province` text NOT NULL,
	`city` text NOT NULL,
	`district` text DEFAULT '' NOT NULL,
	`detail` text NOT NULL,
	`postcode` text DEFAULT '' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
