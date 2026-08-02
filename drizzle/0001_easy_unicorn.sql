CREATE TABLE `reporte_confirmaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporte_id` integer NOT NULL,
	`huella_local` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reporte_id`) REFERENCES `reportes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reporte_huella_unique` ON `reporte_confirmaciones` (`reporte_id`,`huella_local`);
--> statement-breakpoint
ALTER TABLE `reportes` ADD `confirmaciones` integer DEFAULT 1 NOT NULL;