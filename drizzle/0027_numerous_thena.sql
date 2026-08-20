CREATE TABLE `aiTutorTeachingPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`adaptationEnabled` boolean NOT NULL DEFAULT true,
	`preferredStyle` enum('balanced','step_by_step','worked_examples','concise_review') NOT NULL DEFAULT 'balanced',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiTutorTeachingPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiTutorTeachingPreference_student_tutor_unique` UNIQUE(`studentId`,`tutorId`)
);
--> statement-breakpoint
CREATE INDEX `aiTutorTeachingPreference_school_tutor_idx` ON `aiTutorTeachingPreferences` (`schoolId`,`tutorId`);