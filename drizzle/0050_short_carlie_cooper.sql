CREATE TABLE `programMilestoneProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`milestoneId` int NOT NULL,
	`status` enum('not_started','in_progress','reviewed_complete') NOT NULL DEFAULT 'not_started',
	`note` varchar(500),
	`updatedBy` int NOT NULL,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programMilestoneProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_milestone_progress_school_enrollment_milestone_unique` UNIQUE(`schoolId`,`enrollmentId`,`milestoneId`)
);
--> statement-breakpoint
CREATE INDEX `program_milestone_progress_school_enrollment_idx` ON `programMilestoneProgress` (`schoolId`,`enrollmentId`);--> statement-breakpoint
CREATE INDEX `program_milestone_progress_school_milestone_idx` ON `programMilestoneProgress` (`schoolId`,`milestoneId`);