CREATE TABLE `schoolBankAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`bankName` varchar(160) NOT NULL,
	`accountName` varchar(160) NOT NULL,
	`encryptedAccountNumber` text NOT NULL,
	`accountNumberLast4` varchar(4) NOT NULL,
	`accountType` enum('current','savings','corporate','other') NOT NULL DEFAULT 'current',
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`isPrimary` boolean NOT NULL DEFAULT false,
	`paymentReferenceGuidance` varchar(255),
	`configuredBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolBankAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolCurriculumProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`framework` enum('nerdc_basic','nerdc_senior','custom') NOT NULL DEFAULT 'custom',
	`templateId` varchar(64),
	`sourceUrl` varchar(2048),
	`appliedClassIds` json NOT NULL,
	`appliedBy` int,
	`appliedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolCurriculumProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculumProfile_school_unique` UNIQUE(`schoolId`)
);
--> statement-breakpoint
CREATE INDEX `schoolBankAccount_school_status_idx` ON `schoolBankAccounts` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `schoolBankAccount_school_primary_idx` ON `schoolBankAccounts` (`schoolId`,`isPrimary`);