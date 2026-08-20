CREATE TABLE `aiTutorEscalations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`reason` enum('learner_requested','safeguarding','out_of_scope','needs_teacher_review') NOT NULL,
	`status` enum('open','acknowledged','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`acknowledgedBy` int,
	CONSTRAINT `aiTutorEscalations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiTutorSessionSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`sessionDate` date NOT NULL,
	`questionCount` int NOT NULL DEFAULT 0,
	`escalationCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiTutorSessionSummaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiTutorSession_tutor_student_date_unique` UNIQUE(`tutorId`,`studentId`,`sessionDate`)
);
--> statement-breakpoint
CREATE TABLE `aiTutors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`subjectId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`curriculumScope` text NOT NULL,
	`allowedLevels` json NOT NULL,
	`supervisorUserId` int NOT NULL,
	`status` enum('draft','active','paused','retired') NOT NULL DEFAULT 'draft',
	`dailyQuestionLimit` int NOT NULL DEFAULT 20,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiTutors_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiTutor_school_subject_unique` UNIQUE(`schoolId`,`subjectId`)
);
--> statement-breakpoint
CREATE INDEX `aiTutorEscalation_school_status_idx` ON `aiTutorEscalations` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `aiTutorEscalation_tutor_student_idx` ON `aiTutorEscalations` (`tutorId`,`studentId`);--> statement-breakpoint
CREATE INDEX `aiTutorSession_school_student_idx` ON `aiTutorSessionSummaries` (`schoolId`,`studentId`);--> statement-breakpoint
CREATE INDEX `aiTutor_school_status_idx` ON `aiTutors` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `aiTutor_supervisor_status_idx` ON `aiTutors` (`supervisorUserId`,`status`);