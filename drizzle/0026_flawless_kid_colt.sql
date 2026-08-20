CREATE TABLE `aiTutorFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`interactionId` int NOT NULL,
	`helpfulness` enum('helpful','partly_helpful','not_helpful') NOT NULL,
	`comment` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiTutorFeedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiTutorFeedback_interaction_unique` UNIQUE(`interactionId`)
);
--> statement-breakpoint
CREATE TABLE `aiTutorInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`interactionKey` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiTutorInteractions_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiTutorInteraction_key_unique` UNIQUE(`interactionKey`)
);
--> statement-breakpoint
CREATE INDEX `aiTutorFeedback_school_tutor_idx` ON `aiTutorFeedback` (`schoolId`,`tutorId`);--> statement-breakpoint
CREATE INDEX `aiTutorFeedback_student_tutor_idx` ON `aiTutorFeedback` (`studentId`,`tutorId`);--> statement-breakpoint
CREATE INDEX `aiTutorInteraction_school_tutor_idx` ON `aiTutorInteractions` (`schoolId`,`tutorId`);--> statement-breakpoint
CREATE INDEX `aiTutorInteraction_student_tutor_idx` ON `aiTutorInteractions` (`studentId`,`tutorId`);