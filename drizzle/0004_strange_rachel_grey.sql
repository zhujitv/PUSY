CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_digest` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`result` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_providers` (
	`provider` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`mode` text DEFAULT 'production' NOT NULL,
	`app_id` text DEFAULT '' NOT NULL,
	`merchant_id` text DEFAULT '' NOT NULL,
	`public_key_id` text DEFAULT '' NOT NULL,
	`certificate_serial` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`merchant_trade_no` text NOT NULL,
	`provider_transaction_id` text,
	`amount_fen` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`checkout_url` text,
	`code_url` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_retry_at` text,
	`last_error` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_merchant_trade_no_unique` ON `payments` (`merchant_trade_no`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`merchant_refund_no` text NOT NULL,
	`provider_refund_id` text,
	`amount_fen` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_retry_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_merchant_refund_no_unique` ON `refunds` (`merchant_refund_no`);--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_token_hash` text DEFAULT '' NOT NULL;