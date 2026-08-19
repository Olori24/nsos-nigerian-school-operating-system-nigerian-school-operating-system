CREATE TABLE `schoolDocumentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`admissionTitle` varchar(160) NOT NULL DEFAULT 'School admission form',
	`headerTagline` varchar(255),
	`admissionFields` json NOT NULL,
	`declarationText` text,
	`requireDeclaration` boolean NOT NULL DEFAULT true,
	`termlyFeeTitle` varchar(160) NOT NULL DEFAULT 'Termly fee guide',
	`feeSchedule` json NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolDocumentTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolDocumentTemplate_school_unique` UNIQUE(`schoolId`)
);
--> statement-breakpoint
ALTER TABLE `admissionsApplications` ADD `supplementalData` json;--> statement-breakpoint
ALTER TABLE `admissionsApplications` ADD `declarationAccepted` boolean DEFAULT false NOT NULL;