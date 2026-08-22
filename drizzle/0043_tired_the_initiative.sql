CREATE TABLE `staffMigrationBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`rowCount` int NOT NULL,
	`staffCount` int NOT NULL DEFAULT 0,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffMigrationBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_migration_school_key_unique` UNIQUE(`schoolId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `staff_migration_school_created_idx` ON `staffMigrationBatches` (`schoolId`,`createdAt`);