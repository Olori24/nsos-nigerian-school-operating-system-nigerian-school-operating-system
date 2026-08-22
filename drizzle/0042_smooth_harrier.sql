CREATE TABLE `studentMigrationBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`classId` int NOT NULL,
	`sessionId` int NOT NULL,
	`rowCount` int NOT NULL,
	`studentCount` int NOT NULL DEFAULT 0,
	`guardianCount` int NOT NULL DEFAULT 0,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentMigrationBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_migration_school_key_unique` UNIQUE(`schoolId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `student_migration_school_created_idx` ON `studentMigrationBatches` (`schoolId`,`createdAt`);