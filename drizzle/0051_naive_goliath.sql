CREATE TABLE `programCourseMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`moduleId` int,
	`title` varchar(180) NOT NULL,
	`materialType` enum('facilitator_guide','practice_activity','project_brief','discussion_prompt','reflection_prompt','resource_checklist') NOT NULL,
	`content` text NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCourseMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `program_course_material_school_program_idx` ON `programCourseMaterials` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_course_material_school_module_idx` ON `programCourseMaterials` (`schoolId`,`moduleId`);--> statement-breakpoint
CREATE INDEX `program_course_material_school_status_idx` ON `programCourseMaterials` (`schoolId`,`status`);