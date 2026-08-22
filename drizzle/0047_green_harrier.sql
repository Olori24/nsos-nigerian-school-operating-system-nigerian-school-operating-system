CREATE TABLE `learningPrograms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`code` varchar(48),
	`description` text,
	`deliveryMode` enum('in_person','live_online','self_paced','blended') NOT NULL DEFAULT 'in_person',
	`durationLabel` varchar(120),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningPrograms_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_program_school_title_unique` UNIQUE(`schoolId`,`title`)
);
--> statement-breakpoint
CREATE TABLE `programCohorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`startsOn` date,
	`endsOn` date,
	`deliveryReference` varchar(255),
	`status` enum('planning','active','closed','cancelled') NOT NULL DEFAULT 'planning',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCohorts_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_cohort_school_program_name_unique` UNIQUE(`schoolId`,`programId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `programEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`cohortId` int,
	`studentId` int NOT NULL,
	`status` enum('pending','active','completed','withdrawn') NOT NULL DEFAULT 'pending',
	`enrolledOn` date NOT NULL,
	`completionConfirmedBy` int,
	`completionConfirmedAt` timestamp,
	`completionNote` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programEnrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programInstructorAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`cohortId` int,
	`staffId` int NOT NULL,
	`assignmentRole` enum('lead','assistant') NOT NULL DEFAULT 'lead',
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`assignedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programInstructorAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `schools` ADD `operatingType` enum('school','vocational_institute','coaching_centre','online_training_provider','hybrid_learning_provider') DEFAULT 'school' NOT NULL;--> statement-breakpoint
CREATE INDEX `learning_program_school_status_idx` ON `learningPrograms` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `program_cohort_school_program_idx` ON `programCohorts` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_enrolment_school_program_idx` ON `programEnrollments` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_enrolment_school_student_idx` ON `programEnrollments` (`schoolId`,`studentId`);--> statement-breakpoint
CREATE INDEX `program_enrolment_school_cohort_idx` ON `programEnrollments` (`schoolId`,`cohortId`);--> statement-breakpoint
CREATE INDEX `program_instructor_school_program_idx` ON `programInstructorAssignments` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_instructor_school_staff_idx` ON `programInstructorAssignments` (`schoolId`,`staffId`);