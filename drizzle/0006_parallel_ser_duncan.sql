CREATE TABLE IF NOT EXISTS `providerConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`category` enum('payment','notification') NOT NULL,
	`provider` varchar(64) NOT NULL,
	`status` enum('draft','ready','disabled') NOT NULL DEFAULT 'draft',
	`configuration` json NOT NULL,
	`encryptedCredentials` text,
	`configuredBy` int NOT NULL,
	`lastValidatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `providerConfiguration_school_category_unique` UNIQUE(`schoolId`,`category`),
	INDEX `providerConfiguration_school_idx` (`schoolId`)
);
