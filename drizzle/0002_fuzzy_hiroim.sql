CREATE TABLE `visitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ruta` text DEFAULT '/' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);