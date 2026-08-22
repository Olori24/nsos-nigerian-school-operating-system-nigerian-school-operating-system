CREATE TABLE `academicMigrationBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`sessionId` int NOT NULL,
	`rowCount` int NOT NULL,
	`classCount` int NOT NULL DEFAULT 0,
	`subjectCount` int NOT NULL DEFAULT 0,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academicMigrationBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_migration_school_key_unique` UNIQUE(`schoolId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `academic_migration_school_created_idx` ON `academicMigrationBatches` (`schoolId`,`createdAt`);