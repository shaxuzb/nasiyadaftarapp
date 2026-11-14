CREATE TABLE `client_transactions` (
	`scope` text NOT NULL,
	`client_id` integer NOT NULL,
	`position` integer NOT NULL,
	`data` text NOT NULL,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `client_id`, `position`)
);
--> statement-breakpoint
CREATE INDEX `client_transactions_client` ON `client_transactions` (`scope`,`client_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`scope` text NOT NULL,
	`id` integer NOT NULL,
	`search_text` text NOT NULL,
	`position` integer NOT NULL,
	`data` text NOT NULL,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE INDEX `clients_scope` ON `clients` (`scope`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`data` text NOT NULL,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `key`)
);
