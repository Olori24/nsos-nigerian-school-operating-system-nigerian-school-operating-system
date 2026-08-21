CREATE TABLE `guardianPortalInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`guardianId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('sending','sent','failed','accepted') NOT NULL DEFAULT 'sending',
	`sentBy` int NOT NULL,
	`acceptedUserId` int,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardianPortalInvitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `guardian_portal_invitation_school_guardian_idx` ON `guardianPortalInvitations` (`schoolId`,`guardianId`);--> statement-breakpoint
CREATE INDEX `guardian_portal_invitation_email_status_idx` ON `guardianPortalInvitations` (`email`,`status`);