CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`recipient` text NOT NULL,
	`style` text NOT NULL,
	`story` text NOT NULL,
	`checkout_url` text,
	`invoice_slug` text,
	`transaction_nsu` text,
	`amount_cents` integer NOT NULL,
	`created_at` text NOT NULL
);
