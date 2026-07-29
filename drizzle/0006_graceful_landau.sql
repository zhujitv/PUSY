PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text NOT NULL,
	`image_alt` text,
	`badge` text,
	`price` integer NOT NULL,
	`old_price` integer,
	`stock` integer DEFAULT 0 NOT NULL,
	`inventory_verified` integer DEFAULT false NOT NULL,
	`source_stock` integer,
	`source_available` integer DEFAULT false NOT NULL,
	`images_json` text DEFAULT '[]' NOT NULL,
	`variants_json` text DEFAULT '[]' NOT NULL,
	`source_url` text,
	`sku` text,
	`volume` text,
	`ingredients` text,
	`usage` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "slug", "name", "category", "description", "image", "image_alt", "badge", "price", "old_price", "stock", "inventory_verified", "source_stock", "source_available", "images_json", "variants_json", "source_url", "sku", "volume", "ingredients", "usage", "status", "created_at", "updated_at") SELECT "id", "slug", "name", "category", "description", "image", "image_alt", "badge", "price", "old_price", "stock", "inventory_verified", "source_stock", "source_available", "images_json", "variants_json", "source_url", "sku", "volume", "ingredients", "usage", "status", "created_at", "updated_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);