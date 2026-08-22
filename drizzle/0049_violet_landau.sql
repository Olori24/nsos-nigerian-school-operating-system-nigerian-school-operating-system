CREATE TABLE `programCurriculumMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`moduleId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCurriculumMilestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_curriculum_milestone_school_module_order_unique` UNIQUE(`schoolId`,`moduleId`,`sortOrder`)
);
--> statement-breakpoint
CREATE TABLE `programCurriculumModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`code` varchar(48),
	`description` text,
	`learningType` enum('topic','practical','project','practice','resource') NOT NULL DEFAULT 'topic',
	`sortOrder` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCurriculumModules_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_curriculum_module_school_program_order_unique` UNIQUE(`schoolId`,`programId`,`sortOrder`)
);
--> statement-breakpoint
CREATE INDEX `program_curriculum_milestone_school_program_idx` ON `programCurriculumMilestones` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_curriculum_milestone_school_module_idx` ON `programCurriculumMilestones` (`schoolId`,`moduleId`);--> statement-breakpoint
CREATE INDEX `program_curriculum_module_school_program_idx` ON `programCurriculumModules` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_curriculum_module_school_status_idx` ON `programCurriculumModules` (`schoolId`,`status`);