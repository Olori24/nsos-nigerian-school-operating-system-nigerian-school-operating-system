CREATE TABLE `institutionBlueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`status` enum('prepared','applying','applied') NOT NULL DEFAULT 'prepared',
	`blueprint` json NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`appliedProgramId` int,
	`appliedBy` int,
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionBlueprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `institution_blueprint_school_actor_key_unique` UNIQUE(`schoolId`,`createdBy`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `institution_blueprint_school_created_idx` ON `institutionBlueprints` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `institution_blueprint_school_status_idx` ON `institutionBlueprints` (`schoolId`,`status`);