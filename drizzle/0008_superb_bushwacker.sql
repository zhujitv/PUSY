CREATE TABLE `retail_partnerships` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_name` text NOT NULL,
	`phone` text NOT NULL,
	`company` text NOT NULL,
	`city` text NOT NULL,
	`cooperation_type` text NOT NULL,
	`wechat` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`proposal` text NOT NULL,
	`status` text DEFAULT '待联系' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
