CREATE TABLE `familyPaymentEvidenceNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`evidenceId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`decision` enum('accepted','rejected') NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `familyPaymentEvidenceNotifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `familyEvidenceNotification_evidence_recipient_unique` UNIQUE(`evidenceId`,`recipientUserId`)
);
--> statement-breakpoint
CREATE INDEX `familyEvidenceNotification_recipient_unread_idx` ON `familyPaymentEvidenceNotifications` (`schoolId`,`recipientUserId`,`readAt`);