CREATE TABLE `config_grupos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_inicio` text NOT NULL,
	`cantidad_grupos` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `farmacias` ADD `grupo` integer;