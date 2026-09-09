CREATE TABLE `studentPortalInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('draft','sending','sent','failed','accepted','expired') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`acceptedUserId` int,
	`expiresAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentPortalInvitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `student_portal_invitation_school_student_idx` ON `studentPortalInvitations` (`schoolId`,`studentId`);--> statement-breakpoint
CREATE INDEX `student_portal_invitation_email_status_idx` ON `studentPortalInvitations` (`email`,`status`);