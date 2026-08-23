CREATE TABLE `programCurriculumPathways` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`pathwayType` enum('school_learning_sequence','vocational_competency','coaching_plan','online_learning_path','hybrid_learning_path','custom_learning_path') NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`targetLevel` varchar(160),
	`deliveryGuidance` varchar(500),
	`sortOrder` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCurriculumPathways_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_curriculum_pathway_school_program_order_unique` UNIQUE(`schoolId`,`programId`,`sortOrder`)
);
--> statement-breakpoint
ALTER TABLE `programCurriculumModules` ADD `pathwayId` int;--> statement-breakpoint
CREATE INDEX `program_curriculum_pathway_school_program_idx` ON `programCurriculumPathways` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_curriculum_pathway_school_status_idx` ON `programCurriculumPathways` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `program_curriculum_module_school_pathway_idx` ON `programCurriculumModules` (`schoolId`,`pathwayId`);