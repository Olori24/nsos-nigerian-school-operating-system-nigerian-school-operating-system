CREATE TABLE `automationJobEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`jobId` int NOT NULL,
	`actorUserId` int,
	`eventType` enum('created','input_saved','approved','started','completed','blocked','failed','cancelled') NOT NULL,
	`label` varchar(240) NOT NULL,
	`details` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automationJobEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automationJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`jobType` enum('academic_foundation','course_draft','website_draft','staff_invitation_draft','finance_draft','manual_review') NOT NULL,
	`status` enum('needs_input','ready_for_review','approved','running','completed','blocked','failed','cancelled') NOT NULL DEFAULT 'needs_input',
	`requestSummary` varchar(280) NOT NULL,
	`plan` json NOT NULL,
	`input` json,
	`result` json,
	`idempotencyKey` varchar(96) NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`failureCode` varchar(96),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automationJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_job_school_actor_key_unique` UNIQUE(`schoolId`,`createdBy`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `automation_job_event_school_job_occurred_idx` ON `automationJobEvents` (`schoolId`,`jobId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `automation_job_school_created_idx` ON `automationJobs` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `automation_job_school_status_idx` ON `automationJobs` (`schoolId`,`status`);