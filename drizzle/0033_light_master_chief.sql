CREATE TABLE `teacherSchemeRevisionNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`importId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`termId` int NOT NULL,
	`classLabel` varchar(120) NOT NULL,
	`subjectLabel` varchar(160) NOT NULL,
	`termLabel` varchar(64) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacherSchemeRevisionNotifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacherSchemeRevision_import_recipient_unique` UNIQUE(`importId`,`recipientUserId`)
);
--> statement-breakpoint
CREATE INDEX `teacherSchemeRevision_recipient_created_idx` ON `teacherSchemeRevisionNotifications` (`schoolId`,`recipientUserId`,`createdAt`);