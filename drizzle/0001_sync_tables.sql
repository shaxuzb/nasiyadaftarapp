CREATE TABLE `client_aliases` (
	`scope` text NOT NULL,
	`temp_id` integer NOT NULL,
	`server_id` integer NOT NULL,
	`server_uuid` text NOT NULL,
	PRIMARY KEY(`scope`, `temp_id`)
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`op_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`organization_id` integer NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`meta` text NOT NULL,
	`occurred_at` text NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_op_id_unique` ON `outbox` (`op_id`);--> statement-breakpoint
CREATE INDEX `outbox_user` ON `outbox` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`scope` text NOT NULL,
	`uuid` text NOT NULL,
	`client_id` integer NOT NULL,
	`client_uuid` text,
	`sort_key` text NOT NULL,
	`data` text NOT NULL,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `uuid`)
);
--> statement-breakpoint
CREATE INDEX `transactions_client` ON `transactions` (`scope`,`client_id`);--> statement-breakpoint
CREATE INDEX `transactions_client_uuid` ON `transactions` (`scope`,`client_uuid`);--> statement-breakpoint
ALTER TABLE `clients` ADD `uuid` text;--> statement-breakpoint
CREATE INDEX `clients_uuid` ON `clients` (`scope`,`uuid`);