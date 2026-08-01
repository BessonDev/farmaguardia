CREATE TABLE `farmacias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`direccion` text NOT NULL,
	`sector` text DEFAULT 'Centro',
	`telefono` text,
	`whatsapp` text,
	`latitud` real,
	`longitud` real,
	`imagen_url` text,
	`delivery` integer DEFAULT false,
	`activa` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `reportes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmacia_id` integer,
	`turno_id` integer,
	`tipo` text NOT NULL,
	`detalle` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`turno_id`) REFERENCES `turnos`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `turnos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmacia_id` integer NOT NULL,
	`inicio` text NOT NULL,
	`fin` text NOT NULL,
	`notas` text,
	FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE cascade
);
