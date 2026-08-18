CREATE TABLE IF NOT EXISTS `staffDuties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`startsOn` date,
	`endsOn` date,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffDuties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staffDuty_school_idx` ON `staffDuties` (`schoolId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staffDuty_staff_idx` ON `staffDuties` (`staffId`);
