CREATE TABLE `programMilestoneEvidenceSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`milestoneId` int NOT NULL,
	`evidenceNote` varchar(1500) NOT NULL,
	`status` enum('submitted','reviewed_accepted','reviewed_returned') NOT NULL DEFAULT 'submitted',
	`reviewNote` varchar(700),
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programMilestoneEvidenceSubmissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_milestone_evidence_school_enrollment_milestone_unique` UNIQUE(`schoolId`,`enrollmentId`,`milestoneId`)
);
--> statement-breakpoint
CREATE INDEX `program_milestone_evidence_school_enrollment_idx` ON `programMilestoneEvidenceSubmissions` (`schoolId`,`enrollmentId`);--> statement-breakpoint
CREATE INDEX `program_milestone_evidence_school_milestone_status_idx` ON `programMilestoneEvidenceSubmissions` (`schoolId`,`milestoneId`,`status`);