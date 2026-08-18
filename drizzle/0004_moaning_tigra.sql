CREATE TABLE IF NOT EXISTS `schoolWebsites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`headline` varchar(255),
	`introduction` text,
	`primaryColor` varchar(16) NOT NULL DEFAULT '#0f5c4f',
	`contactEmail` varchar(320),
	`contactPhone` varchar(48),
	`campusLocation` varchar(255),
	`customDomain` varchar(255),
	`domainStatus` enum('not_configured','pending','active') NOT NULL DEFAULT 'not_configured',
	`admissionsEnabled` boolean NOT NULL DEFAULT true,
	`published` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolWebsites_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolWebsite_school_unique` UNIQUE(`schoolId`),
	CONSTRAINT `schoolWebsite_domain_unique` UNIQUE(`customDomain`)
);
