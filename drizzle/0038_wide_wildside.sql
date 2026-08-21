CREATE TABLE `staffSetupInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`employeeNo` varchar(48) NOT NULL,
	`jobTitle` varchar(120) NOT NULL,
	`role` enum('admin','staff','teacher','finance') NOT NULL,
	`employmentType` enum('full_time','part_time','contract','temporary') NOT NULL DEFAULT 'full_time',
	`status` enum('draft','sending','sent','accepted','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`acceptedUserId` int,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffSetupInvitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `staff_setup_invitation_school_status_idx` ON `staffSetupInvitations` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `staff_setup_invitation_school_email_idx` ON `staffSetupInvitations` (`schoolId`,`email`);