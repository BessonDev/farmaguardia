CREATE TABLE `admin_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`accion` text NOT NULL,
	`payload` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `anuncios_turno` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turno_id` integer NOT NULL,
	`farmacia_sustituta_id` integer NOT NULL,
	`motivo` text,
	`vigente_desde_utc` text NOT NULL,
	`vigente_hasta_utc` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`turno_id`) REFERENCES `turnos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`farmacia_sustituta_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_anuncios_vigencia` ON `anuncios_turno` (`vigente_desde_utc`,`vigente_hasta_utc`);--> statement-breakpoint
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
	`activa` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`exitoso` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_attempts_ip_fecha` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE TABLE `reportes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turno_id` integer,
	`motivo` text NOT NULL,
	`contacto` text,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`turno_id`) REFERENCES `turnos`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reportes_fecha` ON `reportes` (`created_at`);--> statement-breakpoint
CREATE TABLE `turnos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmacia_id` integer NOT NULL,
	`inicio_utc` text NOT NULL,
	`fin_utc` text NOT NULL,
	`notas` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_turnos_rango` ON `turnos` (`inicio_utc`,`fin_utc`);--> statement-breakpoint
CREATE INDEX `idx_turnos_farmacia` ON `turnos` (`farmacia_id`);