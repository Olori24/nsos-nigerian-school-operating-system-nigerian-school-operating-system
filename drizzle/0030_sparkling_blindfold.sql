CREATE TABLE `schemeOfWorkRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`schoolId` int NOT NULL,
	`milestoneId` int NOT NULL,
	`weekNo` int NOT NULL,
	`topic` varchar(255) NOT NULL,
	`objectives` text,
	`resources` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schemeOfWorkRows_id` PRIMARY KEY(`id`),
	CONSTRAINT `schemeOfWorkRow_import_week_unique` UNIQUE(`importId`,`weekNo`)
);
--> statement-breakpoint
CREATE INDEX `schemeOfWorkRow_school_idx` ON `schemeOfWorkRows` (`schoolId`,`createdAt`);