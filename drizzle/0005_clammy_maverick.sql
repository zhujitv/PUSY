CREATE TABLE `notification_delivery_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_message_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`template_key` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`scheduled_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`next_retry_at` text,
	`provider_message_id` text,
	`last_error` text,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`template_key`) REFERENCES `notification_templates`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`channel` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`provider` text NOT NULL,
	`sender_name` text DEFAULT 'PUSY.CN' NOT NULL,
	`sender_address` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email_subject` text DEFAULT '' NOT NULL,
	`email_body` text DEFAULT '' NOT NULL,
	`sms_body` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
