CREATE TABLE `institutionOperatingProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`mission` text,
	`targetLearners` text,
	`brandTone` varchar(180),
	`teachingPhilosophy` text,
	`curriculumStrategy` text,
	`pricingApproach` text,
	`policyNotes` text,
	`operatingGoals` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionOperatingProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `institution_operating_profile_school_unique` UNIQUE(`schoolId`)
);
--> statement-breakpoint
CREATE TABLE `schoolOperatorInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`insightType` enum('readiness','learning','admissions','revenue','lifecycle','health','certificate') NOT NULL,
	`severity` enum('info','attention','review') NOT NULL DEFAULT 'info',
	`status` enum('open','dismissed') NOT NULL DEFAULT 'open',
	`dedupeKey` varchar(128) NOT NULL,
	`title` varchar(180) NOT NULL,
	`detail` varchar(900) NOT NULL,
	`evidence` json NOT NULL,
	`actionDestination` varchar(48),
	`sourceVersion` varchar(32) NOT NULL DEFAULT 'deterministic-v1',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`dismissedBy` int,
	`dismissedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolOperatorInsights_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_operator_insight_school_dedupe_unique` UNIQUE(`schoolId`,`dedupeKey`)
);
--> statement-breakpoint
CREATE INDEX `school_operator_insight_school_generated_idx` ON `schoolOperatorInsights` (`schoolId`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `school_operator_insight_school_status_idx` ON `schoolOperatorInsights` (`schoolId`,`status`);