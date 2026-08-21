CREATE TABLE `teacherSchemeRevisionRecommendationOutcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`notificationId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`classLabel` varchar(120) NOT NULL,
	`subjectLabel` varchar(160) NOT NULL,
	`termLabel` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acknowledgedAt` timestamp,
	`expiredAt` timestamp,
	`clearedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacherSchemeRevisionRecommendationOutcomes_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacherSchemeRecommendation_notification_unique` UNIQUE(`notificationId`)
);
--> statement-breakpoint
CREATE INDEX `teacherSchemeRecommendation_school_expiry_idx` ON `teacherSchemeRevisionRecommendationOutcomes` (`schoolId`,`expiresAt`);