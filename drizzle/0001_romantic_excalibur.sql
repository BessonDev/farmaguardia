CREATE TABLE `plantilla_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plantilla_id` integer NOT NULL,
	`posicion` integer NOT NULL,
	`farmacia_id` integer NOT NULL,
	FOREIGN KEY (`plantilla_id`) REFERENCES `plantillas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_slots_plantilla` ON `plantilla_slots` (`plantilla_id`,`posicion`);--> statement-breakpoint
CREATE TABLE `plantillas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
